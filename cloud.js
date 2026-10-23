/* =====================================================
   NEUCAST CLOUD SYNC
   Why this file exists: the prototype saves everything in the browser's
   localStorage, and every browser has its own copy. On GitHub Pages a student
   registers in THEIR browser, so the admin's browser never sees it.

   This file mirrors the shared data to a Firebase Realtime Database over plain
   HTTP (no SDK, works on static hosting). No other file needed rewriting: data.js
   still reads and writes localStorage; this file copies changes up and down.

   Shared:      students, questions, confirmations, announcements, read records
   Not shared:  who is logged in on this device, theme/text settings
   Off unless cloud-config.js has a databaseURL.
   ===================================================== */
(function () {
    "use strict";

    var cfg = window.NEUCAST_CLOUD || {};
    var base = String(cfg.databaseURL || "").replace(/\/+$/, "");
    if (!/^https?:\/\//.test(base)) { window.NeuCloud = null; return; }

    var ROOT = base + "/neucast";
    var local = window.localStorage;
    var P = Storage.prototype;
    var rawSet = P.setItem, rawRemove = P.removeItem, rawGet = P.getItem;

    var snap = { students: {}, questions: {}, acks: {} };   // what the cloud held when we last looked
    var pending = 0;       // uploads still in flight
    var applying = false;  // true while WE write into localStorage (so we do not upload it back)

    var LOCALKEY = { students: "neucast_students", questions: "neucast_questions", acks: "neucast_acks" };
    var SORT = {
        students:  function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); },
        questions: function (a, b) { return (Number(a.id) || 0) - (Number(b.id) || 0); }
    };

    // ----- small helpers -----
    // Database keys may not contain . $ # [ ] /
    function safe(s) { return encodeURIComponent(String(s)).replace(/\./g, "%2E"); }
    function unsafe(s) { return decodeURIComponent(s); }

    // Same text for the same data, whatever the key order (the cloud returns keys sorted); null = missing
    function canon(v) {
        if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
        if (v && typeof v === "object") {
            return "{" + Object.keys(v).sort().filter(function (k) { return v[k] !== null && v[k] !== undefined; })
                .map(function (k) { return JSON.stringify(k) + ":" + canon(v[k]); }).join(",") + "}";
        }
        return JSON.stringify(v === undefined ? null : v);
    }
    function kind(key) {
        if (key === "neucast_students") return "students";
        if (key === "neucast_questions") return "questions";
        if (key === "neucast_acks") return "acks";
        if (key === "neucast_announcements" || key.indexOf("neucast_read_") === 0 || key.indexOf("neucast_readver_") === 0) return "kv";
        return null;
    }
    function readLocal(key, fallback) {
        try { var v = rawGet.call(local, key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    }
    function normAcks(m) {
        var out = {};
        Object.keys(m || {}).forEach(function (a) { out[a] = (m[a] || []).slice().sort(); });
        return out;
    }

    // ----- uploading: only what changed, so two devices never overwrite each other's records -----
    function send(method, path, body) {
        pending++;
        return fetch(ROOT + path + ".json", {
            method: method, keepalive: true, headers: { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body)
        }).catch(function () {}).then(function () { pending--; });
    }
    function pushMap(kd, list) {
        var upd = {}, any = false, now = {};
        list.forEach(function (item) {
            if (!item || item.id === undefined) return;
            var k = safe(item.id);
            now[k] = canon(item);
            if (snap[kd][k] !== now[k]) { upd[k] = item; any = true; }
        });
        Object.keys(snap[kd]).forEach(function (k) { if (!(k in now)) { upd[k] = null; any = true; } });
        snap[kd] = now;
        if (any) send("PATCH", "/" + kd, upd);
    }
    function flattenAcks(m) {
        var out = {};
        Object.keys(m || {}).forEach(function (a) { (m[a] || []).forEach(function (s) { out[safe(a) + "/" + safe(s)] = true; }); });
        return out;
    }
    function pushAcks(map) {
        var now = flattenAcks(map), upd = {}, any = false;
        Object.keys(now).forEach(function (k) { if (!snap.acks[k]) { upd[k] = true; any = true; } });
        Object.keys(snap.acks).forEach(function (k) { if (!now[k]) { upd[k] = null; any = true; } });
        snap.acks = now;
        if (any) send("PATCH", "/acks", upd);
    }
    function push(key, kd, value) {
        if (kd === "kv") { send("PUT", "/kv/" + safe(key), value); return; }
        var parsed;
        try { parsed = JSON.parse(value); } catch (e) { return; }
        if (kd === "acks") pushAcks(parsed || {});
        else pushMap(kd, Array.isArray(parsed) ? parsed : []);
    }

    // ----- downloading -----
    function setLocal(key, text, same) {
        var cur = rawGet.call(local, key);
        if (cur !== null && same(cur)) return false;
        applying = true;
        try { rawSet.call(local, key, text); } finally { applying = false; }
        return true;
    }
    function applyDb(db) {
        var changed = false;
        var firstRun = !(db.meta && db.meta.initialized);   // nobody has used this database yet

        ["students", "questions"].forEach(function (kd) {
            var map = db[kd] || {};
            var list = Object.keys(map).map(function (k) { return map[k]; }).filter(Boolean);
            var now = {};
            Object.keys(map).forEach(function (k) { now[k] = canon(map[k]); });
            if (firstRun) {   // keep anything this browser already had
                var have = {};
                list.forEach(function (i) { have[safe(i.id)] = 1; });
                readLocal(LOCALKEY[kd], []).forEach(function (i) { if (i && i.id !== undefined && !have[safe(i.id)]) list.push(i); });
            }
            list.sort(SORT[kd]);
            snap[kd] = now;                       // what the cloud has right now
            if (firstRun) pushMap(kd, list);      // sends only the records the cloud lacks
            var want = canon(list);
            if (setLocal(LOCALKEY[kd], JSON.stringify(list), function (cur) {
                try { return canon(JSON.parse(cur)) === want; } catch (e) { return false; }
            })) changed = true;
        });

        // confirmations: { "announcementId": ["studentId", ...] }
        var merged = {}, flat = {}, a = db.acks || {};
        Object.keys(a).forEach(function (ak) {
            Object.keys(a[ak] || {}).forEach(function (sk) {
                (merged[unsafe(ak)] = merged[unsafe(ak)] || []).push(unsafe(sk));
                flat[ak + "/" + sk] = true;
            });
        });
        snap.acks = flat;
        if (firstRun) {
            var la = readLocal("neucast_acks", {});
            Object.keys(la).forEach(function (id) {
                (la[id] || []).forEach(function (s) {
                    merged[id] = merged[id] || [];
                    if (merged[id].indexOf(s) < 0) merged[id].push(s);
                });
            });
            pushAcks(merged);
        }
        var wantAcks = canon(normAcks(merged));
        if (setLocal("neucast_acks", JSON.stringify(normAcks(merged)), function (cur) {
            try { return canon(normAcks(JSON.parse(cur))) === wantAcks; } catch (e) { return false; }
        })) changed = true;

        // announcements and per-student read records: last write wins
        var kv = db.kv || {};
        Object.keys(kv).forEach(function (sk) {
            if (typeof kv[sk] !== "string") return;
            if (setLocal(unsafe(sk), kv[sk], function (cur) { return cur === kv[sk]; })) changed = true;
        });
        if (firstRun) {
            for (var i = 0; i < local.length; i++) {
                var key = local.key(i);
                if (kind(key) === "kv" && !(safe(key) in kv)) send("PUT", "/kv/" + safe(key), rawGet.call(local, key));
            }
            send("PUT", "/meta/initialized", true);
        }
        return changed;
    }

    // Blocking download, used once when a page opens (so the page starts with fresh data)
    // and just before registering / logging in / approving.
    function pullSync() {
        try {
            var x = new XMLHttpRequest();
            x.open("GET", ROOT + ".json", false);
            x.send(null);
            if (x.status === 200) return applyDb(JSON.parse(x.responseText) || {});
        } catch (e) { /* offline: carry on with this browser's copy */ }
        return false;
    }
    // Quiet download every few seconds; pages listen for "neucast:synced" to redraw
    function poll() {
        if (document.hidden || pending > 0) return;
        fetch(ROOT + ".json").then(function (r) { return r.json(); }).then(function (db) {
            if (pending > 0) return;
            if (applyDb(db || {})) window.dispatchEvent(new Event("neucast:synced"));
        }).catch(function () {});
    }

    pullSync();

    // From here on, every save of shared data is also sent to the cloud
    P.setItem = function (k, v) {
        rawSet.call(this, k, v);
        if (this === local && !applying) { var kd = kind(String(k)); if (kd) push(String(k), kd, String(v)); }
    };
    P.removeItem = function (k) {
        rawRemove.call(this, k);
        if (this === local && !applying) {
            var kd = kind(String(k));
            if (kd === "kv") send("DELETE", "/kv/" + safe(k));
            else if (kd === "acks") pushAcks({});
            else if (kd) pushMap(kd, []);
        }
    };

    setInterval(poll, 8000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) poll(); });
    window.NeuCloud = { pull: pullSync, poll: poll };
})();
