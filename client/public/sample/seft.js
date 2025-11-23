// 📦 Load env & libs
require("dotenv").config();
const express = require("express");
const fs = require("fs");
const cors = require("cors");
const compression = require("compression");
const upload = require("./middleware/multer");
const cloudinary = require("./utils/cloudinary");
const admin = require("firebase-admin");
const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Init Firebase Admin
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
  })
});

// ✅ Middleware
app.use(cors({
  origin: ["http://localhost:5500", "http://127.0.0.1:5500", "https://shapespeaker.vercel.app", "https://shapespeaker.onrender.com"],
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"],
  credentials: true,
}));
app.options("*", cors());
app.use(compression());
app.use(express.json());

// 🧠 Dev Timing Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const time = Date.now() - start;
    console.log(`⏱️ ${req.method} ${req.originalUrl} - ${time}ms`);
  });
  next();
});

// ✅ Utils
const removeDiacritics = str => str.normalize("NFD").replace(/\p{Diacritic}/gu, "");
const firestore = admin.firestore();
const SUPER_ADMIN_UID = "J1RINivGZFgXKTWfGRe4ITU3BGz2";

// ✅ Routes
app.get("/", (_, res) => res.send("✅ API hoạt động."));

app.post("/upload", (req, res) => {
  upload.single("media")(req, res, function (err) {
    if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ success: false, message: "❌ File quá lớn." });
    if (err) return res.status(400).json({ success: false, message: `❌ Upload lỗi: ${err.message}` });
    if (!req.file) return res.status(400).json({ success: false, message: "❌ Không có file." });

    cloudinary.uploader.upload(req.file.path, { resource_type: "auto" }, (err, result) => {
      fs.unlink(req.file.path, () => {});
      if (err) return res.status(500).json({ success: false, message: "❌ Upload thất bại." });
      return res.json({ success: true, message: "✅ Upload thành công!", data: result });
    });
  });
});

// ✨ Route Handlers
const witRoutes = require("./routes/witRoutes");
app.use("/wit", witRoutes);

// 🔐 Xoá user
app.post("/deleteUser", async (req, res) => {
  const { requesterUid, targetUid } = req.body;
  if (requesterUid !== SUPER_ADMIN_UID) return res.status(403).json({ error: "❌ Không có quyền." });
  if (targetUid === SUPER_ADMIN_UID) return res.status(400).json({ error: "❌ Không thể xoá ADMIN GỐC." });

  try {
    await admin.auth().deleteUser(targetUid);
    await firestore.collection("users").doc(targetUid).delete();
    res.json({ message: `✅ Đã xoá ${targetUid}` });
  } catch (err) {
    res.status(500).json({ error: `❌ Lỗi xoá user: ${err.message}` });
  }
});

// 🚀 Start
app.listen(PORT, () => console.log(`🚀 Server chạy tại http://localhost:${PORT}`));


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
                const userId = orderDataBefore.uid;

                // Cập nhật trạng thái
                await updateDoc(orderRef, {
                    status: newStatus,
                });
                showToast("✅ Đã cập nhật trạng thái", "success");

                // Nếu vừa đổi sang delivered => tạo giftcode (nếu chưa có)
                if (newStatus === "delivered") {
                    try {
                        // Kiểm tra đã có giftcode cho order này chưa (tránh tạo trùng)
                        const gcQuery = query(collection(db, "giftcodes"), where("orderId", "==", orderId));
                        const gcSnap = await getDocs(gcQuery);

                        if (!gcSnap.empty) {
                            // Đã có giftcode rồi — không làm gì thêm
                            showToast("🔔 Giftcode đã được tạo trước đó cho đơn này", "info");
                        } else {
                            // Chuẩn bị danh sách product (bạn có thể truyền toàn bộ items hoặc chỉ 1 sản phẩm tuỳ logic)
                            const items = orderDataBefore.items || [];
                            // Gọi helper tạo và lưu giftcode — KHÔNG redirect (redirect:false)
                            await createAndSaveGiftCode(userId, orderId, items, { redirect: false });
                            showToast("🎁 Giftcode đã được tạo cho đơn hàng này", "success");
                            // (nếu muốn, có thể thêm gửi email/FCM trong helper)
                        }
                    } catch (errGc) {
                        console.error("Lỗi khi tạo giftcode:", errGc);
                        showToast("❌ Lỗi khi tạo giftcode (xem console)", "error");
                    }
                }

                // Làm mới dữ liệu giao diện
                fetchData();
            } catch (e) {
                console.error(e);
                showToast("❌ Lỗi khi cập nhật trạng thái", "error");
            }
        };