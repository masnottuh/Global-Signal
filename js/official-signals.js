/**
 * Official-readings board: mark or hide stale cards.
 * Static fallback cards use data-as-of / data-signal. If
 * /data/official-signals.json is present, it is applied first, then the
 * same age rules run again. "retrieved" is not written into the page.
 */
(function () {
    "use strict";

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

    function formatDate(iso) {
        var d = new Date(iso + "T12:00:00-08:00");
        if (isNaN(d.getTime())) {
            return iso;
        }
        return d.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "America/Los_Angeles"
        });
    }

    function applyCard(card) {
        var key = card.getAttribute("data-signal");
        var asOf = card.getAttribute("data-as-of");
        var url = card.getAttribute("data-source-url") || "";
        var state = staleState(key, asOf);
        var body = card.querySelector("[data-signal-body]");
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
                    ? ' See the official source: <a href="' +
                      url +
                      '">' +
                      url +
                      "</a>."
                    : "";
                body.innerHTML =
                    "This reading is out of date (last official observation " +
                    formatDate(asOf) +
                    ")." +
                    src;
            }
        }
    }

    function applyAll() {
        document.querySelectorAll("[data-signal][data-as-of]").forEach(applyCard);
    }

    function fillCard(key, html, asOf, sourceUrl) {
        var card = document.querySelector('[data-signal="' + key + '"]');
        if (!card) {
            return;
        }
        if (asOf) {
            card.setAttribute("data-as-of", asOf);
        }
        if (sourceUrl) {
            card.setAttribute("data-source-url", sourceUrl);
        }
        var body = card.querySelector("[data-signal-body]");
        if (body && html) {
            body.innerHTML = html;
        }
    }

    function render(board) {
        var signals = (board && board.signals) || {};
        Object.keys(signals).forEach(function (key) {
            var s = signals[key];
            if (!s) {
                return;
            }
            var asOf = s.observation_date || s.as_of;
            fillCard(key, s.html || s.summary_html, asOf, s.source_url);
        });
        applyAll();
    }

    document.addEventListener("DOMContentLoaded", function () {
        applyAll();
        fetch("/data/official-signals.json", { cache: "no-store" })
            .then(function (resp) {
                return resp.ok ? resp.json() : null;
            })
            .then(function (board) {
                if (board) {
                    render(board);
                }
            })
            .catch(function () {
                /* Keep the static fallback cards. */
            });
    });

    window.GSOfficialSignals = {
        MAX_AGE_DAYS: MAX_AGE_DAYS,
        ageDays: ageDays,
        staleState: staleState,
        applyAll: applyAll,
        render: render
    };
})();
