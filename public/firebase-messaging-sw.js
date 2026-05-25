// firebase-messaging-sw.js — Firebase Cloud Messaging Service Worker (Resmi)
// File ini WAJIB berada di root /public/ agar diakses di URL /firebase-messaging-sw.js
// Dijalankan oleh browser di latar belakang OS, bahkan ketika browser ditutup

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

// ─── BACKGROUND MESSAGE HANDLER ───────────────────────────────────────────────
// Dipanggil saat notifikasi masuk & browser/tab TIDAK aktif / DITUTUP
messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || payload.data?.title || 'MesenAe';
  const body  = payload.notification?.body  || payload.data?.body  || '';
  const url   = payload.data?.url || '/';

  const notificationOptions = {
    body,
    icon:  '/logo.png',
    badge: '/logo.png',
    // Pola getar pager restoran: panjang-pendek berulang
    vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40, 500],
    // tag unik per-pesanan agar setiap event memicu getar baru
    tag: 'mesenae-' + (payload.data?.orderId || Date.now()),
    renotify: true,          // paksa getar ulang meskipun tag sama
    requireInteraction: true, // jangan hilang otomatis — tunggu user aksi
    data: { url },
  };

  return self.registration.showNotification(title, notificationOptions);
});

// ─── NOTIFICATION CLICK HANDLER ───────────────────────────────────────────────
// Buka / fokuskan tab aplikasi saat notifikasi diklik
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
