document.addEventListener("DOMContentLoaded", async function () {
  const params = new URLSearchParams(window.location.search);
  const paketId = params.get("id");

  if (!paketId) {
    alert("Paket tidak ditemukan!");
    window.location.href = "index.html";
    return;
  }

  // Elemen DOM
  const paketNama = document.getElementById("paketNama");
  const paketHarga = document.getElementById("paketHarga");
  const paketDeskripsi = document.getElementById("paketDeskripsi");
  const paketImage = document.getElementById("paketImage");
  const itemsContainer = document.getElementById("itemsContainer");

  const porsiInput = document.getElementById("porsiInput");
  const btnMinusPorsi = document.getElementById("btnMinusPorsi");
  const btnPlusPorsi = document.getElementById("btnPlusPorsi");
  const btnAddToCart = document.getElementById("btnAddToCart");

  let currentPaketData = null;

  // --- HELPER LOCALSTORAGE KERANJANG ---
  function getCart() {
    return JSON.parse(localStorage.getItem("nadya_cart") || "[]");
  }

  function saveCart(cart) {
    localStorage.setItem("nadya_cart", JSON.stringify(cart));
    updateCartBadge();
  }

  function updateCartBadge() {
    const cart = getCart();
    const badge = document.getElementById("cartCountBadge");
    if (badge) {
      const totalQty = cart.reduce((sum, item) => sum + item.porsi, 0);
      badge.textContent = totalQty;
      badge.style.display = totalQty > 0 ? "inline-block" : "none";
    }
  }

  updateCartBadge();

  // --- KONTROL JUMLAH PORSI ---
  btnMinusPorsi?.addEventListener("click", () => {
    let val = parseInt(porsiInput.value || "1", 10);
    if (val > 1) porsiInput.value = val - 1;
  });

  btnPlusPorsi?.addEventListener("click", () => {
    let val = parseInt(porsiInput.value || "1", 10);
    porsiInput.value = val + 1;
  });

  // --- LOAD DATA PAKET DARI FIRESTORE ---
  try {
    const paketDoc = await db.collection("paket").doc(paketId).get();
    if (!paketDoc.exists) {
      alert("Data paket tidak tersedia.");
      window.location.href = "index.html";
      return;
    }

    currentPaketData = paketDoc.data();
    if (paketNama) paketNama.textContent = currentPaketData.nama || "Paket Catering";
    if (paketDeskripsi) {
      paketDeskripsi.textContent = currentPaketData.deskripsi || "Cita rasa lezat dan porsi memuaskan untuk acara spesial Anda.";
    }
    if (paketImage) {
      paketImage.src = currentPaketData.imageUrl || "images/default-menu.png";
    }

    const formattedHarga = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(currentPaketData.harga || 0);

    if (paketHarga) paketHarga.textContent = formattedHarga;

    // Load Items Sub-koleksi
    let itemsSnapshot;
    try {
      itemsSnapshot = await db.collection("paket").doc(paketId).collection("items").orderBy("order", "asc").get();
    } catch (e) {
      itemsSnapshot = await db.collection("paket").doc(paketId).collection("items").get();
    }

    if (itemsContainer) {
      itemsContainer.innerHTML = "";

      if (itemsSnapshot.empty) {
        itemsContainer.innerHTML = '<div class="col-xs-12 text-center"><p class="text-muted">Daftar menu detail sedang diperbarui.</p></div>';
      } else {
        itemsSnapshot.forEach((doc) => {
          const item = doc.data();
          itemsContainer.innerHTML += `
            <div class="col-md-3 col-sm-4 col-xs-6">
              <div class="subitem-card">
                <div class="subitem-img-wrapper">
                  <img src="${item.imageUrl || item.foto || "images/default-menu.png"}" alt="${item.nama || "Menu"}" class="subitem-img">
                </div>
                <div class="subitem-body">
                  <h5 class="subitem-title">${item.nama || "Menu"}</h5>
                </div>
              </div>
            </div>
          `;
        });
      }
    }
  } catch (err) {
    console.error("Gagal memuat detail paket:", err);
  }

  // --- AKSI TAMBAH KE KERANJANG ---
  // --- AKSI TAMBAH KE KERANJANG DENGAN CEK LOGIN ---
  btnAddToCart?.addEventListener("click", () => {
    if (!currentPaketData) return;

    // Cek Autentikasi Pengunjung
    const user = auth.currentUser;
    if (!user) {
      alert("Silakan login atau daftar akun terlebih dahulu untuk menambahkan paket ke keranjang.");
      $("#loginModal").modal("show");
      return;
    }

    const porsi = parseInt(porsiInput?.value || "1", 10);
    if (isNaN(porsi) || porsi < 1) {
      alert("Masukkan jumlah porsi yang valid.");
      return;
    }

    let cart = getCart();
    const existingIndex = cart.findIndex((item) => item.paketId === paketId);

    if (existingIndex > -1) {
      cart[existingIndex].porsi += porsi;
    } else {
      cart.push({
        paketId: paketId,
        nama: currentPaketData.nama,
        harga: currentPaketData.harga || 0,
        porsi: porsi,
        imageUrl: currentPaketData.imageUrl || "images/default-menu.png",
      });
    }

    saveCart(cart);
    alert(`Berhasil menambahkan ${porsi} porsi "${currentPaketData.nama}" ke keranjang!`);
  });
});
