import { isOnline } from "../lib/connectivity";
import React, { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import {
  Package, TrendingUp, TrendingDown, Search, RefreshCw, Plus, Minus,
  Warehouse, ArrowRight, ScanLine, X, Check, Loader2, Camera, Upload,
  Pencil, Trash2, ChevronLeft, ArrowLeftRight,
} from "lucide-react";
import { useStockTranslation } from "../hooks/useStockTranslation";
import { cacheByKey, getCachedByKey, queueMutation, cacheProducts } from "../lib/offlineDB";

const CARD = "rounded-2xl bg-white dark:bg-[#141414] shadow-[6px_6px_16px_#d1d5db,-6px_-6px_16px_#ffffff] dark:shadow-[6px_6px_16px_#050505,-6px_-6px_16px_#1a1a1a]";
const INP  = "w-full px-3 py-2 rounded-xl text-sm border border-gray-200 dark:border-white/10 bg-transparent outline-none focus:border-blue-400 transition";

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
};

export default function StockPage() {
  const t = useStockTranslation();

  // ── Core data ────────────────────────────────────────────────────────────
  const [products,   setProducts]   = useState([]);
  const [logs,       setLogs]       = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [tab,        setTab]        = useState("showroom");

  // ── Showroom adjust modal ────────────────────────────────────────────────
  const [adjustModal,   setAdjustModal]   = useState(null);
  const [adjustForm,    setAdjustForm]    = useState({ change: "", reason: "", type: "manual_add" });
  const [adjustPwd,     setAdjustPwd]     = useState("");
  const [adjustPwdErr,  setAdjustPwdErr]  = useState("");
  const [adjustPwdShow, setAdjustPwdShow] = useState(false);

  // ── Store in Warehouse modal (showroom → warehouse) ──────────────────────
  const [storeModal,    setStoreModal]    = useState(null); // product
  const [storeWh,       setStoreWh]       = useState("");   // selected warehouseId
  const [storeQty,      setStoreQty]      = useState("");
  const [storeReason,   setStoreReason]   = useState("");

  // ── Warehouse CRUD ───────────────────────────────────────────────────────
  const [showCreateWh,  setShowCreateWh]  = useState(false);
  const [whName,        setWhName]        = useState("");
  const [whDesc,        setWhDesc]        = useState("");
  const [editWh,        setEditWh]        = useState(null); // warehouse being renamed
  const [editWhName,    setEditWhName]    = useState("");

  // ── Warehouse drill-down ─────────────────────────────────────────────────
  const [activeWh,      setActiveWh]      = useState(null); // warehouse object
  const [whStock,       setWhStock]       = useState([]);   // WarehouseStock entries
  const [whStockLoading,setWhStockLoading]= useState(false);

  // ── Receive from supplier modal (supplier → warehouse) ───────────────────
  const [receiveModal,  setReceiveModal]  = useState(null); // { warehouse }
  const [receiveProduct,setReceiveProduct]= useState("");
  const [receiveQty,    setReceiveQty]    = useState("");
  const [receiveReason, setReceiveReason] = useState("");

  // ── Move to showroom modal (warehouse → showroom) ────────────────────────
  const [toShowroomEntry, setToShowroomEntry] = useState(null); // WarehouseStock entry
  const [toShowroomQty,   setToShowroomQty]   = useState("");

  // ── Scan Receipt ─────────────────────────────────────────────────────────
  const [showScan,        setShowScan]        = useState(false);
  const [scanWh,          setScanWh]          = useState("");
  const [scanLoading,     setScanLoading]     = useState(false);
  const [scanItems,       setScanItems]       = useState([]);
  const [scanMatches,     setScanMatches]     = useState({});
  const [scanQtys,        setScanQtys]        = useState({});
  const [scanNewProducts, setScanNewProducts] = useState({}); // { [i]: { name, price, cost } }
  const [confirming,      setConfirming]      = useState(false);
  const fileRef = useRef(null);
  const camRef  = useRef(null);

  // ── Load ─────────────────────────────────────────────────────────────────
  const loadAll = async () => {
    setLoading(true);
    const cachedP = await getCachedByKey("stock_products_list");
    const cachedL = await getCachedByKey("stock_logs_list");
    if (cachedP) setProducts(cachedP);
    if (cachedL) setLogs(cachedL);
    try {
      const [p, l, w, c] = await Promise.all([
        api.get("/products"),
        api.get("/stock/logs"),
        api.get("/warehouses"),
        api.get("/categories"),
      ]);
      setProducts(p.data);
      setLogs(l.data);
      setWarehouses(w.data);
      setCategories(c.data);
      await cacheByKey("stock_products_list", p.data);
      await cacheByKey("stock_logs_list", l.data);
    } catch {
      if (!cachedP) toast.error(t.failed);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const loadWhStock = async (warehouse) => {
    setActiveWh(warehouse);
    setWhStockLoading(true);
    try {
      const { data } = await api.get(`/warehouses/${warehouse._id}/stock`);
      setWhStock(data);
    } catch { setWhStock([]); }
    finally { setWhStockLoading(false); }
  };

  // ── Showroom adjust ──────────────────────────────────────────────────────
  const handleAdjust = async () => {
    if (!adjustForm.change || adjustForm.change === "0") return toast.error(t.enterQuantity);
    if (!adjustPwd.trim()) { setAdjustPwdErr("Password is required"); return; }
    setAdjustPwdErr("");
    // Verify password before proceeding
    try {
      await api.post("/auth/verify-password", { password: adjustPwd });
    } catch (err) {
      setAdjustPwdErr(err.response?.data?.message || "Incorrect password");
      return;
    }
    if (!isOnline()) {
      const payload = { productId: adjustModal._id, change: +adjustForm.change, reason: adjustForm.reason, type: adjustForm.type };
      await queueMutation("stock_adjust", "/api/stock/adjust", "POST", payload);
      const updated = products.map(p => p._id === adjustModal._id ? { ...p, stock: Math.max(0, p.stock + +adjustForm.change) } : p);
      setProducts(updated);
      await cacheByKey("stock_products_list", updated);
      await cacheProducts(updated);
      toast.success("📴 Queued — will sync when connected");
      setAdjustModal(null); setAdjustForm({ change: "", reason: "", type: "manual_add" }); setAdjustPwd(""); setAdjustPwdErr(""); return;
    }
    try {
      await api.post("/stock/adjust", { productId: adjustModal._id, change: +adjustForm.change, reason: adjustForm.reason, type: adjustForm.type });
      toast.success(t.stockAdjusted);
      setAdjustModal(null); setAdjustForm({ change: "", reason: "", type: "manual_add" }); setAdjustPwd(""); setAdjustPwdErr("");
      loadAll();
    } catch (err) { toast.error(err.response?.data?.message || t.failed); }
  };

  // ── Store in warehouse ───────────────────────────────────────────────────
  const handleStoreInWarehouse = async () => {
    if (!storeWh) return toast.error("Select a warehouse");
    const qty = Number(storeQty);
    if (!qty || qty <= 0) return toast.error("Enter a valid quantity");
    try {
      await api.post("/warehouses/move-to", { warehouseId: storeWh, productId: storeModal._id, quantity: qty, reason: storeReason });
      toast.success(`Moved ${qty} to warehouse ✓`);
      setStoreModal(null); setStoreWh(""); setStoreQty(""); setStoreReason("");
      loadAll();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  // ── Warehouse CRUD ───────────────────────────────────────────────────────
  const handleCreateWh = async () => {
    if (!whName.trim()) return toast.error("Name is required");
    try {
      const { data } = await api.post("/warehouses", { name: whName.trim(), description: whDesc });
      setWarehouses(prev => [...prev, data]);
      setWhName(""); setWhDesc(""); setShowCreateWh(false);
      toast.success(`Warehouse "${data.name}" created ✓`);
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const handleRenameWh = async () => {
    if (!editWhName.trim()) return;
    try {
      const { data } = await api.put(`/warehouses/${editWh._id}`, { name: editWhName.trim() });
      setWarehouses(prev => prev.map(w => w._id === data._id ? { ...w, name: data.name } : w));
      if (activeWh?._id === data._id) setActiveWh(prev => ({ ...prev, name: data.name }));
      setEditWh(null); setEditWhName("");
      toast.success("Renamed ✓");
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const handleDeleteWh = async (wh) => {
    if (!window.confirm(`Delete warehouse "${wh.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/warehouses/${wh._id}`);
      setWarehouses(prev => prev.filter(w => w._id !== wh._id));
      if (activeWh?._id === wh._id) setActiveWh(null);
      toast.success("Warehouse deleted");
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  // ── Receive from supplier ────────────────────────────────────────────────
  const handleReceiveSupplier = async () => {
    if (!receiveProduct) return toast.error("Select a product");
    const qty = Number(receiveQty);
    if (!qty || qty <= 0) return toast.error("Enter a valid quantity");
    try {
      await api.post("/warehouses/receive-supplier", {
        warehouseId: receiveModal._id,
        productId: receiveProduct,
        quantity: qty,
        reason: receiveReason || "Received from supplier",
      });
      toast.success(`Added ${qty} to ${receiveModal.name} ✓`);
      setReceiveModal(null); setReceiveProduct(""); setReceiveQty(""); setReceiveReason("");
      if (activeWh?._id === receiveModal._id) loadWhStock(activeWh);
      loadAll();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  // ── Move from warehouse → showroom ───────────────────────────────────────
  const handleToShowroom = async () => {
    const qty = Number(toShowroomQty);
    if (!qty || qty <= 0) return toast.error("Enter a valid quantity");
    if (qty > toShowroomEntry.quantity) return toast.error("Exceeds warehouse stock");
    try {
      await api.post("/warehouses/move-from", {
        warehouseId: toShowroomEntry.warehouseId,
        productId: toShowroomEntry.productId._id,
        quantity: qty,
      });
      toast.success(`Moved ${qty} to showroom ✓`);
      setToShowroomEntry(null); setToShowroomQty("");
      if (activeWh) loadWhStock(activeWh);
      loadAll();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  // ── Scan Receipt ─────────────────────────────────────────────────────────
  const submitReceiptImage = async (file) => {
    if (!file) return;
    setScanLoading(true); setScanItems([]);
    try {
      const form = new FormData();
      form.append("receipt", file);
      const { data } = await api.post("/stock/scan-receipt", form, { headers: { "Content-Type": "multipart/form-data" } });
      const items = data.items || [];
      setScanItems(items);
      const qtys = {}; const matches = {};
      items.forEach((item, i) => {
        qtys[i] = String(item.quantity ?? "");
        const lower = item.name.toLowerCase();
        const found = products.find(p => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase()));
        if (found) matches[i] = found._id;
      });
      setScanQtys(qtys); setScanMatches(matches);
    } catch (err) { toast.error(err.response?.data?.message || "Could not scan receipt"); }
    finally { setScanLoading(false); }
  };

  const confirmReceipt = async () => {
    if (!scanWh) return toast.error("Select a warehouse to receive into");

    // Validate new-product forms before doing anything
    for (const [idx, np] of Object.entries(scanNewProducts)) {
      if (!np) continue;
      if (!np.name?.trim()) return toast.error(`Item ${Number(idx) + 1}: product name is required`);
      if (!np.price || isNaN(np.price) || Number(np.price) <= 0) return toast.error(`Item ${Number(idx) + 1}: selling price is required`);
    }

    setConfirming(true);
    const finalMatches = { ...scanMatches };

    // Create new products first
    for (const [idx, np] of Object.entries(scanNewProducts)) {
      if (!np) continue;
      try {
        const { data } = await api.post("/products", {
          name:            np.name.trim(),
          price:           Number(np.price),
          cost:            Number(np.cost) || 0,
          stock:           0,
          barcode:         np.barcode?.trim() || `GEN-${Date.now()}-${idx}`,
          category:        np.category || undefined,
          expiryDate:      np.expiryDate || undefined,
          expiryAlertDays: np.expiryAlertDays ? Number(np.expiryAlertDays) : 180,
          vatExempt:       np.vatExempt ?? false,
          isAvailableOnline: np.isAvailableOnline ?? true,
        });
        finalMatches[idx] = data._id;
      } catch (err) {
        toast.error(`Failed to create "${np.name}": ${err.response?.data?.message || "error"}`);
        setConfirming(false);
        return;
      }
    }

    const toReceive = scanItems
      .map((_, i) => ({ productId: finalMatches[i], qty: Number(scanQtys[i]) }))
      .filter(r => r.productId && r.qty > 0);
    if (!toReceive.length) { setConfirming(false); return toast.error("Match at least one item to a product"); }

    try {
      await Promise.all(toReceive.map(r =>
        api.post("/warehouses/receive-supplier", { warehouseId: scanWh, productId: r.productId, quantity: r.qty, reason: "Scanned from supplier receipt" })
      ));
      const [{ data: w }, { data: p }] = await Promise.all([api.get("/warehouses"), api.get("/products")]);
      setWarehouses(w);
      setProducts(p);
      toast.success(`${toReceive.length} item(s) added to warehouse ✓`);
      setShowScan(false); setScanItems([]); setScanMatches({}); setScanQtys({}); setScanWh(""); setScanNewProducts({});
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
    finally { setConfirming(false); }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search)
  );
  const lowStock = products.filter(p => p.stock <= 5 && p.stock > 0);
  const outStock = products.filter(p => p.stock === 0);
  const expiring = products.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date(Date.now() + 7 * 86400000));

  if (loading && !products.length) return <div className="flex items-center justify-center h-64 text-gray-500">{t.loading}</div>;

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-neutral-950 p-5">
      <div className="w-full space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center"><Package size={20} className="text-white"/></div>
            <div><h1 className="text-xl font-bold">{t.title}</h1><p className="text-xs text-gray-500">{t.subtitle}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowScan(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
              <ScanLine size={14}/> Scan Receipt
            </button>
            <button onClick={loadAll}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 hover:bg-gray-50 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
              <RefreshCw size={13}/> {t.refresh}
            </button>
          </div>
        </div>

        {/* Alert cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t.outOfStock,   value: outStock.length,    color: "text-red-600",    bg: "bg-red-50 dark:bg-red-900/20",     icon: "🚨" },
            { label: t.lowStock,     value: lowStock.length,    color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-900/20", icon: "⚠️" },
            { label: t.expiringSoon, value: expiring.length,    color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20",icon: "📅" },
            { label: "Warehouses",   value: warehouses.length,  color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20",   icon: "🏭" },
          ].map(c => (
            <div key={c.label} className={`${CARD} ${c.bg} p-4`}>
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-xs text-gray-500">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/10 w-fit">
          {[
            ["showroom", "🏪 Showroom"],
            ["warehouse", "🏭 مستودع"],
            ["logs", t.tabLog || "Logs"],
          ].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); if (key !== "warehouse") setActiveWh(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === key ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        {tab !== "logs" && tab !== "warehouse" && (
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input placeholder={t.searchProducts} value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 focus:border-blue-400"/>
          </div>
        )}

        {/* ── SHOWROOM TAB ──────────────────────────────────────── */}
        {tab === "showroom" && (
          <div className={`${CARD} overflow-hidden`}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#1a1a1a] text-gray-500">
                <tr>{[t.colProduct, t.colBarcode, t.colCategory, "Showroom Stock", t.colPrice, "Expiry", "Actions"].map(h =>
                  <th key={h} className="px-4 py-3 text-left font-medium text-xs">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filtered.map(p => {
                  const isLow = p.stock <= 5 && p.stock > 0;
                  const isOut = p.stock === 0;
                  const isExp = p.expiryDate && new Date(p.expiryDate) < new Date(Date.now() + 7 * 86400000);
                  return (
                    <tr key={p._id} className={`hover:bg-gray-50 dark:hover:bg-white/5 transition ${isOut ? "bg-red-50/30 dark:bg-red-900/10" : isLow ? "bg-amber-50/30 dark:bg-amber-900/10" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 dark:text-white">{p.name}</div>
                        {isExp && <div className="text-xs text-orange-500">⚠ {t.expiringSoonBadge}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.barcode}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.category?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold text-sm ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-gray-800 dark:text-white"}`}>
                          {isOut ? t.outBadge : p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">${p.price?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(p.expiryDate)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setAdjustModal(p); setAdjustForm({ change: "", reason: "", type: "manual_add" }); setAdjustPwd(""); setAdjustPwdErr(""); setAdjustPwdShow(false); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition font-medium">
                            <Plus size={11}/> {t.adjustBtn}
                          </button>
                          {p.stock > 0 && warehouses.length > 0 && (
                            <button onClick={() => { setStoreModal(p); setStoreWh(warehouses[0]._id); setStoreQty(""); setStoreReason(""); }}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 transition font-medium">
                              <Warehouse size={11}/> Store
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{t.noProductsFound}</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── WAREHOUSE TAB ────────────────────────────────────── */}
        {tab === "warehouse" && (
          <div className="space-y-4">

            {/* Warehouse list view */}
            {!activeWh && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Select a warehouse to manage its stock, or create a new one.</p>
                  <button
                    onClick={() => setShowCreateWh(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75">
                    <Plus size={14}/> New Warehouse
                  </button>
                </div>

                {warehouses.length === 0 ? (
                  <div className={`${CARD} p-12 flex flex-col items-center text-gray-400`}>
                    <Warehouse size={40} className="opacity-20 mb-3"/>
                    <p className="text-sm font-medium">No warehouses yet</p>
                    <p className="text-xs mt-1">Create a warehouse to start organising your storage</p>
                    <button onClick={() => setShowCreateWh(true)}
                      className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">
                      + Create First Warehouse
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {warehouses.map(wh => (
                      <div key={wh._id} className={`${CARD} p-5 cursor-pointer hover:ring-2 hover:ring-blue-400/40 transition group`}
                        onClick={() => loadWhStock(wh)}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Warehouse size={20} className="text-blue-600 dark:text-blue-400"/>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition" onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setEditWh(wh); setEditWhName(wh.name); }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-blue-600 transition">
                              <Pencil size={12}/>
                            </button>
                            <button onClick={() => handleDeleteWh(wh)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-red-500 transition">
                              <Trash2 size={12}/>
                            </button>
                          </div>
                        </div>
                        <h3 className="font-bold text-gray-800 dark:text-white">{wh.name}</h3>
                        {wh.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{wh.description}</p>}
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span><strong className="text-blue-600 dark:text-blue-400">{wh.productCount ?? 0}</strong> products</span>
                          <span><strong className="text-blue-600 dark:text-blue-400">{wh.totalUnits ?? 0}</strong> units</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Warehouse drill-down */}
            {activeWh && (
              <div className="space-y-3">
                {/* Back + title */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActiveWh(null)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 hover:bg-gray-50 transition">
                      <ChevronLeft size={15}/>
                    </button>
                    <div>
                      <h2 className="font-bold">{activeWh.name}</h2>
                      <p className="text-xs text-gray-400">{whStock.length} product type{whStock.length !== 1 ? "s" : ""} in stock</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setReceiveModal(activeWh); setReceiveProduct(""); setReceiveQty(""); setReceiveReason(""); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_3px_0_0_#15803d] active:shadow-none active:translate-y-[3px] transition-[transform,box-shadow] duration-75">
                    <Plus size={13}/> Receive from Supplier
                  </button>
                </div>

                {/* Stock table */}
                <div className={`${CARD} overflow-hidden`}>
                  {whStockLoading ? (
                    <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-blue-500"/></div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-[#1a1a1a] text-gray-500">
                        <tr>{["Product", "Warehouse Qty", "Showroom Qty", "Actions"].map(h =>
                          <th key={h} className="px-4 py-3 text-left font-medium text-xs">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {whStock.map(entry => (
                          <tr key={entry._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-800 dark:text-white">{entry.productId?.name}</div>
                              <div className="text-xs text-gray-400 font-mono">{entry.productId?.barcode}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-blue-600 dark:text-blue-400">{entry.quantity}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-bold text-sm ${(entry.productId?.stock ?? 0) === 0 ? "text-red-500" : (entry.productId?.stock ?? 0) <= 5 ? "text-amber-500" : "text-green-600 dark:text-green-400"}`}>
                                {entry.productId?.stock ?? 0}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => { setToShowroomEntry(entry); setToShowroomQty(""); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 transition font-medium">
                                <ArrowRight size={11}/> → Showroom
                              </button>
                            </td>
                          </tr>
                        ))}
                        {whStock.length === 0 && (
                          <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                            <Warehouse size={28} className="mx-auto opacity-20 mb-2"/>
                            <p className="text-sm">No stock in this warehouse</p>
                            <p className="text-xs mt-1">Use "Receive from Supplier" to add stock</p>
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LOGS TAB ─────────────────────────────────────────── */}
        {tab === "logs" && (
          <div className={`${CARD} overflow-hidden`}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#1a1a1a] text-gray-500">
                <tr>{[t.colProduct, t.colType, t.colChange, t.colBefore, t.colAfter, t.colReason, t.colBy, t.colDate].map(h =>
                  <th key={h} className="px-4 py-3 text-left font-medium text-xs">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {logs.map(log => (
                  <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-sm">{log.productName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${log.type === "warehouse_in" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : log.type === "warehouse_transfer" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>
                        {log.type === "warehouse_in" ? "🏭 warehouse"
                          : log.type === "warehouse_transfer" ? "→ showroom"
                          : log.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-sm flex items-center gap-1 ${log.change > 0 ? "text-green-600" : "text-red-600"}`}>
                        {log.change > 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>} {log.change > 0 ? "+" : ""}{log.change}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{log.quantityBefore}</td>
                    <td className="px-4 py-3 text-xs font-medium">{log.quantityAfter}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{log.reason || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{log.userId?.username || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">{t.noStockLogs}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ CREATE WAREHOUSE MODAL ══════════════════════════════════════════ */}
      {showCreateWh && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowCreateWh(false); }}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Warehouse size={18} className="text-blue-600 dark:text-blue-400"/>
              </div>
              <h2 className="font-bold">Create Warehouse</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" placeholder="e.g. Main Storage, Back Room, Cold Storage…"
                  value={whName} onChange={e => setWhName(e.target.value)} className={INP} autoFocus
                  onKeyDown={e => e.key === "Enter" && handleCreateWh()}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" placeholder="Location, notes…" value={whDesc} onChange={e => setWhDesc(e.target.value)} className={INP}/>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCreateWh}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75">
                  Create
                </button>
                <button onClick={() => { setShowCreateWh(false); setWhName(""); setWhDesc(""); }}
                  className="flex-1 py-3 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm transition">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ RENAME WAREHOUSE MODAL ═════════════════════════════════════════ */}
      {editWh && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setEditWh(null); }}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-bold mb-4">Rename Warehouse</h2>
            <input type="text" value={editWhName} onChange={e => setEditWhName(e.target.value)} className={INP} autoFocus
              onKeyDown={e => e.key === "Enter" && handleRenameWh()}/>
            <div className="flex gap-3 mt-4">
              <button onClick={handleRenameWh}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75">
                Save
              </button>
              <button onClick={() => setEditWh(null)} className="flex-1 py-3 bg-gray-100 dark:bg-white/10 rounded-xl font-semibold text-sm text-gray-700 dark:text-gray-300 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ STORE IN WAREHOUSE MODAL (showroom → warehouse) ════════════════ */}
      {storeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setStoreModal(null); }}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Warehouse size={18} className="text-amber-600"/>
              </div>
              <div>
                <h2 className="font-bold text-sm">Store in Warehouse</h2>
                <p className="text-xs text-gray-400">{storeModal.name} · showroom: <strong>{storeModal.stock}</strong></p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Warehouse *</label>
                <select value={storeWh} onChange={e => setStoreWh(e.target.value)} className={INP}>
                  {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Quantity *</label>
                <input type="number" min="1" max={storeModal.stock} placeholder="0"
                  value={storeQty} onChange={e => setStoreQty(e.target.value)} className={INP} autoFocus/>
                <p className="text-xs text-gray-400 mt-1">Max: {storeModal.stock} (showroom stock)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Reason</label>
                <input type="text" placeholder="Optional" value={storeReason} onChange={e => setStoreReason(e.target.value)} className={INP}/>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleStoreInWarehouse}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-sm shadow-[0_4px_0_0_#b45309] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75">
                  Store
                </button>
                <button onClick={() => setStoreModal(null)} className="flex-1 py-3 bg-gray-100 dark:bg-white/10 rounded-xl font-semibold text-sm text-gray-700 dark:text-gray-300 transition">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ RECEIVE FROM SUPPLIER MODAL ════════════════════════════════════ */}
      {receiveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setReceiveModal(null); }}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Package size={18} className="text-emerald-600"/>
              </div>
              <div>
                <h2 className="font-bold text-sm">Receive from Supplier</h2>
                <p className="text-xs text-gray-400">→ {receiveModal.name}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Product *</label>
                <select value={receiveProduct} onChange={e => setReceiveProduct(e.target.value)} className={INP}>
                  <option value="">— select product —</option>
                  {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Quantity *</label>
                <input type="number" min="1" placeholder="0" value={receiveQty} onChange={e => setReceiveQty(e.target.value)} className={INP}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Note</label>
                <input type="text" placeholder="e.g. Invoice #123" value={receiveReason} onChange={e => setReceiveReason(e.target.value)} className={INP}/>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleReceiveSupplier}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75">
                  Receive
                </button>
                <button onClick={() => setReceiveModal(null)} className="flex-1 py-3 bg-gray-100 dark:bg-white/10 rounded-xl font-semibold text-sm text-gray-700 dark:text-gray-300 transition">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MOVE TO SHOWROOM MODAL ═════════════════════════════════════════ */}
      {toShowroomEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setToShowroomEntry(null); }}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ArrowRight size={18} className="text-green-600"/>
              </div>
              <div>
                <h2 className="font-bold text-sm">Move to Showroom</h2>
                <p className="text-xs text-gray-400">{toShowroomEntry.productId?.name} · in warehouse: <strong>{toShowroomEntry.quantity}</strong></p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Quantity *</label>
                <input type="number" min="1" max={toShowroomEntry.quantity} placeholder="0"
                  value={toShowroomQty} onChange={e => setToShowroomQty(e.target.value)} className={INP} autoFocus/>
                <p className="text-xs text-gray-400 mt-1">Max: {toShowroomEntry.quantity}</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleToShowroom}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75">
                  → Move to Showroom
                </button>
                <button onClick={() => setToShowroomEntry(null)} className="flex-1 py-3 bg-gray-100 dark:bg-white/10 rounded-xl font-semibold text-sm text-gray-700 dark:text-gray-300 transition">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ SHOWROOM ADJUST MODAL ══════════════════════════════════════════ */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) { setAdjustModal(null); setAdjustPwd(""); setAdjustPwdErr(""); } }}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-bold mb-1">{t.adjustStock}</h2>
            <p className="text-sm text-gray-500 mb-4">{adjustModal.name} — {t.current} <strong>{adjustModal.stock}</strong></p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t.typeLabel}</label>
                <select value={adjustForm.type} onChange={e => setAdjustForm(f => ({ ...f, type: e.target.value }))} className={INP}>
                  <option value="manual_add">{t.addStock}</option>
                  <option value="manual_remove">{t.removeStock}</option>
                  <option value="adjustment">{t.adjustment}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t.quantityLabel}</label>
                <input type="number" placeholder="10" value={adjustForm.change}
                  onChange={e => setAdjustForm(f => ({ ...f, change: e.target.value }))} className={INP}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t.reasonLabel}</label>
                <input type="text" placeholder="e.g. Received delivery…" value={adjustForm.reason}
                  onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} className={INP}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={adjustPwdShow ? "text" : "password"}
                    placeholder="Enter your password to confirm"
                    value={adjustPwd}
                    onChange={e => { setAdjustPwd(e.target.value); setAdjustPwdErr(""); }}
                    onKeyDown={e => e.key === "Enter" && handleAdjust()}
                    className={INP + (adjustPwdErr ? " border-red-400" : "")}
                  />
                  <button type="button" onClick={() => setAdjustPwdShow(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 select-none">
                    {adjustPwdShow ? "Hide" : "Show"}
                  </button>
                </div>
                {adjustPwdErr && <p className="text-xs text-red-500 mt-1">{adjustPwdErr}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleAdjust} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75">{t.apply}</button>
                <button onClick={() => { setAdjustModal(null); setAdjustPwd(""); setAdjustPwdErr(""); }} className="flex-1 py-3 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm transition">{t.cancel}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ SCAN RECEIPT MODAL ════════════════════════════════════════════ */}
      {showScan && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <ScanLine size={18} className="text-emerald-600"/>
                </div>
                <div>
                  <h2 className="font-bold text-sm">Scan Supplier Receipt</h2>
                  <p className="text-xs text-gray-400">AI extracts items — then choose a warehouse to receive into</p>
                </div>
              </div>
              <button onClick={() => { setShowScan(false); setScanItems([]); setScanMatches({}); setScanQtys({}); setScanWh(""); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Warehouse selector */}
              {warehouses.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Receive into warehouse *</label>
                  <select value={scanWh} onChange={e => setScanWh(e.target.value)} className={INP}>
                    <option value="">— select warehouse —</option>
                    {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                  </select>
                </div>
              )}
              {warehouses.length === 0 && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                  ⚠ Create a warehouse first before scanning receipts.
                </div>
              )}

              {/* Upload / Camera */}
              {scanItems.length === 0 && !scanLoading && (
                <div className="flex gap-3">
                  <button onClick={() => fileRef.current?.click()}
                    className="flex-1 h-28 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 text-gray-400 hover:text-blue-500 hover:border-blue-300 transition cursor-pointer">
                    <Upload size={24}/><span className="text-sm font-medium">Upload Photo</span>
                  </button>
                  <button onClick={() => camRef.current?.click()}
                    className="flex-1 h-28 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 text-gray-400 hover:text-emerald-500 hover:border-emerald-300 transition cursor-pointer">
                    <Camera size={24}/><span className="text-sm font-medium">Take Photo</span>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files[0]) submitReceiptImage(e.target.files[0]); e.target.value = ""; }}/>
                  <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files[0]) submitReceiptImage(e.target.files[0]); e.target.value = ""; }}/>
                </div>
              )}

              {scanLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                  <Loader2 size={32} className="animate-spin text-emerald-500"/>
                  <p className="text-sm">Scanning with AI…</p>
                </div>
              )}

              {scanItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{scanItems.length} item{scanItems.length !== 1 ? "s" : ""} extracted — match to products:</p>
                    <button onClick={() => { setScanItems([]); setScanMatches({}); setScanQtys({}); setScanNewProducts({}); }} className="text-xs text-gray-400 hover:text-gray-600 underline">Scan again</button>
                  </div>
                  {scanItems.map((item, i) => {
                    const isNew = !!scanNewProducts[i];
                    const isMatched = !!scanMatches[i];
                    return (
                      <div key={i} className={`rounded-2xl border p-4 space-y-2 ${isNew ? "border-amber-300 dark:border-amber-500/40 bg-amber-50/60 dark:bg-amber-900/10" : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#111]"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{item.name}</p>
                            <p className="text-xs text-gray-400">
                              {item.quantity != null && `Qty: ${item.quantity}`}
                              {item.unitCost != null && ` · $${item.unitCost}/unit`}
                            </p>
                          </div>
                          {isNew && <span className="shrink-0 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">✦ new product</span>}
                          {!isNew && isMatched && <span className="shrink-0 flex items-center gap-1 text-xs text-green-600 font-medium"><Check size={12}/> matched</span>}
                        </div>

                        {/* Quantity row — always shown */}
                        <div className={isNew ? "" : "grid grid-cols-2 gap-2"}>
                          {!isNew && (
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Product *</label>
                              <select value={scanMatches[i] || ""}
                                onChange={e => setScanMatches(p => ({ ...p, [i]: e.target.value }))}
                                className={INP + " bg-white dark:bg-[#1c1c1c]"}>
                                <option value="">— select —</option>
                                {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                              </select>
                            </div>
                          )}
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Qty *</label>
                            <input type="number" min="1" value={scanQtys[i] ?? ""}
                              onChange={e => setScanQtys(p => ({ ...p, [i]: e.target.value }))}
                              className={INP + " bg-white dark:bg-[#1c1c1c]"}/>
                          </div>
                        </div>

                        {/* New product form — full fields, compact scale */}
                        {isNew && (
                          <div className="space-y-2 pt-2 border-t border-amber-200 dark:border-amber-500/20 mt-2">
                            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">New product details</p>

                            {/* Name */}
                            <div>
                              <label className="text-[11px] text-gray-500 mb-0.5 block">Name *</label>
                              <input type="text" value={scanNewProducts[i]?.name ?? ""}
                                onChange={e => setScanNewProducts(p => ({ ...p, [i]: { ...p[i], name: e.target.value } }))}
                                className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c1c] outline-none focus:border-amber-400 transition"
                                placeholder="Product name"/>
                            </div>

                            {/* Barcode + Category */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[11px] text-gray-500 mb-0.5 block">Barcode</label>
                                <input type="text" value={scanNewProducts[i]?.barcode ?? ""}
                                  onChange={e => setScanNewProducts(p => ({ ...p, [i]: { ...p[i], barcode: e.target.value } }))}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c1c] outline-none focus:border-amber-400 transition"
                                  placeholder="Auto-generated if blank"/>
                              </div>
                              <div>
                                <label className="text-[11px] text-gray-500 mb-0.5 block">Category</label>
                                <select value={scanNewProducts[i]?.category ?? ""}
                                  onChange={e => setScanNewProducts(p => ({ ...p, [i]: { ...p[i], category: e.target.value } }))}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c1c] outline-none focus:border-amber-400 transition">
                                  <option value="">— none —</option>
                                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                              </div>
                            </div>

                            {/* Price + Cost */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[11px] text-gray-500 mb-0.5 block">Selling price *</label>
                                <input type="number" min="0" step="0.01"
                                  value={scanNewProducts[i]?.price ?? ""}
                                  onChange={e => setScanNewProducts(p => ({ ...p, [i]: { ...p[i], price: e.target.value } }))}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c1c] outline-none focus:border-amber-400 transition"
                                  placeholder="0.00"/>
                              </div>
                              <div>
                                <label className="text-[11px] text-gray-500 mb-0.5 block">Cost price</label>
                                <input type="number" min="0" step="0.01"
                                  value={scanNewProducts[i]?.cost ?? ""}
                                  onChange={e => setScanNewProducts(p => ({ ...p, [i]: { ...p[i], cost: e.target.value } }))}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c1c] outline-none focus:border-amber-400 transition"
                                  placeholder="0.00"/>
                              </div>
                            </div>

                            {/* Expiry Date + Alert Days */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[11px] text-gray-500 mb-0.5 block">Expiry date</label>
                                <input type="date"
                                  value={scanNewProducts[i]?.expiryDate ?? ""}
                                  onChange={e => setScanNewProducts(p => ({ ...p, [i]: { ...p[i], expiryDate: e.target.value } }))}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c1c] outline-none focus:border-amber-400 transition"/>
                              </div>
                              <div>
                                <label className="text-[11px] text-gray-500 mb-0.5 block">Alert before expiry (days)</label>
                                <input type="number" min="1"
                                  value={scanNewProducts[i]?.expiryAlertDays ?? "180"}
                                  onChange={e => setScanNewProducts(p => ({ ...p, [i]: { ...p[i], expiryAlertDays: e.target.value } }))}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c1c] outline-none focus:border-amber-400 transition"/>
                              </div>
                            </div>

                            {/* VAT Exempt + Online */}
                            <div className="flex items-center gap-5 pt-1">
                              <label className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300 cursor-pointer select-none">
                                <input type="checkbox"
                                  checked={scanNewProducts[i]?.vatExempt ?? false}
                                  onChange={e => setScanNewProducts(p => ({ ...p, [i]: { ...p[i], vatExempt: e.target.checked } }))}
                                  className="w-3.5 h-3.5 rounded accent-amber-500"/>
                                VAT Exempt
                              </label>
                              <label className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300 cursor-pointer select-none">
                                <input type="checkbox"
                                  checked={scanNewProducts[i]?.isAvailableOnline ?? true}
                                  onChange={e => setScanNewProducts(p => ({ ...p, [i]: { ...p[i], isAvailableOnline: e.target.checked } }))}
                                  className="w-3.5 h-3.5 rounded accent-amber-500"/>
                                Available Online
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Toggle button */}
                        {!isNew ? (
                          !isMatched && (
                            <button
                              onClick={() => setScanNewProducts(p => ({ ...p, [i]: { name: item.name, price: item.unitCost ? String(item.unitCost) : "", cost: item.unitCost ? String(item.unitCost) : "", barcode: "", category: "", expiryDate: "", expiryAlertDays: "180", vatExempt: false, isAvailableOnline: true } }))}
                              className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 mt-1">
                              <Plus size={11}/> Product not in system — create new
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => setScanNewProducts(p => { const next = { ...p }; delete next[i]; return next; })}
                            className="text-xs text-gray-400 hover:text-gray-600 hover:underline flex items-center gap-1 mt-1">
                            <X size={11}/> Cancel — match existing instead
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {scanItems.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 shrink-0">
                <button onClick={confirmReceipt} disabled={confirming || !scanWh}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 flex items-center justify-center gap-2">
                  {confirming ? <><Loader2 size={16} className="animate-spin"/> Adding…</> : <><Warehouse size={16}/> Add to {warehouses.find(w => w._id === scanWh)?.name || "Warehouse"}</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
