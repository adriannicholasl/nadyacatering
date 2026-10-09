document.addEventListener("DOMContentLoaded", () => {
  const nama = document.getElementById("profileNama");
  const email = document.getElementById("profileEmail");
  const notlp = document.getElementById("profileNotlp");
  const alamat = document.getElementById("profileAlamat");
  const form = document.getElementById("profileForm");

  // Sidebar elements
  const sidebarNama = document.getElementById("profileSidebarName");
  const sidebarEmail = document.getElementById("profileSidebarEmail");

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      alert("Silakan login terlebih dahulu");
      window.location.href = "index.html";
      return;
    }

    try {
      const doc = await db.collection("users").doc(user.uid).get();
      if (doc.exists) {
        const data = doc.data();
        // Isi form
        if (nama) nama.value = data.nama || "";
        if (email) email.value = data.email || user.email || "";
        if (notlp) notlp.value = data.notlp || "";
        if (alamat) alamat.value = data.alamat || "";

        // Update sidebar
        if (sidebarNama) sidebarNama.textContent = data.nama || "Pengguna";
        if (sidebarEmail) sidebarEmail.textContent = data.email || user.email || "-";
      } else {
        // Fallback dari Firebase Auth
        if (email) email.value = user.email || "";
        if (sidebarNama) sidebarNama.textContent = user.displayName || "Pengguna";
        if (sidebarEmail) sidebarEmail.textContent = user.email || "-";
      }
    } catch (err) {
      console.error("Gagal memuat profil:", err);
      if (sidebarNama) sidebarNama.textContent = "Pengguna";
      if (sidebarEmail) sidebarEmail.textContent = user.email || "-";
    }
  });

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const user = auth.currentUser;
      if (!user) return;

      const submitBtn = form.querySelector("button[type=submit]");
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Menyimpan...';

      try {
        const updateData = {
          nama: nama.value.trim(),
          notlp: notlp.value.trim(),
          alamat: alamat.value.trim(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection("users").doc(user.uid).update(updateData);

        // Update sidebar langsung
        if (sidebarNama) sidebarNama.textContent = updateData.nama || "Pengguna";

        alert("Profil berhasil diperbarui!");
      } catch (err) {
        console.error("Gagal update profil:", err);
        alert("Gagal menyimpan: " + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
});
