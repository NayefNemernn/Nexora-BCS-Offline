import jwt       from "jsonwebtoken";
import User      from "../models/User.js";
import CafeStaff from "../models/CafeStaff.js";
import Store     from "../models/Store.js";

/* Accepts both regular POS tokens AND café-staff tokens */
export const protectCafe = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ message: "Not authorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === "cafe_staff") {
      /* ── Café staff token ── */
      const staff = await CafeStaff.findById(decoded.id).select("-password");
      if (!staff || !staff.isActive)
        return res.status(401).json({ message: "Invalid café account" });

      const store = await Store.findById(staff.storeId);
      if (!store || !store.active || !store.cafeEnabled)
        return res.status(403).json({ message: "Café is not active for this account" });

      req.cafeStaff   = staff;
      req.storeId     = staff.storeId;
      req.store       = store;
      req.isCafeStaff = true;
    } else {
      /* ── Regular main-POS token ── */
      const user = await User.findById(decoded.id).select("-password");
      if (!user || !user.active)
        return res.status(401).json({ message: "User not found" });

      const store = await Store.findById(user.storeId);
      if (!store || !store.active)
        return res.status(403).json({ message: "Store inactive" });

      req.user    = user;
      req.storeId = user.storeId;
      req.store   = store;
    }
    next();
  } catch {
    res.status(401).json({ message: "Token invalid" });
  }
};

/* Admin (main POS) OR café manager */
export const isCafeManager = (req, res, next) => {
  if (req.user && ["admin", "superadmin"].includes(req.user.role)) return next();
  if (req.isCafeStaff && req.cafeStaff.role === "manager") return next();
  return res.status(403).json({ message: "Manager access only" });
};
