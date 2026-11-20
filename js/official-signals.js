/* global fetch, document */
(function () {
    "use strict";

    var DATA_URL = "/data/official-signals.json";
    var MONTHS = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];


    var MAX_AGE_DAYS = {
        treasury_yield_curve: 5,
        jobless_claims: 13,
        broad_dollar: 12
    };

    function ageDays(iso) {
        return (Date.now() - Date.parse(iso + "T12:00:00-08:00")) / 86400000;
    }

    function staleState(key, asOf) {
        if (!asOf) {
            return "missing";
        }
        var a = ageDays(asOf);
        var max = MAX_AGE_DAYS[key];
        if (max == null || isNaN(a)) {
            return "missing";
        }
        if (a > 2 * max) {
            return "hide";
        }
        if (a > max) {
            return "warn";
        }
        return "fresh";
    }

    function applyCard(card) {
        var key = card.getAttribute("data-signal");
        var asOf = card.getAttribute("data-as-of");
        var url = card.getAttribute("data-source-url") || "";
        var state = staleState(key, asOf);
        var body = card.querySelector("[data-signal-body]") || card.querySelector("p");
        var flag = card.querySelector(".signal-stale-flag");
        if (flag) {
            flag.remove();
        }
        card.classList.remove("signal-stale", "signal-hidden");
        if (state === "warn") {
            card.classList.add("signal-stale");
            flag = document.createElement("p");
            flag.className = "signal-stale-flag";
            flag.textContent =
                "⚠ Out of date: the last official observation is from " +
                formatDate(asOf) +
                ", more than " +
                MAX_AGE_DAYS[key] +
                " days ago.";
            var header = card.querySelector(".signal-header");
            if (header && header.nextSibling) {
                card.insertBefore(flag, header.nextSibling);
            } else {
                card.insertBefore(flag, card.firstChild);
            }
        } else if (state === "hide") {
            card.classList.add("signal-stale", "signal-hidden");
            if (body) {
                var src = url
                    ? " See the official source: " + url + "."
                    : "";
                // Keep an HTML link when a URL is present.
                if (url) {
                    body.innerHTML =
                        "This reading is out of date (last official observation " +
                        formatDate(asOf) +
                        "). See the official source: <a href=\"" + url + "\">" + url + "</a>.";
                } else {
                    body.textContent =
                        "This reading is out of date (last official observation " +
                        formatDate(asOf) +
                        ")." + src;
                }
            }
        }
    }

    function applyAll() {
        document.querySelectorAll("[data-signal][data-as-of]").forEach(applyCard);
    }

    function formatDate(iso) {
        if (!iso || typeof iso !== "string") {
            return null;
        }
        var parts = iso.slice(0, 10).split("-");
        if (parts.length !== 3) {
            return iso;
        }
        var year = Number(parts[0]);
        var month = Number(parts[1]);
        var day = Number(parts[2]);
        if (!year || !month || !day) {
            return iso;
        }
        return MONTHS[month - 1] + " " + day + ", " + year;
    }

    function formatRetrieved(iso) {
        var formatted = formatDate(iso);
        return formatted || null;
    }

    function commas(n) {
        if (typeof n !== "number" || !isFinite(n)) {
            return null;
        }
        return Math.round(n).toLocaleString("en-US");
    }

    function pctPoints(n) {
        if (typeof n !== "number" || !isFinite(n)) {
            return null;
        }
        var abs = Math.abs(n).toFixed(2);
        if (n > 0) {
            return "+" + abs;
        }
        if (n < 0) {
            return "−" + abs;
        }
        return "0.00";
    }

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) {
            el.textContent = text;
        }
    }

    function setCacheNote(id, signal) {
        var el = document.getElementById(id);
        if (!el) {
            return;
        }
        if (signal && signal.status === "cached" && signal.cache_note) {
            el.hidden = false;
            el.textContent = signal.cache_note;
        } else {
            el.hidden = true;
            el.textContent = "";
        }
    }

    function curveText(s) {
        if (!s || !s.as_of) {
            return "No official Treasury yield reading is on file. No value was invented.";
        }
        var asOf = formatDate(s.as_of);
        var shape3 = s.shape_10y_3m || "n.a.";
        var shape2 = s.shape_10y_2y || "n.a.";
        var same = s.shape_10y_3m && s.shape_10y_3m === s.shape_10y_2y
            ? "Both of those maturity pairs were " + s.shape_10y_3m + " (a " + (s.spread_10y_3m < 0 ? "negative" : "positive") + " spread)."
            : "The 10-year minus 3-month pair was " + shape3 + "; the 10-year minus 2-year pair was " + shape2 + ".";
        return (
            "As of " + asOf + ", the 10-year par yield was " + Number(s.y10y).toFixed(2) +
            "%, the 3-month was " + Number(s.y3m).toFixed(2) + "%, and the 2-year was " +
            Number(s.y2y).toFixed(2) + "%. The 10-year minus 3-month spread was " +
            pctPoints(s.spread_10y_3m) + " percentage points, and the 10-year minus 2-year spread was " +
            pctPoints(s.spread_10y_2y) + " percentage points. " + same +
            " Source: " + (s.source || "U.S. Treasury, Daily Treasury Par Yield Curve Rates") + "."
        );
    }

    function wowPhrase(s) {
        if (typeof s.sa_initial_wow !== "number" || !s.prior_week_sa_initial_claims) {
            return "";
        }
        var prior = commas(s.prior_week_sa_initial_claims);
        var wow = s.sa_initial_wow;
        var magnitude = commas(Math.abs(wow));
        if (wow > 0) {
            return " The prior week’s official seasonally adjusted reading was " + prior +
                ", so the latest week was " + magnitude + " higher.";
        }
        if (wow < 0) {
            return " The prior week’s official seasonally adjusted reading was " + prior +
                ", so the latest week was " + magnitude + " lower.";
        }
        return " The prior week’s official seasonally adjusted reading was also " + prior + ".";
    }

    function claimsText(s) {
        if (!s || !s.as_of) {
            return "No official jobless-claims reading is on file. No value was invented.";
        }
        var avg = typeof s.sa_initial_claims_4w_avg === "number"
            ? " and the official four-week average was " + commas(s.sa_initial_claims_4w_avg)
            : "";
        return (
            "For the week ended " + formatDate(s.as_of) + ", seasonally adjusted initial claims were " +
            commas(s.sa_initial_claims) + avg + "." + wowPhrase(s) +
            " Incomplete later weeks in the file are not shown. Source: " +
            (s.source || "U.S. Department of Labor, Employment and Training Administration, national weekly claims file") + "."
        );
    }

    function dollarText(s) {
        if (!s || !s.as_of) {
            return "No official broad-dollar reading is on file. No value was invented.";
        }
        var unit = s.unit || "official index (base year as published)";
        return (
            "As of " + formatDate(s.as_of) + ", the nominal broad dollar index was " +
            Number(s.index).toFixed(4) + ", with an official unit of " + unit +
            ". Days marked ND in the Board’s file are left as gaps. Source: " +
            (s.source || "Board of Governors of the Federal Reserve System, H.10 Foreign Exchange Rates, series JRXWTFB_N.B") + "."
        );
    }

    function render(board) {
        if (!board || !board.signals) {
            applyAll();
            return;
        }
        // Do not write a "retrieved" date into the intro. Cards show the
        // official observation date; a cached value keeps its prior stamp.
        var map = {
            treasury_yield_curve: "signal-curve-body",
            jobless_claims: "signal-claims-body",
            broad_dollar: "signal-dollar-body"
        };
        var cacheMap = {
            treasury_yield_curve: "signal-curve-cache",
            jobless_claims: "signal-claims-cache",
            broad_dollar: "signal-dollar-cache"
        };
        var writers = {
            treasury_yield_curve: curveText,
            jobless_claims: claimsText,
            broad_dollar: dollarText
        };
        Object.keys(map).forEach(function (key) {
            var s = board.signals[key];
            if (!s) {
                return;
            }
            setText(map[key], writers[key](s));
            setCacheNote(cacheMap[key], s);
            var card = document.querySelector('[data-signal="' + key + '"]');
            if (card) {
                var asOf = s.observation_date || s.as_of;
                if (asOf) {
                    card.setAttribute("data-as-of", asOf);
                }
                if (s.source_url) {
                    card.setAttribute("data-source-url", s.source_url);
                }
            }
        });
        applyAll();
    }

    function init() {
        applyAll();
        if (!document.getElementById("signals")) {
            return;
        }
        fetch(DATA_URL, { credentials: "same-origin", cache: "no-store" })
            .then(function (resp) {
                if (!resp.ok) {
                    throw new Error("HTTP " + resp.status);
                }
                return resp.json();
            })
            .then(render)
            .catch(function () {
                // Keep the last committed HTML figures. Do not invent replacements.
                applyAll();
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    window.GSOfficialSignals = {
        MAX_AGE_DAYS: MAX_AGE_DAYS,
        ageDays: ageDays,
        staleState: staleState,
        applyAll: applyAll,
        render: render
    };

})();
