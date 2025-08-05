require("dotenv").config();
const express = require("express");
const fs = require("fs");
const cors = require("cors");
const upload = require("./middleware/multer"); // Đã cấu hình giới hạn 150MB và lọc MIME
const cloudinary = require("./utils/cloudinary");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3000;
const SUPER_ADMIN_UID = "J1RINivGZFgXKTWfGRe4ITU3BGz2";

// ✅ Khởi tạo Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  }),
});

// ✅ CORS: Cho phép frontend truy cập API
app.use(cors({
  origin: [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://shapespeaker.vercel.app"
  ],
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"],
  credentials: true,
}));

// ✅ Bắt tất cả OPTIONS request để không bị block bởi preflight
app.options("*", cors());

app.use(express.json());

// ✅ Route test
app.get("/", (req, res) => {
  res.send("✅ API đang hoạt động. Sử dụng /upload hoặc /deleteUser.");
});

// ✅ Upload ảnh/video lên Cloudinary
app.post("/upload", (req, res) => {
  upload.single("media")(req, res, function (err) {
    // 🔴 File quá lớn
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "❌ File quá lớn. Giới hạn là 150MB.",
      });
    }

    // 🔴 Định dạng không hợp lệ hoặc lỗi khác
    if (err) {
      return res.status(400).json({
        success: false,
        message: "❌ Không thể upload file: " + err.message,
      });
    }

    // 🔴 Không có file nào
    if (!req.file) {
      return res.status(400).json({ success: false, message: "❌ Không có file nào được gửi." });
    }

    console.log("🟢 Nhận file:", req.file.originalname);

    cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto", // ✅ Cho phép Cloudinary tự nhận diện ảnh/video
    }, (err, result) => {
      // ✅ Xoá file tạm (dù có lỗi hay không)
      fs.unlink(req.file.path, () => { });

      if (err) {
        console.error("❌ Lỗi Cloudinary:", err);
        return res.status(500).json({ success: false, message: "❌ Upload thất bại." });
      }

      return res.status(200).json({
        success: true,
        message: "✅ Upload thành công!",
        data: result,
      });
    });
  });
});

// 🔐 Proxy gọi Wit.ai API để giấu token và phân tích thông minh hơn
app.post("/wit/message", async (req, res) => {
  const { input } = req.body;

  if (!input || typeof input !== 'string') {
    return res.status(400).json({ error: "❌ Thiếu hoặc sai định dạng input" });
  }

  try {
    const witURL = `https://api.wit.ai/message?v=20230616&q=${encodeURIComponent(input)}&n=3&verbose=true&include=all`;

    const response = await fetch(witURL, {
      headers: {
        Authorization: `Bearer ${process.env.WIT_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
    });

    const data = await response.json();

    // 🔍 Ghi log để theo dõi dễ huấn luyện thêm
    console.log("🧠 [Wit.ai] Text:", data.text);
    console.log("➡️ Intents:", data.intents?.map(i => `${i.name} (${i.confidence})`).join(", ") || "None");
    console.log("🔎 Entities:", JSON.stringify(data.entities || {}, null, 2));

    const topIntent = data.intents?.[0];
    const confidence = topIntent?.confidence || 0;

    const responsePayload = {
      text: data.text,
      intent: topIntent?.name || "unknown",
      confidence,
      entities: data.entities || {},
    };

    // ⚠️ Nếu độ tin cậy thấp, thêm cảnh báo
    if (confidence < 0.4) {
      console.warn("⚠️ Confidence thấp:", confidence);
      responsePayload.warning = "⚠️ Đây là dự đoán với độ tin cậy thấp, có thể không đúng ý bạn.";
    }

    return res.json(responsePayload);

  } catch (error) {
    console.error("❌ Lỗi gọi Wit.ai:", error);
    return res.status(500).json({ error: "❌ Lỗi khi gọi Wit.ai" });
  }
});

// ✅ /wit/get-product-info - giả sử trả 3 sản phẩm nổi bật
app.post("/wit/get-product-info", async (req, res) => {
  try {
    console.log("📥 Nhận request /wit/get-product-info");

    const snapshot = await admin.firestore()
      .collection("shapespeakitems")
      .limit(3)
      .get();

    if (snapshot.empty) {
      const reply = "🐰 Ơ... Hiện tại chưa có sản phẩm nào cả. Bạn quay lại sau nhé!";
      console.warn("⚠️ Không có sản phẩm nào");
      return res.json({ reply });
    }

    const products = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      const name = d.name || "Sản phẩm chưa đặt tên";
      const price = typeof d.price === 'number' ? `${d.price.toLocaleString()} VND` : "Chưa có giá";
      products.push(`🎁 ${name} — 💰 ${price}`);
    });

    const reply = `🎉 Đây là một số món đồ chơi thú vị nè:\n\n${products.join('\n')}\n\n🌟 Bạn có thể gõ tên sản phẩm để xem thêm nhé!`;
    console.log("✅ Trả về:", reply);

    return res.json({ reply });

  } catch (error) {
    console.error("❌ Lỗi get-product-info:", error);
    const reply = "😢 Ôi không! Có lỗi xảy ra khi lấy danh sách sản phẩm. Bạn đợi một lát nhé.";
    return res.status(500).json({ reply });
  }
});

// ✅ /wit/products-by-category - hỗ trợ entity category
app.post("/wit/products-by-category", async (req, res) => {
  const { input, entities } = req.body;
  if (!input) return res.status(400).json({ reply: "❌ Thiếu nội dung câu hỏi." });

  try {
    const knownCategories = ['đồ chơi', 'giáo dục', 'toán', 'thẻ'];
    const inputLower = input.toLowerCase();
    const entityCategory = entities?.['category:category']?.[0]?.value?.toLowerCase();
    let matchedCategory = entityCategory || knownCategories.find(cat => inputLower.includes(cat));

    if (!matchedCategory) {
      return res.json({ reply: "❌ Không xác định được danh mục từ câu hỏi. Bạn thử nói rõ hơn nhé." });
    }

    const snap = await admin.firestore().collection("shapespeakitems")
      .where("category", "array-contains", matchedCategory)
      .get();

    if (snap.empty) {
      return res.json({ reply: `❌ Không có sản phẩm nào thuộc danh mục "${matchedCategory}".` });
    }

    const productList = [];
    snap.forEach(doc => {
      const d = doc.data();
      productList.push(`${d.name} (${d.price.toLocaleString()} VND)`);
    });

    return res.json({
      reply: `🧾 Các sản phẩm thuộc danh mục "${matchedCategory}":\n- ${productList.slice(0, 3).join('\n- ')}`
    });

  } catch (error) {
    console.error("❌ Lỗi truy vấn theo category:", error);
    return res.status(500).json({ reply: "❌ Có lỗi khi tìm theo danh mục." });
  }
});

// ✅ /wit/product-price - hỗ trợ entity product
const removeDiacritics = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

app.post("/wit/product-price", async (req, res) => {
  const { input, entities, fallbackProduct } = req.body;
  if (!input) return res.status(400).json({ reply: "❌ Thiếu nội dung câu hỏi." });

  try {
    const normInput = removeDiacritics(input.toLowerCase());
    const entityProduct = removeDiacritics(entities?.["product:product"]?.[0]?.value?.toLowerCase() || fallbackProduct || "");

    const snapshot = await admin.firestore().collection("shapespeakitems").get();
    const matchedProducts = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const productName = removeDiacritics(data.name?.toLowerCase() || "");

      const match = productName.includes(entityProduct) ||
        entityProduct.includes(productName) ||
        normInput.includes(productName);

      if (match) {
        matchedProducts.push({ ...data, id: doc.id });
      }
    });

    if (matchedProducts.length === 0) {
      return res.json({ reply: "😕 Mình chưa tìm thấy sản phẩm bạn hỏi. Bạn thử nhập tên đầy đủ hơn nhé!" });
    }

    // Format kết quả
    const list = matchedProducts.map(p =>
      `- ${p.name} – **${p.price.toLocaleString()} VND**`
    ).join('\n');

    const reply = `💡 Mình tìm thấy các sản phẩm liên quan:\n${list}\nBạn muốn xem chi tiết sản phẩm nào thì có thể gõ tên cụ thể nhé.`;

    return res.json({ reply });

  } catch (error) {
    console.error("❌ Lỗi xử lý hỏi giá:", error);
    return res.status(500).json({ reply: "❌ Có lỗi xảy ra khi tìm giá sản phẩm." });
  }
});

// ✅ /wit/check-stock - hỗ trợ entity product & quantity
app.post("/wit/check-stock", async (req, res) => {
  const { input, entities, fallbackProduct } = req.body;
  if (!input) return res.status(400).json({ reply: "❌ Thiếu nội dung để kiểm tra tồn kho." });

  try {
    const normInput = removeDiacritics(input.toLowerCase());
    const entityProduct = removeDiacritics(entities?.["product:product"]?.[0]?.value?.toLowerCase() || fallbackProduct || "");
    const entityQty = entities?.["wit$number:number"]?.[0]?.value;  // 🔄 fix đúng entity
    let askedQty = entityQty ? parseInt(entityQty) : null;

    // fallback nếu Wit.ai không tách số
    if (!askedQty) {
      const quantityMatch = input.match(/\b(\d+)\b/);
      askedQty = quantityMatch ? parseInt(quantityMatch[1]) : null;
    }

    const snapshot = await admin.firestore().collection("shapespeakitems").get();
    const matchedProducts = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const name = removeDiacritics(data.name?.toLowerCase() || "");

      const match = name.includes(entityProduct) ||
                    entityProduct.includes(name) ||
                    normInput.includes(name);

      if (match) {
        matchedProducts.push({ ...data, id: doc.id });
      }
    });

    if (matchedProducts.length === 0) {
      return res.json({ reply: "😕 Mình chưa tìm thấy sản phẩm bạn hỏi. Bạn thử nhập rõ tên hơn nhé!" });
    }

    // Nếu có nhiều thì chọn sản phẩm đầu tiên (hoặc bạn có thể cải thiện theo độ gần khớp sau)
    const product = matchedProducts[0];

    // Phản hồi theo số lượng hỏi
    if (askedQty !== null) {
      if (product.stock >= askedQty) {
        return res.json({
          reply: `✅ Có đủ **${askedQty}** cái **"${product.name}"**. Hiện còn **${product.stock}** cái trong kho.`,
          productId: product.id
        });
      } else {
        return res.json({
          reply: `⚠️ Chỉ còn **${product.stock}** cái **"${product.name}"**, không đủ **${askedQty}** cái rồi.`,
          productId: product.id
        });
      }
    }

    // Nếu không hỏi cụ thể số lượng
    const reply = product.stock > 0
      ? `📦 Sản phẩm **"${product.name}"** hiện còn **${product.stock}** cái.`
      : `❌ Sản phẩm **"${product.name}"** hiện đã hết hàng.`

    return res.json({ reply, productId: product.id });

  } catch (error) {
    console.error("❌ Lỗi kiểm tra tồn kho:", error);
    return res.status(500).json({ reply: "❌ Có lỗi xảy ra khi kiểm tra tồn kho." });
  }
});

// ✅ /wit/compare-price - hỗ trợ entity product
// Map category sang emoji
const categoryEmoji = {
  "giáo dục": "📘",
  "đồ chơi": "🧸",
  "thẻ": "🃏",
  "hình học": "🧩",
};

app.post("/wit/compare-price", async (req, res) => {
  const { input, entities } = req.body;
  if (!input) return res.status(400).json({ reply: "❌ Thiếu nội dung để so sánh." });

  try {
    const normInput = removeDiacritics(input.toLowerCase());
    const productNames = (entities?.["product:product"] || []).map(p =>
      removeDiacritics(p.value.toLowerCase())
    );

    const snapshot = await admin.firestore().collection("shapespeakitems").get();
    const matched = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const name = removeDiacritics(data.name?.toLowerCase() || "");
      const match = normInput.includes(name) || productNames.some(p => name.includes(p));
      if (match) matched.push({ ...data, id: doc.id });
    });

    if (matched.length < 2) {
      return res.json({ reply: "😅 Cần ít nhất **2 sản phẩm** để thực hiện so sánh." });
    }

    // Sắp xếp theo giá tăng dần
    matched.sort((a, b) => a.price - b.price);

    const lines = matched.map((p, idx) => {
      const emoji = p.category?.find(c => categoryEmoji[c.toLowerCase()]) || "";
      const icon = categoryEmoji[emoji.toLowerCase()] || "📦";
      return `${idx === 0 ? "🔻" : "•"} ${icon} **${p.name}** – ${p.price.toLocaleString()} VND`;
    });

    const reply = `📊 So sánh giá các sản phẩm bạn hỏi:\n${lines.join('\n')}\n\n👉 **"${matched[0].name}"** là sản phẩm rẻ nhất.`;

    return res.json({ reply });

  } catch (error) {
    console.error("❌ Lỗi nâng cấp so sánh giá:", error);
    return res.status(500).json({ reply: "❌ Lỗi khi so sánh giá sản phẩm." });
  }
});

// 🔐 GET all products for chatbot
app.get("/wit/products", async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection("shapespeakitems").get();
    const products = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id, // Đây là uid nếu bạn dùng doc ID làm mã định danh
        ...data
      };
    });
    res.json(products);
  } catch (err) {
    console.error("❌ Lỗi lấy danh sách sản phẩm:", err);
    res.status(500).json({ error: "Lỗi khi lấy sản phẩm" });
  }
});

// ✅ Xoá user trong Firebase Auth + Firestore
app.post("/deleteUser", async (req, res) => {
  const { requesterUid, targetUid } = req.body;

  if (requesterUid !== SUPER_ADMIN_UID) {
    return res.status(403).json({ error: "❌ Bạn không có quyền thực hiện lệnh này." });
  }

  if (targetUid === SUPER_ADMIN_UID) {
    return res.status(400).json({ error: "❌ Không thể xoá ADMIN GỐC." });
  }

  try {
    await admin.auth().deleteUser(targetUid);
    await admin.firestore().collection("users").doc(targetUid).delete();
    return res.json({ message: `✅ Đã xoá tài khoản ${targetUid}` });
  } catch (error) {
    console.error("❌ Lỗi khi xoá tài khoản:", error);
    return res.status(500).json({ error: "❌ Lỗi khi xoá tài khoản: " + error.message });
  }
});

// ✅ Khởi động server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
