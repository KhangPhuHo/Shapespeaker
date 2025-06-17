import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCu6mwsKL-O1GmNG4BNHFdGcuqAgrk8IhY",//apikey để gửi dữ liệu cho firebase
  authDomain: "book-management-b7265.firebaseapp.com",
  projectId: "book-management-b7265",
  storageBucket: "book-management-b7265.firebasestorage.app",
  messagingSenderId: "1046859996196",
  appId: "1:1046859996196:web:1fb51609ff2dc20c130cb1",
  measurementId: "G-ZYTCE1YML4"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
    displayProfile();
});

function displayProfile() {
    const profileContainer = document.getElementById('profile');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const docSnap = await getDoc(doc(db, "users", user.uid));

            if (docSnap.exists()) {
                const userInfo = docSnap.data();

                const avatarSVG = `
                    <svg width="40px" height="40px" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 7C9.65685 7 11 5.65685 11 4C11 2.34315 9.65685 1 8 1C6.34315 1 5 2.34315 5 4C5 5.65685 6.34315 7 8 7Z" fill="#000000"></path>
                        <path d="M14 12C14 10.3431 12.6569 9 11 9H5C3.34315 9 2 10.3431 2 12V15H14V12Z" fill="#000000"></path>
                    </svg>
                `;

                const avatar = userInfo.avatar || user.photoURL || null;
                const username = userInfo.name || user.displayName || "Người dùng";

                profileContainer.innerHTML = `
                    <p class="info">
                        ${avatar ? 
                            `<img style="width: 40px; height: 40px; border-radius: 10px;" src="${avatar}" alt="Avatar">`
                            : avatarSVG
                        }
                        <span id="username1" style="color: white">${username}</span>
                    </p>
                `;
            } else {
                profileContainer.innerHTML = `<p>Không tìm thấy hồ sơ người dùng.</p>`;
            }
        } else {
            profileContainer.innerHTML = `<p>Hãy đăng nhập để hiển thị hồ sơ.</p>`;
        }
    });
}