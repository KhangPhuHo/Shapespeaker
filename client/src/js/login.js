// ✅ login.js
import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { showToast } from "./toast.js"; // Nếu bạn tách riêng showToast

// Phần xử lý DOM
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signup-form");
  const loginBtn = document.getElementById("login-button");

  if (signupForm) signupForm.addEventListener("submit", handleSignup);
  if (loginBtn) loginBtn.addEventListener("click", handleLogin);

  showHidePassword();

  // ✅ Thêm xử lý chuyển form:
  const wrapper = document.querySelector('.wrapper');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');

  if (wrapper && showRegister && showLogin) {
    showRegister.addEventListener('click', (e) => {
      e.preventDefault();
      wrapper.classList.add('active');
    });

    showLogin.addEventListener('click', (e) => {
      e.preventDefault();
      wrapper.classList.remove('active');
    });
  }
});


// ✅ Đăng ký
async function handleSignup(event) {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (!name || !email || !password || !confirmPassword) {
    showToast("Please fill in all fields", "error");
    return;
  }

  if (password !== confirmPassword) {
    showToast("Passwords do not match", "error");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      name,
      email,
      role: "customer",
      id: 2,
      createdAt: serverTimestamp()
    });

    showToast("Signup successful!", "success");

  } catch (error) {
    console.error("Signup error:", error.message);
    showToast("Signup failed. Please try again.", "error");
  }
}

// ✅ Đăng nhập
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    showToast("Please fill in all fields.", "error");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();

    const isAdmin = userData?.role === "admin" && userData?.id === 1;
    const session = {
      userId: user.uid,
      email: user.email,
      isAdmin,
    };

    if (!isAdmin) session.expired_at = Date.now() + 2 * 60 * 60 * 1000;

    localStorage.setItem("session", JSON.stringify(session));
    localStorage.setItem("user_session", JSON.stringify(session));

    showToast("Login successful!", "success");
    document.body.style.transition = "opacity 0.5s";
    document.body.style.opacity = 0;
    setTimeout(() => (window.location.href = "home.html"), 500);

  } catch (error) {
    console.error("Login error:", error.message);
    showToast("Login failed. Try again.", "error");
  }
}

// ✅ Hiển thị/ẩn mật khẩu
function showHidePassword() {
  document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener("click", () => {
      const input = icon.previousElementSibling;
      if (input) {
        input.type = input.type === "password" ? "text" : "password";
        icon.classList.toggle("fa-eye");
        icon.classList.toggle("fa-eye-slash");
      }
    });
  });
}