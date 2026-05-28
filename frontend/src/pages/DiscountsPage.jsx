import React, { useEffect, useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { Tag, Plus, Trash2, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { useDiscountsTranslation } from "../hooks/useDiscountsTranslation";

const CARD = "rounded-2xl bg-white dark:bg-[#141414] shadow-[6px_6px_16px_#d1d5db,-6px_-6px_16px_#ffffff] dark:shadow-[6px_6px_16px_#050505,-6px_-6px_16px_#1a1a1a]";

export default function DiscountsPage() {
  const t = useDiscountsTranslation();
  const [discounts, setDiscounts] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [form, setForm] = useState({ name: "", code: "", type: "percent", value: "", minOrder: "", maxUses: "", expiresAt: "", appliesTo: "all" });

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/discounts"); setDiscounts(r.data); }
    catch { toast.error(t.failedToLoad); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/discounts", { ...form, value: +form.value, minOrder: +form.minOrder || 0, maxUses: form.maxUses ? +form.maxUses : null, expiresAt: form.expiresAt || null });
      toast.success(t.discountCreated);
      setShowForm(false);
      setForm({ name: "", code: "", type: "percent", value: "", minOrder: "", maxUses: "", expiresAt: "", appliesTo: "all" });
      load();
    } catch (err) { toast.error(err.response?.data?.message || t.failed); }
  };

  const handleToggle = async (d) => {
    try { await api.put(`/discounts/${d._id}`, { active: !d.active }); toast.success(d.active ? t.disabled : t.enabled); load(); }
    catch { toast.error(t.failed); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t.deleteConfirm)) return;
    try { await api.delete(`/discounts/${id}`); toast.success(t.deleted); load(); }
    catch { toast.error(t.failed); }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-neutral-950 p-5">
      <div className="w-full space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center"><Tag size={20} className="text-white"/></div>
            <div><h1 className="text-xl font-bold">{t.title}</h1><p className="text-xs text-gray-500">{t.subtitle}</p></div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 hover:bg-gray-50 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"><RefreshCw size={13}/></button>
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-green-500 hover:bg-green-600 text-white shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"><Plus size={14}/> {t.newDiscount}</button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleCreate} className={`${CARD} p-5 space-y-4`}>
            <h3 className="font-semibold">{t.createDiscount}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.nameLabel}</label>
                <input required placeholder="e.g. Summer Sale" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none focus:ring-2 focus:ring-green-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.couponCode}</label>
                <input placeholder="e.g. SAVE10" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none font-mono focus:ring-2 focus:ring-green-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.typeLabel}</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none">
                  <option value="percent">{t.typePercent}</option>
                  <option value="fixed">{t.typeFixed}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.valueLabel} {form.type === "percent" ? "(%)" : "($)"}</label>
                <input required type="number" min="0" step="0.01" placeholder={form.type === "percent" ? "10" : "5.00"} value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none focus:ring-2 focus:ring-green-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.minOrder}</label>
                <input type="number" min="0" step="0.01" placeholder="0" value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.maxUses}</label>
                <input type="number" min="1" placeholder="Unlimited" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.expiresAt}</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none"/>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium text-sm shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">{t.create}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">{t.cancel}</button>
            </div>
          </form>
        )}

        {/* Table */}
        <div className={`${CARD} overflow-hidden`}>
          {loading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin"/></div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#1a1a1a] text-gray-500">
                <tr>{[t.colName, t.colCode, t.colTypeValue, t.colMinOrder, t.colUses, t.colExpires, t.colStatus, t.colActions].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-xs">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {discounts.map(d => {
                  const expired = d.expiresAt && new Date(d.expiresAt) < new Date();
                  const maxed   = d.maxUses && d.usedCount >= d.maxUses;
                  return (
                    <tr key={d._id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{d.name}</td>
                      <td className="px-4 py-3">{d.code ? <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded font-mono text-xs font-bold">{d.code}</span> : <span className="text-gray-400 text-xs">{t.noCode}</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${d.type === "percent" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                          {d.type === "percent" ? `${d.value}%` : `$${d.value}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{d.minOrder > 0 ? `$${d.minOrder}` : "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{d.usedCount}{d.maxUses ? `/${d.maxUses}` : ""}</td>
                      <td className="px-4 py-3 text-xs">{d.expiresAt ? <span className={expired ? "text-red-500 font-medium" : "text-gray-500"}>{expired ? `${t.statusExpired} ` : ""}{new Date(d.expiresAt).toLocaleDateString()}</span> : <span className="text-gray-400">{t.statusNever}</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.active && !expired && !maxed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {expired ? t.statusExpired : maxed ? t.statusUsedUp : d.active ? t.statusActive : t.statusInactive}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => handleToggle(d)} className={`p-1.5 rounded-lg transition ${d.active ? "text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"}`}>
                            {d.active ? <XCircle size={14}/> : <CheckCircle size={14}/>}
                          </button>
                          <button onClick={() => handleDelete(d._id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {discounts.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">{t.noDiscounts}</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
