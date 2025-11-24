const express = require('express');
const router = express.Router();
const { admin, firestore, messaging } = require('../firebaseAdmin');

/**
 * API: Check FCM token
 */
router.get("/checkFCMToken", async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: "Thiếu userId" });

    try {
        const tokensSnapshot = await firestore
            .collection("fcm_tokens")
            .doc(userId)
            .collection("tokens")
            .get();

        if (tokensSnapshot.empty) return res.json({ registered: false, tokens: [] });

        const tokens = tokensSnapshot.docs.map(doc => doc.id); // ⚡ dùng doc.id
        return res.json({ registered: true, tokens, token: tokens[0] || null });
    } catch (error) {
        console.error("❌ Lỗi check FCM token:", error);
        return res.status(500).json({ success: false });
    }
});

/**
 * API: Save FCM token
 */
router.post('/saveFCMToken', async (req, res) => {
    const { userId, fcmToken, platform } = req.body;
    if (!userId || !fcmToken) return res.status(400).json({ success: false, message: 'Thiếu userId hoặc fcmToken.' });

    try {
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

        return res.json({ success: true, message: `Đã lưu token FCM cho user ${userId}.` });
    } catch (error) {
        console.error('❌ Lỗi lưu FCM Token:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi lưu token.' });
    }
});

/**
 * API: Delete FCM token
 */
router.post("/deleteFCMToken", async (req, res) => {
    const { userId, fcmToken } = req.body;
    if (!userId || !fcmToken) return res.status(400).json({ success: false, message: "Thiếu userId hoặc fcmToken" });

    try {
        await firestore
            .collection('fcm_tokens')
            .doc(userId)
            .collection('tokens')
            .doc(fcmToken)
            .delete();

        return res.json({ success: true, message: "Đã xóa token" });
    } catch (err) {
        console.error("❌ Lỗi xóa token:", err);
        return res.status(500).json({ success: false, message: "Lỗi server khi xóa token" });
    }
});

/**
 * Function: gửi notification khi đơn hàng hoàn thành
 */
async function sendOrderCompleteNotification(userId, orderId, giftCode) {
    const snapshot = await firestore
        .collection('fcm_tokens')
        .doc(userId)
        .collection('tokens')
        .get();

    if (snapshot.empty) return { success: false, message: 'Không có token để gửi.' };

    const tokens = snapshot.docs.map(d => d.id); // ⚡ dùng doc.id

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
        const response = await messaging.sendMulticast({ tokens, ...payload });

        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const err = resp.error?.code;
                if (err === 'messaging/invalid-argument' || err === 'messaging/registration-token-not-registered') {
                    invalidTokens.push(tokens[idx]);
                }
            }
        });

        if (invalidTokens.length > 0) {
            const batch = firestore.batch();
            invalidTokens.forEach(token => {
                batch.delete(firestore.collection('fcm_tokens').doc(userId).collection('tokens').doc(token));
            });
            await batch.commit();
        }

        return { success: true };
    } catch (error) {
        console.error('❌ Lỗi FCM:', error);
        return { success: false, message: error.message };
    }
}

/**
 * API: trigger hoàn thành đơn hàng
 */
router.post('/completeOrder', async (req, res) => {
    const { userId, orderId } = req.body;
    if (!userId || !orderId) return res.status(400).json({ success: false, message: 'Thiếu userId hoặc orderId.' });

    const giftCode = `GC-${orderId.slice(-4)}-${Math.floor(Math.random() * 999)}`;

    try {
        const result = await sendOrderCompleteNotification(userId, orderId, giftCode);
        return res.json({
            success: result.success,
            message: result.success ? `🎁 Đã gửi thông báo cho user ${userId}` : result.message,
            giftCode
        });
    } catch (error) {
        console.error("❌ Lỗi /completeOrder:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
