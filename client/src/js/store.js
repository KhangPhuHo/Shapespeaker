import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase config
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

// DOM
// DOM
const productList = document.getElementById("Market");
const searchInput = document.getElementById("search");
const suggestionsDiv = document.getElementById("suggestions");
const popupContainer = document.querySelector(".popup-container");
const popup = document.querySelector(".popup");

let products = [];
let currentCurrency = localStorage.getItem("lang") === "en" ? "USD" : "VND";
const exchangeRate = 24000;

function formatCurrency(amount) {
  return currentCurrency === "USD"
    ? `$${(amount / exchangeRate).toFixed(2)}`
    : `${amount.toLocaleString()} VND`;
}

async function fetchProducts() {
  const querySnapshot = await getDocs(collection(db, "shapespeakitems"));
  products = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  displayProducts(products);
}

function displayProducts(productArray) {
  productList.innerHTML = "";
  productArray.forEach(product => {
    const productEl = renderProductCard(product);
    productList.appendChild(productEl);
  });
}

function renderProductCard(product) {
  const imageSrc = product.picture?.trim() || "./src/img/cauculator icon.png";

  const card = document.createElement("div");
  card.className = `
    flex-shrink-0 bg-gray-800 text-white rounded-xl shadow-lg overflow-hidden 
    hover:shadow-2xl transition duration-300 p-3 
    w-[48%] sm:w-[45%] md:w-[30%] lg:w-[22%] xl:w-[18%]
  `;
  card.innerHTML = `
    <img src="${imageSrc}" alt="${product.name || 'product'}"
      class="w-full h-40 object-cover rounded-lg border border-gray-700 mb-3" loading="lazy" />
    <h3 class="text-yellow-400 font-semibold text-base truncate mb-1">${product.name || 'No name'}</h3>
    <p class="text-sm text-gray-300"><span class="text-white font-medium" data-i18n="store.price">Price:</span> ${formatCurrency(product.price)}</p>
  `;

  const lang = localStorage.getItem("lang") || "en";
  setLanguage(lang);

  card.onclick = () => showPopup(product);
  return card;
}

window.search = function () {
  const query = searchInput.value.toLowerCase();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.details.toLowerCase().includes(query) ||
    p.price.toString().includes(query) ||
    p.stock.toString().includes(query)
  );
  displayProducts(filtered);
};

window.suggest = function () {
  const query = searchInput.value.toLowerCase();
  suggestionsDiv.innerHTML = "";
  if (!query) return;

  const suggestions = products
    .filter(p => p.name.toLowerCase().includes(query))
    .slice(0, 5);

  if (!suggestions.length) {
    suggestionsDiv.innerHTML = `<div class="suggestion-item no-result">The product you requested is not available!</div>`;
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

function showPopup(product) {
  const imageSrc = product.picture?.trim() || "./src/img/cauculator icon.png";

  popup.innerHTML = `
    <div class="flex flex-col items-center gap-3 relative">
      <button class="close-popup absolute right-2 text-red-400 hover:text-white text-xl">
        <i class="fa-solid fa-circle-xmark"></i>
      </button>
      <br>
      <img src="${imageSrc}" alt="${product.name}" 
        class="w-full h-60 object-cover rounded-lg border border-gray-600" loading="lazy" />
      <h3 class="text-2xl font-bold text-yellow-400 text-center">${product.name}</h3>
      <p class="text-sm text-gray-300 text-center whitespace-pre-line">${product.details || ""}</p>
      <div class="flex justify-around items-center text-sm mb-4 space-x-24">
        <div class="text-center">
          <p class="text-gray-400"><span data-i18n="store.price">Price</span></p>
          <p class="text-base text-amber-300 font-semibold">${formatCurrency(product.price)}</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400"><span data-i18n="store.stock">Stock</span></p>
          <p class="text-base text-emerald-400 font-semibold">${product.stock}</p>
        </div>
      </div>
      <div class="flex flex-col gap-3 mt-4 w-full">
        <button class="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-full transition" data-i18n="cart.buy">
          Mua ngay
        </button>
        <button onclick='addToCart(${JSON.stringify(product)})'
          class="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded-full transition" data-i18n="store.add_to_cart">
          Thêm vào giỏ hàng
        </button>
        <a href="${product.link}" target="_blank">
          <button class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-full transition" data-i18n="store.information">
            Thông tin chi tiết
          </button>
        </a>
      </div>
    </div>
  `;

  popupContainer.style.display = "flex";

  const lang = localStorage.getItem("lang") || "en";
  setLanguage(lang);


  popup.querySelector(".close-popup").onclick = () => {
    popupContainer.style.display = "none";
  };
}

window.addToCart = function (product) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      picture: product.picture,
      price: product.price,
      quantity: 1,
      stock: product.stock
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  alert(`Đã thêm "${product.name}" vào giỏ hàng!`);
};

// Đóng popup khi nhấn ra ngoài
popupContainer.addEventListener("click", e => {
  if (e.target === popupContainer) popupContainer.style.display = "none";
});

// Tự động cập nhật tiền tệ khi đổi ngôn ngữ
function changeLanguage(lang) {
  localStorage.setItem("lang", lang);
  currentCurrency = lang === "en" ? "USD" : "VND";
  displayProducts(products);
}

const vnBtn = document.getElementById("lang-vn");
const enBtn = document.getElementById("lang-en");
if (vnBtn) vnBtn.addEventListener("click", () => changeLanguage("vn"));
if (enBtn) enBtn.addEventListener("click", () => changeLanguage("en"));

// Run
fetchProducts();
