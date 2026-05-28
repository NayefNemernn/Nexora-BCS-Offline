import React, { useState, useEffect } from "react";
import {
  Sparkles, TrendingUp, ShoppingCart, AlertTriangle, CheckCircle,
  Clock, Package, DollarSign, Zap, RefreshCw, X, ChevronDown,
  ChevronUp, Save, Trash2, Edit3, Check, ArrowRight, Loader,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getOfferSuggestions, getReorderSuggestions,
  getPurchaseOrders, savePurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
} from "../api/aiInsights.api.js";
import { getSuppliers } from "../api/supplier.api.js";

const URGENCY = {
  high:   { label: "High",   cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
  medium: { label: "Medium", cls: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
  low:    { label: "Low",    cls: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" },
};
const PRIORITY = {
  urgent: { label: "Urgent", cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
  normal: { label: "Normal", cls: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  low:    { label: "Low",    cls: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
};
const PO_STATUS = {
  pending:   { label: "Pending",   cls: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
  approved:  { label: "Approved",  cls: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  ordered:   { label: "Ordered",   cls: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
  received:  { label: "Received",  cls: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" },
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
};

const inputCls = "w-full px-3 py-2 rounded-xl text-sm border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f0f0f] outline-none focus:border-violet-400 dark:focus:border-violet-500/60 transition";
const cardCls  = "rounded-2xl bg-white dark:bg-[#141414] border border-gray-100 dark:border-white/5 shadow-sm";

export default function AIInsights() {
  const [tab, setTab] = useState("offers");

  // ── Offer suggestions ──
  const [offerResult,   setOfferResult]   = useState(null);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [appliedOffers, setAppliedOffers] = useState(new Set());

  // ── Reorder suggestions ──
  const [reorderResult,   setReorderResult]   = useState(null);
  const [loadingReorder,  setLoadingReorder]  = useState(false);
  const [editedQtys,      setEditedQtys]      = useState({});
  const [editedSuppliers, setEditedSuppliers] = useState({});
  const [savingPO,        setSavingPO]        = useState(false);
  const [suppliers,       setSuppliers]       = useState([]);

  // ── Purchase orders ──
  const [purchaseOrders,  setPurchaseOrders]  = useState([]);
  const [loadingPOs,      setLoadingPOs]      = useState(false);
  const [expandedPO,      setExpandedPO]      = useState(null);

  useEffect(() => {
    getSuppliers().then(setSuppliers).catch(() => {});
    if (tab === "orders") loadPOs();
  }, [tab]);

  const loadPOs = async () => {
    setLoadingPOs(true);
    try { setPurchaseOrders(await getPurchaseOrders()); }
    catch { toast.error("Failed to load purchase orders"); }
    finally { setLoadingPOs(false); }
  };

  // ── Generate offer suggestions ──────────────────────────────────────────
  const generateOffers = async () => {
    setLoadingOffers(true);
    setOfferResult(null);
    try {
      const data = await getOfferSuggestions();
      setOfferResult(data);
      if (data.suggestions?.length === 0) toast(data.message || "No issues found", { icon: "✅" });
    } catch (err) {
      toast.error(err.response?.data?.message || "AI request failed");
    } finally { setLoadingOffers(false); }
  };

  // ── Generate reorder suggestions ────────────────────────────────────────
  const generateReorder = async () => {
    setLoadingReorder(true);
    setReorderResult(null);
    setEditedQtys({});
    setEditedSuppliers({});
    try {
      const data = await getReorderSuggestions();
      setReorderResult(data);
      if (data.items?.length === 0) toast(data.message || "All stock is sufficient", { icon: "✅" });
    } catch (err) {
      toast.error(err.response?.data?.message || "AI request failed");
    } finally { setLoadingReorder(false); }
  };

  // ── Save purchase order ──────────────────────────────────────────────────
  const handleSavePO = async () => {
    if (!reorderResult?.items?.length) return;
    setSavingPO(true);
    try {
      const items = reorderResult.items.map(i => ({
        ...i,
        approvedQty:  editedQtys[i.productId]      ?? i.suggestedQty,
        supplierId:   editedSuppliers[i.productId]  ?? "",
        supplierName: suppliers.find(s => s._id === editedSuppliers[i.productId])?.name ?? "",
      }));
      await savePurchaseOrder({ items, generatedByAI: true });
      toast.success("Purchase order saved");
      setReorderResult(null);
      setTab("orders");
      loadPOs();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save order");
    } finally { setSavingPO(false); }
  };

  // ── Update PO status ────────────────────────────────────────────────────
  const handlePOStatus = async (id, status) => {
    try {
      await updatePurchaseOrder(id, { status });
      setPurchaseOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o));
      toast.success(`Order marked as ${status}`);
    } catch { toast.error("Failed to update order"); }
  };

  const handleDeletePO = async (id) => {
    if (!window.confirm("Delete this purchase order?")) return;
    try {
      await deletePurchaseOrder(id);
      setPurchaseOrders(prev => prev.filter(o => o._id !== id));
      toast.success("Deleted");
    } catch { toast.error("Failed to delete"); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-neutral-950">
      <div className="p-5 space-y-5 w-full">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Sparkles size={20} className="text-violet-600 dark:text-violet-400"/>
            </div>
            <div>
              <h1 className="text-xl font-bold dark:text-white">AI Business Insights</h1>
              <p className="text-xs text-gray-400 mt-0.5">Powered by Gemini — analyzes your sales data to surface actionable recommendations</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-2xl bg-white dark:bg-[#141414] border border-gray-100 dark:border-white/5 shadow-sm w-fit">
            {[
              { id: "offers",  label: "Offer Ideas",    icon: Zap          },
              { id: "reorder", label: "Reorder AI",     icon: ShoppingCart },
              { id: "orders",  label: "Purchase Orders",icon: Package      },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium select-none ${
                  tab === id
                    ? "bg-violet-600 text-white shadow-[0_4px_0_0_#5b21b6] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                }`}
              >
                <Icon size={15}/>{label}
              </button>
            ))}
          </div>

          {/* ── OFFER SUGGESTIONS TAB ──────────────────────────────────────── */}
          {tab === "offers" && (
            <div className="space-y-4">
              <div className={`${cardCls} p-5`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-sm flex items-center gap-2">
                      <Zap size={15} className="text-violet-500"/> AI Offer Suggestions
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      AI analyzes each product's expiry dates, batch quantities, and sales velocity to identify products at risk and suggest targeted promotions.
                    </p>
                  </div>
                  <button
                    onClick={generateOffers}
                    disabled={loadingOffers}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white shadow-[0_4px_0_0_#5b21b6] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none shrink-0"
                  >
                    {loadingOffers
                      ? <><Loader size={14} className="animate-spin"/> Analyzing…</>
                      : <><Sparkles size={14}/> Generate Ideas</>}
                  </button>
                </div>
              </div>

              {loadingOffers && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                  <div className="w-10 h-10 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin"/>
                  <p className="text-sm">AI is analyzing your products, batches, and sales history…</p>
                </div>
              )}

              {offerResult?.suggestions?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{offerResult.suggestions.length} suggestions</p>
                  {offerResult.suggestions.map((s, i) => (
                    <div key={i} className={`${cardCls} p-4`}>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                          <Sparkles size={16} className="text-violet-500"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm dark:text-white">{s.offerTitle}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY[s.urgency]?.cls || URGENCY.low.cls}`}>
                              {URGENCY[s.urgency]?.label || s.urgency} urgency
                            </span>
                            {appliedOffers.has(i) && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                                <Check size={10}/> Applied
                              </span>
                            )}
                          </div>

                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-0.5">{s.productName}</p>

                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Package size={11}/> Stock: {s.currentStock}</span>
                            <span className="flex items-center gap-1"><TrendingUp size={11}/> {s.dailySales > 0 ? `${s.dailySales.toFixed(2)}/day` : "Not selling"}</span>
                            <span className="flex items-center gap-1"><DollarSign size={11}/> Price: ${s.price}</span>
                            <span className="flex items-center gap-1"><Clock size={11}/> {s.suggestedDuration}</span>
                          </div>

                          <div className="mt-2 p-3 rounded-xl bg-gray-50 dark:bg-[#1c1c1c]">
                            <div className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0 mt-0.5">
                                <Zap size={12} className="text-violet-500"/>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                  Suggested: {s.offerType === "discount_percent" ? `${s.offerValue}% off`
                                    : s.offerType === "discount_fixed" ? `$${s.offerValue} off`
                                    : s.offerType === "buy_x_get_y" ? `Buy ${s.offerValue} Get 1`
                                    : s.offerType}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">{s.reasoning}</p>
                                {s.expectedImpact && <p className="text-xs text-violet-500 mt-0.5 font-medium">{s.expectedImpact}</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── REORDER SUGGESTIONS TAB ────────────────────────────────────── */}
          {tab === "reorder" && (
            <div className="space-y-4">
              <div className={`${cardCls} p-5`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-sm flex items-center gap-2">
                      <ShoppingCart size={15} className="text-violet-500"/> AI Reorder Suggestions
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      AI calculates average daily sales and stock levels to identify which products need restocking and how much to order to maintain a 30-day supply.
                    </p>
                  </div>
                  <button
                    onClick={generateReorder}
                    disabled={loadingReorder}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white shadow-[0_4px_0_0_#5b21b6] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none shrink-0"
                  >
                    {loadingReorder
                      ? <><Loader size={14} className="animate-spin"/> Analyzing…</>
                      : <><Sparkles size={14}/> Generate Order</>}
                  </button>
                </div>
              </div>

              {loadingReorder && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                  <div className="w-10 h-10 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin"/>
                  <p className="text-sm">AI is analyzing your sales velocity and stock levels…</p>
                </div>
              )}

              {reorderResult?.items?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{reorderResult.items.length} products to reorder</p>
                    <button
                      onClick={handleSavePO}
                      disabled={savingPO}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"
                    >
                      {savingPO ? <><Loader size={14} className="animate-spin"/> Saving…</> : <><Save size={14}/> Save as Purchase Order</>}
                    </button>
                  </div>

                  <div className={`${cardCls} overflow-hidden`}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-white/5">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Product</th>
                          <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Stock</th>
                          <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Days Left</th>
                          <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Daily Sales</th>
                          <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Order Qty</th>
                          <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Est. Cost</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Supplier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                        {reorderResult.items.map((item, i) => {
                          const qty  = editedQtys[item.productId] ?? item.suggestedQty;
                          const cost = qty * (item.lastCost || 0);
                          return (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${item.priority === "urgent" ? "bg-red-500" : item.priority === "normal" ? "bg-blue-500" : "bg-gray-300"}`}/>
                                  <div>
                                    <p className="font-medium text-gray-800 dark:text-gray-100 text-xs">{item.productName}</p>
                                    <p className="text-xs text-gray-400">{item.reasoning?.slice(0, 60)}…</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className={`text-xs font-bold ${item.currentStock <= 5 ? "text-red-500" : "text-gray-600 dark:text-gray-300"}`}>{item.currentStock}</span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className={`text-xs font-medium ${item.daysOfStockLeft < 7 ? "text-red-500" : item.daysOfStockLeft < 14 ? "text-amber-500" : "text-gray-500"}`}>
                                  {item.daysOfStockLeft?.toFixed(0) ?? "—"}d
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center text-xs text-gray-500">{item.avgDailySales?.toFixed(2)}</td>
                              <td className="px-3 py-3 text-center">
                                <input
                                  type="number" min="0"
                                  value={qty}
                                  onChange={e => setEditedQtys(p => ({ ...p, [item.productId]: Number(e.target.value) }))}
                                  className="w-16 text-center px-2 py-1 rounded-lg text-xs border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f0f0f] outline-none focus:border-violet-400 transition"
                                />
                              </td>
                              <td className="px-3 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300">
                                {item.lastCost > 0 ? `$${cost.toFixed(2)}` : "—"}
                              </td>
                              <td className="px-3 py-3">
                                <select
                                  value={editedSuppliers[item.productId] || ""}
                                  onChange={e => setEditedSuppliers(p => ({ ...p, [item.productId]: e.target.value }))}
                                  className="w-full px-2 py-1 rounded-lg text-xs border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f0f0f] outline-none focus:border-violet-400 transition"
                                >
                                  <option value="">No supplier</option>
                                  {(reorderResult.supplierOptions || suppliers).map(s => (
                                    <option key={s._id} value={s._id}>{s.name}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#1c1c1c]">
                          <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-gray-500">Total Estimated Cost</td>
                          <td className="px-3 py-3 text-center text-sm font-bold text-gray-800 dark:text-white">
                            ${reorderResult.items.reduce((s, i) => {
                              const qty = editedQtys[i.productId] ?? i.suggestedQty;
                              return s + qty * (i.lastCost || 0);
                            }, 0).toFixed(2)}
                          </td>
                          <td/>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PURCHASE ORDERS TAB ────────────────────────────────────────── */}
          {tab === "orders" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Purchase Orders</p>
                <button onClick={loadPOs} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                  <RefreshCw size={12}/> Refresh
                </button>
              </div>

              {loadingPOs ? (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
                  <Loader size={16} className="animate-spin"/> Loading…
                </div>
              ) : purchaseOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                  <Package size={32} className="opacity-20"/>
                  <p className="text-sm">No purchase orders yet</p>
                  <p className="text-xs text-gray-300 dark:text-gray-600">Use the Reorder AI tab to generate your first order</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {purchaseOrders.map(po => (
                    <div key={po._id} className={`${cardCls} overflow-hidden`}>
                      {/* PO header */}
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition"
                        onClick={() => setExpandedPO(expandedPO === po._id ? null : po._id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm dark:text-white">{po.orderNumber}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PO_STATUS[po.status]?.cls || ""}`}>
                              {PO_STATUS[po.status]?.label || po.status}
                            </span>
                            {po.generatedByAI && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 flex items-center gap-1">
                                <Sparkles size={9}/> AI
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                            <span>{po.items?.length} products</span>
                            {po.totalEstimatedCost > 0 && <span>Est. ${po.totalEstimatedCost.toFixed(2)}</span>}
                            <span>{new Date(po.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Status actions */}
                          {po.status === "pending" && (
                            <button
                              onClick={e => { e.stopPropagation(); handlePOStatus(po._id, "approved"); }}
                              className="text-xs px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"
                            >Approve</button>
                          )}
                          {po.status === "approved" && (
                            <button
                              onClick={e => { e.stopPropagation(); handlePOStatus(po._id, "ordered"); }}
                              className="text-xs px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-[0_4px_0_0_#5b21b6] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"
                            >Mark Ordered</button>
                          )}
                          {po.status === "ordered" && (
                            <button
                              onClick={e => { e.stopPropagation(); handlePOStatus(po._id, "received"); }}
                              className="text-xs px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"
                            >Mark Received</button>
                          )}
                          {!["received", "cancelled"].includes(po.status) && (
                            <button
                              onClick={e => { e.stopPropagation(); handlePOStatus(po._id, "cancelled"); }}
                              className="text-xs px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#252525] hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"
                            >Cancel</button>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); handleDeletePO(po._id); }}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                          ><Trash2 size={13}/></button>
                          {expandedPO === po._id ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
                        </div>
                      </div>

                      {/* PO items */}
                      {expandedPO === po._id && (
                        <div className="border-t border-gray-100 dark:border-white/5">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-[#1c1c1c]">
                                <th className="text-left px-4 py-2.5 font-semibold text-gray-400 uppercase tracking-wide">Product</th>
                                <th className="text-center px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide">Stock</th>
                                <th className="text-center px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide">Qty</th>
                                <th className="text-center px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide">Last Cost</th>
                                <th className="text-center px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide">Est. Total</th>
                                <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide">Supplier</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                              {po.items?.map((item, j) => (
                                <tr key={j} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                                  <td className="px-4 py-3">
                                    <div>
                                      <p className="font-medium text-gray-800 dark:text-gray-100">{item.productName}</p>
                                      {item.aiReasoning && <p className="text-gray-400 mt-0.5">{item.aiReasoning?.slice(0, 70)}…</p>}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-300">{item.currentStock}</td>
                                  <td className="px-3 py-3 text-center font-bold text-gray-800 dark:text-white">{item.approvedQty ?? item.suggestedQty}</td>
                                  <td className="px-3 py-3 text-center text-gray-500">{item.lastCost > 0 ? `$${item.lastCost.toFixed(2)}` : "—"}</td>
                                  <td className="px-3 py-3 text-center font-medium text-gray-600 dark:text-gray-300">
                                    {item.estimatedCost > 0 ? `$${item.estimatedCost.toFixed(2)}` : "—"}
                                  </td>
                                  <td className="px-3 py-3 text-gray-500">{item.supplierName || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {po.notes && (
                            <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5 text-xs text-gray-400">
                              Notes: {po.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

      </div>
    </div>
  );
}
