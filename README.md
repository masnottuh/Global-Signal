# Global Signal

Public marketing site for [Global Signal](https://www.globalsignal.org), a one-founder project that publishes free official-data signals on the US economy, including a transparent US Economic Health Index, built only from official US government statistics.

This repository is the static site served at [www.globalsignal.org](https://www.globalsignal.org) via GitHub Pages. The index pipeline lives in a separate private repository, `Global-Signal/economic-health-index`.

## What the product is

Global Signal is a free hub of official US government data. The flagship monthly reading is a transparent 0–100 Economic Health Index. The site also reports daily and weekly official signals (Treasury yield-curve spreads, DOL/ETA jobless claims, and the Federal Reserve H.10 broad dollar index). A free public TradingView indicator is in draft and is not published yet. There is no checkout and no paid tier on this site.

Six official series go into the index: real GDP (BEA), the unemployment rate and nonfarm payrolls (BLS), CPI-U (BLS), the effective federal funds rate (Federal Reserve H.15), and industrial production (Federal Reserve G.17). Each series is converted into a simple change, compared with its own trailing 10-year history as a z-score, and averaged with equal weights. The result is a reading and a regime label: Expansion (60 or above), Slowdown (40–59), or Contraction (below 40).

Every figure is cited back to the original government source and vintage. This is research based on public data, not a forecast of market prices, not a trading-signal product, and not investment advice.

The method, including data vintages, rolling z-scores, regimes, the contemporaneous NBER alignment caveat (not an accuracy rate), and known data gaps such as the unpublished October 2025 all-items CPI, is documented at [globalsignal.org/methodology](https://www.globalsignal.org/methodology).

## This website

The site is static HTML, CSS, and JavaScript. There is no backend on this repository, no live email signup form, and no payment checkout. Until a provider is chosen, the updates section is a placeholder; people can write to [info@globalsignal.org](mailto:info@globalsignal.org?subject=Updates).

| Path | Page |
| --- | --- |
| `/` | Landing page |
| `/methodology` | Index methodology |
| `/privacy.html` | Privacy policy |
| `/terms.html` | Terms of service |

The custom domain is `www.globalsignal.org`. The `CNAME` file in this repository must stay `www.globalsignal.org`.

## Local preview

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

## Brand

The visual system follows Global Signal Brand Guide v2.0 (designer: Madison Paiement). Primary colors: neon green `#CCFF00`, dark emerald `#182825`, billiard `#2F5951`, and champagne `#EAEDB0`.

## Disclaimer

Global Signal is not a registered investment adviser. The index and the monthly report are impersonal summaries of publicly available official statistics. They are for information only, are not financial or investment advice, and are not a recommendation to buy or sell any security or to take any particular action. Official data are revised. Past readings do not predict future economic or market outcomes. This site is not endorsed or certified by BEA, BLS, or the Federal Reserve Board.
