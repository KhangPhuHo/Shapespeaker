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
const { admin, firestore, messaging } = require("./firebaseAdmin"); 

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
//const firestore = admin.firestore();
const SUPER_ADMIN_UID = "J1RINivGZFgXKTWfGRe4ITU3BGz2";

// ✅ Routes
app.get("/", (_, res) => res.send("✅ API hoạt động."));

app.post("/upload", (req, res) => {
  upload.single("media")(req, res, function (err) {
    if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ success: false, message: "❌ File quá lớn." });
    if (err) return res.status(400).json({ success: false, message: `❌ Upload lỗi: ${err.message}` });
    if (!req.file) return res.status(400).json({ success: false, message: "❌ Không có file." });

    cloudinary.uploader.upload(req.file.path, { resource_type: "auto" }, (err, result) => {
      fs.unlink(req.file.path, () => { });
      if (err) return res.status(500).json({ success: false, message: "❌ Upload thất bại." });
      return res.json({ success: true, message: "✅ Upload thành công!", data: result });
    });
  });
});

// ✨ Route Handlers
const witRoutes = require("./routes/witRoutes");
const notificationRoutes = require("./routes/notificationRoutes"); // ⬅️ ĐÃ IMPORT LẠI

app.use("/wit", witRoutes);
app.use("/notifications", notificationRoutes); // ⬅️ ĐÃ THÊM LẠI ROUTE GỬI THÔNG BÁO

// Lấy VAPID public key từ env
app.get("/api/getVapidKey", (req, res) => {
  const VAPID_KEY = process.env.FCM_VAPID_KEY;
  if (!VAPID_KEY) return res.status(500).json({ success: false, message: "VAPID key chưa cấu hình" });
  return res.json({ success: true, vapidKey: VAPID_KEY });
});

// ví dụ route gửi notification
app.post("/notifications/send", async (req, res) => {
    const { tokens, title, body } = req.body;
    try {
        const response = await messaging.sendMulticast({
            tokens,
            notification: { title, body },
        });
        res.json({ success: true, response });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});


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