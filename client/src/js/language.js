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
      const value = key.split(".").reduce((acc, k) => acc?.[k], translations);

      if (!value) return;

      if (el.hasAttribute("placeholder")) {
        el.setAttribute("placeholder", value);
      }

      if ((el.tagName === "INPUT" || el.tagName === "TEXTAREA") && el.hasAttribute("value")) {
        el.value = value;
      }

      if (!el.hasAttribute("placeholder") || ["BUTTON", "SPAN", "LABEL"].includes(el.tagName)) {
        el.textContent = value;
      }
    });

    localStorage.setItem("lang", lang);
    currentCurrency = lang === "en" ? "USD" : "VND";
    updateCurrencyUI();

  } catch (error) {
    console.error("Error loading language file:", error.message);
  }
}

// Update currency formatting
function updateCurrencyUI() {
  if (typeof loadCart === "function") loadCart();
  if (typeof displayProducts === "function") displayProducts(products);
}

// Tải ngôn ngữ đã lưu từ localStorage
const savedLang = localStorage.getItem("lang") || "en";
setLanguage(savedLang);

// Gán sự kiện cho các nút chuyển ngôn ngữ

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("lang-en")?.addEventListener("click", () => setLanguage("en"));
  document.getElementById("lang-vn")?.addEventListener("click", () => setLanguage("vn"));

  const savedLang = localStorage.getItem("lang") || "en";
  setLanguage(savedLang);
});

