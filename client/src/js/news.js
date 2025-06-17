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

const productList = document.getElementById("Lastestnews");
const searchInput = document.getElementById("search");
const suggestionsDiv = document.getElementById("suggestions");
const popupContainer = document.querySelector(".popup-container");
const popup = document.querySelector(".popup");

// Fetch all products from Firestore
async function fetchProducts() {
  const querySnapshot = await getDocs(collection(db, "shapespeaknews"));
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
    productEl.classList.add("new");

    // Dùng ảnh mặc định nếu không có ảnh
    const imageSrc = product.picture && product.picture.trim() !== ""
      ? product.picture
      : "./src/img/cauculator icon.png";

    // Format thời gian
    const formatDate = (timestamp) => {
      if (timestamp?.toDate) {
        const date = timestamp.toDate();
        return `${date.getDate().toString().padStart(2, '0')}/${
                 (date.getMonth() + 1).toString().padStart(2, '0')}/${
                 date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${
                 date.getMinutes().toString().padStart(2, '0')}`;
      }
      return "";
    };

    const createdAtFormatted = formatDate(product.createdAt);
    const updatedAtFormatted = formatDate(product.updatedAt);

    productEl.innerHTML = `
      <img src="${imageSrc}" alt="${product.name || 'product'}" loading="lazy"/>
      <h3>${product.name || ''}</h3>
      <div style="color: white;">
        <p>Created: ${createdAtFormatted}</p>
        <p>Updated: ${updatedAtFormatted || 'Not updated'}</p>
      </div>
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
    product.author.toString().includes(query) ||
    product.link.toString().includes(query)
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
    noResult.textContent = "The product you requested is not available!";
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
    <button class="close-popup"><i class="fa fa-times-circle-o" aria-hidden="true"></i></button>
    <img src="${imageSrc}" alt="${product.name || 'product'}" loading="lazy"/>
    <h3>${product.name}</h3>
    <p>${product.details}</p>
    <div id="display-avs"><p>Author:<br><span class="author-popup">${product.author || "Don't have author"}</span></p></div>
    <a href="${product.link}" target="_blank"><button class="box"><span>More information</span></button></a>
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
