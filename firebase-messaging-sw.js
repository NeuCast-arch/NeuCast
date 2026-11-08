
// Native Notify web push -- the ONE service worker for this site.
// It sits at the site root (next to index.html) so its scope covers every
// page: index, archive, feedback, careers, safety, admin and the sign-in
// pages. It shows each push and opens the link the push carries on click.
//
// It replaced the unused Firebase Messaging worker that used to live here:
// NeuCast web push is delivered by Native Notify now, so no Firebase
// Messaging code is needed.

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  var payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = { title: "NeuCast", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "NeuCast", {
      body: payload.body || "",
      image: payload.image,
      icon: "./icon-192.png",
      tag: payload.tag,
      data: payload.data || {}
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var data = event.notification.data || {};
  // A push can carry its destination, e.g. {"url": "archive.html"}.
  // Relative, so it works on a project site (username.github.io/NeuCast/)
  // and on a custom domain alike.
  var target = new URL(data.url || ".", self.location.href).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (windows) {
      // Focus a tab that is already on the destination instead of opening a
      // second one. Never use window.navigate() here: it rejects silently and
      // the tap would look dead.
      for (var i = 0; i < windows.length; i++) {
        if (windows[i].url.split("#")[0] === target.split("#")[0]) return windows[i].focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
