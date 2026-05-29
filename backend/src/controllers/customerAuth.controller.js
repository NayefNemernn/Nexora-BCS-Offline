import bcrypt   from "bcryptjs";
import jwt      from "jsonwebtoken";
import Customer from "../models/Customer.js";
import Store    from "../models/Store.js";

const sign = (customerId, storeId) =>
  jwt.sign({ customerId, storeId, role: "customer" }, process.env.JWT_SECRET, { expiresIn: "30d" });

const safe = (c) => {
  const obj = c.toObject();
  delete obj.password;
  return obj;
};

/* ── POST /api/public/:slug/auth/register ── */
export const registerCustomer = async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug });
    if (!store) return res.status(404).json({ message: "Store not found" });

    const { name, phone, password, address, locationDescription, lat, lng } = req.body;
    if (!name?.trim() || !phone?.trim() || !password)
      return res.status(400).json({ message: "Name, phone and password are required" });

    let customer = await Customer.findOne({ storeId: store._id, phone: phone.trim() }).select("+password");

    if (customer) {
      if (customer.password)
        return res.status(400).json({ message: "Phone already registered. Please login." });
      customer.password            = await bcrypt.hash(password, 10);
      customer.name                = name.trim();
      if (address)             customer.address             = address;
      if (locationDescription) customer.locationDescription = locationDescription;
      if (lat)                 customer.lat                 = lat;
      if (lng)                 customer.lng                 = lng;
      await customer.save();
    } else {
      customer = await Customer.create({
        storeId: store._id,
        name:    name.trim(),
        phone:   phone.trim(),
        password: await bcrypt.hash(password, 10),
        address: address || "",
        locationDescription: locationDescription || "",
        lat: lat || null,
        lng: lng || null,
      });
    }

    res.status(201).json({ token: sign(customer._id, store._id), customer: safe(customer) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── POST /api/public/:slug/auth/login ── */
export const loginCustomer = async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug });
    if (!store) return res.status(404).json({ message: "Store not found" });

    const { phone, password } = req.body;
    if (!phone?.trim() || !password)
      return res.status(400).json({ message: "Phone and password are required" });

    const customer = await Customer.findOne({ storeId: store._id, phone: phone.trim() }).select("+password");
    if (!customer || !customer.password)
      return res.status(401).json({ message: "Invalid phone or password" });

    const match = await bcrypt.compare(password, customer.password);
    if (!match) return res.status(401).json({ message: "Invalid phone or password" });

    res.json({ token: sign(customer._id, store._id), customer: safe(customer) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Middleware: verify customer JWT ── */
export const verifyCustomer = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Not authenticated" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "customer") return res.status(401).json({ message: "Not authenticated" });
    req.customerId = decoded.customerId;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

/* ── GET /api/public/:slug/auth/me ── */
export const getProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customerId);
    if (!customer) return res.status(404).json({ message: "Not found" });
    res.json({ customer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── PATCH /api/public/:slug/auth/me ── */
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, locationDescription, lat, lng } = req.body;
    const customer = await Customer.findById(req.customerId);
    if (!customer) return res.status(404).json({ message: "Not found" });

    if (name)                        customer.name                = name.trim();
    if (phone)                       customer.phone               = phone.trim();
    if (address !== undefined)       customer.address             = address;
    if (locationDescription !== undefined) customer.locationDescription = locationDescription;
    if (lat !== undefined)           customer.lat                 = lat;
    if (lng !== undefined)           customer.lng                 = lng;
    await customer.save();

    res.json({ customer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── GET /api/public/:slug/auth/addresses ── */
export const getAddresses = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customerId).select("savedAddresses");
    if (!customer) return res.status(404).json({ message: "Not found" });
    res.json({ addresses: customer.savedAddresses || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── POST /api/public/:slug/auth/addresses ── */
export const addAddress = async (req, res) => {
  try {
    const { label, address, locationDescription, lat, lng } = req.body;
    if (!address?.trim()) return res.status(400).json({ message: "Address is required" });

    const customer = await Customer.findById(req.customerId);
    if (!customer) return res.status(404).json({ message: "Not found" });

    customer.savedAddresses.push({ label: label || "", address: address.trim(), locationDescription: locationDescription || "", lat: lat || null, lng: lng || null });
    await customer.save();

    res.status(201).json({ addresses: customer.savedAddresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── DELETE /api/public/:slug/auth/addresses/:addrId ── */
export const deleteAddress = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customerId);
    if (!customer) return res.status(404).json({ message: "Not found" });

    customer.savedAddresses = customer.savedAddresses.filter(
      a => a._id.toString() !== req.params.addrId
    );
    await customer.save();

    res.json({ addresses: customer.savedAddresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
