document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("cartItemsContainer");
  const totalPriceEl = document.getElementById("cartTotalPrice");
  const checkoutForm = document.getElementById("cartCheckoutForm");

  // Proteksi Akses Cart: Wajib Login
  auth.onAuthStateChanged((user) => {
    if (!user) {
      alert("Anda harus masuk (login) terlebih dahulu untuk mengakses keranjang pesanan.");
      $("#loginModal").modal("show");
    }
  });

  function getCart() {
    return JSON.parse(localStorage.getItem("nadya_cart") || "[]");
  }

  function saveCart(cart) {
    localStorage.setItem("nadya_cart", JSON.stringify(cart));
    renderCart();
  }

  function formatRupiah(number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number || 0);
  }

  function renderCart() {
    const cart = getCart();
    if (!container) return;

    if (cart.length === 0) {
      container.innerHTML = `
        <div style="padding: 40px 0; text-align: center;">
          <i class="fa fa-shopping-basket" style="font-size: 48px; color: #CBD5E1;"></i>
          <p style="margin-top: 12px; color: #64748B; font-weight: 600;">Keranjang Anda masih kosong.</p>
          <a href="index.html#menu" class="btn btn-sm" style="background: #FF5200; color:#FFF; font-weight:700; border: none; margin-top: 10px; border-radius: 8px; padding: 8px 16px;">Pilih Paket Menu</a>
        </div>
      `;
      if (totalPriceEl) totalPriceEl.textContent = formatRupiah(0);
      return;
    }

    let grandTotal = 0;
    let html = "";

    cart.forEach((item, index) => {
      const subtotal = (item.harga || 0) * (item.porsi || 1);
      grandTotal += subtotal;

      html += `
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F1F5F9; padding: 14px 0;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${item.imageUrl || "images/default-menu.png"}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 10px;">
            <div>
              <h5 style="margin: 0; font-weight: 700; color: #0F172A; font-size:14px;">${item.nama}</h5>
              <span style="font-size: 13px; color: #64748B;">${formatRupiah(item.harga)} / paket</span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="display: flex; align-items: center; border: 1px solid #CBD5E1; border-radius: 8px; background:#F8FAFC;">
              <button type="button" onclick="changeQty(${index}, -1)" class="btn btn-xs" style="border:none; padding:4px 10px; font-weight:bold;">-</button>
              <span style="padding: 0 8px; font-weight: bold; font-size: 13px; color:#0F172A;">${item.porsi}</span>
              <button type="button" onclick="changeQty(${index}, 1)" class="btn btn-xs" style="border:none; padding:4px 10px; font-weight:bold;">+</button>
            </div>
            <strong style="min-width: 100px; text-align: right; color: #FF5200; font-size:14px;">${formatRupiah(subtotal)}</strong>
            <button type="button" onclick="removeItem(${index})" class="btn btn-link" style="color: #EF4444; padding: 0 4px;"><i class="fa fa-trash-o fa-lg"></i></button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    if (totalPriceEl) totalPriceEl.textContent = formatRupiah(grandTotal);
  }

  window.changeQty = function (index, delta) {
    let cart = getCart();
    if (cart[index]) {
      cart[index].porsi += delta;
      if (cart[index].porsi < 1) cart[index].porsi = 1;
      saveCart(cart);
    }
  };

  window.removeItem = function (index) {
    let cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
  };

  renderCart();

  // Submit Pesanan
  checkoutForm?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("Silakan login terlebih dahulu untuk membuat pesanan.");
      $("#loginModal").modal("show");
      return;
    }

    const cart = getCart();
    if (cart.length === 0) {
      alert("Keranjang belanja masih kosong.");
      return;
    }

    const namaKegiatan = document.getElementById("cartNamaKegiatan").value.trim();
    const lokasiAcara = document.getElementById("cartLokasiAcara").value.trim();
    const waktuKegiatan = document.getElementById("cartWaktuKegiatan").value;
    const metodePembayaran = document.getElementById("cartMetodePembayaran").value;
    const catatan = document.getElementById("cartCatatan").value.trim();

    const btn = document.getElementById("btnSubmitCartOrder");
    const oldText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Memproses Pesanan...';

    let totalHarga = 0;
    let totalPorsi = 0;
    let paketList = [];

    cart.forEach((item) => {
      const porsi = Number(item.porsi || 1);
      totalHarga += (item.harga || 0) * porsi;
      totalPorsi += porsi;
      paketList.push(`${item.nama} (${porsi} Porsi)`);
    });

    try {
      const userDoc = await db.collection("users").doc(user.uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      const namaPemesan = userData.nama || user.displayName || "Pelanggan";
      const noTelp = userData.notlp || userData.telepon || userData.noHp || "-";

      const orderPayload = {
        userId: user.uid,
        namaPemesan: namaPemesan,
        telepon: noTelp,
        email: user.email,
        items: cart,
        namaPaket: paketList.join(", "),
        jumlahPorsi: totalPorsi,
        namaKegiatan: namaKegiatan,
        lokasiAcara: lokasiAcara,
        tanggalAcara: new Date(waktuKegiatan).toLocaleString("id-ID", {
          dateStyle: "full",
          timeStyle: "short",
        }),
        waktuKegiatan: firebase.firestore.Timestamp.fromDate(new Date(waktuKegiatan)),
        metodePembayaran: metodePembayaran,
        catatan: catatan || "-",
        totalHarga: totalHarga,
        totalBiaya: totalHarga,
        status: "Pending",
        paymentStatus: "Unpaid",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("orders").add(orderPayload);

      // Kosongkan Keranjang
      localStorage.removeItem("nadya_cart");

      // Redirect ke Halaman Detail & Info Pembayaran Baru
      window.location.href = `order-success.html?orderId=${docRef.id}`;
    } catch (err) {
      console.error(err);
      alert("Gagal membuat pesanan: " + err.message);
      btn.disabled = false;
      btn.innerHTML = oldText;
    }
  });
});
