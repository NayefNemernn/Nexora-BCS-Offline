// expense.controller.js
import Expense from "../models/Expense.js";
import AuditLog from "../models/AuditLog.js";

async function audit(req, action, description, meta = {}) {
  try { await AuditLog.create({ storeId: req.storeId, userId: req.user._id, username: req.user.username, action, description, meta }); } catch {}
}

export const getExpenses = async (req, res) => {
  try {
    const { from, to, category } = req.query;
    const filter = { storeId: req.storeId };
    if (category) filter.category = category;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }
    const expenses = await Expense.find(filter).sort({ date: -1 }).limit(500);
    res.json(expenses);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getExpenseSummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const match = { storeId: req.storeId };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to)   match.date.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }
    const summary = await Expense.aggregate([
      { $match: match },
      { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);
    const totalAmount = summary.reduce((s, x) => s + x.total, 0);
    res.json({ summary, totalAmount });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const createExpense = async (req, res) => {
  try {
    const { title, amount, category, paymentMethod, notes, date } = req.body;
    if (!title || !amount) return res.status(400).json({ message: "title and amount are required" });
    const expense = await Expense.create({
      storeId: req.storeId, userId: req.user._id, username: req.user.username,
      title, amount, category, paymentMethod, notes,
      date: date ? new Date(date) : new Date(),
    });
    await audit(req, "expense_created", `Expense added: ${title} — $${amount}`, { expenseId: expense._id });
    res.status(201).json(expense);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      req.body, { new: true }
    );
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json(expense);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Expense deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};