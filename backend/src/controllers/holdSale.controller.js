import HoldSale from "../models/HoldSale.js";
import Product from "../models/Product.js";
import Payment from "../models/Payment.js";

const storeQ = (req) => ({ storeId: req.storeId });

export const createHoldSale = async (req, res) => {
  try {
    const { customerName, phone, items, total } = req.body;
    const storeId = req.storeId;
    const userId  = req.user._id;

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, storeId });
      if (!product) return res.status(404).json({ message: "Product not found" });
      if (product.stock < item.quantity) return res.status(400).json({ message: `${product.name} insufficient stock` });
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
    }

    let sale = await HoldSale.findOne({ customerName, storeId });
    if (sale) {
      sale.items.push(...items);
      sale.total   += total;
      sale.balance += total;
      await sale.save();
      return res.json(sale);
    }

    sale = await HoldSale.create({ storeId, userId, customerName, phone, items, total, paid: 0, balance: total });
    res.status(201).json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHoldSales = async (req, res) => {
  try {
    const sales = await HoldSale.find(storeQ(req)).sort({ createdAt: -1 });
    res.json(sales);
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
      await HoldSale.findByIdAndDelete(req.params.id);
      return res.json({ message: "Receipt fully paid" });
    }

    await sale.save();
    res.json(sale);
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
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
    }
    await HoldSale.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
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