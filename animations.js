// =====================================================
//  NeuCast animations (pairs with animations.css)
//  Load in <head>, right after theme.js:  <script src="animations.js"></script>
//
//    1. Loader      morphing-shape page loader (first page of a visit only)
//    2. Transitions page leave fallback, theme fade, pop-up exit, top progress bar
//    3. Buttons     ripple on click / key press
//    4. Cards       scroll reveal, staggered list entrance, pointer spotlight, count-up
//    5. Geometry    floating background shapes, ring draw, chart grow, calculator morph
//
//  Nothing here changes how the site works: it only adds classes and decoration.
//  With "reduce motion" on, almost everything is skipped.
// =====================================================
(function () {
    "use strict";

    var root = document.documentElement;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var readyCallbacks = [];
    var isReady = false;

    root.classList.add("nc-anim");
    if ("onpagereveal" in window) root.classList.add("nc-vt");   // browser does cross-page view transitions itself

    function markReady() {
        if (isReady) return;
        isReady = true;
        root.classList.add("nc-ready");
        readyCallbacks.splice(0).forEach(function (fn) { fn(); });
    }
    function whenReady(fn) { if (isReady) fn(); else readyCallbacks.push(fn); }

    function onDom(fn) {
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
        else fn();
    }

    // ---------- 1. Page loader ----------
    var firstVisit = false;
    try {
        firstVisit = !window.sessionStorage.getItem("nc-seen");
        window.sessionStorage.setItem("nc-seen", "1");
    } catch (e) { firstVisit = false; }

    if (firstVisit && !reduce) {
        root.classList.add("nc-loading");
        var shownAt = Date.now();
        var finished = false;

        var finish = function () {
            if (finished) return;
            finished = true;
            var wait = Math.max(0, 1200 - (Date.now() - shownAt));   // long enough to see one morph, never a blink
            window.setTimeout(function () {
                root.classList.add("nc-loaded");
                root.classList.remove("nc-loading");
                markReady();
                window.setTimeout(function () { root.classList.remove("nc-loaded"); }, 450);
            }, wait);
        };

        // Wait for the page to load and its data skeletons to clear (at most ~2s more)
        var afterLoad = function () {
            var tries = 0;
            (function check() {
                if (!document.querySelector('[aria-busy="true"]') || tries++ > 20) finish();
                else window.setTimeout(check, 100);
            })();
        };
        if (document.readyState === "complete") afterLoad();
        else window.addEventListener("load", afterLoad);
        window.setTimeout(finish, 4000);   // safety net
    } else {
        markReady();
    }

    // ---------- 2a. Page leave (fallback for browsers without view transitions) ----------
    document.addEventListener("click", function (event) {
        if (reduce || root.classList.contains("nc-vt")) return;
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var link = event.target.closest && event.target.closest("a[href]");
        if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
        var url;
        try { url = new URL(link.href, window.location.href); } catch (e) { return; }
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;   // same-page anchor
        event.preventDefault();
        root.classList.add("nc-leaving");
        window.setTimeout(function () { window.location.href = link.href; }, 190);
    });
    window.addEventListener("pageshow", function (event) {
        root.classList.remove("nc-leaving");
        if (event.persisted) markReady();
    });

    // ---------- 2b. Theme change: fade colors instead of snapping ----------
    var themeTimer = 0;
    document.addEventListener("change", function (event) {
        if (reduce || !event.target || event.target.name !== "theme") return;
        root.classList.add("nc-theming");
        window.clearTimeout(themeTimer);
        themeTimer = window.setTimeout(function () { root.classList.remove("nc-theming"); }, 520);
    }, true);

    // ---------- 3. Button ripple ----------
    var RIPPLE_TARGETS = ".btn, .icon-btn, .chip, .calc-shape, .tab-btn, .nav-link, .cal-day, .rec-item, .segmented label, .pw-toggle, .link-btn";

    function ripple(el, x, y) {
        if (reduce || !el || el.disabled || el.getAttribute("aria-disabled") === "true") return;
        var host = null;
        for (var i = 0; i < el.children.length; i++) {
            if (el.children[i].classList.contains("nc-ripple-host")) { host = el.children[i]; break; }
        }
        if (!host) {
            if (window.getComputedStyle(el).position === "static") el.style.position = "relative";
            host = document.createElement("span");
            host.className = "nc-ripple-host";
            host.setAttribute("aria-hidden", "true");
            el.appendChild(host);
        }
        var box = el.getBoundingClientRect();
        var size = Math.max(box.width, box.height) * 2.2;
        if (x === undefined) { x = box.left + box.width / 2; y = box.top + box.height / 2; }
        var dot = document.createElement("span");
        dot.className = "nc-ripple";
        dot.style.width = dot.style.height = size + "px";
        dot.style.left = (x - box.left - size / 2) + "px";
        dot.style.top = (y - box.top - size / 2) + "px";
        host.appendChild(dot);
        dot.addEventListener("animationend", function () { if (dot.parentNode) dot.parentNode.removeChild(dot); });
    }

    document.addEventListener("pointerdown", function (event) {
        if (event.button !== 0) return;
        var el = event.target.closest && event.target.closest(RIPPLE_TARGETS);
        if (el) ripple(el, event.clientX, event.clientY);
    }, { passive: true });
    document.addEventListener("click", function (event) {
        if (event.detail !== 0) return;   // keyboard "click": ripple from the center
        var el = event.target.closest && event.target.closest(RIPPLE_TARGETS);
        if (el) ripple(el);
    });

    // ---------- Everything below needs the page body ----------
    onDom(function () {
        addGeometry();
        addTopbar();
        watchModals();
        watchPointer();
        whenReady(startReveal);
        watchLists();
    });

    // ---------- 5a. Floating background shapes ----------
    var SHAPES = [
        // shape,       color,          size, top, left, opacity, seconds, dx, dy
        ["circle",      "academic",     120,   8,   -3, .07, 26,  50,  40],
        ["triangle",    "urgent",        70,  18,   88, .08, 22, -40,  30],
        ["square",      "events",        56,  62,    6, .08, 24,  35, -30],
        ["hexagon",     "general",      140,  70,   82, .07, 30, -50, -40],
        ["ring",        "academic",      64,  42,   48, .06, 28,  60,  50],
        ["pentagon",    "events",        44,  88,   36, .08, 20,  30, -40],
        ["parallelogram","general",      60,   4,   58, .07, 25, -30,  35],
        ["circle",      "urgent",        28,  34,   22, .10, 18,  40,  30],
        ["triangle",    "academic",      38,  52,   94, .09, 21, -35, -25],
        ["square",      "general",       26,  92,   70, .10, 19,  25,  30]
    ];

    function geoLayer(list, scale) {
        var layer = document.createElement("div");
        layer.className = "nc-geo";
        layer.setAttribute("aria-hidden", "true");
        list.forEach(function (s, index) {
            var el = document.createElement("span");
            el.className = "nc-geo__s " + s[0];
            el.style.setProperty("--c", "var(--cat-" + s[1] + ")");
            el.style.setProperty("--sz", Math.round(s[2] * scale) + "px");
            el.style.top = s[3] + "%";
            el.style.left = s[4] + "%";
            el.style.setProperty("--o", s[5]);
            el.style.setProperty("--t", s[6] + "s");
            el.style.setProperty("--dx", s[7] + "px");
            el.style.setProperty("--dy", s[8] + "px");
            el.style.setProperty("--dl", (-index * 2.3) + "s");
            layer.appendChild(el);
        });
        return layer;
    }

    function addGeometry() {
        if (reduce) return;
        document.body.insertBefore(geoLayer(SHAPES, 1), document.body.firstChild);
        var aside = document.querySelector(".auth-aside");
        if (aside) {
            var asideShapes = [
                ["hexagon", "general", 180, 62, 70, .16, 28, -40, -30],
                ["circle", "academic", 110, -4, 74, .14, 24, 30, 40],
                ["triangle", "urgent", 70, 40, 86, .14, 20, -30, 30],
                ["square", "events", 54, 84, 12, .15, 22, 40, -30],
                ["ring", "academic", 90, 18, -6, .13, 26, 40, 30]
            ];
            aside.insertBefore(geoLayer(asideShapes, 1), aside.firstChild);
        }
    }

    // ---------- 2c. Top progress bar while anything is loading ----------
    function addTopbar() {
        var bar = document.createElement("div");
        bar.className = "nc-topbar";
        bar.setAttribute("aria-hidden", "true");
        document.body.appendChild(bar);

        var busySince = 0;
        var queued = false;
        function update() {
            queued = false;
            var busy = !!document.querySelector('[aria-busy="true"]');
            if (busy && !busySince) busySince = Date.now();
            if (!busy) busySince = 0;
            bar.classList.toggle("is-active", busy && Date.now() - busySince < 10000);
        }
        function queue() { if (!queued) { queued = true; window.requestAnimationFrame(update); } }
        new MutationObserver(queue).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["aria-busy"], childList: true });
        update();
        window.setTimeout(update, 10500);
    }

    // ---------- 2d. Pop-up exit: a short-lived copy fades out after ui.js hides the real one ----------
    function watchModals() {
        if (reduce) return;
        document.addEventListener("scroll", function (event) {
            var t = event.target;
            if (t && t.classList && t.classList.contains("modal__body")) t._ncScroll = t.scrollTop;
        }, true);

        new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                var modal = m.target;
                if (!modal.classList || !modal.classList.contains("modal") || modal.classList.contains("nc-modal-ghost")) return;
                if (m.oldValue !== null || !modal.hidden) return;   // only "was visible, now hidden"
                var ghost = modal.cloneNode(true);
                ghost.hidden = false;
                ghost.removeAttribute("id");
                Array.prototype.forEach.call(ghost.querySelectorAll("[id]"), function (n) { n.removeAttribute("id"); });
                ghost.classList.add("nc-modal-ghost");
                ghost.setAttribute("aria-hidden", "true");
                ghost.setAttribute("inert", "");
                document.body.appendChild(ghost);
                var bodies = modal.querySelectorAll(".modal__body");
                var copies = ghost.querySelectorAll(".modal__body");
                for (var i = 0; i < bodies.length && i < copies.length; i++) copies[i].scrollTop = bodies[i]._ncScroll || 0;
                window.setTimeout(function () { if (ghost.parentNode) ghost.parentNode.removeChild(ghost); }, 240);
            });
        }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["hidden"], attributeOldValue: true });
    }

    // ---------- 4a / 5b. Pointer: card spotlight + background parallax ----------
    function watchPointer() {
        if (reduce || !finePointer) return;
        var layers = document.querySelectorAll(".nc-geo");
        var pending = null;
        document.addEventListener("pointermove", function (event) {
            if (pending) { pending = event; return; }
            pending = event;
            window.requestAnimationFrame(function () {
                var e = pending;
                pending = null;
                var card = e.target.closest && e.target.closest(".notice, .stat");
                if (card) {
                    var box = card.getBoundingClientRect();
                    card.style.setProperty("--mx", (e.clientX - box.left) + "px");
                    card.style.setProperty("--my", (e.clientY - box.top) + "px");
                }
                var px = ((e.clientX / window.innerWidth) - .5) * -24;
                var py = ((e.clientY / window.innerHeight) - .5) * -24;
                for (var i = 0; i < layers.length; i++) {
                    layers[i].style.setProperty("--px", px.toFixed(1) + "px");
                    layers[i].style.setProperty("--py", py.toFixed(1) + "px");
                }
            });
        }, { passive: true });
    }

    // ---------- 4b. Scroll reveal for sections ----------
    var REVEAL = ".intro, .search, .board__head, .filters, .rail > .panel, .rail > #readRing, .footer, .auth-card, .admin-stack > *, .stat, .profile-actions";
    var revealObserver = null;

    function startReveal() {
        if (reduce || !("IntersectionObserver" in window)) return;
        revealObserver = new IntersectionObserver(function (entries) {
            var batch = 0;
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                revealObserver.unobserve(el);
                el.style.setProperty("--nc-d", Math.min(batch++, 6));
                el.classList.add("nc-in");
                var stat = el.classList.contains("stat") && el.querySelector(".stat-number");
                if (stat) countUp(stat);
                // Hand the element back to its own transitions once it has arrived
                window.setTimeout(function () {
                    el.classList.remove("nc-reveal", "nc-in", "nc-reveal--scale", "nc-reveal--left");
                    el.style.removeProperty("--nc-d");
                }, 1200);
            });
        }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
        document.querySelectorAll(REVEAL).forEach(observeReveal);
    }

    function observeReveal(el) {
        if (!revealObserver || el.closest(".modal") || el.classList.contains("nc-reveal") || el._ncRevealed) return;
        el._ncRevealed = true;
        if (el.classList.contains("stat")) el.classList.add("nc-reveal--scale");
        el.classList.add("nc-reveal");
        revealObserver.observe(el);
    }

    // ---------- 4c. Numbers count up the first time they are seen ----------
    function countUp(el) {
        if (reduce || el._ncCounted) return;
        var target = parseInt(el.textContent, 10);
        if (!(target > 0)) return;
        el._ncCounted = true;
        el._ncCounting = true;
        var start = 0;
        function step(time) {
            if (!el._ncCounting) return;
            if (!start) start = time;
            var p = Math.min(1, (time - start) / 900);
            var value = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
            el._ncLast = value;
            el.textContent = value;
            if (p < 1) window.requestAnimationFrame(step);
            else el._ncCounting = false;
        }
        window.requestAnimationFrame(step);
        // If the page updates the number while it is counting, stop and keep the real value
        new MutationObserver(function (m, obs) {
            if (el._ncCounting && el.textContent !== el._ncLast) { el._ncCounting = false; obs.disconnect(); }
            if (!el._ncCounting) obs.disconnect();
        }).observe(el, { childList: true, characterData: true, subtree: true });
    }

    // ---------- 4d / 5c. Lists drawn by the page scripts ----------
    var LIST_ITEMS = ".notice, .admin-item, .student-item, .question-item, .rec-item, .q-item, .contact-item, .geo-card, .chart-item, .empty, .about-steps li, .needs__body";
    var signatures = typeof WeakMap === "function" ? new WeakMap() : null;
    var seen = { ring: false, chart: false, calcShape: "" };

    function itemKey(el) {
        var title = el.querySelector("h3, strong");
        return (title ? title.textContent : el.textContent).trim().slice(0, 60);
    }

    // Staggers the cards in a container, but only when the list really changed
    // (so a background sync or a "mark as read" does not replay the whole entrance)
    function animateList(container) {
        var items = Array.prototype.filter.call(container.children, function (c) { return c.matches && c.matches(LIST_ITEMS); });
        if (!items.length) return;
        var sig = items.map(itemKey).join("|");
        if (signatures && signatures.get(container) === sig) return;
        if (signatures) signatures.set(container, sig);
        items.forEach(function (el, i) {
            el.style.setProperty("--i", Math.min(i, 8));
            el.classList.add("nc-enter");
            el.addEventListener("animationend", function done(e) {
                if (e.target !== el || e.animationName !== "nc-card-in") return;
                el.classList.remove("nc-enter");
                el.removeEventListener("animationend", done);
            });
        });
    }

    function animateCalendar(grid) {
        var title = document.getElementById("calendarTitle");
        var key = title ? title.textContent : "";
        if (signatures && signatures.get(grid) === key) return;
        if (signatures) signatures.set(grid, key);
        Array.prototype.forEach.call(grid.querySelectorAll(".cal-day"), function (day, i) {
            day.style.setProperty("--i", i);
            day.classList.add("nc-enter-pop");
        });
    }

    function bump(el) {
        if (!el || el.textContent === "-" || el.textContent === el._ncPrev) return;
        el._ncPrev = el.textContent;
        el.classList.remove("nc-bump");
        void el.offsetWidth;   // restart the animation
        el.classList.add("nc-bump");
    }

    function handleNode(node) {
        if (node.nodeType !== 1) return;
        var parent = node.parentNode;
        if (parent && node.matches(LIST_ITEMS)) animateList(parent);

        // Sections that appear later (e.g. admin stats after data loads)
        if (revealObserver) {
            if (node.matches(REVEAL)) observeReveal(node);
            node.querySelectorAll && node.querySelectorAll(REVEAL).forEach(observeReveal);
        }
        // Progress ring: draw it the first time only
        if (!seen.ring && node.matches(".progress")) { seen.ring = true; node.classList.add("nc-ring-intro"); }
        // Admin chart: grow the shapes the first time only
        if (!seen.chart && node.matches(".chart-item")) {
            seen.chart = true;
            var chart = node.parentNode;
            chart.classList.add("nc-chart-intro");
            window.setTimeout(function () { chart.classList.remove("nc-chart-intro"); }, 1500);
        }
    }

    function watchLists() {
        if (reduce) return;
        var calcArea = document.getElementById("calcArea");
        var calcPerim = document.getElementById("calcPerim");
        new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                if (m.type !== "childList") return;
                var target = m.target;
                if (target.id === "calendarGrid") { animateCalendar(target); return; }
                if (target.id === "calcPreview") {
                    var shape = target.querySelector(".shape");
                    var kind = shape ? shape.className : "";
                    if (kind && kind !== seen.calcShape) {
                        seen.calcShape = kind;
                        target.classList.add("nc-morph");
                        window.setTimeout(function () { target.classList.remove("nc-morph"); }, 700);
                    }
                    return;
                }
                if (target === calcArea || target === calcPerim) { bump(target); return; }
                Array.prototype.forEach.call(m.addedNodes, handleNode);
            });
        }).observe(document.body, { childList: true, subtree: true });

        // Anything already on the page when we start
        document.querySelectorAll(".notices, .admin-list, #recoveryList, #myQuestions, .contact-list").forEach(animateList);
    }
})();
