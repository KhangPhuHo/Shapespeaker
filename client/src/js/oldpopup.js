async function showPopup(product) {
  const imageSrc = product.picture?.trim() || "./src/img/shapespeakicon.jpg";
  const postId = product.id || product.postId;

  if (product.stock <= 0) {
    const buyBtn = popup.querySelector('[data-i18n="cart.buy"]');
    const cartBtn = popup.querySelector('[data-i18n="store.add_to_cart"]');
    buyBtn.disabled = true;
    cartBtn.disabled = true;

    buyBtn.classList.add("opacity-50", "cursor-not-allowed");
    cartBtn.classList.add("opacity-50", "cursor-not-allowed");

    buyBtn.innerText = "Hết hàng";
    cartBtn.innerText = "Hết hàng";
  }

  // Tạo thẻ chứa flip-card bên trong popup
  popup.innerHTML = `
    <div class="flip-card w-full max-w-2xl h-[700px] sm:h-[90vh] mx-auto relative">
  <div class="flip-inner relative w-full h-full transition-transform duration-700">

    <!-- MẶT TRƯỚC -->
    <div class="face front absolute inset-0 w-full h-full bg-[#1e1e20] text-white p-6 rounded-2xl shadow-2xl overflow-y-auto scroll-smooth">
      <button class="close-popup absolute top-2 right-3 text-red-400 hover:text-white text-xl z-10">
        <i class="fa-solid fa-circle-xmark"></i>
      </button>
      
      <!-- Slider ảnh sản phẩm -->
<div class="relative w-full h-80 overflow-hidden rounded-lg border border-[#2e2e33]">
  <div class="flex transition-transform duration-500 ease-in-out" id="product-slider">
    ${[
      `<div class='w-full flex-shrink-0'><img src='${imageSrc}' class='w-full h-80 object-cover rounded-lg' /></div>`,
      ...(product.media || [])
        .map(m => {
          if (m.type === "video") {
            return `<div class='w-full flex-shrink-0'>
                      <video src='${m.url}' class='w-full h-80 object-cover rounded-lg' controls muted></video>
                    </div>`;
          } else {
            return `<div class='w-full flex-shrink-0'>
                      <img src='${m.url}' class='w-full h-80 object-cover rounded-lg' />
                    </div>`;
          }
        })
    ].join("")}
  </div>

  <!-- Nút điều hướng trái/phải -->
  <button id="prev-slide" class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center">
    <i class="fa-solid fa-chevron-left"></i>
  </button>
  <button id="next-slide" class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center">
    <i class="fa-solid fa-chevron-right"></i>
  </button>
</div>
      <!-- Kết thúc slider -->

      <div id="slider-dots" class="flex justify-center mt-2 space-x-2">
</div>


      <h3 class="text-2xl font-bold text-yellow-400 text-center mt-3">${product.name}</h3>
      <p class="text-sm text-gray-300 text-center whitespace-pre-line mt-2">${product.details || ""}</p>
      <div id="rating-summary" class="mt-2"></div>

      <div class="flex justify-around items-center text-sm mb-4 mt-3 space-x-24">
        <div class="text-center">
          <p class="text-gray-400" data-i18n="store.price">Price</p>
          <p class="text-base text-yellow-300 font-semibold">${formatCurrency(product.price)}</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400" data-i18n="store.stock">Stock</p>
          <p class="text-base text-emerald-400 font-semibold">${product.stock}</p>
        </div>
      </div>

      <div class="flex flex-col gap-3 mt-4 w-full">
        <button onclick='showBuyNowPopup(${JSON.stringify(product)})' class="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-full transition" data-i18n="cart.buy">Mua ngay</button>
        <button onclick='addToCart(${JSON.stringify(product)})' class="w-full bg-[#f9c5d1] hover:bg-[#f7a6bb] text-black font-semibold py-2 px-4 rounded-full transition" data-i18n="store.add_to_cart">Thêm vào giỏ hàng</button>
        <button id="flip-to-back" class="w-full bg-[#2e2e33] hover:bg-gray-600 text-white py-2 px-4 rounded-full transition" data-i18n="store.information">Thông tin chi tiết</button>
      </div>

      <!-- Bình luận -->
      <div class="w-full max-w-md mt-4 bg-white/5 rounded-xl p-2 text-white flex flex-col h-[550px]">
        <div id="admin-pinned-wrapper" data-visible="true" class="relative mb-2">
          <button id="pinned-toggle-btn" onclick="togglePinned()" title="Ẩn/Hiện ghim" class="absolute top-0 right-0 z-10 bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-indigo-600 transition text-xs">
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

            <textarea id="comment-input" rows="1" placeholder="Write a message..." class="flex-1 resize-none bg-transparent text-white text-sm placeholder-gray-300 focus:outline-none"></textarea>

            <button type="button" id="emoji-toggle" class="text-yellow-400 text-xl hover:text-yellow-500">😊</button>
            <button type="submit" id="submit-comment" class="text-[#85d7ff] hover:text-blue-600 text-xl">
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
    </div>

    <!-- MẶT SAU -->
    <div class="face back absolute inset-0 w-full h-full bg-[#1e1e20] text-white p-6 rounded-2xl shadow-2xl overflow-y-auto scroll-smooth">
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

  // Sau khi popup đã render xong nội dung HTML
  setupSlider(popup);

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

  if (product.stock <= 0) {
    const buyBtn = popup.querySelector('[data-i18n="cart.buy"]');
    const cartBtn = popup.querySelector('[data-i18n="store.add_to_cart"]');
    if (buyBtn) {
      buyBtn.disabled = true;
      buyBtn.classList.add("opacity-50", "cursor-not-allowed");
      buyBtn.innerText = "Hết hàng";
    }
    if (cartBtn) {
      cartBtn.disabled = true;
      cartBtn.classList.add("opacity-50", "cursor-not-allowed");
      cartBtn.innerText = "Hết hàng";
    }
  }

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
            <div class="relative w-full h-80 lg:h-[80vh] overflow-hidden rounded-lg border border-[#2e2e33]">
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

          <!-- CỘT PHẢI: Thông tin + Bình luận -->
          <div class="desktop-right">
  <div>
    <!-- Tên sản phẩm -->
    <h3 class="text-2xl font-bold text-yellow-400 text-center">${product.name}</h3>

    <!-- Chi tiết sản phẩm -->
    <div class="product-details mt-3">
      <p class="text-sm text-gray-300 text-center whitespace-pre-line">${product.details || ""}</p>
      <div id="rating-summary" class="mt-2"></div>
    </div>

    <!-- Giá và tồn kho -->
    <div class="info-row text-sm mb-4 mt-3">
      <div class="text-center">
        <p class="text-gray-400" data-i18n="store.price">Price</p>
        <p class="text-base text-yellow-300 font-semibold">${formatCurrency(product.price)}</p>
      </div>
      <div class="text-center">
        <p class="text-gray-400" data-i18n="store.stock">Stock</p>
        <p class="text-base text-emerald-400 font-semibold">${product.stock}</p>
      </div>
    </div>

    <!-- Các nút -->
    <div class="action-buttons mt-4 w-full">
      <button onclick='showBuyNowPopup(${JSON.stringify(product)})' class="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-full transition" data-i18n="cart.buy">Mua ngay</button>
      <button onclick='addToCart(${JSON.stringify(product)})' class="w-full bg-[#f9c5d1] hover:bg-[#f7a6bb] text-black font-semibold py-2 px-4 rounded-full transition" data-i18n="store.add_to_cart">Thêm vào giỏ hàng</button>
      <button id="flip-to-back" class="w-full bg-[#2e2e33] hover:bg-gray-600 text-white py-2 px-4 rounded-full transition" data-i18n="store.information">Thông tin chi tiết</button>
    </div>
  </div>
</div>
        </div>

        <!-- Bình luận -->
            <div class="comments-section w-full bg-white/5 rounded-xl p-2 text-white flex flex-col h-[400px] mt-4">
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
                  <textarea id="comment-input" rows="1" placeholder="Write a message..." class="flex-1 resize-none bg-transparent text-white text-sm placeholder-gray-300 focus:outline-none"></textarea>
                  <button type="button" id="emoji-toggle" class="text-yellow-400 text-xl hover:text-yellow-500">😊</button>
                  <button type="submit" id="submit-comment" class="text-[#85d7ff] hover:text-blue-600 text-xl">
                    <i class="fa-solid fa-paper-plane"></i>
                  </button>
                </div>
              </form>
            </div>
            
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
  loadRatingUI(postId);
  loadProductIntro(postId);
}

