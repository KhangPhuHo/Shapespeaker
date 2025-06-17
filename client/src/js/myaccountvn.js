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
            alert("Vui lòng đăng nhập để truy cập.");
            window.location.href = "login.html";
        }
    });
});

function renderProfile(avatar, name, email, phone, address) {
    const profile = document.getElementById("profileAccount");
    profile.innerHTML = `
        <img src="${avatar || 'default-avatar.png'}" alt="Avatar">
        <h2>${name || "Không tên"}</h2>
        <p><strong>Email:</strong> ${email || ""}</p>
        <p><strong>Số điện thoại:</strong> ${phone || ""}</p>
        <p><strong>Địa chỉ:</strong> ${address || ""}</p>
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
                alert("Bạn cần nhập mật khẩu hiện tại để thay đổi email hoặc mật khẩu.");
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

        alert("Cập nhật thành công!");
        renderProfile(avatar, name, email, phone, address);
    } catch (error) {
        console.error("Lỗi cập nhật:", error);
        alert("Cập nhật thất bại: " + error.message);
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
