document.addEventListener("DOMContentLoaded", function () {
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

  // 1. Ambil Data Dokumen Utama Paket
  db.collection("paket")
    .doc(paketId)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        alert("Data paket tidak tersedia.");
        window.location.href = "index.html";
        return;
      }

      currentPaketData = doc.data();
      if (paketNama) paketNama.textContent = currentPaketData.nama || "Paket Catering";
      if (paketDeskripsi) paketDeskripsi.textContent = currentPaketData.deskripsi || "";
      if (paketImage) paketImage.src = currentPaketData.imageUrl || "images/default-menu.png";

      const formattedHarga = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(currentPaketData.harga || 0);

      if (paketHarga) paketHarga.textContent = formattedHarga;
    })
    .catch((err) => {
      console.error("Gagal memuat dokumen paket:", err);
    });

  // 2. Ambil Sub-koleksi "items" Secara Langsung (Realtime Listener)
  db.collection("paket")
    .doc(paketId)
    .collection("items")
    .onSnapshot(
      (snapshot) => {
        if (!itemsContainer) return;

        if (snapshot.empty) {
          itemsContainer.innerHTML = `
        <div class="col-xs-12 text-center" style="padding: 30px 0;">
          <p class="text-muted" style="font-size: 14px;">Belum ada hidangan menu yang ditambahkan ke paket ini.</p>
        </div>`;
          return;
        }

        const items = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });

        renderItems(items);
      },
      (error) => {
        console.error("Gagal memuat sub-koleksi items:", error);
        if (itemsContainer) {
          itemsContainer.innerHTML = `<div class="col-xs-12 text-center"><p class="text-danger">Gagal memuat menu: ${error.message}</p></div>`;
        }
      },
    );

  // Function Render Item Kartu Makanan
  function renderItems(items) {
    itemsContainer.innerHTML = "";
    items.forEach((item) => {
      const imgPath = item.imageUrl || item.foto || "images/default-menu.png";
      const rawName = item.nama || "Menu Makanan";
      const cleanName = rawName.replace(/_/g, " ");

      itemsContainer.innerHTML += `
        <div class="col-md-3 col-sm-4 col-xs-6" style="margin-bottom: 25px;">
          <div class="subitem-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); text-align: center;">
            <div style="width: 100%; height: 160px; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center;">
              <img src="${imgPath}" alt="${cleanName}" onerror="this.src='images/default-menu.png'" style="width: 100%; height: 100%; object-fit: cover; display: block;">
            </div>
            <div style="padding: 12px 10px;">
              <h5 style="font-weight: 700; font-size: 14px; color: #1e293b; margin: 0; line-height: 1.4;">${cleanName}</h5>
            </div>
          </div>
        </div>
      `;
    });
  }

  // Kontrol Porsi & Keranjang
  btnMinusPorsi?.addEventListener("click", () => {
    let val = parseInt(porsiInput.value || "1", 10);
    if (val > 1) porsiInput.value = val - 1;
  });

  btnPlusPorsi?.addEventListener("click", () => {
    let val = parseInt(porsiInput.value || "1", 10);
    porsiInput.value = val + 1;
  });

  btnAddToCart?.addEventListener("click", () => {
    if (!currentPaketData) return;
    const user = auth.currentUser;
    if (!user) {
      alert("Silakan login terlebih dahulu untuk menambah ke keranjang.");
      if (typeof $ !== "undefined" && $("#loginModal").length) {
        $("#loginModal").modal("show");
      }
      return;
    }

    const porsi = parseInt(porsiInput?.value || "1", 10);
    let cart = JSON.parse(localStorage.getItem("nadya_cart") || "[]");
    const idx = cart.findIndex((i) => i.paketId === paketId);

    if (idx > -1) {
      cart[idx].porsi += porsi;
    } else {
      cart.push({
        paketId: paketId,
        nama: currentPaketData.nama,
        harga: currentPaketData.harga || 0,
        porsi: porsi,
        imageUrl: currentPaketData.imageUrl || "images/default-menu.png",
      });
    }

    localStorage.setItem("nadya_cart", JSON.stringify(cart));
    const badge = document.getElementById("cartCountBadge");
    if (badge) {
      const total = cart.reduce((s, i) => s + i.porsi, 0);
      badge.textContent = total;
      badge.style.display = total > 0 ? "inline-block" : "none";
    }
    alert(`Berhasil menambahkan ${porsi} porsi "${currentPaketData.nama}" ke keranjang!`);
  });
});
