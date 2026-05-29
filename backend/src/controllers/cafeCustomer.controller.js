import jwt              from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import Store            from "../models/Store.js";
import CafeCustomer, { getTier } from "../models/CafeCustomer.js";
import CafePointTransaction      from "../models/CafePointTransaction.js";
import CafeReward                from "../models/CafeReward.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (id) =>
  jwt.sign({ id, type: "cafe_customer" }, process.env.JWT_SECRET, { expiresIn: "30d" });

const safeCustomer = (c) => ({
  _id:         c._id,
  name:        c.name,
  phone:       c.phone,
  points:      c.points,
  tier:        c.tier,
  multiplier:  getTier(c.points).multiplier,
  pendingBonus: c.pendingBonus,
  lastCheckIn: c.lastCheckIn,
});

/* Award points helper — also updates tier */
export const awardPoints = async (customer, amount, source, description, session = null) => {
  customer.points += amount;
  customer.tier    = getTier(customer.points).name;
  const opts = session ? { session } : {};
  await customer.save(opts);
  await CafePointTransaction.create([{
    customerId:   customer._id,
    storeId:      customer.storeId,
    type:         "earned",
    amount,
    source,
    description,
    balanceAfter: customer.points,
  }], session ? { session } : {});
};

/* ── POST /api/cafe/public/:slug/customers/register ── */
export const register = async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug, active: true, cafeEnabled: true });
    if (!store) return res.status(404).json({ message: "Café not found" });

    const { name, phone, password } = req.body;
    if (!name || !phone || !password)
      return res.status(400).json({ message: "Name, phone and password required" });

    const exists = await CafeCustomer.findOne({ storeId: store._id, phone });
    if (exists) return res.status(400).json({ message: "Phone already registered" });

    const customer = new CafeCustomer({ storeId: store._id, name, phone, password });
    await customer.save();

    /* Welcome bonus */
    await awardPoints(customer, 100, "welcome", "Welcome bonus — first visit");

    const token = signToken(customer._id);
    res.status(201).json({ token, customer: safeCustomer(customer) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ── POST /api/cafe/public/:slug/customers/login ── */
export const login = async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug, active: true, cafeEnabled: true });
    if (!store) return res.status(404).json({ message: "Café not found" });

    const { phone, password } = req.body;
    const customer = await CafeCustomer.findOne({ storeId: store._id, phone });
    if (!customer || !customer.password)
      return res.status(401).json({ message: "Invalid phone or password" });

    const ok = await customer.comparePassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid phone or password" });

    const token = signToken(customer._id);
    res.json({ token, customer: safeCustomer(customer) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ── POST /api/cafe/public/:slug/customers/google ── */
export const googleAuth = async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug, active: true, cafeEnabled: true });
    if (!store) return res.status(404).json({ message: "Café not found" });

    const { credential } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken:  credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, name, email, phone_number } = payload;

    let customer = await CafeCustomer.findOne({ storeId: store._id, googleId });

    if (!customer) {
      /* New google user — use email as phone placeholder if no phone */
      customer = new CafeCustomer({
        storeId:  store._id,
        name:     name || "Guest",
        phone:    phone_number || email,
        googleId,
      });
      await customer.save();
      await awardPoints(customer, 100, "welcome", "Welcome bonus — first visit");
    }

    const token = signToken(customer._id);
    res.json({ token, customer: safeCustomer(customer), isNew: !customer.welcomeBonusClaimed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Google auth failed" });
  }
};

/* ── GET /api/cafe/public/:slug/customers/me ── */
export const getMe = async (req, res) => {
  try {
    const customer = await CafeCustomer.findById(req.customerId);
    if (!customer) return res.status(404).json({ message: "Not found" });
    res.json({ customer: safeCustomer(customer) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ── POST /api/cafe/public/:slug/customers/checkin ── */
export const dailyCheckIn = async (req, res) => {
  try {
    const customer = await CafeCustomer.findById(req.customerId);
    if (!customer) return res.status(404).json({ message: "Not found" });

    const now      = new Date();
    const lastDate = customer.lastCheckIn ? new Date(customer.lastCheckIn) : null;
    const sameDay  = lastDate &&
      lastDate.getFullYear() === now.getFullYear() &&
      lastDate.getMonth()    === now.getMonth()    &&
      lastDate.getDate()     === now.getDate();

    if (sameDay) return res.json({ alreadyClaimed: true, customer: safeCustomer(customer) });

    customer.lastCheckIn = now;
    await awardPoints(customer, 10, "checkin", "Daily check-in bonus");

    res.json({ alreadyClaimed: false, pointsAwarded: 10, customer: safeCustomer(customer) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ── POST /api/cafe/public/:slug/customers/redeem ── */
export const redeemReward = async (req, res) => {
  try {
    const customer = await CafeCustomer.findById(req.customerId);
    if (!customer) return res.status(404).json({ message: "Not found" });

    const reward = await CafeReward.findOne({
      _id:      req.body.rewardId,
      storeId:  customer.storeId,
      isActive: true,
    });
    if (!reward) return res.status(404).json({ message: "Reward not found" });
    if (customer.points < reward.pointsCost)
      return res.status(400).json({ message: "Not enough points" });

    customer.points -= reward.pointsCost;
    customer.tier    = getTier(customer.points).name;
    await customer.save();

    await CafePointTransaction.create({
      customerId:   customer._id,
      storeId:      customer.storeId,
      type:         "spent",
      amount:       reward.pointsCost,
      source:       "redemption",
      description:  `Redeemed: ${reward.name}`,
      balanceAfter: customer.points,
    });

    reward.redemptionCount += 1;
    await reward.save();

    res.json({ reward, customer: safeCustomer(customer) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ── GET /api/cafe/public/:slug/customers/history ── */
export const getPointHistory = async (req, res) => {
  try {
    const customer = await CafeCustomer.findById(req.customerId);
    if (!customer) return res.status(404).json({ message: "Not found" });

    const history = await CafePointTransaction.find({ customerId: customer._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ history });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ── POST /api/cafe/public/:slug/customers/rate ── */
export const rateOrder = async (req, res) => {
  try {
    const { CafeOrderRating } = await import("../models/CafeOrderRating.js");
    const customer = await CafeCustomer.findById(req.customerId);
    if (!customer) return res.status(404).json({ message: "Not found" });

    const { orderId, rating, comment } = req.body;
    const existing = await CafeOrderRating.findOne({ orderId, customerId: customer._id });
    if (existing) return res.status(400).json({ message: "Already rated" });

    await CafeOrderRating.create({
      orderId, customerId: customer._id,
      storeId: customer.storeId, rating, comment,
    });

    await awardPoints(customer, 5, "rating", "Order rating bonus");

    res.json({ pointsAwarded: 5, customer: safeCustomer(customer) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ── Staff-only: GET /api/cafe/customers ── */
export const listCustomers = async (req, res) => {
  try {
    const customers = await CafeCustomer.find({ storeId: req.storeId })
      .select("-password -googleId")
      .sort({ points: -1 });
    res.json({ customers });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ── Staff-only: PUT /api/cafe/customers/:id/points ── */
export const adjustPoints = async (req, res) => {
  try {
    const { amount, description } = req.body;
    const customer = await CafeCustomer.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    await awardPoints(customer, amount, "manual", description || "Manual adjustment by staff");
    res.json({ customer: safeCustomer(customer) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
