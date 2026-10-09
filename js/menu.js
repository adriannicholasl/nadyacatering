document.addEventListener("DOMContentLoaded", async function () {
  const container = document.getElementById("menuContainer");
  if (!container) return;

  // Loader
  container.innerHTML = `
    <div class="col-xs-12 text-center" style="padding: 40px 0;">
      <i class="fa fa-circle-o-notch fa-spin fa-3x fa-fw" style="color: var(--primary, #ff5722);"></i>
      <p style="margin-top: 10px; color: var(--text-muted, #666);">Memuat menu paket lezat...</p>
    </div>
  `;

  try {
    let snapshot;
    try {
      snapshot = await db.collection("paket").orderBy("createAt", "asc").get();
    } catch (e) {
      snapshot = await db.collection("paket").get();
    }

    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = "<div class='col-xs-12 text-center'><p class='text-muted'>Belum ada paket tersedia saat ini.</p></div>";
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();

      const hargaFormatted = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(data.harga || 0);

      container.innerHTML += `
        <div class="col-md-4 col-sm-6">
          <div class="package-card">
            <div class="package-img-wrapper">
              <span class="package-badge">Terfavorit</span>
              <img src="${data.imageUrl || "images/default-menu.png"}" alt="${data.nama}">
            </div>
            <div class="package-body">
              <h3 class="package-title">${data.nama}</h3>
              <div class="package-price">${hargaFormatted}</div>
              <p class="package-desc">${data.deskripsi || "Sajian lezat porsi memuaskan untuk melengkapi acara Anda."}</p>
              <a href="menu.html?id=${doc.id}" class="btn-detail-package">
                Lihat Detail Paket <i class="fa fa-arrow-right" style="margin-left: 5px;"></i>
              </a>
            </div>
          </div>
        </div>
      `;
    });
  } catch (err) {
    console.error("Gagal memuat paket:", err);
    container.innerHTML = "<div class='col-xs-12 text-center'><p class='text-danger'>Gagal memuat data paket catering.</p></div>";
  }
});
