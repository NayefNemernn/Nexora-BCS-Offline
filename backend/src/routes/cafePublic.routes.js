import express    from "express";
import jwt        from "jsonwebtoken";
import CafeCustomer from "../models/CafeCustomer.js";
import {
  getPublicCafe, placePublicOrder, trackOrder, getPublicRewards,
} from "../controllers/cafePublic.controller.js";
import {
  register, login, googleAuth, getMe, dailyCheckIn, redeemReward, getPointHistory, rateOrder,
} from "../controllers/cafeCustomer.controller.js";
import {
  getGameStatus, recordGameResult,
} from "../controllers/cafeGame.controller.js";

const router = express.Router({ mergeParams: true }); // access :slug from parent

/* ── Middleware: optional customer auth ── */
const customerAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== "cafe_customer") return next();
    const customer = await CafeCustomer.findById(decoded.id);
    if (customer) req.customerId = decoded.id;
  } catch { /* ignore */ }
  next();
};

/* ── Middleware: require customer auth ── */
const requireCustomer = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ message: "Login required" });
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== "cafe_customer")
      return res.status(401).json({ message: "Invalid token type" });
    const customer = await CafeCustomer.findById(decoded.id);
    if (!customer) return res.status(401).json({ message: "Customer not found" });
    req.customerId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

/* ── Public (no auth) ── */
router.get("/",                         getPublicCafe);
router.get("/rewards",                  getPublicRewards);
router.get("/order/:orderId",           trackOrder);
router.post("/order",                   customerAuth, placePublicOrder);

/* ── Customer auth ── */
router.post("/customers/register",      register);
router.post("/customers/login",         login);
router.post("/customers/google",        googleAuth);
router.get("/customers/me",             requireCustomer, getMe);
router.post("/customers/checkin",       requireCustomer, dailyCheckIn);
router.post("/customers/redeem",        requireCustomer, redeemReward);
router.get("/customers/history",        requireCustomer, getPointHistory);
router.post("/customers/rate",          requireCustomer, rateOrder);

/* ── Games ── */
router.get("/games/status",             requireCustomer, getGameStatus);
router.post("/games/result",            requireCustomer, recordGameResult);

export default router;
