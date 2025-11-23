const express = require('express');
const router = express.Router();

// Import Firebase Admin từ file firebaseAdmin.js
const { admin, firestore, messaging } = require('../firebaseAdmin');

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
