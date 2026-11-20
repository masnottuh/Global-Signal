#!/usr/bin/env python3
"""Refresh official daily/weekly signals for the public Global Signal site.

Fetches the Treasury par yield curve, DOL/ETA national weekly claims, and
the Federal Reserve H.10 nominal broad dollar index using an honest
User-Agent. On HTTP errors (including 403), the last good value in the
output JSON is kept, with its as-of date. Values are never invented.

This script uses only the Python standard library so the public site
repository does not need a private package or a secret to run it.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "data" / "official-signals.json"
PACIFIC = ZoneInfo("America/Los_Angeles")

USER_AGENT = (
    "GlobalSignalResearch/0.1 (https://www.globalsignal.org; "
    "public official statistical sources only; info@globalsignal.org)"
)

TIMEOUT_SEC = 60

URLS = {
    "treasury_yield_curve": (
        "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/"
        "daily-treasury-rates.csv/{year}/all?type=daily_treasury_yield_curve"
        "&field_tdr_date_value={year}&page&_format=csv"
    ),
    "dol_us_claims": "https://oui.doleta.gov/unemploy/csv/us_claims.csv",
    "fed_h10": (
        "https://www.federalreserve.gov/datadownload/Output.aspx"
        "?filetype=csv&from=&to=&label=include&lastobs=&layout=seriescolumn"
        "&rel=H10&series=122e3bcb627e8e53f1bf72a1a09cfb81&type=package"
    ),
}

SOURCES = {
    "treasury_yield_curve": "U.S. Treasury, Daily Treasury Par Yield Curve Rates",
    "jobless_claims": (
        "U.S. Department of Labor, Employment and Training Administration, "
        "national weekly claims file"
    ),
    "broad_dollar": (
        "Board of Governors of the Federal Reserve System, H.10 Foreign Exchange "
        "Rates, series JRXWTFB_N.B"
    ),
}


def now_pt() -> datetime:
    return datetime.now(PACIFIC)


def treasury_url(year: int) -> str:
    return URLS["treasury_yield_curve"].format(year=year)


def _round(val: float, digits: int) -> float:
    return round(float(val), digits)


def _spread_shape(spread: float | None) -> str | None:
    if spread is None:
        return None
    if spread < 0:
        return "inverted"
    if spread <= 0.10:
        return "near flat"
    return "upward-sloping"


def parse_treasury_yield_curve(text: str) -> dict[str, Any]:
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise ValueError("Treasury yield curve file has no header")
    reader.fieldnames = [name.strip().strip('"') for name in reader.fieldnames]
    required = ("Date", "3 Mo", "2 Yr", "10 Yr")
    for col in required:
        if col not in reader.fieldnames:
            raise ValueError(f"Treasury yield curve file missing {col} column")
    rows: list[dict[str, Any]] = []
    for raw in reader:
        date_s = (raw.get("Date") or "").strip()
        if not date_s:
            continue
        try:
            as_of = datetime.strptime(date_s, "%m/%d/%Y").date()
        except ValueError:
            try:
                as_of = datetime.strptime(date_s, "%Y-%m-%d").date()
            except ValueError:
                continue

        def num(col: str) -> float | None:
            cell = (raw.get(col) or "").strip()
            if not cell:
                return None
            try:
                return float(cell)
            except ValueError:
                return None

        y10y, y3m, y2y = num("10 Yr"), num("3 Mo"), num("2 Yr")
        if y10y is None or y3m is None or y2y is None:
            continue
        rows.append({"as_of": as_of, "y10y": y10y, "y3m": y3m, "y2y": y2y})
    if not rows:
        raise ValueError("Treasury yield curve file had no complete rows")
    rows.sort(key=lambda r: r["as_of"])
    last = rows[-1]
    spread_10_3 = _round(last["y10y"] - last["y3m"], 2)
    spread_10_2 = _round(last["y10y"] - last["y2y"], 2)
    return {
        "id": "treasury_yield_curve",
        "label": "Treasury yield curve spreads",
        "frequency": "daily",
        "status": "ok",
        "as_of": last["as_of"].isoformat(),
        "y10y": _round(last["y10y"], 2),
        "y3m": _round(last["y3m"], 2),
        "y2y": _round(last["y2y"], 2),
        "spread_10y_3m": spread_10_3,
        "spread_10y_2y": spread_10_2,
        "shape_10y_3m": _spread_shape(spread_10_3),
        "shape_10y_2y": _spread_shape(spread_10_2),
        "source": SOURCES["treasury_yield_curve"],
        "source_url": treasury_url(last["as_of"].year),
        "note": (
            "Spreads are calculated from official Treasury par yields. "
            "A negative spread means that maturity pair is inverted. "
            "This is a description of official yields, not a trade signal."
        ),
    }


def parse_dol_us_claims(text: str) -> dict[str, Any]:
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise ValueError("Claims file has no header")
    reader.fieldnames = [name.strip().strip('"') for name in reader.fieldnames]
    if "rptdate" not in reader.fieldnames or "c5" not in reader.fieldnames:
        raise ValueError("Claims file missing rptdate or c5")
    complete: list[dict[str, Any]] = []
    for raw in reader:
        date_s = (raw.get("rptdate") or "").strip()
        if not date_s:
            continue
        try:
            as_of = datetime.strptime(date_s[:10], "%Y-%m-%d").date()
        except ValueError:
            continue

        def num(col: str) -> float | None:
            cell = (raw.get(col) or "").strip()
            if not cell:
                return None
            try:
                return float(cell)
            except ValueError:
                return None

        c5 = num("c5")
        if c5 is None:
            continue
        sa_initial = int(round(c5 * 1000.0))
        c8 = num("c8")
        sa_4w = int(round(c8 * 1000.0)) if c8 is not None else None
        complete.append({"as_of": as_of, "sa_initial": sa_initial, "sa_4w": sa_4w})
    if not complete:
        raise ValueError("Claims file had no complete seasonally adjusted weeks")
    complete.sort(key=lambda r: r["as_of"])
    last = complete[-1]
    prev = complete[-2] if len(complete) >= 2 else None
    wow = None
    if prev is not None:
        wow = last["sa_initial"] - prev["sa_initial"]
    return {
        "id": "jobless_claims",
        "label": "Weekly initial unemployment insurance claims",
        "frequency": "weekly",
        "status": "ok",
        "as_of": last["as_of"].isoformat(),
        "sa_initial_claims": last["sa_initial"],
        "sa_initial_claims_4w_avg": last["sa_4w"],
        "sa_initial_wow": wow,
        "prior_week_as_of": prev["as_of"].isoformat() if prev else None,
        "prior_week_sa_initial_claims": prev["sa_initial"] if prev else None,
        "source": SOURCES["jobless_claims"],
        "source_url": URLS["dol_us_claims"],
        "note": (
            "Seasonally adjusted initial claims (column c5) and the official "
            "four-week average (column c8) from the ETA national weekly file, "
            "converted from thousands. A week-over-week change is our "
            "difference between two official weekly readings. Incomplete later "
            "weeks are omitted."
        ),
    }


def format_board_unit_label(raw: str) -> str:
    text = (raw or "").strip().strip('"')
    if not text:
        return "official index (base year as published)"
    parts = [p for p in text.replace("Index:", "").strip(" _").split("_") if p]
    if parts and parts[-1] == "100":
        year = next((p for p in parts if p.isdigit() and len(p) == 4), None)
        month = next((p for p in parts if p.isalpha()), None)
        if year and month:
            return f"{month} {year}=100"
        if year:
            return f"{year}=100"
    return text.replace("_", " ")


def parse_fed_h10_broad_dollar(text: str) -> dict[str, Any]:
    rows = list(csv.reader(io.StringIO(text)))
    unit_label = "official index (base year as published)"
    start = 0
    col = 1
    for i, row in enumerate(rows):
        if not row:
            continue
        if row[0].strip() == "Unit:" and len(row) > 1:
            unit_label = format_board_unit_label(row[1])
        if "Time Period" in row[0]:
            start = i + 1
            col = 1
            break
    pairs: list[tuple[datetime, float]] = []
    for row in rows[start:]:
        if len(row) <= col or not row[0] or not row[col]:
            continue
        if row[col].strip().upper() in {"ND", "NA", ""}:
            continue
        try:
            ts = datetime.strptime(row[0].strip()[:10], "%Y-%m-%d")
            pairs.append((ts, float(row[col])))
        except ValueError:
            continue
    if not pairs:
        raise ValueError("H.10 file had no numeric observations")
    pairs.sort(key=lambda p: p[0])
    last_ts, last_val = pairs[-1]
    return {
        "id": "broad_dollar",
        "label": "Nominal broad U.S. dollar index",
        "frequency": "daily",
        "status": "ok",
        "as_of": last_ts.date().isoformat(),
        "index": _round(last_val, 4),
        "unit": unit_label,
        "source": SOURCES["broad_dollar"],
        "source_url": URLS["fed_h10"],
        "note": (
            "Official index level as published. Days marked ND in the Board's "
            "file are left as gaps and are not filled."
        ),
    }


def download(url: str, timeout: int = TIMEOUT_SEC) -> tuple[int | None, str | None, str | None]:
    """Return (status, body, error). Body is text when status is 200."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/csv,text/plain,*/*"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = getattr(resp, "status", None) or resp.getcode()
            raw = resp.read()
            # Board and Treasury files are ASCII/UTF-8.
            text = raw.decode("utf-8-sig")
            if status != 200:
                return status, None, f"HTTP {status}"
            return status, text, None
    except urllib.error.HTTPError as exc:
        return exc.code, None, f"HTTP {exc.code}"
    except urllib.error.URLError as exc:
        return None, None, f"network error: {exc.reason}"
    except Exception as exc:  # noqa: BLE001 — record and keep last good values
        return None, None, f"{type(exc).__name__}: {exc}"


def load_previous(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def _cached_copy(previous_signal: dict[str, Any] | None, error: str) -> dict[str, Any] | None:
    if not previous_signal or previous_signal.get("as_of") is None:
        return None
    kept = dict(previous_signal)
    kept["status"] = "cached"
    kept["refresh_error"] = error
    as_of = kept.get("as_of")
    kept["cache_note"] = (
        f"The latest refresh could not reach the official source ({error}). "
        f"Showing the last official reading from {as_of}. No value was invented."
    )
    return kept


def merge_board(
    previous: dict[str, Any],
    fresh: dict[str, dict[str, Any] | None],
    errors: dict[str, str],
    retrieved_at: datetime,
) -> dict[str, Any]:
    prev_signals = previous.get("signals") if isinstance(previous.get("signals"), dict) else {}
    signals: dict[str, Any] = {}
    for key in ("treasury_yield_curve", "jobless_claims", "broad_dollar"):
        if fresh.get(key):
            signals[key] = fresh[key]
        else:
            cached = _cached_copy(prev_signals.get(key), errors.get(key, "unavailable"))
            if cached is None:
                signals[key] = {
                    "id": key,
                    "status": "unavailable",
                    "as_of": None,
                    "refresh_error": errors.get(key, "unavailable"),
                    "note": (
                        "No official reading is on file for this signal, and the "
                        "latest refresh did not obtain one. No value was invented."
                    ),
                }
            else:
                signals[key] = cached
    return {
        "retrieved_at": retrieved_at.isoformat(),
        "timezone": "America/Los_Angeles",
        "disclaimer": (
            "These readings are impersonal summaries of official US government "
            "statistics. They are not financial or investment advice and are not "
            "a recommendation to buy or sell any security or to take any particular action."
        ),
        "signals": signals,
        "refresh_errors": errors,
    }


def read_local(path: Path) -> str:
    return path.read_text()


def build_board(
    *,
    previous: dict[str, Any],
    retrieved_at: datetime,
    year: int | None = None,
    raw: dict[str, str] | None = None,
    fetch: bool = True,
) -> dict[str, Any]:
    year = year or retrieved_at.year
    fresh: dict[str, dict[str, Any] | None] = {}
    errors: dict[str, str] = {}

    def try_parse(key: str, parser, body: str | None, err: str | None) -> None:
        if err or body is None:
            errors[key] = err or "no body"
            fresh[key] = None
            return
        try:
            fresh[key] = parser(body)
        except Exception as exc:  # noqa: BLE001
            errors[key] = f"parse error: {exc}"
            fresh[key] = None

    if raw is not None:
        try_parse("treasury_yield_curve", parse_treasury_yield_curve, raw.get("treasury_yield_curve"), None if raw.get("treasury_yield_curve") is not None else "missing local file")
        try_parse("jobless_claims", parse_dol_us_claims, raw.get("dol_us_claims"), None if raw.get("dol_us_claims") is not None else "missing local file")
        try_parse("broad_dollar", parse_fed_h10_broad_dollar, raw.get("fed_h10"), None if raw.get("fed_h10") is not None else "missing local file")
    elif fetch:
        status, body, err = download(treasury_url(year))
        try_parse("treasury_yield_curve", parse_treasury_yield_curve, body, err if err else (None if status == 200 else f"HTTP {status}"))
        status, body, err = download(URLS["dol_us_claims"])
        try_parse("jobless_claims", parse_dol_us_claims, body, err if err else (None if status == 200 else f"HTTP {status}"))
        status, body, err = download(URLS["fed_h10"])
        try_parse("broad_dollar", parse_fed_h10_broad_dollar, body, err if err else (None if status == 200 else f"HTTP {status}"))
    else:
        errors = {k: "refresh skipped" for k in ("treasury_yield_curve", "jobless_claims", "broad_dollar")}

    # Drop empty refresh_errors keys
    errors = {k: v for k, v in errors.items() if v}
    return merge_board(previous, fresh, errors, retrieved_at)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Update official signals JSON for globalsignal.org")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--raw-dir", type=Path, help="Read local CSVs instead of downloading")
    parser.add_argument("--offline", action="store_true", help="Do not download; keep last good values")
    args = parser.parse_args(argv)

    previous = load_previous(args.out)
    raw = None
    fetch = not args.offline
    if args.raw_dir is not None:
        fetch = False
        year = now_pt().year
        mapping = {
            "treasury_yield_curve": args.raw_dir / f"treasury_yield_curve_{year}.csv",
            "dol_us_claims": args.raw_dir / "dol_us_claims.csv",
            "fed_h10": args.raw_dir / "fed_h10_broad_dollar.csv",
        }
        # Also accept un-year-stamped treasury file.
        if not mapping["treasury_yield_curve"].is_file():
            generic = args.raw_dir / "treasury_yield_curve.csv"
            if generic.is_file():
                mapping["treasury_yield_curve"] = generic
        raw = {}
        for key, path in mapping.items():
            raw[key] = path.read_text() if path.is_file() else None

    board = build_board(previous=previous, retrieved_at=now_pt(), raw=raw, fetch=fetch)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(board, indent=2) + "\n")
    print(json.dumps({k: {"status": v.get("status"), "as_of": v.get("as_of")} for k, v in board["signals"].items()}, indent=2))
    if board.get("refresh_errors"):
        print("Refresh errors:", file=sys.stderr)
        for key, err in board["refresh_errors"].items():
            print(f"  - {key}: {err}", file=sys.stderr)
    # Succeed if every signal has an official as-of date (fresh or cached).
    missing = [k for k, v in board["signals"].items() if not v.get("as_of")]
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
