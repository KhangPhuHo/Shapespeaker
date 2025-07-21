// auth-check.js
import { showToast } from "./toast.js";
import { auth } from "./firebase-config.js"; // Nếu bạn dùng modular Firebase SDK

function checkLogin() {
  auth.onAuthStateChanged((user) => {
    const session = JSON.parse(localStorage.getItem("session"));
    const now = Date.now();
    const isAdmin = session?.isAdmin === true;

    if (user && session) {
      // ✅ Nếu là admin hoặc session còn hạn => OK
      if (isAdmin || now < session.expired_at) return;
    }

    // ❌ Session hết hạn hoặc không hợp lệ
    localStorage.removeItem("session");
    localStorage.removeItem("user_session");

    const content = document.getElementById("content9");
    if (content) content.innerHTML = "";

    auth.signOut();
    showToast("Your session has expired. Please log in again.", "info");

    setTimeout(() => {
      window.location.href = "home.html";
    }, 1000);
  });
}

document.addEventListener("DOMContentLoaded", checkLogin);
