# Global Signal

Public website for [Global Signal](https://www.globalsignal.org). The homepage is a video-first splash: the latest long-form video, up to three more under the player, and a path to the weekly [Substack](https://globalsignalorg.substack.com) and the [YouTube channel](https://www.youtube.com/@GlobalSignalOrg).

This repository is the static site served at [www.globalsignal.org](https://www.globalsignal.org) via GitHub Pages. There is no application backend here.

## Videos

The homepage reads [`data/videos.json`](data/videos.json). [`.github/workflows/sync-youtube.yml`](.github/workflows/sync-youtube.yml) keeps that file aligned with the public YouTube channel. It uses no API key and no paid service.

The workflow runs every 30 minutes and can be started by hand with `workflow_dispatch`. GitHub may start a scheduled run later than the cron time. It fetches:

`https://www.youtube.com/feeds/videos.xml?channel_id=UC-fQxIQQx2iJf-woox15Zdw`

[`scripts/sync_youtube.py`](scripts/sync_youtube.py) writes long-form videos only, newest first. A video is left out when the feed links it at `/shorts/<id>`, or when `https://www.youtube.com/shorts/<id>` returns the Shorts page instead of redirecting to `/watch?v=<id>`. A watch link that the check cannot classify is kept. If every watch-linked video looks like a Short, the script does not write the file.

`date` is the UTC calendar date of the feed's `published` time. `id` and `title` come from the feed. A `description` already stored for that same id is kept. The feed lists the 15 newest uploads. Long-form videos that have scrolled off that page stay in the file.

The job has `permissions: contents: write` and pushes `data/videos.json` to `main` only when the file changed. A push made with the workflow token does not start the legacy Pages builder, so the same job then requests a Pages build (`pages: write`). That redeploys [www.globalsignal.org](https://www.globalsignal.org).

You can still edit the file by hand. The next sync rewrites titles and dates from YouTube and drops anything it classifies as a Short.

```json
[
  {
    "id": "abcdefghijk",
    "title": "What the jobs report actually said",
    "date": "2026-11-23",
    "description": "Optional. One or two plain sentences."
  }
]
```

| Field | Required | What to put |
| --- | --- | --- |
| `id` | Yes | The 11-character YouTube id. In `https://www.youtube.com/watch?v=abcdefghijk` it is `abcdefghijk`. |
| `title` | Yes | The title to show on the page. The sync copies the YouTube title. |
| `date` | Yes | `YYYY-MM-DD`. The sync uses the UTC publication date. |
| `description` | No | A short plain-text line under the featured title. The sync does not invent one. |

The file has to be a JSON array. JSON does not allow comments or a comma after the last item.

- No videos: the page shows “First video coming soon.”
- One video: it is featured. The row under the player stays hidden.
- Two or three: the latest is featured. The others are cards under the player, with no empty slots.
- Four or more: the latest is featured. The next three are the row. Choosing a card swaps it into the player. The latest stays available in the row.

On a wide screen the row is three columns. On a narrow screen the cards stack. Each card uses the 16:9 `maxresdefault` thumbnail and falls back to `hqdefault`. Nothing from YouTube loads until a visitor presses play. Playback then uses `youtube-nocookie.com`.

The coming-soon state is in the HTML, so the subscribe links work with JavaScript off. Showing the list itself uses `js/home.js`.

## Pages

| Path | Page |
| --- | --- |
| `/` | Splash page |
| `/methodology` | How the US Economic Health Index is built |
| `/privacy.html` | Privacy policy |
| `/terms.html` | Terms of service |

The index method stays on the methodology page. The homepage no longer leads with it.

The custom domain is `www.globalsignal.org`. The `CNAME` file in this repository must stay `www.globalsignal.org`.

## Local preview

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

## Brand

The hero and page background are the original homepage: the same logo, glow, void background, grid, and gradients in `css/styles.css`. Below that, the page is the video splash.

Type matches the original site: [Source Serif 4](https://fonts.google.com/specimen/Source+Serif+4) for headings, [Inter](https://fonts.google.com/specimen/Inter) for body text, and [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) for buttons and labels.

The hero wordmark is `assets/primary-logo-4.png` (Primary Logo 4, neon `#CCFF00`).

`assets/og-image.png` is the Open Graph and Twitter card image. Share URLs use the absolute `https://www.globalsignal.org/...` form.

## Disclaimer

General commentary on public data. Not a recommendation to buy or sell any security. Global Signal is not a registered investment adviser. The longer note lives on the [terms](terms.html) and [methodology](methodology.html) pages.
