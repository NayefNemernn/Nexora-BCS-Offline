import { useState } from "react";
import api from "../api/axios";
import ReceiptPreview from "./ReceiptPreview";
import { motion } from "framer-motion";
import { useLang } from "../context/LanguageContext";
import { usePayLaterTranslation } from "../hooks/usePayLaterTranslation";
import toast from "react-hot-toast";
import { X, DollarSign, Printer } from "lucide-react";

export default function ReceivePaymentModal({ sale, close, reload }) {
  const { lang }  = useLang();
  const t         = usePayLaterTranslation();
  const isAr      = lang === "ar";

  const [amount,      setAmount]      = useState("");
  const [method,      setMethod]      = useState("cash");
  const [notes,       setNotes]       = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [loading,     setLoading]     = useState(false);

  const setPercent = (pct) => setAmount(((sale.balance * pct) / 100).toFixed(2));

  const pay = async () => {
    const num = Number(amount);
    if (!amount || num <= 0) return;
    if (num > sale.balance) {
      toast.error(`Amount cannot exceed balance ($${sale.balance.toFixed(2)})`);
      return;
    }
    setLoading(true);
    try {
      await api.post(`/hold-sales/${sale._id}/pay`, { amount: num, method, notes });
      reload();
      setShowReceipt(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    const content = document.getElementById("receipt-preview").innerHTML;
    const win = window.open("", "", "width=400,height=600");
    win.document.write(`<html><head><title>Receipt</title>
      <style>body{font-family:Arial;padding:20px;}</style></head>
      <body>${content}</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        dir={isAr ? "rtl" : "ltr"}
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl overflow-hidden
          bg-white dark:bg-[#141414]
          shadow-[0_25px_60px_rgba(0,0,0,0.3)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5
          border-b border-gray-100 dark:border-white/5">
          <div>
            <h2 className="font-bold text-lg">{t.receivePayment}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{sale.customerName}</p>
          </div>
          <button onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-full
              hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-400">
            <X size={16}/>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Balance banner */}
          <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 p-5 text-white text-center">
            <p className="text-xs opacity-80 mb-1">Outstanding Balance</p>
            <p className="text-4xl font-bold">${sale.balance.toFixed(2)}</p>
            <div className="mt-2 text-xs opacity-70">
              Total: ${sale.total?.toFixed(2)} · Paid: ${sale.paid?.toFixed(2)}
            </div>
          </div>

          {/* Quick % buttons */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Quick amount</p>
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map(pct => (
                <button key={pct} onClick={() => setPercent(pct)}
                  className="py-2 rounded-xl text-xs font-semibold
                    bg-gray-100 dark:bg-[#1c1c1c]
                    hover:bg-blue-100 dark:hover:bg-blue-900/30
                    hover:text-blue-600 dark:hover:text-blue-400
                    transition">
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Amount input */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Amount</p>
            <div className="relative">
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full ps-7 pe-4 py-3 rounded-xl text-lg font-semibold
                  bg-gray-50 dark:bg-[#1c1c1c]
                  border border-gray-200 dark:border-white/10
                  focus:ring-2 focus:ring-green-500 outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Payment method</p>
            <div className="grid grid-cols-2 gap-2">
              {[["cash","💵 Cash"],["card","💳 Card"]].map(([val, label]) => (
                <button key={val} onClick={() => setMethod(val)}
                  className={`py-3 rounded-xl text-sm font-medium transition
                    ${method === val
                      ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                      : "bg-gray-100 dark:bg-[#1c1c1c] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#252525]"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <input
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm
              bg-gray-50 dark:bg-[#1c1c1c]
              border border-gray-200 dark:border-white/10
              focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={pay}
              disabled={loading || !amount || Number(amount) <= 0}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl
                bg-green-600 hover:bg-green-700 text-white font-semibold
                disabled:opacity-40 transition
                shadow-[0_4px_14px_rgba(34,197,94,0.35)]">
              <DollarSign size={16}/>
              {loading ? "Processing..." : "Record Payment"}
            </button>
            <button onClick={close}
              className="px-5 py-3 rounded-2xl
                bg-gray-100 dark:bg-[#1c1c1c]
                text-gray-600 dark:text-gray-300
                hover:bg-gray-200 dark:hover:bg-[#252525] transition font-medium text-sm">
              Cancel
            </button>
          </div>

          {/* Receipt */}
          {showReceipt && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="border border-gray-200 dark:border-white/10 rounded-2xl p-4">
              <div id="receipt-preview">
                <ReceiptPreview sale={sale} amount={Number(amount)}/>
              </div>
              <button onClick={printReceipt}
                className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                  bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium text-sm transition">
                <Printer size={14}/> Print Receipt
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}