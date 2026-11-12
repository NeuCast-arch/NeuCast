/* =====================================================
   NEUCAST PHONE PUSH (free OneSignal plan)

   Why this file exists: notify.js can only alert a page that is open.
   Push is delivered by the phone's own system, so it arrives even when
   NeuCast is closed (on iPhone: installed to the Home Screen first).

   Off unless cloud-config.js has window.NEUCAST_PUSH.oneSignalAppId.
   Setup: see ONESIGNAL-SETUP.md

   Students: this file links the device to the logged-in account and tags it with the
             course, automatically on every page, so a "BSIT only" notice reaches only
             BSIT phones. The one thing it cannot do for them is say "Allow": browsers
             require the student to tap that themselves (see the banner in notify.js).
   Logged out / admin: the device is unlinked, so a shared phone never buzzes with the
             previous student's notices.
   Admin:    when a NEW announcement is posted, this file asks OneSignal to
             send it. The OneSignal REST key is pasted on the admin dashboard
             and kept in that one browser (never in the GitHub files).

   Load after data.js and before notify.js / admin.js.
   ===================================================== */
(function () {
    "use strict";

    var cfg = window.NEUCAST_PUSH || {};
    var appId = String(cfg.oneSignalAppId || "").trim();
    var KEY_STORE = "neucast_push_key";    // admin browser only; kept out of the cloud sync on purpose

    var student = typeof getCurrentStudent === "function" ? getCurrentStudent() : null;
    var os = null;                         // the OneSignal object, once loaded
    var loading = null;
    var subscribed = false;

    function enabled() { return /^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(appId); }

    // ---------------------------------------------------------------- device checks
    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    }
    function standalone() {
        return navigator.standalone === true ||
            (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
    }
    // iPhone only allows push for a site that was added to the Home Screen
    function needsInstall() { return isIOS() && !standalone(); }

    // ---------------------------------------------------------------- student side
    function folder() {   // GitHub Pages serves the project from /repo-name/, not from /
        var dir = window.location.pathname.replace(/[^\/]*$/, "");
        return { path: dir.replace(/^\//, "") + "OneSignalSDKWorker.js", scope: dir };
    }

    function load() {
        if (loading) return loading;
        loading = new Promise(function (resolve) {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            var s = document.createElement("script");
            s.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
            s.defer = true;
            s.onerror = function () { resolve(null); };   // offline or blocked: in-page alerts still work
            document.head.appendChild(s);

            window.OneSignalDeferred.push(function (OneSignal) {
                var f = folder();
                return OneSignal.init({
                    appId: appId,
                    serviceWorkerPath: f.path,
                    serviceWorkerParam: { scope: f.scope },
                    allowLocalhostAsSecureOrigin: true,
                    notifyButton: { enable: false }
                }).then(function () {
                    os = OneSignal;
                    var sub = OneSignal.User.PushSubscription;
                    if (student) {
                        // Link this phone to the logged-in account, every page load, with no tap needed
                        OneSignal.login(student.id);                         // one student = one list of devices
                        OneSignal.User.addTag("course", student.course);     // lets the admin target a course
                        // If this browser already said yes (for example a second account on the same phone),
                        // switch push back on silently. A first-time student is asked by the banner instead.
                        if (!sub.optedIn && !!OneSignal.Notifications.permission && wantsPush()) sub.optIn();
                    } else {
                        // Logged out (or admin): stop this phone receiving the previous student's notices
                        if (sub.optedIn) sub.optOut();
                        OneSignal.logout();
                    }
                    subscribed = !!sub.optedIn;
                    OneSignal.User.PushSubscription.addEventListener("change", function (e) {
                        subscribed = !!(e && e.current && e.current.optedIn);
                    });
                    // The page is already showing the pop-up, so hide the duplicate banner while it is in front
                    OneSignal.Notifications.addEventListener("foregroundWillDisplay", function (e) { e.preventDefault(); });
                    resolve(OneSignal);
                }).catch(function () { resolve(null); });
            });
        });
        return loading;
    }

    // Did the student switch system notifications off in Settings on this device?
    function wantsPush() {
        try { return JSON.parse(localStorage.getItem("neucast_alert_prefs") || "{}").system !== false; }
        catch (e) { return true; }
    }

    // Turn push on or off for this device without asking the browser again
    function setOptIn(on) {
        return load().then(function (OneSignal) {
            if (!OneSignal) return;
            var sub = OneSignal.User.PushSubscription;
            return Promise.resolve(on ? sub.optIn() : sub.optOut()).then(function () { subscribed = !!sub.optedIn; });
        }).catch(function () { /* ignore */ });
    }

    // Must be called straight from a tap. Resolves "granted", "denied" or "unsupported".
    function subscribe() {
        function go(OneSignal) {
            if (!OneSignal) return Promise.resolve("unsupported");
            return Promise.resolve(OneSignal.Notifications.requestPermission()).then(function () {
                var granted = !!OneSignal.Notifications.permission;
                if (!granted) return "denied";
                return Promise.resolve(OneSignal.User.PushSubscription.optIn()).then(function () {
                    subscribed = !!OneSignal.User.PushSubscription.optedIn;
                    return "granted";
                });
            }).catch(function () { return "denied"; });
        }
        return os ? go(os) : load().then(go);   // when already loaded, ask without waiting (iPhone needs the tap)
    }

    // ---------------------------------------------------------------- admin side
    function excerpt(text, max) {
        text = String(text || "").replace(/\s+/g, " ").trim();
        if (text.length <= max) return text;
        var cut = text.slice(0, max);
        return cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)) + "...";
    }

    function hasKey() { return !!localStorage.getItem(KEY_STORE); }

    // Resolves { ok, skipped, message }
    function send(item, options) {
        options = options || {};
        if (!enabled()) return Promise.resolve({ ok: false, skipped: true, message: "Phone push is off." });
        var key = localStorage.getItem(KEY_STORE);
        if (!key) return Promise.resolve({ ok: false, message: "Phone push not sent: add the OneSignal key on the dashboard first." });

        var high = item.category === "urgent" || item.category === "safety";
        var aud = audienceOf(item);
        var body = {
            app_id: appId,
            target_channel: "push",
            headings: { en: (high ? "Urgent: " : "") + item.title },
            contents: { en: excerpt(item.details, 140) || "Open NeuCast to read it." },
            url: new URL("index.html?notice=" + encodeURIComponent(item.id), window.location.href).href,
            priority: high ? 10 : 5,
            ttl: 172800
        };
        if (aud === "all") body.included_segments = ["Subscribed Users"];
        else body.filters = [{ field: "tag", key: "course", relation: "=", value: aud }];

        return fetch("https://api.onesignal.com/notifications?c=push", {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8", "Authorization": "Key " + key },
            body: JSON.stringify(body)
        }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (data) {
                if (r.ok && data && data.id) {
                    return { ok: true, message: options.test ? "Test push sent." : "Phone push sent to " + (aud === "all" ? "all students" : aud + " students") + "." };
                }
                var err = data && data.errors ? JSON.stringify(data.errors) : "";
                if (/not subscribed|no subscribed|No users/i.test(err)) {
                    return { ok: true, message: "Posted. No phones are subscribed to push yet." };
                }
                if (r.status === 401 || r.status === 403) return { ok: false, message: "OneSignal refused the key. Check it on the dashboard." };
                return { ok: false, message: "OneSignal could not send it" + (err ? ": " + err.slice(0, 120) : ".") };
            });
        }).catch(function () {
            return { ok: false, message: "Couldn't reach OneSignal from this browser. Send it from the OneSignal dashboard instead." };
        });
    }

    // The small setup card on the admin dashboard
    function wireAdminCard() {
        var card = document.getElementById("pushSetup");
        if (!card) return;
        var input = document.getElementById("pushKey");
        var state = document.getElementById("pushState");

        function render() {
            var text, cls = "tag";
            if (!enabled()) { text = "Off: no App ID in cloud-config.js"; }
            else if (!hasKey()) { text = "Needs key"; cls = "tag tag--warning"; }
            else { text = "Ready"; cls = "tag tag--success"; }
            state.textContent = text;
            state.className = cls;
        }
        document.getElementById("pushSave").addEventListener("click", function () {
            var v = input.value.trim();
            if (!v) { NeuUI.toast("Paste the OneSignal REST API key first.", "error"); return; }
            localStorage.setItem(KEY_STORE, v);
            input.value = "";
            render();
            NeuUI.toast("Key saved in this browser only.", "success");
        });
        document.getElementById("pushClear").addEventListener("click", function () {
            localStorage.removeItem(KEY_STORE);
            render();
            NeuUI.toast("Key removed from this browser.", "info");
        });
        document.getElementById("pushTest").addEventListener("click", function () {
            send({ id: 0, title: "Test push from NeuCast", category: "general", audience: "all", details: "If you see this on your phone, push works." }, { test: true })
                .then(function (r) { NeuUI.toast(r.message, r.ok ? "success" : "error", { duration: 7000 }); });
        });
        render();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireAdminCard);
    else wireAdminCard();

    // Get the SDK ready on every page: students are linked, everyone else is unlinked (see load)
    if (enabled()) load();

    window.NeuPush = {
        enabled: enabled,
        needsInstall: needsInstall,
        isIOS: isIOS,
        subscribe: subscribe,
        setOptIn: setOptIn,
        isSubscribed: function () { return subscribed; },
        send: send
    };
})();
