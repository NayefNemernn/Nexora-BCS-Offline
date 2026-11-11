/* Unit tests for the quantity / line-total helper.
   Run:  cd backend && npm test                                          */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  UNIT_TYPES, normalizeUnit, isWeighed, subUnitOf,
  toMilli, roundQty, addQty, subQty,
  parseQuantityInput, normalizeQuantity, lineTotal,
  formatQty, formatQtyNumber, countItems,
} from "../src/utils/quantity.js";

const qty = (raw, unit, opts) => parseQuantityInput(raw, unit, opts);
const ok  = (quantity) => ({ ok: true, quantity });
const err = (error) => ({ ok: false, error });

test("frontend and backend copies of quantity.js are identical", () => {
  const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8").replace(/\r\n/g, "\n");
  assert.equal(read("../../frontend/src/lib/quantity.js"), read("../src/utils/quantity.js"));
});

test("unit types", () => {
  assert.deepEqual(UNIT_TYPES, ["piece", "kg", "L"]);
  assert.equal(normalizeUnit(undefined), "piece"); // existing products / old sale lines
  assert.equal(normalizeUnit("gallon"), "piece");
  assert.equal(normalizeUnit("kg"), "kg");
  assert.equal(isWeighed("piece"), false);
  assert.equal(isWeighed(undefined), false);
  assert.equal(isWeighed("kg"), true);
  assert.equal(isWeighed("L"), true);
  assert.equal(subUnitOf("kg"), "g");
  assert.equal(subUnitOf("L"), "mL");
  assert.equal(subUnitOf("piece"), null);
});

/* ── Decimal input parsing ─────────────────────────────────────── */
test("parses kg / L amounts up to 3 decimals", () => {
  assert.deepEqual(qty("0.250", "kg"), ok(0.25));
  assert.deepEqual(qty("1.5", "L"), ok(1.5));
  assert.deepEqual(qty("0.350", "kg"), ok(0.35));
  assert.deepEqual(qty("2", "kg"), ok(2));
  assert.deepEqual(qty(".5", "kg"), ok(0.5));
  assert.deepEqual(qty("3.", "kg"), ok(3));
  assert.deepEqual(qty("  0.001 ", "kg"), ok(0.001));
  assert.deepEqual(qty("0.1250", "kg"), ok(0.125)); // trailing zero is not a 4th decimal
  assert.deepEqual(qty(1.25, "kg"), ok(1.25));      // numbers work as well as strings
});

test("accepts a comma as the decimal separator", () => {
  assert.deepEqual(qty("0,35", "kg"), ok(0.35));
  assert.deepEqual(qty("1,5", "L"), ok(1.5));
  assert.deepEqual(qty("1,250.5", "kg"), err("invalid")); // mixed separators are ambiguous
  assert.deepEqual(qty("1,2,3", "kg"), err("invalid"));
});

/* ── Validation ────────────────────────────────────────────────── */
test("rejects zero, negatives and non-numeric input", () => {
  assert.deepEqual(qty("0", "kg"), err("zero"));
  assert.deepEqual(qty("0.000", "kg"), err("zero"));
  assert.deepEqual(qty("-1", "kg"), err("negative"));
  assert.deepEqual(qty("-0.5", "L"), err("negative"));
  assert.deepEqual(qty("abc", "kg"), err("invalid"));
  assert.deepEqual(qty("1.2.3", "kg"), err("invalid"));
  assert.deepEqual(qty("1e3", "kg"), err("invalid"));
  assert.deepEqual(qty("0x10", "kg"), err("invalid"));
  assert.deepEqual(qty("12kg", "kg"), err("invalid"));
  assert.deepEqual(qty(".", "kg"), err("invalid"));
  assert.deepEqual(qty("-", "kg"), err("invalid"));
  assert.deepEqual(qty("", "kg"), err("empty"));
  assert.deepEqual(qty("   ", "kg"), err("empty"));
  assert.deepEqual(qty(null, "kg"), err("empty"));
  assert.deepEqual(qty(undefined, "kg"), err("empty"));
  assert.deepEqual(qty(NaN, "kg"), err("invalid"));
});

test("rejects more than 3 decimals and absurd amounts", () => {
  assert.deepEqual(qty("0.2505", "kg"), err("precision"));
  assert.deepEqual(qty("1.0001", "L"), err("precision"));
  assert.deepEqual(qty("1000001", "kg"), err("too_large"));
  assert.deepEqual(qty("99999999999999999999", "kg"), err("too_large"));
});

test("piece products only take whole numbers", () => {
  assert.deepEqual(qty("3", "piece"), ok(3));
  assert.deepEqual(qty("3.0", "piece"), ok(3));
  assert.deepEqual(qty("1.5", "piece"), err("precision"));
  assert.deepEqual(qty("0", "piece"), err("zero"));
});

/* ── Unit conversion ───────────────────────────────────────────── */
test("grams convert to kg and millilitres to L", () => {
  assert.deepEqual(qty("250", "kg", { inSubUnit: true }), ok(0.25));
  assert.deepEqual(qty("350", "kg", { inSubUnit: true }), ok(0.35));
  assert.deepEqual(qty("1500", "L", { inSubUnit: true }), ok(1.5));
  assert.deepEqual(qty("1", "kg", { inSubUnit: true }), ok(0.001));
  assert.deepEqual(qty("0", "kg", { inSubUnit: true }), err("zero"));
  assert.deepEqual(qty("-5", "L", { inSubUnit: true }), err("negative"));
  // 1 g / 1 mL is the finest amount sold, so fractions of them are refused
  assert.deepEqual(qty("250.5", "kg", { inSubUnit: true }), err("precision"));
  assert.deepEqual(qty("250.0", "kg", { inSubUnit: true }), ok(0.25));
});

test("API quantity validation (normalizeQuantity)", () => {
  assert.equal(normalizeQuantity(0.35, "kg"), 0.35);
  assert.equal(normalizeQuantity(1.5, "L"), 1.5);
  assert.equal(normalizeQuantity(2, "piece"), 2);
  assert.equal(normalizeQuantity(0, "kg"), null);
  assert.equal(normalizeQuantity(-1, "kg"), null);
  assert.equal(normalizeQuantity(-1, "piece"), null);
  assert.equal(normalizeQuantity(0.3505, "kg"), null);  // finer than a gram
  assert.equal(normalizeQuantity(0.0004, "kg"), null);  // rounds to nothing
  assert.equal(normalizeQuantity(1.5, "piece"), null);  // half a piece
  assert.equal(normalizeQuantity("0.35", "kg"), null);  // must be a number
  assert.equal(normalizeQuantity(NaN, "kg"), null);
  assert.equal(normalizeQuantity(Infinity, "kg"), null);
  assert.equal(normalizeQuantity(undefined, "piece"), null);
  // float noise from earlier arithmetic is snapped, not rejected
  assert.equal(normalizeQuantity(0.1 + 0.2, "kg"), 0.3);
});

/* ── Quantity arithmetic (stock) ───────────────────────────────── */
test("stock arithmetic has no float drift", () => {
  assert.notEqual(0.1 + 0.2, 0.3);                 // the problem being avoided
  assert.equal(addQty(0.1, 0.2), 0.3);
  assert.equal(subQty(10, 0.35), 9.65);
  assert.equal(addQty(subQty(10, 0.35), 0.35), 10); // sale then return restores stock exactly
  assert.equal(roundQty(8.950000000000001), 8.95);
  assert.equal(toMilli(0.35), 350);

  let stock = 10;
  for (let i = 0; i < 20; i++) stock = subQty(stock, 0.35);
  assert.equal(stock, 3);
  for (let i = 0; i < 20; i++) stock = addQty(stock, 0.35);
  assert.equal(stock, 10);
});

/* ── Line total + rounding ─────────────────────────────────────── */
test("line total = quantity × price per unit", () => {
  assert.equal(lineTotal(4, 0.75, "kg"), 3);        // Rice 0.750 kg × 4.00 / kg = 3.00
  assert.equal(lineTotal(4, 0.35, "kg"), 1.4);
  assert.equal(lineTotal(2.5, 1.5, "L"), 3.75);
  assert.equal(lineTotal(0.1, 0.3, "kg"), 0.03);
  assert.equal(lineTotal(8.2, 0.15, "kg"), 1.23);   // raw floats give 1.2299999999999998
  assert.notEqual(8.2 * 0.15, 1.23);
  assert.equal(lineTotal(19.99, 0.333, "kg"), 6.65667);
  assert.equal(lineTotal(0, 1.5, "kg"), 0);
});

test("line total rounds half-up to 6 decimals (the precision sale amounts are stored at)", () => {
  assert.equal(lineTotal(0.001, 0.001, "kg"), 0.000001);
  assert.equal(lineTotal(0.0005, 0.001, "kg"), 0.000001);  // 0.0000005 → up
  assert.equal(lineTotal(0.0004, 0.001, "kg"), 0);         // 0.0000004 → down
  assert.equal(lineTotal(1.234567, 0.5, "kg"), 0.617284);  // 0.6172835 → up
  assert.equal(lineTotal(3.333333, 0.333, "kg"), 1.11);    // 1.109999889 → 1.110000
});

test("line total rounds to the display currency: 2 decimals USD, whole LBP", () => {
  const usd = (n) => n.toFixed(2);
  const lbp = (n, rate) => Math.round(n * rate);
  const RATE = 89500;

  assert.equal(usd(lineTotal(4, 0.35, "kg")), "1.40");
  assert.equal(usd(lineTotal(19.99, 0.333, "kg")), "6.66");
  assert.equal(usd(lineTotal(3.49, 0.125, "kg")), "0.44"); // 0.43625

  // A price typed in LBP is stored as a non-terminating USD amount; the LBP
  // line total must still come out exact.
  const pricePerKg = 150000 / RATE;                         // 150,000 LBP / kg
  assert.equal(lbp(lineTotal(pricePerKg, 0.35, "kg"), RATE), 52500);
  assert.equal(lbp(lineTotal(pricePerKg, 1.275, "kg"), RATE), 191250);
  assert.equal(lbp(lineTotal(pricePerKg, 100, "kg"), RATE), 15000000);
  const pricePerL = 75000 / RATE;                           // 75,000 LBP / L
  assert.equal(lbp(lineTotal(pricePerL, 1.5, "L"), RATE), 112500);
});

test("piece lines are computed exactly as before", () => {
  for (const [price, n] of [[4, 3], [0.1, 3], [150000 / 89500, 7], [19.99, 12]]) {
    assert.equal(lineTotal(price, n, "piece"), price * n);
    assert.equal(lineTotal(price, n), price * n);            // no unit → piece
    assert.equal(lineTotal(price, n, undefined), price * n);
  }
});

test("totals aggregate across mixed lines", () => {
  const lines = [
    { price: 4,    quantity: 0.35, unitType: "kg" },    // 1.40
    { price: 2.5,  quantity: 1.5,  unitType: "L" },     // 3.75
    { price: 1.25, quantity: 2,    unitType: "piece" }, // 2.50
    { price: 3,    quantity: 1 },                       // 3.00 (old line, no unit)
  ];
  const total = lines.reduce((s, l) => s + lineTotal(l.price, l.quantity, l.unitType), 0);
  assert.equal(+total.toFixed(6), 10.65);
  assert.equal(countItems(lines), 5); // 2 weighed lines + 3 pieces
  assert.equal(countItems(undefined), 0);
});

/* ── Display ───────────────────────────────────────────────────── */
test("quantities are shown with their unit", () => {
  assert.equal(formatQty(0.75, "kg"), "0.750 kg");
  assert.equal(formatQty(1.5, "L"), "1.500 L");
  assert.equal(formatQty(0.35, "kg"), "0.350 kg");
  assert.equal(formatQty(3, "piece"), "3");
  assert.equal(formatQty(3), "3");
  assert.equal(formatQtyNumber(0.35, "kg"), "0.350");
  assert.equal(formatQtyNumber(2, "piece"), "2");
});
