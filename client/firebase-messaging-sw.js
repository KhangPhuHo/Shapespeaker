// firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js');

// ✅ Cấu hình Firebase
firebase.initializeApp({
    apiKey: "AIzaSyCu6mwsKL-O1GmNG4BNHFdGcuqAgrk8IhY",
    authDomain: "book-management-b7265.firebaseapp.com",
    projectId: "book-management-b7265",
    storageBucket: "book-management-b7265.appspot.com",
    messagingSenderId: "1046859996196",
    appId: "1:1046859996196:web:1fb51609ff2dc20c130cb1",
    measurementId: "G-ZYTCE1YML4"
});

// ✅ Lấy messaging instance
const messaging = firebase.messaging();

// Xử lý background messages
messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Nhận background message ', payload);

    const notificationTitle = payload.notification?.title || 'Thông báo';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: payload.notification?.icon || '/favicon.ico',
        data: payload.data || {}
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Xử lý khi người dùng click vào notification
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const clickAction = event.notification.data?.click_action || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (const client of clientList) {
                if (client.url === clickAction && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(clickAction);
        })
    );
});
