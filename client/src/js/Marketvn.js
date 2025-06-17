import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCu6mwsKL-O1GmNG4BNHFdGcuqAgrk8IhY",
  authDomain: "book-management-b7265.firebaseapp.com",
  projectId: "book-management-b7265",
  storageBucket: "book-management-b7265.firebasestorage.app",
  messagingSenderId: "1046859996196",
  appId: "1:1046859996196:web:1fb51609ff2dc20c130cb1",
  measurementId: "G-ZYTCE1YML4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let products = [];

const productList = document.getElementById("Market");
const searchInput = document.getElementById("search");
const suggestionsDiv = document.getElementById("suggestions");
const popupContainer = document.querySelector(".popup-container");
const popup = document.querySelector(".popup");

// Fetch all products from Firestore
async function fetchProducts() {
  const querySnapshot = await getDocs(collection(db, "shapespeakitems"));
  products = [];
  productList.innerHTML = "";

  querySnapshot.forEach((doc) => {
    const product = doc.data();
    product.id = doc.id;
    products.push(product);
  });

  displayProducts(products);
}
// Hiển thị các sp
function displayProducts(productArray) {
  productList.innerHTML = "";
  productArray.forEach(product => {
    const productEl = document.createElement("div");
    productEl.classList.add("product");

    // Dùng ảnh mặc định nếu không có ảnh
    const imageSrc = product.picture && product.picture.trim() !== ""
      ? product.picture
      : "./src/img/cauculator icon.png";

    productEl.innerHTML = `
      <img src="${imageSrc}" alt="${product.name || 'sản phẩm'}" loading="lazy"/>
      <h3>${product.name}</h3>
    `;

    productEl.addEventListener("click", () => showPopup(product));
    productList.appendChild(productEl);
  });
}


// Tìm kiếm sản phẩm
window.search = function () {
  const query = searchInput.value.toLowerCase();
  const filtered = products.filter(product =>
    product.name.toLowerCase().includes(query) ||
    product.details.toLowerCase().includes(query) ||
    product.price.toString().includes(query) ||
    product.stock.toString().includes(query) 
  );
  displayProducts(filtered);
};

// Gợi ý theo từ khóa
window.suggest = function () {
  const query = searchInput.value.toLowerCase();
  suggestionsDiv.innerHTML = "";
  if (query.length === 0) return;

  const suggestions = products
    .filter(product => product.name.toLowerCase().includes(query))
    .slice(0, 5);

  if (suggestions.length === 0) {
    const noResult = document.createElement("div");
    noResult.className = "suggestion-item no-result";
    noResult.textContent = "Không có sản phẩm bạn yêu cầu!";
    suggestionsDiv.appendChild(noResult);
    return;
  }

  suggestions.forEach(product => {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.textContent = product.name;
    item.onclick = () => {
      searchInput.value = product.name;
      search();
      suggestionsDiv.innerHTML = "";
    };
    suggestionsDiv.appendChild(item);
  });
};

// Hiển thị popup
function showPopup(product) {
  const imageSrc = typeof product.picture === "string" && product.picture.trim() !== ""
    ? product.picture.trim()
    : "./src/img/cauculator icon.png";

  popup.innerHTML = `
    <button class="close-popup" ><i class="fa fa-times-circle-o" aria-hidden="true"></i></button>
    <img src="${imageSrc}" alt="${product.name || 'product'}" loading="lazy"/>
    <h3>${product.name}</h3>
    <p>${product.details}</p>
    <div id="display-avs">
      <p>Giá:<br><span class="author-popup">${product.price} VND</span></p>
      <p>Số lượng còn tồn:<br><span class="votes-popup">${product.stock}</span></p>
    </div>
    <a href="${product.link}" target="_blank"><button class="box"><span>Thông tin thêm</span></button></a>
  `;

  popupContainer.style.display = "block";

  document.querySelector(".close-popup").addEventListener("click", () => {
    popupContainer.style.display = "none";
  });
}


// Đóng popup nếu nhấn ra ngoài
popupContainer.addEventListener("click", (e) => {
  if (e.target === popupContainer) {
    popupContainer.style.display = "none";
  }
});

// Khởi chạy
fetchProducts();