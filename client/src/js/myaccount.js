document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("sidebar-toggle");

  toggleBtn.innerHTML = "&#187;"; // >> khi khởi đầu

  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
    toggleBtn.innerHTML = sidebar.classList.contains("active") ? "&#171;" : "&#187;";
    // << khi mở | >> khi đóng
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
        <img src="${avatar || 'default-avatar.png'}" alt="Avatar">
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

function showHidePassword() {
    const togglePasswordIcons = document.querySelectorAll('.toggle-password');
    togglePasswordIcons.forEach(icon => {
        icon.addEventListener("click", () => {
            const input = icon.previousElementSibling;
            input.type = input.type === "password" ? "text" : "password";
            icon.classList.toggle("fa-eye");
            icon.classList.toggle("fa-eye-slash");
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    showHidePassword();
});
