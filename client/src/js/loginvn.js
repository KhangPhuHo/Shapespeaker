const wrapper = document.querySelector('.wrapper');
const showRegister = document.querySelector('#show-register');
const showLogin = document.querySelector('#show-login');

showRegister.addEventListener('click', () => {
    wrapper.classList.add('active');
});

showLogin.addEventListener('click', () => {
    wrapper.classList.remove('active');
});

document.addEventListener("DOMContentLoaded", () => {
    const signupForm = document.getElementById("signup-form");
    const signinForm = document.getElementById("login-button")

    if (signupForm) {
        signupForm.addEventListener("submit", handleSignup);
    }

    if (signinForm) {
        signinForm.addEventListener("click", handleLogin);
    }

    showHidePassword();
});

function handleSignup(event) {
    event.preventDefault();

    let name = document.getElementById("name").value;
    let email = document.getElementById("signup-email").value;
    let password = document.getElementById("signup-password").value;
    let confirmPassword = document.getElementById("confirm-password").value;

    let uppercase = /[A-Z]+/g;
    let lowercase = /[a-z]+/g;
    let numbers = /[0-9]+/g;
    let gmailsymbol = /@/g;
    let pattern = /^\D/g;

    if (!name || !email || !password || !confirmPassword) {
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    let atSymbolCount = (email.match(gmailsymbol) || []).length;
    if (atSymbolCount !== 1) {
        alert("Email phải chứa chính xác 1 ký tự '@'.");
        return;
    }

    if (!email.match(pattern)) {
        alert("Email không được bắt đầu bằng số.");
        return;
    }

    if (password.length < 6) {
        alert("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
    }

    if (!password.match(lowercase)) {
        alert("Mật khẩu phải chứa ít nhất 1 chữ thường.");
        return;
    }

    if (!password.match(uppercase)) {
        alert("Mật khẩu phải chứa ít nhất 1 chữ in hoa.");
        return;
    }

    if (!password.match(numbers)) {
        alert("Mật khẩu phải chứa ít nhất 1 chữ số.");
        return;
    }

    if (password !== confirmPassword) {
        alert("Mật khẩu và xác nhận mật khẩu không khớp!");
        return;
    }

    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            alert("Đăng ký thành công!");
            firebase.firestore().collection("users").doc(user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                console.log("Đã lưu thông tin người dùng vào Firestore.");
            })
            .catch((error) => {
                console.error("Lỗi khi lưu thông tin người dùng: ", error.message);
            });
        })
        .catch((error) => {
            console.error("Lỗi đăng ký: ", error.message);
            alert("Lỗi đăng ký: " + error.message);
        });
}

function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            alert(`Đăng nhập thành công! Email: ${email}`);

            const userSession = {
                userId: user.uid,
                email: user.email,
                password: user.password,
            };
            localStorage.setItem('user_session', JSON.stringify(userSession));

            document.body.style.transition = "opacity 0.5s";
            document.body.style.opacity = "0";

            setTimeout(() => {
                window.location.href = "ISGameMarket.html";
            }, 500);
        })
        .catch((error) => {
            console.error("Lỗi đăng nhập: ", error.message);
            alert("Lỗi đăng nhập: " + error.message);
        });
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
