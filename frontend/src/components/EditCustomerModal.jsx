import { useState } from "react";
import api from "../api/axios";
import { motion } from "framer-motion";
import { useLang } from "../context/LanguageContext";
import { usePayLaterTranslation } from "../hooks/usePayLaterTranslation";
import { X, User, Phone } from "lucide-react";

export default function EditCustomerModal({ sale, close, reload }) {
  const { lang } = useLang();
  const t        = usePayLaterTranslation();
  const isAr     = lang === "ar";

  const [name,  setName]  = useState(sale.customerName);
  const [phone, setPhone] = useState(sale.phone || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/hold-sales/${sale._id}/customer`, { customerName: name, phone });
      reload();
      close();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        dir={isAr ? "rtl" : "ltr"}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden
          bg-white dark:bg-[#141414]
          shadow-[0_25px_60px_rgba(0,0,0,0.3)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5
          border-b border-gray-100 dark:border-white/5">
          <h2 className="font-bold text-lg">{t.editCustomer}</h2>
          <button onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-full
              hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-400">
            <X size={16}/>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">{t.customer}</label>
            <div className="relative">
              <User size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Customer name"
                className="w-full ps-9 pe-4 py-3 rounded-xl text-sm
                  bg-gray-50 dark:bg-[#1c1c1c]
                  border border-gray-200 dark:border-white/10
                  focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">{t.phone}</label>
            <div className="relative">
              <Phone size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full ps-9 pe-4 py-3 rounded-xl text-sm
                  bg-gray-50 dark:bg-[#1c1c1c]
                  border border-gray-200 dark:border-white/10
                  focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={save} disabled={saving || !name.trim()}
              className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700
                text-white font-semibold text-sm disabled:opacity-40 transition">
              {saving ? "Saving..." : t.save}
            </button>
            <button onClick={close}
              className="px-5 py-3 rounded-2xl
                bg-gray-100 dark:bg-[#1c1c1c]
                text-gray-600 dark:text-gray-300
                hover:bg-gray-200 dark:hover:bg-[#252525] transition text-sm font-medium">
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}