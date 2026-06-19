import express from "express";
import cors    from "cors";
import dotenv  from "dotenv";
import { createRequire } from "module";
import path    from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require   = createRequire(import.meta.url);

import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes       from "./routes/auth.routes.js";
import publicRoutes     from "./routes/public.routes.js";
import orderRoutes      from "./routes/order.routes.js";
import telegramRoutes   from "./routes/telegram.routes.js";
import productRoutes    from "./routes/product.routes.js";
import saleRoutes       from "./routes/sale.routes.js";
import categoryRoutes   from "./routes/category.routes.js";
import dashboardRoutes  from "./routes/dashboard.routes.js";
import userRoutes       from "./routes/user.routes.js";
import holdSaleRoutes   from "./routes/holdSale.routes.js";
import storeRoutes      from "./routes/store.routes.js";
import superadminRoutes from "./routes/superadmin.routes.js";
import customerRoutes   from "./routes/customer.routes.js";
import stockRoutes      from "./routes/stock.routes.js";
import auditRoutes      from "./routes/audit.routes.js";
import shiftRoutes      from "./routes/shift.routes.js";
import expenseRoutes    from "./routes/expense.routes.js";
import discountRoutes   from "./routes/discount.routes.js";
import supplierRoutes   from "./routes/supplier.routes.js";
import promoRoutes      from "./routes/promo.routes.js";
import pointsOfferRoutes from "./routes/pointsOffer.routes.js";
import batchRoutes       from "./routes/batch.routes.js";
import aiInsightsRoutes  from "./routes/aiInsights.routes.js";
import cafeRoutes        from "./routes/cafe.routes.js";
import cafePublicRoutes  from "./routes/cafePublic.routes.js";
import warehouseRoutes   from "./routes/warehouse.routes.js";
import licenseRoutes     from "./routes/license.routes.js";
import coffeeExpressRoutes from "./routes/coffeeExpress.routes.js";

dotenv.config();
const app = express();

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:3000",
  "http://localhost:5000",
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // No origin = same-origin or Electron file:// requests
    if (!origin) return callback(null, true);
    if (origin.endsWith(".vercel.app"))       return callback(null, true);
    if (origin.endsWith(".railway.app"))      return callback(null, true);
    if (origin.endsWith(".nexora-bcs.com"))   return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin))     return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

app.use("/api/auth",        authRoutes);
app.use("/api/products",    productRoutes);
app.use("/api/sales",       saleRoutes);
app.use("/api/categories",  categoryRoutes);
app.use("/api/dashboard",   dashboardRoutes);
app.use("/api/users",       userRoutes);
app.use("/api/hold-sales",  holdSaleRoutes);
app.use("/api/store",       storeRoutes);
app.use("/api/superadmin",  superadminRoutes);
app.use("/api/customers",   customerRoutes);
app.use("/api/stock",       stockRoutes);
app.use("/api/audit",       auditRoutes);
app.use("/api/shifts",      shiftRoutes);
app.use("/api/expenses",    expenseRoutes);
app.use("/api/discounts",   discountRoutes);
app.use("/api/suppliers",   supplierRoutes);
app.use("/api/public",        publicRoutes);
app.use("/api/orders",        orderRoutes);
app.use("/api/telegram",      telegramRoutes);
app.use("/api/promos",        promoRoutes);
app.use("/api/points-offers", pointsOfferRoutes);
app.use("/api/batches",       batchRoutes);
app.use("/api/ai",            aiInsightsRoutes);
app.use("/api/cafe",          cafeRoutes);
app.use("/api/cafe/public/:slug", cafePublicRoutes);
app.use("/api/warehouses",    warehouseRoutes);
app.use("/api/license",       licenseRoutes);
app.use("/api/coffee-express", coffeeExpressRoutes);

/* Public demo-request endpoint — called from the nexora marketing website */
app.post("/api/demo-request", async (req, res) => {
  try {
    const { name, business, email, phone } = req.body;
    if (!name || !email) return res.status(400).json({ message: "name and email are required" });

    const User = (await import("./models/User.js")).default;
    const { sendMessage } = await import("./services/telegram.service.js");

    const superAdmin = await User.findOne({ role: "superadmin" })
      .select("platformTelegramBotToken platformAdminChatId");

    const botToken = superAdmin?.platformTelegramBotToken || process.env.PLATFORM_TELEGRAM_BOT_TOKEN;
    const chatId   = superAdmin?.platformAdminChatId;

    if (botToken && chatId) {
      const text =
        `🆕 <b>New Free Trial Request</b>\n\n` +
        `👤 <b>Name:</b> ${name}\n` +
        `🏪 <b>Business:</b> ${business || "—"}\n` +
        `📧 <b>Email:</b> ${email}\n` +
        `📱 <b>WhatsApp:</b> ${phone || "—"}\n\n` +
        `⏳ <b>Trial period:</b> 3 days\n` +
        `🔗 Create account: https://bcs.nexora-bcs.com/register`;
      await sendMessage(botToken, chatId, text);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[demo-request]", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

/* Public trivia endpoint (no auth) */
app.get("/api/cafe/trivia/public/:slug", async (req, res) => {
  try {
    const Store            = (await import("./models/Store.js")).default;
    const CafeTriviaQuestion = (await import("./models/CafeTriviaQuestion.js")).default;
    const store = await Store.findOne({ slug: req.params.slug, active: true, cafeEnabled: true });
    if (!store) return res.status(404).json({ message: "Café not found" });
    const questions = await CafeTriviaQuestion.find({ storeId: store._id, isActive: true });
    res.json({ questions });
  } catch { res.status(500).json({ message: "Server error" }); }
});

// Serve uploaded product images
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "../../uploads");
app.use("/uploads", express.static(uploadsDir));

// In Electron (desktop) mode — serve the built frontend so the browser window
// can load everything from a single localhost origin.
if (process.env.ELECTRON_RUN === "true") {
  const frontendDist = process.env.FRONTEND_DIST
    || path.join(__dirname, "../../../frontend/dist");
  app.use(express.static(frontendDist));
  // SPA fallback — any non-API route returns index.html
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  app.get("/", (req, res) => res.send("Market POS API running ✅"));
}

app.use(errorHandler);

export default app;