#!/usr/bin/env python3
"""Refresh data/videos.json from the Global Signal YouTube channel.

No API key. The script reads the public Atom feed and writes long-form
videos only, newest first. A video is a Short when either:

- the feed's alternate link points at /shorts/<id>, or
- https://www.youtube.com/shorts/<id> returns the Shorts page (HTTP 200)
  instead of redirecting to /watch?v=<id>.

A watch link that the Shorts check cannot classify is kept, so a failed
request cannot drop a long-form video. If every watch-linked video looks
like a Short, the script exits without writing. That usually means the
check itself is being blocked.
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

CHANNEL_ID = "UC-fQxIQQx2iJf-woox15Zdw"
FEED_URL = (
    "https://www.youtube.com/feeds/videos.xml?channel_id=" + CHANNEL_ID
)
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "videos.json"
USER_AGENT = "GlobalSignalVideoSync/1.0 (+https://www.globalsignal.org)"
ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

ATOM = "http://www.w3.org/2005/Atom"
YT = "http://www.youtube.com/xml/schemas/2015"


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_OPENER = urllib.request.build_opener(_NoRedirect)


def fetch_feed() -> bytes:
    last_error: Exception | None = None
    for attempt in range(3):
        request = urllib.request.Request(
            FEED_URL,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/atom+xml, application/xml;q=0.9, */*;q=0.8",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read()
        except (urllib.error.URLError, TimeoutError) as error:
            last_error = error
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
    raise SystemExit(f"Could not fetch the YouTube feed: {last_error}")


def link_is_short(url: str) -> bool:
    path = urllib.parse.urlparse(url).path
    return path == "/shorts" or path.startswith("/shorts/")


def probe_is_short(video_id: str) -> bool | None:
    """True when the id is a Short, False when it is long-form, None if unanswered."""
    url = f"https://www.youtube.com/shorts/{video_id}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with _OPENER.open(request, timeout=20) as response:
            if response.status != 200:
                return None
            final = urllib.parse.urlparse(response.geturl())
            if final.path.rstrip("/") != f"/shorts/{video_id}":
                return None
            body = response.read(8192).decode("utf-8", "replace")
            if f"/shorts/{video_id}" in body:
                return True
            return None
    except urllib.error.HTTPError as error:
        location = ""
        if error.headers is not None:
            location = error.headers.get("Location", "")
        if error.code in (301, 302, 303, 307, 308):
            parsed = urllib.parse.urlparse(location)
            query = urllib.parse.parse_qs(parsed.query)
            if parsed.path == "/watch" and video_id in query.get("v", []):
                return False
            if parsed.path.rstrip("/") == f"/shorts/{video_id}":
                return True
        return None
    except (urllib.error.URLError, TimeoutError):
        return None


def text_of(entry: ET.Element, tag: str) -> str:
    found = entry.find(tag)
    if found is None or found.text is None:
        return ""
    return " ".join(found.text.split())


def parse_feed(payload: bytes) -> list[dict]:
    try:
        root = ET.fromstring(payload)
    except ET.ParseError as error:
        raise SystemExit(f"The YouTube feed was not valid XML: {error}") from error

    entries = []
    for entry in root.findall(f"{{{ATOM}}}entry"):
        video_id = text_of(entry, f"{{{YT}}}videoId")
        channel_id = text_of(entry, f"{{{YT}}}channelId")
        title = text_of(entry, f"{{{ATOM}}}title")
        published = text_of(entry, f"{{{ATOM}}}published")
        alternate = ""
        for link in entry.findall(f"{{{ATOM}}}link"):
            if link.get("rel") == "alternate":
                alternate = link.get("href") or ""
                break
        if channel_id and channel_id != CHANNEL_ID:
            print(f"skip {video_id}: feed entry is for channel {channel_id}", file=sys.stderr)
            continue
        if not ID_RE.fullmatch(video_id) or not title or len(published) < 10:
            print(f"skip {video_id or '(no id)'}: missing id, title, or published time", file=sys.stderr)
            continue
        date = published[:10]
        if not DATE_RE.fullmatch(date):
            print(f"skip {video_id}: published time is not a date ({published})", file=sys.stderr)
            continue
        entries.append(
            {
                "id": video_id,
                "title": title,
                "date": date,
                "published": published,
                "url": alternate,
            }
        )
    return entries


def classify(entries: list[dict]) -> list[dict]:
    """Return long-form entries, newest first, and print every decision."""
    watch_linked = [entry for entry in entries if not link_is_short(entry["url"])]
    probes = {entry["id"]: probe_is_short(entry["id"]) for entry in watch_linked}
    short_probes = sum(1 for value in probes.values() if value is True)
    long_probes = sum(1 for value in probes.values() if value is False)
    if watch_linked and short_probes == len(watch_linked) and long_probes == 0:
        raise SystemExit(
            "Every watch-linked video looked like a Short. "
            "Refusing to update data/videos.json."
        )

    long_form = []
    print(f"Feed entries: {len(entries)}")
    for entry in entries:
        if link_is_short(entry["url"]):
            print(f"short  {entry['id']}  {entry['date']}  {entry['title']}")
            continue
        verdict = probes.get(entry["id"])
        if verdict is True:
            print(f"short  {entry['id']}  {entry['date']}  {entry['title']}  (watch link, Shorts page)")
            continue
        if verdict is False:
            print(f"keep   {entry['id']}  {entry['date']}  {entry['title']}")
        else:
            print(
                f"keep   {entry['id']}  {entry['date']}  {entry['title']}"
                "  (Shorts check did not answer; feed link is /watch)"
            )
        long_form.append(entry)
    return long_form


def load_existing(path: Path) -> list[dict]:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as error:
        raise SystemExit(f"{path} is not valid JSON: {error}") from error
    if isinstance(data, dict) and isinstance(data.get("videos"), list):
        data = data["videos"]
    if not isinstance(data, list):
        raise SystemExit(f"{path} must be a JSON array")
    return [item for item in data if isinstance(item, dict)]


def with_description(record: dict, previous: dict | None) -> dict:
    if not previous:
        return record
    description = previous.get("description")
    if isinstance(description, str) and description.strip():
        record["description"] = description.strip()
    return record


def public_record(item: dict) -> dict:
    record = {
        "id": item["id"],
        "title": item["title"],
        "date": item["date"],
    }
    description = item.get("description")
    if isinstance(description, str) and description.strip():
        record["description"] = description.strip()
    return record


def merge(existing: list[dict], long_form: list[dict], feed_ids: set[str]) -> list[dict]:
    previous = {}
    for item in existing:
        video_id = item.get("id")
        if isinstance(video_id, str):
            previous[video_id] = item

    merged = []
    for entry in long_form:
        record = with_description(
            {
                "id": entry["id"],
                "title": entry["title"],
                "date": entry["date"],
                "_published": entry["published"],
            },
            previous.get(entry["id"]),
        )
        merged.append(record)

    for item in existing:
        video_id = item.get("id")
        title = item.get("title")
        date = item.get("date")
        if not isinstance(video_id, str) or video_id in feed_ids:
            continue
        if not ID_RE.fullmatch(video_id) or not isinstance(title, str) or not title.strip():
            continue
        if not isinstance(date, str) or not DATE_RE.fullmatch(date):
            print(f"drop {video_id}: older entry has no YYYY-MM-DD date")
            continue
        verdict = probe_is_short(video_id)
        if verdict is True:
            print(f"drop {video_id}: older entry is a Short")
            continue
        if verdict is None:
            print(f"keep {video_id}: older than the feed page; Shorts check did not answer")
        else:
            print(f"keep {video_id}: older than the feed page")
        record = with_description(
            {
                "id": video_id,
                "title": title.strip(),
                "date": date,
                "_published": f"{date}T00:00:00+00:00",
            },
            item,
        )
        merged.append(record)

    merged.sort(key=lambda item: item.get("_published") or "0000-00-00T00:00:00+00:00", reverse=True)
    return [public_record(item) for item in merged]


def serialize(videos: list[dict]) -> str:
    return json.dumps(videos, indent=2, ensure_ascii=False) + "\n"


def main() -> None:
    entries = parse_feed(fetch_feed())
    if not entries:
        raise SystemExit("The YouTube feed had no entries. data/videos.json was left unchanged.")
    long_form = classify(entries)
    existing = load_existing(OUTPUT)
    videos = merge(existing, long_form, {entry["id"] for entry in entries})
    rendered = serialize(videos)
    current = OUTPUT.read_text(encoding="utf-8") if OUTPUT.exists() else ""
    if rendered == current:
        print(f"data/videos.json unchanged ({len(videos)} long-form)")
        return
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(rendered, encoding="utf-8")
    print(f"data/videos.json updated ({len(videos)} long-form)")


if __name__ == "__main__":
    main()
