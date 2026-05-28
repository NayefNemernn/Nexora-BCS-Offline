import Sale     from "../models/Sale.js";
import Product  from "../models/Product.js";
import Customer from "../models/Customer.js";
import HoldSale from "../models/HoldSale.js";

export const getDashboardStats = async (req, res) => {
  try {
    const storeId = req.storeId;
    const period  = req.query.period || "today"; // today | week | month | year

    const now       = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekAgo    = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart  = new Date(now.getFullYear(), 0, 1);

    const periodStart = period === "today" ? todayStart
      : period === "week"  ? weekAgo
      : period === "month" ? monthStart
      : yearStart;

    // Chart grouping: today → by hour, year → by month, else → by day-of-month
    const chartGroup = period === "today"
      ? { $hour: "$createdAt" }
      : period === "year"
        ? { $month: "$createdAt" }
        : { $dayOfMonth: "$createdAt" };

    const [today, week, month, year, payLater, totalProducts, totalCustomers,
           lowStockProducts, recentSales, salesChart, topProducts] = await Promise.all([
      Sale.aggregate([
        { $match: { storeId, createdAt: { $gte: todayStart } } },
        { $group: { _id: null, sales: { $sum: "$total" }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { storeId, createdAt: { $gte: weekAgo } } },
        { $group: { _id: null, sales: { $sum: "$total" }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { storeId, createdAt: { $gte: monthStart } } },
        { $group: { _id: null, sales: { $sum: "$total" }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { storeId, createdAt: { $gte: yearStart } } },
        { $group: { _id: null, sales: { $sum: "$total" }, count: { $sum: 1 } } },
      ]),
      HoldSale.aggregate([
        { $match: { storeId } },
        { $group: { _id: null, outstanding: { $sum: "$balance" }, count: { $sum: 1 } } },
      ]),
      Product.countDocuments({ storeId }),
      Customer.countDocuments({ storeId }),
      Product.find({ storeId, stock: { $lte: 5 } }).select("name stock").limit(5),
      Sale.find({ storeId }).sort({ createdAt: -1 }).limit(5).select("total customerName createdAt"),
      Sale.aggregate([
        { $match: { storeId, createdAt: { $gte: periodStart } } },
        { $group: { _id: chartGroup, sales: { $sum: "$total" } } },
        { $sort: { _id: 1 } },
      ]),
      Sale.aggregate([
        { $match: { storeId, createdAt: { $gte: periodStart } } },
        { $unwind: "$items" },
        { $group: { _id: "$items.productId", sold: { $sum: "$items.quantity" }, name: { $first: "$items.name" } } },
        { $sort: { sold: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.json({
      todaySales:    today[0]?.sales  || 0,
      todayOrders:   today[0]?.count  || 0,
      weekSales:     week[0]?.sales   || 0,
      weekOrders:    week[0]?.count   || 0,
      monthSales:    month[0]?.sales  || 0,
      monthOrders:   month[0]?.count  || 0,
      yearSales:     year[0]?.sales   || 0,
      yearOrders:    year[0]?.count   || 0,
      payLaterOutstanding: payLater[0]?.outstanding || 0,
      payLaterAccounts:    payLater[0]?.count       || 0,
      totalProducts,
      customers:        totalCustomers,
      lowStock:         lowStockProducts.length,
      lowStockProducts,
      recentSales,
      salesChart:       salesChart.map(s => ({ day: s._id, sales: s.sales })),
      topProducts:      topProducts.map(p => ({ _id: p._id, name: p.name, sold: p.sold })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};