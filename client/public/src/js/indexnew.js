// ✅ news-manager.js
import { db } from "./firebase-config.js";
import { showToast } from "./toast.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import { renderMediaPreview, uploadMultipleMedia, renderExistingMedia, selectedFiles } from "./multiplemedia.js";

const API_BASE_URL = "https://shapespeaker.onrender.com";

// ✅ DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("content");
  loadProducts(container);
});

// ✅ Load danh sách bài báo
async function loadProducts(container) {
  let htmls = "";
  try {
    const q = query(collection(db, "shapespeaknews"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      container.innerHTML = "<tr><td colspan='9'>Không có bài báo nào.</td></tr>";
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const news = docSnap.data();
      const newsId = docSnap.id;

      const formatDate = (timestamp) => {
        const date = timestamp?.toDate?.() || new Date();
        return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")
          }/${date.getFullYear()} ${date.getHours().toString().padStart(2, "0")}:${date
            .getMinutes()
            .toString()
            .padStart(2, "0")}`;
      };

      htmls += `
        <tr>
          <td><img src="${news.picture || '../img/shapespeakicon.jpg'}" style="width: 100px;"></td>
          <td>${news.name}</td>
          <td>${news.details}</td>
          <td>${news.author}</td>
          <td>
          <button onclick="location.href='edit-product-intro.html?productId=${newsId}'"
          class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
          Chỉnh sửa giới thiệu
          </button>
          </td>
          <td>${formatDate(news.createdAt)}</td>
          <td>${formatDate(news.updatedAt)}</td>
          <td><button onclick="deleteProduct('${newsId}')">Xóa</button></td>
          <td><button onclick="getOneProduct('${newsId}')">Sửa</button></td>
        </tr>
      `;
    });

    container.innerHTML = htmls;
  } catch (error) {
    console.error("❌ Error fetching news:", error);
    showToast("❌ Lỗi khi tải danh sách bài báo", "error");
    container.innerHTML = "<tr><td colspan='9'>Lỗi khi tải danh sách bài báo.</td></tr>";
  }
}

// ✅ Xoá bài báo
window.deleteProduct = async (newsId) => {
  if (confirm("Bạn có chắc chắn muốn xóa bài báo này?")) {
    try {
      await deleteDoc(doc(db, "shapespeaknews", newsId));
      showToast("✅ Đã xóa bài báo!", "success");
      loadProducts(document.getElementById("content"));
    } catch (error) {
      showToast("❌ Lỗi khi xóa bài báo!", "error");
      console.error("❌ Error deleting news:", error);
    }
  }
};

// ✅ Lấy chi tiết bài báo
window.getOneProduct = async (newsId) => {
  try {
    const docSnap = await getDoc(doc(db, "shapespeaknews", newsId));

    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById("preview-picture-edit").src = data.picture || "../img/shapespeakicon.jpg";
      document.getElementById("edit-name").value = data.name || "";
      document.getElementById("edit-details").value = data.details || "";
      document.getElementById("edit-author").value = data.author || "";
      document.getElementById("form-edit-product").dataset.productId = newsId;

      // --- Hiển thị media phụ có sẵn ---
      const previewBox = document.getElementById("edit-mediaPreview");
      if (data.media && Array.isArray(data.media)) {
        renderExistingMedia(data.media, previewBox);
      } else {
        previewBox.innerHTML =
          "<p class='text-gray-400 text-sm'>Không có hình ảnh / video phụ.</p>";
      }

      openModal2();
    } else {
      showToast("❌ Bài báo không tồn tại!", "error");
    }
  } catch (error) {
    console.error("❌ Error getting news:", error);
    showToast("❌ Lỗi khi lấy bài báo!", "error");
  }
};

// ✅ Cập nhật bài báo
window.updateProduct = async (event) => {
  event.preventDefault();
  const newsId = document.getElementById("form-edit-product").dataset.productId;
  const pictureFile = document.getElementById("edit-picture").files[0];

  let updatedData = {
    name: document.getElementById("edit-name").value,
    details: document.getElementById("edit-details").value,
    author: document.getElementById("edit-author").value,
    updatedAt: serverTimestamp(),
  };

  if (pictureFile) {
    const formData = new FormData();
    formData.append("media", pictureFile);

    try {
      // const response = await fetch(`${API_BASE_URL}/upload`, {
      //   method: "POST",
      //   body: formData,
      // });
      // const result = await response.json();
      // updatedData.picture = result.data.secure_url;

      const res = await fetch(`${API_BASE_URL}/upload`, { method: "POST", body: formData });
      const result = await res.json();
      if (result?.success) {
        updatedData.picture = result.data.secure_url;
      } else {
        showToast("❌ Upload ảnh thumbnail thất bại!", "error");
      }

    } catch (error) {
      console.error("❌ Lỗi khi upload ảnh:", error);
      showToast("❌ Lỗi khi upload ảnh!", "error");
    }
  }

  // --- Upload media phụ mới nếu có ---
  let newUploaded = [];
  try {
    // Upload chỉ những file là File object (người dùng mới thêm)
    const newFiles = selectedFiles.filter(f => f instanceof File);
    if (newFiles.length > 0) {
      newUploaded = await uploadMultipleMedia();
    }

    // Giữ lại media cũ chưa bị xoá
    const remainingMedia = selectedFiles
      .filter(f => f.url) // có url nghĩa là media cũ
      .map(f => ({
        url: f.url,
        type: f.type.startsWith("video") ? "video" : "image",
      }));

    updatedData.media = [...remainingMedia, ...newUploaded];
  } catch (err) {
    console.error("Lỗi xử lý media phụ:", err);
    showToast("❌ Lỗi upload hoặc lưu media phụ!", "error");
  }

  // --- Lưu Firestore ---
  try {
    await updateDoc(doc(db, "shapespeaknews", newsId), updatedData);
    showToast("✅ Cập nhật bài báo thành công!", "success");
    closeModal2();
    loadProducts(document.getElementById("content"));
  } catch (error) {
    console.error("❌ Error updating news:", error);
    showToast("❌ Lỗi khi cập nhật bài báo!", "error");
  }
};

// ✅ Thêm bài báo mới
async function AddProduct(newProduct) {
  try {
    await addDoc(collection(db, "shapespeaknews"), {
      ...newProduct,
      createdAt: serverTimestamp(),
    });
    showToast("✅ Thêm bài báo thành công!", "success");
    loadProducts(document.getElementById("content"));
  } catch (error) {
    console.error("❌ Error adding news:", error);
    showToast("❌ Lỗi khi thêm bài báo!", "error");
  }
}

// --- GẮN preview khi người dùng chọn file ---
const mediaInput = document.getElementById("mediaFiles");
const mediaPreview = document.getElementById("mediaPreview");

if (mediaInput && mediaPreview) {
  mediaInput.addEventListener("change", (e) => {
    renderMediaPreview(e.target.files, mediaPreview);
    e.target.value = ""; // ✅ Reset input mỗi lần chọn
  });
}

// --- Preview cho form sửa sản phẩm ---
const editMediaInput = document.getElementById("edit-mediaFiles");
const editMediaPreview = document.getElementById("edit-mediaPreview");

// replace (thay thế toàn bộ selectedFiles bằng file mới)
if (editMediaInput && editMediaPreview) {
  editMediaInput.addEventListener("change", (e) => {
    const newFiles = Array.from(e.target.files);
    // Thay thế nội dung của selectedFiles bằng file mới
    selectedFiles.length = 0;
    selectedFiles.push(...newFiles);

    renderMediaPreview(selectedFiles, editMediaPreview);

    // Reset input nếu muốn chọn lại cùng file
    editMediaInput.value = null;
  });
}

// ✅ Xử lý submit thêm bài báo
async function handleAddProduct() {
  const picture = document.getElementById("picture").files[0];
  let newProduct = {
    name: document.getElementById("name").value,
    details: document.getElementById("details").value,
    author: document.getElementById("author").value,
  };

  if (picture) {
    const formData = new FormData();
    formData.append("media", picture);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (result?.success) {
        newProduct.picture = result.data.secure_url;
      } else {
        showToast("❌ Upload ảnh thumbnail thất bại!", "error");
      }

    } catch (error) {
      console.error("❌ Lỗi khi upload ảnh:", error);
      showToast("❌ Lỗi khi upload ảnh!", "error");
    }
  }

    // ✅ 2. Upload media phụ nếu có
    let uploadedMedia = [];
    if (selectedFiles.length > 0) {
      try {
        uploadedMedia = await uploadMultipleMedia();
        newProduct.media = uploadedMedia;
      } catch (err) {
        console.error("Lỗi upload media phụ:", err);
        showToast("❌ Lỗi upload media phụ!", "error");
      }
    }
  
    // ✅ 3. Lưu Firestore hoặc server
    console.log("✅ Dữ liệu sản phẩm mới:", newProduct);
  await AddProduct(newProduct);
  
    // ✅ 4. Reset form
    document.getElementById("form-new-product").reset();
    selectedFiles.length = 0;
    mediaPreview.innerHTML = "";
    document.getElementById("preview-picture-new").style.display = "none";
  
    showToast("🎉 Sản phẩm đã được thêm!", "success");
}

// ✅ Gắn sự kiện cho form
document.getElementById("form-new-product").addEventListener("submit", (e) => {
  e.preventDefault();
  handleAddProduct();
});
