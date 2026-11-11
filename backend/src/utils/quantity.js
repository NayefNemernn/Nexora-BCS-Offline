/* ================================================================
   quantity.js — unit types + quantity / line-total math

   Products are sold by the piece (default), by weight (kg) or by
   volume (L). Weighed quantities go to 3 decimals (1 g / 1 mL).

   Nothing here does arithmetic on fractional floats:
     quantity → integer thousandths of the unit
     price    → integer pico-dollars (1e-12 USD). Prices are stored in
                USD but usually typed in LBP, so they are rarely a
                whole number of cents — 12 decimals keeps the stored
                price exact enough that the LBP total stays exact.
     total    → rounded half-up to 6 decimals, the precision every
                other amount on a sale is stored at.

   KEEP IN SYNC: backend/src/utils/quantity.js and
   frontend/src/lib/quantity.js are the same file (the two packages
   are built separately). backend/test/quantity.test.js fails if they
   differ.
================================================================ */

export const UNIT_TYPES   = ["piece", "kg", "L"];
export const DEFAULT_UNIT = "piece";
export const QTY_DECIMALS = 3;

const QTY_SCALE   = 1000;                 // thousandths
const MAX_MILLI   = 1_000_000_000;        // 1,000,000 kg / L per line
const PRICE_SCALE = 1e12;                 // pico-dollars
const PICO_PER_MICRO = 1_000_000n;

export const normalizeUnit = (unitType) => (UNIT_TYPES.includes(unitType) ? unitType : DEFAULT_UNIT);
export const isWeighed     = (unitType) => unitType === "kg" || unitType === "L";

// The smaller unit a cashier may type instead: grams for kg, millilitres for L
export const subUnitOf = (unitType) => (unitType === "kg" ? "g" : unitType === "L" ? "mL" : null);

/* ── Integer thousandths ─────────────────────────────────────── */
export const toMilli   = (quantity) => Math.round(Number(quantity) * QTY_SCALE);
export const fromMilli = (milli) => milli / QTY_SCALE;

// Snap to 3 decimals — removes float drift after adding / subtracting quantities
export const roundQty = (quantity) => fromMilli(toMilli(quantity));
export const addQty   = (a, b) => fromMilli(toMilli(a) + toMilli(b));
export const subQty   = (a, b) => fromMilli(toMilli(a) - toMilli(b));

/* ── Parse what a cashier typed ──────────────────────────────────
   Returns { ok: true, quantity } (quantity in the product's unit) or
   { ok: false, error } where error is one of:
     "empty" | "invalid" | "negative" | "zero" | "precision" | "too_large"

   inSubUnit: the text is grams / millilitres, converted to kg / L.
   A comma is accepted as the decimal separator ("0,35" = 0.35).      */
export function parseQuantityInput(raw, unitType = DEFAULT_UNIT, { inSubUnit = false } = {}) {
  const fail = (error) => ({ ok: false, error });

  let text = String(raw ?? "").trim();
  if (text === "") return fail("empty");
  if (text.startsWith("-")) return /^-[\d.,]+$/.test(text) ? fail("negative") : fail("invalid");

  if (text.includes(",")) {
    // One comma and no dot → decimal comma. Anything else is ambiguous.
    if (text.includes(".") || text.indexOf(",") !== text.lastIndexOf(",")) return fail("invalid");
    text = text.replace(",", ".");
  }
  if (!/^(\d+\.?\d*|\.\d+)$/.test(text)) return fail("invalid");

  const [whole = "", fraction = ""] = text.split(".");
  const weighed = isWeighed(unitType);
  // Pieces, grams and millilitres are whole numbers; kg / L take 3 decimals
  const decimals = weighed && !inSubUnit ? QTY_DECIMALS : 0;
  if (fraction.replace(/0+$/, "").length > decimals) return fail("precision");
  if (whole.replace(/^0+/, "").length > 10) return fail("too_large");

  const scaled = Number(whole || "0") * 10 ** decimals + Number(fraction.padEnd(decimals, "0").slice(0, decimals) || "0");
  const milli  = weighed ? scaled : scaled * QTY_SCALE;

  if (milli === 0) return fail("zero");
  if (milli > MAX_MILLI) return fail("too_large");
  return { ok: true, quantity: fromMilli(milli) };
}

/* ── Validate a quantity that arrives as a number (API payloads) ──
   Returns the quantity snapped to 3 decimals, or null if it is not a
   sellable amount: non-numeric, zero, negative, finer than 1 g / 1 mL
   for weighed products, or fractional for piece products.            */
export function normalizeQuantity(quantity, unitType = DEFAULT_UNIT) {
  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) return null;
  const milli = toMilli(quantity);
  if (milli <= 0 || milli > MAX_MILLI) return null;
  if (Math.abs(quantity * QTY_SCALE - milli) > 1e-6) return null;
  if (!isWeighed(unitType) && milli % QTY_SCALE !== 0) return null;
  return fromMilli(milli);
}

/* ── Line total = quantity × price per unit ──────────────────────
   Piece lines keep the plain product they have always used, so
   existing sales are unchanged. Weighed lines are computed in
   integers and rounded half-up to 6 decimals.                       */
export function lineTotal(price, quantity, unitType = DEFAULT_UNIT) {
  if (!isWeighed(unitType)) return price * quantity;

  const pricePico = BigInt(Math.round(Number(price) * PRICE_SCALE));
  const milli     = BigInt(toMilli(quantity));
  const divisor   = BigInt(QTY_SCALE) * PICO_PER_MICRO;            // → micro-dollars
  const micro     = (pricePico * milli + divisor / 2n) / divisor;  // round half up
  return Number(micro) / 1e6;
}

// "How many items" across mixed units: pieces add up, a kg / L line counts as one
export const countItems = (items = []) =>
  items.reduce((n, i) => n + (isWeighed(i.unitType) ? 1 : i.quantity), 0);

/* ── Display ─────────────────────────────────────────────────── */
// "3" for pieces, "0.750" for kg / L
export const formatQtyNumber = (quantity, unitType = DEFAULT_UNIT) =>
  isWeighed(unitType) ? roundQty(quantity).toFixed(QTY_DECIMALS) : String(quantity);

// "3" for pieces, "0.750 kg" for kg / L
export const formatQty = (quantity, unitType = DEFAULT_UNIT) =>
  isWeighed(unitType) ? `${formatQtyNumber(quantity, unitType)} ${unitType}` : String(quantity);
