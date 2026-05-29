import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import User  from "../models/User.js";
import Store from "../models/Store.js";
import { getMachineMAC } from "../services/licenseManager.js";

/* ─────────────────────────────────────────────
   REGISTER  (creates store + admin together)
   POST /api/auth/register
   Body: { username, password, storeName, currency?, language? }
───────────────────────────────────────────── */
export const register = async (req, res) => {
  try {
    const { username, password, storeName, currency, language } = req.body;

    if (!username || !password || !storeName) {
      return res.status(400).json({ message: "username, password and storeName are required" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: "Username already taken" });

    // 1. Create the admin user (no storeId yet)
    const admin = new User({ username, password, role: "admin" });
    await admin.save();

    // 2. Create the store owned by this admin
    const store = await Store.create({
      name:     storeName,
      owner:    admin._id,
      currency: currency || "USD",
      language: language || "en",
    });

    // 3. Link admin → store
    admin.storeId = store._id;
    await admin.save();

    res.status(201).json({
      message: "Account created successfully",
      user: {
        id:       admin._id,
        username: admin.username,
        role:     admin.role,
      },
      store: {
        id:   store._id,
        name: store.name,
        slug: store.slug,
        plan: store.plan,
        planExpiresAt: store.planExpiresAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────
   LOGIN
   POST /api/auth/login
───────────────────────────────────────────── */
export const login = async (req, res) => {
  try {
    const { username, password, deviceId, deviceName, deviceOS, deviceBrowser } = req.body;

    const user = await User.findOne({ username }).populate("storeId");
    if (!user)            return res.status(401).json({ message: "Invalid credentials" });
    if (!user.active)     return res.status(403).json({ message: "Account disabled" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // ── Store checks (skip for superadmin) ────────────────────
    let store = null;
    if (user.role !== "superadmin") {
      store = user.storeId; // populated
      if (!store || !store.active) {
        return res.status(403).json({ message: "Store is inactive. Contact support." });
      }
      if (store.planExpiresAt && store.planExpiresAt < new Date()) {
        return res.status(402).json({ message: "Store subscription expired. Please renew." });
      }

      // ── License enforcement (only for stores created from a .nexora license) ──
      if (store.licenseId) {
        // 1. Expiry check
        if (store.licenseExpiresAt && store.licenseExpiresAt < new Date()) {
          return res.status(402).json({
            message:        "Your software license has expired. Contact your provider to renew.",
            licenseExpired: true,
            licenseId:      store.licenseId,
          });
        }

        // 2. MAC address check
        const currentMAC = getMachineMAC();
        if (store.allowedMACs.length === 0) {
          // First device ever — auto-register this machine's MAC
          store.allowedMACs.push(currentMAC);
          await store.save();
        } else if (!store.allowedMACs.includes(currentMAC)) {
          return res.status(403).json({
            message:            "This device is not authorized to use this software. Contact your provider.",
            unauthorizedDevice: true,
            currentMAC,
          });
        }
      }
    }

    // ── Device management ─────────────────────────────────────
    const maxDevices = user.maxDevices || 1;
    const existingDeviceIdx = user.devices.findIndex(d => d.deviceId === deviceId);

    if (existingDeviceIdx === -1 && user.devices.length >= maxDevices) {
      return res.status(403).json({
        message: `Account limited to ${maxDevices} device(s). Ask admin to free a slot.`,
        devicesUsed: user.devices.length,
        maxDevices,
      });
    }

    const sessionToken = uuid();
    const now          = new Date();
    const ip           = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || null;

    const deviceEntry = {
      deviceId,
      deviceName:    deviceName    || "Unknown Device",
      deviceOS:      deviceOS      || "Unknown OS",
      deviceBrowser: deviceBrowser || "Unknown Browser",
      lastLoginAt:   now,
      lastLoginIP:   ip,
      sessionToken,
    };

    if (existingDeviceIdx !== -1) {
      user.devices[existingDeviceIdx] = deviceEntry;
    } else {
      user.devices.push(deviceEntry);
    }

    // Legacy fields
    user.deviceId      = deviceId;
    user.deviceName    = deviceEntry.deviceName;
    user.deviceOS      = deviceEntry.deviceOS;
    user.deviceBrowser = deviceEntry.deviceBrowser;
    user.lastLoginAt   = now;
    user.lastLoginIP   = ip;
    user.sessionToken  = sessionToken;

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, storeId: user.storeId?._id || null, sessionToken, deviceId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id:       user._id,
        username: user.username,
        role:     user.role,
      },
      store: store
        ? {
            id:             store._id,
            name:           store.name,
            slug:           store.slug,
            logo:           store.logo,
            currency:       store.currency,
            currencySymbol: store.currencySymbol,
            taxRate:        store.taxRate,
            language:       store.language,
            theme:          store.theme,
            receiptFooter:  store.receiptFooter,
            plan:           store.plan,
            planExpiresAt:  store.planExpiresAt,
            cafeEnabled:    store.cafeEnabled || false,
            isOnlineStoreActive: store.isOnlineStoreActive || false,
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────
   LOGOUT
───────────────────────────────────────────── */
export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      const deviceId = req.user.deviceId;
      user.devices = user.devices.filter(d => d.deviceId !== deviceId);
      if (user.devices.length === 0) {
        user.deviceId     = null;
        user.sessionToken = null;
      }
      await user.save();
    }
    res.json({ message: "Logged out" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────
   CHANGE PASSWORD
───────────────────────────────────────────── */
export const changePassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({ _id: userId, storeId: req.storeId });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password     = newPassword;
    user.devices      = [];
    user.deviceId     = null;
    user.sessionToken = null;
    await user.save();

    res.json({ message: "Password updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────
   GET USERS  (scoped to store)
───────────────────────────────────────────── */
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({ storeId: req.storeId, active: true })
      .select("username role _id maxDevices devices createdAt");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};