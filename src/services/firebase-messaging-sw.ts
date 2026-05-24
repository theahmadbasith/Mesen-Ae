/// <reference lib="webworker" />
export default null;
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'MesenAe Notification';
      const options = {
        body: data.options?.body || '',
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: data.options?.vibrate || [200, 100, 200, 100, 200, 100, 400],
        data: data.options?.data || { url: '/' },
        requireInteraction: true
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      // Fallback jika payload bukan JSON
      event.waitUntil(
        self.registration.showNotification('MesenAe', { 
          body: event.data.text(), 
          vibrate: [200, 100, 200],
          requireInteraction: true
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url || '/')
  );
});
