/* =====================================================
   NeuCast service worker (alerts only; it caches nothing).
   Why it exists: phones will not show a system notification created
   by a page; they require a service worker to show it. It also lets a
   tap on the notification jump straight to the announcement.
   ===================================================== */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (event) { event.waitUntil(self.clients.claim()); });

self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    var data = event.notification.data || {};
    var id = data.id;
    var target = new URL("index.html" + (id ? "?notice=" + encodeURIComponent(id) : ""), self.registration.scope).href;

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
            // Reuse a NeuCast tab that is already open
            for (var i = 0; i < list.length; i++) {
                var c = list[i];
                if (c.url.indexOf(self.registration.scope) === 0 && "focus" in c) {
                    c.postMessage({ type: "neucast-open", id: id });
                    return c.focus();
                }
            }
            return self.clients.openWindow(target);
        })
    );
});
