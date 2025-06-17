// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCu6mwsKL-O1GmNG4BNHFdGcuqAgrk8IhY",//apikey để gửi dữ liệu cho firebase
  authDomain: "book-management-b7265.firebaseapp.com",
  projectId: "book-management-b7265",
  storageBucket: "book-management-b7265.firebasestorage.app",
  messagingSenderId: "1046859996196",
  appId: "1:1046859996196:web:1fb51609ff2dc20c130cb1",
  measurementId: "G-ZYTCE1YML4"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig)
console.log(firebase.app().name)

// Initialize Firebase Authentication and get a reference to the service
const auth = firebase.auth();

//Initialize Cloud Firestore and get a reference to the service
const db = firebase.firestore();

//Initialize Cloud Storage and get a reference to the service
const storage = firebase.storage();
// thực hiên được chức năng đăng nhập và đăng kí 
if (typeof firebase !== "undefined") {
  console.log("Firebase đã được định nghĩa");
} else {
  console.error("Firebase chưa được định nghĩa!");
}

//console.log('Firebase đã được khởi tạo:', app.name);