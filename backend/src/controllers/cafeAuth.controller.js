import jwt       from "jsonwebtoken";
import bcrypt    from "bcryptjs";
import CafeStaff from "../models/CafeStaff.js";
import Store     from "../models/Store.js";

export const cafeStaffLogin = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "Username and password required" });

  try {
    const staff = await CafeStaff.findOne({ username: username.trim().toLowerCase() });
    if (!staff || !staff.isActive)
      return res.status(401).json({ message: "Invalid credentials" });

    const store = await Store.findById(staff.storeId);
    if (!store || !store.active || !store.cafeEnabled)
      return res.status(403).json({ message: "Café is not active for this account" });

    const ok = await bcrypt.compare(password, staff.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: staff._id, type: "cafe_staff", storeId: staff.storeId },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      token,
      staff: { _id: staff._id, username: staff.username, name: staff.name, role: staff.role },
      store: {
        _id: store._id, name: store.name,
        currencySymbol: store.currencySymbol || "$",
        taxRate: store.taxRate || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCafeStaffMe = async (req, res) => {
  if (req.isCafeStaff) {
    return res.json({ staff: req.cafeStaff, store: req.store });
  }
  res.json({ user: req.user, store: req.store });
};
