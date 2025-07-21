import { auth, db } from './firebase-config.js';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  deleteUser,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { setLanguage } from './language.js';
import { showToast } from './toast.js';

document.addEventListener("DOMContentLoaded", () => {
  handleLogoutUI();
  setupGlobalEvents();
});

function handleLogoutUI() {
  const logoutWrapper = document.getElementById('logout');
  if (!logoutWrapper) return;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Người dùng đã đăng nhập: hiển thị nút Logout
      logoutWrapper.innerHTML = `
        <button id="logoutButtonMain" class="box border-none text-white flex items-center gap-2">
          <button id="logoutButtonMain" class="z-10 bg-transparent border-none"><i class="fa fa-sign-out-alt"></i>
            <button id="logoutButtonMain" data-i18n="menu.logout" class="z-10 bg-transparent border-none">Log out</button>
          </button>
        </button>
      `;
      setupLogoutButtons();
    } else {
      // Chưa đăng nhập
      logoutWrapper.innerHTML = `
        <a href="login.html">
          <button id="Signin" class="box border-none text-white flex items-center gap-2">
            <span><i class="fa fa-sign-in" aria-hidden="true"></i> <span data-i18n="menu.sign_in">Signin/Login</span></span>
          </button>
        </a>
      `;
    }

    const lang = localStorage.getItem("lang") || "en";
    setLanguage(lang);
  });
}

function setupLogoutButtons() {
  const modal = document.getElementById('logout-confirm-modal');
  const confirmBtn = document.getElementById('confirmDeleteBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const cancelModalBtn = document.getElementById("cancelModalBtn");
  const logoutMainBtn = document.getElementById("logoutButtonMain");

  if (!modal || !confirmBtn || !cancelBtn || !logoutMainBtn) return;

  // Hiện modal xác nhận khi bấm "Log out"
  logoutMainBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
  });

  // 👉 Xoá tài khoản
  confirmBtn.onclick = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const providerId = user.providerData[0]?.providerId;

      if (providerId === "password") {
        const password = prompt("Nhập lại mật khẩu để xác nhận:");
        if (!password) {
          showToast("Bạn chưa nhập mật khẩu.", "error");
          return;
        }

        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);

      } else if (providerId === "google.com") {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      } else {
        showToast("Không hỗ trợ kiểu đăng nhập này.", "error");
        return;
      }

      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);

      localStorage.removeItem("user_session");
      showToast("Tài khoản đã bị xóa hoàn toàn.", "success");
      window.location.href = "login.html";
    } catch (error) {
      console.error("Lỗi khi xoá:", error.message);
      if (error.code === "auth/popup-closed-by-user") {
        showToast("Bạn đã huỷ xác thực Google.", "info");
      } else if (error.code === "auth/wrong-password") {
        showToast("Mật khẩu không chính xác.", "error");
      } else {
        showToast("Không thể xoá tài khoản. Vui lòng thử lại.", "error");
      }
    }
  };

  // 👉 Đăng xuất
  cancelBtn.onclick = () => {
    modal.classList.add("hidden");
    signOut(auth)
      .then(() => {
        localStorage.removeItem("user_session");
        showToast("Đã đăng xuất thành công.", "success");
        window.location.href = "login.html";
      })
      .catch((error) => {
        console.error("Lỗi khi đăng xuất:", error.message);
        showToast("Lỗi khi đăng xuất.", "error");
      });
  };

  // 👉 Huỷ modal
  cancelModalBtn?.addEventListener("click", () => {
    modal.classList.add("hidden");
  });
}

// 👉 Ẩn popup khi click ra ngoài
function setupGlobalEvents() {
  const popup = document.getElementById('popup');

  document.addEventListener('click', (e) => {
    const profileBtn = document.getElementById('profile-btn');
    if (!profileBtn?.contains(e.target) && !popup?.contains(e.target)) {
      popup?.classList.add('hidden');
    }
  });
}
