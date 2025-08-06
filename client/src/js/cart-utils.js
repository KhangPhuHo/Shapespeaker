import { getTranslation } from './language.js';
import { showToast } from './toast.js';

export async function addToCart(product) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const existing = cart.find(item => item.id === product.id);

  const qtyToAdd = product.quantity || 1;
  const maxStock = product.stock || 0;
  const currentQty = existing ? existing.quantity : 0;
  const total = currentQty + qtyToAdd;

  if (total > maxStock) {
    const remaining = maxStock - currentQty;
    const msgKey = remaining <= 0 ? "store.out_of_stock" : "store.limit_quantity";
    const msg = await getTranslation(msgKey);

    const finalMsg = msg
      .replace("{max}", remaining)
      .replace("{name}", product.name);

    showToast(finalMsg, "warning");
    return { success: false, message: finalMsg };
  }

  if (existing) {
    existing.quantity += qtyToAdd;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      picture: product.picture,
      price: product.price,
      quantity: qtyToAdd,
      stock: product.stock
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  const msg = await getTranslation("store.added_quantity");
  const successMsg = msg
    .replace("{qty}", qtyToAdd)
    .replace("{name}", product.name);

  showToast(successMsg, "success");
  return { success: true, message: successMsg };
}
window.addToCart = addToCart;