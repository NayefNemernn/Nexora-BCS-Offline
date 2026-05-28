import AuditLog from "../models/AuditLog.js";

/* GET /api/audit?action=sale_created&limit=100 */
export const getAuditLogs = async (req, res) => {
  try {
    const filter = { storeId: req.storeId };
    if (req.query.action) filter.action = req.query.action;
    if (req.query.userId) filter.userId = req.query.userId;

    const limit = Math.min(parseInt(req.query.limit) || 100, 500);

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "username");

    res.json(logs);
  } catch (e) { res.status(500).json({ message: e.message }); }
};