import { setLanguage, getCurrency } from './language.js';
import { showToast } from './toast.js';

const cartList = document.getElementById("CartList");
const cartSummary = document.getElementById("CartSummary");
const totalAmount = document.getElementById("TotalAmount");

const exchangeRate = 24000;

function formatCurrency(amount) {
  const currentCurrency = getCurrency();
  return currentCurrency === "USD"
    ? `$${(amount / exchangeRate).toFixed(2)}`
    : amount.toLocaleString("vi-VN") + " VND";
}

function loadCart() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  cartList.innerHTML = "";
  let total = 0;

  if (cart.length === 0) {
    cartList.innerHTML = `
      <div class="bg-gray-800 text-center text-gray-300 p-6 rounded-lg shadow-md">
        <span data-i18n="cart.empty">Chưa có sản phẩm nào trong giỏ hàng.</span>
      </div>
    `;
    cartSummary.classList.add("hidden");
    applyTranslation(); // 🔁 dịch sau khi render
    return;
  }

  cart.forEach((product, index) => {
    const imageSrc = product.picture?.trim() || "./src/img/shapespeakicon.jpg";
    const maxStock = typeof product.stock === "number" ? product.stock : 1;
    total += product.price * product.quantity;

    const itemEl = document.createElement("div");
    itemEl.className = "flex flex-col sm:flex-row sm:items-center gap-4 bg-gray-800 p-4 rounded-lg shadow-md";

    itemEl.innerHTML = `
      <div class="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <img src="${imageSrc}" alt="${product.name}" class="w-20 h-20 object-cover rounded-md flex-shrink-0" />
        <div class="flex-grow max-w-[250px] sm:max-w-none break-words">
          <h3 class="text-yellow-400 font-semibold text-lg break-words max-w-full sm:max-w-[135px]">
            ${product.name}
          </h3>
          <p class="text-sm text-gray-300"><span data-i18n="cart.price">Price:</span> ${formatCurrency(product.price)}</p>
          <p class="text-sm text-gray-400"><span data-i18n="cart.stock">Stock:</span> ${maxStock}</p>
        </div>
      </div>

      <div class="flex flex-wrap justify-center sm:justify-start items-center gap-1 mt-4 text-sm">
        <button onclick="setMin(${index})" class="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs">⬅ Min</button>
        <button onclick="changeQuantity(${index}, -10)" class="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs">-10</button>
        <button onclick="changeQuantity(${index}, -1)" class="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded">-</button>
        <span class="px-2 text-white">${product.quantity}</span>
        <button onclick="changeQuantity(${index}, 1)" class="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded">+</button>
        <button onclick="changeQuantity(${index}, 10)" class="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs">+10</button>
        <button onclick="setMax(${index})" class="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs">Max ➡</button>
      </div>

      <div class="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0 sm:ml-auto w-full sm:w-auto justify-center sm:justify-end">
        <button onclick="buyNow(${index})" class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md w-full sm:w-auto" data-i18n="cart.buy">Buy</button>
        <button onclick="removeFromCart(${index})" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md w-full sm:w-auto" data-i18n="cart.delete">Delete</button>
      </div>
    `;

    cartList.appendChild(itemEl);
  });

  totalAmount.textContent = formatCurrency(total);
  cartSummary.classList.remove("hidden");

  applyTranslation(); // ✅ Dịch các phần tử mới render
}

function applyTranslation() {
  const lang = localStorage.getItem("lang") || "en";
  fetch(`./lang/${lang}.json`)
    .then(res => res.json())
    .then(translations => {
      document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        const value = key.split(".").reduce((acc, k) => acc?.[k], translations);
        if (!value) return;

        if (el.hasAttribute("placeholder")) el.setAttribute("placeholder", value);
        if ((el.tagName === "INPUT" || el.tagName === "TEXTAREA") && el.hasAttribute("value"))
          el.value = value;
        if (!el.hasAttribute("placeholder") || ["BUTTON", "SPAN", "LABEL", "A"].includes(el.tagName))
          el.textContent = value;
      });
    })
    .catch(err => console.error("Translate error:", err));
}

function removeFromCart(index) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  loadCart();
}

function changeQuantity(index, delta) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const item = cart[index];
  const maxStock = typeof item.stock === "number" ? item.stock : 1;

  if (!item) return;

  // ✅ Nếu tăng thì giới hạn không vượt quá maxStock
  if (delta > 0) {
    const maxCanAdd = maxStock - item.quantity;
    if (maxCanAdd <= 0) {
      showToast(`Sản phẩm "${item.name}" chỉ còn ${maxStock} trong kho.`, "error");
      return;
    }
    delta = Math.min(delta, maxCanAdd);
  }

  item.quantity += delta;

  // Nếu giảm về 0 thì xóa khỏi giỏ hàng
  if (item.quantity <= 0) {
    cart.splice(index, 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    loadCart();
    return;
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  const itemEls = cartList.querySelectorAll(".flex.flex-col");
  const thisItem = itemEls[index];
  if (thisItem) {
    const qtySpan = thisItem.querySelector("span.px-2");
    if (qtySpan) qtySpan.textContent = item.quantity;
  }

  const total = cart.reduce((sum, p) => sum + p.price * p.quantity, 0);
  totalAmount.textContent = formatCurrency(total);
}


function buyNow(index) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const product = cart[index];
  const total = product.price * product.quantity;
  showToast(`Bạn đã chọn mua ${product.quantity} x ${product.name} (${formatCurrency(total)}).\n(Tính năng thanh toán sẽ được cập nhật sau.)`, "info");
}

function checkoutAll() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const total = cart.reduce((sum, p) => sum + p.price * p.quantity, 0);
  showToast(`Bạn sẽ thanh toán tổng cộng ${formatCurrency(total)} cho ${cart.length} sản phẩm.`, "info");
}

function setMin(index) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart[index].quantity = 1;
  localStorage.setItem("cart", JSON.stringify(cart));
  loadCart();
}

function setMax(index) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const maxStock = typeof cart[index].stock === "number" ? cart[index].stock : 1;
  cart[index].quantity = maxStock;
  localStorage.setItem("cart", JSON.stringify(cart));
  loadCart();
}

window.onload = loadCart;
document.addEventListener("languageChanged", loadCart);

window.buyNow = buyNow;
window.checkoutAll = checkoutAll;
window.removeFromCart = removeFromCart;
window.changeQuantity = changeQuantity;
window.setMin = setMin;
window.setMax = setMax;
