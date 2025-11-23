const DEFAULT_SETTINGS = {
  mute: false,
  speakMode: "target", // "target" = đọc tên ô đích, "dragged" = đọc tên hình thả
};

export const settings = { ...DEFAULT_SETTINGS };

// 🔄 Load từ localStorage
export function loadSettings() {
  const storedMute = localStorage.getItem("mute");
  const storedMode = localStorage.getItem("speakMode");

  if (storedMute !== null) settings.mute = storedMute === "true";
  if (["target", "dragged"].includes(storedMode)) settings.speakMode = storedMode;
}

// 🔁 Toggle mute
export function toggleMute() {
  settings.mute = !settings.mute;
  localStorage.setItem("mute", settings.mute);
  notifySettingsChanged();
}

// 📢 Đặt chế độ nói (nếu hợp lệ)
export function setSpeakMode(mode) {
  if (["target", "dragged"].includes(mode)) {
    settings.speakMode = mode;
    localStorage.setItem("speakMode", mode);
    notifySettingsChanged();
  } else {
    console.warn("Invalid speak mode:", mode);
  }
}

// 🔊 Kiểm tra trạng thái tắt tiếng
export function isMuted() {
  return settings.mute;
}

// 🔍 Trả về chế độ nói
export function getSpeakMode() {
  return settings.speakMode;
}

// 👉 Hàm riêng để thông báo thay đổi
function notifySettingsChanged() {
  document.dispatchEvent(new Event("settingsChanged"));
}
