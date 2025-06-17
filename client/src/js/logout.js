document.addEventListener("DOMContentLoaded", () => {
    displayLogout();
    setupLogout();
});

function displayLogout() {
    const logOut = document.getElementById('logout');

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // Người dùng đã đăng nhập
            logOut.innerHTML = `
                <button id="logoutButton" class='box'>
                    <span><i class="fa fa-sign-in" aria-hidden="true"></i> Log out</span>
                </button>
            `;
        } else {
            // Người dùng chưa đăng nhập
            logOut.innerHTML = `
                <a href="login.html">
                    <button id="Signin" class='box'>
                        <span><i class="fa fa-sign-in" aria-hidden="true"></i> Signin/Login</span>
                    </button>
                </a>
            `;
        }
    });
}

function setupLogout() {
    document.addEventListener('click', (event) => {
        if (event.target && event.target.id === 'logoutButton') {
            // Hiển thị lựa chọn: Đăng xuất hay Xóa tài khoản
            const confirmDelete = confirm("Bạn có muốn xóa tài khoản không?\n\nChọn OK để xóa tài khoản.\nChọn Cancel để chỉ đăng xuất.");

            const user = firebase.auth().currentUser;

            if (confirmDelete && user) {
                const uid = user.uid;

                // Xóa dữ liệu trong Firestore trước
                firebase.firestore().collection("users").doc(uid).delete()
                    .then(() => {
                        console.log("Đã xóa dữ liệu người dùng trong Firestore.");

                        // Tiếp theo xóa tài khoản trong Auth
                        return user.delete();
                    })
                    .then(() => {
                        alert("Tài khoản đã bị xóa hoàn toàn.");
                        window.location.href = "login.html";
                    })
                    .catch((error) => {
                        console.error("Lỗi khi xóa tài khoản:", error.message);
                        alert("Không thể xóa tài khoản: " + error.message + "\nCó thể bạn cần đăng nhập lại trước.");
                    });

            } else {
                // Nếu chỉ muốn đăng xuất
                firebase.auth().signOut()
                    .then(() => {
                        alert("Đã đăng xuất thành công.");
                        window.location.href = "login.html";
                    })
                    .catch((error) => {
                        console.error("Lỗi khi đăng xuất:", error.message);
                        alert("Đã xảy ra lỗi khi đăng xuất: " + error.message);
                    });
            }
        }
    });
}


