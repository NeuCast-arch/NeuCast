
importScripts(
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyDMfof-dCkVjfgayknV65F29uYh7bi-h_s",
  authDomain: "neucast-55d0c.firebaseapp.com",
  databaseURL: "https://neucast-55d0c-default-rtdb.firebaseio.com",
  projectId: "neucast-55d0c",
  storageBucket: "neucast-55d0c.firebasestorage.app",
  messagingSenderId: "805265525390",
  appId: "1:805265525390:web:899a4ee9b2daa4099357df",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle =
    payload.notification?.title || "NeuCast Campus Update";

  const notificationOptions = {
    body: payload.notification?.body || "You have a new campus announcement.",
    icon: "./icon-192.png",
    data: payload.data || {}
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow("./")
  );
});
