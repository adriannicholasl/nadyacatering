document.addEventListener("DOMContentLoaded", () => {
  // Proteksi Halaman Admin
  auth.onAuthStateChanged(async (user) => {
    const isAdminPage = window.location.pathname.toLowerCase().includes("admin");

    if (isAdminPage) {
      if (!user) {
        window.location.href = "index.html";
        return;
      }

      try {
        let userData = null;
        let doc = await db.collection("users").doc(user.uid).get();

        if (doc.exists) {
          userData = doc.data();
        } else {
          // Fallback pencarian dokumen berdasarkan UID/Email jika ID dokumen berbeda
          const q = await db.collection("users").where("email", "==", user.email).get();
          if (!q.empty) userData = q.docs[0].data();
        }

        if (userData) {
          const role = (userData.role || "").toLowerCase();
          if (role !== "admin") {
            alert("Akses ditolak! Anda bukan Administrator.");
            window.location.href = "index.html";
          } else {
            const adminMenuName = document.getElementById("adminMenuName");
            if (adminMenuName) adminMenuName.textContent = userData.nama || userData.namaLengkap || "Admin";
          }
        } else {
          window.location.href = "index.html";
        }
      } catch (err) {
        console.error("Gagal verifikasi admin:", err);
      }
    }
  });

  // Form Login
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;

      try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        let userData = null;
        let doc = await db.collection("users").doc(user.uid).get();

        if (doc.exists) {
          userData = doc.data();
        } else {
          const q = await db.collection("users").where("email", "==", user.email).get();
          if (!q.empty) userData = q.docs[0].data();
        }

        if (userData) {
          const role = (userData.role || "").toLowerCase();
          if (role === "admin") {
            window.location.href = "admin.html";
          } else {
            const loginModal = document.getElementById("loginModal");
            if (loginModal) loginModal.style.display = "none";
            window.location.reload();
          }
        } else {
          alert("Data pengguna tidak ditemukan di database.");
        }
      } catch (err) {
        alert("Gagal Login: " + err.message);
      }
    });
  }
});
