/* eslint-disable no-undef */

// =======================
// SERVICE WORKER – DATA ONLY (FINAL)
// =======================

console.log('[SW] Loaded');

self.addEventListener('push', (event) => {
  console.log('[SW] 📩 Push received');

  if (!event.data) {
    console.warn('[SW] No payload');
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    console.error('[SW] Payload parse error', e);
    return;
  }

  // ======= CONTENT (CUSTOMIZE HERE) =======
  const title = data.title || '🔔 Thông báo';
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    image: data.image, // ✅ hỗ trợ ảnh lớn (Chrome / Android)
    tag: data.type || 'general', // chống spam
    renotify: true,
    data: {
      url: data.click_action || '/',
      raw: data
    }
  };

  console.log('[SW] 🔔 showNotification', title, options);

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// =======================
// CLICK NOTIFICATION
// =======================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 👉 Notification clicked');

  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientsArr) => {
        for (const client of clientsArr) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});

// =======================
// INSTALL / ACTIVATE
// =======================
self.addEventListener('install', () => {
  console.log('[SW] Installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(self.clients.claim());
});
