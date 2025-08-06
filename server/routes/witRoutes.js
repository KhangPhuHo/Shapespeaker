const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

const firestore = admin.firestore();
const removeDiacritics = str => str.normalize("NFD").replace(/\p{Diacritic}/gu, "");

// 📌 Proxy gọi Wit.ai
router.post("/message", async (req, res) => {
  const { input } = req.body;
  if (!input || typeof input !== 'string') return res.status(400).json({ error: "❌ Thiếu hoặc sai định dạng input" });

  try {
    const response = await fetch(`https://api.wit.ai/message?v=20230616&q=${encodeURIComponent(input)}&n=3&verbose=true&include=all`, {
      headers: {
        Authorization: `Bearer ${process.env.WIT_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();
    const topIntent = data.intents?.[0];
    const confidence = topIntent?.confidence || 0;

    const payload = {
      text: data.text,
      intent: topIntent?.name || "unknown",
      confidence,
      entities: data.entities || {}
    };

    if (confidence < 0.4) payload.warning = "⚠️ Dự đoán không chắc chắn.";
    res.json(payload);
  } catch (error) {
    console.error("❌ Wit.ai error:", error);
    res.status(500).json({ error: "❌ Lỗi khi gọi Wit.ai" });
  }
});

// 📌 Lấy 3 sản phẩm nổi bật
router.post("/get-product-info", async (_, res) => {
  try {
    const snapshot = await firestore.collection("shapespeakitems").limit(3).get();
    if (snapshot.empty) return res.json({ reply: "🐰 Hiện chưa có sản phẩm nào." });

    const reply = snapshot.docs.map(doc => {
      const d = doc.data();
      return `🎁 ${d.name} — 💰 ${d.price?.toLocaleString()} VND`;
    }).join('\n');

    res.json({ reply: `🎉 Một số sản phẩm:

${reply}\n\n🌟 Gõ tên để xem thêm nhé!` });
  } catch (err) {
    console.error("❌ get-product-info:", err);
    res.status(500).json({ reply: "❌ Lỗi khi lấy danh sách sản phẩm." });
  }
});

// 📌 Tìm theo category
router.post("/products-by-category", async (req, res) => {
  const { input, entities } = req.body;
  const inputLower = input?.toLowerCase();
  const knownCategories = ['đồ chơi', 'giáo dục', 'toán', 'thẻ'];
  const entityCategory = entities?.['category:category']?.[0]?.value?.toLowerCase();
  const matched = entityCategory || knownCategories.find(cat => inputLower.includes(cat));

  if (!matched) return res.json({ reply: "❌ Không xác định được danh mục." });

  try {
    const snap = await firestore.collection("shapespeakitems").where("category", "array-contains", matched).get();
    if (snap.empty) return res.json({ reply: `❌ Không có sản phẩm nào thuộc danh mục \"${matched}\".` });

    const reply = snap.docs.slice(0, 3).map(d => {
      const data = d.data();
      return `- ${data.name} (${data.price?.toLocaleString()} VND)`;
    }).join('\n');

    res.json({ reply: `🧾 Sản phẩm thuộc \"${matched}\":\n${reply}` });
  } catch (err) {
    console.error("❌ products-by-category:", err);
    res.status(500).json({ reply: "❌ Có lỗi khi truy vấn." });
  }
});

// 📌 Hỏi giá
router.post("/product-price", async (req, res) => {
  const { input, entities, fallbackProduct } = req.body;
  const normInput = removeDiacritics(input?.toLowerCase() || "");
  const entityProduct = removeDiacritics(entities?.["product:product"]?.[0]?.value?.toLowerCase() || fallbackProduct || "");

  try {
    const snapshot = await firestore.collection("shapespeakitems").get();
    const matched = snapshot.docs.filter(doc => {
      const name = removeDiacritics(doc.data().name?.toLowerCase() || "");
      return name.includes(entityProduct) || entityProduct.includes(name) || normInput.includes(name);
    });

    if (matched.length === 0) return res.json({ reply: "😕 Không tìm thấy sản phẩm." });

    const reply = matched.map(p => {
      const data = p.data();
      return `- ${data.name} – **${data.price?.toLocaleString()} VND**`;
    }).join('\n');

    res.json({ reply: `💡 Sản phẩm liên quan:\n${reply}` });
  } catch (err) {
    console.error("❌ product-price:", err);
    res.status(500).json({ reply: "❌ Lỗi khi xử lý." });
  }
});

// 📌 Kiểm tra tồn kho
router.post("/check-stock", async (req, res) => {
  const { input, entities, fallbackProduct } = req.body;
  const normInput = removeDiacritics(input?.toLowerCase() || "");
  const entityProduct = removeDiacritics(entities?.["product:product"]?.[0]?.value?.toLowerCase() || fallbackProduct || "");
  let qty = entities?.["wit$number:number"]?.[0]?.value || parseInt(input.match(/\b(\d+)\b/)?.[1]);

  try {
    const snapshot = await firestore.collection("shapespeakitems").get();
    const matched = snapshot.docs.filter(doc => {
      const name = removeDiacritics(doc.data().name?.toLowerCase() || "");
      return name.includes(entityProduct) || entityProduct.includes(name) || normInput.includes(name);
    });

    if (matched.length === 0) return res.json({ reply: "😕 Không tìm thấy sản phẩm." });
    const product = matched[0].data();
    const stock = product.stock || 0;

    if (qty) {
      const enough = stock >= qty;
      return res.json({
        reply: enough ? `✅ Có đủ **${qty}** cái **\"${product.name}\"**.` : `⚠️ Chỉ còn **${stock}** cái **\"${product.name}\"**.`,
        productId: matched[0].id
      });
    }

    res.json({ reply: stock > 0 ? `📦 **${product.name}** còn **${stock}** cái.` : `❌ **${product.name}** đã hết hàng.`, productId: matched[0].id });
  } catch (err) {
    console.error("❌ check-stock:", err);
    res.status(500).json({ reply: "❌ Lỗi kiểm tra tồn kho." });
  }
});

// 📌 Chi tiết sản phẩm
router.post("/product-detail", async (req, res) => {
  const { input, entities, fallbackProduct } = req.body;
  const normInput = removeDiacritics(input?.toLowerCase() || "");
  const entityProduct = removeDiacritics(entities?.["product:product"]?.[0]?.value?.toLowerCase() || fallbackProduct || "");

  try {
    const snapshot = await firestore.collection("shapespeakitems").get();
    const matched = snapshot.docs.filter(doc => {
      const name = removeDiacritics(doc.data().name?.toLowerCase() || "");
      return name.includes(entityProduct) || entityProduct.includes(name) || normInput.includes(name);
    });

    if (!matched.length) return res.json({ reply: "😕 Không tìm thấy sản phẩm." });
    const product = matched[0].data();
    res.json({
      reply: `📘 Sản phẩm bạn hỏi:\n🎁 **${product.name}**\n💰 Giá: ${product.price?.toLocaleString()} VND\n👉 Mình sẽ mở chi tiết sản phẩm này cho bạn nhé!`,
      productId: matched[0].id
    });
  } catch (err) {
    console.error("❌ product-detail:", err);
    res.status(500).json({ reply: "❌ Lỗi khi xử lý." });
  }
});

// 📌 Lấy tất cả sản phẩm
router.get("/products", async (_, res) => {
  try {
    const snap = await firestore.collection("shapespeakitems").get();
    const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Lỗi lấy sản phẩm" });
  }
});

// 📌 Lấy rating của sản phẩm
router.get("/ratings/:id", async (req, res) => {
  try {
    const snap = await firestore.collection(`shapespeakitems/${req.params.id}/ratings`).get();
    const ratings = snap.docs.map(doc => doc.data());
    const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;
    res.json({ avgRating: avg, totalRatings: ratings.length });
  } catch (err) {
    res.status(500).json({ error: "Lỗi server khi lấy đánh giá" });
  }
});

// 📌 Top-rated
router.get("/top-rated", async (_, res) => {
  try {
    const productSnap = await firestore.collection("shapespeakitems").get();
    const products = await Promise.all(productSnap.docs.map(async doc => {
      const data = doc.data();
      const ratingSnap = await firestore.collection(`shapespeakitems/${doc.id}/ratings`).get();
      const ratings = ratingSnap.docs.map(d => d.data());
      const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;
      return avg > 0 ? { ...data, id: doc.id, avgRating: avg, totalRatings: ratings.length } : null;
    }));

    const top = products.filter(Boolean).sort((a, b) => b.avgRating - a.avgRating).slice(0, 4);
    res.json(top);
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi lấy top sản phẩm" });
  }
});

module.exports = router;