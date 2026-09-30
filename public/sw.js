self.addEventListener('push', (e) => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(d.title || 'Magic Brew', {
    body: d.body || '', icon: '/img/icon-192.png', badge: '/img/icon-192.png', tag: d.tag, renotify: true,
    vibrate: [200, 100, 200], requireInteraction: true, data: { url: d.url || '/admin.html' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data.url;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.includes('/admin.html') && 'navigate' in c) return c.navigate(url).then((x) => (x || c).focus());
    return clients.openWindow(url);
  }));
});
