import React, { useEffect, useState } from "react";
import { getBatches, createBatch, updateBatch, adjustBatch, deleteBatch } from "../api/batch.api";
import api from "../api/axios";
import toast from "react-hot-toast";
import {
  Layers, Plus, Trash2, Pencil, RefreshCw, Search, X,
  AlertTriangle, CheckCircle, Clock, Package, SlidersHorizontal,
  Calendar, Truck, TrendingUp, TrendingDown,
} from "lucide-react";

const CARD = "rounded-2xl bg-white dark:bg-[#141414] border border-gray-100 dark:border-white/5";

function expiryStatus(expiryDate) {
  if (!expiryDate) return "none";
  const now  = new Date();
  const exp  = new Date(expiryDate);
  const days = Math.ceil((exp - now) / 86400000);
  if (days < 0)  return "expired";
  if (days <= 7)  return "critical";
  if (days <= 30) return "expiring";
  return "ok";
}

const STATUS_STYLE = {
  expired:  "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-500/30",
  critical: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400",
  expiring: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400",
  ok:       "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400",
  none:     "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
};

const STATUS_LABEL = {
  expired:  "Expired",
  critical: "< 7 days",
  expiring: "< 30 days",
  ok:       "Fresh",
  none:     "No Expiry",
};

const FILTERS = [
  { id: "all",      label: "All" },
  { id: "active",   label: "Active" },
  { id: "expiring", label: "Expiring Soon" },
  { id: "expired",  label: "Expired" },
  { id: "depleted", label: "Depleted" },
];

const BLANK_FORM = {
  productId: "", qty: "", expiryDate: "", costPrice: "",
  supplierId: "", supplierName: "", notes: "", receivedDate: "",
};

export default function BatchManagement() {
  const [batches,   setBatches]   = useState([]);
  const [summary,   setSummary]   = useState({ total: 0, expiring: 0, expired: 0, depleted: 0 });
  const [products,  setProducts]  = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");

  const [showForm,     setShowForm]     = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [adjustModal,  setAdjustModal]  = useState(null);
  const [form,         setForm]         = useState(BLANK_FORM);
  const [adjustForm,   setAdjustForm]   = useState({ change: "", reason: "" });
  const [saving,       setSaving]       = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [showProductDrop, setShowProductDrop] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [bData, pData, sData] = await Promise.all([
        getBatches({ status: filter === "all" ? undefined : filter, search: search || undefined }),
        api.get("/products").then(r => r.data),
        api.get("/suppliers").then(r => r.data),
      ]);
      setBatches(bData.batches);
      setSummary(bData.summary);
      setProducts(pData);
      setSuppliers(sData);
    } catch { toast.error("Failed to load batches"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const openNew = () => {
    setEditingBatch(null);
    setForm(BLANK_FORM);
    setProductSearch("");
    setShowForm(true);
  };

  const openEdit = (b) => {
    setEditingBatch(b);
    setForm({
      productId:    b.productId?._id || b.productId,
      qty:          "", // qty not editable on existing batch
      expiryDate:   b.expiryDate ? b.expiryDate.slice(0, 10) : "",
      costPrice:    b.costPrice || "",
      supplierId:   b.supplierId?._id || b.supplierId || "",
      supplierName: b.supplierName || "",
      notes:        b.notes || "",
      receivedDate: b.receivedDate ? b.receivedDate.slice(0, 10) : "",
    });
    const p = products.find(x => x._id === (b.productId?._id || b.productId));
    setProductSearch(p?.name || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.productId)                    return toast.error("Select a product");
    if (!editingBatch && (!form.qty || +form.qty < 1)) return toast.error("Enter a valid quantity");
    setSaving(true);
    try {
      const payload = {
        expiryDate:   form.expiryDate   || null,
        costPrice:    form.costPrice !== "" ? +form.costPrice : undefined,
        supplierId:   form.supplierId   || null,
        supplierName: form.supplierName || "",
        notes:        form.notes        || "",
        receivedDate: form.receivedDate || undefined,
      };
      if (editingBatch) {
        await updateBatch(editingBatch._id, payload);
        toast.success("Batch updated");
      } else {
        await createBatch({ ...payload, productId: form.productId, qty: +form.qty });
        toast.success("Batch received — stock updated");
      }
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (b) => {
    if (!confirm(`Delete batch ${b.batchNumber}?\nThis will remove ${b.remainingQty} units from product stock.`)) return;
    try {
      await deleteBatch(b._id);
      toast.success("Batch deleted");
      load();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to delete"); }
  };

  const handleAdjust = async () => {
    if (!adjustForm.change || adjustForm.change === "0") return toast.error("Enter a non-zero change");
    try {
      await adjustBatch(adjustModal._id, { change: +adjustForm.change, reason: adjustForm.reason });
      toast.success("Batch adjusted");
      setAdjustModal(null);
      setAdjustForm({ change: "", reason: "" });
      load();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to adjust"); }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.barcode?.includes(productSearch)
  ).slice(0, 8);

  const selectedProduct = products.find(p => p._id === form.productId);

  const daysUntilExpiry = (date) => {
    if (!date) return null;
    return Math.ceil((new Date(date) - new Date()) / 86400000);
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-neutral-950 p-5">
      <div className="w-full space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
              <Layers size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold dark:text-white">Batch Tracking</h1>
              <p className="text-xs text-gray-500">Track stock by batch with expiry dates</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border dark:border-gray-700 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-[0_4px_0_0_#5b21b6] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
              <Plus size={16} /> Receive Stock
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Active Batches",  value: summary.total,    icon: Package,        color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Expiring Soon",   value: summary.expiring, icon: Clock,          color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
            { label: "Expired w/Stock", value: summary.expired,  icon: AlertTriangle,  color: "text-red-500",    bg: "bg-red-50 dark:bg-red-900/20" },
            { label: "Depleted",        value: summary.depleted, icon: TrendingDown,   color: "text-gray-400",   bg: "bg-gray-50 dark:bg-gray-800" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${CARD} p-4 flex items-center gap-3`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-2xl font-bold dark:text-white">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && load()}
              placeholder="Search product name or batch number..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div className="flex gap-1 p-1 bg-white dark:bg-[#141414] rounded-xl border dark:border-gray-700 overflow-x-auto">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium select-none
                  ${filter === f.id ? "bg-violet-600 text-white shadow-[0_4px_0_0_#5b21b6] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Batch list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : batches.length === 0 ? (
          <div className={`${CARD} p-12 text-center`}>
            <Layers size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No batches found.</p>
            <button onClick={openNew} className="mt-3 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition">
              Receive first batch
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {(() => {
              // Find the oldest active batch per product for FIFO badge
              const fifoFirst = {};
              batches.forEach(b => {
                const pid = b.productId?._id || b.productId;
                if (b.remainingQty > 0 && !fifoFirst[pid]) fifoFirst[pid] = b._id;
              });
              return batches.map(batch => {
              const status = expiryStatus(batch.expiryDate);
              const days   = daysUntilExpiry(batch.expiryDate);
              const pct    = batch.initialQty > 0 ? (batch.remainingQty / batch.initialQty) * 100 : 0;
              const depleted = batch.remainingQty === 0;
              const productName = batch.productId?.name || "—";
              const isFifoFirst = fifoFirst[batch.productId?._id || batch.productId] === batch._id;

              return (
                <div key={batch._id} className={`${CARD} p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${depleted ? "opacity-60" : ""}`}>
                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-gray-800 dark:text-white">{productName}</span>
                      <span className="text-xs text-gray-400 font-mono">{batch.batchNumber}</span>
                      {isFifoFirst && (
                        <span className="text-xs px-2 py-0.5 rounded-full border font-bold bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-500/40">
                          Sell First
                        </span>
                      )}
                      {!depleted && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLE[status]}`}>
                          {STATUS_LABEL[status]}
                          {days !== null && days >= 0 && status !== "ok" && status !== "none" ? ` (${days}d)` : ""}
                          {days !== null && days < 0 ? ` (${Math.abs(days)}d ago)` : ""}
                        </span>
                      )}
                      {depleted && <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:border-gray-700">Depleted</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      {batch.expiryDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> Expires: {new Date(batch.expiryDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> Received: {new Date(batch.receivedDate).toLocaleDateString()}
                      </span>
                      {(batch.supplierName || batch.supplierId?.name) && (
                        <span className="flex items-center gap-1">
                          <Truck size={11} /> {batch.supplierName || batch.supplierId?.name}
                        </span>
                      )}
                      {batch.costPrice > 0 && (
                        <span>${batch.costPrice.toFixed(2)}/unit</span>
                      )}
                    </div>
                    {batch.notes && <p className="text-xs text-gray-400 italic mt-1">{batch.notes}</p>}
                  </div>

                  {/* Qty bar + actions */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right min-w-[80px]">
                      <p className="text-lg font-bold dark:text-white">{batch.remainingQty}<span className="text-xs text-gray-400 font-normal"> / {batch.initialQty}</span></p>
                      <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                        <div
                          className={`h-full rounded-full transition-all ${pct > 50 ? "bg-green-500" : pct > 20 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">units left</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!depleted && (
                        <button onClick={() => { setAdjustModal(batch); setAdjustForm({ change: "", reason: "" }); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                          <SlidersHorizontal size={12} /> Adjust
                        </button>
                      )}
                      <button onClick={() => openEdit(batch)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => handleDelete(batch)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            });
            })()}
          </div>
        )}
      </div>

      {/* ── New / Edit Batch Modal ──────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl my-8">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-gray-800 dark:text-white text-lg flex items-center gap-2">
                <Layers size={18} className="text-violet-500" />
                {editingBatch ? `Edit Batch ${editingBatch.batchNumber}` : "Receive Stock"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Product selector (only for new batch) */}
              {!editingBatch && (
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Product *</label>
                  <input
                    value={productSearch}
                    onChange={e => { setProductSearch(e.target.value); setShowProductDrop(true); setForm(f => ({ ...f, productId: "" })); }}
                    onFocus={() => setShowProductDrop(true)}
                    placeholder="Search product..."
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  {showProductDrop && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredProducts.map(p => (
                        <button key={p._id} type="button"
                          onClick={() => { setForm(f => ({ ...f, productId: p._id, costPrice: f.costPrice || p.cost || "" })); setProductSearch(p.name); setShowProductDrop(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between items-center">
                          <span className="dark:text-white">{p.name}</span>
                          <span className="text-xs text-gray-400">{p.barcode} · {p.stock} in stock</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedProduct && (
                    <p className="text-xs text-violet-600 mt-1 flex items-center gap-1">
                      <CheckCircle size={11} /> {selectedProduct.name} — current stock: {selectedProduct.stock}
                    </p>
                  )}
                </div>
              )}
              {editingBatch && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Product</label>
                  <p className="text-sm font-semibold dark:text-white">{editingBatch.productId?.name || "—"}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Quantity — only for new batch */}
                {!editingBatch && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Quantity *</label>
                    <input type="number" min="1" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                      placeholder="0"
                      className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cost Price / unit</label>
                  <input type="number" min="0" step="0.01" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Expiry Date</label>
                  <input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Received Date</label>
                  <input type="date" value={form.receivedDate} onChange={e => setForm(f => ({ ...f, receivedDate: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Supplier (optional)</label>
                <select value={form.supplierId} onChange={e => {
                  const sup = suppliers.find(s => s._id === e.target.value);
                  setForm(f => ({ ...f, supplierId: e.target.value, supplierName: sup?.name || "" }));
                }}
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">— No supplier —</option>
                  {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="e.g. Invoice #123, stored in fridge..."
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm shadow-[0_4px_0_0_#5b21b6] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                  {saving ? "Saving..." : editingBatch ? "Save Changes" : "Receive Batch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust Qty Modal ────────────────────────────────────── */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setAdjustModal(null); }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold dark:text-white">Adjust Batch</h2>
              <button onClick={() => setAdjustModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              <strong className="dark:text-white">{adjustModal.batchNumber}</strong> — {adjustModal.productId?.name}<br />
              Current: <strong>{adjustModal.remainingQty}</strong> units
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Change (+add / −remove)</label>
                <input type="number" value={adjustForm.change} onChange={e => setAdjustForm(f => ({ ...f, change: e.target.value }))}
                  placeholder="e.g. -2 or +5"
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Reason</label>
                <input value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Damaged, miscount, returned..."
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              {adjustForm.change && (
                <p className="text-xs text-gray-400">
                  New qty: <strong className="dark:text-white">{adjustModal.remainingQty + (+adjustForm.change || 0)}</strong>
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setAdjustModal(null)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                Cancel
              </button>
              <button onClick={handleAdjust}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm shadow-[0_4px_0_0_#5b21b6] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
