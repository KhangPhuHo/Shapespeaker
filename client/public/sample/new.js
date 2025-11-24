// fcm-register.js
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js";
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const SERVER_URL = "https://shapespeaker.onrender.com"; // giữ nguyên

// Lấy VAPID PUBLIC KEY từ server
async function getVapidKeyFromServer() {
    try {
        const res = await fetch(`${SERVER_URL}/api/getVapidKey`);
        if (!res.ok) throw new Error("Không lấy được VAPID key");
        const data = await res.json();
        return data.vapidKey;
    } catch (err) {
        console.error("❌ Lỗi lấy VAPID key:", err);
        return null;
    }
}

// DOM Elements
const statusEl = document.getElementById("statusMessage");
const authEl = document.getElementById("authStatus");
const userEl = document.getElementById("userIdDisplay");
const tokenEl = document.getElementById("fcmTokenDisplay");
const toggleEl = document.getElementById("fcmToggle");

// User & token
let currentUser = null;
let currentToken = null;

// UI
function setStatus(text, type = "info") {
    statusEl.textContent = text;
    const colors = {
        info: "bg-gray-700 text-gray-200",
        success: "bg-green-600 text-white",
        error: "bg-red-600 text-white"
    };
    statusEl.className = `mt-4 p-4 rounded-lg text-center font-medium min-h-[4rem] ${colors[type]}`;
}

// Auth listener
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (user) {
        authEl.textContent = "Đã đăng nhập";
        userEl.textContent = user.uid;

        try {
            // <-- SỬA ĐƯỜNG DẪN: notifications/checkFCMToken
            const res = await fetch(`${SERVER_URL}/notifications/checkFCMToken?userId=${user.uid}`);
            if (res.ok) {
                const data = await res.json();
                // server trả tokens (mảng). Hợp nhất kỳ vọng: nếu có tokens => lấy token đầu tiên
                if (data.registered && data.tokens && data.tokens.length > 0) {
                    currentToken = data.tokens[0];
                    tokenEl.textContent = currentToken;
                    toggleEl.checked = true;
                    setStatus("🔔 Thiết bị đã đăng ký nhận thông báo.", "success");
                } else {
                    currentToken = null;
                    tokenEl.textContent = "Chưa có";
                    toggleEl.checked = false;
                    setStatus("ℹ️ Thiết bị chưa đăng ký nhận thông báo.", "info");
                }
            } else {
                console.warn("Không lấy được status token từ server:", res.status);
            }
        } catch (err) {
            console.error(err);
        }

    } else {
        authEl.textContent = "Chưa đăng nhập";
        userEl.textContent = "N/A";
        tokenEl.textContent = "Chưa có";
        toggleEl.checked = false;
        setStatus("⚠️ Bạn cần đăng nhập để nhận thông báo.", "info");
    }
});

// Enable FCM
async function enableFCM() {
    if (!currentUser) {
        setStatus("⚠️ Bạn cần đăng nhập trước khi bật thông báo.", "error");
        toggleEl.checked = false;
        return;
    }

    if (!("Notification" in window)) {
        setStatus("⚠️ Trình duyệt không hỗ trợ thông báo.", "error");
        toggleEl.checked = false;
        return;
    }

    setStatus("⏳ Yêu cầu quyền nhận thông báo...");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        setStatus("❌ Bạn đã từ chối quyền thông báo.", "error");
        toggleEl.checked = false;
        return;
    }

    setStatus("⏳ Lấy VAPID key từ server...");
    const VAPID_KEY = await getVapidKeyFromServer();
    if (!VAPID_KEY) {
        setStatus("❌ Không lấy được VAPID key", "error");
        toggleEl.checked = false;
        return;
    }

    setStatus("⏳ Đăng ký service worker và lấy token FCM...");

    try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('SW registered', registration);

        const messaging = getMessaging();
        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });
        console.log("FCM Token:", token);

        if (!token) throw new Error("Không lấy được token");

        // <-- SỬA ĐƯỜNG DẪN: notifications/saveFCMToken
        const res = await fetch(`${SERVER_URL}/notifications/saveFCMToken`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUser.uid,
                fcmToken: token,
                platform: "web"
            })
        });

        if (res.ok) {
            currentToken = token;
            tokenEl.textContent = token;
            setStatus("🎉 Thiết bị đã đăng ký nhận thông báo thành công!", "success");
        } else {
            const errData = await res.json().catch(() => ({}));
            setStatus(`⚠️ Lỗi server: ${errData.message || res.statusText}`, "error");
            toggleEl.checked = false;
        }

    } catch (err) {
        console.error("SW hoặc FCM lỗi:", err);
        setStatus("❌ Lỗi khi lấy hoặc gửi token FCM", "error");
        toggleEl.checked = false;
    }
}

// Disable FCM
async function disableFCM() {
    if (!currentUser || !currentToken) {
        toggleEl.checked = false;
        return;
    }

    try {
        // <-- SỬA ĐƯỜNG DẪN: notifications/deleteFCMToken
        const res = await fetch(`${SERVER_URL}/notifications/deleteFCMToken`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUser.uid,
                fcmToken: currentToken
            })
        });

        if (res.ok) {
            tokenEl.textContent = "Chưa có";
            currentToken = null;
            setStatus("🔕 Đã hủy đăng ký nhận thông báo.", "info");
        } else {
            const err = await res.json().catch(() => ({}));
            console.warn("Không thể xóa token:", err);
            setStatus("❌ Lỗi khi hủy đăng ký FCM", "error");
            toggleEl.checked = true;
        }
    } catch (err) {
        console.error(err);
        setStatus("❌ Lỗi khi hủy đăng ký FCM", "error");
        toggleEl.checked = true;
    }
}

// Toggle handler
export function handleToggleChange(e) {
    if (e.target.checked) enableFCM();
    else disableFCM();
}








// public/firebase-messaging-sw.js

// Sử dụng compat build vì trong SW bạn dùng API namespaced (firebase.messaging())
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

// Lấy messaging instance (compat)
const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification?.title || 'Thông báo';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: payload.notification?.icon || '/favicon.ico',
        data: payload.data || {}
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const clickAction = event.notification.data?.click_action || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === clickAction && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(clickAction);
        })
    );
});
