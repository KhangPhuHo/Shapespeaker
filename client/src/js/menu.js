document.addEventListener("DOMContentLoaded", () => {
  renderMenu();
});

function renderMenu() {
  document.getElementById("Menu").innerHTML = `
  <header class="fixed w-full top-0 left-0 bg-white z-50 shadow-sm">
        <nav class="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
            <button id="menu-toggle" class="md:hidden text-xl"><i class="fa fa-bars"></i></button>
            <a href="home.html" class="flex items-center text-indigo-700 font-extrabold space-x-2">
                <i class="fa-solid fa-shapes text-indigo-600 text-3xl"></i>
                <span class="text-lg md:text-xl">ShapeSpeak</span>
            </a>
            <!-- Menu Laptop (hiển thị ngang) -->
<nav id="Menu1" class="hidden md:flex space-x-6 text-gray-700 text-base font-medium items-center">
    <a href="home.html" class="flex items-center gap-2 hover:text-indigo-600" ><i class="fa fa-home"></i> <span data-i18n="menu.home">Home</span></a>
    <a href="news.html" class="flex items-center gap-2 hover:text-indigo-600" ><i class="fa fa-newspaper"></i> <span data-i18n="menu.news">News</span></a>
    <a href="store.html" class="flex items-center gap-2 hover:text-indigo-600" ><i class="fa fa-book"></i> <span data-i18n="menu.store">Store</span></a>
    <a href="Language.html" class="flex items-center gap-2 hover:text-indigo-600" ><i class="fa fa-globe"></i> <span data-i18n="menu.language">Language</span></a>
</nav>

<!-- Menu Mobile Dropdown (hiển thị khi active) -->
<nav id="Menu1-mobile" class="hidden flex-col items-center text-center space-y-4 text-gray-700 text-base font-medium bg-white absolute w-full left-0 top-[71px] z-[1000] py-4 shadow-lg md:hidden">
    <a href="home.html" class="flex items-center gap-2 hover:text-indigo-600" ><i class="fa fa-home"></i>  <span data-i18n="menu.home">Home</span></a>
    <a href="news.html" class="flex items-center gap-2 hover:text-indigo-600" ><i class="fa fa-newspaper"></i>  <span data-i18n="menu.news">News</span></a>
    <a href="store.html" class="flex items-center gap-2 hover:text-indigo-600" ><i class="fa fa-book"></i>  <span data-i18n="menu.store">Store</span></a>
    <a href="Language.html" class="flex items-center gap-2 hover:text-indigo-600" ><i class="fa fa-globe"></i>  <span data-i18n="menu.language">Language</span></a>
</nav>

            <div id="profile" class="relative"></div>

            <div id="popup"
                class="hidden absolute right-10 mt-3 sm:right-10 sm:mt-3 sm:w-56 right-4 top-16 max-w-xs bg-white border rounded-lg shadow-lg z-50 p-4 flex flex-col items-center text-center">
                <div id="myaccount" class="mb-2"></div>
                <br>
                <a href="myaccount.html" class="text-indigo-600 font-semibold" ><i class="fa fa-address-book" aria-hidden="true"></i> <span data-i18n="menu.my_account">My Account</span></a>
              <a href="cart.html" class="text-indigo-600 font-semibold"><i class="fa-solid fa-cart-shopping"
                        aria-hidden="true"></i> <span data-i18n="menu.cart">Cart</span> </a>
                <br>
                <div id="logout"></div>
            </div>
        </nav>
    </header>`;

  // GÁN SỰ KIỆN CLICK SAU KHI MENU ĐÃ ĐƯỢC CHÈN VÀO DOM
  document.getElementById("menu-toggle").addEventListener("click", () => {
    document.getElementById("Menu1").classList.toggle("active");
  });
}
document.getElementById("menu-toggle").addEventListener("click", () => {
  document.getElementById("Menu1-mobile").classList.toggle("hidden");
});
