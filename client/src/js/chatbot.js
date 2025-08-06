import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { showToast } from './toast.js';

let currentUserId = null;
let currentUserUid = null;
let currentUserRole = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserUid = user.uid;
    try {
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        const userData = docSnap.data();
        currentUserId = userData.id;
        currentUserRole = userData.role;
      }
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu người dùng:", error);
      showToast("Lỗi xác thực người dùng.", "error");
    }
  }
});

let chatbotBox, popupNotification, popupTimeout;
let isTTSEnabled = true; // Trạng thái bật TTS mặc định

const accessToken = 'VFDGRWWK4PW7ITLLUJZJBEX7VMKKPQNN'; // Thay token thật vào đây

document.addEventListener("DOMContentLoaded", () => {
  createSummonButton();
  createChatbot();
});

function createSummonButton() {
  const bot = document.getElementById("bot");
  bot.innerHTML = `
        <div id="summon" title="Mở chatbot">
          <img src="https://cdn-icons-png.flaticon.com/512/4712/4712027.png" alt="Chatbot" />
        </div>
      `;
  document.getElementById('summon').onclick = toggleChatbot;
}


function createChatbot() {
  chatbotBox = document.createElement('div');
  chatbotBox.id = 'chatbot';
  chatbotBox.innerHTML = `
    <div id="chat-header">
      Chatbot
      <button class="close-popup" id="close-btn" title="Đóng">&times;</button>
    </div>
    <div id="chat-body"></div>
    <div id="chat-input">
      <input type="text" id="user-input" placeholder="Nhập câu hỏi..." autocomplete="off" />
      <button id="ctr-bot-speech" title="Bật/Tắt giọng nói">
        <i class="fa fa-volume-up" aria-hidden="true"></i>
      </button>
      <button id="send-btn">Gửi</button>
    </div>
  `;
  document.body.appendChild(chatbotBox);

  document.getElementById('close-btn').onclick = toggleChatbot;
  document.getElementById('send-btn').onclick = sendMessage;

  // Bật/tắt TTS khi click vào nút ctr-bot-speech
  document.getElementById('ctr-bot-speech').onclick = () => {
    isTTSEnabled = !isTTSEnabled;
    document.getElementById('ctr-bot-speech').innerHTML = isTTSEnabled
      ? '<i class="fa fa-volume-up" aria-hidden="true"></i>'
      : '<i class="fa fa-volume-off" aria-hidden="true"></i>';
  };

  // Gửi tin nhắn khi nhấn Enter
  document.getElementById('user-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
}

function toggleChatbot() {
  if (chatbotBox.classList.contains('show')) {
    chatbotBox.classList.remove('show');
    setTimeout(() => {
      chatbotBox.style.display = 'none';
      showPopupLastMessage();
    }, 300);
  } else {
    chatbotBox.style.display = 'flex';
    setTimeout(() => chatbotBox.classList.add('show'), 10);
    hidePopup();
    document.getElementById('user-input').focus();
  }
}

//API gọi FPTAI
async function speakFPT(text) {
  const apiKey = '2gwFyWnUk3EJnr7siR7wOyGDmrOAt3co';
  const url = 'https://api.fpt.ai/hmi/tts/v5';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text,
    }),
  });

  if (!response.ok) {
    throw new Error('Lỗi khi gọi API TTS: ' + response.status);
  }

  const data = await response.json();
  console.log('FPT TTS response:', data);

  if (data.error !== 0) {
    throw new Error('API trả về lỗi: ' + data.message);
  }

  if (data.async) {
    // URL file audio async
    const audioUrl = data.async;
    // Đợi 3 giây rồi phát audio
    await new Promise(resolve => setTimeout(resolve, 1000));
    const audio = new Audio(audioUrl);
    await audio.play();
  } else if (data.data) {
    // Nếu có base64 trả thẳng
    const audioSrc = 'data:audio/mp3;base64,' + data.data;
    const audio = new Audio(audioSrc);
    await audio.play();
  } else {
    throw new Error('Không có dữ liệu âm thanh trả về');
  }
}

function addMessage(sender, message, side) {
  const chatBody = document.getElementById('chat-body');
  const msg = document.createElement('div');
  msg.className = `message ${side}`;
  if (side === 'left') {
    msg.innerHTML = `
      <img src="https://cdn-icons-png.flaticon.com/512/4712/4712027.png" alt="Bot" style="width:30px; height:30px; border-radius:50%; vertical-align:middle; margin-right:8px;">
      <strong>${sender}:</strong> ${message}
    `;
  } else {
    msg.innerHTML = `<strong>${sender}:</strong> ${message}`;
  }
  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
}

async function processInput(text) {
  if (text.startsWith("/cmd")) {
    return await handleCommand(text);
  } else {
    return await getWitResponse(text);
  }
}

const SUPER_ADMIN_UID = "J1RINivGZFgXKTWfGRe4ITU3BGz2";

// ⚙️ Cập nhật session local khi đổi quyền
function updateLocalSessionForRoleChange({ isAdmin }) {
  const session = JSON.parse(localStorage.getItem("session"));
  if (session) {
    if (isAdmin) {
      delete session.expired_at;
      session.isAdmin = true;
    } else {
      session.expired_at = Date.now() + 2 * 60 * 60 * 1000;
      session.isAdmin = false;
    }
    localStorage.setItem("session", JSON.stringify(session));
  }
}

async function handleCommand(input) {
  if (currentUserId !== 1 || currentUserRole !== "admin") {
    return "❗ Bạn không có quyền thực hiện lệnh này.";
  }

  const parts = input.trim().split(" ");
  if (parts.length < 2) {
    return "⚠ Lệnh không hợp lệ. Ví dụ:\n- /cmd index.html\n- /cmd user {uid} admin\n- /cmd remove {uid} admin";
  }

  const command = parts[1];

  // 🔁 Chuyển trang
  if (command.endsWith(".html")) {
    setTimeout(() => { window.location.href = command; }, 2000);
    return `🔄 Đang chuyển đến ${command}...`;
  }

  // ✅ Cấp quyền admin
  if (command === "user" && parts.length >= 4 && parts[3] === "admin") {
    const targetUserId = parts[2];

    try {
      await setDoc(doc(db, "users", targetUserId), {
        role: "admin",
        id: 1
      }, { merge: true });

      if (targetUserId === auth.currentUser.uid) {
        updateLocalSessionForRoleChange({ isAdmin: true });
      }

      return `✅ Đã cấp quyền admin cho user ${targetUserId}`;
    } catch (error) {
      console.error("❌ Lỗi khi cấp quyền admin:", error);
      return "❌ Lỗi khi cấp quyền admin.";
    }
  }

  // 🔒 Gỡ quyền admin
  if (command === "remove" && parts.length >= 4 && parts[3] === "admin") {
    const targetUserId = parts[2];

    if (targetUserId === SUPER_ADMIN_UID) {
      return "❗ Không thể gỡ quyền ADMIN GỐC.";
    }

    try {
      await firebase.firestore().collection("users").doc(targetUserId).set({
        role: "customer",
        id: 2
      }, { merge: true });

      if (targetUserId === firebase.auth().currentUser.uid) {
        updateLocalSessionForRoleChange({ isAdmin: false });
      }

      return `✅ Đã gỡ quyền admin khỏi user ${targetUserId}`;
    } catch (error) {
      console.error("❌ Lỗi khi gỡ quyền admin:", error);
      return "❌ Lỗi khi gỡ quyền admin.";
    }
  }

  // 🚫 Ban (xoá) người dùng
  if (command === "user" && parts.length >= 4 && parts[3] === "ban") {
    console.log("Lệnh ban được kích hoạt");

    const targetUserId = parts[2];

    if (!currentUserUid) {
      return "❗ Không xác định được UID người dùng hiện tại.";
    }

    if (currentUserUid !== SUPER_ADMIN_UID) {
      return "❌ Bạn không có quyền dùng lệnh này.";
    }

    if (targetUserId === SUPER_ADMIN_UID) {
      return "❌ Không thể xoá người dùng đặc biệt này.";
    }

    try {
      const response = await fetch('https://shapespeaker.onrender.com/deleteUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterUid: currentUserUid,
          targetUid: targetUserId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return "❌ " + (data.error || "Lỗi không xác định.");
      }

      return data.message || "✅ Đã xoá người dùng.";
    } catch (error) {
      console.error(error);
      return "❌ Lỗi không xác định khi gọi API.";
    }
  }

  return "⚠ Lệnh không hợp lệ hoặc chưa hỗ trợ.";
}

// 🧠 Bộ nhớ context đơn giản tại client
let conversationContext = {
  lastIntent: null,
  lastProduct: null,
  lastQuantity: null,
};

// 👉 Tách hàm ra để dễ dùng lại
function extractEntities(entities) {
  return {
    product: entities['product:product']?.[0]?.value || null,
    quantity: entities['wit$number:number']?.[0]?.value || null,
    category: entities['category:category']?.[0]?.value || null,
  };
}

async function getWitResponse(input) {
  try {
    const res = await fetch("https://shapespeaker.onrender.com/wit/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input }),
    });
    const data = await res.json();

    if (data.warning) {
      console.warn("🤖 BOT CẢNH BÁO:", data.warning);
      // Có thể hiển thị alert nhẹ cho người dùng
    }

    const intent = data.intent || 'none';  // ✅ an toàn và đúng hơn

    const entities = data.entities || {};
    const { product, quantity, category } = extractEntities(entities);

    // ✅ Cập nhật context nếu có dữ liệu mới
    if (product) conversationContext.lastProduct = product;
    if (quantity) conversationContext.lastQuantity = quantity;
    conversationContext.lastIntent = intent;

    switch (intent) {
      case 'greeting':
        return 'Xin chào! Tôi có thể giúp gì cho bạn?';

      case 'ask_product': {
        try {
          const res = await fetch("https://shapespeaker.onrender.com/wit/get-product-info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input }),
          });

          const text = await res.text();
          console.log("🧾 Server trả về:", text);

          const json = JSON.parse(text);
          return json.reply;

        } catch (err) {
          console.error("❌ Lỗi ask_product:", err);
          return "🐢 Ơ... bạn ơi, hệ thống đang hơi chậm. Bạn thử lại sau một chút nhé!";
        }
      }

      case 'products_by_category':
        try {
          const witServerRes = await fetch("https://shapespeaker.onrender.com/wit/products-by-category", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input, entities }),
          });
          const witData = await witServerRes.json();
          return witData.reply;
        } catch (error) {
          console.error("❌ Lỗi gọi server:", error);
          return "Xin lỗi, không thể lấy sản phẩm theo danh mục lúc này.";
        }

      case 'get_price_of_product':
        try {
          const witServerRes = await fetch("https://shapespeaker.onrender.com/wit/product-price", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input,
              entities,
              fallbackProduct: conversationContext.lastProduct,
            }),
          });
          const witData = await witServerRes.json();
          return witData.reply;
        } catch (error) {
          console.error("❌ Lỗi lấy giá:", error);
          return "Xin lỗi, không thể lấy giá sản phẩm lúc này.";
        }

      case 'check_stock':
        try {
          const witServerRes = await fetch("https://shapespeaker.onrender.com/wit/check-stock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input,
              entities,
              fallbackProduct: conversationContext.lastProduct,
              fallbackQuantity: conversationContext.lastQuantity,
            }),
          });
          const witData = await witServerRes.json();
          return witData.reply;
        } catch (error) {
          console.error("❌ Lỗi kiểm tra tồn kho:", error);
          return "Xin lỗi, không thể kiểm tra tồn kho lúc này.";
        }

      case 'compare_price':
        try {
          const witServerRes = await fetch("https://shapespeaker.onrender.com/wit/compare-price", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input, entities }), // 👈 gửi cả entities nếu có
          });
          const witData = await witServerRes.json();
          return witData.reply;
        } catch (error) {
          console.error("❌ Lỗi so sánh giá:", error);
          return "Xin lỗi, không thể so sánh giá lúc này.";
        }

      case 'ask_product_rating': {
        const productName = entities?.product || conversationContext.lastProduct;
        if (!productName) return "🤔 Bạn muốn hỏi đánh giá của sản phẩm nào?";

        return await getRatingOfProductReply(productName);
      }

      case 'top_rated_products': {
        return await getTopRatedProductsReply();
      }

      case "product_detail":
        try {
          const res = await fetch("https://shapespeaker.onrender.com/wit/product-detail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input, entities }),
          });
          const data = await res.json();

          // ✅ Thay vì showReply
          addMessage("Chatbot", data.reply, "left");

          // ✅ Tự động chuyển nếu có productId
          if (data.productId) {
            setTimeout(() => {
              window.location.href = `store.html?productId=${data.productId}`;
            }, 2000);
          }

          return data.reply; // 👈 để đọc bằng TTS nếu bật
        } catch (error) {
          console.error("❌ Lỗi khi xử lý product_detail:", error);
          const errMsg = "❌ Có lỗi xảy ra khi tìm thông tin sản phẩm.";
          addMessage("Chatbot", errMsg, "left");
          return errMsg;
        }

      case 'buy_product':
        if (conversationContext.lastProduct && conversationContext.lastQuantity) {
          try {
            const res = await fetch("https://shapespeaker.onrender.com/wit/products");
            const allProducts = await res.json();

            const inputName = conversationContext.lastProduct.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const qty = parseInt(conversationContext.lastQuantity);

            const found = allProducts.find(p => {
              const name = p.name?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              return name.includes(inputName) || inputName.includes(name);
            });

            if (!found) {
              return `❌ Không tìm thấy sản phẩm "${conversationContext.lastProduct}" để thêm vào giỏ.`;
            }

            const productToAdd = {
              id: found.id,
              name: found.name,
              picture: found.picture,
              price: found.price,
              stock: found.stock,
              quantity: qty,
              fromConversation: true
            };

            // ✅ Check if addToCart exists
            if (typeof window.addToCart !== "function") {
              return `⚠️ Không thể thêm vào giỏ hàng ở trang này. Vui lòng truy cập "Cửa hàng" để tiếp tục mua.`;
            }

            const result = await window.addToCart(productToAdd);

            if (!result || !result.success) {
              return result?.message || "❌ Không thể thêm vào giỏ. Vui lòng thử lại.";
            }

            setTimeout(() => {
              window.location.href = "cart.html";
            }, 1000);

            return result.message + " Đang chuyển đến giỏ hàng...";

          } catch (err) {
            console.error("❌ Lỗi xử lý mua hàng:", err);
            return "❌ Có lỗi xảy ra khi xử lý yêu cầu mua hàng.";
          }
        }

        return "🤔 Bạn muốn mua sản phẩm gì và bao nhiêu cái? Hãy nói rõ hơn nhé!";


      case 'ask_features':
        return 'Tôi có chức năng trò chuyện, giải đáp các thắc mắc của bạn về sản phẩm và dịch vụ bên chúng tôi';

      case 'thank':
        return 'Cảm ơn bạn vì đã tin tưởng dịch vụ bên mình';

      case 'goodbye':
        return 'Cảm ơn bạn, hẹn gặp lại!';

      default:
        return 'Tôi chưa hiểu rõ ý bạn, bạn có thể nói lại không?';
    }

  } catch (error) {
    console.error('Lỗi gọi Wit.ai:', error);
    return 'Xin lỗi, có lỗi khi xử lý yêu cầu của bạn.';
  }
}

// 🔍 Normalize name không dấu để tìm sản phẩm
function normalizeName(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// 📦 Lấy đánh giá của 1 sản phẩm
async function getRatingOfProductReply(productName) {
  try {
    const res = await fetch("https://shapespeaker.onrender.com/wit/products");
    const allProducts = await res.json();

    const inputName = normalizeName(productName);
    const found = allProducts.find(p => {
      const name = normalizeName(p.name || "");
      return name.includes(inputName) || inputName.includes(name);
    });

    if (!found) {
      return `❌ Không tìm thấy sản phẩm "${productName}"`;
    }

    const ratingRes = await fetch(`https://shapespeaker.onrender.com/wit/ratings/${found.id}`);
    const data = await ratingRes.json();
    const { avgRating, totalRatings } = data;

    if (totalRatings === 0) {
      return `📦 *${found.name}* chưa có lượt đánh giá nào.`;
    }

    return `📦 *${found.name}* được đánh giá **${avgRating.toFixed(1)}⭐** từ ${totalRatings} lượt đánh giá.`;
  } catch (err) {
    console.error("❌ Lỗi lấy đánh giá:", err);
    return "❌ Đã xảy ra lỗi khi lấy đánh giá sản phẩm.";
  }
}

// 🔝 Lấy top 4 sản phẩm được đánh giá cao
async function getTopRatedProductsReply() {
  try {
    const res = await fetch("https://shapespeaker.onrender.com/wit/top-rated");
    const top = await res.json();

    if (!top.length) return "😢 Hiện chưa có sản phẩm nào được đánh giá.";

    let reply = `🌟 Top sản phẩm được đánh giá cao:\n\n`;
    top.forEach((p, i) => {
      reply += `${i + 1}. *${p.name}* — ${p.avgRating.toFixed(1)}⭐ (${p.totalRatings} lượt)\n`;
    });

    return reply;
  } catch (err) {
    console.error("❌ Lỗi lấy top rated:", err);
    return "❌ Đã xảy ra lỗi khi tải danh sách sản phẩm đánh giá cao.";
  }
}

async function sendMessage() {
  const input = document.getElementById('user-input');
  const text = input.value.trim();
  if (text === '') return;

  addMessage('Bạn', text, 'right');
  input.value = '';

  const chatBody = document.getElementById('chat-body');
  const loadingMsg = document.createElement('div');
  loadingMsg.className = 'message left typing-indicator';
  loadingMsg.textContent = 'Đang trả lời...';
  chatBody.appendChild(loadingMsg);
  chatBody.scrollTop = chatBody.scrollHeight;

  setTimeout(async () => {
    loadingMsg.remove();

    const response = await processInput(text); // 👉 xử lý command hoặc gọi Wit.ai
    addMessage('Chatbot', response, 'left');

    // 👉 ĐỌC TO CÂU TRẢ LỜI BẰNG FPTAI TTS
    if (isTTSEnabled) {
      try {
        await speakFPT(response);
      } catch (err) {
        console.error("Lỗi khi phát âm thanh:", err);
      }
    }

    if (typeof chatbotBox !== 'undefined' && chatbotBox.style.display === 'none') {
      showPopup(response);
    }
  }, 1500);
}
//2gwFyWnUk3EJnr7siR7wOyGDmrOAt3co

function showPopup(message) {
  hidePopup();
  popupNotification = document.createElement('div');
  popupNotification.id = 'chat-popup';
  popupNotification.textContent = message;
  popupNotification.onclick = toggleChatbot;
  document.body.appendChild(popupNotification);
  popupTimeout = setTimeout(hidePopup, 5000);
}

function hidePopup() {
  if (popupNotification) {
    popupNotification.remove();
    popupNotification = null;
  }
  if (popupTimeout) clearTimeout(popupTimeout);
}

function showPopupLastMessage() {
  const chatBody = document.getElementById('chat-body');
  const lastMsg = chatBody.querySelector('.left:last-child');
  if (lastMsg) showPopup(lastMsg.textContent);
}