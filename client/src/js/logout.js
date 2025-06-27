document.addEventListener("DOMContentLoaded", () => {
  displayLogout();
  setupLogoutButtons();
  setupGlobalEvents(); // giữ phần đóng popup khi click ra ngoài
});

function displayLogout() {
  const logOut = document.getElementById('logout');

  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // Người dùng đã đăng nhập: hiển thị nút Log out
      logOut.innerHTML = `
    <button id="logoutButtonMain" class="box border-none text-white flex items-center gap-2">
        <button id="logoutButtonMain" class="z-10 bg-transparent border-none"><i class="fa fa-sign-in" aria-hidden="true"></i>
           <button id="logoutButtonMain" data-i18n="menu.logout" class="z-10 bg-transparent border-none">Log out</button>
        </button>
    </button>
      `;
    } else {
      // Người dùng chưa đăng nhập: hiển thị nút Login
      logOut.innerHTML = `
        <a href="login.html">
          <button id="Signin" class="box border-none text-white flex items-center gap-2">
            <span><i class="fa fa-sign-in" aria-hidden="true"></i> <span data-i18n="menu.sign_in">Signin/Login</span></span>
          </button>
        </a>
      `;
    }
  });
}

function setupLogoutButtons() {
  const popup = document.getElementById('popup');

  function handleLogout() {
    const user = firebase.auth().currentUser;

    const confirmDelete = confirm("Bạn có muốn xóa tài khoản không?\n\nChọn OK để xóa hoàn toàn.\nChọn Cancel để chỉ đăng xuất.");

    if (confirmDelete && user) {
      firebase.firestore().collection("users").doc(user.uid).delete()
        .then(() => user.delete())
        .then(() => {
          alert("Tài khoản đã bị xóa hoàn toàn.");
          window.location.href = "login.html";
        })
        .catch((error) => {
          alert("Không thể xóa tài khoản: " + error.message);
        });
    } else {
      firebase.auth().signOut()
        .then(() => {
          alert("Đã đăng xuất thành công.");
          if (popup) popup.classList.add('hidden');
          window.location.href = "login.html";
        })
        .catch((error) => {
          alert("Lỗi khi đăng xuất: " + error.message);
        });
    }
  }

  // Lắng nghe click vào nút Log out (chèn qua JS)
  document.addEventListener("click", (e) => {
    if (e.target.id === "logoutButtonMain") {
      handleLogout();
    }
  });
}

function setupGlobalEvents() {
  const popup = document.getElementById('popup');

  // Click ra ngoài popup để đóng
  document.addEventListener('click', (e) => {
    const profileBtn = document.getElementById('profile-btn');
    if (!profileBtn?.contains(e.target) && !popup?.contains(e.target)) {
      popup.classList.add('hidden');
    }
  });
}
