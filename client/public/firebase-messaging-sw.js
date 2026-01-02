/* eslint-disable no-undef */

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// =======================
// INIT FIREBASE
// =======================
firebase.initializeApp({
  apiKey: "AIzaSyCu6mwsKL-O1GmNG4BNHFdGcuqAgrk8IhY",
  authDomain: "book-management-b7265.firebaseapp.com",
  projectId: "book-management-b7265",
  messagingSenderId: "1046859996196",
  appId: "1:1046859996196:web:1fb51609ff2dc20c130cb1"
});

const messaging = firebase.messaging();

console.log('[SW] Firebase Messaging initialized');

// =======================
// BACKGROUND MESSAGE
// =======================
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] 📩 onBackgroundMessage payload:', payload);

  const data = payload.data || {};

  // ====== NỘI DUNG CÓ THỂ CHỈNH ======
  let title = data.title || '🔔 Thông báo mới';
  let body = data.body || '';
  let icon = data.icon || '/favicon.ico';
  let image = data.image; // optional
  let url = data.click_action || '/';

  // 🎯 xử lý theo type
  if (data.type === 'ADMIN') {
    title = '🛠️ Thông báo hệ thống';
  }

  const options = {
    body,
    icon,
    image, // ✅ ảnh lớn
    data: {
      url,
      raw: data
    },
    tag: data.type || 'general', // chống spam
    renotify: true
  };

  console.log('[SW] 🔔 showNotification:', title, options);

  return self.registration.showNotification(title, options);
});

// =======================
// CLICK NOTIFICATION
// =======================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 👉 Notification clicked');
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url === url && 'focus' in client) {
          console.log('[SW] Focus existing window');
          return client.focus();
        }
      }
      console.log('[SW] Open new window');
      return clients.openWindow(url);
    })
  );
});

// =======================
// INSTALL / ACTIVATE
// =======================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(self.clients.claim());
});
