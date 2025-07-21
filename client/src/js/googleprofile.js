// ✅ login-google.js (type="module")
import { auth, db } from "./firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { showToast } from "./toast.js"; // ✅ Nhớ export showToast trong toast.js

const googleLoginBtn = document.getElementById('google-login');

const userFriendlyMessage = (code) => {
  switch (code) {
    case "auth/popup-closed-by-user":
      return "Bạn đã đóng cửa sổ đăng nhập.";
    case "auth/account-exists-with-different-credential":
      return "Tài khoản đã tồn tại với phương thức đăng nhập khác.";
    case "auth/network-request-failed":
      return "Không thể kết nối mạng. Vui lòng kiểm tra Internet.";
    default:
      return "Đã xảy ra lỗi khi đăng nhập bằng Google. Vui lòng thử lại sau.";
  }
};

googleLoginBtn.addEventListener('click', async () => {
  googleLoginBtn.disabled = true;
  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: user.displayName || "No Name",
        email: user.email,
        avatar: user.photoURL || "",
        role: "customer",
        id: 2,
        createdAt: serverTimestamp()
      });
    }

    const userData = (await getDoc(userRef)).data();
    const isAdmin = userData?.role === "admin" && userData?.id === 1;

    const userSession = {
      userId: user.uid,
      email: user.email,
      isAdmin
    };

    if (!isAdmin) {
      userSession.expired_at = Date.now() + 2 * 60 * 60 * 1000;
    }

    showToast("Đăng nhập Google thành công.", "success");

    localStorage.setItem("session", JSON.stringify(userSession));
    localStorage.setItem("user_session", JSON.stringify(userSession));

    setTimeout(() => {
      document.body.style.transition = "opacity 0.5s";
      document.body.style.opacity = "0";
      window.location.href = "home.html";
    }, 1000);
  } catch (error) {
    showToast(userFriendlyMessage(error.code), "error");
    console.error("Google login error:", error.code, error.message);
  } finally {
    googleLoginBtn.disabled = false;
  }
});
