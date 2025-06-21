  document.addEventListener("DOMContentLoaded", () => {
    renderMenu();
  });

  function renderMenu() {
    document.getElementById("Menu").innerHTML = `
      <button id="menu-toggle"><i class="fa fa-bars" aria-hidden="true"></i></button>
      <h2 style="color: #ffffff;">My<span style="color: #ffcc66"> Books</span></h2>
      <div id="profile"></div>
      <nav id="Menu1">
        <a href="home.html"><i class="fa fa-home" aria-hidden="true"></i> Home</a>
        <a href="news.html"><i class="fa fa-newspaper-o" aria-hidden="true"></i> News</a>
        <a href="market.html"><i class="fa fa-book" aria-hidden="true"></i> Books</a>
        <a href="language.html"><i class="fa fa-globe" aria-hidden="true"></i> Language</a>
        <a href="myaccount.html"><i class="fa fa-address-book-o" aria-hidden="true"></i> My Account</a>
      </nav>
      <div id="logout"></div>
    `;

    // GÁN SỰ KIỆN CLICK SAU KHI MENU ĐÃ ĐƯỢC CHÈN VÀO DOM
    document.getElementById("menu-toggle").addEventListener("click", () => {
      document.getElementById("Menu1").classList.toggle("active");
    });
  }
