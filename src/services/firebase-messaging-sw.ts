/// <reference lib="webworker" />
export default null;
declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || "MesenAe";
      const options = {
        body: data.options?.body || "",
        icon: "/logo.png",
        badge: "/logo.png",
        // Pola getar agresif berlapis mirip ringtone native (ms)
        vibrate: data.options?.vibrate || [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40, 500],
        tag: data.options?.tag || "mesenae-urgent",
        // RENOTIFY: TRUE adalah rahasia agar ponsel bergetar LAGI meskipun notifikasi sebelumnya belum ditutup
        renotify: true,
        data: data.options?.data || { url: "/" },
        // REQUIRE_INTERACTION memaksa notifikasi tidak hilang sendiri (menunggu diklik/dihapus)
        requireInteraction: true
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      event.waitUntil(
        self.registration.showNotification("MesenAe", {
          body: event.data.text(),
          vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40, 500],
          tag: "mesenae-urgent",
          renotify: true,
          requireInteraction: true,
          data: { url: "/" }
        })
      );
    }
  }
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // Jika web sudah terbuka, langsung fokuskan
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      // Jika belum buka sama sekali, buka window baru
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
