// public/firebase-messaging-sw.js

// ⚠️ Dùng compat build vì SW sử dụng API namespaced (firebase.messaging())
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Firebase config (copy từ project của bạn)
firebase.initializeApp({
    apiKey: "AIzaSyCu6mwsKL-O1GmNG4BNHFdGcuqAgrk8IhY",
    authDomain: "book-management-b7265.firebaseapp.com",
    projectId: "book-management-b7265",
    storageBucket: "book-management-b7265.appspot.com",
    messagingSenderId: "1046859996196",
    appId: "1:1046859996196:web:1fb51609ff2dc20c130cb1",
    measurementId: "G-ZYTCE1YML4"
});

// Lấy messaging instance
const messaging = firebase.messaging();

// =====================
// Background message handler
// =====================
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message', payload);

    const notificationTitle = payload.notification?.title || 'Thông báo';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: payload.notification?.icon || '/favicon.ico',
        data: payload.data || {}
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// =====================
// Notification click handler
// =====================
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const clickAction = event.notification.data?.click_action || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                // So sánh URL bằng cách normalize để tránh mismatch /?query hoặc trailing slash
                const clientUrl = new URL(client.url);
                const clickUrl = new URL(clickAction, self.location.origin);
                if (clientUrl.pathname === clickUrl.pathname && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(clickAction);
        })
    );
});

// =====================
// Debug log SW ready
// =====================
self.addEventListener('install', (event) => {
    console.log('[firebase-messaging-sw.js] SW installing...');
    self.skipWaiting(); // đảm bảo SW active ngay
});

self.addEventListener('activate', (event) => {
    console.log('[firebase-messaging-sw.js] SW activated');
    event.waitUntil(self.clients.claim()); // claim clients ngay
});
