require("dotenv").config();
const express = require("express");
const fs = require("fs");
const cors = require("cors");
const upload = require("./middleware/multer");
const cloudinary = require("./utils/cloudinary");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3000;
const SUPER_ADMIN_UID = "J1RINivGZFgXKTWfGRe4ITU3BGz2";

// ✅ Initialize Firebase Admin (ĐÃ FIX lỗi invalid_grant → dùng ENV)
admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  }),
});

// ✅ Cấu hình CORS (Vercel + Local)
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://shapespeaker-xv283xipv-grr20091s-projects.vercel.app'
  ],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// ✅ Route test API
app.get("/", (req, res) => {
  res.send("✅ API đang hoạt động. Sử dụng /upload hoặc /deleteUser.");
});

// ✅ Route upload ảnh lên Cloudinary
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "❌ Không có file nào được gửi." });
  }

  console.log("🟢 Đã nhận file upload:", req.file);

  cloudinary.uploader.upload(req.file.path, (err, result) => {
    // ✅ Xoá file tạm dù có lỗi hay không
    fs.unlink(req.file.path, (unlinkErr) => {
      if (unlinkErr) console.error("❌ Lỗi xoá file tạm:", unlinkErr);
    });

    if (err) {
      console.error("❌ Lỗi từ Cloudinary:", err);
      return res.status(500).json({ success: false, message: "❌ Lỗi khi upload ảnh" });
    }

    res.status(200).json({ success: true, message: "✅ Upload thành công!", data: result });
  });
});

// ✅ Route xoá user trong Firebase Authentication và Firestore
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

// ✅ Start server
app.listen(PORT, () => console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`));
