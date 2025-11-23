// ✅ leaderboard-draw-game.js
import { db } from "./firebase-config.js";
import {
    doc, setDoc, getDoc, collection, query, orderBy, limit, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// --- Lấy thông tin user từ localStorage.session ---
function getCurrentUser() {
    try {
        const session = JSON.parse(localStorage.getItem("session"));
        if (session && session.userId) {
            return session;
        }
    } catch (e) {
        console.error("Không đọc được session", e);
    }
    return null;
}

// --- Lưu kết quả vào leaderboard (chỉ cập nhật nếu tốt hơn) ---
export async function saveLeaderboard(score, totalTime) {
    const user = getCurrentUser();
    if (!user) {
        console.warn("❌ Chưa đăng nhập, không thể lưu leaderboard");
        return;
    }

    // Lấy thêm info từ users collection nếu có
    let name = "Ẩn danh";
    try {
        const userRef = doc(db, "users", user.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const u = userSnap.data();
            name = u.name || u.email || "Ẩn danh";
        } else {
            // fallback: lấy email từ session
            name = user.email || "Ẩn danh";
        }
    } catch (e) {
        console.error("Lỗi lấy dữ liệu user:", e);
    }

    const lbRef = doc(db, "leaderboard-draw-game", user.userId);
    const lbSnap = await getDoc(lbRef);

    if (lbSnap.exists()) {
        const oldData = lbSnap.data();
        const oldScore = oldData.score || 0;
        const oldTime = oldData.totalTime || 999999;

        // ✅ Chỉ update nếu kết quả mới tốt hơn
        const isBetter =
            score > oldScore || (score === oldScore && totalTime < oldTime);

        if (isBetter) {
            await setDoc(
                lbRef,
                {
                    userId: user.userId,
                    name,
                    score,
                    totalTime,
                    updatedAt: new Date().toISOString(),
                },
                { merge: true }
            );
            console.log("🎉 Điểm mới tốt hơn, đã cập nhật leaderboard!");
        } else {
            console.log("⚡ Điểm mới không tốt hơn, giữ nguyên leaderboard.");
        }
    } else {
        // Nếu chưa có thì tạo luôn
        await setDoc(lbRef, {
            userId: user.userId,
            name,
            score,
            totalTime,
            updatedAt: new Date().toISOString(),
        });
        console.log("🚀 Tạo mới leaderboard cho user");
    }
}

// --- Lắng nghe realtime leaderboard ---
export function listenLeaderboard() {
    const q = query(
        collection(db, "leaderboard-draw-game"),
        orderBy("score", "desc"),      // Ưu tiên điểm cao
        orderBy("totalTime", "asc"),   // Nếu cùng điểm thì thời gian ít hơn đứng trước
        limit(20)
    );

    onSnapshot(q, (querySnapshot) => {
        const tbody = document.getElementById("leaderboard-body");
        tbody.innerHTML = "";
        let rank = 1;
        querySnapshot.forEach((doc) => {
            const user = doc.data();
            const updated = user.updatedAt
                ? new Date(user.updatedAt).toLocaleString("vi-VN") // hiển thị ngày + giờ
                : "-";

            const row = `
      <tr class="hover:bg-gray-100">
        <td class="border p-2 text-center">${rank}</td>
        <td class="border p-2">${user.name || "Ẩn danh"}</td>
        <td class="border p-2 text-center">${user.score || 0}</td>
        <td class="border p-2 text-center">${user.totalTime || 0}s</td>
        <td class="border p-2 text-center text-gray-500 text-sm">${updated}</td>
      </tr>`;
            tbody.innerHTML += row;
            rank++;
        });
    });
}
