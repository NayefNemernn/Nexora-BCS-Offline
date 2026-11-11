import HoldSale from "../models/HoldSale.js";
import Product  from "../models/Product.js";
import Payment  from "../models/Payment.js";
import Batch    from "../models/Batch.js";
import StockLog from "../models/StockLog.js";
import AuditLog from "../models/AuditLog.js";
import { normalizeUnit, normalizeQuantity, lineTotal, roundQty, addQty, subQty, formatQty } from "../utils/quantity.js";
import { incRounded } from "../utils/stock.js";

const storeQ = (req) => ({ storeId: req.storeId });

async function audit(req, action, description, meta = {}) {
  try { await AuditLog.create({ storeId: req.storeId, userId: req.user._id, username: req.user.username, action, description, meta }); } catch {}
}
async function logStock(req, product, change, type, reason = "", reference = "") {
  try {
    await StockLog.create({
      storeId: req.storeId, productId: product._id, userId: req.user._id,
      productName: product.name, type,
      quantityBefore: product.stock, change, quantityAfter: addQty(product.stock, change),
      reason, reference,
    });
  } catch {}
}

export const createHoldSale = async (req, res) => {
  try {
    const { customerName, phone, items, total } = req.body;
    const storeId = req.storeId;
    const userId  = req.user._id;

    // Same FIFO batch deduction + weighted-average cost capture as a normal
    // sale, so a pay-later item carries a real cost basis (needed to restock
    // and account for it correctly if it's ever returned).
    const saleItems = [];
    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, storeId });
      if (!product) return res.status(404).json({ message: "Product not found" });

      // Quantity is in the product's own unit: pieces, kg or L (3 decimals)
      const unitType = normalizeUnit(product.unitType);
      const quantity = normalizeQuantity(item.quantity, unitType);
      if (quantity === null) return res.status(400).json({ message: `${product.name} — invalid quantity` });
      if (product.stock < quantity) return res.status(400).json({ message: `${product.name} insufficient stock` });

      const stockBefore = product.stock;

      const batchesWithExpiry = await Batch.find({ productId: product._id, storeId, remainingQty: { $gt: 0 }, expiryDate: { $ne: null } }).sort({ expiryDate: 1 });
      const batchesNoExpiry   = await Batch.find({ productId: product._id, storeId, remainingQty: { $gt: 0 }, expiryDate: null }).sort({ createdAt: 1 });
      const activeBatches = [...batchesWithExpiry, ...batchesNoExpiry];

      let itemCost = product.cost || 0;
      if (activeBatches.length > 0) {
        let costNumerator = 0, costDenominator = 0, remaining = quantity;
        for (const batch of activeBatches) {
          if (remaining <= 0) break;
          const deduct = Math.min(batch.remainingQty, remaining);
          await Batch.findByIdAndUpdate(batch._id, incRounded("remainingQty", -deduct));
          costNumerator   += deduct * (batch.costPrice || 0);
          costDenominator += deduct;
          remaining = subQty(remaining, deduct);
        }
        if (costDenominator > 0) itemCost = +(costNumerator / costDenominator).toFixed(4);
      }

      saleItems.push({ productId: item.productId, name: item.name, price: item.price, cost: itemCost, quantity, unitType });

      await Product.findByIdAndUpdate(item.productId, incRounded("stock", -quantity));
      await logStock(req, { ...product.toObject(), stock: stockBefore }, -quantity, "sale", "", "");
    }

    // Only reuse an account that's still open — a fully-paid account stays
    // archived as its own closed record, so new credit starts a fresh one
    // (keeps its own createdAt for accurate period reporting).
    let sale = await HoldSale.findOne({ customerName, storeId, status: { $ne: "paid" } });
    if (sale) {
      sale.items.push(...saleItems);
      sale.total   += total;
      sale.balance += total;
      await sale.save();
      return res.json(sale);
    }

    sale = await HoldSale.create({ storeId, userId, customerName, phone, items: saleItems, total, paid: 0, balance: total });
    res.status(201).json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ── OPENING BALANCE (admin) ────────────────────────────────────
   Records debt a customer already owed before the system was in use.
   No items and no stock change — just an amount owed. Added to the
   customer's open account if they have one, otherwise opens a new one. */
export const createOpeningBalance = async (req, res) => {
  try {
    const customerName = (req.body.customerName || "").trim();
    const phone        = (req.body.phone || "").trim();
    const notes        = (req.body.notes || "").trim();
    const amount       = +Number(req.body.amount).toFixed(6);
    const creditLimit  = req.body.creditLimit != null && req.body.creditLimit !== "" ? Number(req.body.creditLimit) : null;

    if (!customerName) return res.status(400).json({ message: "Customer name is required" });
    if (!(amount > 0))  return res.status(400).json({ message: "Amount must be positive" });
    if (creditLimit != null && !(creditLimit >= 0)) return res.status(400).json({ message: "Invalid credit limit" });

    let sale = await HoldSale.findOne({ customerName, storeId: req.storeId, status: { $ne: "paid" } });
    if (sale) {
      sale.openingBalance = +((sale.openingBalance || 0) + amount).toFixed(6);
      sale.total   = +(sale.total + amount).toFixed(6);
      sale.balance = +(sale.balance + amount).toFixed(6);
      if (phone && !sale.phone) sale.phone = phone;
      if (creditLimit != null) sale.creditLimit = creditLimit;
      if (notes) sale.notes = sale.notes ? `${sale.notes}\n${notes}` : notes;
      await sale.save();
    } else {
      sale = await HoldSale.create({
        storeId: req.storeId, userId: req.user._id,
        customerName, phone, notes, items: [],
        openingBalance: amount, total: amount, paid: 0, balance: amount,
        ...(creditLimit != null ? { creditLimit } : {}),
      });
    }

    await audit(req, "paylater_opening_balance", `Pay Later opening balance $${amount.toFixed(2)} — ${customerName}${notes ? " — " + notes : ""}`,
      { holdSaleId: sale._id, amount });

    res.status(201).json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHoldSales = async (req, res) => {
  try {
    const { productId, search, limit } = req.query;
    const filter = storeQ(req);
    if (productId) filter["items.productId"] = productId;
    // productId/search power the Pay Later return-search (QuickReturn) —
    // exclude split-sale shadow records there, since those items are
    // already returned through the Sale itself (returnSaleItems/voidSale);
    // surfacing them here too would let the same stock be restocked twice.
    if (productId || search) filter.source = { $ne: "split" };

    let query = HoldSale.find(filter).sort({ createdAt: -1 });
    if (limit) query = query.limit(Number(limit));
    let sales = await query;

    if (search) {
      const q = search.toLowerCase().trim();
      sales = sales.filter(s =>
        (s.customerName || "").toLowerCase().includes(q) ||
        s._id.toString().slice(-6).toLowerCase() === q ||
        s._id.toString().toLowerCase().includes(q) ||
        (s.items || []).some(i => i.name?.toLowerCase().includes(q))
      );
    }

    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ── RETURN ITEMS FROM A PAY-LATER ACCOUNT ──────────────────────
   Mirrors returnSaleItems in sale.controller.js: restock, log stock,
   track returnedItems/totalRefunded — but reduces the account's owed
   total/balance instead of refunding a completed payment. */
export const returnHoldSaleItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { returnItems, reason = "" } = req.body;

    const sale = await HoldSale.findOne({ _id: id, storeId: req.storeId });
    if (!sale) return res.status(404).json({ message: "Pay Later account not found" });
    if (sale.returnStatus === "full") return res.status(400).json({ message: "Already fully returned" });

    let totalRefundThisReturn = 0;
    const newReturnedItems = [];

    for (const ri of returnItems) {
      const saleItem = sale.items.find(i => i.productId.toString() === ri.productId);
      if (!saleItem) return res.status(400).json({ message: "Item not in this account" });

      const alreadyReturned = (sale.returnedItems || [])
        .filter(r => r.productId.toString() === ri.productId)
        .reduce((s, r) => addQty(s, r.quantity), 0);

      // Returned in the unit it was sold in — see returnSaleItems.
      const unitType = normalizeUnit(saleItem.unitType);
      const quantity = normalizeQuantity(ri.quantity, unitType);
      if (quantity === null) return res.status(400).json({ message: `${saleItem.name}: invalid quantity` });

      const maxReturnable = subQty(saleItem.quantity, alreadyReturned);
      if (quantity > maxReturnable) return res.status(400).json({ message: `${saleItem.name}: max ${formatQty(maxReturnable, unitType)} returnable` });

      const refundAmount = +lineTotal(saleItem.price, quantity, unitType).toFixed(6);
      totalRefundThisReturn += refundAmount;
      newReturnedItems.push({ productId: saleItem.productId, name: saleItem.name, quantity, unitType, refundAmount, reason, returnedAt: new Date(), returnedBy: req.user._id });

      const product = await Product.findById(saleItem.productId);
      if (product) {
        const stockBefore = product.stock;
        await Product.findByIdAndUpdate(saleItem.productId, incRounded("stock", quantity));
        await logStock(req, { ...product.toObject(), stock: stockBefore }, +quantity, "return", reason, sale._id.toString());
      }
    }

    sale.returnedItems.push(...newReturnedItems);

    const newTotalReturned     = +((sale.totalRefunded || 0) + totalRefundThisReturn).toFixed(6);
    const totalReturnableValue = sale.items.reduce((s, i) => s + lineTotal(i.price, i.quantity, normalizeUnit(i.unitType)), 0);
    const everythingBack       = sale.items.every(i =>
      sale.returnedItems
        .filter(r => r.productId.toString() === i.productId.toString())
        .reduce((s, r) => addQty(s, r.quantity), 0) >= roundQty(i.quantity)
    );
    const newReturnStatus      = everythingBack || newTotalReturned >= totalReturnableValue - 0.000001 ? "full" : "partial";

    sale.totalRefunded = newTotalReturned;
    sale.returnStatus  = newReturnStatus;
    // Returned goods reduce what the customer actually owes.
    sale.total   = +Math.max(sale.total - totalRefundThisReturn, 0).toFixed(6);
    sale.balance = +Math.max(sale.total - sale.paid, 0).toFixed(6);
    if (sale.balance <= 0) sale.status = "paid";
    await sale.save();

    await audit(req, "paylater_returned", `Pay Later return $${totalRefundThisReturn.toFixed(2)} from #${sale._id} — ${reason || "no reason"}`,
      { holdSaleId: sale._id, totalRefundThisReturn, reason });

    res.json({ message: "Return processed", sale, refundAmount: totalRefundThisReturn });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHoldSaleNames = async (req, res) => {
  try {
    const names = await HoldSale.distinct("customerName", storeQ(req));
    res.json(names);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const payHoldSale = async (req, res) => {
  try {
    const { amount, method, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: "Amount must be positive" });
    const sale = await HoldSale.findOne({ _id: req.params.id, ...storeQ(req) });
    if (!sale) return res.status(404).json({ message: "Receipt not found" });
    if (amount > sale.balance) return res.status(400).json({ message: `Amount exceeds outstanding balance ($${sale.balance.toFixed(2)})` });

    sale.paid    += amount;
    sale.balance  = +(sale.total - sale.paid).toFixed(2);

    await Payment.create({
      storeId: req.storeId, userId: req.user._id,
      customerName: sale.customerName, phone: sale.phone,
      holdSaleId: sale._id, amount, method, notes,
    });

    if (sale.balance <= 0) {
      sale.balance = 0;
      sale.status  = "paid";
    }

    await sale.save();
    res.json(sale.status === "paid" ? { ...sale.toObject(), message: "Receipt fully paid" } : sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateHoldCustomer = async (req, res) => {
  try {
    const sale = await HoldSale.findOneAndUpdate(
      { _id: req.params.id, ...storeQ(req) },
      { customerName: req.body.customerName, phone: req.body.phone },
      { new: true }
    );
    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteHoldSale = async (req, res) => {
  try {
    const sale = await HoldSale.findOne({ _id: req.params.id, ...storeQ(req) });
    if (!sale) return res.status(404).json({ message: "Receipt not found" });
    for (const item of sale.items) {
      await Product.findByIdAndUpdate(item.productId, incRounded("stock", item.quantity));
    }
    await HoldSale.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// All pay-later payments ever received — Reports filters this client-side by period,
// same pattern as the "/sales" list.
export const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find(storeQ(req)).sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRecentPayments = async (req, res) => {
  try {
    const payments = await Payment.find(storeQ(req)).sort({ createdAt: -1 }).limit(10);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const paymentsThisMonth = async (req, res) => {
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
  const payments = await Payment.find({ ...storeQ(req), createdAt: { $gte: start } });
  res.json(payments);
};

export const getCustomerPayments = async (req, res) => {
  const payments = await Payment.find({ ...storeQ(req), customerName: req.params.name }).sort({ createdAt: -1 });
  res.json(payments);
};

export const getCustomerInvoices = async (req, res) => {
  const invoices = await HoldSale.find({ ...storeQ(req), customerName: req.params.name });
  res.json(invoices);
};

export const updateCreditLimit = async (req, res) => {
  try {
    const sale = await HoldSale.findOneAndUpdate(
      { _id: req.params.id, ...storeQ(req) },
      { creditLimit: req.body.creditLimit },
      { new: true }
    );
    if (!sale) return res.status(404).json({ message: "Customer not found" });
    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};