import { useEffect, useState } from "react";
import api from "../api/axios";
import { useRefresh } from "../context/RefreshContext";
import { useLang } from "../context/LanguageContext";
import { usePayLaterTranslation } from "../hooks/usePayLaterTranslation";
import { motion } from "framer-motion";

const METHOD_STYLE = {
  cash:    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  card:    "bg-blue-100  dark:bg-blue-900/30  text-blue-700  dark:text-blue-300",
  default: "bg-gray-100  dark:bg-gray-800     text-gray-600  dark:text-gray-400",
};

export default function RecentPayments({ refreshKey = 0 }) {
  const { tick }  = useRefresh();
  const { lang }  = useLang();
  const t         = usePayLaterTranslation();
  const isAr      = lang === "ar";

  const [payments, setPayments] = useState([]);
  const [filter,   setFilter]   = useState("");

  useEffect(() => { load(); }, [tick, refreshKey]);

  const load = async () => {
    try {
      const res = await api.get("/hold-sales/payments/recent");
      setPayments(res.data);
    } catch { }
  };

  const customers = [...new Set(payments.map(p => p.customerName))];
  const filtered  = filter ? payments.filter(p => p.customerName === filter) : payments;

  return (
    <motion.div
      dir={isAr ? "rtl" : "ltr"}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 h-full rounded-2xl
        bg-white dark:bg-[#141414]
        shadow-[6px_6px_16px_#d1d5db,-6px_-6px_16px_#ffffff]
        dark:shadow-[6px_6px_16px_#050505,-6px_-6px_16px_#1a1a1a]"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-sm">{t.recentPayments}</h3>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-lg
            bg-gray-50 dark:bg-[#1c1c1c]
            border border-gray-200 dark:border-white/10
            outline-none"
        >
          <option value="">{t.allCustomers}</option>
          {customers.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-6">{t.noRecentPayments}</p>
      )}

      {/* List */}
      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p._id}
            className="flex justify-between items-start
              py-2.5 border-b border-gray-50 dark:border-white/5 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{p.customerName}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(p.createdAt).toLocaleString(isAr ? "ar-SA" : "en-US")}
              </p>
              {p.notes && (
                <p className="text-xs text-gray-400 italic mt-0.5 truncate">{p.notes}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0 ms-3">
              <span className="text-green-600 dark:text-green-400 font-bold text-sm">
                +${p.amount.toFixed(2)}
              </span>
              {p.method && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize
                  ${METHOD_STYLE[p.method] || METHOD_STYLE.default}`}>
                  {p.method === "cash" ? t.cash : p.method === "card" ? t.card : p.method}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}