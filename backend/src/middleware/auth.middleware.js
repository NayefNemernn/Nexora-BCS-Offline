import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Store from "../models/Store.js";

/* ─────────────────────────────────────────────
   protect
   Validates JWT, loads user + store, injects:
     req.user    → user document
     req.storeId → ObjectId (null for superadmin)
───────────────────────────────────────────── */
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user)        return res.status(401).json({ message: "User not found" });
    if (!user.active) return res.status(403).json({ message: "Account disabled" });

    // ── Session / device validation ───────────────────────────
    const deviceId = decoded.deviceId;
    if (deviceId) {
      const device = user.devices.find(d => d.deviceId === deviceId);
      if (!device || device.sessionToken !== decoded.sessionToken) {
        return res.status(401).json({ message: "Session expired. Please log in again." });
      }
    } else {
      if (user.sessionToken !== decoded.sessionToken) {
        return res.status(401).json({ message: "Session expired. Please log in again." });
      }
    }

    req.user = user;

    // ── Inject storeId for all non-superadmin requests ────────
    if (user.role !== "superadmin") {
      // Handle pre-migration users: if admin has no storeId, create their store on the fly
      if (!user.storeId) {
        if (user.role === "admin") {
          // Auto-create store for this admin (handles pre-migration state)
          const store = await Store.create({
            name:  user.storeName || user.username + "'s Store",
            owner: user._id,
          });
          user.storeId = store._id;
          await user.save();
        } else {
          return res.status(403).json({ message: "User is not assigned to any store." });
        }
      }

      // Verify store is still active
      const store = await Store.findById(user.storeId);
      if (!store || !store.active) {
        return res.status(403).json({ message: "Store is inactive or not found." });
      }

      // Check plan expiry (skip check in development)
      if (store.planExpiresAt && store.planExpiresAt < new Date() && process.env.NODE_ENV === "production") {
        return res.status(402).json({ message: "Store subscription has expired. Please renew." });
      }

      req.storeId = user.storeId;
      req.store   = store;
    }

    next();
  } catch {
    res.status(401).json({ message: "Token invalid" });
  }
};

/* ─────────────────────────────────────────────
   Role guards
───────────────────────────────────────────── */
export const isAdmin = (req, res, next) => {
  if (!req.user || !["admin", "superadmin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

export const isSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Super-admin access only" });
  }
  next();
};