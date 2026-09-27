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

// Prints a barcode label sized for the 80mm thermal printer: bars span the
// full printable width as vector SVG (crisp at the printer's resolution),
// and the number is printed as its own large text line so it stays readable
// no matter how much the bars are scaled. Throws if `value` can't be
// encoded in `format`.
export function printBarcodeLabel(value, format) {
  value = String(value);

  // The human-readable text JsBarcode would show (includes the computed
  // check digit for EAN/UPC, which isn't part of `value`).
  const textSvg = renderSvg(value, { format, displayValue: true });
  const label   = Array.from(textSvg.querySelectorAll("text")).map(t => t.textContent).join(" ") || value;

  const svg = renderSvg(value, { format, width: 2, height: 100, margin: 10, displayValue: false });
  svg.setAttribute("viewBox", `0 0 ${parseFloat(svg.getAttribute("width"))} ${parseFloat(svg.getAttribute("height"))}`);
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
  svg{display:block;width:100%;height:22mm}
  .num{margin-top:1.5mm;text-align:center;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-weight:900;font-size:${fontMm}mm;line-height:1.1;white-space:nowrap}
  @media print{@page{size:80mm auto;margin:0}}
</style></head><body>
  ${svgMarkup}
  <div class="num">${esc(label)}</div>
  <script>window.onload=()=>window.print();<\/script>
</body></html>`);
}
