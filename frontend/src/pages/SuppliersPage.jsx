import React, { useEffect, useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { Truck, Plus, Trash2, RefreshCw, ShoppingBag, Package } from "lucide-react";
import { useSuppliersTranslation } from "../hooks/useSuppliersTranslation";
import { cacheByKey, getCachedByKey, getCachedProducts, queueMutation } from "../lib/offlineDB";

const CARD = "rounded-2xl bg-white dark:bg-[#141414] shadow-[6px_6px_16px_#d1d5db,-6px_-6px_16px_#ffffff] dark:shadow-[6px_6px_16px_#050505,-6px_-6px_16px_#1a1a1a]";

export default function SuppliersPage() {
  const t = useSuppliersTranslation();
  const [suppliers, setSuppliers] = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("suppliers");
  const [showSupForm,   setShowSupForm]   = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [supForm,   setSupForm]   = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [orderForm, setOrderForm] = useState({ supplierId: "", supplierName: "", notes: "", items: [] });
  const [orderItem, setOrderItem] = useState({ productId: "", quantity: 1, costPerUnit: "" });

  const load = async () => {
    setLoading(true);
    // Show cached data immediately
    const [cachedS, cachedO, cachedP] = await Promise.all([
      getCachedByKey("suppliers_list"),
      getCachedByKey("supplier_orders_list"),
      getCachedProducts(),
    ]);
    if (cachedS) setSuppliers(cachedS);
    if (cachedO) setOrders(cachedO);
    if (cachedP) setProducts(cachedP);

    try {
      const [s, o, p] = await Promise.all([api.get("/suppliers"), api.get("/suppliers/orders"), api.get("/products")]);
      setSuppliers(s.data); setOrders(o.data); setProducts(p.data);
      await Promise.all([
        cacheByKey("suppliers_list", s.data),
        cacheByKey("supplier_orders_list", o.data),
      ]);
    } catch {
      if (!cachedS) toast.error(t.failedToLoad);
      else toast("📦 Showing cached data", { icon: "💾" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!navigator.onLine) {
      await queueMutation("create_supplier", "/api/suppliers", "POST", supForm);
      const fake = { _id: "offline-" + Date.now(), ...supForm };
      const updated = [...suppliers, fake];
      setSuppliers(updated);
      await cacheByKey("suppliers_list", updated);
      toast.success("📴 Supplier saved — will sync when connected");
      setShowSupForm(false);
      setSupForm({ name: "", phone: "", email: "", address: "", notes: "" });
      return;
    }
    try { await api.post("/suppliers", supForm); toast.success(t.supplierAdded); setShowSupForm(false); setSupForm({ name: "", phone: "", email: "", address: "", notes: "" }); load(); }
    catch (err) { toast.error(err.response?.data?.message || t.failed); }
  };

  const handleDeleteSupplier = async (id) => {
    if (!confirm(t.deleteSupplierConfirm)) return;
    if (!navigator.onLine) {
      if (!id.startsWith("offline-")) {
        await queueMutation("delete_supplier", `/api/suppliers/${id}`, "DELETE");
      }
      const updated = suppliers.filter(s => s._id !== id);
      setSuppliers(updated);
      await cacheByKey("suppliers_list", updated);
      toast.success(t.deleted);
      return;
    }
    try { await api.delete(`/suppliers/${id}`); toast.success(t.deleted); load(); }
    catch { toast.error(t.failed); }
  };

  const addOrderItem = () => {
    if (!orderItem.productId || !orderItem.quantity || !orderItem.costPerUnit) return toast.error(t.fillAllItemFields);
    const product = products.find(p => p._id === orderItem.productId);
    setOrderForm(f => ({ ...f, items: [...f.items, { ...orderItem, productName: product?.name, quantity: +orderItem.quantity, costPerUnit: +orderItem.costPerUnit }] }));
    setOrderItem({ productId: "", quantity: 1, costPerUnit: "" });
  };

  const removeOrderItem = (i) => setOrderForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!orderForm.items.length) return toast.error(t.addAtLeastOneItem);
    if (!navigator.onLine) {
      await queueMutation("create_purchase_order", "/api/suppliers/orders", "POST", orderForm);
      const fake = { _id: "offline-" + Date.now(), ...orderForm, totalCost: orderForm.items.reduce((s, i) => s + i.quantity * i.costPerUnit, 0), receivedAt: new Date().toISOString(), username: "offline" };
      const updated = [fake, ...orders];
      setOrders(updated);
      await cacheByKey("supplier_orders_list", updated);
      toast.success("📴 Purchase order saved — will sync when connected");
      setShowOrderForm(false);
      setOrderForm({ supplierId: "", supplierName: "", notes: "", items: [] });
      return;
    }
    try {
      await api.post("/suppliers/orders", orderForm);
      toast.success(t.purchaseOrderCreated);
      setShowOrderForm(false);
      setOrderForm({ supplierId: "", supplierName: "", notes: "", items: [] });
      load();
    } catch (err) { toast.error(err.response?.data?.message || t.failed); }
  };

  const handleDeleteOrder = async (id) => {
    if (!confirm(t.deleteOrderConfirm)) return;
    if (!navigator.onLine) {
      if (!id.toString().startsWith("offline-")) {
        await queueMutation("delete_purchase_order", `/api/suppliers/orders/${id}`, "DELETE");
      }
      const updated = orders.filter(o => o._id !== id);
      setOrders(updated);
      await cacheByKey("supplier_orders_list", updated);
      toast.success(t.deleted);
      return;
    }
    try { await api.delete(`/suppliers/orders/${id}`); toast.success(t.deleted); load(); }
    catch { toast.error(t.failed); }
  };

  const orderTotal = orderForm.items.reduce((s, i) => s + i.quantity * i.costPerUnit, 0);

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-neutral-950 p-5">
      <div className="w-full space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center"><Truck size={20} className="text-white"/></div>
            <div><h1 className="text-xl font-bold">{t.title}</h1><p className="text-xs text-gray-500">{t.subtitle}</p></div>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 hover:bg-gray-50 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"><RefreshCw size={13}/></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/10 w-fit">
          {[["suppliers", t.tabSuppliers], ["orders", t.tabOrders]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium select-none ${tab === key ? "bg-indigo-600 text-white shadow-[0_4px_0_0_#3730a3] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* SUPPLIERS TAB */}
        {tab === "suppliers" && (
          <div className="space-y-4">
            <button onClick={() => setShowSupForm(!showSupForm)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_0_0_#3730a3] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"><Plus size={14}/> {t.addSupplier}</button>

            {showSupForm && (
              <form onSubmit={handleCreateSupplier} className={`${CARD} p-5 space-y-3`}>
                <h3 className="font-semibold">{t.newSupplier}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[{ label: t.colName + " *", key: "name", req: true }, { label: t.colPhone, key: "phone" }, { label: t.colEmail, key: "email" }, { label: t.colAddress, key: "address" }, { label: t.colNotes, key: "notes" }].map(f => (
                    <div key={f.key} className={f.key === "address" || f.key === "notes" ? "col-span-2 md:col-span-1" : ""}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                      <input required={!!f.req} placeholder={f.label} value={supForm[f.key]} onChange={e => setSupForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none focus:ring-2 focus:ring-indigo-400"/>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm shadow-[0_4px_0_0_#3730a3] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">{t.save}</button>
                  <button type="button" onClick={() => setShowSupForm(false)} className="px-6 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">{t.cancel}</button>
                </div>
              </form>
            )}

            <div className={`${CARD} overflow-hidden`}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-[#1a1a1a] text-gray-500">
                  <tr>{[t.colName, t.colPhone, t.colEmail, t.colAddress, t.colNotes, ""].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-xs">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {suppliers.map(s => (
                    <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{s.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{s.phone || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{s.email || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{s.address || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">{s.notes || "—"}</td>
                      <td className="px-4 py-3"><button onClick={() => handleDeleteSupplier(s._id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"><Trash2 size={14}/></button></td>
                    </tr>
                  ))}
                  {suppliers.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{t.noSuppliersYet}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PURCHASE ORDERS TAB */}
        {tab === "orders" && (
          <div className="space-y-4">
            <button onClick={() => setShowOrderForm(!showOrderForm)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_0_0_#3730a3] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"><Plus size={14}/> {t.newPurchaseOrder}</button>

            {showOrderForm && (
              <div className={`${CARD} p-5 space-y-4`}>
                <h3 className="font-semibold">{t.newPurchaseOrder}</h3>
                <p className="text-xs text-gray-500">{t.stockAutoAdded}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.supplierLabel}</label>
                    <select value={orderForm.supplierId} onChange={e => { const s = suppliers.find(x => x._id === e.target.value); setOrderForm(f => ({ ...f, supplierId: e.target.value, supplierName: s?.name || "" })); }} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none">
                      <option value="">{t.noSupplierManual}</option>
                      {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.notesLabel}</label>
                    <input placeholder="Optional notes" value={orderForm.notes} onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none"/>
                  </div>
                </div>

                {/* Add item */}
                <div className="border dark:border-white/10 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.addItem}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t.productLabel}</label>
                      <select value={orderItem.productId} onChange={e => setOrderItem(f => ({ ...f, productId: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none">
                        <option value="">{t.selectProduct}</option>
                        {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t.quantityLabel}</label>
                      <input type="number" min="1" value={orderItem.quantity} onChange={e => setOrderItem(f => ({ ...f, quantity: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t.costPerUnit}</label>
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={orderItem.costPerUnit} onChange={e => setOrderItem(f => ({ ...f, costPerUnit: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-[#1a1a1a] dark:border-white/10 outline-none"/>
                    </div>
                  </div>
                  <button type="button" onClick={addOrderItem} className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-200 transition"><Plus size={13}/> {t.addItem}</button>
                </div>

                {/* Items list */}
                {orderForm.items.length > 0 && (
                  <div className="space-y-2">
                    {orderForm.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-xl text-sm">
                        <span className="font-medium">{item.productName}</span>
                        <span className="text-gray-500">{item.quantity} × ${item.costPerUnit}</span>
                        <span className="font-bold text-indigo-600">${(item.quantity * item.costPerUnit).toFixed(2)}</span>
                        <button onClick={() => removeOrderItem(i)} className="text-red-400 hover:text-red-600"><Trash2 size={13}/></button>
                      </div>
                    ))}
                    <div className="flex justify-end px-4 py-2 font-bold text-lg text-indigo-600">{t.totalLabel} ${orderTotal.toFixed(2)}</div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={handleCreateOrder} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm shadow-[0_4px_0_0_#3730a3] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">{t.saveUpdateStock}</button>
                  <button onClick={() => { setShowOrderForm(false); setOrderForm({ supplierId: "", supplierName: "", notes: "", items: [] }); }} className="px-6 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">{t.cancel}</button>
                </div>
              </div>
            )}

            <div className={`${CARD} overflow-hidden`}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-[#1a1a1a] text-gray-500">
                  <tr>{[t.tabSuppliers, t.colItems, t.colTotalCost, t.colReceived, t.colBy, t.colNotes, ""].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-xs">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {orders.map(o => (
                    <tr key={o._id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{o.supplierName || t.manual}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{o.items?.length} {t.itemsCount}</td>
                      <td className="px-4 py-3 font-bold text-indigo-600">${o.totalCost?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(o.receivedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{o.username}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">{o.notes || "—"}</td>
                      <td className="px-4 py-3"><button onClick={() => handleDeleteOrder(o._id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"><Trash2 size={14}/></button></td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{t.noPurchaseOrders}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
