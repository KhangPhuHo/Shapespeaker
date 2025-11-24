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

// <!DOCTYPE html>
// <html lang="vi">

// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title data-i18n="title.settings">Đăng ký FCM Client</title>
//     <script src="https://cdn.tailwindcss.com"></script>
//     <style>
//         body {
//             font-family: 'Inter', sans-serif;
//             background-color: #1f2937;
//             color: #f9fafb;
//         }

//         .card {
//             background-color: #374151;
//             border-radius: 12px;
//             box-shadow: 0 10px 15px rgba(0, 0, 0, 0.2);
//         }
//     </style>
// </head>

// <body>

//     <div class="min-h-screen flex items-center justify-center p-4">
//         <div class="card w-full max-w-lg p-8 space-y-6">
//             <h1 class="text-3xl font-bold text-center text-indigo-400">Đăng Ký Thiết Bị Nhận Thông Báo</h1>
//             <p class="text-center text-gray-300">Nhấn nút bên dưới để yêu cầu quyền nhận thông báo và gửi Token FCM lên
//                 Server.</p>

//             <!-- Nút gọi hàm đăng ký -->
//             <div class="flex items-center justify-center mt-6">
//                 <label class="flex items-center gap-3 cursor-pointer">
//                     <input type="checkbox" id="fcmToggle" class="w-6 h-6 accent-indigo-500">
//                     <span>Bật / Tắt nhận thông báo</span>
//                 </label>
//             </div>


//             <div id="statusMessage"
//                 class="mt-4 p-4 rounded-lg text-center font-medium bg-gray-700 text-gray-200 min-h-[4rem]">
//                 Đang chờ khởi tạo Firebase...
//             </div>

//             <div class="bg-gray-800 p-4 rounded-lg space-y-2 text-sm">
//                 <p><strong>Trạng thái Auth:</strong> <span id="authStatus">Chưa xác định</span></p>
//                 <p><strong>User ID:</strong> <span id="userIdDisplay">N/A</span></p>
//                 <p><strong>FCM Token:</strong> <span id="fcmTokenDisplay" class="break-all text-yellow-400">Chưa
//                         có</span></p>
//             </div>
//         </div>
//     </div>

//     <!-- 💡 IMPORT LOGIC TỪ FILE JS RIÊNG -->
//     <script type="module">
//         import { handleToggleChange } from './src/js/fcm-register.js';
//         const toggleEl = document.getElementById("fcmToggle");
//         toggleEl.addEventListener("change", handleToggleChange);
//     </script>

// </body>

// </html>





const express = require('express');
const router = express.Router();

// Import Firebase Admin từ file firebaseAdmin.js
const { admin, firestore, messaging } = require('../firebaseAdmin');

router.get("/checkFCMToken", async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "Thiếu userId"
        });
    }

    try {
        const tokensSnapshot = await firestore
            .collection("fcm_tokens")
            .doc(userId)
            .collection("tokens")
            .get();

        if (tokensSnapshot.empty) {
            return res.json({ registered: false, tokens: [] });
        }

        const tokens = tokensSnapshot.docs.map(doc => doc.id);

        // Trả thêm `token` (token đầu tiên) để client cũ còn dùng được
        return res.json({
            registered: true,
            tokens,
            token: tokens[0] || null
        });

    } catch (error) {
        console.error("❌ Lỗi check FCM token:", error);
        return res.status(500).json({ success: false });
    }
});

router.post("/deleteFCMToken", async (req, res) => {
    const { userId, fcmToken } = req.body;
    if (!userId || !fcmToken) {
        return res.status(400).json({ success: false, message: "Thiếu userId hoặc fcmToken" });
    }

    try {
        await firestore
            .collection("fcm_tokens")
            .doc(userId)
            .collection("tokens")
            .doc(fcmToken)
            .delete();

        return res.json({ success: true, message: "Đã xóa token" });
    } catch (err) {
        console.error("❌ Lỗi xóa token:", err);
        return res.status(500).json({ success: false, message: "Lỗi server khi xóa token" });
    }
});

/**
 * =====================================================================
 * 📌 API: Lưu FCM Token (hỗ trợ đa thiết bị)
 * =====================================================================
 */
router.post('/saveFCMToken', async (req, res) => {
    const { userId, fcmToken, platform } = req.body;

    if (!userId || !fcmToken) {
        return res.status(400).json({
            success: false,
            message: 'Thiếu userId hoặc fcmToken.'
        });
    }

    try {
        // Lưu token: fcm_tokens/{userId}/tokens/{token}
        const tokenRef = firestore
            .collection('fcm_tokens')
            .doc(userId)
            .collection('tokens')
            .doc(fcmToken);

        await tokenRef.set({
            fcmToken,
            platform: platform || 'web',
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.json({
            success: true,
            message: `Đã lưu token FCM cho user ${userId}.`
        });

    } catch (error) {
        console.error('❌ Lỗi lưu FCM Token:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lưu token.'
        });
    }
});

/**
 * =====================================================================
 * 📌 HÀM: Gửi thông báo hoàn thành đơn hàng
 * =====================================================================
 */
async function sendOrderCompleteNotification(userId, orderId, giftCode) {
    // Lấy toàn bộ token của user
    const snapshot = await firestore
        .collection('fcm_tokens')
        .doc(userId)
        .collection('tokens')
        .get();

    if (snapshot.empty) {
        console.log(`❌ Không tìm thấy FCM Token cho userId: ${userId}`);
        return { success: false, message: 'Không có token để gửi.' };
    }

    const tokens = snapshot.docs.map(d => d.data().fcmToken);

    // Payload gửi tới client
    const payload = {
        notification: {
            title: '🎉 Đơn hàng hoàn thành!',
            body: `Mã quà tặng của bạn: ${giftCode}`,
            icon: 'https://shapespeaker.vercel.app/favicon.ico'
        },
        data: {
            type: 'ORDER_COMPLETE',
            order_id: orderId,
            giftcode: giftCode,
            user_id: userId,
            click_action: 'https://shapespeaker.vercel.app/giftcodes.html'
        }
    };

    try {
        const response = await messaging.sendMulticast({
            tokens,
            ...payload
        });

        console.log(
            `🔔 Gửi thông báo xong. Thành công: ${response.successCount} | Lỗi: ${response.failureCount}`
        );

        // Xử lý token hết hạn
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const err = resp.error?.code;
                if (
                    err === 'messaging/invalid-argument' ||
                    err === 'messaging/registration-token-not-registered'
                ) {
                    invalidTokens.push(tokens[idx]);
                }
            }
        });

        // Xóa token hỏng
        if (invalidTokens.length > 0) {
            const batch = firestore.batch();
            invalidTokens.forEach(token => {
                batch.delete(
                    firestore
                        .collection('fcm_tokens')
                        .doc(userId)
                        .collection('tokens')
                        .doc(token)
                );
            });
            await batch.commit();
            console.log(`🗑️ Đã xóa ${invalidTokens.length} token không hợp lệ.`);
        }

        return { success: true };

    } catch (error) {
        console.error('❌ Lỗi FCM:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * =====================================================================
 * 📌 API: Trigger mô phỏng hoàn thành đơn hàng
 * =====================================================================
 */
router.post('/completeOrder', async (req, res) => {
    const { userId, orderId } = req.body;

    if (!userId || !orderId) {
        return res.status(400).json({
            success: false,
            message: 'Thiếu userId hoặc orderId.'
        });
    }

    const giftCode = `GC-${orderId.slice(-4)}-${Math.floor(Math.random() * 999)}`;

    const result = await sendOrderCompleteNotification(userId, orderId, giftCode);

    if (!result.success) {
        return res.status(500).json({
            success: false,
            message: result.message
        });
    }

    return res.json({
        success: true,
        message: `Đã gửi thông báo hoàn thành đơn hàng cho user ${userId}.`,
        giftCode
    });
});

module.exports = router;



window.updateStatus = async function (orderId) {
            const select = document.getElementById(`status-${orderId}`);
            if (!select) return;
            const newStatus = select.value;
            const orderRef = doc(db, "orders", orderId);

            try {
                // Lấy snapshot cũ để lấy userId
                const orderSnapBefore = await getDoc(orderRef);
                if (!orderSnapBefore.exists()) {
                    showToast("❌ Đơn hàng không tồn tại", "error");
                    return;
                }
                const orderDataBefore = orderSnapBefore.data();
                const userId = orderDataBefore.uid;

                // 1️⃣ Cập nhật trạng thái trong Firestore
                await updateDoc(orderRef, { status: newStatus });
                showToast("✅ Đã cập nhật trạng thái", "success");

                // 2️⃣ Nếu delivered → tạo giftcode + gửi FCM
                if (newStatus === "delivered") {
                    try {
                        // a. Gọi API backend để tạo giftcode và gửi FCM
                        const API_URL = "/notifications/completeOrder";
                        const res = await fetch(API_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId, orderId })
                        });

                        if (!res.ok) {
                            const errorData = await res.json();
                            showToast(`⚠️ Lỗi gửi thông báo: ${errorData.message || "Không xác định"}`, "warning");
                        } else {
                            const data = await res.json();
                            showToast(`🎁 Giftcode: ${data.giftCode} | 🔔 Thông báo đã gửi FCM`, "info");
                        }
                    } catch (err) {
                        console.error("❌ Lỗi gọi API FCM:", err);
                        showToast("❌ Lỗi khi gửi thông báo FCM", "error");
                    }
                }

                // 3️⃣ Refresh UI
                fetchData();

            } catch (e) {
                console.error(e);
                showToast("❌ Lỗi khi cập nhật trạng thái", "error");
            }
        };