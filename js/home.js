/**
 * Homepage video list.
 * Edit /data/videos.json (newest first). See the README.
 * The player is a thumbnail until a visitor presses play.
 */
(function () {
    'use strict';

    var ID_RE = /^[A-Za-z0-9_-]{11}$/;
    var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    var YOUTUBE_SUBSCRIBE = 'https://www.youtube.com/@GlobalSignalOrg?sub_confirmation=1';
    var SUBSTACK_SUBSCRIBE = 'https://globalsignalorg.substack.com/subscribe';

    var featured = document.getElementById('featured');
    var earlier = document.getElementById('earlier');
    var earlierList = document.getElementById('earlier-list');

    if (!featured || !earlier || !earlierList) {
        return;
    }

    init();

    function init() {
        var year = document.getElementById('year');
        if (year) {
            year.textContent = String(new Date().getFullYear());
        }
        loadVideos().then(function (videos) {
            show(videos, 0, false);
        });
    }

    function loadVideos() {
        return fetch('/data/videos.json', { cache: 'no-cache' })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.text();
            })
            .then(function (text) {
                return normalize(JSON.parse(text.replace(/^\uFEFF/, '')));
            })
            .catch(function (error) {
                console.warn('Global Signal: could not read data/videos.json. Showing the coming-soon state.', error);
                return [];
            });
    }

    function normalize(data) {
        var list = [];
        if (Array.isArray(data)) {
            list = data;
        } else if (data && Array.isArray(data.videos)) {
            list = data.videos;
        }

        var videos = [];
        list.forEach(function (item, index) {
            if (!item || typeof item !== 'object') {
                console.warn('Global Signal: skipped a video entry that is not an object.', item);
                return;
            }
            var id = typeof item.id === 'string' ? item.id.trim() : '';
            var title = typeof item.title === 'string' ? item.title.trim() : '';
            if (!ID_RE.test(id) || !title) {
                console.warn('Global Signal: skipped a video entry missing a valid YouTube id or title.', item);
                return;
            }
            var date = typeof item.date === 'string' ? item.date.trim() : '';
            if (date && !DATE_RE.test(date)) {
                console.warn('Global Signal: video "' + title + '" has a date that is not YYYY-MM-DD. It will sort last.', date);
            }
            var description = typeof item.description === 'string' ? item.description.trim() : '';
            videos.push({
                id: id,
                title: title,
                date: DATE_RE.test(date) ? date : '',
                description: description,
                order: index
            });
        });

        videos.sort(function (a, b) {
            var delta = dateValue(b.date) - dateValue(a.date);
            if (delta !== 0) {
                return delta;
            }
            return a.order - b.order;
        });

        return videos;
    }

    function dateValue(iso) {
        if (!DATE_RE.test(iso)) {
            return -Infinity;
        }
        var time = Date.parse(iso + 'T00:00:00Z');
        return Number.isNaN(time) ? -Infinity : time;
    }

    function formatDate(iso) {
        var time = dateValue(iso);
        if (time === -Infinity) {
            return '';
        }
        return new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC'
        }).format(new Date(time));
    }

    function show(videos, index, autoplay) {
        if (!videos.length) {
            earlier.hidden = true;
            earlierList.replaceChildren();
            if (!featured.querySelector('.empty-card')) {
                renderEmpty();
            }
            return;
        }

        var current = videos[Math.max(0, Math.min(index, videos.length - 1))];
        renderFeature(current);
        renderEarlier(videos, current);

        if (autoplay) {
            var frame = featured.querySelector('.frame');
            if (frame) {
                mountPlayer(frame, current);
            }
        }
    }

    function renderEmpty() {
        var card = el('div', 'card empty-card');
        var heading = el('h2', 'empty-title');
        heading.id = 'feature-heading';
        heading.textContent = 'First video coming soon';

        var actions = el('div', 'cta-row');
        actions.append(
            linkButton(SUBSTACK_SUBSCRIBE, 'Subscribe on Substack', 'btn btn-primary'),
            linkButton(YOUTUBE_SUBSCRIBE, 'Subscribe on YouTube', 'btn btn-secondary')
        );

        card.append(heading, actions);
        featured.replaceChildren(card);
    }

    function renderFeature(video) {
        var card = el('article', 'card feature-card');
        var frame = el('div', 'frame');
        frame.append(facade(video));

        var body = el('div', 'feature-body');
        var heading = el('h2', 'feature-title');
        heading.id = 'feature-heading';
        var prefix = el('span', 'visually-hidden');
        prefix.textContent = 'Latest video: ';
        heading.append(prefix, document.createTextNode(video.title));

        body.append(heading);

        var pretty = formatDate(video.date);
        if (pretty) {
            var time = el('time', 'feature-date');
            time.dateTime = video.date;
            time.textContent = pretty;
            body.append(time);
        }

        if (video.description) {
            var description = el('p', 'feature-desc');
            description.textContent = video.description;
            body.append(description);
        }

        var watch = el('p', 'watch');
        var watchLink = document.createElement('a');
        watchLink.href = 'https://www.youtube.com/watch?v=' + video.id;
        watchLink.target = '_blank';
        watchLink.rel = 'noopener noreferrer';
        watchLink.textContent = 'Watch on YouTube';
        var newTab = el('span', 'visually-hidden');
        newTab.textContent = ' (opens in a new tab)';
        watchLink.append(newTab);
        watch.append(watchLink);
        body.append(watch);

        card.append(frame, body);
        featured.replaceChildren(card);
    }

    function facade(video) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'facade';
        button.setAttribute('aria-label', 'Play video: ' + video.title);

        var image = document.createElement('img');
        setThumb(image, video.id);

        var badge = el('span', 'play-badge');
        badge.setAttribute('aria-hidden', 'true');
        badge.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" focusable="false" aria-hidden="true"><path fill="currentColor" d="M9 7.2v9.6l8.2-4.8L9 7.2z"/></svg>';

        button.append(image, badge);
        button.addEventListener('click', function () {
            mountPlayer(frameOf(button), video);
        });
        return button;
    }

    function frameOf(button) {
        return button.parentNode;
    }

    function mountPlayer(frame, video) {
        var iframe = document.createElement('iframe');
        iframe.src = 'https://www.youtube-nocookie.com/embed/' + video.id + '?autoplay=1';
        iframe.title = video.title;
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('allowfullscreen', '');
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.replaceChildren(iframe);
        iframe.addEventListener('load', function () {
            iframe.focus();
        });
    }

    function renderEarlier(videos, current) {
        var rest = videos.filter(function (video) {
            return video !== current;
        });

        if (rest.length === 0) {
            earlier.hidden = true;
            earlierList.replaceChildren();
            return;
        }

        var items = rest.map(function (video) {
            return earlierItem(video, videos);
        });
        earlierList.replaceChildren.apply(earlierList, items);
        earlier.hidden = false;
    }

    function earlierItem(video, videos) {
        var item = el('li');
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'more-card';

        var pretty = formatDate(video.date);
        var label = 'Play ' + video.title + ' in the featured player';
        if (pretty) {
            label += ', ' + pretty;
        }
        button.setAttribute('aria-label', label);

        var image = document.createElement('img');
        setThumb(image, video.id);
        image.loading = 'lazy';

        var title = el('span', 'more-title');
        title.textContent = video.title;

        button.append(image, title);
        if (pretty) {
            var time = el('time');
            time.dateTime = video.date;
            time.textContent = pretty;
            button.append(time);
        }

        button.addEventListener('click', function () {
            var index = videos.indexOf(video);
            show(videos, index, true);
        });

        item.append(button);
        return item;
    }

    function setThumb(image, id) {
        image.alt = '';
        image.width = 480;
        image.height = 360;
        image.decoding = 'async';
        // hqdefault exists for every public video. maxresdefault 404s often enough
        // to flash YouTube's placeholder.
        image.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
    }

    function linkButton(href, label, className) {
        var link = document.createElement('a');
        link.className = className;
        link.href = href;
        link.textContent = label;
        return link;
    }

    function el(tag, className) {
        var node = document.createElement(tag);
        if (className) {
            node.className = className;
        }
        return node;
    }
})();
