import Customer from "../models/Customer.js";
import Sale     from "../models/Sale.js";
import AuditLog from "../models/AuditLog.js";

async function audit(req, action, description, meta = {}) {
  try {
    await AuditLog.create({ storeId: req.storeId, userId: req.user._id, username: req.user.username, action, description, meta });
  } catch {}
}

/* GET /api/customers */
export const getCustomers = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { storeId: req.storeId, active: true };
    if (q) filter.$or = [
      { name:  { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
    ];
    const customers = await Customer.find(filter).sort({ name: 1 });
    res.json(customers);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

/* GET /api/customers/:id */
export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    /* attach purchase history */
    const sales = await Sale.find({ customerId: customer._id, storeId: req.storeId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("total paymentMethod status createdAt items totalRefunded splitPayments");

    res.json({ customer, sales });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

/* POST /api/customers */
export const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });

    const customer = await Customer.create({ storeId: req.storeId, name, phone, email, address, notes });
    await audit(req, "customer_created", `Customer created: ${name}`, { customerId: customer._id });
    res.status(201).json(customer);
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ message: "Customer already exists" });
    res.status(500).json({ message: e.message });
  }
};

/* PUT /api/customers/:id */
export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { $set: req.body },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    await audit(req, "customer_updated", `Customer updated: ${customer.name}`, { customerId: customer._id });
    res.json(customer);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

/* DELETE /api/customers/:id  (soft delete) */
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { active: false },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json({ message: "Customer removed" });
  } catch (e) { res.status(500).json({ message: e.message }); }
};