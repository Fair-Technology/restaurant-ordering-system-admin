// Web Push for the order board. No fetch handler on purpose: no offline caching, resource loading is untouched.
let ordersPath = '/';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg && msg.type === 'orders-path' && typeof msg.path === 'string' && msg.path.startsWith('/')) {
    ordersPath = msg.path;
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = (event.data && event.data.json()) || {};
  } catch {
    // keep the generic notification
  }
  const body = payload.orderRef ? `Order ${payload.orderRef}` : 'A new order is waiting';
  event.waitUntil(
    self.registration.showNotification('New order', {
      body,
      tag: 'new-order',
      icon: '/icon-192.png',
      data: { url: ordersPath },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const board = windows.find((w) => /\/(orders|phone)(\/|\?|#|$)/.test(w.url));
      if (board) return board.focus();
      return self.clients.openWindow(url);
    }),
  );
});
