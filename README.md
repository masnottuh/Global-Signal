# Global Signal

Public website for [Global Signal](https://www.globalsignal.org). The homepage is a video-first splash: the latest video, earlier videos once there is more than one, and a path to the weekly [Substack](https://globalsignalorg.substack.com) and the [YouTube channel](https://www.youtube.com/@GlobalSignalOrg).

This repository is the static site served at [www.globalsignal.org](https://www.globalsignal.org) via GitHub Pages. There is no application backend here.

## Add a video

The homepage reads one file, [`data/videos.json`](data/videos.json). It ships as an empty list, which shows “First video coming soon” plus subscribe buttons. To publish a video, add one object and push. No other file needs to change.

Put the newest video first. The page also sorts by `date` and features the latest one, so an older entry left at the top will not take the featured slot.

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
| `id` | Yes | The 11-character YouTube id. In `https://www.youtube.com/watch?v=abcdefghijk` it is `abcdefghijk`. A `youtu.be` or Shorts link uses the same id. |
| `title` | Yes | The title to show on the page. |
| `date` | Yes | `YYYY-MM-DD`. |
| `description` | No | A short plain-text line under the featured title. |

The file has to be a JSON array. JSON does not allow comments or a comma after the last item.

- One video: it is featured. The earlier-videos section stays hidden.
- Two or more: the latest is featured. The others show as thumbnails (title and date). Choosing one loads it in the featured player.
- The thumbnail comes from `i.ytimg.com`. Nothing from YouTube loads until a visitor presses play. Playback then uses `youtube-nocookie.com`.
- The coming-soon state is in the HTML, so the subscribe links work with JavaScript off. Showing the list itself uses `js/home.js`.

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

The site uses the neon look of the original homepage. Neon `#CCFF00` is the logo, the headings, and the primary buttons (dark emerald text on those buttons). The page background is dark emerald `#182825`. Body text is champagne `#EAEDB0`.

Type matches the original site: [Source Serif 4](https://fonts.google.com/specimen/Source+Serif+4) for headings, [Inter](https://fonts.google.com/specimen/Inter) for body text, and [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) for buttons and labels.

The hero wordmark is `assets/primary-logo-4.png` (Primary Logo 4, neon `#CCFF00`).

`assets/og-image.png` is the Open Graph and Twitter card image. Share URLs use the absolute `https://www.globalsignal.org/...` form.

## Disclaimer

General commentary on public data. Not a recommendation to buy or sell any security. Global Signal is not a registered investment adviser. The longer note lives on the [terms](terms.html) and [methodology](methodology.html) pages.
