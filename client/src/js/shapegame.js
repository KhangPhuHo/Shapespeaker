import { getTranslation } from './language.js';
import interact from 'https://cdn.jsdelivr.net/npm/@interactjs/interactjs/index.js';
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
function renderShape() {
    const shapeType = shapes[Math.floor(Math.random() * shapes.length)];
    const shape = document.createElement("div");
    shape.classList.add("shape");
    shape.dataset.shape = shapeType;
    shape.style.backgroundColor = shapeColors[shapeType] || "#ccc";
    shape.style.position = "absolute";
    shape.style.top = "50%";
    shape.style.left = "50%";
    shape.style.transform = "translate(-50%, -50%)";
    shape.style.touchAction = "none";
    shape.style.zIndex = "10";
    shape.style.transition = "transform 0.2s ease";

    // 👇 Reset ban đầu
    shape.setAttribute('data-x', 0);
    shape.setAttribute('data-y', 0);

    // Style theo hình
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

    // Xoá hình cũ
    container.innerHTML = "";
    container.appendChild(shape);

    // 👉 Reset tương tác trước đó
    interact('.shape').unset();

    // 🧲 Setup kéo thả
    interact('.shape').draggable({
        inertia: false,
        modifiers: [
            interact.modifiers.restrict({
                restriction: document.body, // giới hạn trong body
                endOnly: true
            })
        ],
        listeners: {
            move(event) {
                const target = event.target;
                const dx = event.dx;
                const dy = event.dy;

                const x = (parseFloat(target.getAttribute('data-x')) || 0) + dx;
                const y = (parseFloat(target.getAttribute('data-y')) || 0) + dy;

                target.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);
            },
            end(event) {
                const dragged = event.target;
                const draggedShape = dragged.dataset.shape;
                const shapeRect = dragged.getBoundingClientRect();
                const dropZones = document.querySelectorAll('.drop-zone');

                let droppedCorrectly = false;

                (async () => {
                    for (const zone of dropZones) {
                        const zoneRect = zone.getBoundingClientRect();
                        const isOverlapping =
                            shapeRect.left < zoneRect.right &&
                            shapeRect.right > zoneRect.left &&
                            shapeRect.top < zoneRect.bottom &&
                            shapeRect.bottom > zoneRect.top;

                        if (isOverlapping) {
                            const correctShape = zone.dataset.shape;
                            turns--;
                            if (draggedShape === correctShape) score += 10;
                            await speakShape(draggedShape, correctShape);
                            updateGameState();
                            droppedCorrectly = true;
                            break;
                        }
                    }

                    if (!droppedCorrectly) {
                        // 👉 Reset vị trí về giữa
                        dragged.setAttribute('data-x', 0);
                        dragged.setAttribute('data-y', 0);
                        dragged.style.transform = "translate(-50%, -50%)";
                    }
                })();
            }
        }
    });
}

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