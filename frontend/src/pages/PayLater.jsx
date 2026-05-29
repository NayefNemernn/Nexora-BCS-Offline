import { useEffect, useState } from "react";
import { printHtml } from "../lib/printHtml";
import api from "../api/axios";
import { cachePayLater, getCachedPayLater } from "../lib/offlineDB";
import { useRefresh } from "../context/RefreshContext";
import { useLang } from "../context/LanguageContext";
import { usePayLaterTranslation } from "../hooks/usePayLaterTranslation";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";
import ReceivePaymentModal from "../components/ReceivePaymentModal";
import RecentPayments from "../components/RecentPayments";
import Avatar from "../components/Avatar";
import EditCustomerModal from "../components/EditCustomerModal";
import CustomerPaymentsDrawer from "../components/CustomerPaymentsDrawer";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  CreditCard, Search, DollarSign, Users, TrendingDown,
  Pencil, History, AlertCircle, ShoppingBag, Package, X, Printer
} from "lucide-react";

const CARD = "rounded-2xl bg-white dark:bg-[#141414] shadow-[6px_6px_16px_#d1d5db,-6px_-6px_16px_#ffffff] dark:shadow-[6px_6px_16px_#050505,-6px_-6px_16px_#1a1a1a]";

/* ── Items modal ── */
function ItemsModal({ sale, close }) {
  const { formatUSD, formatLBP, toLBP, exchangeRate } = useCurrency();
  const { storeName } = useAuth();

  const printItems = () => {
    const rows = sale.items.map(i => `
      <tr>
        <td>${i.name}</td>
        <td style="text-align:center">${i.quantity}</td>
        <td style="text-align:right">$${(i.price * i.quantity).toFixed(2)}</td>
      </tr>
      <tr class="sub"><td colspan="3">$${i.price.toFixed(2)} each · ${parseInt(toLBP(i.price)).toLocaleString()} ل.ل</td></tr>
    `).join("");
    printHtml(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Items — ${sale.customerName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:13px;color:#111;width:80mm;padding:6mm 3mm}
  h1{font-size:17px;font-weight:900;text-align:center;letter-spacing:1px}
  p{text-align:center;font-size:10px;color:#666;margin:2px 0}
  hr{border:none;border-top:1px dashed #aaa;margin:7px 0}
  table{width:100%;border-collapse:collapse}
  thead th{font-size:10px;text-transform:uppercase;color:#999;padding-bottom:4px}
  thead th:nth-child(2){text-align:center}
  thead th:last-child{text-align:right}
  td{padding:3px 0;vertical-align:top}
  .sub td{font-size:10px;color:#999;padding-bottom:5px}
  .total-row td{font-weight:800;font-size:14px;padding-top:6px;border-top:1px dashed #aaa}
  .lbp{font-size:10px;color:#b45309}
  .footer{text-align:center;font-size:10px;color:#999;margin-top:10px}
  @media print{@page{size:80mm auto;margin:0}body{padding:3mm 2mm}}
</style></head><body>
  <h1>${storeName.toUpperCase()}</h1>
  <p>Items for: <strong>${sale.customerName}</strong></p>
  ${sale.phone ? `<p>Phone: ${sale.phone}</p>` : ""}
  <p>${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</p>
  <hr/>
  <table>
    <thead><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Price</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <hr/>
  <table><tbody>
    <tr class="total-row"><td>TOTAL DEBT</td><td></td><td style="text-align:right">$${sale.balance.toFixed(2)}</td></tr>
    <tr><td colspan="3" class="lbp" style="padding-top:3px">${parseInt(toLBP(sale.balance)).toLocaleString()} ل.ل · @ ${parseInt(exchangeRate).toLocaleString()} ل.ل/$1</td></tr>
  </tbody></table>
  <p class="footer">Pay Later Account</p>
  <script>window.onload=()=>{window.print();window.close();}<\/script>
</body></html>`);
  };

  const grandTotal = sale.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-[#141414] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ShoppingBag size={16} className="text-blue-600 dark:text-blue-400"/>
            </div>
            <div>
              <h2 className="font-bold text-base">{sale.customerName}</h2>
              <p className="text-xs text-gray-400">{sale.items.length} item type{sale.items.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#1c1c1c] flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#252525] transition">
            <X size={15}/>
          </button>
        </div>

        {/* Items list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
          {sale.items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package size={36} className="mx-auto mb-3 opacity-30"/>
              <p className="text-sm">No items recorded</p>
            </div>
          ) : (
            sale.items.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#1c1c1c] border border-gray-100 dark:border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                    <Package size={14} className="text-blue-500"/>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatUSD(item.price)} each · {formatLBP(toLBP(item.price))}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatUSD(item.price * item.quantity)}</p>
                  <p className="text-xs text-gray-400">× {item.quantity}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Footer totals */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 space-y-3">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Items total</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{formatUSD(grandTotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Already paid</span>
            <span className="font-semibold text-green-600">{formatUSD(sale.paid)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200 dark:border-white/10">
            <span className="font-bold">Outstanding balance</span>
            <div className="text-right">
              <p className="font-black text-base text-orange-500">{formatUSD(sale.balance)}</p>
              <p className="text-xs text-amber-500">{formatLBP(toLBP(sale.balance))}</p>
            </div>
          </div>

          <button
            onClick={printItems}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"
          >
            <Printer size={15}/> Print Items List
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function PayLater() {
  const t    = usePayLaterTranslation();
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { tick } = useRefresh();

  const [sales,           setSales]           = useState([]);
  const [search,          setSearch]          = useState("");
  const [selected,        setSelected]        = useState(null);
  const [editCustomer,    setEditCustomer]    = useState(null);
  const [drawerCustomer,  setDrawerCustomer]  = useState(null);
  const [editingLimit,    setEditingLimit]    = useState(null);
  const [newLimit,        setNewLimit]        = useState("");
  const [monthlyPayCount, setMonthlyPayCount] = useState(0);
  const [viewingItems,    setViewingItems]    = useState(null);
  const [recentKey,       setRecentKey]       = useState(0);

  useEffect(() => { load(); }, [tick]);

  const load = async () => {
    // Load cached data immediately so the page works offline
    const cached = await getCachedPayLater();
    if (cached) setSales(cached);

    try {
      const [salesRes, monthRes] = await Promise.all([
        api.get("/hold-sales"),
        api.get("/hold-sales/payments/month"),
      ]);
      setSales(salesRes.data);
      setMonthlyPayCount(monthRes.data.length);
      setRecentKey(k => k + 1);
      await cachePayLater(salesRes.data); // update cache after fresh fetch
    } catch {
      if (!cached) toast.error("Failed to load pay-later accounts");
      else toast("📋 Showing cached accounts", { icon: "💾" });
    }
  };

  const filtered = sales.filter(s =>
    s.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const totalOutstanding = filtered.reduce((s, x) => s + x.balance, 0);

  const updateLimit = async (id) => {
    await api.patch(`/hold-sales/${id}/limit`, { creditLimit: Number(newLimit) });
    setEditingLimit(null);
    load();
  };

  const riskLevel = (s) => {
    const pct = s.total > 0 ? s.balance / s.total : 0;
    if (pct >= 0.9) return { color: "text-red-500",    bg: "bg-red-50 dark:bg-red-900/20",       label: "High" };
    if (pct >= 0.5) return { color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20", label: "Mid"  };
    return               { color: "text-green-500",   bg: "bg-green-50 dark:bg-green-900/20",   label: "Low"  };
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="h-full overflow-y-auto bg-gray-50 dark:bg-neutral-950">
      <div className="p-5 space-y-5">

        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard size={22} className="text-blue-500"/> {t.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t.subtitle}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { title: t.accountsDebt,     value: filtered.length,                   icon: <Users size={18}/>,       color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-900/20"    },
            { title: t.totalOutstanding, value: `$${totalOutstanding.toFixed(2)}`, icon: <TrendingDown size={18}/>, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" },
            { title: t.paymentsMonth,    value: monthlyPayCount,                   icon: <DollarSign size={18}/>,  color: "text-green-600 dark:text-green-400",   bg: "bg-green-50 dark:bg-green-900/20"   },
          ].map(({ title, value, icon, color, bg }) => (
            <motion.div key={title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className={`${CARD} ${bg} p-5`}>
              <div className={`${color} mb-2`}>{icon}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-5">

          {/* LEFT: Accounts */}
          <div className="col-span-12 lg:col-span-8 space-y-4">

            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute top-1/2 -translate-y-1/2 start-4 text-gray-400"/>
              <input
                placeholder={t.searchCustomers}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full ps-10 pe-4 py-3 rounded-xl text-sm
                  bg-white dark:bg-[#141414]
                  border border-gray-200 dark:border-white/10
                  focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Account cards */}
            {filtered.length === 0 ? (
              <div className={`${CARD} p-14 text-center text-gray-400`}>
                <CreditCard size={36} className="opacity-20 mx-auto mb-3"/>
                <p className="text-sm font-medium">{t.noAccounts}</p>
                <p className="text-xs mt-1 opacity-60">{t.subtitle}</p>
              </div>
            ) : (
              <AnimatePresence>
                {filtered.map((s, i) => {
                  const limit     = s.creditLimit || 500;
                  const available = limit - s.balance;
                  const paidPct   = s.total > 0 ? Math.round((s.paid / s.total) * 100) : 0;
                  const risk      = riskLevel(s);

                  return (
                    <motion.div key={s._id}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`${CARD} p-5`}
                    >
                      <div className="flex items-start gap-4">

                        {/* Avatar */}
                        <button onClick={() => setEditCustomer(s)} className="shrink-0">
                          <Avatar name={s.customerName}/>
                        </button>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => setDrawerCustomer(s)}
                              className="font-bold text-base hover:text-blue-600 dark:hover:text-blue-400 transition">
                              {s.customerName}
                            </button>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${risk.bg} ${risk.color}`}>
                              {risk.label}
                            </span>
                          </div>
                          {s.phone && <p className="text-xs text-gray-400 mt-0.5">{s.phone}</p>}

                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>{t.paid}: ${s.paid?.toFixed(2)}</span>
                              <span>{paidPct}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-[#252525] rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${paidPct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.04 }}
                                className={`h-full rounded-full ${
                                  paidPct >= 75 ? "bg-green-500" :
                                  paidPct >= 40 ? "bg-amber-500" : "bg-red-500"
                                }`}
                              />
                            </div>
                          </div>

                          {/* Stats row */}
                          <div className="mt-3 flex flex-wrap gap-4 text-xs">
                            <div>
                              <span className="text-gray-400">{t.debt}: </span>
                              <span className="font-bold text-orange-500">${s.balance.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">{t.creditLimit}: </span>
                              {editingLimit === s._id ? (
                                <span className="inline-flex items-center gap-1">
                                  <input type="number" value={newLimit}
                                    onChange={e => setNewLimit(e.target.value)}
                                    className="border border-gray-300 dark:border-white/20 rounded px-1.5 py-0.5 w-20 bg-transparent outline-none text-xs"
                                    autoFocus
                                  />
                                  <button onClick={() => updateLimit(s._id)}
                                    className="bg-green-600 text-white px-2 py-0.5 rounded text-xs">
                                    {t.save}
                                  </button>
                                  <button onClick={() => setEditingLimit(null)}
                                    className="text-gray-400 hover:text-gray-600 text-xs px-1">✕</button>
                                </span>
                              ) : (
                                <button
                                  onClick={() => { setEditingLimit(s._id); setNewLimit(limit); }}
                                  className="font-semibold hover:text-blue-500 transition inline-flex items-center gap-0.5">
                                  ${limit.toFixed(2)}
                                  <Pencil size={10} className="opacity-40 ms-0.5"/>
                                </button>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-400">{t.available}: </span>
                              <span className={`font-semibold ${available < 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                                ${available.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 shrink-0">
                          <button onClick={() => setSelected(s)}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold
                              bg-green-600 hover:bg-green-700 text-white
                              shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                            <DollarSign size={13}/> {t.receivePayment}
                          </button>

                          <button onClick={() => setViewingItems(s)}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold
                              bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800
                              text-blue-600 dark:text-blue-400
                              hover:bg-blue-100 dark:hover:bg-blue-900/30
                              shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                            <ShoppingBag size={13}/> View Items
                            <span className="ml-auto bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                              {s.items.length}
                            </span>
                          </button>

                          <button onClick={() => setDrawerCustomer(s)}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium
                              bg-gray-100 dark:bg-[#252525] text-gray-600 dark:text-gray-300
                              hover:bg-gray-200 dark:hover:bg-[#333]
                              shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                            <History size={13}/> {t.viewHistory}
                          </button>
                          <button onClick={() => setEditCustomer(s)}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium
                              bg-gray-100 dark:bg-[#252525] text-gray-600 dark:text-gray-300
                              hover:bg-gray-200 dark:hover:bg-[#333]
                              shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                            <Pencil size={13}/> {t.editCustomer}
                          </button>
                        </div>
                      </div>

                      {/* Overdue warning */}
                      {s.balance > limit && (
                        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl
                          bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs">
                          <AlertCircle size={13}/>
                          <span>{t.debt} exceeds credit limit by ${(s.balance - limit).toFixed(2)}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* RIGHT: Recent Payments */}
          <div className="col-span-12 lg:col-span-4">
            <div className="sticky top-5">
              <RecentPayments refreshKey={recentKey}/>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selected       && <ReceivePaymentModal sale={selected}      close={() => setSelected(null)}        reload={load}/>}
      {editCustomer   && <EditCustomerModal   sale={editCustomer}  close={() => setEditCustomer(null)}    reload={load}/>}
      {drawerCustomer && <CustomerPaymentsDrawer customer={drawerCustomer} close={() => setDrawerCustomer(null)} reload={load}/>}

      {/* Items modal */}
      <AnimatePresence>
        {viewingItems && <ItemsModal sale={viewingItems} close={() => setViewingItems(null)}/>}
      </AnimatePresence>
    </div>
  );
}