import Sale     from "../models/Sale.js";
import Product  from "../models/Product.js";
import Customer from "../models/Customer.js";
import AuditLog from "../models/AuditLog.js";
import StockLog from "../models/StockLog.js";
import HoldSale from "../models/HoldSale.js";
import Payment  from "../models/Payment.js";
import Batch    from "../models/Batch.js";

async function audit(req, action, description, meta = {}) {
  try { await AuditLog.create({ storeId: req.storeId, userId: req.user._id, username: req.user.username, action, description, meta }); } catch {}
}
async function logStock(req, product, change, type, reason = "", reference = "") {
  try {
    await StockLog.create({
      storeId: req.storeId, productId: product._id, userId: req.user._id,
      productName: product.name, type,
      quantityBefore: product.stock, change, quantityAfter: product.stock + change,
      reason, reference,
    });
  } catch {}
}

/* ── CREATE SALE ─────────────────────────────────────────────── */
export const createSale = async (req, res) => {
  try {
    const {
      items, paymentMethod, splitPayments,
      customerName, customerId, phone, notes, discountAmount = 0,
      saleType = "in_store", orderId = null, deliveryAddress = "",
    } = req.body;
    const storeId = req.storeId;
    const taxRate = req.store?.taxRate || 0;

    if (!items || items.length === 0) return res.status(400).json({ message: "Cart is empty" });
    if (paymentMethod === "split" && (!splitPayments || splitPayments.length < 2))
      return res.status(400).json({ message: "Split payment requires at least 2 methods" });

    let subtotal = 0;
    let vatableAmount = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, storeId });
      if (!product) return res.status(404).json({ message: `Product not found` });
      if (product.stock < item.quantity) return res.status(400).json({ message: `${product.name} — only ${product.stock} left` });

      const itemSubtotal = +(product.price * item.quantity).toFixed(2);
      subtotal += itemSubtotal;
      if (!product.vatExempt) vatableAmount += itemSubtotal;

      const stockBefore = product.stock;

      // FIFO batch deduction — earliest expiry first, no-expiry batches last
      // Also compute weighted-average cost from the exact batches consumed
      const batchesWithExpiry = await Batch.find({ productId: product._id, storeId, remainingQty: { $gt: 0 }, expiryDate: { $ne: null } }).sort({ expiryDate: 1 });
      const batchesNoExpiry   = await Batch.find({ productId: product._id, storeId, remainingQty: { $gt: 0 }, expiryDate: null }).sort({ createdAt: 1 });
      const activeBatches = [...batchesWithExpiry, ...batchesNoExpiry];

      let itemCost = product.cost || 0; // fallback when no batches exist
      if (activeBatches.length > 0) {
        let costNumerator = 0, costDenominator = 0, remaining = item.quantity;
        for (const batch of activeBatches) {
          if (remaining <= 0) break;
          const deduct = Math.min(batch.remainingQty, remaining);
          await Batch.findByIdAndUpdate(batch._id, { $inc: { remainingQty: -deduct } });
          costNumerator   += deduct * (batch.costPrice || 0);
          costDenominator += deduct;
          remaining -= deduct;
        }
        // Weighted-average cost of the units actually consumed from batches
        if (costDenominator > 0) itemCost = +(costNumerator / costDenominator).toFixed(4);
      }

      saleItems.push({ productId: product._id, name: product.name, price: product.price, cost: itemCost, quantity: item.quantity, subtotal: itemSubtotal, vatExempt: !!product.vatExempt, discountAmount: item.discountAmount || 0 });

      await Product.findByIdAndUpdate(product._id, { $inc: { stock: -item.quantity } });
      await logStock(req, { ...product.toObject(), stock: stockBefore }, -item.quantity, "sale");
    }

    const taxAmount = +(vatableAmount * (taxRate / 100)).toFixed(2);
    const discount  = +Math.min(discountAmount, subtotal).toFixed(2);
    const total     = +(subtotal + taxAmount - discount).toFixed(2);

    let isPaid = paymentMethod !== "paylater" && paymentMethod !== "cash_on_delivery";
    if (paymentMethod === "split") {
      isPaid = !(splitPayments || []).some(p => p.method === "paylater");
    }

    const isDelivery = saleType === "delivery" || paymentMethod === "cash_on_delivery";
    const saleStatus = isDelivery ? "pending_payment" : "completed";

    const sale = await Sale.create({
      storeId, userId: req.user._id, items: saleItems, subtotal, vatableAmount: +vatableAmount.toFixed(2), total, taxAmount,
      discountAmount: discount, paymentMethod,
      splitPayments: paymentMethod === "split" ? splitPayments : [],
      paid: isPaid, customerName: customerName || "", customerId: customerId || null,
      phone: phone || "", notes: notes || "", status: saleStatus,
      saleType, orderId: orderId || null, deliveryAddress: deliveryAddress || "",
    });

    // Link sale back to online order and mark out for delivery
    if (orderId) {
      const { default: OnlineOrder } = await import("../models/OnlineOrder.js");
      await OnlineOrder.findByIdAndUpdate(orderId, { status: "out_for_delivery", saleId: sale._id });
      // Emit socket event
      const { getIO } = await import("../socket/index.js");
      const io = getIO();
      if (io) {
        io.to(`store_${storeId}_admin`).emit("order_status_changed", {
          orderId, status: "out_for_delivery",
        });
      }
    }

    if (customerId) {
      const payLaterAmount = paymentMethod === "split"
        ? (splitPayments || []).find(p => p.method === "paylater")?.amount || 0
        : paymentMethod === "paylater" ? total : 0;
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { totalSpent: paymentMethod === "paylater" ? 0 : total, totalOrders: 1, outstandingBalance: payLaterAmount },
      });
    }

    await audit(req, "sale_created", `Sale $${total} — ${paymentMethod}${customerName ? " — " + customerName : ""}`,
      { saleId: sale._id, total, paymentMethod, discount });

    // If split payment includes paylater, create/update HoldSale + record the upfront cash payment
    if (paymentMethod === "split") {
      const payLaterEntry = (splitPayments || []).find(p => p.method === "paylater");
      if (payLaterEntry && payLaterEntry.amount > 0 && customerName) {
        const cashPaid  = +(total - payLaterEntry.amount).toFixed(2);
        const holdItems = saleItems.map(i => ({ productId: i.productId, name: i.name, price: i.price, quantity: i.quantity }));
        const existing  = await HoldSale.findOne({ customerName, storeId });
        let holdSaleId;
        if (existing) {
          existing.items.push(...holdItems);
          existing.total   = +(existing.total + total).toFixed(2);
          existing.paid    = +(existing.paid + cashPaid).toFixed(2);
          existing.balance = +(existing.total - existing.paid).toFixed(2);
          await existing.save();
          holdSaleId = existing._id;
        } else {
          const created = await HoldSale.create({
            storeId, userId: req.user._id,
            customerName, phone: phone || "",
            items: holdItems,
            total, paid: cashPaid, balance: payLaterEntry.amount,
          });
          holdSaleId = created._id;
        }
        // Record the cash portion as a Payment so it appears in Recent Payments
        if (cashPaid > 0) {
          await Payment.create({
            storeId, userId: req.user._id,
            customerName, phone: phone || "",
            holdSaleId, amount: cashPaid, method: "cash",
            notes: `Paid at checkout (split sale #${sale._id})`,
          });
        }
      }
    }

    res.status(201).json({ message: "Sale completed", sale });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

/* ── RETURN ITEMS ────────────────────────────────────────────── */
export const returnSaleItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { returnItems, reason = "" } = req.body;

    const sale = await Sale.findOne({ _id: id, storeId: req.storeId });
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    if (sale.status === "fully_returned") return res.status(400).json({ message: "Already fully returned" });

    let totalRefundThisReturn = 0;
    const newReturnedItems = [];

    for (const ri of returnItems) {
      const saleItem = sale.items.find(i => i.productId.toString() === ri.productId);
      if (!saleItem) return res.status(400).json({ message: `Item not in this sale` });

      const alreadyReturned = sale.returnedItems
        .filter(r => r.productId.toString() === ri.productId)
        .reduce((s, r) => s + r.quantity, 0);

      const maxReturnable = saleItem.quantity - alreadyReturned;
      if (ri.quantity > maxReturnable) return res.status(400).json({ message: `${saleItem.name}: max ${maxReturnable} returnable` });

      const refundAmount = +(saleItem.price * ri.quantity).toFixed(2);
      totalRefundThisReturn += refundAmount;
      newReturnedItems.push({ productId: saleItem.productId, name: saleItem.name, quantity: ri.quantity, refundAmount, reason, returnedAt: new Date(), returnedBy: req.user._id });

      const product = await Product.findById(saleItem.productId);
      if (product) {
        const stockBefore = product.stock;
        await Product.findByIdAndUpdate(saleItem.productId, { $inc: { stock: ri.quantity } });
        await logStock(req, { ...product.toObject(), stock: stockBefore }, +ri.quantity, "return", reason, sale._id.toString());
      }
    }

    const newTotalReturned = sale.totalRefunded + totalRefundThisReturn;
    const totalReturnableValue = sale.items.reduce((s, i) => s + i.subtotal, 0);
    const newStatus = newTotalReturned >= totalReturnableValue ? "fully_returned" : "partially_returned";

    sale.returnedItems.push(...newReturnedItems);
    sale.totalRefunded = +newTotalReturned.toFixed(2);
    sale.status = newStatus;
    await sale.save();

    if (sale.customerId) {
      const hasPayLater = sale.paymentMethod === "paylater" || (sale.splitPayments || []).some(p => p.method === "paylater");
      if (hasPayLater) await Customer.findByIdAndUpdate(sale.customerId, { $inc: { outstandingBalance: -totalRefundThisReturn } });
    }

    await audit(req, "sale_returned", `Return $${totalRefundThisReturn.toFixed(2)} from #${sale._id} — ${reason || "no reason"}`,
      { saleId: sale._id, totalRefundThisReturn, reason });

    res.json({ message: "Return processed", sale, refundAmount: totalRefundThisReturn });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

/* ── VOID SALE ───────────────────────────────────────────────── */
export const voidSale = async (req, res) => {
  try {
    const { managerPin, reason = "" } = req.body;
    const sale = await Sale.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    if (sale.status === "fully_returned") return res.status(400).json({ message: "Sale already voided/returned" });

    // Simple PIN check against store setting — can be enhanced
    const Store = (await import("../models/Store.js")).default;
    const store = await Store.findById(req.storeId);
    if (store?.voidPin && store.voidPin !== managerPin) {
      return res.status(403).json({ message: "Incorrect PIN" });
    }

    // Restock all items
    for (const item of sale.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const stockBefore = product.stock;
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
        await logStock(req, { ...product.toObject(), stock: stockBefore }, +item.quantity, "return", `Void: ${reason}`, sale._id.toString());
      }
    }

    sale.status = "fully_returned";
    sale.totalRefunded = sale.total;
    sale.returnedItems = sale.items.map(i => ({
      productId: i.productId, name: i.name, quantity: i.quantity,
      refundAmount: i.subtotal, reason: `VOID: ${reason}`, returnedAt: new Date(), returnedBy: req.user._id,
    }));
    await sale.save();

    await audit(req, "sale_voided", `Sale VOIDED #${sale._id} — $${sale.total} — ${reason}`,
      { saleId: sale._id, total: sale.total, reason });

    res.json({ message: "Sale voided", sale });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

/* ── PROFIT & LOSS ───────────────────────────────────────────── */
export const getProfitLoss = async (req, res) => {
  try {
    const { from, to } = req.query;
    const storeId = req.storeId;

    const match = { storeId, status: { $ne: "fully_returned" } };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to)   match.createdAt.$lte = new Date(new Date(to).setHours(23,59,59,999));
    }

    const sales = await Sale.find(match);

    let revenue = 0, cogs = 0, discounts = 0, refunds = 0;

    for (const sale of sales) {
      revenue   += sale.total;
      discounts += sale.discountAmount || 0;
      refunds   += sale.totalRefunded  || 0;

      for (const item of sale.items) {
        cogs += (item.cost || 0) * item.quantity;
      }
    }

    const grossProfit  = revenue - cogs - refunds;
    const grossMargin  = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : 0;

    // Per-product breakdown
    const productMap = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        const key = item.name;
        if (!productMap[key]) productMap[key] = { name: key, revenue: 0, cost: 0, quantity: 0, profit: 0 };
        productMap[key].revenue  += item.price * item.quantity;
        productMap[key].cost     += (item.cost || 0) * item.quantity;
        productMap[key].quantity += item.quantity;
        productMap[key].profit   += (item.price - (item.cost || 0)) * item.quantity;
      }
    }
    const productBreakdown = Object.values(productMap)
      .map(p => ({ ...p, margin: p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.profit - a.profit);

    // Inventory value: batch costs take priority over product.cost
    const Product = (await import("../models/Product.js")).default;
    const Batch   = (await import("../models/Batch.js")).default;
    const allProducts    = await Product.find({ storeId }).select("cost stock").lean();
    const activeBatches  = await Batch.find({ storeId, remainingQty: { $gt: 0 } }).lean();
    const batchedIds     = new Set(activeBatches.map(b => String(b.productId)));
    const inventoryValue =
      activeBatches.reduce((s, b) => s + (b.costPrice || 0) * b.remainingQty, 0) +
      allProducts.filter(p => !batchedIds.has(String(p._id)) && (p.stock || 0) > 0)
                 .reduce((s, p) => s + (p.cost || 0) * p.stock, 0);

    res.json({
      revenue:        +revenue.toFixed(2),
      cogs:           +cogs.toFixed(2),
      discounts:      +discounts.toFixed(2),
      refunds:        +refunds.toFixed(2),
      grossProfit:    +grossProfit.toFixed(2),
      grossMargin:    +grossMargin,
      totalOrders:    sales.length,
      inventoryValue: +inventoryValue.toFixed(2),
      productBreakdown,
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

/* ── GET SALES ───────────────────────────────────────────────── */
export const getSales = async (req, res) => {
  try {
    const { search, productId, limit = 100, status } = req.query;
    const filter = { storeId: req.storeId };

    if (status) filter.status = status;

    // Filter by productId (for barcode return lookup)
    if (productId) {
      filter["items.productId"] = productId;
    }

    let sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("userId", "username")
      .populate("customerId", "name phone");

    // Text search on customer name or sale ID suffix
    if (search) {
      const q = search.toLowerCase().trim();
      sales = sales.filter(s =>
        s.customerName?.toLowerCase().includes(q) ||
        s._id.toString().slice(-6).toLowerCase() === q ||
        s._id.toString().toLowerCase().includes(q) ||
        s.items?.some(i => i.name?.toLowerCase().includes(q))
      );
    }

    res.json(sales);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, storeId: req.storeId })
      .populate("userId", "username")
      .populate("customerId", "name phone email");
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    res.json(sale);
  } catch (error) { res.status(500).json({ message: error.message }); }
};