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
  upload.array("media")(req, res, async function (err) {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ success: false, message: "❌ File quá lớn." });
    }
    if (err) {
      return res.status(400).json({ success: false, message: `❌ Upload lỗi: ${err.message}` });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "❌ Không có file." });
    }

    try {
      // ✅ Upload tất cả file song song
      const uploadPromises = req.files.map(file =>
        cloudinary.uploader.upload(file.path, { resource_type: "auto" })
          .then(result => {
            fs.unlink(file.path, () => {}); // Xoá file tạm
            return result;
          })
      );

      const results = await Promise.all(uploadPromises);

      return res.json({
        success: true,
        message: "✅ Upload nhiều file thành công!",
        count: results.length,
        data: results,
      });
    } catch (err) {
      console.error("❌ Lỗi upload:", err);
      res.status(500).json({ success: false, message: "❌ Upload thất bại.", error: err.message });
    }
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