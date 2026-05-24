importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBNBC_pGbMVcgjWMoa1mo3pkeCw3ijabvs",
  authDomain: "mesenae.firebaseapp.com",
  projectId: "mesenae",
  storageBucket: "mesenae.firebasestorage.app",
  messagingSenderId: "476484576003",
  appId: "1:476484576003:web:603dd5568c7c10d94a7f36"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Pesanan Anda Siap!';
  const notificationOptions = {
    body: payload.notification?.body || 'Silakan cek aplikasi untuk detailnya.',
    icon: '/logo.png', // Fallback icon
    badge: '/logo.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
