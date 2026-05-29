import Sale     from "../models/Sale.js";
import HoldSale from "../models/HoldSale.js";
import Store    from "../models/Store.js";
import { sendMessage } from "../services/telegram.service.js";

const fmt  = (n) => `$${(+n || 0).toFixed(2)}`;
const esc  = (s) => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const caps = (s) => String(s || "").replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase());

function periodStart(period) {
  const now = new Date();
  if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week")  return new Date(Date.now() - 7 * 86_400_000);
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "year")  return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function buildReportMessage(storeId, period = "today") {
  const since = periodStart(period);
  const match = { storeId, createdAt: { $gte: since }, status: { $ne: "voided" } };

  const [summary, topProducts, payMethods, holdSummary] = await Promise.all([
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
  ]);

  const revenue     = summary[0]?.revenue     || 0;
  const orders      = summary[0]?.count       || 0;
  const itemsSold   = summary[0]?.items       || 0;
  const outstanding = holdSummary[0]?.outstanding || 0;
  const plAccounts  = holdSummary[0]?.count       || 0;

  const labels = { today: "Today", week: "This Week", month: "This Month", year: "This Year" };
  const now    = new Date();
  const date   = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  let msg = `📊 <b>${esc(labels[period] || "Report")}</b>  —  ${date}\n`;
  msg += `─────────────────────\n`;
  msg += `💰 Revenue:    <b>${fmt(revenue)}</b>\n`;
  msg += `🛒 Orders:     <b>${orders}</b>\n`;
  msg += `📦 Items Sold: <b>${itemsSold}</b>\n`;
  if (orders > 0) msg += `📈 Avg Order:  <b>${fmt(revenue / orders)}</b>\n`;

  if (topProducts.length) {
    msg += `\n🏆 <b>Top Products</b>\n`;
    topProducts.forEach((p, i) => {
      const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
      msg += `${medals[i]} ${esc(p._id)}  ×${p.sold}  <i>(${fmt(p.rev)})</i>\n`;
    });
  }

  if (payMethods.length) {
    msg += `\n💳 <b>Payment Methods</b>\n`;
    payMethods.forEach(pm => {
      msg += `• ${caps(pm._id || "unknown")}: <b>${fmt(pm.total)}</b>  (${pm.count})\n`;
    });
  }

  if (outstanding > 0) {
    msg += `\n⚠️ <b>Pay Later:</b> ${fmt(outstanding)} owed  (${plAccounts} accounts)\n`;
  }

  msg += `─────────────────────\n`;
  msg += `<i>Nexora POS · ${now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</i>`;
  return msg;
}

// POST /api/telegram/report?period=today  — called from the frontend button
export async function triggerReport(req, res) {
  try {
    const period = req.query.period || "today";
    const store  = await Store.findById(req.storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });

    const token  = store.telegramBotToken;
    const chatId = store.adminTelegramChatId;
    if (!token || !chatId)
      return res.status(400).json({ message: "Telegram not configured. Set bot token and admin chat ID in Store Settings." });

    const msg = await buildReportMessage(req.storeId, period);
    await sendMessage(token, chatId, msg);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
