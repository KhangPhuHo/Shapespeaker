/**
 * Tạo slider điều khiển (click / dots / swipe)
 * @param {HTMLElement} popup - Phần tử popup chứa slider
 */
export function setupSlider(popup) {
  if (!popup) return;

  const slider = popup.querySelector("#product-slider");
  if (!slider) return;

  let slidesCount = slider.children.length;
  let currentSlide = 0;

  const dotsContainer = popup.querySelector("#slider-dots");
  if (!dotsContainer) return;
  dotsContainer.innerHTML = "";

  // --- Hàm cập nhật ---
  function updateSlider() {
    slidesCount = slider.children.length;
    slider.style.transform = `translateX(-${currentSlide * 100}%)`;
    updateDots();
  }

  function updateDots() {
    const dots = [...dotsContainer.children];
    dots.forEach((dot, idx) => {
      dot.className =
        idx === currentSlide
          ? "w-3 h-3 rounded-full bg-yellow-400"
          : "w-2 h-2 rounded-full bg-gray-400";
    });
  }

  // --- Nút điều hướng ---
  popup.querySelector("#next-slide")?.addEventListener("click", () => {
    currentSlide = (currentSlide + 1) % slidesCount;
    updateSlider();
  });

  popup.querySelector("#prev-slide")?.addEventListener("click", () => {
    currentSlide = (currentSlide - 1 + slidesCount) % slidesCount;
    updateSlider();
  });

  // --- Dots ---
  for (let i = 0; i < slidesCount; i++) {
    const dot = document.createElement("div");
    dot.className = "w-2 h-2 rounded-full bg-gray-400 cursor-pointer transition-all";
    dot.onclick = () => {
      currentSlide = i;
      updateSlider();
    };
    dotsContainer.appendChild(dot);
  }

  // --- Swipe (Touch & Mouse) ---
  let startX = 0;
  let isDragging = false;

  const startDrag = (x) => {
    startX = x;
    isDragging = true;
  };

  const endDrag = (x) => {
    if (!isDragging) return;
    const diff = x - startX;
    if (Math.abs(diff) > 50) {
      if (diff < 0) {
        // Vuốt sang trái → hình tiếp theo
        currentSlide = (currentSlide + 1) % slidesCount;
      } else {
        // Vuốt sang phải → hình trước đó
        currentSlide = (currentSlide - 1 + slidesCount) % slidesCount;
      }
      updateSlider();
    }
    isDragging = false;
  };

  // Cảm ứng (mobile)
  slider.addEventListener("touchstart", (e) => startDrag(e.touches[0].clientX));
  slider.addEventListener("touchend", (e) => endDrag(e.changedTouches[0].clientX));

  // Chuột (desktop)
  slider.addEventListener("mousedown", (e) => startDrag(e.clientX));
  slider.addEventListener("mouseup", (e) => endDrag(e.clientX));

  // Tránh chọn text khi kéo
  slider.addEventListener("dragstart", (e) => e.preventDefault());

  // --- Khởi tạo ---
  updateSlider();
}