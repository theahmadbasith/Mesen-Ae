// firebase-messaging-sw.js — Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Konfigurasi Firebase (sama persis dengan src/lib/firebase.ts)
firebase.initializeApp({
  apiKey: "AIzaSyBNBC_pGbMVcgjWMoa1mo3pkeCw3ijabvs",
  authDomain: "mesenae.firebaseapp.com",
  projectId: "mesenae",
  storageBucket: "mesenae.firebasestorage.app",
  messagingSenderId: "476484576003",
  appId: "1:476484576003:web:603dd5568c7c10d94a7f36",
});

const messaging = firebase.messaging();

// Intercept push event untuk custom tampilan dan vibrasi keras
self.addEventListener('push', function(event) {
  // Hentikan Firebase dari menampilkan notifikasi default agar kita bisa override vibrasinya
  event.stopImmediatePropagation();
  
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      console.error('Failed to parse push data', e);
      return;
    }
  }

  const title = payload.notification?.title || payload.data?.title || payload.title || 'MesenAe';
  const body  = payload.notification?.body  || payload.data?.body  || payload.body || '';
  const url   = payload.data?.url || payload.url || '/';

  const options = {
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    // Pola getar keras dan berulang untuk HP
    vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40, 500],
    data: { url },
    renotify: true,
    requireInteraction: true,
    silent: false,
    tag: 'mesenae-notification'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Jika tab sudah terbuka → fokuskan dan navigasikan
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          client.navigate && client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Jika belum ada tab → buka baru
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
