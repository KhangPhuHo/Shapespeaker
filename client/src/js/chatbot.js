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
    await new Promise(resolve => setTimeout(resolve, 500));
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

async function getWitResponse(input) {
  try {
    const res = await fetch(`https://api.wit.ai/message?v=20230616&q=${encodeURIComponent(input)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`, // 👉 giữ nguyên token Wit.ai của bạn
      },
    });
    const data = await res.json();

    let intent = 'none';
    if (data.intents && data.intents.length > 0) {
      intent = data.intents[0].name;
    }

    switch (intent) {
      case 'greeting':
        return 'Xin chào! Tôi có thể giúp gì cho bạn?';
      case 'ask_product':
        return 'Hiện tại chúng tôi có nhiều sản phẩm hấp dẫn, bạn quan tâm sản phẩm nào?';
      case 'buy_product':
        return 'Vậy bạn hãy chọn vào sản phẩm, sau đó chọn vào nút mua ngay hoặc giỏ hàng, thêm thông tin là được';
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
    const response = await getWitResponse(text);
    addMessage('Chatbot', response, 'left');

    // 👉 ĐỌC TO CÂU TRẢ LỜI BẰNG FPTAI TTS
    if (isTTSEnabled) {
      try {
        await speakFPT(response); // Gọi hàm chatbot nói chuyện
      } catch (err) {
        console.error("Lỗi khi phát âm thanh:", err);
      }
    }

    if (typeof chatbotBox !== 'undefined' && chatbotBox.style.display === 'none') {
      showPopup(response);
    }
  }, 1500);
}//2gwFyWnUk3EJnr7siR7wOyGDmrOAt3co

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