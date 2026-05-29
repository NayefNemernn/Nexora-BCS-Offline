import CafeTable       from "../models/CafeTable.js";
import CafeOrder       from "../models/CafeOrder.js";
import CafeMenuItem    from "../models/CafeMenuItem.js";
import CafeReservation from "../models/CafeReservation.js";
import Product         from "../models/Product.js";
import Sale            from "../models/Sale.js";
import StockLog        from "../models/StockLog.js";
import AuditLog        from "../models/AuditLog.js";
import { getIO }       from "../socket/index.js";

const emitCafe    = (storeId, event, data) => { try { getIO()?.to(`store_${storeId}_cafe`).emit(event, data); } catch {} };
const emitKitchen = (storeId, data)        => { try { getIO()?.to(`store_${storeId}_kitchen`).emit("cafe_kitchen_new", data); } catch {} };
// Works for both regular POS users and café staff
const actorId   = (req) => req.user?._id   || req.cafeStaff?._id;
const actorName = (req) => req.user?.username || req.cafeStaff?.username || "café";

/* ═══════════════════════════════════════════════
   TABLES
═══════════════════════════════════════════════ */

export const getTables = async (req, res) => {
  try {
    const tables = await CafeTable.find({ storeId: req.storeId }).sort({ number: 1 });
    res.json(tables);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const createTable = async (req, res) => {
  try {
    const { number, shape, seats, x, y, color } = req.body;
    const existing = await CafeTable.findOne({ storeId: req.storeId, number });
    if (existing) return res.status(400).json({ message: `Table ${number} already exists` });
    const table = await CafeTable.create({ storeId: req.storeId, number, shape, seats, x, y, color });
    emitCafe(req.storeId, "cafe_table_updated", table);
    res.status(201).json(table);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateTable = async (req, res) => {
  try {
    const table = await CafeTable.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { $set: req.body },
      { new: true }
    );
    if (!table) return res.status(404).json({ message: "Table not found" });
    emitCafe(req.storeId, "cafe_table_updated", table);
    res.json(table);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const deleteTable = async (req, res) => {
  try {
    const table = await CafeTable.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!table) return res.status(404).json({ message: "Table not found" });
    if (table.activeOrderId) return res.status(400).json({ message: "Cannot delete table with an active order" });
    await table.deleteOne();
    emitCafe(req.storeId, "cafe_table_deleted", { _id: req.params.id });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateTableStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const table = await CafeTable.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { $set: { status } },
      { new: true }
    );
    if (!table) return res.status(404).json({ message: "Table not found" });
    emitCafe(req.storeId, "cafe_table_updated", table);
    res.json(table);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════
   CAFÉ MENU ITEMS
═══════════════════════════════════════════════ */

export const getCafeMenuItems = async (req, res) => {
  try {
    const filter = { storeId: req.storeId };
    if (req.query.available === "true") filter.isAvailable = true;
    const items = await CafeMenuItem.find(filter).sort({ category: 1, displayOrder: 1, name: 1 });
    res.json(items);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const createCafeMenuItem = async (req, res) => {
  try {
    const { name, category, price, description, displayOrder } = req.body;
    if (!name || price === undefined) return res.status(400).json({ message: "Name and price required" });
    const item = await CafeMenuItem.create({ storeId: req.storeId, name, category, price, description, displayOrder });
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateCafeMenuItem = async (req, res) => {
  try {
    const item = await CafeMenuItem.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { $set: req.body },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    res.json(item);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const deleteCafeMenuItem = async (req, res) => {
  try {
    await CafeMenuItem.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════
   ORDERS
═══════════════════════════════════════════════ */

export const getOrders = async (req, res) => {
  try {
    const filter = { storeId: req.storeId };
    filter.status = req.query.status || "open";
    if (req.query.orderType) filter.orderType = req.query.orderType;
    const orders = await CafeOrder.find(filter).sort({ openedAt: 1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getOrder = async (req, res) => {
  try {
    const order = await CafeOrder.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const openOrder = async (req, res) => {
  try {
    const { tableId, label, orderType } = req.body;
    const actor = actorId(req);

    // ── Outside / takeaway order ──
    if (!tableId) {
      const order = await CafeOrder.create({
        storeId: req.storeId,
        tableId: null,
        tableNumber: null,
        orderType: "takeaway",
        label: label || "Walk-in",
        openedBy: actor,
      });
      emitCafe(req.storeId, "cafe_order_updated", order);
      return res.status(201).json(order);
    }

    // ── Table order ──
    const table = await CafeTable.findOne({ _id: tableId, storeId: req.storeId });
    if (!table) return res.status(404).json({ message: "Table not found" });

    if (table.activeOrderId) {
      const existing = await CafeOrder.findById(table.activeOrderId);
      if (existing && existing.status === "open") return res.json(existing);
    }

    const order = await CafeOrder.create({
      storeId: req.storeId,
      tableId,
      tableNumber: table.number,
      orderType: "table",
      openedBy: actor,
    });

    await CafeTable.findByIdAndUpdate(tableId, { status: "occupied", activeOrderId: order._id });
    emitCafe(req.storeId, "cafe_table_updated", { ...table.toObject(), status: "occupied", activeOrderId: order._id });
    res.status(201).json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const addItems = async (req, res) => {
  try {
    const { items } = req.body;
    const order = await CafeOrder.findOne({ _id: req.params.id, storeId: req.storeId, status: "open" });
    if (!order) return res.status(404).json({ message: "Order not found or already closed" });

    for (const item of items) {
      order.items.push({
        productId:     item.productId  || undefined,
        menuItemId:    item.menuItemId || undefined,
        name:          item.name,
        price:         item.price,
        quantity:      item.quantity || 1,
        modifiers:     item.modifiers || [],
        notes:         item.notes || "",
        status:        "pending",
        sentToKitchen: false,
      });
    }
    await order.save();
    emitCafe(req.storeId, "cafe_order_updated", order);
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateItem = async (req, res) => {
  try {
    const order = await CafeOrder.findOne({ _id: req.params.id, storeId: req.storeId, status: "open" });
    if (!order) return res.status(404).json({ message: "Order not found" });
    const item = order.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    const { quantity, notes, modifiers } = req.body;
    if (quantity  !== undefined) item.quantity  = quantity;
    if (notes     !== undefined) item.notes     = notes;
    if (modifiers !== undefined) item.modifiers = modifiers;

    await order.save();
    emitCafe(req.storeId, "cafe_order_updated", order);
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const cancelItem = async (req, res) => {
  try {
    const order = await CafeOrder.findOne({ _id: req.params.id, storeId: req.storeId, status: "open" });
    if (!order) return res.status(404).json({ message: "Order not found" });
    const item = order.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });
    item.status = "cancelled";
    await order.save();
    emitCafe(req.storeId, "cafe_order_updated", order);
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const sendToKitchen = async (req, res) => {
  try {
    const order = await CafeOrder.findOne({ _id: req.params.id, storeId: req.storeId, status: "open" });
    if (!order) return res.status(404).json({ message: "Order not found" });

    let sent = 0;
    for (const item of order.items) {
      if (item.status === "pending" && !item.sentToKitchen) {
        item.sentToKitchen = true;
        sent++;
      }
    }
    await order.save();
    emitCafe(req.storeId, "cafe_order_updated", order);
    const label = order.tableNumber ? `Table ${order.tableNumber}` : (order.label || "Walk-in");
    if (sent > 0) emitKitchen(req.storeId, { orderId: order._id, tableNumber: order.tableNumber, label });
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateOrderMeta = async (req, res) => {
  try {
    const { serviceCharge, discount, notes } = req.body;
    const order = await CafeOrder.findOne({ _id: req.params.id, storeId: req.storeId, status: "open" });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (serviceCharge !== undefined) order.serviceCharge = serviceCharge;
    if (discount      !== undefined) order.discount      = discount;
    if (notes         !== undefined) order.notes         = notes;
    await order.save();
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const checkoutOrder = async (req, res) => {
  try {
    const { paymentMethod = "cash", splitPayments, customerName = "" } = req.body;
    const storeId = req.storeId;
    const taxRate = req.store?.taxRate || 0;
    const actor   = actorId(req);
    const aName   = actorName(req);

    const order = await CafeOrder.findOne({ _id: req.params.id, storeId, status: "open" });
    if (!order) return res.status(404).json({ message: "Order not found or already closed" });

    const activeItems = order.items.filter(i => i.status !== "cancelled");
    if (activeItems.length === 0) return res.status(400).json({ message: "No items to checkout" });

    // Build sale items — deduct stock only for productId items
    const saleItems = [];
    let subtotal = 0;
    let vatableAmount = 0;

    for (const item of activeItems) {
      const itemSub = +(item.price * item.quantity).toFixed(2);
      subtotal += itemSub;

      if (item.productId) {
        // Inventory product → check and deduct stock
        const product = await Product.findOne({ _id: item.productId, storeId });
        if (product) {
          if (product.stock < item.quantity)
            return res.status(400).json({ message: `${product.name} — only ${product.stock} left in stock` });
          const before = product.stock;
          product.stock -= item.quantity;
          await product.save();
          const tableLabel = order.tableNumber ? `Table ${order.tableNumber}` : (order.label || "Walk-in");
          await StockLog.create({ storeId, productId: product._id, userId: actor, productName: product.name, type: "sale", quantityBefore: before, change: -item.quantity, quantityAfter: product.stock, reason: `Café ${tableLabel}` });
          if (!product.vatExempt) vatableAmount += itemSub;
          saleItems.push({ productId: product._id, name: item.name, price: item.price, cost: product.cost || 0, quantity: item.quantity, subtotal: itemSub, vatExempt: !!product.vatExempt });
        } else {
          vatableAmount += itemSub;
          saleItems.push({ productId: item.productId, name: item.name, price: item.price, cost: 0, quantity: item.quantity, subtotal: itemSub, vatExempt: false });
        }
      } else {
        // Café menu item → no stock deduction, taxable by default
        vatableAmount += itemSub;
        saleItems.push({ name: item.name, price: item.price, cost: 0, quantity: item.quantity, subtotal: itemSub, vatExempt: false });
      }
    }

    const scAmt    = +(subtotal * (order.serviceCharge || 0) / 100).toFixed(2);
    const discAmt  = +(subtotal * (order.discount      || 0) / 100).toFixed(2);
    // Apply service charge + discount proportionally to vatable amount
    const vatableBase = +(vatableAmount + vatableAmount / subtotal * (scAmt - discAmt)).toFixed(2);
    const taxAmt   = +(vatableBase * taxRate / 100).toFixed(2);
    const taxBase  = +(subtotal + scAmt - discAmt).toFixed(2);
    const total    = +(taxBase + taxAmt).toFixed(2);

    const orderLabel = order.tableNumber ? `Table ${order.tableNumber}` : (order.label || "Walk-in");
    const noteParts  = [orderLabel];
    if (order.serviceCharge) noteParts.push(`Service: ${order.serviceCharge}%`);
    if (order.discount)      noteParts.push(`Discount: ${order.discount}%`);
    if (order.notes)         noteParts.push(order.notes);

    const sale = await Sale.create({
      storeId,
      userId:         actor,
      items:          saleItems,
      total,
      subtotal,
      vatableAmount:  +vatableAmount.toFixed(2),
      taxAmount:      taxAmt,
      discountAmount: discAmt,
      saleType:       "cafe",
      paymentMethod,
      splitPayments:  paymentMethod === "split" ? splitPayments : [],
      customerName,
      notes:          noteParts.join(" | "),
    });

    order.status   = "closed";
    order.closedAt = new Date();
    order.saleId   = sale._id;
    await order.save();

    // Free the table only if this was a table order
    if (order.tableId) {
      await CafeTable.findByIdAndUpdate(order.tableId, { status: "available", activeOrderId: null });
      emitCafe(storeId, "cafe_table_updated", { _id: order.tableId, status: "available", activeOrderId: null });
    }

    emitCafe(storeId, "cafe_order_updated", order);

    await AuditLog.create({
      storeId, userId: actor, username: aName,
      action: "cafe_checkout",
      description: `Checked out ${orderLabel} — ${total}`,
      meta: { saleId: sale._id, tableNumber: order.tableNumber, label: order.label },
    });

    res.json({ sale, order });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const transferItems = async (req, res) => {
  try {
    const { fromOrderId, toTableId, itemIds } = req.body;
    const fromOrder = await CafeOrder.findOne({ _id: fromOrderId, storeId: req.storeId, status: "open" });
    if (!fromOrder) return res.status(404).json({ message: "Source order not found" });

    const toTable = await CafeTable.findOne({ _id: toTableId, storeId: req.storeId });
    if (!toTable) return res.status(404).json({ message: "Target table not found" });

    let toOrder;
    if (toTable.activeOrderId) toOrder = await CafeOrder.findOne({ _id: toTable.activeOrderId, status: "open" });
    if (!toOrder) {
      toOrder = await CafeOrder.create({ storeId: req.storeId, tableId: toTableId, tableNumber: toTable.number, openedBy: actorId(req) });
      await CafeTable.findByIdAndUpdate(toTableId, { status: "occupied", activeOrderId: toOrder._id });
    }

    const itemsToMove = fromOrder.items.filter(i => itemIds.includes(String(i._id)));
    for (const item of itemsToMove) {
      toOrder.items.push({ ...item.toObject(), _id: undefined });
      item.status = "cancelled";
    }
    await fromOrder.save();
    await toOrder.save();

    emitCafe(req.storeId, "cafe_order_updated", fromOrder);
    emitCafe(req.storeId, "cafe_order_updated", toOrder);
    res.json({ fromOrder, toOrder });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const mergeOrders = async (req, res) => {
  try {
    const { sourceOrderId, targetOrderId } = req.body;
    const source = await CafeOrder.findOne({ _id: sourceOrderId, storeId: req.storeId, status: "open" });
    const target = await CafeOrder.findOne({ _id: targetOrderId, storeId: req.storeId, status: "open" });
    if (!source || !target) return res.status(404).json({ message: "Order not found" });

    for (const item of source.items.filter(i => i.status !== "cancelled")) {
      target.items.push({ ...item.toObject(), _id: undefined });
    }
    source.status   = "cancelled";
    source.closedAt = new Date();
    await source.save();
    await target.save();

    if (source.tableId) {
      await CafeTable.findByIdAndUpdate(source.tableId, { status: "available", activeOrderId: null });
      emitCafe(req.storeId, "cafe_table_updated", { _id: source.tableId, status: "available", activeOrderId: null });
    }
    emitCafe(req.storeId, "cafe_order_updated", target);
    res.json({ source, target });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const cancelOrder = async (req, res) => {
  try {
    const order = await CafeOrder.findOne({ _id: req.params.id, storeId: req.storeId, status: "open" });
    if (!order) return res.status(404).json({ message: "Order not found" });
    order.status   = "cancelled";
    order.closedAt = new Date();
    await order.save();
    if (order.tableId) {
      await CafeTable.findByIdAndUpdate(order.tableId, { status: "available", activeOrderId: null });
      emitCafe(req.storeId, "cafe_table_updated", { _id: order.tableId, status: "available", activeOrderId: null });
    }
    emitCafe(req.storeId, "cafe_order_updated", order);
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════
   KITCHEN
═══════════════════════════════════════════════ */

export const getKitchenOrders = async (req, res) => {
  try {
    const orders = await CafeOrder.find({ storeId: req.storeId, status: "open" }).sort({ openedAt: 1 });
    const filtered = orders.filter(o => o.items.some(i => i.sentToKitchen && !["served", "cancelled"].includes(i.status)));
    res.json(filtered);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateItemStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending","preparing","ready","served","cancelled"].includes(status))
      return res.status(400).json({ message: "Invalid status" });
    const order = await CafeOrder.findOne({ _id: req.params.orderId, storeId: req.storeId });
    if (!order) return res.status(404).json({ message: "Order not found" });
    const item = order.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });
    item.status = status;
    await order.save();
    emitCafe(req.storeId, "cafe_order_updated", order);
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════
   RESERVATIONS
═══════════════════════════════════════════════ */

export const getReservations = async (req, res) => {
  try {
    const filter = { storeId: req.storeId };
    if (req.query.date) filter.date = req.query.date;
    const reservations = await CafeReservation.find(filter).populate("tableId", "number shape seats").sort({ time: 1 });
    res.json(reservations);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const createReservation = async (req, res) => {
  try {
    const { tableId: rawTableId, customerName, phone, partySize, date, time, notes } = req.body;
    const tableId = rawTableId || null;
    const reservation = await CafeReservation.create({ storeId: req.storeId, tableId, customerName, phone, partySize, date, time, notes });
    if (tableId) {
      await CafeTable.findByIdAndUpdate(tableId, { status: "reserved" });
      emitCafe(req.storeId, "cafe_table_updated", { _id: tableId, status: "reserved" });
    }
    res.status(201).json(reservation);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateReservation = async (req, res) => {
  try {
    const body = { ...req.body };
    if ("tableId" in body && !body.tableId) body.tableId = null;
    const reservation = await CafeReservation.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { $set: body },
      { new: true }
    );
    if (!reservation) return res.status(404).json({ message: "Reservation not found" });
    res.json(reservation);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const seatReservation = async (req, res) => {
  try {
    const reservation = await CafeReservation.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!reservation) return res.status(404).json({ message: "Reservation not found" });
    reservation.status = "seated";
    await reservation.save();

    let order = null;
    if (reservation.tableId) {
      const table = await CafeTable.findById(reservation.tableId);
      if (table) {
        order = await CafeOrder.create({ storeId: req.storeId, tableId: table._id, tableNumber: table.number, openedBy: actorId(req) });
        await CafeTable.findByIdAndUpdate(table._id, { status: "occupied", activeOrderId: order._id });
        emitCafe(req.storeId, "cafe_table_updated", { _id: table._id, status: "occupied", activeOrderId: order._id });
      }
    }
    res.json({ reservation, order });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const cancelReservation = async (req, res) => {
  try {
    const reservation = await CafeReservation.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!reservation) return res.status(404).json({ message: "Reservation not found" });
    const prev = reservation.tableId;
    reservation.status  = "cancelled";
    reservation.tableId = null;
    await reservation.save();
    if (prev) {
      const stillReserved = await CafeReservation.findOne({ tableId: prev, status: { $in: ["pending", "confirmed"] } });
      if (!stillReserved) {
        await CafeTable.findByIdAndUpdate(prev, { status: "available" });
        emitCafe(req.storeId, "cafe_table_updated", { _id: prev, status: "available" });
      }
    }
    res.json(reservation);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════
   REPORTS
═══════════════════════════════════════════════ */

export const getCafeReports = async (req, res) => {
  try {
    const storeId = req.storeId;
    const start = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 86400000);
    const end   = req.query.to   ? new Date(req.query.to)   : new Date();
    end.setHours(23, 59, 59, 999);

    const [sales, orders] = await Promise.all([
      Sale.find({ storeId, saleType: "cafe", createdAt: { $gte: start, $lte: end } }).lean(),
      CafeOrder.find({ storeId, status: "closed", closedAt: { $gte: start, $lte: end } }).lean(),
    ]);

    const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
    const totalOrders  = orders.length;
    const avgTicket    = totalOrders ? totalRevenue / totalOrders : 0;

    const itemMap = {};
    for (const o of orders) for (const i of o.items) {
      if (i.status !== "cancelled") itemMap[i.name] = (itemMap[i.name] || 0) + i.quantity;
    }
    const topItems = Object.entries(itemMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, qty]) => ({ name, qty }));

    const hourly = Array(24).fill(0);
    for (const o of orders) if (o.openedAt) hourly[new Date(o.openedAt).getHours()]++;

    const turnoverMap = {};
    for (const o of orders) {
      const key = o.tableNumber ? `Table ${o.tableNumber}` : (o.label || "Walk-in");
      turnoverMap[key] = (turnoverMap[key] || 0) + 1;
    }
    const tableTurnover = Object.entries(turnoverMap).map(([table, count]) => ({ table, count })).sort((a, b) => b.count - a.count);

    res.json({ totalRevenue, totalOrders, avgTicket, topItems, hourly, tableTurnover });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
