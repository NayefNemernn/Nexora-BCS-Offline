import Store           from "../models/Store.js";
import CafeMenuItem    from "../models/CafeMenuItem.js";
import CafeTable       from "../models/CafeTable.js";
import CafeOrder       from "../models/CafeOrder.js";
import CafeReward      from "../models/CafeReward.js";
import CafeCustomer, { getTier } from "../models/CafeCustomer.js";
import { getIO }       from "../socket/index.js";
import { awardPoints } from "./cafeCustomer.controller.js";

/* ── GET /api/cafe/public/:slug ── */
export const getPublicCafe = async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug, active: true, cafeEnabled: true })
      .select("name logo currencySymbol cafePointsPerItem");
    if (!store) return res.status(404).json({ message: "Café not found" });

    const menu = await CafeMenuItem.find({ storeId: store._id, isAvailable: true })
      .sort({ displayOrder: 1, name: 1 });

    res.json({ store, menu });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ── POST /api/cafe/public/:slug/order ── */
export const placePublicOrder = async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug, active: true, cafeEnabled: true });
    if (!store) return res.status(404).json({ message: "Café not found" });

    const { tableNumber, items, customerId, rewardId, notes } = req.body;

    if (!tableNumber) return res.status(400).json({ message: "Table number required" });
    if (!items || items.length === 0) return res.status(400).json({ message: "No items in order" });

    /* Find the table */
    const table = await CafeTable.findOne({ storeId: store._id, number: tableNumber });
    if (!table) return res.status(404).json({ message: `Table ${tableNumber} not found` });

    /* Find or create an open order for this table */
    let order = await CafeOrder.findOne({
      storeId: store._id,
      tableId: table._id,
      status:  "open",
    });

    /* Build items array — tag each item with source: customer */
    const menuIds  = items.map(i => i.menuItemId);
    const menuDocs = await CafeMenuItem.find({ _id: { $in: menuIds }, storeId: store._id });
    const menuMap  = Object.fromEntries(menuDocs.map(m => [m._id.toString(), m]));

    const orderItems = items.map(i => {
      const doc = menuMap[i.menuItemId];
      if (!doc) return null;
      return {
        menuItemId: doc._id,
        name:       doc.name,
        price:      doc.price,
        quantity:   i.quantity || 1,
        notes:      i.notes   || "",
        modifiers:  i.modifiers || [],
        status:     "pending",
        sentToKitchen: false,
        source:     "customer",
      };
    }).filter(Boolean);

    if (orderItems.length === 0) return res.status(400).json({ message: "No valid items" });

    /* Handle reward redemption */
    let rewardApplied = null;
    if (rewardId && customerId) {
      const customer = await CafeCustomer.findOne({ _id: customerId, storeId: store._id });
      const reward   = await CafeReward.findOne({ _id: rewardId, storeId: store._id, isActive: true });
      if (customer && reward && customer.points >= reward.pointsCost) {
        customer.points      -= reward.pointsCost;
        customer.tier         = getTier(customer.points).name;
        await customer.save();
        reward.redemptionCount += 1;
        await reward.save();
        rewardApplied = { name: reward.name, type: reward.rewardType, value: reward.value };
      }
    }

    if (!order) {
      order = new CafeOrder({
        storeId:     store._id,
        tableId:     table._id,
        tableNumber: table.number,
        orderType:   "table",
        label:       `Table ${table.number}`,
        items:       orderItems,
        notes:       notes || "",
      });

      /* Mark table occupied */
      table.status        = "occupied";
      table.activeOrderId = order._id;
      await table.save();
    } else {
      order.items.push(...orderItems);
    }

    if (rewardApplied) {
      order.notes = `${order.notes ? order.notes + " | " : ""}Reward: ${rewardApplied.name}`.trim();
    }

    await order.save();

    /* Auto-send to kitchen */
    order.items.forEach(item => {
      if (!item.sentToKitchen) item.sentToKitchen = true;
    });
    await order.save();

    /* Socket — notify kitchen + floor */
    const io = getIO();
    if (io) {
      io.to(`store_${store._id}_kitchen`).emit("cafe_new_order", {
        order, tableNumber: table.number, source: "customer",
      });
      io.to(`store_${store._id}_cafe`).emit("cafe_table_updated", {
        tableId: table._id, status: "occupied", orderId: order._id,
      });
    }

    /* Award order points to logged-in customer */
    let pointsEarned = 0;
    if (customerId) {
      const customer = await CafeCustomer.findOne({ _id: customerId, storeId: store._id });
      if (customer) {
        const ptsPerItem = store.cafePointsPerItem || 10;
        const totalItems = orderItems.reduce((s, i) => s + (i.quantity || 1), 0);
        const multiplier = getTier(customer.points).multiplier;
        const bonus      = customer.pendingBonus?.doubleOrderPoints ? 2 : 1;
        pointsEarned     = Math.round(ptsPerItem * totalItems * multiplier * bonus);

        if (customer.pendingBonus?.doubleOrderPoints) {
          customer.pendingBonus.doubleOrderPoints = false;
        }

        await awardPoints(customer, pointsEarned, "order",
          `Order at Table ${tableNumber} — ${totalItems} items`);
      }
    }

    res.status(201).json({
      order,
      orderId:      order._id,
      tableNumber:  table.number,
      pointsEarned,
      rewardApplied,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ── GET /api/cafe/public/:slug/order/:orderId ── */
export const trackOrder = async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug });
    if (!store) return res.status(404).json({ message: "Café not found" });

    const order = await CafeOrder.findOne({ _id: req.params.orderId, storeId: store._id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    /* Summarise item statuses */
    const summary = {
      total:     order.items.length,
      pending:   order.items.filter(i => i.status === "pending").length,
      preparing: order.items.filter(i => i.status === "preparing").length,
      ready:     order.items.filter(i => i.status === "ready").length,
      served:    order.items.filter(i => i.status === "served").length,
    };

    const allReady = summary.pending === 0 && summary.preparing === 0 && summary.ready >= 0;

    res.json({ order, summary, allReady });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ── GET /api/cafe/public/:slug/rewards ── */
export const getPublicRewards = async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug, active: true, cafeEnabled: true });
    if (!store) return res.status(404).json({ message: "Café not found" });

    const rewards = await CafeReward.find({ storeId: store._id, isActive: true })
      .sort({ pointsCost: 1 });

    res.json({ rewards });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
