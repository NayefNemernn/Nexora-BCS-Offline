import Sale             from "../models/Sale.js";
import CafeOrder        from "../models/CafeOrder.js";
import CafeTable        from "../models/CafeTable.js";
import CafeReservation  from "../models/CafeReservation.js";
import CafeMenuItem     from "../models/CafeMenuItem.js";
import CafeCustomer     from "../models/CafeCustomer.js";
import CafeGameSession  from "../models/CafeGameSession.js";
import CafePointTransaction from "../models/CafePointTransaction.js";

/* Build date range from period */
const getRange = (period, date) => {
  const d   = date ? new Date(date) : new Date();
  const now  = new Date(d);

  if (period === "daily") {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end   = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end, groupFormat: "%H", groupLabel: "hour" };
  }
  if (period === "weekly") {
    const day   = now.getDay();
    const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0,0,0,0);
    const end   = new Date(now); end.setDate(now.getDate() + (6 - day)); end.setHours(23,59,59,999);
    return { start, end, groupFormat: "%u", groupLabel: "dayOfWeek" };
  }
  if (period === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end, groupFormat: "%d", groupLabel: "day" };
  }
  /* yearly */
  const start = new Date(now.getFullYear(), 0, 1);
  const end   = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end, groupFormat: "%m", groupLabel: "month" };
};

/* ── GET /api/cafe/reports/sales ── */
export const getSalesReport = async (req, res) => {
  try {
    const { period = "daily", date } = req.query;
    const { start, end, groupFormat, groupLabel } = getRange(period, date);

    const sales = await Sale.find({
      storeId:   req.storeId,
      saleType:  "cafe",
      createdAt: { $gte: start, $lte: end },
    });

    const totalRevenue   = sales.reduce((s, sale) => s + sale.total, 0);
    const totalOrders    = sales.length;
    const avgOrderValue  = totalOrders ? totalRevenue / totalOrders : 0;

    /* Group by period */
    const grouped = await Sale.aggregate([
      { $match: { storeId: req.storeId, saleType: "cafe", createdAt: { $gte: start, $lte: end } } },
      { $group: {
        _id:      { $dateToString: { format: groupFormat, date: "$createdAt" } },
        revenue:  { $sum: "$total" },
        orders:   { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);

    res.json({ totalRevenue, totalOrders, avgOrderValue, grouped, groupLabel });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ── GET /api/cafe/reports/peak-hours ── */
export const getPeakHours = async (req, res) => {
  try {
    const { period = "monthly", date } = req.query;
    const { start, end } = getRange(period, date);

    const data = await CafeOrder.aggregate([
      { $match: { storeId: req.storeId, status: "closed", createdAt: { $gte: start, $lte: end } } },
      { $group: {
        _id: {
          hour: { $hour:       "$openedAt" },
          day:  { $dayOfWeek:  "$openedAt" },
        },
        count: { $sum: 1 },
      }},
    ]);

    res.json({ data });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ── GET /api/cafe/reports/items ── */
export const getItemsReport = async (req, res) => {
  try {
    const { period = "monthly", date } = req.query;
    const { start, end } = getRange(period, date);

    const orders = await CafeOrder.find({
      storeId:   req.storeId,
      status:    "closed",
      closedAt:  { $gte: start, $lte: end },
    });

    const itemMap = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (item.status === "cancelled") continue;
        const key = item.menuItemId?.toString() || item.name;
        if (!itemMap[key]) {
          itemMap[key] = { name: item.name, units: 0, revenue: 0, category: "" };
        }
        itemMap[key].units   += item.quantity || 1;
        itemMap[key].revenue += item.price * (item.quantity || 1);
      }
    }

    const allItems   = await CafeMenuItem.find({ storeId: req.storeId }).select("_id category");
    const catMap     = Object.fromEntries(allItems.map(m => [m._id.toString(), m.category]));
    const items      = Object.entries(itemMap).map(([id, v]) => ({
      id, ...v, category: catMap[id] || "other",
    }));

    const byRevenue  = [...items].sort((a, b) => b.revenue - a.revenue);
    const byUnits    = [...items].sort((a, b) => b.units - a.units);
    const categories = [...new Set(items.map(i => i.category))].map(cat => ({
      category: cat,
      revenue:  items.filter(i => i.category === cat).reduce((s, i) => s + i.revenue, 0),
    }));

    res.json({ top10ByRevenue: byRevenue.slice(0, 10), top10ByUnits: byUnits.slice(0, 10), bottom5: byRevenue.slice(-5).reverse(), categories });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ── GET /api/cafe/reports/tables ── */
export const getTablesReport = async (req, res) => {
  try {
    const { period = "monthly", date } = req.query;
    const { start, end } = getRange(period, date);

    const orders = await CafeOrder.find({
      storeId:  req.storeId,
      status:   "closed",
      closedAt: { $gte: start, $lte: end },
      tableNumber: { $ne: null },
    }).select("tableNumber openedAt closedAt saleId");

    const saleIds = orders.filter(o => o.saleId).map(o => o.saleId);
    const sales   = await Sale.find({ _id: { $in: saleIds } }).select("_id total");
    const saleMap = Object.fromEntries(sales.map(s => [s._id.toString(), s.total]));

    const tableMap = {};
    for (const order of orders) {
      const num = order.tableNumber;
      if (!tableMap[num]) tableMap[num] = { tableNumber: num, orders: 0, revenue: 0, totalMinutes: 0 };
      tableMap[num].orders++;
      tableMap[num].revenue += saleMap[order.saleId?.toString()] || 0;
      if (order.openedAt && order.closedAt) {
        tableMap[num].totalMinutes +=
          (new Date(order.closedAt) - new Date(order.openedAt)) / 60000;
      }
    }

    const tables = Object.values(tableMap).map(t => ({
      ...t,
      avgMinutes: t.orders ? Math.round(t.totalMinutes / t.orders) : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    res.json({ tables });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ── GET /api/cafe/reports/kitchen ── */
export const getKitchenReport = async (req, res) => {
  try {
    const { period = "monthly", date } = req.query;
    const { start, end } = getRange(period, date);

    const orders = await CafeOrder.find({
      storeId:  req.storeId,
      status:   "closed",
      closedAt: { $gte: start, $lte: end },
    });

    const menuItems = await CafeMenuItem.find({ storeId: req.storeId }).select("_id name category");
    const catMap    = Object.fromEntries(menuItems.map(m => [m._id.toString(), m.category]));

    const catStats  = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (item.status === "cancelled") continue;
        const cat = catMap[item.menuItemId?.toString()] || "other";
        if (!catStats[cat]) catStats[cat] = { category: cat, count: 0 };
        catStats[cat].count += item.quantity || 1;
      }
    }

    const totalOrders   = orders.length;
    const totalItems    = orders.reduce((s, o) =>
      s + o.items.filter(i => i.status !== "cancelled").length, 0);

    res.json({
      totalOrders,
      totalItems,
      categoryBreakdown: Object.values(catStats).sort((a, b) => b.count - a.count),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ── GET /api/cafe/reports/reservations ── */
export const getReservationsReport = async (req, res) => {
  try {
    const { period = "monthly", date } = req.query;
    const { start, end } = getRange(period, date);

    const reservations = await CafeReservation.find({
      storeId:   req.storeId,
      createdAt: { $gte: start, $lte: end },
    });

    const total      = reservations.length;
    const completed  = reservations.filter(r => r.status === "seated").length;
    const cancelled  = reservations.filter(r => r.status === "cancelled").length;
    const noShows    = reservations.filter(r => r.status === "no_show").length;
    const pending    = reservations.filter(r => r.status === "confirmed").length;
    const fillRate   = total ? Math.round((completed / total) * 100) : 0;

    /* Most booked time slots */
    const slotMap = {};
    for (const r of reservations) {
      const slot = r.time || "unknown";
      slotMap[slot] = (slotMap[slot] || 0) + 1;
    }
    const topSlots = Object.entries(slotMap)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({ total, completed, cancelled, noShows, pending, fillRate, topSlots });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ── GET /api/cafe/reports/customers ── */
export const getCustomersReport = async (req, res) => {
  try {
    const { period = "monthly", date } = req.query;
    const { start, end } = getRange(period, date);

    const allCustomers = await CafeCustomer.find({ storeId: req.storeId })
      .select("name points tier createdAt");

    const newCustomers = allCustomers.filter(
      c => new Date(c.createdAt) >= start && new Date(c.createdAt) <= end
    ).length;

    const tierBreakdown = ["bronze", "silver", "gold", "diamond"].map(tier => ({
      tier,
      count: allCustomers.filter(c => c.tier === tier).length,
    }));

    const top10 = [...allCustomers].sort((a, b) => b.points - a.points).slice(0, 10)
      .map(c => ({ name: c.name, points: c.points, tier: c.tier }));

    const ptsTx = await CafePointTransaction.find({
      storeId:   req.storeId,
      type:      "earned",
      createdAt: { $gte: start, $lte: end },
    });
    const totalPointsDistributed = ptsTx.reduce((s, t) => s + t.amount, 0);

    res.json({
      totalCustomers: allCustomers.length,
      newThisPeriod:  newCustomers,
      returning:      allCustomers.length - newCustomers,
      tierBreakdown,
      top10Spenders:  top10,
      totalPointsDistributed,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ── GET /api/cafe/reports/games ── */
export const getGamesReport = async (req, res) => {
  try {
    const { period = "monthly", date } = req.query;
    const { start, end } = getRange(period, date);

    const sessions = await CafeGameSession.find({
      storeId:   req.storeId,
      createdAt: { $gte: start, $lte: end },
    });

    const forPoints = sessions.filter(s => s.isForPoints);

    const byType = ["slot", "scratch", "wheel", "mystery", "trivia"].map(g => ({
      game:     g,
      total:    sessions.filter(s => s.gameType === g).length,
      forPoints: forPoints.filter(s => s.gameType === g).length,
      totalPts: sessions.filter(s => s.gameType === g).reduce((a, s) => a + s.pointsAwarded, 0),
    }));

    const totalGames      = sessions.length;
    const totalPtsFromGames = sessions.reduce((s, g) => s + g.pointsAwarded, 0);
    const mostPlayed      = byType.reduce((a, b) => b.total > a.total ? b : a, byType[0]);

    res.json({ totalGames, totalPtsFromGames, mostPlayed: mostPlayed?.game, byType });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
