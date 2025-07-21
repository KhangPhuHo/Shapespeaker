import { showToast } from './toast.js';

let currentCurrency = "VND";

function getCurrency() {
  return currentCurrency;
}

function getNestedTranslation(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

async function setLanguage(lang) {
  try {
    const res = await fetch(`./lang/${lang}.json`);
    if (!res.ok) throw new Error("Language file not found");

    const translations = await res.json();

    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const value = getNestedTranslation(translations, key);
      if (!value) return;

      if (el.hasAttribute("placeholder")) el.setAttribute("placeholder", value);
      if ((el.tagName === "INPUT" || el.tagName === "TEXTAREA") && el.hasAttribute("value"))
        el.value = value;
      if (!el.hasAttribute("placeholder") || ["BUTTON", "SPAN", "LABEL", "A"].includes(el.tagName))
        el.textContent = value;
    });

    localStorage.setItem("lang", lang);
    currentCurrency = lang === "en" ? "USD" : "VND";
    document.dispatchEvent(new Event("languageChanged"));
    updateCurrencyUI();
    updateLangUI(lang); // cập nhật UI
  } catch (error) {
    console.error("Error loading language file:", error.message);
    showToast("Chưa thực hiện được, vui lòng thử lại sau.", "error");
  }
}

function updateCurrencyUI() {
  if (typeof loadCart === "function") loadCart();
  if (typeof displayProducts === "function") displayProducts(products);
}

// ✅ Cập nhật UI nút đổi ngôn ngữ
function updateLangUI(lang) {
  const flagClasses = {
    en: 'fi fi-us',
    vn: 'fi fi-vn'
  };
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) {
    langBtn.innerHTML = `<span class="${flagClasses[lang]}"></span><span>${lang.toUpperCase()}</span>`;
  }
}

// ✅ Gán sự kiện đổi ngôn ngữ
function setupLangToggle() {
  const langBtn = document.getElementById('lang-toggle');
  if (!langBtn) return;

  const languages = ['en', 'vn'];
  langBtn.addEventListener('click', () => {
    const currentLang = localStorage.getItem("lang") || "en";
    const nextLang = languages[(languages.indexOf(currentLang) + 1) % languages.length];
    setLanguage(nextLang);
  });
}

// ✅ Gọi khi DOM ready
document.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("lang") || "en";
  setLanguage(savedLang);
  setupLangToggle();

  // ✅ Gán click cho ngôn ngữ nếu có flag riêng (ở language.html)
  document.getElementById("lang-en")?.addEventListener("click", () => setLanguage("en"));
  document.getElementById("lang-vn")?.addEventListener("click", () => setLanguage("vn"));
});


export { setLanguage, getCurrency };
