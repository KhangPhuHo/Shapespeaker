// ✅ multiplemedia.js — upload nhiều ảnh / video dùng Cloudinary
import { showToast } from "./toast.js";

const API_UPLOAD = "https://shapespeaker.onrender.com/upload";

// Mảng tạm chứa file đã chọn (giống ChatGPT image uploader)
export let selectedFiles = [];

/**
 * Preview ảnh / video và cho phép xóa, reorder, thêm mới
 * @param {FileList | File[]} files
 * @param {HTMLElement} previewBox
 */

export function renderMediaPreview(files, previewBox) {
  if (!previewBox) return;
  selectedFiles = Array.from(files);
  previewBox.innerHTML = "";

  // ✅ Giao diện lưới 4 cột
  previewBox.classList.add("grid", "grid-cols-4", "gap-2");

  // Ẩn box nếu không có file
  if (selectedFiles.length === 0) {
    previewBox.classList.add("hidden");
  } else {
    previewBox.classList.remove("hidden");
  }

  // ✅ Hiển thị từng media
  selectedFiles.forEach((file, index) => {
    const isVideo = file.type.startsWith("video");
    const url = file.url ? file.url : URL.createObjectURL(file);

    const wrapper = document.createElement("div");
    wrapper.className =
      "relative group w-full aspect-square border border-gray-400 rounded overflow-hidden";
    wrapper.draggable = true;
    wrapper.dataset.index = index;

    wrapper.innerHTML = `
      ${isVideo
        ? `<video src="${url}" class="w-full h-full object-cover" muted></video>`
        : `<img src="${url}" class="w-full h-full object-cover" />`}
      <button type="button"
        class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 
               flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
        data-index="${index}">
        ✕
      </button>
    `;

    previewBox.appendChild(wrapper);
  });

  // ✅ Ô thêm ảnh/video mới (ô “+”)
  const addBox = document.createElement("label");
  addBox.className = `
  flex items-center justify-center
  aspect-square w-22 border-2 border-dashed border-gray-400 text-gray-400
  rounded cursor-pointer hover:border-gray-500 hover:text-gray-500
`;

  addBox.innerHTML = `
  <div class="flex items-center justify-center h-full w-full">
    <span class="text-3xl font-bold text-gray-400 select-none leading-none transform -translate-y-1">+</span>
  </div>
`;

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.accept = "image/*,video/*";
  fileInput.classList.add("hidden");

  addBox.appendChild(fileInput);
  previewBox.appendChild(addBox);

  // ✅ Khi chọn file mới → thêm vào danh sách
  fileInput.addEventListener("change", (e) => {
    const newFiles = Array.from(e.target.files);
    selectedFiles.push(...newFiles);
    renderMediaPreview(selectedFiles, previewBox);
    e.target.value = ""; // Cho phép chọn lại cùng file
  });

  // ✅ Xóa item
  previewBox.querySelectorAll("button[data-index]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.target.dataset.index);
      selectedFiles.splice(idx, 1);
      renderMediaPreview(selectedFiles, previewBox);
    });
  });

  // ✅ Drag & Drop reorder
  let dragStartIndex = null;
  previewBox.querySelectorAll(".group").forEach((item) => {
    item.addEventListener("dragstart", (e) => {
      dragStartIndex = Number(e.currentTarget.dataset.index);
      e.dataTransfer.effectAllowed = "move";
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    item.addEventListener("drop", (e) => {
      e.preventDefault();
      const dropIndex = Number(e.currentTarget.dataset.index);
      if (dragStartIndex === null || dragStartIndex === dropIndex) return;

      const [moved] = selectedFiles.splice(dragStartIndex, 1);
      selectedFiles.splice(dropIndex, 0, moved);
      renderMediaPreview(selectedFiles, previewBox);
    });
  });
}

/**
 * Upload toàn bộ media đang được chọn lên Cloudinary
 * @returns {Promise<Array>} Danh sách {url, type}
 */
export async function uploadMultipleMedia() {
  if (selectedFiles.length === 0) return [];

  showToast("⏳ Đang upload hình ảnh / video...", "info");

  const uploaded = [];

  for (let file of selectedFiles) {
    if (file.size > 150 * 1024 * 1024) {
      showToast(`❌ File ${file.name} quá 150MB`, "error");
      continue;
    }

    const formData = new FormData();
    formData.append("media", file);

    try {
      const res = await fetch(API_UPLOAD, { method: "POST", body: formData });
      const result = await res.json();

      if (result?.success && result.data?.secure_url) {
        const type = file.type.startsWith("video") ? "video" : "image";
        uploaded.push({ url: result.data.secure_url, type });
      } else {
        console.warn("Upload lỗi:", result);
      }
    } catch (err) {
      console.error("❌ Lỗi upload:", err);
      showToast("❌ Lỗi upload file!", "error");
    }
  }

  if (uploaded.length > 0)
    showToast(`✅ Upload thành công ${uploaded.length} file!`, "success");
  else
    showToast(`⚠️ Không có file nào upload thành công.`, "warning");

  return uploaded;
}

/**
 * Hiển thị lại danh sách media đã có sẵn từ Firestore (dành cho chỉnh sửa sản phẩm)
 * @param {Array} existingMedia - Danh sách media [{url, type}]
 * @param {HTMLElement} previewBox - Phần tử chứa preview
 */
export function renderExistingMedia(existingMedia = [], previewBox) {
  if (!previewBox) return;
  previewBox.innerHTML = "";

  if (!existingMedia.length) {
    previewBox.classList.add("hidden");
    return;
  }

  // ✅ Gán media cũ vào selectedFiles (để vẫn xoá và reorder được)
  selectedFiles = existingMedia.map(m => ({
    name: m.url,
    type: m.type === "video" ? "video/mp4" : "image/jpeg",
    url: m.url,
    isExisting: true
  }));

  // ✅ Dùng lại hàm renderMediaPreview() — sẽ tự thêm ô “+” cuối
  renderMediaPreview(selectedFiles, previewBox);
}