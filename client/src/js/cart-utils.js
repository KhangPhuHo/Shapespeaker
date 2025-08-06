export function addToCart(product) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const existing = cart.find(item => item.id === product.id);
  const qtyToAdd = product.quantity || 1;
  const maxStock = product.stock || 0;
  const currentQty = existing ? existing.quantity : 0;
  const total = currentQty + qtyToAdd;

  if (total > maxStock) {
    const remaining = maxStock - currentQty;
    if (remaining <= 0) {
      return { success: false, message: `❌ ${product.name} đã hết hàng.` };
    } else {
      return {
        success: false,
        message: `❌ Bạn chỉ có thể mua thêm tối đa ${remaining} cái "${product.name}".`
      };
    }
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

  return {
    success: true,
    message: `✅ Đã thêm ${qtyToAdd} cái **${product.name}** vào giỏ.`
  };
}