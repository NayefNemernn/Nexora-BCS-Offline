import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { X, UserPlus } from "lucide-react";
import { createOpeningBalance } from "../api/holdSale.api";
import { useLang } from "../context/LanguageContext";
import { useCurrency } from "../context/CurrencyContext";
import { usePayLaterTranslation } from "../hooks/usePayLaterTranslation";

const INPUT = "w-full px-4 py-3 rounded-xl text-sm bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500 outline-none";

// Admin-only: records debt a customer owed before the system was in use
// (no items, no stock change). `openAccounts` = the page's open accounts,
// used for name suggestions and to warn when the amount will be merged.
export default function AddPayLaterAccountModal({ openAccounts, close, reload }) {
  const t        = usePayLaterTranslation();
  const { lang } = useLang();
  const isAr     = lang === "ar";
  const { formatLBP, toLBPNice } = useCurrency();

  const [customerName, setCustomerName] = useState("");
  const [phone,        setPhone]        = useState("");
  const [amount,       setAmount]       = useState("");
  const [creditLimit,  setCreditLimit]  = useState("");
  const [notes,        setNotes]        = useState("");
  const [loading,      setLoading]      = useState(false);

  const existing = openAccounts.find(a => a.customerName === customerName.trim());
  const num      = Number(amount);

  const save = async () => {
    if (!customerName.trim()) { toast.error(t.nameRequired); return; }
    if (!(num > 0))           { toast.error(t.amountRequired); return; }
    setLoading(true);
    try {
      await createOpeningBalance({ customerName: customerName.trim(), phone, amount: num, creditLimit, notes });
      toast.success(t.accountAdded);
      reload();
      close();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        dir={isAr ? "rtl" : "ltr"}
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl overflow-hidden bg-white dark:bg-[#141414] shadow-[0_25px_60px_rgba(0,0,0,0.3)] max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <UserPlus size={16} className="text-blue-600 dark:text-blue-400"/>
            </div>
            <h2 className="font-bold text-lg">{t.addAccountTitle}</h2>
          </div>
          <button onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-400">
            <X size={16}/>
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t.addAccountHint}</p>

          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t.customerName} *</label>
            <input list="paylater-names" value={customerName} autoFocus
              onChange={e => setCustomerName(e.target.value)} className={`${INPUT} mt-1`}/>
            <datalist id="paylater-names">
              {openAccounts.map(a => <option key={a._id} value={a.customerName}/>)}
            </datalist>
            {existing && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                {t.existingAccountNote} ({t.debt}: ${existing.balance.toFixed(2)})
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t.amountOwed} ($) *</label>
            <input type="number" min="0" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)} className={`${INPUT} mt-1`}/>
            {num > 0 && <p className="text-xs text-amber-500 mt-1">{formatLBP(toLBPNice(num))}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t.phone}</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className={`${INPUT} mt-1`}/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t.creditLimitOptional}</label>
              <input type="number" min="0" value={creditLimit} placeholder={existing ? String(existing.creditLimit || 500) : "500"}
                onChange={e => setCreditLimit(e.target.value)} className={`${INPUT} mt-1`}/>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t.notesOptional}</label>
            <input value={notes} placeholder={t.notesPlaceholder}
              onChange={e => setNotes(e.target.value)} className={`${INPUT} mt-1`}/>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-white/5">
          <button onClick={close}
            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-[#252525] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333] transition">
            {t.cancel}
          </button>
          <button onClick={save} disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
            {loading ? "..." : t.save}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
