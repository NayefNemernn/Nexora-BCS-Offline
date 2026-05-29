import Shift    from "../models/Shift.js";
import Sale     from "../models/Sale.js";
import AuditLog from "../models/AuditLog.js";

async function audit(req, action, description, meta = {}) {
  try { await AuditLog.create({ storeId: req.storeId, userId: req.user._id, username: req.user.username, action, description, meta }); } catch {}
}

export const getActiveShift = async (req, res) => {
  try {
    const shift = await Shift.findOne({ storeId: req.storeId, userId: req.user._id, status: "open" }).sort({ openedAt: -1 });
    res.json(shift || null);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

export const getShifts = async (req, res) => {
  try {
    const shifts = await Shift.find({ storeId: req.storeId }).sort({ openedAt: -1 }).limit(100).populate("userId", "username");
    res.json(shifts);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

export const openShift = async (req, res) => {
  try {
    const existing = await Shift.findOne({ storeId: req.storeId, userId: req.user._id, status: "open" });
    if (existing) return res.status(400).json({ message: "You already have an open shift", shift: existing });

    const { openingFloat = 0, openingDenominations = [] } = req.body;

    // Calculate float from denominations if provided
    const floatFromDenoms = openingDenominations.reduce((s, d) => s + (d.count * d.value), 0);
    const actualFloat = openingDenominations.length ? floatFromDenoms : +openingFloat;

    const shift = await Shift.create({
      storeId: req.storeId, userId: req.user._id, username: req.user.username,
      openingFloat: actualFloat,
      openingDenominations: openingDenominations.map(d => ({ ...d, subtotal: d.count * d.value })),
      cashDrawerEvents: [{ type: "open", amount: actualFloat, reason: "Shift opened", createdAt: new Date() }],
      status: "open",
    });

    await audit(req, "login", `Shift opened — float $${actualFloat}`, { shiftId: shift._id, openingFloat: actualFloat });
    res.status(201).json(shift);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

export const closeShift = async (req, res) => {
  try {
    const shift = await Shift.findOne({ _id: req.params.id, storeId: req.storeId, status: "open" });
    if (!shift) return res.status(404).json({ message: "Shift not found or already closed" });

    const { closingCount, closingDenominations = [], notes = "" } = req.body;

    // Calculate closing count from denominations if provided
    const countFromDenoms = closingDenominations.reduce((s, d) => s + (d.count * d.value), 0);
    const actualClosing   = closingDenominations.length ? countFromDenoms : (closingCount != null ? +closingCount : null);

    const sales = await Sale.find({ storeId: req.storeId, userId: shift.userId, createdAt: { $gte: shift.openedAt } });

    const totalSales    = sales.reduce((s, x) => s + x.total, 0);
    const totalOrders   = sales.length;
    const totalDiscount = sales.reduce((s, x) => s + (x.discountAmount || 0), 0);
    const cashSales     = sales.reduce((s, x) => {
      if (x.paymentMethod === "cash") return s + x.total;
      if (x.paymentMethod === "split") return s + (x.splitPayments?.find(p => p.method === "cash")?.amount || 0);
      return s;
    }, 0);
    const cardSales     = sales.filter(s => s.paymentMethod === "card").reduce((s, x) => s + x.total, 0);
    const payLaterSales = sales.reduce((s, x) => {
      if (x.paymentMethod === "paylater") return s + x.total;
      if (x.paymentMethod === "split") return s + (x.splitPayments?.find(p => p.method === "paylater")?.amount || 0);
      return s;
    }, 0);
    const bankTransferSales   = sales.filter(s => s.paymentMethod === "bank_transfer").reduce((s, x) => s + x.total, 0);
    const cashOnDeliverySales = sales.filter(s => s.paymentMethod === "cash_on_delivery").reduce((s, x) => s + x.total, 0);
    const inStoreSales  = sales.filter(s => !s.saleType || s.saleType === "in_store").reduce((s, x) => s + x.total, 0);
    const deliverySales = sales.filter(s => s.saleType === "delivery").reduce((s, x) => s + x.total, 0);
    const totalRefunds  = sales.reduce((s, x) => s + (x.totalRefunded || 0), 0);
    const netRevenue    = totalSales - totalRefunds;
    const expectedCash  = shift.openingFloat + cashSales + shift.paidIn - shift.paidOut - totalRefunds;
    const variance      = actualClosing != null ? +(actualClosing - expectedCash).toFixed(2) : null;

    Object.assign(shift, {
      closedAt: new Date(), closingCount: actualClosing,
      closingDenominations: closingDenominations.map(d => ({ ...d, subtotal: d.count * d.value })),
      expectedCash: +expectedCash.toFixed(2), variance,
      totalSales: +totalSales.toFixed(2), totalOrders,
      cashSales: +cashSales.toFixed(2), cardSales: +cardSales.toFixed(2),
      payLaterSales: +payLaterSales.toFixed(2),
      bankTransferSales: +bankTransferSales.toFixed(2),
      cashOnDeliverySales: +cashOnDeliverySales.toFixed(2),
      inStoreSales: +inStoreSales.toFixed(2),
      deliverySales: +deliverySales.toFixed(2),
      totalRefunds: +totalRefunds.toFixed(2),
      totalDiscount: +totalDiscount.toFixed(2), netRevenue: +netRevenue.toFixed(2),
      notes, status: "closed",
    });
    await shift.save();

    await audit(req, "logout", `Shift closed — net $${netRevenue.toFixed(2)}, variance $${variance?.toFixed(2) ?? "N/A"}`, { shiftId: shift._id, netRevenue, variance });
    res.json(shift);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

/* POST /api/shifts/:id/cash-event — paid in / paid out */
export const addCashEvent = async (req, res) => {
  try {
    const { type, amount, reason } = req.body;
    if (!["paid_in", "paid_out"].includes(type)) return res.status(400).json({ message: "type must be paid_in or paid_out" });
    if (!amount || amount <= 0) return res.status(400).json({ message: "amount must be positive" });

    const shift = await Shift.findOne({ _id: req.params.id, storeId: req.storeId, status: "open" });
    if (!shift) return res.status(404).json({ message: "Shift not found or closed" });

    shift.cashDrawerEvents.push({ type, amount: +amount, reason: reason || "", createdAt: new Date() });
    if (type === "paid_in")  shift.paidIn  += +amount;
    if (type === "paid_out") shift.paidOut += +amount;
    await shift.save();

    res.json({ message: `${type === "paid_in" ? "Paid in" : "Paid out"} $${amount}`, shift });
  } catch (e) { res.status(500).json({ message: e.message }); }
};