document.addEventListener("DOMContentLoaded", () => {
  let monthlySalesChartInstance = null;
  let statisticsAreaChartInstance = null;
  let locationChartInstance = null;
  let packagePopularityChartInstance = null;

  let currentOrdersData = [];
  let currentPaymentsData = [];
  let usersMap = {};
  let currentStatTab = "Overview";
  let activePeriodFilter = "year2026";

  setupUIInteractions();

  if (typeof auth !== "undefined") {
    auth.onAuthStateChanged((user) => {
      if (user) {
        initRealtimeDashboard();
      }
    });
  }

  function setupUIInteractions() {
    // 1. Toggle Sidebar (Hide / Show)
    const btnToggle = document.getElementById("btnToggleSidebar");
    const sidebar = document.getElementById("mainSidebar");
    const content = document.getElementById("mainContentWrapper");

    btnToggle?.addEventListener("click", () => {
      sidebar?.classList.toggle("sidebar-collapsed");
      content?.classList.toggle("content-expanded");
    });

    // 2. Submenu Dashboard di Sidebar
    const btnMenu = document.getElementById("btnMenuDashboard");
    const submenu = document.getElementById("submenuDashboard");
    const iconMenu = document.getElementById("iconMenuDashboard");
    btnMenu?.addEventListener("click", () => {
      submenu?.classList.toggle("hidden");
      iconMenu?.classList.toggle("rotate-180");
    });

    // 3. User Profile Dropdown
    const btnUser = document.getElementById("btnUserDropdown");
    const menuUser = document.getElementById("menuUserProfile");
    btnUser?.addEventListener("click", (e) => {
      e.stopPropagation();
      menuUser?.classList.toggle("hidden");
      document.getElementById("notifDropdown")?.classList.add("hidden");
    });

    // 4. Notification Dropdown
    const btnNotif = document.getElementById("btnNotifToggle");
    const notifDrop = document.getElementById("notifDropdown");
    btnNotif?.addEventListener("click", (e) => {
      e.stopPropagation();
      notifDrop?.classList.toggle("hidden");
      menuUser?.classList.add("hidden");
    });

    document.addEventListener("click", () => {
      menuUser?.classList.add("hidden");
      notifDrop?.classList.add("hidden");
    });

    // 5. Logout
    const logoutHandler = (e) => {
      e.preventDefault();
      if (confirm("Apakah Anda yakin ingin keluar?")) {
        auth.signOut().then(() => (window.location.href = "index.html"));
      }
    };
    document.getElementById("adminLogoutBtn")?.addEventListener("click", logoutHandler);
    document.getElementById("dropdownLogoutBtn")?.addEventListener("click", logoutHandler);

    // 6. Pill Tabs (Ikhtisar, Pesanan, Omset)
    const tabMap = {
      tabOverview: "Overview",
      tabSales: "Sales",
      tabRevenue: "Revenue",
    };

    Object.keys(tabMap).forEach((id) => {
      const btn = document.getElementById(id);
      btn?.addEventListener("click", () => {
        currentStatTab = tabMap[id];
        document.querySelectorAll(".stat-tab-btn").forEach((b) => {
          b.classList.remove("bg-white", "shadow-xs", "text-slate-900");
          b.classList.add("text-slate-600");
        });
        btn.classList.add("bg-white", "shadow-xs", "text-slate-900");
        btn.classList.remove("text-slate-600");
        renderStatisticsAreaChart(getFilteredOrders(), getFilteredPayments());
      });
    });

    // 7. Filter Waktu (Tahun 2026, Bulan Ini, Mingguan / 7 Hari)
    const selectFilter = document.getElementById("selectPeriodFilter");
    selectFilter?.addEventListener("change", (e) => {
      activePeriodFilter = e.target.value;
      const textLabels = {
        all: "Semua Waktu",
        year2026: "Tahun 2026",
        thisMonth: "Bulan Ini",
        last7days: "Mingguan (7 Hari)",
      };

      const selectedText = textLabels[activePeriodFilter] || "Tahun 2026";
      const statLabel = document.getElementById("statDateRangeLabel");
      const salesLabel = document.getElementById("salesChartPeriodLabel");

      if (statLabel) statLabel.textContent = selectedText;
      if (salesLabel) salesLabel.textContent = selectedText;

      refreshDashboardViews();
    });

    // 8. Pencarian Instan Global
    const searchInput = document.getElementById("inputSearchGlobal");
    searchInput?.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      filterRecentOrdersTable(query);
    });

    // 9. Shortcut ⌘K / Ctrl+K
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("inputSearchGlobal")?.focus();
      }
    });

    // 10. Ekspor CSV
    document.getElementById("btnDownloadData")?.addEventListener("click", () => {
      exportOrdersToCSV(getFilteredOrders());
    });
  }

  // Parser Tanggal Aman: Mengembalikan null jika format tanggal rusak
  function parseOrderDate(item) {
    if (!item) return null;
    const val = item.createdAt || item.createAt || item.waktuKegiatan;
    if (!val) return null;

    if (typeof val.toDate === "function") return val.toDate();
    if (typeof val.toMillis === "function") return new Date(val.toMillis());
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

    if (typeof val === "string") {
      const cleaned = val
        .replace(" at ", " ")
        .replace(/UTC[+-]\d+/, "")
        .trim();
      const d1 = new Date(cleaned);
      if (!isNaN(d1.getTime())) return d1;

      const d2 = new Date(val);
      if (!isNaN(d2.getTime())) return d2;
    }

    return null;
  }

  // Memastikan pembayaran berstatus lunas
  function isPaymentValid(p) {
    const st = String(p.status || "")
      .toLowerCase()
      .trim();
    return st === "lunas" || st === "paid";
  }

  function filterByPeriod(item) {
    if (activePeriodFilter === "all") return true;
    const d = parseOrderDate(item);
    if (!d) return false;
    const now = new Date();

    if (activePeriodFilter === "year2026") {
      return d.getFullYear() === 2026;
    }
    if (activePeriodFilter === "thisMonth") {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (activePeriodFilter === "last7days") {
      const diffTime = now.getTime() - d.getTime();
      return diffTime >= 0 && diffTime <= 7 * 24 * 60 * 60 * 1000;
    }
    return true;
  }

  function getFilteredOrders() {
    return currentOrdersData.filter(filterByPeriod);
  }

  function getFilteredPayments() {
    return currentPaymentsData.filter((p) => isPaymentValid(p) && filterByPeriod(p));
  }

  function refreshDashboardViews() {
    const orders = getFilteredOrders();
    const payments = getFilteredPayments();

    calculateSummaryCards(orders, currentPaymentsData);
    renderRecentOrdersTable(orders.slice(0, 5));
    renderMonthlySalesChart(orders);
    renderStatisticsAreaChart(orders, payments);
    renderLocationDistribution(orders);
    renderPackagePopularity(orders);
  }

  function initRealtimeDashboard() {
    // 1. Users
    db.collection("users").onSnapshot((snap) => {
      usersMap = {};
      snap.forEach((doc) => {
        const u = doc.data();
        usersMap[doc.id] = u.nama || u.namaLengkap || u.email;
      });

      const el = document.getElementById("statTotalUser");
      if (el) el.textContent = snap.size.toLocaleString("id-ID");

      if (currentOrdersData.length > 0) {
        renderRecentOrdersTable(getFilteredOrders().slice(0, 5));
      }
    });

    // 2. Payments
    db.collection("payments").onSnapshot((snap) => {
      currentPaymentsData = [];
      snap.forEach((doc) => currentPaymentsData.push({ id: doc.id, ...doc.data() }));

      calculateSummaryCards(getFilteredOrders(), currentPaymentsData);
      renderStatisticsAreaChart(getFilteredOrders(), getFilteredPayments());
    });

    // 3. Orders
    db.collection("orders").onSnapshot((snap) => {
      const orders = [];
      snap.forEach((doc) => orders.push({ id: doc.id, ...doc.data() }));

      orders.sort((a, b) => {
        const timeA = parseOrderDate(a)?.getTime() || 0;
        const timeB = parseOrderDate(b)?.getTime() || 0;
        return timeB - timeA;
      });
      currentOrdersData = orders;

      refreshDashboardViews();
      updateNotificationBox(orders.slice(0, 4));
    });
  }

  // Menghitung Metrik (Total Omset Akumulasi Riil)
  function calculateSummaryCards(orders, allPayments) {
    const now = new Date();
    let totalBulanIni = 0;
    let totalSeluruhOmset = 0;

    allPayments.forEach((p) => {
      if (!isPaymentValid(p)) return;

      const d = parseOrderDate(p);
      const val = Number(p.harga || p.totalBiaya || p.totalHarga || p.jumlah || 0);

      // Akumulasi seluruh pembayaran sah
      totalSeluruhOmset += val;

      // Verifikasi bulan berjalan (Oktober 2026)
      if (d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        totalBulanIni += val;
      }
    });

    let pendingCount = 0;
    orders.forEach((o) => {
      const st = String(o.status || "").toLowerCase();
      if (st === "pending" || st === "menunggu konfirmasi" || st === "") pendingCount++;
    });

    const elTotalAkumulasi = document.getElementById("omsetTotalAkumulasi");
    const elBulanIni = document.getElementById("omsetBulanIni");
    const elTotalPesanan = document.getElementById("statTotalPesanan");
    const elPending = document.getElementById("statPesananPending");

    if (elTotalAkumulasi) elTotalAkumulasi.textContent = formatRupiahLengkap(totalSeluruhOmset);
    if (elBulanIni) elBulanIni.textContent = formatRupiahLengkap(totalBulanIni);
    if (elTotalPesanan) elTotalPesanan.textContent = orders.length.toLocaleString("id-ID");
    if (elPending) elPending.textContent = `${pendingCount} Pending`;
  }

  function renderRecentOrdersTable(orders) {
    const tbody = document.getElementById("recentOrdersBody");
    if (!tbody) return;

    if (!orders.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400 text-xs">Belum ada pesanan pada periode ini.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders
      .map((o) => {
        const pemesan = usersMap[o.userId] || o.namaPemesan || o.nama || "Pelanggan";
        const acara = o.namaKegiatan || o.namaAcara || o.namaPaket || "Acara Catering";
        const lokasi = o.lokasiAcara || "-";
        const porsi = o.jumlahPorsi || 1;
        const total = formatRupiahLengkap(o.totalHarga || o.totalBiaya || 0);

        const status = o.status || "Pending";
        let badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
        if (status === "Diproses") badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
        if (status === "Selesai") badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
        if (status === "Dibatalkan") badgeClass = "bg-rose-50 text-rose-700 border-rose-200";

        return `
        <tr class="hover:bg-slate-50 transition">
          <td class="py-3.5 px-4">
            <span class="font-bold text-slate-800">#${o.id.substring(0, 8)}</span>
            <small class="block text-slate-400 text-xs">${escapeHtml(pemesan)}</small>
          </td>
          <td class="py-3.5 px-4">
            <span class="text-slate-700 font-semibold block">${escapeHtml(acara)}</span>
            <small class="text-slate-400"><i class="fa fa-map-marker mr-1"></i>${escapeHtml(lokasi)}</small>
          </td>
          <td class="py-3.5 px-4 font-bold text-slate-800">${porsi} Porsi</td>
          <td class="py-3.5 px-4 font-bold text-slate-900">${total}</td>
          <td class="py-3.5 px-4">
            <span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeClass}">${escapeHtml(status)}</span>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  function filterRecentOrdersTable(query) {
    if (!query) {
      renderRecentOrdersTable(getFilteredOrders().slice(0, 5));
      return;
    }
    const filtered = getFilteredOrders().filter((o) => {
      const pemesan = (usersMap[o.userId] || o.namaPemesan || o.nama || "").toLowerCase();
      const acara = (o.namaKegiatan || o.namaAcara || "").toLowerCase();
      const lokasi = (o.lokasiAcara || "").toLowerCase();
      return pemesan.includes(query) || acara.includes(query) || lokasi.includes(query);
    });
    renderRecentOrdersTable(filtered.slice(0, 5));
  }

  // 1. Chart Monthly Sales (Bar Chart)
  function renderMonthlySalesChart(orders) {
    const container = document.querySelector("#monthlySalesChart");
    if (!container || typeof ApexCharts === "undefined") return;

    let categories = [];
    let seriesData = [];

    if (activePeriodFilter === "last7days") {
      const days = [];
      const counts = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }));

        const count = orders.filter((o) => {
          const od = parseOrderDate(o);
          return od && od.toDateString() === d.toDateString();
        }).length;
        counts.push(count);
      }
      categories = days;
      seriesData = counts;
    } else {
      categories = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
      const monthlyCounts = new Array(12).fill(0);
      orders.forEach((o) => {
        const d = parseOrderDate(o);
        if (d) {
          monthlyCounts[d.getMonth()] += 1;
        }
      });
      seriesData = monthlyCounts;
    }

    const options = {
      series: [{ name: "Jumlah Pesanan", data: seriesData }],
      chart: {
        type: "bar",
        height: 280,
        toolbar: { show: false },
        fontFamily: "Plus Jakarta Sans, sans-serif",
      },
      plotOptions: {
        bar: { borderRadius: 4, columnWidth: "35%" },
      },
      dataLabels: { enabled: false },
      colors: ["#465FFF"],
      xaxis: {
        categories: categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: {
        labels: {
          style: { colors: "#94A3B8" },
          formatter: (val) => Math.round(val) + " Pesanan",
        },
      },
      grid: { borderColor: "#F1F5F9", strokeDashArray: 4 },
    };

    if (monthlySalesChartInstance) {
      monthlySalesChartInstance.updateOptions(options);
    } else {
      container.innerHTML = "";
      monthlySalesChartInstance = new ApexCharts(container, options);
      monthlySalesChartInstance.render();
    }
  }

  // 2. Chart Statistics Area (Tren Usaha)
  function renderStatisticsAreaChart(orders, payments) {
    const container = document.querySelector("#statisticsAreaChart");
    if (!container || typeof ApexCharts === "undefined") return;

    let categories = [];
    let ordersData = [];
    let revenueData = [];

    if (activePeriodFilter === "last7days") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        categories.push(d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }));

        const orderCount = orders.filter((o) => {
          const od = parseOrderDate(o);
          return od && od.toDateString() === d.toDateString();
        }).length;
        ordersData.push(orderCount);

        let revDay = 0;
        payments.forEach((p) => {
          const pd = parseOrderDate(p);
          if (pd && pd.toDateString() === d.toDateString()) {
            revDay += Number(p.harga || p.totalBiaya || p.totalHarga || p.jumlah || 0);
          }
        });
        revenueData.push(revDay);
      }
    } else {
      categories = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
      ordersData = new Array(12).fill(0);
      revenueData = new Array(12).fill(0);

      orders.forEach((o) => {
        const d = parseOrderDate(o);
        if (d) ordersData[d.getMonth()] += 1;
      });

      payments.forEach((p) => {
        const d = parseOrderDate(p);
        if (d) {
          const val = Number(p.harga || p.totalBiaya || p.totalHarga || p.jumlah || 0);
          revenueData[d.getMonth()] += val;
        }
      });
    }

    let series = [];
    let yaxisConfig = [];

    if (currentStatTab === "Sales") {
      series = [{ name: "Pesanan Masuk", data: ordersData }];
      yaxisConfig = [
        {
          labels: {
            style: { colors: "#94A3B8" },
            formatter: (v) => Math.round(v) + " Pesanan",
          },
        },
      ];
    } else if (currentStatTab === "Revenue") {
      series = [{ name: "Omset Riil (Rp)", data: revenueData }];
      yaxisConfig = [
        {
          labels: {
            style: { colors: "#94A3B8" },
            formatter: (v) => formatRupiahLengkap(v),
          },
        },
      ];
    } else {
      series = [
        { name: "Pesanan Masuk", data: ordersData },
        { name: "Omset Riil (Rp)", data: revenueData },
      ];
      yaxisConfig = [
        {
          title: { text: "Pesanan", style: { fontSize: "11px", color: "#94A3B8" } },
          labels: {
            style: { colors: "#94A3B8" },
            formatter: (v) => Math.round(v),
          },
        },
        {
          opposite: true,
          title: { text: "Rupiah", style: { fontSize: "11px", color: "#10B981" } },
          labels: {
            style: { colors: "#10B981" },
            formatter: (v) => formatRupiahLengkap(v),
          },
        },
      ];
    }

    const options = {
      series: series,
      chart: {
        type: "area",
        height: 300,
        toolbar: { show: false },
        fontFamily: "Plus Jakarta Sans, sans-serif",
      },
      colors: ["#465FFF", "#10B981"],
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 2.5 },
      fill: {
        type: "gradient",
        gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 95, 100] },
      },
      xaxis: {
        categories: categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: yaxisConfig,
      tooltip: {
        y: {
          formatter: (val, opts) => {
            if (opts.seriesIndex === 1 || currentStatTab === "Revenue") {
              return formatRupiahLengkap(val);
            }
            return Math.round(val) + " Pesanan";
          },
        },
      },
      grid: { borderColor: "#F1F5F9" },
      legend: { position: "top", horizontalAlign: "right" },
    };

    if (statisticsAreaChartInstance) {
      statisticsAreaChartInstance.updateOptions(options);
    } else {
      container.innerHTML = "";
      statisticsAreaChartInstance = new ApexCharts(container, options);
      statisticsAreaChartInstance.render();
    }
  }

  // 3. Chart Sebaran Lokasi Acara (Membaca field lokasiAcara di Firestore)
  function renderLocationDistribution(orders) {
    const container = document.querySelector("#locationChart");
    if (!container || typeof ApexCharts === "undefined") return;

    const locCounts = {};
    orders.forEach((o) => {
      const loc = (o.lokasiAcara || "Manado").trim();
      locCounts[loc] = (locCounts[loc] || 0) + 1;
    });

    const labels = Object.keys(locCounts);
    const values = Object.values(locCounts);

    const options = {
      series: [{ name: "Jumlah Pesanan", data: values.length ? values : [0] }],
      chart: {
        type: "bar",
        height: 260,
        toolbar: { show: false },
        fontFamily: "Plus Jakarta Sans, sans-serif",
      },
      plotOptions: {
        bar: { horizontal: true, borderRadius: 4, barHeight: "45%" },
      },
      colors: ["#10B981"],
      dataLabels: { enabled: false },
      xaxis: {
        categories: labels.length ? labels : ["Belum ada data"],
        labels: { style: { colors: "#94A3B8" } },
      },
      yaxis: {
        labels: { style: { colors: "#475569", fontWeight: 600 } },
      },
      grid: { borderColor: "#F1F5F9" },
    };

    if (locationChartInstance) {
      locationChartInstance.updateOptions(options);
    } else {
      container.innerHTML = "";
      locationChartInstance = new ApexCharts(container, options);
      locationChartInstance.render();
    }
  }

  // 4. Chart Popularitas Paket Menu (Membaca field items atau namaPaket di Firestore)
  function renderPackagePopularity(orders) {
    const container = document.querySelector("#packagePopularityChart");
    if (!container || typeof ApexCharts === "undefined") return;

    const packageCounts = {};

    orders.forEach((o) => {
      // Periksa dari array items pesanan
      if (Array.isArray(o.items) && o.items.length > 0) {
        o.items.forEach((item) => {
          const pkgName = item.nama || item.name || "Paket Menu";
          packageCounts[pkgName] = (packageCounts[pkgName] || 0) + (Number(item.porsi) || 1);
        });
      } else {
        // Fallback ke field namaPaket
        const pkgName = o.namaPaket || o.paket || "Paket Catering";
        packageCounts[pkgName] = (packageCounts[pkgName] || 0) + 1;
      }
    });

    const labels = Object.keys(packageCounts);
    const series = Object.values(packageCounts);

    const options = {
      series: series.length ? series : [1],
      labels: labels.length ? labels : ["Belum ada pesanan"],
      chart: {
        type: "donut",
        height: 260,
        fontFamily: "Plus Jakarta Sans, sans-serif",
      },
      colors: ["#465FFF", "#0284C7", "#F59E0B", "#10B981", "#8B5CF6"],
      legend: { position: "bottom", fontSize: "12px" },
      dataLabels: { enabled: false },
      stroke: { width: 0 },
    };

    if (packagePopularityChartInstance) {
      packagePopularityChartInstance.updateOptions(options);
    } else {
      container.innerHTML = "";
      packagePopularityChartInstance = new ApexCharts(container, options);
      packagePopularityChartInstance.render();
    }
  }

  function updateNotificationBox(recentOrders) {
    const list = document.getElementById("notifList");
    if (!list) return;

    if (!recentOrders.length) {
      list.innerHTML = `<div class="py-2 px-2 text-slate-400 text-xs">Belum ada pesanan terbaru.</div>`;
      return;
    }

    list.innerHTML = recentOrders
      .map(
        (o) => `
      <div class="py-2 px-2 hover:bg-slate-50 border-b border-slate-100 last:border-0">
        <p class="font-bold text-slate-800 text-xs">${escapeHtml(o.namaPemesan || o.nama || "Pelanggan")}</p>
        <p class="text-[11px] text-slate-500">${escapeHtml(o.namaKegiatan || o.namaPaket || "Pesanan Catering")} • <strong class="text-brand-600">${formatRupiahLengkap(o.totalHarga || o.totalBiaya || 0)}</strong></p>
      </div>
    `,
      )
      .join("");
  }

  function exportOrdersToCSV(orders) {
    if (!orders || !orders.length) return alert("Belum ada data pesanan untuk diekspor.");

    const headers = ["Order ID", "Nama Pemesan", "Email", "Telepon", "Acara", "Lokasi", "Porsi", "Total Biaya (Rp)", "Status", "Metode Bayar"];
    const rows = orders.map((o) => [
      `"${o.id}"`,
      `"${o.namaPemesan || o.nama || "-"}"`,
      `"${o.email || "-"}"`,
      `"${o.telepon || o.notlp || "-"}"`,
      `"${o.namaKegiatan || o.namaAcara || "-"}"`,
      `"${o.lokasiAcara || "-"}"`,
      `"${o.jumlahPorsi || 1}"`,
      `"${formatRupiahLengkap(o.totalHarga || o.totalBiaya || 0)}"`,
      `"${o.status || "Pending"}"`,
      `"${o.metodePembayaran || o.pembayaran || "-"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `laporan_catering_${activePeriodFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function formatRupiahLengkap(num) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num || 0);
  }

  function escapeHtml(val) {
    return String(val ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
