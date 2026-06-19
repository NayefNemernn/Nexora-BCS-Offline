import mongoose from "mongoose";
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import Batch from "../models/Batch.js";
import Category from "../models/Category.js";
import supabase from "../config/supabase.js";
import { v4 as uuid } from "uuid";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function localImageUrl(req, filename) {
  return `${req.protocol}://${req.get("host")}/uploads/${filename}`;
}

// Upload a file to Supabase from disk (multer diskStorage writes to disk first)
async function uploadToSupabase(file, remotePath) {
  const buffer = await fs.readFile(file.path);
  const { error } = await supabase.storage
    .from("products")
    .upload(remotePath, buffer, { contentType: file.mimetype });
  if (error) throw error;
  // Clean up local temp file after successful upload
  await fs.unlink(file.path).catch(() => {});
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/products/${remotePath}`;
}

const storeFilter = (req) => ({ storeId: req.storeId });

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find(storeFilter(req))
      .populate("category", "name")
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getProductByBarcode = async (req, res) => {
  try {
    const product = await Product.findOne({
      barcode: req.params.barcode,
      ...storeFilter(req),
    }).populate("category", "name");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAlerts = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const products = await Product.find(storeFilter(req)).populate("category", "name").lean();

    const lowStock = products
      .filter(p => p.stock <= 5)
      .map(p => ({ _id: p._id, name: p.name, image: p.image, stock: p.stock, category: p.category?.name || "", price: p.price, expiryDate: p.expiryDate || null }))
      .sort((a, b) => a.stock - b.stock);

    const expiring = products
      .filter(p => p.expiryDate)
      .map(p => {
        const exp = new Date(p.expiryDate);
        const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        const alertDays = p.expiryAlertDays ?? 180;
        return { ...p, daysLeft, alertDays };
      })
      .filter(p => p.daysLeft <= p.alertDays)
      .map(p => ({ _id: p._id, name: p.name, image: p.image, stock: p.stock, category: p.category?.name || "", price: p.price, expiryDate: p.expiryDate, daysLeft: p.daysLeft, expired: p.daysLeft < 0, expiryAlertDays: p.expiryAlertDays ?? 180 }))
      .sort((a, b) => a.daysLeft - b.daysLeft);

    res.json({ lowStock, expiring });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getProfitabilityReport = async (req, res) => {
  try {
    const storeId = req.storeId;
    const products = await Product.find({ storeId }).select("name price cost stock image").lean();
    const productMap = {};
    products.forEach(p => { productMap[String(p._id)] = p; });

    const salesAgg = await Sale.aggregate([
      { $match: { storeId } },
      { $unwind: "$items" },
      {
        $group: {
          _id:       "$items.productId",
          name:      { $first: "$items.name" },
          unitsSold: { $sum: "$items.quantity" },
          revenue:   { $sum: "$items.subtotal" },
          cogs:      { $sum: { $multiply: [{ $ifNull: ["$items.cost", 0] }, "$items.quantity"] } },
        }
      },
      { $sort: { revenue: -1 } },
    ]);

    const rows = salesAgg.map(row => {
      const prod    = productMap[String(row._id)] || {};
      const revenue = row.revenue || 0;
      const cogs    = row.cogs    || 0;
      const profit  = revenue - cogs;
      const margin  = revenue > 0 ? (profit / revenue) * 100 : 0;
      return { productId: row._id, name: row.name, image: prod.image || "", price: prod.price || 0, cost: prod.cost || 0, stock: prod.stock || 0, unitsSold: row.unitsSold, revenue: +revenue.toFixed(2), cogs: +cogs.toFixed(2), profit: +profit.toFixed(2), margin: +margin.toFixed(1) };
    });

    const totals = rows.reduce((acc, r) => ({ revenue: acc.revenue + r.revenue, cogs: acc.cogs + r.cogs, profit: acc.profit + r.profit, units: acc.units + r.unitsSold }), { revenue: 0, cogs: 0, profit: 0, units: 0 });

    // Inventory value: use actual batch costs (remaining stock valued at purchase price)
    const activeBatches = await Batch.find({ storeId, remainingQty: { $gt: 0 } }).lean();
    const batchedIds    = new Set(activeBatches.map(b => String(b.productId)));
    const batchInvValue = activeBatches.reduce((s, b) => s + (b.costPrice || 0) * b.remainingQty, 0);
    // Products with stock but no batches — fall back to product.cost
    const noBatchInvValue = products
      .filter(p => !batchedIds.has(String(p._id)) && (p.stock || 0) > 0)
      .reduce((s, p) => s + (p.cost || 0) * p.stock, 0);
    const inventoryValue = batchInvValue + noBatchInvValue;

    res.json({ rows, totals: { revenue: +totals.revenue.toFixed(2), cogs: +totals.cogs.toFixed(2), profit: +totals.profit.toFixed(2), margin: totals.revenue > 0 ? +((totals.profit / totals.revenue) * 100).toFixed(1) : 0, units: totals.units, inventoryValue: +inventoryValue.toFixed(2) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getProductStats = async (req, res) => {
  try {
    const productId      = new mongoose.Types.ObjectId(req.params.id);
    const storeId        = req.storeId;
    const thirtyDaysAgo  = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pipeline = (extraMatch) => [
      { $match: { storeId, ...extraMatch } },
      { $unwind: "$items" },
      { $match: { "items.productId": productId } },
      { $group: { _id: null, sold: { $sum: "$items.quantity" }, revenue: { $sum: "$items.subtotal" } } },
    ];

    const [allTime, last30] = await Promise.all([
      Sale.aggregate(pipeline({})),
      Sale.aggregate(pipeline({ createdAt: { $gte: thirtyDaysAgo } })),
    ]);

    res.json({
      allTime: { sold: allTime[0]?.sold || 0, revenue: allTime[0]?.revenue || 0 },
      last30:  { sold: last30[0]?.sold  || 0, revenue: last30[0]?.revenue  || 0 },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    // Check plan product limit
    const store = req.store;
    const count = await Product.countDocuments({ storeId: req.storeId });
    if (count >= store.maxProducts) {
      return res.status(403).json({ message: `Product limit (${store.maxProducts}) reached. Upgrade your plan.` });
    }

    const { name, price, cost, category, expiryDate, expiryAlertDays, cupSize, coffeeCategory } = req.body;
    let { barcode, stock } = req.body;
    const isCoffeeCup = req.body.isCoffeeCup === true || req.body.isCoffeeCup === "true";
    let imageUrl = "";

    // Coffee Express cups skip barcode/stock entry — they're simple "always in stock" items
    if (isCoffeeCup) {
      if (!barcode) barcode = `CFE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      if (stock === undefined || stock === "") stock = 9999;
    }

    if (req.file) {
      if (supabase) {
        imageUrl = await uploadToSupabase(req.file, `${uuid()}.jpg`);
      } else {
        // Offline/desktop mode — file already saved to disk by multer diskStorage
        imageUrl = localImageUrl(req, req.file.filename);
      }
    }

    const product = await Product.create({
      name, barcode, price, cost: cost || 0, stock,
      category: category || undefined, expiryDate: expiryDate || null,
      expiryAlertDays: expiryAlertDays ? Number(expiryAlertDays) : 180,
      isCoffeeCup,
      cupSize:        cupSize || "",
      coffeeCategory: coffeeCategory || "",
      image:   imageUrl,
      storeId: req.storeId,
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Parse fields that arrive as strings via FormData
    if (typeof updateData.hasVariants === "string") {
      updateData.hasVariants = updateData.hasVariants === "true";
    }
    if (typeof updateData.isAvailableOnline === "string") {
      updateData.isAvailableOnline = updateData.isAvailableOnline === "true";
    }
    if (typeof updateData.vatExempt === "string") {
      updateData.vatExempt = updateData.vatExempt === "true";
    }
    if (typeof updateData.isCoffeeCup === "string") {
      updateData.isCoffeeCup = updateData.isCoffeeCup === "true";
    }
    if (typeof updateData.variants === "string") {
      try { updateData.variants = JSON.parse(updateData.variants); } catch {}
    }
    if (updateData.expiryAlertDays !== undefined) {
      updateData.expiryAlertDays = Number(updateData.expiryAlertDays);
    }

    if (updateData.removeImage === "true") {
      updateData.image = "";
      delete updateData.removeImage;
    }

    if (req.file) {
      if (supabase) {
        updateData.image = await uploadToSupabase(req.file, `products/${uuid()}`);
      } else {
        // Offline/desktop mode — file already saved to disk by multer diskStorage
        updateData.image = localImageUrl(req, req.file.filename);
      }
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      updateData,
      { new: true }
    ).populate("category", "name");

    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await Product.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Parse a quoted CSV value (handles embedded quotes and commas)
function parseCSVLine(line) {
  const result = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      result.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

export const importProducts = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const store = req.store;
    const currentCount = await Product.countDocuments({ storeId: req.storeId });

    const ext = (req.file.originalname || "").split(".").pop().toLowerCase();
    let allRows;

    if (ext === "csv") {
      const text = req.file.buffer.toString("utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      allRows = text.split("\n").filter(l => l.trim()).map(parseCSVLine);
    } else {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet    = workbook.Sheets[workbook.SheetNames[0]];
      allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    }

    // Skip 1 header row for CSV, 2 header rows for xlsx (template has two header rows)
    const skipRows = ext === "csv" ? 1 : 2;
    const dataRows = allRows.slice(skipRows).filter(r => String(r[0]).trim() || String(r[1]).trim());

    const catDocs = await Category.find({ storeId: req.storeId });
    const catMap  = {};
    catDocs.forEach(c => { catMap[c.name.toLowerCase()] = c._id; });

    let inserted = 0, skipped = 0, limitHit = false;
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      if (currentCount + inserted >= store.maxProducts) {
        limitHit = true;
        errors.push({ row: i + 3, reason: `Plan limit: max ${store.maxProducts} products reached` });
        break;
      }

      const row    = dataRows[i];
      const rowNum = i + 3;
      const barcode = String(row[0] || "").trim();
      const name    = String(row[1] || "").trim();

      if (!barcode || !name) { errors.push({ row: rowNum, reason: "Missing barcode or name" }); continue; }

      const exists = await Product.findOne({ barcode, storeId: req.storeId });
      if (exists) { skipped++; continue; }

      const price       = parseFloat(row[2]) || 0;
      const cost        = parseFloat(row[3]) || 0;
      const stock       = parseInt(row[4])   || 0;
      const categoryRaw = String(row[5] || "").trim().toLowerCase();
      const expiryRaw   = String(row[6] || "").trim();
      const imageUrl    = String(row[7] || "").trim();

      let categoryId = null;
      if (categoryRaw) {
        if (catMap[categoryRaw]) {
          categoryId = catMap[categoryRaw];
        } else {
          const newCat = await Category.create({ name: String(row[5]).trim(), storeId: req.storeId });
          catMap[categoryRaw] = newCat._id;
          categoryId = newCat._id;
        }
      }

      let expiryDate = null;
      if (expiryRaw.match(/\d{4}-\d{2}-\d{2}/)) expiryDate = new Date(expiryRaw);

      const product = await Product.create({ name, barcode, price, cost, stock, category: categoryId, expiryDate, image: imageUrl || "", storeId: req.storeId });

      // Create an opening batch so FIFO cost tracking starts from import
      if (stock > 0) {
        await Batch.create({
          storeId:      req.storeId,
          productId:    product._id,
          initialQty:   stock,
          remainingQty: stock,
          costPrice:    cost || 0,
          expiryDate:   expiryDate || null,
          receivedDate: new Date(),
        });
      }

      inserted++;
    }

    const msg = limitHit
      ? `Import stopped: plan limit of ${store.maxProducts} products reached. ${inserted} added, ${skipped} skipped.`
      : `Import done: ${inserted} added, ${skipped} skipped, ${errors.length} errors`;
    res.json({ message: msg, inserted, skipped, errors, limitHit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};