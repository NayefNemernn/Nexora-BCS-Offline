import { useEffect, useState } from "react";
import api from "../api/axios";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../context/LanguageContext";
import { usePayLaterTranslation } from "../hooks/usePayLaterTranslation";
import { X, DollarSign, CreditCard, Banknote } from "lucide-react";

const METHOD_STYLE = {
  cash: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  card: "bg-blue-100  dark:bg-blue-900/30  text-blue-700  dark:text-blue-300",
};

export default function CustomerPaymentsDrawer({ customer, close }) {
  const { lang } = useLang();
  const t        = usePayLaterTranslation();
  const isAr     = lang === "ar";

  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get(`/hold-sales/payments/customer/${encodeURIComponent(customer.customerName)}`)
      .then(res => setPayments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customer.customerName]);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={close}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      />

      <motion.div
        dir={isAr ? "rtl" : "ltr"}
        initial={{ x: isAr ? -420 : 420 }}
        animate={{ x: 0 }}
        exit={{ x: isAr ? -420 : 420 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className={`fixed ${isAr ? "left-0" : "right-0"} top-0 h-full w-[400px] z-50
          bg-white dark:bg-[#141414]
          shadow-[0_0_40px_rgba(0,0,0,0.2)]
          flex flex-col`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-lg">{customer.customerName}</h2>
            <button onClick={close}
              className="w-8 h-8 flex items-center justify-center rounded-full
                hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-400">
              <X size={16}/>
            </button>
          </div>
          {customer.phone && (
            <p className="text-xs text-gray-400">{customer.phone}</p>
          )}

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: t.total,   value: `$${customer.total?.toFixed(2)}`,   color: "text-gray-700 dark:text-gray-200" },
              { label: t.paid,    value: `$${totalPaid.toFixed(2)}`,         color: "text-green-600 dark:text-green-400" },
              { label: t.balance, value: `$${customer.balance?.toFixed(2)}`, color: "text-orange-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 dark:bg-[#1c1c1c] rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">{label}</p>
                <p className={`font-bold text-sm mt-0.5 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="h-2 bg-gray-100 dark:bg-[#252525] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (totalPaid / (customer.total || 1)) * 100)}%` }}
                transition={{ duration: 0.8 }}
                className="h-full bg-green-500 rounded-full"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {Math.round((totalPaid / (customer.total || 1)) * 100)}% paid
            </p>
          </div>
        </div>

        {/* Payment list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Payment History ({payments.length})
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : payments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">{t.noRecentPayments}</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p, i) => (
                <motion.div key={p._id}
                  initial={{ opacity: 0, x: isAr ? -12 : 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between p-4 rounded-2xl
                    bg-gray-50 dark:bg-[#1c1c1c]
                    border border-gray-100 dark:border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                      ${p.method === "cash"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-600"}`}>
                      {p.method === "cash" ? <Banknote size={16}/> : <CreditCard size={16}/>}
                    </div>
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
                        ${METHOD_STYLE[p.method] || "bg-gray-100 text-gray-600"}`}>
                        {p.method}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(p.createdAt).toLocaleString(isAr ? "ar-SA" : "en-US")}
                      </p>
                      {p.notes && (
                        <p className="text-xs text-gray-400 italic mt-0.5">{p.notes}</p>
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-green-600 dark:text-green-400">
                    +${p.amount.toFixed(2)}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 shrink-0">
          <button onClick={close}
            className="w-full py-3 rounded-2xl
              bg-gray-100 dark:bg-[#1c1c1c]
              text-gray-600 dark:text-gray-300
              hover:bg-gray-200 dark:hover:bg-[#252525]
              transition font-medium text-sm">
            Close
          </button>
        </div>
      </motion.div>
    </>
  );
}