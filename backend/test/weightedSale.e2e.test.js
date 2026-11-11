/* End-to-end test of weight / volume products through the real API,
   against a throw-away local MongoDB (no network).

   Flow: create a kg product → sell 0.350 → check total, receipt and
   stock → return / void → check stock is restored exactly.

   Run:  cd backend && npm test                                          */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let mongo, server, base, mongoose;
let Product, Sale, StockLog, Batch, HoldSale, Store;
let tokenA, tokenB, storeA;

// Use the mongod bundled for the desktop build when it is there, so the test
// never needs to download one.
const bundledMongod = fileURLToPath(new URL(
  `../../build-resources/mongodb-binary/${process.platform === "win32" ? "win/mongod.exe" : "linux/mongod"}`,
  import.meta.url
));

const api = async (method, path, body, token = tokenA) => {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
};
const stockOf = async (id) => (await Product.findById(id).lean()).stock;

before(async () => {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  mongo = await MongoMemoryServer.create(
    existsSync(bundledMongod) ? { binary: { systemBinary: bundledMongod } } : {}
  );
  process.env.MONGO_URI  = mongo.getUri();
  process.env.JWT_SECRET = "test-secret";

  mongoose = (await import("mongoose")).default;
  await mongoose.connect(process.env.MONGO_URI);

  ({ default: Product }  = await import("../src/models/Product.js"));
  ({ default: Sale }     = await import("../src/models/Sale.js"));
  ({ default: StockLog } = await import("../src/models/StockLog.js"));
  ({ default: Batch }    = await import("../src/models/Batch.js"));
  ({ default: HoldSale } = await import("../src/models/HoldSale.js"));
  ({ default: Store }    = await import("../src/models/Store.js"));
  const { default: User } = await import("../src/models/User.js");
  const { default: jwt }  = await import("jsonwebtoken");

  // Two stores (branches), each with its own admin
  const login = async (name) => {
    const store = await Store.create({ name, slug: name.toLowerCase().replace(/\s+/g, "-") });
    const user  = await User.create({ username: `${name}-admin`, password: "x", role: "admin", storeId: store._id, sessionToken: "s" });
    return { store, token: jwt.sign({ id: user._id, sessionToken: "s" }, process.env.JWT_SECRET) };
  };
  ({ store: storeA, token: tokenA } = await login("Branch A"));
  ({ token: tokenB } = await login("Branch B"));

  const { default: app } = await import("../src/app.js");
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  server?.close();
  await mongoose?.disconnect();
  await mongo?.stop();
});

let rice, oil, soap;

test("products: unit type is saved, defaults to piece, and is validated", async () => {
  let r = await api("POST", "/products", { name: "Rice", barcode: "R1", price: 4, cost: 2.5, stock: 10, unitType: "kg" });
  assert.equal(r.status, 201);
  assert.equal(r.body.unitType, "kg");
  rice = r.body;

  r = await api("POST", "/products", { name: "Olive Oil", barcode: "O1", price: 2.5, cost: 1.5, stock: 20, unitType: "L" });
  assert.equal(r.body.unitType, "L");
  oil = r.body;

  r = await api("POST", "/products", { name: "Soap", barcode: "S1", price: 1.25, cost: 0.5, stock: 20 });
  assert.equal(r.status, 201);
  assert.equal(r.body.unitType, "piece"); // no unit sent → piece
  soap = r.body;

  r = await api("POST", "/products", { name: "Bad", barcode: "B1", price: 1, stock: 1, unitType: "gallon" });
  assert.equal(r.status, 400);
  r = await api("PUT", `/products/${soap._id}`, { unitType: "gallon" });
  assert.equal(r.status, 400);

  r = await api("PUT", `/products/${soap._id}`, { cost: 0.6 });
  assert.equal(r.body.unitType, "piece"); // editing other fields leaves the unit alone
});

test("migration: products saved before this feature become piece, once", async () => {
  const { backfillProductUnitType } = await import("../src/migrations/addUnitType.js");
  const legacy = await Product.collection.insertOne({
    name: "Legacy", barcode: "L1", price: 3, cost: 1, stock: 7, storeId: storeA._id,
    createdAt: new Date("2025-01-01"), updatedAt: new Date("2025-01-01"),
  });

  assert.equal(await backfillProductUnitType(), 1);
  const doc = await Product.collection.findOne({ _id: legacy.insertedId });
  assert.equal(doc.unitType, "piece");
  assert.equal(doc.price, 3);
  assert.equal(doc.stock, 7);
  assert.deepEqual(doc.updatedAt, new Date("2025-01-01")); // nothing else touched

  assert.equal(await backfillProductUnitType(), 0);        // safe to run again
  assert.equal((await Product.findById(rice._id)).unitType, "kg");
  await Product.deleteOne({ _id: legacy.insertedId });
});

test("sale: 0.350 kg × $4.00 / kg = $1.40, alongside litre and piece lines", async () => {
  const r = await api("POST", "/sales", {
    paymentMethod: "cash",
    items: [
      { productId: rice._id, quantity: 0.35 },
      { productId: oil._id,  quantity: 1.5 },
      { productId: soap._id, quantity: 2 },
    ],
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const [riceLine, oilLine, soapLine] = r.body.sale.items;

  assert.equal(riceLine.quantity, 0.35);
  assert.equal(riceLine.unitType, "kg");
  assert.equal(riceLine.subtotal, 1.4);
  assert.equal(oilLine.unitType, "L");
  assert.equal(oilLine.subtotal, 3.75);
  assert.equal(soapLine.unitType, "piece");
  assert.equal(soapLine.subtotal, 2.5);
  assert.equal(r.body.sale.subtotal, 7.65);
  assert.equal(r.body.sale.total, 7.65);

  // Stock is deducted in kg / L, not pieces — and stored without float drift
  assert.equal(await stockOf(rice._id), 9.65);
  assert.equal(await stockOf(oil._id), 18.5);
  assert.equal(await stockOf(soap._id), 18);

  const log = await StockLog.findOne({ productId: rice._id, type: "sale" }).lean();
  assert.equal(log.quantityBefore, 10);
  assert.equal(log.change, -0.35);
  assert.equal(log.quantityAfter, 9.65);

  // Receipt shows the weight / volume and its unit
  const { generateReceipt } = await import("../src/utils/generateReceipt.js");
  const receipt = generateReceipt(r.body.sale);
  assert.match(receipt, /Rice\n\s+0\.350 kg x \$4\.00\/kg\s+\$1\.40/);
  assert.match(receipt, /Olive Oil\n\s+1\.500 L x \$2\.50\/L\s+\$3\.75/);
  assert.match(receipt, /Soap\n\s+2 x \$1\.25\s+\$2\.50/); // piece line as before
  assert.match(receipt, /TOTAL\s+\$7\.65/);
});

test("sale: invalid quantities are rejected and leave stock untouched", async () => {
  const before = await stockOf(rice._id);
  const sell = (productId, quantity) => api("POST", "/sales", { paymentMethod: "cash", items: [{ productId, quantity }] });

  for (const bad of [0, -1, -0.35, "abc", "0.35", null, 0.3505, 0.0004]) {
    const r = await sell(rice._id, bad);
    assert.equal(r.status, 400, `quantity ${JSON.stringify(bad)} should be rejected`);
  }
  assert.equal((await sell(soap._id, 1.5)).status, 400);  // half a piece
  assert.equal((await sell(soap._id, -2)).status, 400);
  assert.equal((await sell(rice._id, 9.651)).status, 400); // 1 g more than in stock

  assert.equal(await stockOf(rice._id), before);
  assert.equal(await stockOf(soap._id), 18);
});

test("discount and VAT apply to weighed lines like any other", async () => {
  await Store.updateOne({ _id: storeA._id }, { taxRate: 11 });
  const r = await api("POST", "/sales", {
    paymentMethod: "cash", discountAmount: 0.1,
    items: [{ productId: rice._id, quantity: 0.35 }, { productId: soap._id, quantity: 1 }],
  });
  await Store.updateOne({ _id: storeA._id }, { taxRate: 0 });

  assert.equal(r.status, 201);
  assert.equal(r.body.sale.subtotal, 2.65);          // 1.40 + 1.25
  assert.equal(r.body.sale.taxAmount, 0.2915);       // 11 %
  assert.equal(r.body.sale.discountAmount, 0.1);
  assert.equal(r.body.sale.total, 2.8415);
  assert.equal(await stockOf(rice._id), 9.3);
});

test("returns restore the exact weight sold, in parts or whole", async () => {
  const start = await stockOf(rice._id);
  const sale  = (await api("POST", "/sales", { paymentMethod: "cash", items: [{ productId: rice._id, quantity: 0.35 }] })).body.sale;
  assert.equal(await stockOf(rice._id), +(start - 0.35).toFixed(3));

  let r = await api("POST", `/sales/${sale._id}/return`, { returnItems: [{ productId: rice._id, quantity: 0.1 }] });
  assert.equal(r.status, 200);
  assert.equal(r.body.refundAmount, 0.4);
  assert.equal(r.body.sale.status, "partially_returned");
  assert.equal(r.body.sale.returnedItems[0].unitType, "kg");

  // More than what's left (0.250 kg) is refused
  r = await api("POST", `/sales/${sale._id}/return`, { returnItems: [{ productId: rice._id, quantity: 0.251 }] });
  assert.equal(r.status, 400);
  assert.match(r.body.message, /max 0\.250 kg returnable/);

  r = await api("POST", `/sales/${sale._id}/return`, { returnItems: [{ productId: rice._id, quantity: 0.25 }] });
  assert.equal(r.status, 200);
  assert.equal(r.body.refundAmount, 1);
  assert.equal(r.body.sale.status, "fully_returned");
  assert.equal(r.body.sale.totalRefunded, 1.4);

  assert.equal(await stockOf(rice._id), start);
});

test("void restores the exact weight / volume sold", async () => {
  const riceStart = await stockOf(rice._id), oilStart = await stockOf(oil._id), soapStart = await stockOf(soap._id);
  const sale = (await api("POST", "/sales", {
    paymentMethod: "cash",
    items: [{ productId: rice._id, quantity: 1.275 }, { productId: oil._id, quantity: 0.333 }, { productId: soap._id, quantity: 3 }],
  })).body.sale;

  // part of the rice comes back first, then the whole sale is voided
  await api("POST", `/sales/${sale._id}/return`, { returnItems: [{ productId: rice._id, quantity: 0.275 }] });
  const r = await api("POST", `/sales/${sale._id}/void`, { reason: "test" });
  assert.equal(r.status, 200);
  assert.equal(r.body.sale.status, "fully_returned");

  assert.equal(await stockOf(rice._id), riceStart);
  assert.equal(await stockOf(oil._id), oilStart);
  assert.equal(await stockOf(soap._id), soapStart);
});

test("stock stays exact over many small sales", async () => {
  await Product.updateOne({ _id: rice._id }, { stock: 10 });
  for (let i = 0; i < 20; i++) {
    const r = await api("POST", "/sales", { paymentMethod: "cash", items: [{ productId: rice._id, quantity: 0.35 }] });
    assert.equal(r.status, 201);
  }
  assert.equal(await stockOf(rice._id), 3); // 10 − 20 × 0.350, not 3.0000000000000004
});

test("batches: fractional kg received and consumed first-in-first-out", async () => {
  let r = await api("POST", "/batches", { productId: rice._id, qty: 2.5, costPrice: 3 });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(await stockOf(rice._id), 5.5);

  r = await api("POST", "/sales", { paymentMethod: "cash", items: [{ productId: rice._id, quantity: 0.35 }] });
  assert.equal(r.status, 201);
  assert.equal(r.body.sale.items[0].cost, 3); // cost taken from the batch
  assert.equal((await Batch.findOne({ productId: rice._id }).lean()).remainingQty, 2.15);
  assert.equal(await stockOf(rice._id), 5.15);

  assert.equal((await api("POST", "/batches", { productId: soap._id, qty: 0.5 })).status, 400); // pieces stay whole
});

test("pay later: weighed lines deduct and restore stock the same way", async () => {
  const start = await stockOf(oil._id);
  let r = await api("POST", "/hold-sales", {
    customerName: "Nadia", phone: "",
    items: [{ productId: oil._id, name: "Olive Oil", price: 2.5, quantity: 0.75, unitType: "L" }],
    total: 1.875,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.items[0].unitType, "L");
  assert.equal(await stockOf(oil._id), +(start - 0.75).toFixed(3));

  r = await api("POST", `/hold-sales/${r.body._id}/return`, { returnItems: [{ productId: oil._id, quantity: 0.75 }] });
  assert.equal(r.status, 200);
  assert.equal(r.body.refundAmount, 1.875);
  assert.equal(r.body.sale.returnStatus, "full");
  assert.equal(await stockOf(oil._id), start);

  r = await api("POST", "/hold-sales", { customerName: "Nadia", items: [{ productId: oil._id, name: "Olive Oil", price: 2.5, quantity: 0 }], total: 0 });
  assert.equal(r.status, 400);
});

test("reports: quantity sold is in the product's unit and totals add up", async () => {
  const sales = await Sale.find({ storeId: storeA._id, status: { $ne: "fully_returned" } }).lean();
  const sold  = (name) => +sales.flatMap(s => s.items).filter(i => i.name.startsWith(name)).reduce((n, i) => n + i.quantity, 0).toFixed(3);

  let r = await api("GET", "/sales/profit-loss");
  assert.equal(r.status, 200);
  const byName = Object.fromEntries(r.body.productBreakdown.map(p => [p.name, p]));
  assert.equal(byName["Rice"].unitType, "kg");
  assert.equal(byName["Rice"].quantity, sold("Rice"));        // e.g. 8.05, not 8.049999999999999
  assert.equal(byName["Olive Oil"].unitType, "L");
  assert.equal(byName["Olive Oil"].quantity, 1.5);
  assert.equal(byName["Soap"].unitType, "piece");
  assert.equal(r.body.revenue, +sales.reduce((n, s) => n + s.total, 0).toFixed(6));

  r = await api("GET", "/products/profitability");
  const riceRow = r.body.rows.find(row => row.name === "Rice");
  assert.equal(riceRow.unitType, "kg");

  r = await api("GET", "/dashboard?period=today");
  if (r.status === 200) {
    const top = r.body.topProducts.find(p => p.name === "Rice");
    assert.equal(top.unitType, "kg");
    assert.equal(top.sold, sold("Rice"));
  }
});

test("branches stay separate", async () => {
  const r = await api("GET", "/sales", null, tokenB);
  assert.equal(r.status, 200);
  assert.equal(r.body.length, 0);
  // Branch B cannot sell Branch A's product
  const sale = await api("POST", "/sales", { paymentMethod: "cash", items: [{ productId: rice._id, quantity: 0.35 }] }, tokenB);
  assert.equal(sale.status, 404);
  assert.equal((await api("GET", "/sales/profit-loss", null, tokenB)).body.revenue, 0);
});
