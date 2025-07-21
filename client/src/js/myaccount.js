// ✅ myaccount.js
import { db, auth } from "./firebase-config.js";
import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { setLanguage } from './language.js';
import { showToast } from './toast.js';

// Sidebar toggle
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("sidebar-toggle");

  if (sidebar && toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const isOpen = sidebar.classList.contains("translate-x-0");
      sidebar.classList.toggle("translate-x-0", !isOpen);
      sidebar.classList.toggle("-translate-x-full", isOpen);
      toggleBtn.innerHTML = isOpen ? "&#187;" : "&#171;";
    });
  }

  // Toggle password visibility
  document.querySelectorAll(".toggle-password").forEach((icon) => {
    icon.addEventListener("click", () => {
      const input = icon.previousElementSibling;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      icon.classList.toggle("fa-eye", !isPassword);
      icon.classList.toggle("fa-eye-slash", isPassword);
    });
  });
});

// Load profile on auth state change
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const uid = user.uid;
    try {
      const userDocRef = doc(db, "users", uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        document.getElementById("name").value = data.name || "";
        document.getElementById("email").value = user.email || "";
        document.getElementById("phone").value = data.phone || "";
        document.getElementById("address").value = data.address || "";
        document.getElementById("avatar").value = data.avatar || "";

        renderProfile(data.avatar, data.name, user.email, data.phone, data.address);
      }
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
      showToast("Lỗi khi tải thông tin.", "error");
    }
  } else {
    showToast("Please login to access!", "info");
    window.location.href = "login.html";
  }
});

function renderProfile(avatar, name, email, phone, address) {
  const profile = document.getElementById("profileAccount");
  if (!profile) return;

  profile.innerHTML = `
    <div class="w-40 h-40 mx-auto">
      <img src="${avatar || './src/img/account-25.png'}"
           class="w-full h-full aspect-square rounded-full object-cover"
           alt="Avatar">
    </div>
    <h2>${name || "No Name"}</h2>
    <p><strong>Email</strong> ${email || ""}</p>
    <p><strong data-i18n="myaccount.phone">Phone:</strong> ${phone || ""}</p>
    <p><strong data-i18n="myaccount.address">Address:</strong> ${address || ""}</p>
  `;

  const lang = localStorage.getItem("lang") || "en";
  if (typeof setLanguage === 'function') setLanguage(lang);
}


export async function addInfo() {
  const user = auth.currentUser;
  if (!user) return;

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const address = document.getElementById("address").value.trim();
  const avatar = document.getElementById("avatar").value.trim();
  const currentPassword = document.getElementById("currentPassword")?.value.trim();

  const needsReauth = (email && email !== user.email) || password;

  try {
    if (needsReauth) {
      if (!currentPassword) {
        showToast("You must fill in your entire password for rewrite email or password", "info");
        return;
      }

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
    }

    if (email && email !== user.email) {
      await updateEmail(user, email);
    }

    if (password) {
      await updatePassword(user, password);
    }

    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, {
      name,
      phone,
      address,
      avatar
    });

    showToast("Update successfully!", "success");
    renderProfile(avatar, name, email, phone, address);
  } catch (error) {
    console.error("Update error:", error);
    showToast("Update unsuccessfully", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", addInfo);
  }
});
