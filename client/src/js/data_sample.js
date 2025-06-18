function checkUserSessionExpired() {
    let session = JSON.parse(localStorage.getItem("session"))
    const currentTime = new Date().getTime();
    if (currentTime >= session.expired_at) {
        localStorage.removeItem('session')
        alert("Phiên người dùng đã hết hạn, vui lòng đăng nhập lại để tiếp tục sử dụng.")
        window.location.href = "isgamemarket.html"
    }
}
function checkUserExist() {
    let session = localStorage.getItem("session")
    if(session){
        alert("Vui lòng đăng nhập để tiếp tục sử dụng")
        window.location.href = "isgamemarket.html"
    }
}