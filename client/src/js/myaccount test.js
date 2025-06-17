document.getElementById("menu-toggle").addEventListener("click", function () {
    document.getElementById("Menu1").classList.toggle("active");
});
function addInfo() {
    const userInfo = {
        username: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
        avatar: document.getElementById('avatar').value.trim()
    };

    db.collection("login").doc(userInfo.email).set(userInfo)
        .then(() => {
            console.log("User added to Firestore!");
            localStorage.setItem('currentUser', userInfo.email);
            displayProfile();
        })
        .catch(error => console.error("Error adding user:", error));
}
function displayProfile() {
    const profileContainer = document.getElementById('profileAccount');
    const email = localStorage.getItem('currentUser');

    db.collection("login").doc(email).get().then((doc) => {
        if (doc.exists) {
            const userInfo = doc.data();
            profileContainer.innerHTML = `
                <h2>Personal Information</h2>
                ${userInfo.avatar ? `<img src="${userInfo.avatar}" alt="Avatar">` : ""}
                <p><span>Name:</span> ${userInfo.username}</p>
                <p><span>Email:</span> ${userInfo.email}</p>
                <p><span>Phone:</span> ${userInfo.phone}</p>
                <p><span>Address:</span> ${userInfo.address}</p>
                <button type="button" onclick="editProfile()">Edit profile</button>
            `;
        } else {
            profileContainer.innerHTML = `<p>No user data found.</p>`;
        }
    }).catch(error => console.error("Error fetching user:", error));
}
function displayProfile2() {
    const profileContainer = document.getElementById('profile');
    const email = localStorage.getItem('currentUser'); // Lấy email của user đã đăng nhập

    db.collection("login").doc(email).get().then((doc) => {
        if (doc.exists) {
            const userInfo = doc.data();
            const avatarSVG = `
                <svg width="32px" height="32px" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M8 7C9.65685 7 11 5.65685 11 4C11 2.34315 9.65685 1 8 1C6.34315 1 5 2.34315 5 4C5 5.65685 6.34315 7 8 7Z" fill="#000000"></path> <path d="M14 12C14 10.3431 12.6569 9 11 9H5C3.34315 9 2 10.3431 2 12V15H14V12Z" fill="#000000"></path> </g></svg>
            `;

            profileContainer.innerHTML = `
                <p class="info">
                    ${userInfo.avatar ? `<img style="width: 40px; height: 40px; border-radius: 10px;" src="${userInfo.avatar}" alt="Avatar">` : avatarSVG} 
                    <span id="username1">${userInfo.username}</span>
                </p>
            `;
        } else {
            profileContainer.innerHTML = `<p>No user data found. Please create an account.</p>`;
        }
    }).catch(error => console.error("Error fetching user profile:", error));
}
function updateUserInfoAfterLogin() {
    const email = localStorage.getItem('currentUser'); // Lấy email của người dùng đã đăng nhập

    if (email) {
        db.collection("login").doc(email).get().then((doc) => {
            if (doc.exists) {
                const userInfo = doc.data();

                // Cập nhật thông tin người dùng lên Firestore
                const updatedProfile = {
                    username: userInfo.username,
                    email: userInfo.email,
                    phone: userInfo.phone || "N/A",
                    address: userInfo.address || "N/A",
                    avatar: userInfo.avatar || "",
                    password: userInfo.password
                };

                db.collection("login").doc(email).set(updatedProfile)
                    .then(() => {
                        console.log("User info updated in Firestore!");
                        displayProfile();
                        displayProfile2();
                    })
                    .catch(error => console.error("Error updating user:", error));
            }
        }).catch(error => console.error("Error fetching user info:", error));
    } else {
        console.error("No user logged in.");
    }
}

function editProfile() {
    const email = localStorage.getItem('currentUser');

    db.collection("login").doc(email).get().then((doc) => {
        if (doc.exists) {
            const userInfo = doc.data();
            document.getElementById('name').value = userInfo.username;
            document.getElementById('email').value = userInfo.email;
            document.getElementById('password').value = userInfo.password;
            document.getElementById('phone').value = userInfo.phone;
            document.getElementById('address').value = userInfo.address;
            document.getElementById('avatar').value = userInfo.avatar;
        }
    }).catch(error => console.error("Error fetching user for edit:", error));
}
function updateUserCredentials() {
    const email = localStorage.getItem('currentUser');
    const updatedUser = {
        username: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
        avatar: document.getElementById('avatar').value.trim()
    };

    db.collection("login").doc(email).update(updatedUser)
        .then(() => {
            console.log("User info updated!");
            displayProfile();
        })
        .catch(error => console.error("Error updating user:", error));
}
document.addEventListener('DOMContentLoaded', () => {
    displayProfile();
    updateUserInfoAfterLogin()
    displayProfile2()
});
