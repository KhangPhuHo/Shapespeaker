import { db } from './firebase-config.js';
import {
  collection,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getCurrency, setLanguage } from './language.js';
import { loadRatingUI } from './ratings.js';

const exchangeRate = 24000;
const container = document.getElementById("top-products-container");
const loading = document.getElementById("product-loading");

function formatCurrency(amount) {
  const currency = getCurrency();
  return currency === "USD"
    ? `$${(amount / exchangeRate).toFixed(2)}`
    : `${amount.toLocaleString()} VND`;
}

// Lưu trạng thái rating để cập nhật top 4 khi có thay đổi
let productRatings = {};

async function loadProductsAndWatchRatings() {
  if (loading) loading.classList.remove("hidden");

  const snapshot = await getDocs(collection(db, "shapespeakitems"));
  const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Tạo listener cho từng ratings collection
  products.forEach(product => {
    const ratingsRef = collection(db, `shapespeakitems/${product.id}/ratings`);
    onSnapshot(ratingsRef, (ratingsSnap) => {
      const ratings = ratingsSnap.docs.map(doc => doc.data());
      const avgRating = ratings.length
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;
      productRatings[product.id] = { ...product, avgRating };

      updateTopProducts(); // Cập nhật lại top-4 khi có thay đổi
    });
  });
}

function updateTopProducts() {
  const ratedProducts = Object.values(productRatings)
    .filter(p => p.avgRating > 0)
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 4);

  renderTopProducts(ratedProducts);
}

function renderTopProducts(products) {
  container.innerHTML = "";

  products.forEach(product => {
    const div = document.createElement("div");
    //dark:text-white dark:bg-gray-900
    div.className = `bg-white text-gray-900
      rounded-xl shadow-md p-4 w-full max-w-[260px] text-center transition-transform hover:scale-105`;

    div.innerHTML = `
      <img src="${product.picture || "./src/img/shapespeakicon.jpg"}"
           class="w-full h-40 object-cover rounded-md mb-3" />
      <h3 class="text-lg font-bold text-pink-500 mb-1 truncate">${product.name}</h3>
      <p class="text-sm mb-1">
        <span data-i18n="store.price">Price:</span> ${formatCurrency(product.price)}
      </p>
      <div class="rating-container" id="rating-${product.id}"></div>
      <div class="flex justify-center gap-2 mt-2">
        <button class="popup-btn px-3 py-1 rounded bg-pink-400 text-white text-sm hover:bg-pink-500 transition">🔍</button>
      </div>
    `;

    div.querySelector(".popup-btn").onclick = () => {
      window.location.href = `store.html?productId=${product.id}`;
    };

    container.appendChild(div);
    loadRatingUI(product.id, div.querySelector(`#rating-${product.id}`));
  });

  const lang = localStorage.getItem("lang") || "en";
  setLanguage(lang);
  if (loading) loading.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", loadProductsAndWatchRatings);