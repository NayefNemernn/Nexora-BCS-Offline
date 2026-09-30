"use strict";

// ESC/POS barcode label for 80mm thermal printers (XP-80C and compatibles).
// The printer draws the bars itself (GS k), so every module lands on whole
// printer dots — a rasterised image rescaled to 203dpi rounds bar widths
// unevenly, which scanners reject.

// Scanner rules this follows:
//  - Module (narrowest bar) 2-4 dots = 0.25-0.5mm. Wider is better on thermal
//    paper: heat bleed fattens every bar by about a dot, which is a 50% error
//    at 2 dots but 25% at 4.
//  - Bars no longer than ~52mm, so the whole code fits a handheld scanner's
//    field of view; a label-wide barcode only reads at arm's length.
//  - At least 10 modules of blank quiet zone either side (centring on the
//    72mm printable width leaves 10mm+).
//  - Bars at least 15% of the length tall; taller is easier to aim at.
const PRINTABLE_DOTS = 576; // 72mm printable width at 203dpi
const MAX_BAR_DOTS   = 416; // 52mm
const MAX_MODULE     = 4;   // 0.5mm modules
const MIN_MODULE     = 2;

const ESC = 0x1b, GS = 0x1d, LF = 0x0a;

// Returns { m, data, modules } for GS k function B, or null if the value
// can't be printed natively in this format.
function encode(value, format) {
  const ascii = /^[\x20-\x7e]+$/.test(value);
  switch (format) {
    case "EAN13":
      if (!/^\d{12,13}$/.test(value)) return null;
      return { m: 67, data: Buffer.from(value, "ascii"), modules: 95 };
    case "UPCA":
      if (!/^\d{11,12}$/.test(value)) return null;
      return { m: 65, data: Buffer.from(value, "ascii"), modules: 95 };
    case "CODE39":
      if (!/^[0-9A-Z \-.$/+%]+$/.test(value)) return null;
      return { m: 69, data: Buffer.from(value, "ascii"), modules: (value.length + 2) * 16 };
    case "CODE128": {
      if (!ascii) return null;
      // Digits: code set C packs two per symbol (shorter bars → wider modules).
      if (/^\d{2,}$/.test(value)) {
        const even  = value.length - (value.length % 2);
        const bytes = [0x7b, 0x43]; // {C
        for (let i = 0; i < even; i += 2) bytes.push(Number(value.slice(i, i + 2)));
        let symbols = even / 2;
        if (even < value.length) { bytes.push(0x7b, 0x42, value.charCodeAt(even)); symbols += 2; }
        return { m: 73, data: Buffer.from(bytes), modules: 11 * (symbols + 2) + 13 };
      }
      const escaped = value.replace(/\{/g, "{{"); // "{" is the code-set escape
      return { m: 73, data: Buffer.from("{B" + escaped, "ascii"), modules: 11 * (value.length + 2) + 13 };
    }
    default:
      return null;
  }
}

// `label` is the human-readable text (with any check digit already added).
// Returns a Buffer, or null when the printer can't draw it natively.
function buildBarcodeLabel(value, format, label) {
  const enc = encode(String(value), format);
  if (!enc || enc.data.length > 255) return null;

  // Largest module that keeps the bars short enough to scan in one pass;
  // very long values may use the full width rather than go below 2 dots.
  let module = Math.min(MAX_MODULE, Math.floor(MAX_BAR_DOTS / enc.modules));
  if (module < MIN_MODULE) module = Math.floor((PRINTABLE_DOTS - 20 * MIN_MODULE) / enc.modules);
  if (module < MIN_MODULE) return null;

  const text = String(label || value).replace(/\s+/g, "").replace(/[^\x20-\x7e]/g, "");
  // Font A is 12 dots wide; grow the digits as much as the width allows (max 4x).
  const mult = Math.max(1, Math.min(4, Math.floor(PRINTABLE_DOTS / (text.length * 12))));

  return Buffer.concat([
    Buffer.from([ESC, 0x40]),               // init
    Buffer.from([ESC, 0x61, 0x01]),         // center
    Buffer.from([GS, 0x48, 0x00]),          // no printer-drawn HRI text
    Buffer.from([GS, 0x68, 160]),           // bar height = 20mm
    Buffer.from([GS, 0x77, module]),        // module width in dots
    Buffer.from([GS, 0x6b, enc.m, enc.data.length]), enc.data,
    Buffer.from([LF]),
    Buffer.from([ESC, 0x45, 0x01]),         // bold
    Buffer.from([GS, 0x21, ((mult - 1) << 4) | (mult - 1)]),
    Buffer.from(text, "ascii"),
    Buffer.from([LF]),
    Buffer.from([GS, 0x21, 0x00, ESC, 0x45, 0x00]),
    Buffer.from([ESC, 0x64, 0x04]),         // feed 4 lines
    Buffer.from([GS, 0x56, 0x42, 0x00]),    // feed to cutter + partial cut
  ]);
}

module.exports = { buildBarcodeLabel };
