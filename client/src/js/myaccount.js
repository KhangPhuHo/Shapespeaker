document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("sidebar-toggle");

  toggleBtn.addEventListener("click", () => {
    const isOpen = sidebar.classList.contains("translate-x-0");
    sidebar.classList.toggle("translate-x-0", !isOpen);
    sidebar.classList.toggle("-translate-x-full", isOpen);
    toggleBtn.innerHTML = isOpen ? "&#187;" : "&#171;"; // >> / <<
  });
});


window.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const uid = user.uid;
            try {
                const doc = await db.collection("users").doc(uid).get();
                if (doc.exists) {
                    const data = doc.data();
                    // Gán dữ liệu vào form
                    document.getElementById("name").value = data.name || "";
                    document.getElementById("email").value = user.email || "";
                    document.getElementById("phone").value = data.phone || "";
                    document.getElementById("address").value = data.address || "";
                    document.getElementById("avatar").value = data.avatar || "";

                    renderProfile(data.avatar, data.name, user.email, data.phone, data.address);
                }
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu:", error);
                alert("Lỗi khi tải thông tin.");
            }
        } else {
            alert("Please login to access!");
            window.location.href = "login.html";
        }
    });
});

function renderProfile(avatar, name, email, phone, address) {
    const profile = document.getElementById("profileAccount");
    profile.innerHTML = `
        <img src="${avatar || 'default-avatar.png'}" class="w-56 h-56 rounded-full object-cover mx-auto block" alt="Avatar">
        <h2>${name || "No Name"}</h2>
        <p><strong>Email:</strong> ${email || ""}</p>
        <p><strong>Phone:</strong> ${phone || ""}</p>
        <p><strong>Address:</strong> ${address || ""}</p>
    `;
}

async function addInfo() {
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
        // Xác thực lại nếu cần
        if (needsReauth) {
            if (!currentPassword) {
                alert("You must fill in your entire password for rewrite email or password");
                return;
            }
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);
        }

        if (email && email !== user.email) {
            await user.updateEmail(email);
        }

        if (password) {
            await user.updatePassword(password);
        }

        // Cập nhật Firestore
        await db.collection("users").doc(user.uid).update({
            name,
            phone,
            address,
            avatar
        });

        alert("update successfully!");
        renderProfile(avatar, name, email, phone, address);
    } catch (error) {
        console.error("Update error:", error);
        alert("update unsuccessfully: " + error.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', () => {
      const input = icon.previousElementSibling;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      icon.classList.toggle('fa-eye', !isPassword);
      icon.classList.toggle('fa-eye-slash', isPassword);
    });
  });
});

