import { useEffect, useState, useCallback } from "react";
import { X, History, ShoppingBag, CreditCard, Banknote, Clock, ChevronDown } from "lucide-react";
import api from "../../api/axios";
import { useCurrency } from "../../context/CurrencyContext";

const METHOD_LABEL = {
  cash:             "Cash",
  card:             "Card",
  paylater:         "Pay Later",
  split:            "Split",
  bank_transfer:    "Bank Transfer",
  cash_on_delivery: "COD",
};

const METHOD_COLOR = {
  cash:             "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  card:             "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  paylater:         "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  split:            "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  bank_transfer:    "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
  cash_on_delivery: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
};

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function CashierSalesHistory({ userId, onClose }) {
  const { formatUSD } = useCurrency();
  const [sales,   setSales]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch today's sales; backend returns most-recent-first
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const res = await api.get("/sales", { params: { limit: 200 } });
      const all = Array.isArray(res.data?.sales) ? res.data.sales
                : Array.isArray(res.data)         ? res.data
                : [];
      // Keep only sales made by this cashier, today
      const mine = all.filter(s => {
        const saleUser = s.userId?._id || s.userId;
        return (
          saleUser?.toString() === userId?.toString() &&
          new Date(s.createdAt) >= today
        );
      });
      setSales(mine);
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = sales.reduce((s, x) => s + (x.total || 0), 0);
  const totalItems   = sales.reduce((s, x) => s + (x.items?.reduce((a, i) => a + i.quantity, 0) || 0), 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm
        bg-white dark:bg-[#0f0f0f]
        border-l border-gray-200 dark:border-white/10
        flex flex-col shadow-2xl
        animate-[slideInRight_180ms_ease-out]">

        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-4
          border-b border-gray-100 dark:border-white/10
          bg-gray-50/80 dark:bg-[#141414]">
          <History size={16} className="text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">My Sales Today</p>
            <p className="text-xs text-gray-400 tabular-nums">
              {sales.length} sale{sales.length !== 1 ? "s" : ""} · {totalItems} item{totalItems !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl
              text-gray-400 hover:text-gray-700 dark:hover:text-white
              hover:bg-gray-200 dark:hover:bg-white/10 transition">
            <X size={14} />
          </button>
        </div>

        {/* Summary bar */}
        <div className="shrink-0 px-5 py-3 bg-blue-600
          flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-blue-200 uppercase tracking-widest">Total Revenue</p>
            <p className="text-xl font-black text-white tabular-nums">{formatUSD(totalRevenue)}</p>
          </div>
          <button
            onClick={load}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg
              bg-white/20 hover:bg-white/30 text-white transition">
            Refresh
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                <ShoppingBag size={24} className="opacity-40" />
              </div>
              <p className="text-sm font-medium">No sales yet today</p>
            </div>
          ) : (
            sales.map((s) => {
              const isOpen = expanded === s._id;
              const itemCount = s.items?.reduce((a, i) => a + i.quantity, 0) || 0;
              return (
                <div key={s._id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : s._id)}
                    className="w-full flex items-center gap-3 px-5 py-3.5
                      hover:bg-gray-50 dark:hover:bg-white/[0.03] transition text-left">

                    {/* Time */}
                    <div className="shrink-0 flex flex-col items-center w-10">
                      <Clock size={11} className="text-gray-400 mb-0.5" />
                      <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 tabular-nums leading-none">
                        {formatTime(s.createdAt)}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800 dark:text-white tabular-nums">
                          {formatUSD(s.total)}
                        </span>
                        {s.status === "fully_returned" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            Returned
                          </span>
                        )}
                        {s.status === "partially_returned" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                            Partial Ret.
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {itemCount} item{itemCount !== 1 ? "s" : ""}
                        {s.customerName ? ` · ${s.customerName}` : ""}
                      </p>
                    </div>

                    {/* Payment badge + chevron */}
                    <div className="shrink-0 flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${METHOD_COLOR[s.paymentMethod] || METHOD_COLOR.cash}`}>
                        {METHOD_LABEL[s.paymentMethod] || s.paymentMethod}
                      </span>
                      <ChevronDown
                        size={13}
                        className={`text-gray-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </div>
                  </button>

                  {/* Expanded items */}
                  {isOpen && (
                    <div className="px-5 pb-3 bg-gray-50/60 dark:bg-white/[0.02]">
                      <div className="rounded-xl border border-gray-100 dark:border-white/8 overflow-hidden">
                        {s.items?.map((item, idx) => (
                          <div key={idx}
                            className="flex items-center justify-between px-3 py-2
                              text-xs border-b border-gray-100 dark:border-white/5 last:border-0">
                            <span className="text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">
                              {item.name}
                            </span>
                            <span className="shrink-0 text-gray-500 dark:text-gray-400 tabular-nums">
                              ×{item.quantity} · {formatUSD(item.subtotal ?? item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {s.notes && (
                        <p className="text-xs text-gray-400 mt-2 italic">Note: {s.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
