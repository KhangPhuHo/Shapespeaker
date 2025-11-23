import qrcode
import os

# 🔹 URL gốc của web bạn
BASE_URL = "https://shapespeaker.vercel.app/playbooksound/player.html?file="

# 🔹 Thư mục chứa file âm thanh
AUDIO_FOLDER = os.path.join(os.path.dirname(__file__), "audio")

# 🔹 Thư mục để lưu QR
OUTPUT_FOLDER = os.path.join(os.path.dirname(__file__), "qr_codes")

# Tạo thư mục đầu ra nếu chưa có
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Lấy danh sách tất cả file .mp3 trong thư mục audio
audio_files = [f for f in os.listdir(AUDIO_FOLDER) if f.lower().endswith(".mp3")]

# Tạo QR cho từng file
for audio in audio_files:
    url = BASE_URL + audio
    qr_img = qrcode.make(url)
    name = os.path.splitext(audio)[0]
    out_path = os.path.join(OUTPUT_FOLDER, f"{name}_qr.png")
    qr_img.save(out_path)
    print(f"✅ Đã tạo QR cho: {audio} -> {out_path}")

print("\n🎉 Hoàn tất! Tất cả mã QR nằm trong thư mục 'qr_codes'.")
