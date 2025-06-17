// ✅ Khởi tạo Firebase trước
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// 🔧 Config
const firebaseConfig = {
  apiKey: "AIzaSyCu6mwsKL-O1GmNG4BNHFdGcuqAgrk8IhY",
  authDomain: "book-management-b7265.firebaseapp.com",
  projectId: "book-management-b7265",
  storageBucket: "book-management-b7265.appspot.com", // sửa từ `.firebasestorage.app` thành `.appspot.com`
  messagingSenderId: "1046859996196",
  appId: "1:1046859996196:web:1fb51609ff2dc20c130cb1"
};

// ✅ Gọi initializeApp đúng thứ tự
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


const googleLoginBtn = document.getElementById('google-login');

googleLoginBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        // Nếu user chưa có document thì tạo
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                name: user.displayName || "Không rõ",
                email: user.email,
                avatar: user.photoURL || ""
            });
        }

        // Chuyển đến trang chính
        window.location.href = 'isgamemarket.html';
    } catch (error) {
        alert('Lỗi khi đăng nhập: ' + error.message);
        console.error(error);
    }
});
