function checkLogin() {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // Người dùng đã đăng nhập, không làm gì cả
            return;
        } else {
            // Người dùng chưa đăng nhập
            let content = document.getElementById("content9");
            if (content) {
                content.innerHTML = "";
            }
            alert("Hãy đăng nhập để sử dụng chức năng này");

            setTimeout(() => {
                window.location.href = "ISGameMarketvn.html";
            }, 1000);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
});