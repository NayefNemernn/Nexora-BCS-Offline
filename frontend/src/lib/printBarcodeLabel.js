import JsBarcode from "jsbarcode";
import { printHtml } from "./printHtml";

const SVG_NS = "http://www.w3.org/2000/svg";

function renderSvg(value, options) {
  const svg = document.createElementNS(SVG_NS, "svg");
  document.body.appendChild(svg);
  try {
    JsBarcode(svg, value, { background: "#ffffff", lineColor: "#000000", ...options });
    return svg;
  } finally {
    document.body.removeChild(svg);
  }
}

// Prints a barcode label on the 80mm thermal printer.
//
// Desktop app: the printer draws the barcode itself (ESC/POS, see
// electron/escpos.js), so every bar lands on whole printer dots. A barcode
// drawn as graphics gets rescaled to the printer's 203dpi and bar widths
// round unevenly, which scanners reject even when it looks fine.
// Browser (or a format the printer can't draw): HTML fallback below.
//
// Throws if `value` can't be encoded in `format`, or with a readable
// message if the printer is offline.
export async function printBarcodeLabel(value, format) {
  value = String(value);
  // A manufacturer's EAN-13 (scanned off the package) prints ~25% shorter as
  // EAN-13 than as Code 128, every till scanner reads it, and it scans back
  // as the same 13 digits.
  if (format === "CODE128" && isEan13(value)) format = "EAN13";

  // Validates the value, and gives the human-readable text JsBarcode would
  // show (includes the computed check digit for EAN/UPC).
  const textSvg = renderSvg(value, { format, displayValue: true });
  const label   = Array.from(textSvg.querySelectorAll("text")).map(t => t.textContent).join(" ") || value;

  if (window.electronAPI?.printBarcodeLabel) {
    const res = await window.electronAPI.printBarcodeLabel({ value, format, label });
    if (res?.ok) return;
    if (res?.reason === "offline") throw new Error(`Printer "${res.printer}" is offline — check it's on and connected.`);
    if (res?.reason === "error")   throw new Error(`Could not print on "${res.printer}"${res.message ? `: ${res.message}` : ""}`);
    // no_printer / unsupported_format / unsupported → HTML fallback
  }

  printHtmlLabel(value, format, label);
}

function isEan13(v) {
  if (!/^\d{13}$/.test(v)) return false;
  const sum = [...v.slice(0, 12)].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(v[12]);
}

// Bars at a fixed width per module (never stretched), so each bar keeps the
// right proportions when the driver rasterises it.
function printHtmlLabel(value, format, label) {
  const svg = renderSvg(value, { format, width: 2, height: 100, margin: 20, displayValue: false });
  const svgW = parseFloat(svg.getAttribute("width"));
  const svgH = parseFloat(svg.getAttribute("height"));
  const modules  = svgW / 2;
  // Whole 203dpi dots per module, bars ≤52mm so they fit a scanner's view
  // (same rules as electron/escpos.js).
  const barModules = modules - 20; // minus the 10-module quiet zone each side
  const moduleMm = [0.5, 0.375, 0.25].find(mm => barModules * mm <= 52) || 72 / modules;
  svg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.removeAttribute("style");
  const svgMarkup = new XMLSerializer().serializeToString(svg);

  // Make the number as large as fits across the label (70mm of the 72mm
  // printable width), capped at 12mm tall for short values.
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = "900 100px 'Arial Black', Arial, sans-serif";
  const widthAt100 = ctx.measureText(label).width || 1;
  const fontMm = Math.min(12, (70 * 100) / widthAt100).toFixed(2);

  const esc = (v) => v.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  printHtml(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Barcode Label — ${esc(value)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:80mm;padding:3mm 4mm;background:#fff;color:#000}
  svg{display:block;margin:0 auto;width:${(modules * moduleMm).toFixed(3)}mm;height:22mm}
  .num{margin-top:1.5mm;text-align:center;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-weight:900;font-size:${fontMm}mm;line-height:1.1;white-space:nowrap}
  @media print{@page{size:80mm auto;margin:0}}
</style></head><body>
  ${svgMarkup}
  <div class="num">${esc(label)}</div>
  <script>window.onload=()=>window.print();<\/script>
</body></html>`);
}
