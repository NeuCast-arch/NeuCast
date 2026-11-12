/* =====================================================
   NEUCAST ALERTS (free, no server, no paid service)

   What it does: tells a signed-in student the moment an announcement for
   them is posted or edited. It watches the same announcement data that
   cloud.js already keeps in sync, so nothing new is stored in the cloud.

   Three ways a student is told (all free, built into the browser):
     1. In the page      A toast with a "Read" button. Urgent and Health notices
                         stay longer, are announced to screen readers, and chime.
     2. Tab title        "(2) NeuCast" while the tab is in the background.
     3. System alert     A real notification from the phone or computer, even when
                         another tab or window is in front (needs one tap on
                         "Turn on alerts"). Tapping it opens the announcement.

   Honest limit: with no server, nothing can wake a browser that is fully
   closed. When the student opens NeuCast again they get a catch-up summary
   of what they missed.

   Load after data.js (and after script.js on the homepage).
   Loaded by: index.html, archive.html, feedback.html, careers.html, safety.html
   ===================================================== */
(function () {
    "use strict";

    if (typeof getCurrentStudent !== "function") return;
    var student = getCurrentStudent();
    if (!student) { window.NeuNotify = null; return; }   // admins post notices; they do not need alerts

    var PREFS_KEY = "neucast_alert_prefs";                  // this device only, not synced
    var SEEN_KEY = "neucast_notified_" + student.id;        // what this device has already alerted about
    var PROMPT_KEY = "neucast_alert_prompt_off";
    var HIGH = { urgent: true, safety: true };              // categories that interrupt

    var baseTitle = document.title;
    var missed = 0;
    var swReg = null;
    var iconUrl = null;

    // ---------------------------------------------------------------- preferences
    function supported() { return "Notification" in window; }
    function permission() { return supported() ? Notification.permission : "unsupported"; }

    function loadPrefs() {
        var saved = readJSON(PREFS_KEY, {});
        return {
            on: saved.on !== false,                                           // alerts inside the page
            sound: saved.sound !== false,                                     // chime for urgent notices
            system: saved.system === undefined ? permission() === "granted" : saved.system === true
        };
    }
    var prefs = loadPrefs();
    function savePrefs() { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }

    function pushOn() { return !!(window.NeuPush && window.NeuPush.enabled()); }

    function systemReady() { return prefs.on && prefs.system && permission() === "granted"; }

    // ---------------------------------------------------------------- small helpers
    function visibleToMe(item) {
        var a = audienceOf(item);
        return a === "all" || a === student.course;
    }
    function isExpired(item) {
        if (!item.expires) return false;
        var end = new Date(item.expires + "T23:59:59");
        return !isNaN(end.getTime()) && end.getTime() < Date.now();
    }
    function excerpt(text, max) {
        text = String(text || "").replace(/\s+/g, " ").trim();
        if (text.length <= max) return text;
        var cut = text.slice(0, max);
        return cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)) + "...";
    }
    function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

    // A small square "N" icon drawn at run time, so no image file is needed
    function appIcon() {
        if (iconUrl !== null) return iconUrl;
        try {
            var c = document.createElement("canvas");
            c.width = c.height = 192;
            var g = c.getContext("2d"), r = 40, s = 192;
            g.fillStyle = "#4F46E5";
            g.beginPath();
            g.moveTo(r, 0); g.arcTo(s, 0, s, s, r); g.arcTo(s, s, 0, s, r); g.arcTo(0, s, 0, 0, r); g.arcTo(0, 0, s, 0, r);
            g.closePath(); g.fill();
            g.fillStyle = "#FFFFFF";
            g.font = "700 118px system-ui, sans-serif";
            g.textAlign = "center"; g.textBaseline = "middle";
            g.fillText("N", s / 2, s / 2 + 6);
            iconUrl = c.toDataURL("image/png");
        } catch (e) { iconUrl = ""; }
        return iconUrl;
    }

    // ---------------------------------------------------------------- sound (WebAudio, no file)
    var audio = null;
    function unlockAudio() {
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            audio = audio || new AC();
            if (audio.state === "suspended") audio.resume();
        } catch (e) { /* no sound */ }
    }
    ["pointerdown", "keydown", "touchstart"].forEach(function (name) {
        window.addEventListener(name, unlockAudio, { passive: true });
    });

    function chime() {
        if (!prefs.sound || !audio || audio.state !== "running") return;
        try {
            var now = audio.currentTime;
            [[880, 0], [1175, 0.16]].forEach(function (n) {
                var osc = audio.createOscillator(), gain = audio.createGain();
                osc.type = "sine";
                osc.frequency.value = n[0];
                gain.gain.setValueAtTime(0.0001, now + n[1]);
                gain.gain.exponentialRampToValueAtTime(0.09, now + n[1] + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + n[1] + 0.34);
                osc.connect(gain); gain.connect(audio.destination);
                osc.start(now + n[1]); osc.stop(now + n[1] + 0.36);
            });
        } catch (e) { /* no sound */ }
    }

    // ---------------------------------------------------------------- system notifications
    function registerWorker() {
        if (swReg) return Promise.resolve(swReg);
        if (!("serviceWorker" in navigator)) return Promise.resolve(null);
        if (pushOn()) {   // OneSignal's worker owns this folder; borrow it, do not register a second one
            if (!navigator.serviceWorker.getRegistration) return Promise.resolve(null);
            try {
                return navigator.serviceWorker.getRegistration().then(function (reg) { swReg = reg || null; return swReg; }).catch(function () { return null; });
            } catch (e) { return Promise.resolve(null); }
        }
        return navigator.serviceWorker.register("sw.js")
            .then(function () { return navigator.serviceWorker.ready; })
            .then(function (reg) { swReg = reg; return reg; })
            .catch(function () { return null; });   // for example opened from a file, not a web address
    }

    function requestPermission() {
        return new Promise(function (resolve) {
            try {
                var r = Notification.requestPermission(function (p) { resolve(p); });   // older browsers
                if (r && typeof r.then === "function") r.then(resolve);                // current browsers
            } catch (e) { resolve("denied"); }
        });
    }

    function enableSystem() {
        if (pushOn()) {   // real push: works with the app closed
            return window.NeuPush.subscribe().then(function (perm) {
                prefs.system = perm === "granted";
                savePrefs();
                return perm;
            });
        }
        if (!supported()) return Promise.resolve("unsupported");
        return requestPermission().then(function (perm) {
            prefs.system = perm === "granted";
            savePrefs();
            if (prefs.system) registerWorker();
            return perm;
        });
    }

    function systemNotify(item, high) {
        if (!systemReady()) return;
        if (pushOn() && window.NeuPush.isSubscribed() && item.id !== 0) return;   // the push already shows it
        var cat = CATEGORIES[getKey(item)];
        var options = {
            body: cat.name + " · " + audienceLabel(item) + "\n" + excerpt(item.details, 110),
            tag: "neucast-" + item.id + "-" + (item.id === 0 ? Date.now() : (item.updatedAt || 0)),   // the same notice never shows twice
            data: { id: item.id },
            icon: appIcon(),
            badge: appIcon(),
            requireInteraction: !!high,                                 // urgent ones stay until dismissed
            vibrate: high ? [220, 110, 220] : [120]
        };
        var title = (high ? "Urgent: " : "") + item.title;

        registerWorker().then(function (reg) {
            if (reg && reg.showNotification) return reg.showNotification(title, options);
            var n = new Notification(title, options);   // desktop fallback
            n.onclick = function () { window.focus(); openNotice(item.id); n.close(); };
        }).catch(function () { /* the in-page alert already told them */ });
    }

    // ---------------------------------------------------------------- opening a notice
    function openNotice(id) {
        id = Number(id);
        if (!id) return;
        if (typeof openAnnouncement === "function") {   // homepage
            window.focus();
            openAnnouncement(id);
        } else {
            window.location.href = "index.html?notice=" + id;
        }
    }

    // ---------------------------------------------------------------- showing alerts
    function pageInFront() { return !document.hidden && document.hasFocus(); }

    function bumpTitle(n) {
        missed += n;
        document.title = "(" + missed + ") " + baseTitle;
        try { if (navigator.setAppBadge) navigator.setAppBadge(missed); } catch (e) { /* not supported */ }
    }
    function clearTitle() {
        if (!missed) return;
        missed = 0;
        document.title = baseTitle;
        try { if (navigator.clearAppBadge) navigator.clearAppBadge(); } catch (e) { /* not supported */ }
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) clearTitle(); });
    window.addEventListener("focus", clearTitle);

    function alertOne(item, change, options) {
        options = options || {};
        var high = !!HIGH[getKey(item)];
        var lead = change === "updated" ? "Updated: " : (high ? "Urgent: " : "New: ");
        var cat = CATEGORIES[getKey(item)].name;

        NeuUI.toast(lead + item.title + " (" + cat + ")", high ? "error" : "info", {
            duration: high ? 14000 : 8000,
            action: { label: "Read", onClick: function () { openNotice(item.id); } }
        });

        if (high) {
            chime();
            try { if (navigator.vibrate) navigator.vibrate([220, 110, 220]); } catch (e) { /* not supported */ }
        }
        if (!pageInFront() || options.forceSystem) systemNotify(item, high);
        if (document.hidden) bumpTitle(1);
    }

    function alertSummary(items) {
        var anyHigh = items.some(function (x) { return HIGH[getKey(x.item)]; });
        NeuUI.toast("While you were away: " + plural(items.length, "new or updated announcement", "new or updated announcements"),
            anyHigh ? "error" : "info", {
                duration: 12000,
                action: { label: "View", onClick: function () {
                    if (typeof chooseSmart === "function" && typeof scrollToList === "function") {
                        chooseSmart("unread");
                        scrollToList();
                    } else { window.location.href = "index.html#announcements"; }
                } }
            });
        if (anyHigh) chime();
    }

    // ---------------------------------------------------------------- finding what is new
    // atLoad is true when the page has just opened (so anything found arrived while it was closed)
    function check(atLoad) {
        var list = loadAnnouncements();
        var read = loadReadIds(student.id);
        var seen = readJSON(SEEN_KEY, null);
        var firstRun = seen === null;          // brand new on this device: remember, do not alert
        var known = seen || {};
        var next = {};
        var fresh = [];

        Object.keys(known).forEach(function (id) { next[id] = known[id]; });   // never forget (a short sync gap must not re-alert)

        list.forEach(function (item) {
            var version = item.updatedAt || 0;
            var id = String(item.id);
            var isNew = !(id in known);
            var isEdit = !isNew && version > known[id];
            next[id] = version;

            if (firstRun || !(isNew || isEdit)) return;
            if (!visibleToMe(item) || isExpired(item)) return;
            if (isNew && read.indexOf(item.id) >= 0) return;   // already read on another device
            fresh.push({ item: item, change: isEdit ? "updated" : "new" });
        });

        try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch (e) { /* storage full or blocked */ }
        if (!fresh.length || !prefs.on) return;

        // Highest priority first, then newest
        fresh.sort(function (a, b) {
            return (HIGH[getKey(b.item)] ? 1 : 0) - (HIGH[getKey(a.item)] ? 1 : 0) || Number(b.item.id) - Number(a.item.id);
        });

        if (atLoad && fresh.length > 1) { alertSummary(fresh); return; }

        fresh.slice(0, 3).forEach(function (f) { alertOne(f.item, f.change); });
        if (fresh.length > 3) alertSummary(fresh.slice(3));
    }

    // ---------------------------------------------------------------- the "Turn on alerts" prompt (homepage)
    var prompt = document.getElementById("alertPrompt");
    function setPromptMode(install) {
        document.getElementById("alertPromptTitle").textContent = install
            ? "Install NeuCast to get alerts on your iPhone"
            : "Get alerted when something new is posted";
        document.getElementById("alertPromptText").textContent = install
            ? "In Safari, tap Share, then Add to Home Screen. Open NeuCast from your Home Screen, then turn on alerts."
            : "Urgent notices and announcements for your course reach you even if NeuCast isn't the tab in front.";
        document.getElementById("alertPromptOn").hidden = install;
        document.getElementById("alertPromptLater").textContent = install ? "Got it" : "Not now";
    }
    function showPromptIfNeeded() {
        if (!prompt) return;
        var snoozedAt = Number(localStorage.getItem(PROMPT_KEY)) || 0;
        var dismissed = Date.now() - snoozedAt < 3 * 24 * 60 * 60 * 1000;   // "Not now" = ask again in 3 days
        var install = pushOn() && window.NeuPush.needsInstall();   // iPhone, not on the Home Screen yet
        setPromptMode(install);
        prompt.hidden = dismissed || !(install || (supported() && permission() === "default"));
    }
    if (prompt) {
        document.getElementById("alertPromptOn").addEventListener("click", function () {
            enableSystem().then(function (perm) {
                prompt.hidden = true;
                renderSettings();
                if (perm === "granted") {
                    NeuUI.toast("Alerts are on. You'll be told when something new is posted.", "success");
                    test(true);
                } else if (perm === "denied") {
                    NeuUI.toast("Alerts are blocked in your browser. You'll still see them inside NeuCast.", "info", { duration: 7000 });
                }
            });
        });
        document.getElementById("alertPromptLater").addEventListener("click", function () {
            localStorage.setItem(PROMPT_KEY, String(Date.now()));
            prompt.hidden = true;
        });
    }

    // ---------------------------------------------------------------- settings (homepage)
    var box = document.getElementById("alertSettings");
    var elOn = document.getElementById("alertsOn");
    var elSystem = document.getElementById("alertsSystem");
    var elSound = document.getElementById("alertsSound");
    var elHint = document.getElementById("alertsHint");
    var elTest = document.getElementById("alertsTest");

    function renderSettings() {
        if (!box) return;
        prefs = loadPrefs();
        elOn.checked = prefs.on;
        elSound.checked = prefs.sound;
        elSystem.checked = systemReady();
        elSystem.disabled = !supported() || permission() === "denied";
        elSound.disabled = !prefs.on;
        elSystem.disabled = elSystem.disabled || !prefs.on;

        var hint = "";
        if (!supported() && pushOn() && window.NeuPush.needsInstall()) hint = "On iPhone, open this site in Safari, tap Share, then Add to Home Screen. Open NeuCast from your Home Screen and turn this on there.";
        else if (!supported()) hint = "This browser can't show system notifications. You'll still get alerts inside NeuCast. On iPhone, system notifications are not available in the browser.";
        else if (permission() === "denied") hint = "System notifications are blocked. Click the lock icon next to the address, allow Notifications, then reload.";
        else if (!systemReady()) hint = "Turn on system notifications to be told even when NeuCast isn't the tab in front.";
        else hint = "You'll be told even when another tab or window is in front. Urgent and Health notices stay on screen until you dismiss them.";
        elHint.textContent = hint;
    }

    if (box) {
        // Keep these switches from triggering the Appearance/Text-size saver in script.js
        box.addEventListener("change", function (event) { event.stopPropagation(); });

        elOn.addEventListener("change", function () { prefs.on = elOn.checked; savePrefs(); renderSettings(); });
        elSound.addEventListener("change", function () {
            prefs.sound = elSound.checked; savePrefs();
            if (prefs.sound) { unlockAudio(); window.setTimeout(chime, 80); }
        });
        elSystem.addEventListener("change", function () {
            if (elSystem.checked) {
                enableSystem().then(function () { renderSettings(); showPromptIfNeeded(); });
            } else {
                prefs.system = false; savePrefs(); renderSettings();
                if (pushOn()) window.NeuPush.setOptIn(false);   // really stop phone push on this device
            }
        });
        elTest.addEventListener("click", function () { test(true); });

        // Refresh the switches every time the Settings pop-up opens
        var modalEl = document.getElementById("settingsModal");
        if (modalEl && window.MutationObserver) {
            new MutationObserver(function () { if (!modalEl.hidden) renderSettings(); })
                .observe(modalEl, { attributes: true, attributeFilter: ["hidden"] });
        }
        renderSettings();
    }

    // A fake urgent announcement, so a student (or the panel) can see exactly what an alert looks like
    function test(forceSystem) {
        unlockAudio();
        alertOne({
            id: 0, title: "Test alert", category: "urgent", audience: "all",
            details: "This is how an urgent announcement will reach you."
        }, "new", { forceSystem: forceSystem === true });
    }

    // ---------------------------------------------------------------- go
    window.addEventListener("neucast:synced", function () { check(false); });

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.addEventListener("message", function (event) {
            if (event.data && event.data.type === "neucast-open") openNotice(event.data.id);
        });
    }

    if (systemReady()) registerWorker();     // keep the worker ready for the next alert
    showPromptIfNeeded();
    check(true);

    // Opened from a tapped system notification: show that announcement
    var wanted = new URLSearchParams(window.location.search).get("notice");
    if (wanted && typeof openAnnouncement === "function") {
        window.setTimeout(function () {
            openNotice(wanted);
            if (window.history && history.replaceState) history.replaceState(null, "", window.location.pathname + window.location.hash);
        }, 250);
    }

    window.NeuNotify = {
        test: test,
        check: function () { check(false); },
        enableSystem: enableSystem,
        // cloud.js uses this to keep a hidden tab checking, but only when system alerts are ready
        wantsBackground: function () { return systemReady(); }
    };
})();
