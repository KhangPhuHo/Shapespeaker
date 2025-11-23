// ✅ store.js - Tối ưu hoá rating & UI + popup flip mặt sau
import { db } from './firebase-config.js';
import { collection, getDocs, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { setLanguage } from './language.js';
import { loadComments, setupCommentSubmit } from './comments.js';
import { setupSlider } from "./slider-control.js";

let products = [];
let currentSort = "desc"; // "desc" = mới nhất trước

const productList = document.getElementById("Lastestnews");
const sortToggle = document.getElementById("sortToggle");
const sortIcon = document.getElementById("sortIcon");
const sortLabel = document.getElementById("sortLabel");
const loadingDiv = document.getElementById("product-loading");
const searchInput = document.getElementById("search");
const suggestionsDiv = document.getElementById("suggestions");
const popupContainer = document.querySelector(".popup-container");
const popup = document.querySelector(".popup");

function formatDate(timestamp) {
  if (timestamp?.toDate) {
    const date = timestamp.toDate();
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  return "";
}

function sortProductsByDate(products, order = "desc") {
  return [...products].sort((a, b) => {
    const timeA = a.createdAt?.toDate?.().getTime?.() ?? 0;
    const timeB = b.createdAt?.toDate?.().getTime?.() ?? 0;
    return order === "desc" ? timeB - timeA : timeA - timeB;
  });
}

async function fetchProducts() {
  loadingDiv.classList.remove("hidden");
  productList.innerHTML = "";

  const querySnapshot = await getDocs(collection(db, "shapespeaknews"));
  products = [];

  querySnapshot.forEach((doc) => {
    const product = doc.data();
    product.id = doc.id;
    products.push(product);
  });

  displayProducts(products);
  loadingDiv.classList.add("hidden");
}

function displayProducts(productArray) {
  productList.innerHTML = "";
  const sorted = sortProductsByDate(productArray, currentSort);

  sorted.forEach(product => {
    const productEl = document.createElement("div");
    productEl.className = `
      bg-rose-300/80 text-gray-800 rounded-xl shadow-lg overflow-hidden 
hover:shadow-xl transition-all duration-300 p-3 transform hover:scale-105 hover:-rotate-1
    `;

    const imageSrc = product.picture?.trim() || "./src/img/shapespeakicon.jpg";
    const createdAt = formatDate(product.createdAt);
    const updatedAt = formatDate(product.updatedAt);

    productEl.innerHTML = `
  <img src="${imageSrc}" alt="${product.name || 'product'}"
    class="w-full h-40 object-cover rounded-t-xl border-b border-pink-200" loading="lazy" />
    
  <div class="p-3 space-y-1">
    <h3 class="text-base font-semibold text-rose-600 truncate">${product.name || 'No name'}</h3>

    <!--<p class="text-xs sm:text-sm text-gray-700 flex flex-wrap gap-x-2 justify-center">-->
    <!--<span class="font-bold"><span data-i18n="news.created">Created:</span> ${createdAt}</span>-->
    <!--<span class="font-bold"><span data-i18n="news.updated">Updated:</span> ${updatedAt || 'Not updated'}</span>-->
    <!--</p>-->
  </div>
    `;

    productEl.addEventListener("click", () => showPopup(product));
    productList.appendChild(productEl);
  });

  const lang = localStorage.getItem("lang") || "en";
  if (typeof setLanguage === 'function') setLanguage(lang);
}

sortToggle.addEventListener("click", () => {
  currentSort = currentSort === "desc" ? "asc" : "desc";
  //sortLabel.textContent = currentSort === "desc" ? "Newest First" : "Oldest First";
  sortLabel.setAttribute("data-i18n", currentSort === "desc" ? "news.sort_newest" : "news.sort_oldest");

  const lang = localStorage.getItem("lang") || "en";
  if (typeof setLanguage === 'function') setLanguage(lang);

  sortIcon.classList.toggle("rotate-180");

  displayProducts(products);
});

async function loadProductIntro(productId) {
  const container = popup.querySelector("#product-intro");
  container.innerHTML = "";

  try {
    const snap = await getDoc(doc(db, "productIntros", productId));
    if (!snap.exists()) {
      //container.textContent = "(Chưa có giới thiệu)";
      container.setAttribute("data-i18n", "store.no_intro");
      setLanguage(localStorage.getItem("lang") || "en");
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
    container.setAttribute("data-i18n", "store.error_intro");
      setLanguage(localStorage.getItem("lang") || "en");
  }
}

async function showPopup(product) {

  // ✅ Lấy popup container và popup bên trong
  const popupContainer = document.querySelector(".popup-container");
  const popup = popupContainer?.querySelector(".popup");

  if (!popup || !popupContainer) {
    console.error("Không tìm thấy phần tử popup hoặc popup-container!");
    return;
  }

  // Now proceed exactly as before (use popup and popupContainer variables below)
  const imageSrc = product.picture?.trim() || "./src/img/shapespeakicon.jpg";
  const postId = product.id || product.postId;

  // Giao diện popup (chỉ thay đổi bố cục hiển thị)
  popup.innerHTML = `
  <div class="flip-card w-full h-full relative">
    <div class="flip-inner relative w-full h-full transition-transform duration-700">

      <!-- MẶT TRƯỚC -->
      <div class="face front absolute inset-0 bg-[#1e1e20] text-white p-6 rounded-2xl shadow-2xl overflow-y-auto scroll-smooth">
        <button class="close-popup absolute top-2 right-3 text-red-400 hover:text-white text-xl z-10">
          <i class="fa-solid fa-circle-xmark"></i>
        </button>

        <!-- Bố cục 2 cột cho desktop -->
        <div class="desktop-layout">
          <!-- CỘT TRÁI: Hình ảnh -->
          <div class="desktop-left">
            <div class="relative w-full h-70 lg:h-[70vh] overflow-hidden rounded-lg border border-[#2e2e33]">
              <div class="flex transition-transform duration-500 ease-in-out" id="product-slider">
                ${[
      `<div class='w-full flex-shrink-0'><img src='${imageSrc}' class='w-full h-full object-cover rounded-lg' /></div>`,
      ...(product.media || []).map(m => {
        if (m.type === "video") {
          return `<div class='w-full flex-shrink-0'>
                                <video src='${m.url}' class='w-full h-full object-cover rounded-lg' controls muted></video>
                              </div>`;
        } else {
          return `<div class='w-full flex-shrink-0'>
                                <img src='${m.url}' class='w-full h-full object-cover rounded-lg' />
                              </div>`;
        }
      })
    ].join("")}
              </div>

              <!-- Nút điều hướng -->
              <button id="prev-slide" class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
              <button id="next-slide" class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center">
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
            <div id="slider-dots" class="flex justify-center mt-2 space-x-2"></div>
          </div>

          <!-- CỘT PHẢI: Thông tin + Bình luận (NEWS POPUP) -->
<div class="desktop-right w-full lg:w-[45%] flex flex-col justify-start items-center p-4 
            min-h-[300px] lg:max-h-[80vh] overflow-y-auto scroll-smooth">

  <div class="flex flex-col justify-start items-center w-full space-y-4">

    <!-- Tên bài viết -->
    <h3 class="text-2xl font-bold text-yellow-400 text-center">
      ${product.name}
    </h3>

    <!-- Chi tiết sản phẩm -->
    <div class="product-details text-center">
      <p class="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
        ${product.details || ""}
      </p>
      <div id="rating-summary" class="mt-2"></div>
    </div>

    <!-- Tác giả -->
    <div class="text-center">
      <p class="text-gray-400 text-sm" data-i18n="news.author">Tác giả:</p>
      <p class="text-lg font-semibold text-[#90cdf4]">
        ${product.author || "Không có thông tin"}
      </p>
    </div>

    <!-- Nút -->
    <div class="action-buttons flex flex-col gap-3 w-full mt-2">
      <button
        id="flip-to-back"
        class="w-full bg-gradient-to-r from-pink-300 to-orange-200 
               text-gray-900 font-semibold py-2 px-4 rounded-full transition hover:opacity-90"
        data-i18n="news.information">
        Thông tin chi tiết
      </button>
    </div>

  </div>

</div>

        </div>

        <!-- COMMENTS SECTION -->
      <div class="w-full sm:w-[500px] lg:w-[700px] xl:w-[850px] mx-auto mt-4 bg-[#2b2b2e] rounded-xl p-2 text-white flex flex-col h-[550px] border border-white/10">

        <!-- Pinned -->
        <div id="admin-pinned-wrapper" data-visible="true" class="relative mb-2">
          <button id="pinned-toggle-btn" onclick="togglePinned()" title="Ẩn/Hiện ghim"
            class="absolute top-0 right-0 z-10 bg-[#6366f1] text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-indigo-600 transition text-xs">
            <i class="fa-solid fa-map-pin"></i>
          </button>
          <div id="admin-pinned" class="mt-2 max-h-[100px] overflow-y-auto pr-1 scroll-smooth"></div>
        </div>

        <div id="comments-list" class="flex-1 overflow-y-auto flex flex-col gap-3 px-2 py-1 scroll-smooth"></div>

        <!-- Comment form -->
        <form id="comment-form" class="mt-2 p-2 border-t border-white/10">
          <div id="media-preview" class="flex flex-wrap gap-2 p-2 mb-2 border border-gray-700 rounded-md hidden"></div>

          <div class="flex items-center gap-2">
            <label for="comment-image" class="cursor-pointer text-gray-300 hover:text-white">
              <i class="fa-solid fa-image text-xl"></i>
            </label>
            <input type="file" name="media" id="comment-image" accept="image/*,video/mp4" multiple class="hidden" />

            <textarea id="comment-input" rows="1" placeholder="Write a message..."
              class="flex-1 resize-none bg-transparent text-white text-sm placeholder-gray-400 focus:outline-none"></textarea>

            <button type="button" id="emoji-toggle" class="text-yellow-300 text-xl hover:text-yellow-400">😊</button>
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

        <!-- Stickers -->
        <div class="flex gap-2 mt-2 px-2 overflow-x-auto">
          <img src="https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif" data-url="https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif"
            class="sticker-option cursor-pointer w-12 h-12 rounded hover:scale-110 transition" />
          <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" data-url="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif"
            class="sticker-option cursor-pointer w-12 h-12 rounded hover:scale-110 transition" />
        </div>
      </div>
      <br><br>   
      </div>

      <!-- MẶT SAU -->
      <div class="face back absolute inset-0 bg-[#1e1e20] text-white p-6 rounded-2xl shadow-2xl overflow-y-auto scroll-smooth">
        <button id="flip-to-front" class="absolute top-2 left-2 text-blue-400 hover:text-white text-xl z-10">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h2 class="text-center text-2xl font-bold text-yellow-400 mb-3" data-i18n="store.intro">Giới thiệu sản phẩm</h2>
        <div id="product-intro" class="relative whitespace-pre-line text-sm text-gray-200"></div>
      </div>
    </div>
  </div>
  `;

  popupContainer.style.display = "flex";
  popup.style.display = "block"; // ✅ giúp hiển thị trên mobile

  // Ẩn menu khi bật popup
  const menu = document.getElementById("Menu");
  if (menu) {
    menu.style.display = "none";
  }

  setupSlider(popup);

  const flipInner = popup.querySelector(".flip-inner");
  popup.querySelector("#flip-to-back").onclick = () => flipInner.classList.add("rotate-y-180");
  popup.querySelector("#flip-to-front").onclick = () => flipInner.classList.remove("rotate-y-180");

  popup.querySelector(".close-popup").onclick = () => {
    popupContainer.style.display = "none";
    popup.style.display = "none";
    flipInner.classList.remove("rotate-y-180");

    const menu = document.getElementById("Menu");
    if (menu) menu.style.display = "";
  };


  setLanguage(localStorage.getItem("lang") || "en");
  loadComments(postId);
  setupCommentSubmit(postId);
  loadProductIntro(postId);
}

popupContainer.addEventListener("click", e => {
  if (e.target === popupContainer) popupContainer.style.display = "none";
});

window.search = function () {
  const query = searchInput.value.toLowerCase();
  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(query) ||
    p.author?.toLowerCase().includes(query)
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

window.addEventListener("DOMContentLoaded", () => {
  fetchProducts();
});

