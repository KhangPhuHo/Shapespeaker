async function buyNow(index) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const product = cart[index];
  if (!product) return;

  const total = product.price * product.quantity;
  //const confirmBuy = confirm(`🛒 Bạn có chắc muốn mua ${product.quantity} x ${product.name} (${formatCurrency(total)}) không?`);
  const confirmMsg = await getTranslation("toast.confirm_buy");
  const confirmBuy = confirm(`${confirmMsg.replace("{name}", product.name).replace("{qty}", product.quantity).replace("{total}", formatCurrency(total))}`);

  if (!confirmBuy) return;

  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    //showToast("⚠️ Vui lòng đăng nhập để mua hàng.", "error");
    const msg = await getTranslation("toast.login_required");
    showToast(msg, "error");
    return;
  }

  try {
    // ✅ Lấy thông tin user từ Firestore
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      //showToast("❌ Không tìm thấy thông tin người dùng.", "error");
      const msg = await getTranslation("toast.missing_user");
      showToast(msg, "error");
      return;
    }

    const userData = userSnap.data();
    const { phone, address } = userData;

    if (!phone || !address) {
      //showToast("⚠️ Vui lòng cập nhật số điện thoại và địa chỉ trước khi mua hàng.", "warning");
      const msg = await getTranslation("toast.missing_contact");
      showToast(msg, "warning");
      return;
    }

    // ✅ Kiểm tra tồn kho sản phẩm
    const productRef = doc(db, "shapespeakitems", product.id);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) throw new Error(`Không tìm thấy sản phẩm ${product.name}`);

    const productData = productSnap.data();
    if (productData.stock < product.quantity) {
      //showToast(`❌ Sản phẩm "${product.name}" chỉ còn ${productData.stock}`, "error");
        const msgTemplate = await getTranslation("toast.insufficient_stock");
        const message = msgTemplate
          .replace("{name}", item.name)
          .replace("{stock}", productData.stock);
        showToast(message, "error");
      return;
    }

    // ✅ Cập nhật tồn kho
    await updateDoc(productRef, {
      stock: productData.stock - product.quantity
    });

    // ✅ Tạo đơn hàng (thêm phone và address)
    await addDoc(collection(db, "orders"), {
      uid: user.uid,
      date: serverTimestamp(),
      status: "pending",
      items: [product],
      phone,
      address
    });

    //showToast(`✅ Đã tạo đơn hàng cho "${product.name}".`, "success");
    const msgTemplate = await getTranslation("toast.order_created");
    const message = msgTemplate.replace("{name}", product.name); // ✅ đúng giá trị
    showToast(message, "success");

    // ✅ Cập nhật giỏ hàng
    cart.splice(index, 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    loadCart();
  } catch (err) {
    console.error(err);
    //showToast("❌ Lỗi khi tạo đơn hàng.", "error");
    const msg = await getTranslation("toast.order_error");
    showToast(msg, "error");
  }
}

async function checkoutAll() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  if (cart.length === 0) {
    //showToast("🛒 Giỏ hàng đang trống.", "warning");
    const msg = await getTranslation("toast.cart_empty");
    showToast(msg, "info");
    return;
  }

  const total = cart.reduce((sum, p) => sum + p.price * p.quantity, 0);
  //const confirmCheckout = confirm(`💳 Bạn có chắc muốn thanh toán ${cart.length} sản phẩm với tổng tiền ${formatCurrency(total)} không?`);
  const confirmTemplate = await getTranslation("toast.confirm_checkout");
  const confirmMsg = confirmTemplate
    .replace("{count}", cart.length)
    .replace("{total}", formatCurrency(total));

  const confirmCheckout = confirm(confirmMsg);

  if (!confirmCheckout) return;

  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    //showToast("⚠️ Vui lòng đăng nhập để thanh toán.", "error");
    const msg = await getTranslation("toast.login_required");
    showToast(msg, "warning");
    return;
  }

  try {
    // ✅ Lấy thông tin user từ Firestore
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      //showToast("❌ Không tìm thấy thông tin người dùng.", "error");
      const msg = await getTranslation("toast.missing_user");
      showToast(msg, "error");
      return;
    }

    const userData = userSnap.data();
    const { phone, address } = userData;

    if (!phone || !address) {
      //showToast("⚠️ Vui lòng cập nhật số điện thoại và địa chỉ trước khi thanh toán.", "warning");
      const msg = await getTranslation("toast.missing_contact");
      showToast(msg, "warning");
      return;
    }

    // 🔁 Check từng sản phẩm
    for (const item of cart) {
      const productRef = doc(db, "shapespeakitems", item.id);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        //showToast(`❌ Không tìm thấy sản phẩm "${item.name}"`, "error");
        const msgTemplate = await getTranslation("toast.product_not_found");
        const message = msgTemplate.replace("{name}", item.name);
        showToast(message, "error");

        return;
      }

      const productData = productSnap.data();
      if (productData.stock < item.quantity) {
        //showToast(`⚠️ Sản phẩm "${item.name}" chỉ còn ${productData.stock} trong kho.`, "error");
        const msgTemplate = await getTranslation("toast.insufficient_stock");
        const message = msgTemplate
          .replace("{name}", item.name)
          .replace("{stock}", productData.stock);
        showToast(message, "error");

        return;
      }

      // ✏️ Trừ stock
      await updateDoc(productRef, {
        stock: productData.stock - item.quantity
      });
    }

    // ✅ Tạo đơn hàng (thêm phone và address)
    await addDoc(collection(db, "orders"), {
      uid: user.uid,
      date: serverTimestamp(),
      status: "pending",
      items: cart,
      phone,
      address
    });

    //showToast(`✅ Đã tạo đơn hàng với ${cart.length} sản phẩm.`, "success");
    const msgTemplate = await getTranslation("toast.order_created_all");
    const message = msgTemplate.replace("{count}", cart.length);
    showToast(message, "success");

    localStorage.removeItem("cart");
    loadCart();
  } catch (err) {
    console.error(err);
    //showToast("❌ Lỗi khi tạo đơn hàng.", "error");
    const msg = await getTranslation("toast.order_error");
    showToast(msg, "error");
  }
}













function renderGiftInfo(giftDoc) {
      const g = giftDoc.data();
      const id = giftDoc.id;
      const total = (g.items || []).reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0);
      const itemsHtml = (g.items || []).map(it => `
        <div class="flex items-center gap-3 mb-2">
          <img src="${it.picture || './src/img/shapespeakicon.jpg'}" class="w-12 h-12 rounded object-cover" />
          <div class="text-sm">
            <div class="text-yellow-400 font-semibold">${it.name}</div>
            <div class="text-gray-300">x${it.quantity} • ${formatCurrency(it.price)}</div>
          </div>
        </div>
      `).join("");

      result.innerHTML = `
        <div class="bg-gray-800 p-4 rounded">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-gray-400 text-sm">Mã</p>
              <div class="code-box text-2xl font-bold">${g.code}</div>
              <p class="text-xs text-gray-400 mt-1">${g.orderId ? `Đơn hàng: ${g.orderId}` : ""}</p>
            </div>
            <div class="text-right">
              <div class="${g.used ? 'used-badge px-3 py-1 rounded-full' : 'unused-badge px-3 py-1 rounded-full'}">${g.used ? 'Đã dùng' : 'Chưa dùng'}</div>
            </div>
          </div>

          <div class="mt-4 border-t border-gray-700 pt-3">
            ${itemsHtml}
            <div class="mt-2 flex justify-between items-center">
              <div class="text-gray-300">Tổng</div>
              <div class="text-white font-semibold">${formatCurrency(total)}</div>
            </div>
          </div>

          <div class="mt-4 flex gap-2">
            ${g.used ? '<button class="bg-gray-600 px-3 py-2 rounded text-sm cursor-not-allowed" disabled>Đã dùng</button>' : `<button id="useBtn" class="bg-amber-500 px-4 py-2 rounded text-black font-semibold">Dùng mã</button>`}
            <button id="backBtn" class="bg-gray-700 px-4 py-2 rounded text-sm">Nhập mã khác</button>
          </div>
        </div>
      `;

      document.getElementById("backBtn").addEventListener("click", () => {
        result.innerHTML = "";
        codeInput.focus();
      });

      const useBtn = document.getElementById("useBtn");
      if (useBtn) {
        useBtn.addEventListener("click", async () => {
          // double-check permission and used status before setting used
          if (!currentUser) {
            showToast("Bạn cần đăng nhập để dùng mã.", "warning");
            return;
          }
          if (g.uid !== currentUser.uid) {
            showToast("Mã này không thuộc về tài khoản của bạn.", "error");
            return;
          }
          if (g.used) {
            showToast("Mã đã được sử dụng trước đó.", "info");
            return;
          }

          if (!confirm("Xác nhận dùng mã này? Hành động sẽ đánh dấu mã là đã sử dụng.")) return;

          try {
            await updateDoc(doc(db, "giftcodes", id), { used: true });
            showToast("Đã đổi mã thành công.", "success");
            // refresh view: mark used
            const updated = await findGiftcodeByCode(g.code);
            if (!updated.empty) renderGiftInfo(updated.docs[0]);
          } catch (err) {
            console.error(err);
            showToast("Lỗi khi đổi mã. Vui lòng thử lại.", "error");
          }
        });
      }
    }


    window.updateStatus = async function (orderId) {
            const select = document.getElementById(`status-${orderId}`);
            if (!select) return;
            try {
                await updateDoc(doc(db, "orders", orderId), {
                    status: select.value,
                });
                showToast("✅ Đã cập nhật trạng thái", "success");
                fetchData();
            } catch (e) {
                console.error(e);
                showToast("❌ Lỗi khi cập nhật trạng thái", "error");
            }
        };

    // **Gọi helper tạo giftcode** (không chặn nếu helper redirect)
    // Nếu muốn không redirect ngay từ helper, truyền { redirect: false } và tự xử lý redirect ở đây
    await createAndSaveGiftCode(user.uid, orderRef.id, [product], {
      redirect: true,
      redirectPath: './giftcode.html'
    });

    // Gọi helper để tạo giftcode cho toàn order
    await createAndSaveGiftCode(user.uid, orderRef.id, cart, {
      redirect: true,
      redirectPath: './giftcode.html'
    });











     /**
  * Cập nhật trạng thái đơn hàng trong Firestore và kích hoạt gửi FCM Notification 
  * nếu trạng thái chuyển sang 'delivered'.
  * @param {string} orderId - ID của đơn hàng cần cập nhật.
  */
        window.updateStatus = async function (orderId) {
            const select = document.getElementById(`status-${orderId}`);
            if (!select) return;
            const newStatus = select.value;
            const orderRef = doc(db, "orders", orderId);

            try {
                // Lấy snapshot cũ (để có userId, items,...)
                const orderSnapBefore = await getDoc(orderRef);
                if (!orderSnapBefore.exists()) {
                    showToast("❌ Đơn hàng không tồn tại", "error");
                    return;
                }
                const orderDataBefore = orderSnapBefore.data();
                const userId = orderDataBefore.uid; // Lấy userId của người đặt hàng

                // 1. Cập nhật trạng thái trong Firestore
                await updateDoc(orderRef, {
                    status: newStatus,
                });
                showToast("✅ Đã cập nhật trạng thái", "success");

                // 2. Xử lý khi trạng thái chuyển sang 'delivered'
                if (newStatus === "delivered") {
                    try {
                        // a. Kiểm tra/Tạo Giftcode (Logic hiện tại của bạn)
                        const gcQuery = query(collection(db, "giftcodes"), where("orderId", "==", orderId));
                        const gcSnap = await getDocs(gcQuery);

                        if (!gcSnap.empty) {
                            showToast("🔔 Giftcode đã được tạo trước đó cho đơn này", "info");
                        } else {
                            // Gọi helper tạo và lưu giftcode — KHÔNG redirect (redirect:false)
                            const items = orderDataBefore.items || [];
                            await createAndSaveGiftCode(userId, orderId, items, { redirect: false });
                            showToast("🎁 Giftcode đã được tạo cho đơn hàng này", "success");
                        }

                        // b. 🚀 BƯỚC MỚI: Gửi thông báo FCM bằng cách gọi API backend
                        const notificationPayload = {
                            userId: userId,
                            orderId: orderId,
                            // Backend API /notifications/completeOrder sẽ tự động 
                            // tìm Token và tạo/gửi Giftcode trong message payload.
                        };

                        const API_URL = '/notifications/completeOrder';
                        const notificationRes = await fetch(API_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(notificationPayload)
                        });

                        if (notificationRes.ok) {
                            showToast("🔔 Đã kích hoạt gửi thông báo FCM đến người dùng.", "info");
                        } else {
                            const errorData = await notificationRes.json();
                            showToast(`⚠️ Lỗi API FCM: ${errorData.message || 'Lỗi không xác định'}`, "warning");
                        }
                    } catch (errGc) {
                        console.error("Lỗi khi tạo giftcode hoặc gọi API FCM:", errGc);
                        showToast("❌ Lỗi xử lý sau khi giao hàng (xem console)", "error");
                    }
                }

                // 3. Làm mới dữ liệu giao diện
                fetchData();
            } catch (e) {
                console.error(e);
                showToast("❌ Lỗi khi cập nhật trạng thái", "error");
            }
        };

        //const admin = require("firebase-admin");

        async function enableFCM() {
    if (!currentUser) {
        setStatus("⚠️ Bạn cần đăng nhập trước khi bật thông báo.", "error");
        toggleEl.checked = false;
        return;
    }

    if (!("Notification" in window)) {
        setStatus("⚠️ Trình duyệt không hỗ trợ thông báo.", "error");
        toggleEl.checked = false;
        return;
    }

    setStatus("⏳ Yêu cầu quyền nhận thông báo...");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        setStatus("❌ Bạn đã từ chối quyền thông báo.", "error");
        toggleEl.checked = false;
        return;
    }

    setStatus("⏳ Lấy VAPID key từ server...");
    const VAPID_KEY = await getVapidKeyFromServer();
    if (!VAPID_KEY) {
        setStatus("❌ Không lấy được VAPID key", "error");
        toggleEl.checked = false;
        return;
    }

    setStatus("⏳ Lấy token FCM...");
    const messaging = getMessaging();

    try {
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (!token) throw new Error("Không lấy được token");

        const res = await fetch(`${SERVER_URL}/api/saveFCMToken`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                userId: currentUser.uid, 
                fcmToken: token, 
                platform: "web" 
            })
        });

        if (res.ok) {
            currentToken = token;
            tokenEl.textContent = token;
            setStatus("🎉 Thiết bị đã đăng ký nhận thông báo thành công!", "success");
        } else {
            const errData = await res.json();
            setStatus(`⚠️ Lỗi server: ${errData.message}`, "error");
            toggleEl.checked = false;
        }
    } catch (err) {
        console.error(err);
        setStatus("❌ Lỗi khi lấy hoặc gửi token FCM", "error");
        toggleEl.checked = false;
    }
}