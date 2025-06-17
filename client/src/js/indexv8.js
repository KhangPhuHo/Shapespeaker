document.addEventListener("DOMContentLoaded", () => {
    let container = document.getElementById("content");
    loadProducts(container);
});

document.getElementById("menu-toggle").addEventListener("click", function () {
    document.getElementById("Menu1").classList.toggle("active");
});

// Tải danh sách sản phẩm từ Firestore
function loadProducts(container) {
    let htmls = "";
    db.collection("shapespeaknews")
        .orderBy("createdAt", "desc") // ✅ Sắp xếp theo thời gian mới nhất
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                container.innerHTML = "<tr><td colspan='7'>Không có bài báo nào.</td></tr>";
                return;
            }

            querySnapshot.forEach((doc) => {
                const coffee = doc.data();
                const coffeeId = doc.id;

                // Format ngày tạo
                let createdAt = coffee.createdAt && coffee.createdAt.toDate
                    ? coffee.createdAt.toDate()
                    : new Date();
                let createdAtFormatted = `${createdAt.getDate().toString().padStart(2, '0')}/${
                                              (createdAt.getMonth() + 1).toString().padStart(2, '0')}/${
                                              createdAt.getFullYear()} ${createdAt.getHours().toString().padStart(2, '0')}:${
                                              createdAt.getMinutes().toString().padStart(2, '0')}`;

                let updatedAt = coffee.updatedAt && coffee.updatedAt.toDate
                    ? coffee.updatedAt.toDate()
                    : new Date();
                let updatedAtFormatted = `${updatedAt.getDate().toString().padStart(2, '0')}/${
                                              (updatedAt.getMonth() + 1).toString().padStart(2, '0')}/${
                                              updatedAt.getFullYear()} ${updatedAt.getHours().toString().padStart(2, '0')}:${
                                              updatedAt.getMinutes().toString().padStart(2, '0')}`;

                htmls += `
                  <tr>
                      <td><img src="${coffee.picture}" style="width: 100px;"></td>
                      <td>${coffee.name}</td>
                      <td>${coffee.details}</td>
                      <td>${coffee.author}</td>
                      <td>${coffee.link}</td>
                      <td>${createdAtFormatted}</td>
                      <td>${updatedAtFormatted}</td>
                      <td><button onclick="deleteProduct('${coffeeId}')">Xóa</button></td>
                      <td><button onclick="getOneProduct('${coffeeId}')">Sửa</button></td>
                  </tr>
              `;
            });

            container.innerHTML = htmls;
        })
        .catch((error) => {
            console.error("Error fetching products: ", error);
            container.innerHTML = "<tr><td colspan='7'>Lỗi khi tải danh sách sản phẩm.</td></tr>";
        });
}

// Xóa sản phẩm
function deleteProduct(productId) {
    if (confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) {
        db.collection("shapespeaknews")
            .doc(productId)
            .delete()
            .then(() => {
                alert("Đã xóa sản phẩm thành công!");
                loadProducts(document.getElementById("content"));
            })
            .catch((error) => {
                console.error("Error removing product: ", error);
            });
    }
}

// Lấy thông tin sản phẩm
function getOneProduct(productId) {
    db.collection("shapespeaknews").doc(productId)
        .get()
        .then((doc) => {
            if (doc.exists) {
                const productItem = doc.data();
                if (productItem.picture) {
                    document.getElementById("preview-picture").src = productItem.picture;
                }
                document.getElementById("edit-name").value = productItem.name;
                document.getElementById("edit-details").value = productItem.details;
                document.getElementById("edit-author").value = productItem.author;
                document.getElementById("edit-link").value = productItem.link;
                document.getElementById("form-edit-product").dataset.productId = productId;
                openModal2();
            } else {
                alert("Sản phẩm không tồn tại!");
            }
        })
        .catch((error) => {
            console.error("Lỗi khi lấy sản phẩm:", error);
        });
}

// Cập nhật sản phẩm (có updatedAt)
async function updateProduct(event) {
    event.preventDefault();
    const productID = document.getElementById("form-edit-product").dataset.productId;
    let picture = document.getElementById("edit-picture").files[0];

    let productDataUpdate = {
        name: document.getElementById("edit-name").value,
        details: document.getElementById("edit-details").value,
        author: document.getElementById("edit-author").value,
        link: document.getElementById("edit-link").value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp() // ✅ Thêm thời gian cập nhật
    };

    if (picture) {
        const formData = new FormData();
        formData.append("image", picture);

        await fetch("http://localhost:3000/upload", {
            method: "POST",
            body: formData,
        })
            .then((response) => response.json())
            .then((result) => {
                productDataUpdate = { ...productDataUpdate, picture: result.data.secure_url };
            })
            .catch((error) => {
                console.error("Error uploading image:", error);
            });
    }

    db.collection("shapespeaknews").doc(productID).update(productDataUpdate)
        .then(() => {
            alert("Cập nhật sản phẩm thành công!");
            closeModal2();
            loadProducts(document.getElementById("content"));
        })
        .catch((error) => {
            alert("Lỗi khi cập nhật sản phẩm");
            console.error("Error updating product: ", error);
        });
}

// Thêm sản phẩm mới (có createdAt)
function AddProduct(newProduct) {
    db.collection("shapespeaknews").add({
        ...newProduct,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        alert("Thêm sản phẩm mới thành công!");
        loadProducts(document.getElementById("content"));
    })
    .catch((error) => {
        console.error("Error adding product: ", error);
    });
}


// Xử lý sự kiện thêm sản phẩm
async function handleAddProduct() {
    let picture = document.getElementById("picture").files[0];
    let name = document.getElementById("name").value;
    let details = document.getElementById("details").value;
    let author = document.getElementById("author").value;
    let link = document.getElementById("link").value;

    let newProduct = {
        name: name,
        details: details,
        author: author,
        link: link
    };

    if (picture) {
        const formData = new FormData();
        formData.append("image", picture);

        await fetch("http://localhost:3000/upload", {
            method: "POST",
            body: formData,
        })
            .then((response) => response.json())
            .then((result) => {
                newProduct = { ...newProduct, picture: result.data.secure_url };
            })
            .catch((error) => {
                console.error("Error uploading image:", error);
            });
    }

    AddProduct(newProduct);
}

// Gắn sự kiện cho form thêm sản phẩm
document.getElementById("form-new-product").addEventListener("submit", (e) => {
    e.preventDefault();
    handleAddProduct();
});
