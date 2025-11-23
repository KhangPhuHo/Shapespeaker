// src/js/giftcode-utils.js
// Helper để generate + lưu giftcode, show toast và redirect (tuỳ chọn)

import { db } from './firebase-config.js';
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { showToast } from './toast.js';
import { getTranslation } from './language.js';

/**
 * Tạo mã ngẫu nhiên 8 ký tự (A-Z, 0-9)
 * @param {number} length
 * @returns {string}
 */
export function generateGiftCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

/**
 * Tạo và lưu giftcode cho một order vào collection "giftcodes".
 * Hiển thị toast có mã, và (tuỳ chọn) redirect tới trang giftcode với param ?code=...
 *
 * @param {string} uid - user id
 * @param {string} orderId - id của order vừa tạo
 * @param {Array} items - items trong order
 * @param {Object} options - { redirect: boolean, redirectPath: string }
 * @returns {Promise<string>} - trả về mã đã lưu
 */
export async function createAndSaveGiftCode(uid, orderId, items = [], options = {}) {
  const { redirect = true, redirectPath = './giftcode.html' } = options;

  try {
    const code = generateGiftCode(8);

    await addDoc(collection(db, "giftcodes"), {
      uid,
      orderId,
      code,
      items,
      link: "https://www.youtube.com/shorts/WFCoRh9zer0",
      date: serverTimestamp(),
      used: false
    });

    // Hiển thị toast chung và toast mã (dịch nếu cần)
    try {
      const toastMsg = await getTranslation("toast.giftcode_created"); // optional key
      // nếu có key translation, replace {code}
      if (toastMsg && toastMsg.includes("{code}")) {
        showToast(toastMsg.replace("{code}", code), "success");
      } else {
        // fallback thông báo đơn giản
        showToast(`🎁 Gift code: ${code}`, "success");
      }
    } catch (e) {
      // nếu getTranslation lỗi, vẫn show toast
      showToast(`🎁 Gift code: ${code}`, "success");
    }

    // Redirect (nếu muốn) kèm query param để highlight
    if (redirect) {
      // chờ 2 giây rồi mới chuyển trang
      await new Promise(resolve => setTimeout(resolve, 2000));
      window.location.href = `${redirectPath}?code=${encodeURIComponent(code)}`;
    }


    return code;
  } catch (err) {
    console.error("❌ Lỗi khi tạo giftcode:", err);
    const fallback = await (async () => {
      try {
        return await getTranslation("toast.giftcode_error");
      } catch {
        return "Không thể tạo giftcode. Vui lòng liên hệ quản trị.";
      }
    })();
    showToast(fallback, "error");
    throw err;
  }
}
