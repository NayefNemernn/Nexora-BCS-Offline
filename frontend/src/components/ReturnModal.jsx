import React, { useState } from "react";
import { returnSale } from "../api/sale.api";
import { useCurrency } from "../context/CurrencyContext";
import toast from "react-hot-toast";
import { X, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";

export default function ReturnModal({ sale, onClose, onSuccess }) {
  const { formatUSD } = useCurrency();

  /* build per-item returnable quantities */
  const initialItems = sale.items.map(item => {
    const alreadyReturned = (sale.returnedItems || [])
      .filter(r => r.productId?.toString() === item.productId?.toString())
      .reduce((s, r) => s + r.quantity, 0);
    return {
      productId:    item.productId,
      name:         item.name,
      price:        item.price,
      soldQty:      item.quantity,
      returnable:   item.quantity - alreadyReturned,
      returnQty:    0,
    };
  }).filter(i => i.returnable > 0);

  const [items, setItems]   = useState(initialItems);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(null); // { refundAmount }

  const setQty = (idx, val) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, returnQty: Math.min(Math.max(0, parseInt(val) || 0), item.returnable) } : item
    ));
  };

  const totalRefund = items.reduce((s, i) => s + i.price * i.returnQty, 0);
  const hasItems    = items.some(i => i.returnQty > 0);

  const submit = async () => {
    if (!hasItems) { toast.error("Select at least one item to return"); return; }
    setLoading(true);
    try {
      const returnItems = items
        .filter(i => i.returnQty > 0)
        .map(i => ({ productId: i.productId, quantity: i.returnQty }));

      const res = await returnSale(sale._id, { returnItems, reason });
      setDone({ refundAmount: res.refundAmount });
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Return failed");
    } finally {
      setLoading(false);
    }
  };

  /* ── success screen ── */
  if (done) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-[#141414] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
          <div className="bg-blue-600 px-6 py-8 text-center">
            <CheckCircle2 size={48} className="text-white mx-auto mb-3" strokeWidth={1.5}/>
            <h2 className="text-white text-xl font-bold">Return Processed</h2>
            <p className="text-blue-200 text-2xl font-black mt-2">{formatUSD(done.refundAmount)}</p>
            <p className="text-blue-200 text-sm">refunded to customer</p>
          </div>
          <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            Stock has been automatically restocked.
          </div>
          <div className="px-6 pb-6">
            <button onClick={onClose}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#141414] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <RotateCcw size={18} className="text-blue-500"/>
            <div>
              <h2 className="font-bold text-base">Process Return</h2>
              <p className="text-xs text-gray-400">
                Sale #{sale._id?.toString().slice(-6)} · {formatUSD(sale.total)}
                {sale.customerName && ` · ${sale.customerName}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#1c1c1c] flex items-center justify-center hover:bg-gray-200 transition">
            <X size={16}/>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

          {/* Already returned warning */}
          {sale.status === "partially_returned" && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle size={14}/>
              Partial return already processed · {formatUSD(sale.totalRefunded || 0)} refunded so far
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Select items to return</p>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition ${item.returnQty > 0 ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/15" : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1a1a1a]"}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatUSD(item.price)} each · {item.returnable} returnable
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setQty(idx, item.returnQty - 1)}
                      className="w-7 h-7 rounded-full bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 text-sm font-bold flex items-center justify-center hover:bg-gray-100 transition">
                      −
                    </button>
                    <span className={`w-8 text-center text-sm font-bold ${item.returnQty > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`}>
                      {item.returnQty}
                    </span>
                    <button onClick={() => setQty(idx, item.returnQty + 1)}
                      className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center hover:bg-blue-700 transition">
                      +
                    </button>
                  </div>
                  {item.returnQty > 0 && (
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 w-16 text-right">
                      {formatUSD(item.price * item.returnQty)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Return reason</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {["Defective", "Wrong item", "Customer changed mind", "Damaged", "Other"].map(r => (
                <button key={r} onClick={() => setReason(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${reason === r ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
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
              <div className="flex justify-between text-sm font-semibold text-blue-700 dark:text-blue-300">
                <span>Total Refund</span>
                <span>{formatUSD(totalRefund)}</span>
              </div>
              <p className="text-xs text-blue-500 mt-0.5">Stock will be automatically restocked</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-3 border-t border-gray-100 dark:border-white/5 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 transition">
            Cancel
          </button>
          <button onClick={submit} disabled={loading || !hasItems}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/> Processing...</>
              : <><RotateCcw size={16}/> Process Return</>}
          </button>
        </div>
      </div>
    </div>
  );
}