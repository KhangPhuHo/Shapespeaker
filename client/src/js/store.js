// ✅ store.js - Tối ưu hoá rating & UI + popup flip mặt sau
import { db } from './firebase-config.js';
import { collection, getDocs, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { setLanguage, getCurrency } from './language.js';
import { loadRatingUI } from './ratings.js';
import { loadComments, setupCommentSubmit } from './comments.js';
import { showToast } from './toast.js';

// 👉 Gọi khi DOM ready
document.addEventListener("DOMContentLoaded", () => {
  listenToProductRatings();
});

let products = [];
let currentCurrency = getCurrency();

const exchangeRate = 24000;
const productList = document.getElementById("Market");
const loadingDiv = document.getElementById("product-loading");
const searchInput = document.getElementById("search");
const suggestionsDiv = document.getElementById("suggestions");
const popupContainer = document.querySelector(".popup-container");
const popup = document.querySelector(".popup");

function formatCurrency(amount) {
  const currency = getCurrency();
  return currency === "USD"
    ? `$${(amount / exchangeRate).toFixed(2)}`
    : `${amount.toLocaleString()} VND`;
}

function listenToProductRatings() {
  loadingDiv.classList.remove("hidden");
  productList.innerHTML = "";

  getDocs(collection(db, "shapespeakitems")).then(snapshot => {
    products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    products.forEach(product => {
      const ratingsRef = collection(db, `shapespeakitems/${product.id}/ratings`);

      onSnapshot(ratingsRef, snap => {
        const ratings = snap.docs.map(d => d.data());
        const avg = ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          : 0;

        product.avgRating = avg;

        const sorted = [...products].sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
        const topRatedId = sorted[0]?.avgRating > 0 ? sorted[0].id : null;

        displayProducts(sorted, topRatedId);
      });
    });

    renderPriceFilters();
    loadingDiv.classList.add("hidden");
  });
}

function displayProducts(productArray, topRatedId = null) {
  productList.innerHTML = "";
  productArray.forEach(product => {
    const productEl = renderProductCard(product, topRatedId);
    productList.appendChild(productEl);
  });

  const lang = localStorage.getItem("lang") || "en";
  if (typeof setLanguage === 'function') setLanguage(lang);
}

function renderProductCard(product, topRatedId = null) {
  const imageSrc = product.picture?.trim() || "./src/img/shapespeakicon.jpg";
  const isTopRated = topRatedId && product.id === topRatedId;

  const card = document.createElement("div");
  card.className = `bg-gray-800 text-white rounded-2xl shadow-lg overflow-hidden 
    transition-all duration-300 transform hover:scale-105 hover:-rotate-1 p-3 relative`;

  card.innerHTML = `
    <div class="relative">
      <img src="${imageSrc}" alt="${product.name || 'product'}"
        class="w-full h-40 object-cover rounded-lg border border-gray-700 mb-3" loading="lazy" />
      ${isTopRated ? `
        <div class="absolute top-2 right-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow" title="Sản phẩm được đánh giá cao nhất">
          ⭐ Best
        </div>` : ""}
    </div>
    <h3 class="text-yellow-400 font-semibold text-base truncate mb-1">${product.name || 'No name'}</h3>
    <p class="text-sm text-center text-gray-300">
      <span class="text-white font-medium" data-i18n="store.price">Price:</span> ${formatCurrency(product.price)}
    </p>
  `;

  const lang = localStorage.getItem("lang") || "en";
  setLanguage(lang);

  card.onclick = () => showPopup(product);
  return card;
}

async function loadProductIntro(productId) {
  const container = popup.querySelector("#product-intro");
  container.innerHTML = "";

  try {
    const snap = await getDoc(doc(db, "productIntros", productId));
    if (!snap.exists()) {
      container.textContent = "(Chưa có giới thiệu)";
      return;
    }

    const data = snap.data();
    const blocks = data.blocks || [];

    let maxBottom = 0; // 👈 dùng để tính chiều cao lớn nhất

    for (const block of blocks) {
      const el = document.createElement("div");
      el.className = "absolute";
      el.style.left = block.x + "px";
      el.style.top = block.y + "px";
      el.style.width = block.width + "px";
      el.style.height = block.height + "px";
      el.style.transform = `rotate(${block.rotation || 0}deg)`;
      el.style.zIndex = block.zIndex || 100;

      const bottom = (block.y || 0) + (block.height || 0);
      if (bottom > maxBottom) maxBottom = bottom;

      if (block.type === "text" || block.type === "quote") {
        el.textContent = block.content || "";
        el.style.fontSize = block.fontSize || "16px";
        el.style.color = block.color || "#fff";
        el.style.fontWeight = block.bold ? "bold" : "normal";
        el.style.textAlign = block.align || "left";

        // 🟨 Bổ sung để giống editor
        el.style.padding = "4px 8px";
        el.style.lineHeight = "1.4";
        el.style.overflow = "hidden";
        el.style.wordBreak = "break-word";
        el.style.whiteSpace = "pre-wrap";
        el.style.borderRadius = "6px";

        el.classList.add("block-item", "text-preview");
      } else if (block.type === "image") {
        const img = document.createElement("img");
        img.src = block.content;
        img.style.cssText = `
    width: 100%;
    height: 100%;
    pointer-events: none;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  `;
        el.appendChild(img);
      }


      container.appendChild(el);
    }

    // 👇 Tăng chiều cao tối thiểu cho container để không bị cắt block cuối
    container.style.minHeight = (maxBottom + 100) + "px";

  } catch (err) {
    console.error("❌ Lỗi khi tải giới thiệu sản phẩm:", err);
    container.textContent = "(Lỗi khi tải giới thiệu)";
  }
}

async function showPopup(product) {
  const imageSrc = product.picture?.trim() || "./src/img/shapespeakicon.jpg";
  const postId = product.id || product.postId;

  // Tạo thẻ chứa flip-card bên trong popup
  popup.innerHTML = `
    <div class="flip-card w-full max-w-2xl h-[700px] sm:h-[90vh] mx-auto relative">
      <div class="flip-inner relative w-full h-full transition-transform duration-700">
        
        <!-- MẶT TRƯỚC -->
        <div class="face front absolute inset-0 w-full h-full bg-gray-900 text-white p-6 rounded-2xl shadow-2xl overflow-y-auto scroll-smooth">
          <button class="close-popup absolute top-2 right-3 text-red-400 hover:text-white text-xl z-10">
            <i class="fa-solid fa-circle-xmark"></i>
          </button>
          <img src="${imageSrc}" alt="${product.name}" class="w-full h-60 object-cover rounded-lg border border-gray-600" />
          <h3 class="text-2xl font-bold text-yellow-400 text-center mt-3">${product.name}</h3>
          <p class="text-sm text-gray-300 text-center whitespace-pre-line mt-2">${product.details || ""}</p>
          <div id="rating-summary" class="mt-2"></div>
          <div class="flex justify-around items-center text-sm mb-4 mt-3 space-x-24">
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
            <button class="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-full transition" data-i18n="cart.buy">Mua ngay</button>
            <button onclick='addToCart(${JSON.stringify(product)})' class="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded-full transition" data-i18n="store.add_to_cart">Thêm vào giỏ hàng</button>
            <button id="flip-to-back" class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-full transition" data-i18n="store.information">Thông tin chi tiết</button>
          </div>
          <!-- Bình luận và đánh giá -->
      <div class="w-full max-w-md mt-4 bg-white/5 rounded-xl p-2 text-white flex flex-col h-[550px]">
        <div id="admin-pinned-wrapper" data-visible="true" class="relative mb-2">
          <button id="pinned-toggle-btn" onclick="togglePinned()" title="Ẩn/Hiện ghim"
            class="absolute top-0 right-0 z-10 bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-indigo-600 transition text-xs">
            <i class="fa-solid fa-map-pin"></i>
          </button>
          <div id="admin-pinned" class="mt-2 max-h-[100px] overflow-y-auto pr-1 scroll-smooth"></div>
        </div>

        <div id="comments-list" class="flex-1 overflow-y-auto flex flex-col gap-3 px-2 py-1 scroll-smooth"></div>

        <form id="comment-form" class="mt-2 p-2 border-t border-white/20">
          <div id="media-preview" class="flex flex-wrap gap-2 p-2 mb-2 border border-gray-600 rounded-md hidden"></div>
          <div class="flex items-center gap-2">
            <label for="comment-image" class="cursor-pointer text-gray-300 hover:text-white">
              <i class="fa-solid fa-image text-xl"></i>
            </label>
            <input type="file" name="media" id="comment-image" accept="image/*,video/mp4" multiple class="hidden" />

            <textarea id="comment-input" rows="1" placeholder="Write a message..."
              class="flex-1 resize-none bg-transparent text-white text-sm placeholder-gray-300 focus:outline-none"></textarea>

            <button type="button" id="emoji-toggle" class="text-yellow-400 text-xl hover:text-yellow-500">😊</button>
            <button type="submit" id="submit-comment" class="text-blue-400 hover:text-blue-600 text-xl">
              <i class="fa-solid fa-paper-plane"></i>
            </button>
          </div>

          <div id="emoji-box" class="hidden flex flex-wrap gap-1 mt-2 px-1">
            <button class="text-xl">😀</button><button class="text-xl">😂</button><button class="text-xl">😍</button>
            <button class="text-xl">🥺</button><button class="text-xl">😎</button><button class="text-xl">👍</button>
            <button class="text-xl">🔥</button><button class="text-xl">😡</button><button class="text-xl">🙏</button>
            <button class="text-xl">💯</button>
          </div>
        </form>

        <div class="flex gap-2 mt-2 px-2 overflow-x-auto">
          <img src="https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif" data-url="https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif" class="sticker-option cursor-pointer w-12 h-12 rounded hover:scale-110 transition" />
          <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" data-url="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" class="sticker-option cursor-pointer w-12 h-12 rounded hover:scale-110 transition" />
        </div>
      </div>
      <br>
        </div>

        <!-- MẶT SAU -->
        <div class="face back absolute inset-0 w-full h-full bg-gray-900 text-white p-6 rounded-2xl shadow-2xl overflow-y-auto scroll-smooth">
          <button id="flip-to-front" class="absolute top-2 left-2 text-blue-400 hover:text-white text-xl z-10">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <h2 class="text-center text-2xl font-bold text-yellow-400 mb-3">Giới thiệu sản phẩm</h2>
          <div id="product-intro" class="relative whitespace-pre-line text-sm text-gray-200"></div>
        </div>

      </div>
    </div>
  `;

  popupContainer.style.display = "flex";

  // Setup hiệu ứng lật
  const flipInner = popup.querySelector(".flip-inner");
  popup.querySelector("#flip-to-back").onclick = () => flipInner.classList.add("rotate-y-180");
  popup.querySelector("#flip-to-front").onclick = () => flipInner.classList.remove("rotate-y-180");

  // Đóng popup và reset lại trạng thái
  popup.querySelector(".close-popup").onclick = () => {
    popupContainer.style.display = "none";
    flipInner.classList.remove("rotate-y-180");
  };

  // Load nội dung
  setLanguage(localStorage.getItem("lang") || "en");
  loadComments(postId);
  setupCommentSubmit(postId);
  loadRatingUI(postId);
  loadProductIntro(postId);
}

popupContainer.addEventListener("click", e => {
  if (e.target === popupContainer) popupContainer.style.display = "none";
});

const priceRanges = {
  VND: [
    { min: 0, max: 200_000, label: "Dưới 200K" },
    { min: 200_000, max: 500_000, label: "200K - 500K" },
    { min: 500_000, max: 800_000, label: "500K - 800K" },
    { min: 800_000, max: Infinity, label: "Trên 800K" }
  ],
  USD: [
    { min: 0, max: 10, label: "Under $10" },
    { min: 10, max: 20, label: "$10 - $20" },
    { min: 20, max: 30, label: "$20 - $30" },
    { min: 30, max: Infinity, label: "Above $30" }
  ]
};

function renderPriceFilters() {
  const container = document.getElementById("priceFilter");
  const toggleBtn = document.getElementById("togglePriceFilter");
  container.innerHTML = "";

  const lang = localStorage.getItem("lang") || "en";
  const currencyKey = lang === "en" ? "USD" : "VND";
  const ranges = priceRanges[currencyKey];

  ranges.forEach((range, index) => {
    const btn = document.createElement("button");
    btn.className = `
      text-white font-semibold rounded-full shadow-md
      bg-gradient-to-r from-pink-400 to-yellow-300 
      hover:scale-105 hover:rotate-1 transition-all duration-300 ease-out animate-pill
      px-3 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm
    `;
    btn.style.animationDelay = `${index * 80}ms`;
    btn.innerText = range.label;
    btn.onclick = () => {
      filterByPrice(range.min, range.max);
      container.classList.add("hidden");
    };
    container.appendChild(btn);
  });

  const resetBtn = document.createElement("button");
  resetBtn.className = `
    bg-gray-300 text-gray-800 font-semibold rounded-full shadow 
    hover:bg-gray-400 transition duration-300 animate-pill
    px-3 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm
  `;
  resetBtn.style.animationDelay = `${ranges.length * 80}ms`;
  resetBtn.innerText = lang === "en" ? "All" : "Tất cả";
  resetBtn.onclick = () => {
    displayProducts(products);
    container.classList.add("hidden");
  };
  container.appendChild(resetBtn);

  toggleBtn.onclick = () => {
    container.classList.toggle("hidden");
  };

  document.addEventListener("click", e => {
    if (!toggleBtn.contains(e.target) && !container.contains(e.target)) {
      container.classList.add("hidden");
    }
  });
}

function filterByPrice(min, max) {
  const currency = getCurrency(); // 🔁 gọi lại chính xác mỗi lần
  const filtered = products.filter(p => {
    if (!p.price) return false;
    const price = currency === "USD" ? p.price / exchangeRate : p.price;
    return price >= min && price < max;
  });
  displayProducts(filtered);
}

window.search = function () {
  const query = searchInput.value.toLowerCase();
  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(query) ||
    p.price?.toString().includes(query) ||
    p.stock?.toString().includes(query)
  );
  displayProducts(filtered);
};

window.suggest = function () {
  const query = searchInput.value.toLowerCase();
  suggestionsDiv.innerHTML = "";
  if (!query) return;

  const suggestions = products
    .filter(p => p.name?.toLowerCase().includes(query))
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
  showToast(`\uD83C\uDF1F Đã thêm \"${product.name}\" vào giỏ hàng!`, "success");
};

function changeLanguage(lang) {
  localStorage.setItem("lang", lang);
  currentCurrency = lang === "en" ? "USD" : "VND";
  displayProducts(products);
}

const vnBtn = document.getElementById("lang-vn");
const enBtn = document.getElementById("lang-en");
if (vnBtn) vnBtn.addEventListener("click", () => changeLanguage("vn"));
if (enBtn) enBtn.addEventListener("click", () => changeLanguage("en"));

