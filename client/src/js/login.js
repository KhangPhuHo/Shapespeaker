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
    //let role_id = 2; mặc định quyền của guest

    // tạo quy luật cho phần tử
    let uppercase = /[A-Z]+/g// [] chỉ cần có 1 kí tự từ A - Z nếu không thì phải có đúng đoạn đó mới trả về true
    let lowercase = /[a-z]+/g
    let numbers = /[0-9]+/g
    let gmailsymbol = /@/g
    //kí tự đầu tiên không phải là số
    let pattern = /^\D/g
    if (!name || !email || !password || !confirmPassword) {
        alert("Please write full of the information!");
        return;
    }
    // Kiểm tra email chỉ có 1 ký tự '@'
    let atSymbolCount = (email.match(gmailsymbol) || []).length; // Đếm số lượng '@' trong email
    if (atSymbolCount !== 1) {
        alert("Email must contain exactly 1 '@' symbol.");
        return;
    }

    // Kiểm tra ký tự đầu tiên không phải là số
    if (!email.match(pattern)) {
        alert("Email must not start with a digit.");
        return;
    }

    if (password.length < 6) {
        alert("Password must have at least 6 characters");
        return;
    }

    if (!password.match(lowercase)) {
        alert("Password must have at least 1 lowercase letter");
        return;
    }

    if (!password.match(uppercase)) {
        alert("Password must have at least 1 uppercase letter");
        return;
    }

    if (!password.match(numbers)) {
        alert("Password must have at least 1 number");
        return;
    }
    if (password !== confirmPassword) {
        alert("password and confirm password didn't match each other!");
        return;
    }

    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // đăng kí thành công mới nhảy vô then
            const user = userCredential.user;
            alert("Signup successfully!");
            // "": chuỗi, []: danh sách, {}: object,
            // Save additional user information to Firestore
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
                })
        })
        .catch((error) => {
            console.error("Lỗi đăng ký: ", error.message);
            alert("Lỗi đăng ký: " + error.message);
        });
}

function handleLogin(event) {
    event.preventDefault(); // Ngăn chặn hành vi mặc đinh của form

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    // #: id, .: class
    //document.queryselector(); lấy phần tử dựa trên selector(selector class hoặc id) lấy nhiều phần tử class hay id đều đước
    if (!email || !password) {
        alert("Please write full of the information!"); // email kiểm tra email có khác null, undefine hoặc khác "" //! email => kiểm tra email bằng null hoặc undefined hoặc bằng "" không => kiểm tra email không hợp lệ
        return;
    }

    firebase.auth().signInWithEmailAndPassword(email, password)
        // truyền dữ  liệu lên firebase
        // firebase lấy dữ liệu để xác thực, kiểm tra
        // nếu kiểm tra thấy thông tin đúng, trả về người dùng, đăng nhập thành công
        .then((userCredential) => {
            const user = userCredential.user;// userCredential => là 1 thông tin user đã đăng nhập thành công
            alert(`Login successfully! email: ${email}`);

            //const sessionExpiry = new Date().getTime() + 2 * 60 * 60 * 1000; // 2 tiếng
            const userSession = {
                userId: user.uid,
                email: user.email,
                password: user.password,
                //expiry: sessionExpiry
            };
            localStorage.setItem('user_session', JSON.stringify(userSession));
            document.body.style.transition = "opacity 0.5s";
            document.body.style.opacity = "0";
            // Chuyển hướng sang trang chủ sau khi làm mờ 
            setTimeout(() => {
                window.location.href = "ISGameMarket.html";
            }, 500);
        })
        .catch((error) => {
            // xử lý khi xá thực người dùng không hợp lệ
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