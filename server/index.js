require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const upload = require("./middleware/multer");
const cloudinary = require("./utils/cloudinary");
const cors = require("cors");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

const app = express();
const PORT = process.env.PORT || 3000;
const SUPER_ADMIN_UID = "J1RINivGZFgXKTWfGRe4ITU3BGz2";

// ✅ Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ✅ Cấu hình CORS chuẩn → Railway + Vercel hoạt động ổn định
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
  console.log("🟢 Đã nhận file:", req.file);

  cloudinary.uploader.upload(req.file.path, (err, result) => {
    if (err) {
      console.error("❌ Lỗi từ Cloudinary:", err);
      return res.status(500).json({ success: false, message: "Lỗi khi upload ảnh" });
    }

    // ✅ Xoá file tạm sau khi upload thành công
    fs.unlink(req.file.path, (unlinkErr) => {
      if (unlinkErr) console.error("❌ Lỗi xoá file tạm:", unlinkErr);
      else console.log("🗑️ Đã xoá file tạm:", req.file.path);
    });

    res.status(200).json({ success: true, message: "Upload thành công!", data: result });
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



// khoi tao package.json
// cd Server
// npm init -y

// cai dat thu vien
// npm install express cloudinary cors dotenv multer nodemon


// chay server
// node index.js