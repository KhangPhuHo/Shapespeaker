// fcm-register.js
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js";
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const SERVER_URL = "https://shapespeaker.onrender.com";

// DOM
const statusEl = document.getElementById("statusMessage");
const authEl = document.getElementById("authStatus");
const userEl = document.getElementById("userIdDisplay");
const tokenEl = document.getElementById("fcmTokenDisplay");
const toggleEl = document.getElementById("fcmToggle");

let currentUser = null;
let currentToken = null;

// Hiển thị trạng thái
function setStatus(text, type = "info") {
    statusEl.textContent = text;
    const colors = {
        info: "bg-gray-700 text-gray-200",
        success: "bg-green-600 text-white",
        error: "bg-red-600 text-white"
    };
    statusEl.className = `mt-4 p-4 rounded-lg text-center font-medium min-h-[4rem] ${colors[type]}`;
}

// Lấy VAPID key từ server
async function getVapidKeyFromServer() {
    try {
        const res = await fetch(`${SERVER_URL}/api/getVapidKey`);
        if (!res.ok) throw new Error("Không lấy được VAPID key");
        const data = await res.json();
        return data.vapidKey;
    } catch (err) {
        console.error(err);
        return null;
    }
}

// Chờ SW active
async function waitForSWActive(registration) {
    if (registration.active) return registration.active;

    return new Promise((resolve, reject) => {
        const sw = registration.installing || registration.waiting;
        if (!sw) return reject("No SW installing or waiting");

        sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') resolve(sw);
        });

        setTimeout(() => reject("SW activation timed out"), 5000);
    });
}

// Auth listener
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        authEl.textContent = "Đã đăng nhập";
        userEl.textContent = user.uid;

        try {
            const res = await fetch(`${SERVER_URL}/notifications/checkFCMToken?userId=${user.uid}`);
            if (res.ok) {
                const data = await res.json();
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

// Bật FCM
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

    try {
        setStatus("⏳ Đăng ký Service Worker...");
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await waitForSWActive(registration);

        const messaging = getMessaging();
        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (!token) throw new Error("Không lấy được token FCM");

        const res = await fetch(`${SERVER_URL}/notifications/saveFCMToken`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUser.uid, fcmToken: token, platform: "web" })
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

// Tắt FCM
async function disableFCM() {
    if (!currentUser || !currentToken) {
        toggleEl.checked = false;
        return;
    }

    try {
        const res = await fetch(`${SERVER_URL}/notifications/deleteFCMToken`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUser.uid, fcmToken: currentToken })
        });

        if (res.ok) {
            currentToken = null;
            tokenEl.textContent = "Chưa có";
            setStatus("🔕 Đã hủy đăng ký nhận thông báo.", "info");
        } else {
            const err = await res.json().catch(() => ({}));
            setStatus("❌ Lỗi khi hủy đăng ký FCM", "error");
            toggleEl.checked = true;
        }
    } catch (err) {
        console.error(err);
        setStatus("❌ Lỗi khi hủy đăng ký FCM", "error");
        toggleEl.checked = true;
    }
}

// Toggle listener
export function handleToggleChange(e) {
    if (e.target.checked) enableFCM();
    else disableFCM();
}
