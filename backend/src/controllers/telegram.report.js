import Sale     from "../models/Sale.js";
import HoldSale from "../models/HoldSale.js";
import Store    from "../models/Store.js";
import { sendMessage, sendPhoto } from "../services/telegram.service.js";

const fmt  = (n) => `$${(+n || 0).toFixed(2)}`;
const esc  = (s) => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const caps = (s) => String(s || "").replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase());

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function periodStart(period) {
  const now = new Date();
  if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week")  return new Date(Date.now() - 7 * 86_400_000);
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "year")  return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// ── QuickChart URL builder ────────────────────────────────────────────────────
function revenueChartUrl(salesChart, period) {
  if (!salesChart?.length) return null;

  const labels = salesChart.map(d => {
    if (period === "today") return `${String(d.day).padStart(2,"0")}:00`;
    if (period === "year")  return MONTH_NAMES[(d.day || 1) - 1] ?? d.day;
    return `D${d.day}`;
  });
  const data = salesChart.map(d => +(d.sales || 0).toFixed(2));

  const cfg = {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Revenue ($)",
        data,
        backgroundColor: "rgba(59,130,246,0.85)",
        borderRadius: 5,
      }],
    },
    options: {
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `Revenue — ${{ today:"Today", week:"This Week", month:"This Month", year:"This Year" }[period] || period}`,
          color: "#1f2937", font: { size: 15, weight: "bold" },
        },
      },
      scales: {
        y: { beginAtZero: true, ticks: { color: "#6b7280" }, grid: { color: "#f3f4f6" } },
        x: { ticks: { color: "#6b7280" }, grid: { display: false } },
      },
    },
  };

  return `https://quickchart.io/chart?w=700&h=320&bkg=%23ffffff&c=${encodeURIComponent(JSON.stringify(cfg))}`;
}

function topProductsChartUrl(topProducts) {
  if (!topProducts?.length) return null;

  const cfg = {
    type: "horizontalBar",
    data: {
      labels: topProducts.map(p => String(p.name || p._id || "").substring(0, 20)),
      datasets: [{
        label: "Units Sold",
        data: topProducts.map(p => p.sold),
        backgroundColor: ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6"],
        borderRadius: 5,
      }],
    },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Top Products", color: "#1f2937", font: { size: 15, weight: "bold" } },
      },
      scales: {
        x: { beginAtZero: true, ticks: { color: "#6b7280" }, grid: { color: "#f3f4f6" } },
        y: { ticks: { color: "#374151" }, grid: { display: false } },
      },
    },
  };

  return `https://quickchart.io/chart?w=700&h=280&bkg=%23ffffff&c=${encodeURIComponent(JSON.stringify(cfg))}`;
}

function payMethodsChartUrl(payMethods) {
  if (!payMethods?.length) return null;

  const cfg = {
    type: "doughnut",
    data: {
      labels: payMethods.map(pm => caps(pm._id || "unknown")),
      datasets: [{
        data: payMethods.map(pm => +(pm.total || 0).toFixed(2)),
        backgroundColor: ["#10b981","#3b82f6","#ef4444","#f59e0b","#8b5cf6","#f97316"],
      }],
    },
    options: {
      plugins: {
        legend: { position: "right", labels: { color: "#374151", font: { size: 12 } } },
        title: { display: true, text: "Payment Methods", color: "#1f2937", font: { size: 15, weight: "bold" } },
      },
    },
  };

  return `https://quickchart.io/chart?w=700&h=280&bkg=%23ffffff&c=${encodeURIComponent(JSON.stringify(cfg))}`;
}

// ── Data fetcher ──────────────────────────────────────────────────────────────
async function fetchReportData(storeId, period) {
  const since = periodStart(period);
  const match = { storeId, createdAt: { $gte: since }, status: { $ne: "voided" } };

  const chartGroup = period === "today" ? { $hour: "$createdAt" }
    : period === "year"  ? { $month: "$createdAt" }
    : { $dayOfMonth: "$createdAt" };

  const [summary, topProducts, payMethods, holdSummary, salesChart] = await Promise.all([
    Sale.aggregate([
      { $match: match },
      { $group: { _id: null, revenue: { $sum: "$total" }, count: { $sum: 1 },
          items: { $sum: { $reduce: { input: "$items", initialValue: 0,
            in: { $add: ["$$value", "$$this.quantity"] } } } } } },
    ]),
    Sale.aggregate([
      { $match: match },
      { $unwind: "$items" },
      { $group: { _id: "$items.name", sold: { $sum: "$items.quantity" },
          rev: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } },
      { $sort: { sold: -1 } },
      { $limit: 5 },
    ]),
    Sale.aggregate([
      { $match: match },
      { $group: { _id: "$paymentMethod", total: { $sum: "$total" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    HoldSale.aggregate([
      { $match: { storeId } },
      { $group: { _id: null, outstanding: { $sum: "$balance" }, count: { $sum: 1 } } },
    ]),
    Sale.aggregate([
      { $match: match },
      { $group: { _id: chartGroup, sales: { $sum: "$total" } } },
      { $sort: { _id: 1 } },
    ]).then(rows => rows.map(r => ({ day: r._id, sales: r.sales }))),
  ]);

  return {
    revenue:     summary[0]?.revenue     || 0,
    orders:      summary[0]?.count       || 0,
    itemsSold:   summary[0]?.items       || 0,
    outstanding: holdSummary[0]?.outstanding || 0,
    plAccounts:  holdSummary[0]?.count       || 0,
    topProducts: topProducts.map(p => ({ name: p._id, sold: p.sold, rev: p.rev })),
    payMethods,
    salesChart,
  };
}

// ── Text message builder ──────────────────────────────────────────────────────
export async function buildReportMessage(storeId, period = "today") {
  const d = await fetchReportData(storeId, period);

  const labels = { today: "Today", week: "This Week", month: "This Month", year: "This Year" };
  const now    = new Date();
  const date   = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  let msg = `📊 <b>${esc(labels[period] || "Report")}</b>  —  ${date}\n`;
  msg += `─────────────────────\n`;
  msg += `💰 Revenue:    <b>${fmt(d.revenue)}</b>\n`;
  msg += `🛒 Orders:     <b>${d.orders}</b>\n`;
  msg += `📦 Items Sold: <b>${d.itemsSold}</b>\n`;
  if (d.orders > 0) msg += `📈 Avg Order:  <b>${fmt(d.revenue / d.orders)}</b>\n`;

  if (d.topProducts.length) {
    msg += `\n🏆 <b>Top Products</b>\n`;
    d.topProducts.forEach((p, i) => {
      const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
      msg += `${medals[i]} ${esc(p.name)}  ×${p.sold}  <i>(${fmt(p.rev)})</i>\n`;
    });
  }

  if (d.payMethods.length) {
    msg += `\n💳 <b>Payment Methods</b>\n`;
    d.payMethods.forEach(pm => {
      msg += `• ${caps(pm._id || "unknown")}: <b>${fmt(pm.total)}</b>  (${pm.count})\n`;
    });
  }

  if (d.outstanding > 0) {
    msg += `\n⚠️ <b>Pay Later:</b> ${fmt(d.outstanding)} owed  (${d.plAccounts} accounts)\n`;
  }

  msg += `─────────────────────\n`;
  msg += `<i>Nexora POS · ${now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</i>`;
  return msg;
}

// ── Full report sender (text + charts) ───────────────────────────────────────
export async function sendFullReport(token, chatId, storeId, period, withCharts) {
  const d = await fetchReportData(storeId, period);

  const labels = { today: "Today", week: "This Week", month: "This Month", year: "This Year" };
  const now    = new Date();
  const date   = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  // ① Text summary
  let msg = `📊 <b>${esc(labels[period] || "Report")}</b>  —  ${date}\n`;
  msg += `─────────────────────\n`;
  msg += `💰 Revenue:    <b>${fmt(d.revenue)}</b>\n`;
  msg += `🛒 Orders:     <b>${d.orders}</b>\n`;
  msg += `📦 Items Sold: <b>${d.itemsSold}</b>\n`;
  if (d.orders > 0) msg += `📈 Avg Order:  <b>${fmt(d.revenue / d.orders)}</b>\n`;
  if (d.topProducts.length) {
    msg += `\n🏆 <b>Top Products</b>\n`;
    d.topProducts.forEach((p, i) => {
      const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
      msg += `${medals[i]} ${esc(p.name)}  ×${p.sold}  <i>(${fmt(p.rev)})</i>\n`;
    });
  }
  if (d.payMethods.length) {
    msg += `\n💳 <b>Payment Methods</b>\n`;
    d.payMethods.forEach(pm => {
      msg += `• ${caps(pm._id || "unknown")}: <b>${fmt(pm.total)}</b>  (${pm.count})\n`;
    });
  }
  if (d.outstanding > 0) msg += `\n⚠️ <b>Pay Later:</b> ${fmt(d.outstanding)} owed\n`;
  msg += `─────────────────────\n`;
  msg += `<i>Nexora POS · ${now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</i>`;

  await sendMessage(token, chatId, msg);

  // ② Charts (only if requested and data exists)
  if (!withCharts) return;

  const revUrl  = revenueChartUrl(d.salesChart, period);
  const topUrl  = topProductsChartUrl(d.topProducts);
  const payUrl  = payMethodsChartUrl(d.payMethods);

  if (revUrl)  await sendPhoto(token, chatId, revUrl,  "📈 Revenue Chart");
  if (topUrl)  await sendPhoto(token, chatId, topUrl,  "🏆 Top Products");
  if (payUrl && d.payMethods.length > 1)
               await sendPhoto(token, chatId, payUrl,  "💳 Payment Methods");
}

// ── POST /api/telegram/report?period=today&charts=1 ──────────────────────────
export async function triggerReport(req, res) {
  try {
    const period     = req.query.period || "today";
    const withCharts = req.query.charts === "1";

    const store = await Store.findById(req.storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });

    const token  = store.telegramBotToken;
    const chatId = store.adminTelegramChatId;
    if (!token || !chatId)
      return res.status(400).json({ message: "Telegram not configured. Set bot token and admin chat ID in Store Settings." });

    await sendFullReport(token, chatId, req.storeId, period, withCharts);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
