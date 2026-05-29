import { isOnline } from "../lib/connectivity";
import { printHtml } from "../lib/printHtml";
import React, { useState, useRef, useEffect } from "react";
import api from "../api/axios";
import { returnSale } from "../api/sale.api";
import { useCurrency } from "../context/CurrencyContext";
import toast from "react-hot-toast";
import {
  RotateCcw, Search, X, CheckCircle2, Barcode,
  ScanLine, Package, AlertTriangle,
} from "lucide-react";

/* ── Print refund receipt ── */
function printRefundReceipt(sale, refundItems, refundAmount, storeName) {
  const rows = refundItems.map(i => `
    <tr>
      <td style="font-weight:900">${i.name}</td>
      <td style="text-align:center;font-weight:900">${i.returnQty}</td>
      <td style="text-align:right;font-weight:900">$${(i.price * i.returnQty).toFixed(2)}</td>
    </tr>`).join("");

  printHtml(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Return Receipt</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:14px;font-weight:700;color:#000;width:80mm;padding:6mm 3mm}
  .c{text-align:center}.b{font-weight:900}
  hr{border:none;border-top:2px solid #000;margin:8px 0}
  table{width:100%;border-collapse:collapse}
  th{font-size:11px;text-transform:uppercase;padding-bottom:6px;font-weight:900;border-bottom:1px solid #000}
  td{padding:4px 0;font-weight:700}
  .total{font-size:17px;font-weight:900;border-top:2px solid #000;padding-top:6px}
  @media print{@page{size:80mm auto;margin:0}body{padding:4mm 2mm}}
</style></head><body>
<div class="c">
  <p class="b" style="font-size:20px;letter-spacing:2px">${storeName.toUpperCase()}</p>
  <p style="font-size:13px;font-weight:700">*** RETURN RECEIPT ***</p>
  <p style="font-size:11px">${new Date().toLocaleString("en-GB")}</p>
  <p style="font-size:11px">Sale #${sale._id?.toString().slice(-6)}</p>
  ${sale.customerName ? `<p style="font-size:11px">Customer: ${sale.customerName}</p>` : ""}
</div>
<hr/>
<table>
  <thead><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<hr/>
<table><tbody>
  <tr class="total"><td>REFUND TOTAL</td><td></td><td style="text-align:right">$${refundAmount.toFixed(2)}</td></tr>
</tbody></table>
<hr/>
<p class="c b" style="font-size:12px;margin-top:8px">REFUND PROCESSED</p>
<script>window.onload=()=>{window.print();window.close();}<\/script>
</body></html>`);
}

export default function QuickReturn({ onClose, storeName }) {
  const { formatUSD } = useCurrency();

  const [step,    setStep]    = useState("search"); // search | items | done
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState([]);
  const [sale,    setSale]    = useState(null);
  const [items,   setItems]   = useState([]);
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  /* ── Search sales ── */
  const handleSearch = async () => {
    if (!query.trim()) return;
    if (!isOnline()) { toast.error("⚠️ Returns require an internet connection"); return; }
    setLoading(true);
    try {
      // Try to find by sale ID suffix, customer name, or barcode/product name
      const res = await api.get(`/sales?search=${encodeURIComponent(query.trim())}&limit=10`);
      setResults(res.data?.sales || res.data || []);
    } catch {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  /* ── Search by barcode — find recent sale containing this product ── */
  const handleBarcodeSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      // Find product by barcode first
      const prodRes = await api.get(`/products/barcode/${encodeURIComponent(query.trim())}`);
      const product = prodRes.data;
      if (!product) { toast.error("Product not found"); setLoading(false); return; }

      // Find most recent sale containing this product
      const res = await api.get(`/sales?productId=${product._id}&limit=10`);
      const sales = res.data?.sales || res.data || [];
      if (!sales.length) { toast.error("No recent sales found for this product"); setLoading(false); return; }
      setResults(sales);
    } catch {
      // Fallback to text search
      handleSearch();
    } finally {
      setLoading(false);
    }
  };

  const selectSale = (s) => {
    setSale(s);
    const initialItems = s.items.map(item => {
      const alreadyReturned = (s.returnedItems || [])
        .filter(r => r.productId?.toString() === item.productId?.toString())
        .reduce((sum, r) => sum + r.quantity, 0);
      return {
        productId:  item.productId,
        name:       item.name,
        price:      item.price,
        soldQty:    item.quantity,
        returnable: item.quantity - alreadyReturned,
        returnQty:  0,
      };
    }).filter(i => i.returnable > 0);

    if (!initialItems.length) {
      toast.error("All items in this sale have already been returned");
      return;
    }
    setItems(initialItems);
    setStep("items");
    setResults([]);
    setQuery("");
  };

  const setQty = (idx, val) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, returnQty: Math.min(Math.max(0, parseInt(val) || 0), item.returnable) } : item
    ));
  };

  const selectAll = () => setItems(prev => prev.map(i => ({ ...i, returnQty: i.returnable })));
  const clearAll  = () => setItems(prev => prev.map(i => ({ ...i, returnQty: 0 })));

  const totalRefund = items.reduce((s, i) => s + i.price * i.returnQty, 0);
  const hasItems    = items.some(i => i.returnQty > 0);

  const submit = async () => {
    if (!hasItems) { toast.error("Select at least one item"); return; }
    if (!isOnline()) { toast.error("⚠️ Returns require an internet connection"); return; }
    setLoading(true);
    try {
      const returnItems = items.filter(i => i.returnQty > 0).map(i => ({ productId: i.productId, quantity: i.returnQty }));
      const res = await returnSale(sale._id, { returnItems, reason });
      const refundItems = items.filter(i => i.returnQty > 0);
      setDone({ refundAmount: res.refundAmount, refundItems });
    } catch (err) {
      toast.error(err.response?.data?.message || "Return failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-[#141414] rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <RotateCcw size={18} className="text-blue-500"/>
            <h2 className="font-bold text-base">
              {step === "search" ? "Process Return" : step === "items" ? `Return Items` : "Return Complete"}
            </h2>
            {sale && step === "items" && (
              <span className="text-xs text-gray-400">Sale #{sale._id?.toString().slice(-6)}</span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#1c1c1c] flex items-center justify-center hover:bg-gray-200 transition">
            <X size={16}/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ── STEP 1: Search ── */}
          {step === "search" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Search by customer name, sale ID, or scan a product barcode.</p>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Customer name, sale ID, or barcode..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleBarcodeSearch(); }}
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] border-2 border-transparent focus:border-blue-400 outline-none text-sm transition"
                  />
                </div>
                <button onClick={handleBarcodeSearch} disabled={loading}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition disabled:opacity-40 flex items-center gap-1.5">
                  <ScanLine size={15}/> Search
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Barcode size={12}/> Scan or type a product barcode to find the most recent sale
              </div>

              {/* Results */}
              {loading && (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{results.length} sale(s) found</p>
                  {results.map(s => {
                    const fullyReturned = s.status === "fully_returned";
                    return (
                      <button key={s._id} onClick={() => !fullyReturned && selectSale(s)} disabled={fullyReturned}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition ${
                          fullyReturned
                            ? "border-gray-100 dark:border-white/5 opacity-50 cursor-not-allowed bg-gray-50 dark:bg-[#1a1a1a]"
                            : "border-gray-200 dark:border-white/10 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/15 bg-white dark:bg-[#1a1a1a]"
                        }`}>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">
                            {s.customerName || "Walk-in"} · #{s._id?.toString().slice(-6)}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(s.createdAt).toLocaleString()} · {s.items?.length} items · {s.paymentMethod}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{formatUSD(s.total)}</p>
                          {fullyReturned
                            ? <span className="text-xs text-gray-400">Fully returned</span>
                            : s.status === "partially_returned"
                            ? <span className="text-xs text-amber-500">Partial return</span>
                            : <span className="text-xs text-green-500">Returnable</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {!loading && query && results.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Package size={32} className="mx-auto mb-2 opacity-30"/>
                  <p className="text-sm">No sales found</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Select items ── */}
          {step === "items" && (
            <div className="space-y-4">

              {/* Sale info */}
              <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-xl px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-400">Original sale</p>
                  <p className="text-sm font-semibold">{formatUSD(sale.total)} · {sale.customerName || "Walk-in"}</p>
                </div>
                <button onClick={() => { setStep("search"); setSale(null); setItems([]); }}
                  className="text-xs text-blue-500 hover:underline">← Change sale</button>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2">
                <button onClick={selectAll} className="flex-1 py-2 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl hover:bg-blue-100 transition">
                  Select All
                </button>
                <button onClick={clearAll} className="flex-1 py-2 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-500 rounded-xl hover:bg-gray-200 transition">
                  Clear All
                </button>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                      item.returnQty > 0
                        ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/15"
                        : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1a1a1a]"
                    }`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{formatUSD(item.price)} each · {item.returnable} returnable</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setQty(idx, item.returnQty - 1)}
                        className="w-8 h-8 rounded-full bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 text-sm font-bold flex items-center justify-center hover:bg-gray-100 transition">
                        −
                      </button>
                      <span className={`w-8 text-center text-sm font-bold ${item.returnQty > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`}>
                        {item.returnQty}
                      </span>
                      <button onClick={() => setQty(idx, item.returnQty + 1)}
                        className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center hover:bg-blue-700 transition">
                        +
                      </button>
                    </div>
                    {item.returnQty > 0 && (
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 w-16 text-right shrink-0">
                        −{formatUSD(item.price * item.returnQty)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Reason */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Return Reason</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {["Defective", "Wrong item", "Customer changed mind", "Damaged", "Other"].map(r => (
                    <button key={r} onClick={() => setReason(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                        reason === r
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
                <input value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Or type a reason..."
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] border-2 border-transparent focus:border-blue-400 outline-none text-sm transition"/>
              </div>

              {/* Refund summary */}
              {hasItems && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
                  <div className="flex justify-between text-sm font-bold text-blue-700 dark:text-blue-300">
                    <span>Total Refund</span>
                    <span>{formatUSD(totalRefund)}</span>
                  </div>
                  <p className="text-xs text-blue-500 mt-0.5">Stock will be automatically restocked</p>
                </div>
              )}

              {!hasItems && (
                <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-3">
                  <AlertTriangle size={14}/>
                  Select at least one item to return
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Done ── */}
          {step === "done" && done && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} className="text-green-600"/>
              </div>
              <div>
                <p className="text-xl font-black text-green-600">{formatUSD(done.refundAmount)}</p>
                <p className="text-sm text-gray-500 mt-1">Refund processed successfully</p>
                <p className="text-xs text-gray-400 mt-0.5">Stock has been restocked automatically</p>
              </div>
              <div className="space-y-1 text-sm">
                {done.refundItems.map((i, idx) => (
                  <div key={idx} className="flex justify-between px-4 py-1.5 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg">
                    <span className="font-medium">{i.name} × {i.returnQty}</span>
                    <span className="font-bold text-green-600">−{formatUSD(i.price * i.returnQty)}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => printRefundReceipt(sale, done.refundItems, done.refundAmount, storeName)}
                className="w-full py-3 bg-gray-100 dark:bg-[#1c1c1c] text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-200 transition">
                🖨 Print Refund Receipt
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== "done" && (
          <div className="px-6 pb-6 pt-3 border-t border-gray-100 dark:border-white/10 flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 transition">
              Cancel
            </button>
            {step === "items" && (
              <button onClick={submit} disabled={loading || !hasItems}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/> Processing...</>
                  : <><RotateCcw size={16}/> Process Return</>}
              </button>
            )}
          </div>
        )}
        {step === "done" && (
          <div className="px-6 pb-6 pt-3 border-t border-gray-100 dark:border-white/10">
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}