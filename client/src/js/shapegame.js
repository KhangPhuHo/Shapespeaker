import { getTranslation } from './language.js';
import {
    getSpeakMode,
    isMuted,
    loadSettings,
    toggleMute,
    setSpeakMode
} from './setting.js';

// 🌟 Biến toàn cục
let score = 0;
let turns = 30;

const shapes = ["circle", "square", "triangle", "rectangle", "oval", "hexagon"];
const shapeColors = {
    circle: "#f87171",
    square: "#60a5fa",
    triangle: "#34d399",
    rectangle: "#fbbf24",
    oval: "#a78bfa",
    hexagon: "#f472b6"
};

// 🌟 DOM
const container = document.getElementById("shapes-container");
const scoreSpan = document.getElementById("score");
const turnsSpan = document.getElementById("turns");
const result = document.getElementById("game-result");
const restartBtn = document.getElementById("restartBtn");
const winSound = document.getElementById("winSound");
const loseSound = document.getElementById("loseSound");

// 🌟 Cập nhật UI settings
function updateSettingsUI() {
    document.getElementById("muteToggle").textContent = isMuted() ? "🔇" : "🔊";
    document.getElementById("speakModeSelect").value = getSpeakMode();
}
loadSettings();
updateSettingsUI();
document.addEventListener("settingsChanged", updateSettingsUI);

// 🌟 Phát âm
async function speakText(text) {
    if (isMuted()) return;

    const lang = localStorage.getItem("lang") || "en";

    if (lang === "vn") {
        try {
            const res = await fetch("https://api.fpt.ai/hmi/tts/v5", {
                method: "POST",
                headers: {
                    "api-key": "2gwFyWnUk3EJnr7siR7wOyGDmrOAt3co",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ text }),
            });
            const data = await res.json();

            if (data.async) {
                await new Promise(r => setTimeout(r, 1000));
                new Audio(data.async).play();
            } else if (data.data) {
                const audio = new Audio("data:audio/mp3;base64," + data.data);
                audio.oncanplaythrough = () => audio.play();
            }
        } catch (err) {
            console.error("❌ FPT TTS error:", err);
        }
    } else {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        speechSynthesis.speak(utterance);
    }
}

async function speakShape(shapeKey, correctKey) {
    if (isMuted()) return;
    const mode = getSpeakMode();
    const keyToRead = mode === "dragged" ? shapeKey : correctKey;
    const text = await getTranslation(`shapes.${keyToRead}`);
    await speakText(text);
}

// 🌟 Vẽ 1 hình ngẫu nhiên
let currentPreview = null;

function renderShape() {
    const shapeType = shapes[Math.floor(Math.random() * shapes.length)];
    const shape = document.createElement("div");
    shape.classList.add("shape");
    shape.setAttribute("draggable", true);
    shape.dataset.shape = shapeType;
    shape.style.backgroundColor = shapeColors[shapeType] || "#ccc";
    shape.style.margin = "0 auto";

    // 🎨 Style theo từng loại hình
    switch (shapeType) {
        case "circle":
            shape.style.width = "80px";
            shape.style.height = "80px";
            shape.style.borderRadius = "50%";
            break;
        case "square":
            shape.style.width = "80px";
            shape.style.height = "80px";
            break;
        case "rectangle":
            shape.style.width = "120px";
            shape.style.height = "60px";
            break;
        case "oval":
            shape.style.width = "100px";
            shape.style.height = "60px";
            shape.style.borderRadius = "50% / 50%";
            break;
        case "triangle":
            shape.style.width = 0;
            shape.style.height = 0;
            shape.style.borderLeft = "40px solid transparent";
            shape.style.borderRight = "40px solid transparent";
            shape.style.borderBottom = `80px solid ${shapeColors[shapeType]}`;
            shape.style.backgroundColor = "transparent";
            break;
        case "hexagon":
            shape.style.width = "100px";
            shape.style.height = "80px";
            shape.style.clipPath = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";
            shape.style.backgroundColor = shapeColors[shapeType];
            break;
    }

    // 👉 Gán drag event
    shape.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("shape", shapeType);

        // 🧼 Xóa preview cũ nếu còn
        if (currentPreview) {
            currentPreview.remove();
            currentPreview = null;
        }

        // ✅ Tạo preview trong suốt
        const transparentPreview = document.createElement("div");
        transparentPreview.style.width = "1px";
        transparentPreview.style.height = "1px";
        transparentPreview.style.opacity = "0"; // hoàn toàn trong suốt
        transparentPreview.style.position = "fixed";
        transparentPreview.style.top = "0";
        transparentPreview.style.left = "0";
        transparentPreview.style.zIndex = "-9999"; // để không ảnh hưởng UI

        document.body.appendChild(transparentPreview);
        currentPreview = transparentPreview;

        // ✅ Dùng preview trong suốt làm drag image
        e.dataTransfer.setDragImage(transparentPreview, 0, 0);

        // ✅ Tạo hình preview thật sự để theo chuột (tuỳ chọn nếu bạn vẫn muốn hiệu ứng)
        const floatingPreview = shape.cloneNode(true);
        floatingPreview.style.position = "fixed";
        floatingPreview.style.pointerEvents = "none";
        floatingPreview.style.opacity = "0.8";
        floatingPreview.style.transform = "scale(1.1)";
        floatingPreview.style.zIndex = "9999";
        document.body.appendChild(floatingPreview);

        const moveHandler = (event) => {
            floatingPreview.style.left = `${event.clientX - 50}px`;
            floatingPreview.style.top = `${event.clientY - 50}px`;
        };
        document.addEventListener("dragover", moveHandler);

        // 🧹 Dọn dẹp sau khi drag
        shape.addEventListener("dragend", () => {
            document.removeEventListener("dragover", moveHandler);
            if (floatingPreview) floatingPreview.remove();
            if (currentPreview) currentPreview.remove();
            currentPreview = null;
        }, { once: true });
    });

    // 🧹 Xoá hình cũ & render hình mới
    container.innerHTML = "";
    container.appendChild(shape);
}

// 🌟 Xử lý kéo thả
document.querySelectorAll(".drop-zone").forEach((zone) => {
    zone.addEventListener("dragover", e => e.preventDefault());
    zone.addEventListener("drop", async (e) => {
        e.preventDefault();
        const draggedShape = e.dataTransfer.getData("shape");
        const correctShape = zone.dataset.shape;
        turns--;

        if (draggedShape === correctShape) score += 10;
        await speakShape(draggedShape, correctShape);
        updateGameState();
    });
});

// 🌟 Cập nhật game
async function updateGameState() {
    scoreSpan.textContent = score;
    turnsSpan.textContent = turns;

    if (score >= 200) {
        result.textContent = await getTranslation("game.win");
        winSound.play();
        container.innerHTML = "";
        restartBtn.classList.remove("hidden");
        return;
    }

    if (turns <= 0) {
        result.textContent = await getTranslation("game.lose");
        loseSound.play();
        container.innerHTML = "";
        restartBtn.classList.remove("hidden");
        return;
    }

    renderShape();
}

// 🌟 Bắt đầu game
document.querySelector("button").addEventListener("click", () => {
    document.getElementById("shape-game").classList.remove("hidden");
    score = 0;
    turns = 30;
    result.textContent = "";
    restartBtn.classList.add("hidden");
    updateGameState();
});

// 🔁 Chơi lại
restartBtn.addEventListener("click", () => {
    score = 0;
    turns = 30;
    result.textContent = "";
    restartBtn.classList.add("hidden");
    updateGameState();
});

// 🔇 Tắt tiếng
document.getElementById("muteToggle").addEventListener("click", toggleMute);

// 🗣️ Đổi chế độ đọc
document.getElementById("speakModeSelect").addEventListener("change", (e) => {
    setSpeakMode(e.target.value);
});
