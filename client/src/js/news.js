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
    productEl.classList.add("new"); // Bạn vẫn có thể dùng class này để giữ logic cũ nếu có
    productEl.className = `
  flex-shrink-0 bg-gray-800 text-white rounded-xl shadow-lg overflow-hidden 
  hover:shadow-2xl transition duration-300 p-3 
  w-[48%] sm:w-[45%] md:w-[30%] lg:w-[22%] xl:w-[18%]
`;


    const imageSrc = product.picture && product.picture.trim() !== ""
      ? product.picture
      : "./src/img/cauculator icon.png";

    const formatDate = (timestamp) => {
      if (timestamp?.toDate) {
        const date = timestamp.toDate();
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
      return "";
    };

    const createdAtFormatted = formatDate(product.createdAt);
    const updatedAtFormatted = formatDate(product.updatedAt);

    productEl.innerHTML = `
  <img src="${imageSrc}" alt="${product.name || 'product'}"
    class="w-full h-40 object-cover rounded-lg border border-gray-700 mb-3" loading="lazy" />
  <div class="p-3 space-y-1">
    <h3 class="text-base font-semibold text-yellow-400 truncate">${product.name || 'No name'}</h3>
    
    <p class="text-xs sm:text-sm md:text-sm lg:text-xs text-gray-300 flex flex-wrap gap-x-2 justify-center">
    <span><span data-i18n="news.created">Created:</span> ${createdAtFormatted}</span>
    <span><span data-i18n="news.updated">Updated:</span> ${updatedAtFormatted || 'Not updated'}</span>
    </p>

  </div>
`;

    const lang = localStorage.getItem("lang") || "en";
    setLanguage(lang);

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
    <div class="flex flex-col items-center gap-5">
    
      <button class="close-popup absolute top-2 right-2 text-red-400 hover:text-white text-xl">
        <i class="fa-solid fa-circle-xmark"></i>
      </button>
      <br>
      <img src="${imageSrc}" alt="${product.name || 'product'}" loading="lazy"
           class="w-full h-60 object-cover rounded-lg border border-gray-600" />
      <h3 class="text-2xl font-bold text-yellow-400 text-center">${product.name}</h3>
      <p class="text-sm text-gray-300 text-center whitespace-pre-line">${product.details || ""}</p>
      <div class="text-center">
        <p class="text-gray-400 text-sm"data-i18n="news.author">Author:</p>
        <p class="text-lg font-semibold text-indigo-300"> ${product.author || "Don't have author"}</p>
      </div>
      <a href="${product.link}" target="_blank">
        <button class="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-full font-semibold transition" data-i18n="news.information">
          More information
        </button>
      </a>
    </div>
  `;

  // Hiện popup
  popupContainer.style.display = "flex";

  const lang = localStorage.getItem("lang") || "en";
  setLanguage(lang);

  // Bắt sự kiện tắt
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
