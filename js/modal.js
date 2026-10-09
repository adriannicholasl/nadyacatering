document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const authModalTitle = document.getElementById("authModalTitle");

  const switchToRegister = document.getElementById("switchToRegister");
  const switchToLogin = document.getElementById("switchToLogin");

  const userMenuBtn = document.getElementById("userMenuBtn");
  const userMenuName = document.getElementById("userMenuName");
  const userDropdown = document.getElementById("userDropdown");
  const logoutBtn = document.getElementById("logoutBtn");

  switchToRegister?.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.style.display = "none";
    registerForm.style.display = "block";
    if (authModalTitle) authModalTitle.textContent = "Daftar Akun Baru";
  });

  switchToLogin?.addEventListener("click", (e) => {
    e.preventDefault();
    registerForm.style.display = "none";
    loginForm.style.display = "block";
    if (authModalTitle) authModalTitle.textContent = "Masuk Akun";
  });

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      const uid = cred.user.uid;

      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists) {
        await db.collection("users").doc(uid).set({
          email: cred.user.email,
          provider: "email",
          role: "customer",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }

      alert("Login berhasil!");
      $("#loginModal").modal("hide");
      location.reload();
    } catch (err) {
      alert("Gagal login: " + err.message);
    }
  });

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nama = document.getElementById("regNama").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const notlp = document.getElementById("regNotlp").value.trim();
    const alamat = document.getElementById("regAlamat").value.trim();
    const password = document.getElementById("regPassword").value;

    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await db.collection("users").doc(cred.user.uid).set({
        nama: nama,
        email: email,
        notlp: notlp,
        alamat: alamat,
        provider: "email",
        role: "customer",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      alert("Pendaftaran berhasil! Silakan masuk.");
      registerForm.reset();
      registerForm.style.display = "none";
      loginForm.style.display = "block";
      if (authModalTitle) authModalTitle.textContent = "Masuk Akun";
    } catch (err) {
      alert("Gagal pendaftaran: " + err.message);
    }
  });

  // Monitoring Status Login & Injeksi Menu Dashboard jika Admin
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      try {
        const doc = await db.collection("users").doc(user.uid).get();
        const userData = doc.exists ? doc.data() : {};
        const nama = userData.nama || user.displayName || user.email;

        if (userMenuName) userMenuName.textContent = nama.split(" ")[0];

        // Cek Role Admin: Tambahkan Link Dashboard diatas Logout
        const adminContainer = document.getElementById("adminDropdownContainer");
        const role = String(userData.role || "").toLowerCase();

        if (role === "admin" && userDropdown) {
          if (!document.getElementById("linkAdminDashboard")) {
            const adminLink = document.createElement("a");
            adminLink.id = "linkAdminDashboard";
            adminLink.href = "admin.html";
            adminLink.innerHTML = '<i class="fa fa-th-large" style="color:#FF5200;"></i> <strong>Dashboard Admin</strong>';
            adminLink.style.borderTop = "1px solid #F1F5F9";
            adminLink.style.color = "#0F172A";

            if (logoutBtn) {
              userDropdown.insertBefore(adminLink, logoutBtn);
            } else {
              userDropdown.appendChild(adminLink);
            }
          }
        }
      } catch (e) {
        if (userMenuName) userMenuName.textContent = "Akun Saya";
      }
    } else {
      if (userMenuName) userMenuName.textContent = "Login / Daftar";
      const existingAdmin = document.getElementById("linkAdminDashboard");
      if (existingAdmin) existingAdmin.remove();
    }
  });

  userMenuBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (auth.currentUser) {
      userDropdown?.classList.toggle("show");
    } else {
      $("#loginModal").modal("show");
    }
  });

  logoutBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
      alert("Berhasil keluar.");
      window.location.href = "index.html";
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".user-menu-wrapper")) {
      userDropdown?.classList.remove("show");
    }
  });
});
