import { isOnline } from "../lib/connectivity";
import React, { useEffect, useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { DollarSign, Plus, Trash2, RefreshCw, Search, TrendingDown, CloudOff } from "lucide-react";
import { useExpensesTranslation } from "../hooks/useExpensesTranslation";
import useOfflineSales from "../hooks/useOfflineSales";
import { getPendingExpenses } from "../lib/offlineDB";

const CARD = "rounded-2xl bg-white dark:bg-[#141414] shadow-[6px_6px_16px_#d1d5db,-6px_-6px_16px_#ffffff] dark:shadow-[6px_6px_16px_#050505,-6px_-6px_16px_#1a1a1a]";
const CATEGORIES = ["rent", "utilities", "salaries", "supplies", "maintenance", "marketing", "transport", "other"];
const CAT_COLORS = { rent: "bg-blue-100 text-blue-700", utilities: "bg-yellow-100 text-yellow-700", salaries: "bg-purple-100 text-purple-700", supplies: "bg-green-100 text-green-700", maintenance: "bg-orange-100 text-orange-700", marketing: "bg-pink-100 text-pink-700", transport: "bg-cyan-100 text-cyan-700", other: "bg-gray-100 text-gray-700" };

export default function ExpensesPage() {
  const t = useExpensesTranslation();
  const { saveExpenseOffline } = useOfflineSales();
  const [expenses,        setExpenses]        = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [summary,         setSummary]         = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [search,   setSearch]   = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", category: "other", paymentMethod: "cash", notes: "", date: new Date().toISOString().split("T")[0] });
  const [filters, setFilters] = useState({ from: "", to: "", category: "" });

  const loadPending = async () => {
    const pending = await getPendingExpenses().catch(() => []);
    setPendingExpenses(pending);
  };

  const load = async () => {
    setLoading(true);
    await loadPending();
    try {
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to)   params.to   = filters.to;
      if (filters.category) params.category = filters.category;
      const [e, s] = await Promise.all([api.get("/expenses", { params }), api.get("/expenses/summary", { params })]);
      setExpenses(e.data); setSummary(s.data);
    } catch { toast.error(t.failedToLoad); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);
  /* refresh pending count when sync completes */
  useEffect(() => {
    window.addEventListener("offlineSynced", loadPending);
    return () => window.removeEventListener("offlineSynced", loadPending);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount) return toast.error(t.titleAmountRequired);
    const data = { ...form, amount: +form.amount };
    if (!isOnline()) {
      await saveExpenseOffline(data);
      toast.success("📴 Expense saved — will sync when connected");
      setShowForm(false);
      setForm({ title: "", amount: "", category: "other", paymentMethod: "cash", notes: "", date: new Date().toISOString().split("T")[0] });
      await loadPending();
      return;
    }
    try {
      await api.post("/expenses", data);
      toast.success(t.expenseAdded);
      setShowForm(false);
      setForm({ title: "", amount: "", category: "other", paymentMethod: "cash", notes: "", date: new Date().toISOString().split("T")[0] });
      load();
    } catch (err) { toast.error(err.response?.data?.message || t.failed); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t.deleteConfirm)) return;
    try { await api.delete(`/expenses/${id}`); toast.success(t.deleted); load(); } catch { toast.error(t.failed); }
  };

  const pendingRows = pendingExpenses.map(p => ({
    ...p, _id: `pending-${p.id}`, _pending: true,
  }));
  const filtered = [
    ...pendingRows.filter(p => p.title?.toLowerCase().includes(search.toLowerCase())),
    ...expenses.filter(e => e.title.toLowerCase().includes(search.toLowerCase())),
  ];

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-neutral-950 p-5">
      <div className="w-full space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center"><TrendingDown size={20} className="text-white"/></div>
            <div><h1 className="text-xl font-bold">{t.title}</h1><p className="text-xs text-gray-500">{t.subtitle}</p></div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 hover:bg-gray-50 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"><RefreshCw size={13}/></button>
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white shadow-[0_4px_0_0_#b91c1c] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"><Plus size={14}/> {t.addExpense}</button>
          </div>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`${CARD} p-4 col-span-2 md:col-span-1`}>
              <div className="text-xs text-gray-500 mb-1">{t.totalExpenses}</div>
              <div className="text-2xl font-bold text-red-600">${summary.totalAmount?.toFixed(2)}</div>
            </div>
            {summary.summary?.slice(0, 3).map(s => (
              <div key={s._id} className={`${CARD} p-4`}>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS[s._id] || CAT_COLORS.other}`}>{s._id}</span>
                <div className="text-lg font-bold mt-2">${s.total?.toFixed(2)}</div>
                <div className="text-xs text-gray-400">{s.count} {t.entries}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="border rounded-xl px-3 py-2 text-sm dark:bg-[#141414] dark:border-white/10 dark:text-white" placeholder="From"/>
          <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="border rounded-xl px-3 py-2 text-sm dark:bg-[#141414] dark:border-white/10 dark:text-white" placeholder="To"/>
          <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))} className="border rounded-xl px-3 py-2 text-sm dark:bg-[#141414] dark:border-white/10 dark:text-white">
            <option value="">{t.allCategories}</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(filters.from || filters.to || filters.category) && <button onClick={() => setFilters({ from: "", to: "", category: "" })} className="text-xs text-blue-500 hover:underline">{t.clearFilters}</button>}
          <div className="relative ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input placeholder={t.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-2 rounded-xl text-sm border dark:bg-[#141414] dark:border-white/10 dark:text-white outline-none"/>
          </div>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleCreate} className={`${CARD} p-5 space-y-4`}>
            <h3 className="font-semibold">{t.addNewExpense}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.titleLabel}</label>
                <input required placeholder="e.g. Monthly Rent" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none focus:ring-2 focus:ring-red-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.amountLabel}</label>
                <input required type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none focus:ring-2 focus:ring-red-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.categoryLabel}</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.paymentMethod}</label>
                <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none">
                  <option value="cash">{t.cash}</option>
                  <option value="card">{t.card}</option>
                  <option value="bank_transfer">{t.bankTransfer}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.dateLabel}</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.notesLabel}</label>
                <input placeholder="Optional notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none"/>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium text-sm shadow-[0_4px_0_0_#b91c1c] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">{t.saveExpense}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">{t.cancel}</button>
            </div>
          </form>
        )}

        {/* Table */}
        <div className={`${CARD} overflow-hidden`}>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-red-500 border-t-transparent rounded-full animate-spin"/></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#1a1a1a] text-gray-500">
                <tr>{[t.colTitle, t.colCategory, t.colAmount, t.colMethod, t.colDate, t.colNotes, ""].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-xs">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filtered.map(e => (
                  <tr key={e._id} className={`hover:bg-gray-50 dark:hover:bg-white/5 ${e._pending ? "opacity-70" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                      <div className="flex items-center gap-2">
                        {e.title}
                        {e._pending && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                            <CloudOff size={9}/> pending
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS[e.category] || CAT_COLORS.other}`}>{e.category}</span></td>
                    <td className="px-4 py-3 font-bold text-red-600">${e.amount?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{e.paymentMethod}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{e.date ? new Date(e.date).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">{e.notes || "—"}</td>
                    <td className="px-4 py-3">
                      {!e._pending && <button onClick={() => handleDelete(e._id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"><Trash2 size={14}/></button>}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{t.noExpensesFound}</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
