// Service worker for the Magic Brew Admin: shows a notification when the server pushes a new order,
// even if the Admin page is closed, and updates the home-screen badge where the device supports it.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch {}
  const n = Number(d.pending) || 0;
  event.waitUntil((async () => {
    await self.registration.showNotification(d.title || '🔔 New order', {
      body: d.body || 'Open Magic Brew Admin to see it.',
      tag: d.tag || 'order', renotify: true, requireInteraction: true,
      icon: '/img/icon-192.png', badge: '/img/icon-192.png',
      vibrate: [300, 120, 300, 120, 300], data: { url: '/admin.html' },
    });
    try { if (self.navigator.setAppBadge) await (n ? self.navigator.setAppBadge(n) : self.navigator.clearAppBadge()); } catch {}
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin.html';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = all.find((c) => new URL(c.url).pathname === '/admin.html');
    if (open) return open.focus();
    return self.clients.openWindow(url);
  })());
});
