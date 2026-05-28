import React, { useEffect, useState } from "react";
import { getActiveShift, getShifts, openShift, closeShift } from "../api/shift.api";
import api from "../api/axios";
import { useCurrency } from "../context/CurrencyContext";
import { useShiftTranslation } from "../hooks/useShiftTranslation";
import { useLang } from "../context/LanguageContext";
import toast from "react-hot-toast";
import {
  Clock, DollarSign, TrendingUp, X, CheckCircle2,
  AlertTriangle, BarChart3, CreditCard, RotateCcw, Plus,
  Minus, ArrowUpCircle, ArrowDownCircle
} from "lucide-react";

const CARD = "rounded-2xl bg-white dark:bg-[#141414] shadow-[6px_6px_16px_#d1d5db,-6px_-6px_16px_#ffffff] dark:shadow-[6px_6px_16px_#050505,-6px_-6px_16px_#1a1a1a]";

// LBP denominations
const DENOMS = [
  { value: 500000, label: "500k" },
  { value: 100000, label: "100k" },
  { value: 50000,  label: "50k"  },
  { value: 20000,  label: "20k"  },
  { value: 10000,  label: "10k"  },
  { value: 5000,   label: "5k"   },
  { value: 1000,   label: "1k"   },
];

function DenominationCounter({ value, onChange, label }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      {DENOMS.map(d => {
        const count = value.find(x => x.value === d.value)?.count || 0;
        const update = (newCount) => {
          const updated = value.filter(x => x.value !== d.value);
          if (newCount > 0) updated.push({ value: d.value, label: d.label, count: newCount, subtotal: newCount * d.value });
          onChange(updated);
        };
        return (
          <div key={d.value} className="flex items-center gap-3">
            <span className="text-xs font-mono w-12 text-gray-500">{d.label}</span>
            <button onClick={() => update(Math.max(0, count - 1))} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"><Minus size={14}/></button>
            <span className="w-8 text-center text-sm font-bold">{count}</span>
            <button onClick={() => update(count + 1)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"><Plus size={14}/></button>
            <span className="text-xs text-gray-500 ml-2">{count > 0 ? `= ${(count * d.value).toLocaleString()} ل.ل` : ""}</span>
          </div>
        );
      })}
      <div className="pt-2 border-t dark:border-white/10">
        <p className="text-sm font-bold text-gray-800 dark:text-white">
          {value.reduce((s, d) => s + d.subtotal, 0).toLocaleString()} ل.ل
          <span className="text-gray-500 font-normal ml-2 text-xs">
            ≈ ${(value.reduce((s, d) => s + d.subtotal, 0) / 90000).toFixed(2)}
          </span>
        </p>
      </div>
    </div>
  );
}

function ZReport({ shift, onClose }) {
  const { formatUSD } = useCurrency();
  const t = useShiftTranslation();
  const fmtTime = d => new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const printReport = () => {
    const win = window.open("", "_blank", "width=360,height=800");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${t.zreportTitle}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:13px;color:#111;width:80mm;padding:6mm 3mm}
.c{text-align:center}.b{font-weight:900}hr{border:none;border-top:1px dashed #aaa;margin:6px 0}
.row{display:flex;justify-content:space-between;padding:2px 0}.warn{color:#b45309;font-weight:700}.ok{color:#15803d;font-weight:700}
@media print{@page{size:80mm auto;margin:0}body{padding:4mm 2mm}}</style></head><body>
<div class="c"><p class="b" style="font-size:18px">${t.zreportTitle}</p>
<p>${fmtTime(shift.openedAt)} → ${fmtTime(shift.closedAt)}</p>
<p>${t.cashierLabel} ${shift.username || shift.userId}</p></div>
<hr/>
<div class="row"><span>${t.totalOrders}</span><span>${shift.totalOrders}</span></div>
<div class="row"><span>${t.grossRevenue}</span><span>$${shift.totalSales?.toFixed(2)}</span></div>
<div class="row"><span>${t.discounts}</span><span>-$${(shift.totalDiscount||0).toFixed(2)}</span></div>
<div class="row"><span>${t.refunds}</span><span>-$${shift.totalRefunds?.toFixed(2)}</span></div>
<div class="row b"><span>${t.netRevenue}</span><span>$${shift.netRevenue?.toFixed(2)}</span></div>
<hr/>
<div class="row"><span>${t.cashSales}</span><span>$${shift.cashSales?.toFixed(2)}</span></div>
<div class="row"><span>${t.cardSales}</span><span>$${shift.cardSales?.toFixed(2)}</span></div>
${shift.bankTransferSales > 0 ? `<div class="row"><span>Bank Transfer</span><span>$${shift.bankTransferSales?.toFixed(2)}</span></div>` : ""}
${shift.cashOnDeliverySales > 0 ? `<div class="row"><span>Cash on Delivery</span><span>$${shift.cashOnDeliverySales?.toFixed(2)}</span></div>` : ""}
<div class="row"><span>${t.payLater}</span><span>$${shift.payLaterSales?.toFixed(2)}</span></div>
${(shift.deliverySales > 0 || shift.inStoreSales > 0) ? `<hr/><div class="row"><span>In-Store</span><span>$${(shift.inStoreSales||0).toFixed(2)}</span></div><div class="row"><span>🚚 Delivery</span><span>$${(shift.deliverySales||0).toFixed(2)}</span></div>` : ""}
<hr/>
<div class="row"><span>${t.statOpeningFloat}</span><span>$${shift.openingFloat?.toFixed(2)}</span></div>
${shift.paidIn > 0 ? `<div class="row ok"><span>${t.paidIn}</span><span>+$${shift.paidIn?.toFixed(2)}</span></div>` : ""}
${shift.paidOut > 0 ? `<div class="row warn"><span>${t.paidOut}</span><span>-$${shift.paidOut?.toFixed(2)}</span></div>` : ""}
<div class="row"><span>${t.expectedCash}</span><span>$${shift.expectedCash?.toFixed(2)}</span></div>
${shift.closingCount != null ? `<div class="row"><span>${t.countedCashLabel}</span><span>$${shift.closingCount?.toFixed(2)}</span></div>
<div class="row ${shift.variance < 0 ? 'warn' : shift.variance > 0 ? 'ok' : ''}"><span>${t.variance}</span><span>${shift.variance >= 0 ? '+' : ''}$${shift.variance?.toFixed(2)}</span></div>` : ""}
${shift.notes ? `<hr/><p style="font-size:11px;color:#666">${t.notesPrefix} ${shift.notes}</p>` : ""}
<hr/>
<p style="text-align:center;font-size:10px;color:#999;margin-top:8px">${t.endOfShift}</p>
<script>window.onload=()=>{window.print();window.close();}<\/script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#141414] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-indigo-600 px-6 py-5 text-center">
          <BarChart3 size={32} className="text-white mx-auto mb-2" strokeWidth={1.5}/>
          <h2 className="text-white text-xl font-bold">{t.zreportTitle}</h2>
          <p className="text-indigo-200 text-sm mt-1">{new Date(shift.openedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · {shift.username}</p>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t.netRevenue,   value: formatUSD(shift.netRevenue || 0),   color: "text-green-600 dark:text-green-400" },
              { label: t.totalOrders,  value: shift.totalOrders || 0,             color: "text-blue-600 dark:text-blue-400" },
              { label: t.refunds,      value: formatUSD(shift.totalRefunds || 0), color: "text-red-600 dark:text-red-400" },
              { label: t.discounts,    value: formatUSD(shift.totalDiscount || 0),color: "text-orange-600 dark:text-orange-400" },
            ].map(k => (
              <div key={k.label} className="bg-gray-50 dark:bg-[#1a1a1a] rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          <div className={`${CARD} p-4 space-y-2`}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{t.paymentBreakdown}</p>
            {[
              { label: t.cash,              value: shift.cashSales || 0,             color: "text-green-600" },
              { label: t.card,              value: shift.cardSales || 0,             color: "text-blue-600"  },
              { label: "Bank Transfer",     value: shift.bankTransferSales || 0,     color: "text-indigo-600" },
              { label: "Cash on Delivery",  value: shift.cashOnDeliverySales || 0,   color: "text-orange-600" },
              { label: t.payLater,          value: shift.payLaterSales || 0,         color: "text-red-600"   },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">{r.label}</span>
                <span className={`font-bold ${r.color}`}>{formatUSD(r.value)}</span>
              </div>
            ))}
            {(shift.deliverySales > 0 || shift.inStoreSales > 0) && (
              <>
                <div className="border-t dark:border-white/10 pt-2 mt-1"/>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Sale Type</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">In-Store</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{formatUSD(shift.inStoreSales || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">🚚 Delivery</span>
                  <span className="font-bold text-purple-600">{formatUSD(shift.deliverySales || 0)}</span>
                </div>
              </>
            )}
          </div>

          <div className={`${CARD} p-4 space-y-2`}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{t.cashDrawer}</p>
            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-300">{t.statOpeningFloat}</span><span className="font-bold">{formatUSD(shift.openingFloat || 0)}</span></div>
            {shift.paidIn > 0 && <div className="flex justify-between"><span className="text-sm text-green-600">{t.paidIn}</span><span className="font-bold text-green-600">+{formatUSD(shift.paidIn)}</span></div>}
            {shift.paidOut > 0 && <div className="flex justify-between"><span className="text-sm text-orange-600">{t.paidOut}</span><span className="font-bold text-orange-600">-{formatUSD(shift.paidOut)}</span></div>}
            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-300">{t.expectedCash}</span><span className="font-bold">{formatUSD(shift.expectedCash || 0)}</span></div>
            {shift.closingCount != null && (
              <>
                <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-300">{t.countedCashLabel}</span><span className="font-bold">{formatUSD(shift.closingCount)}</span></div>
                <div className={`flex justify-between font-bold ${shift.variance < 0 ? "text-red-500" : shift.variance > 0 ? "text-green-600" : "text-gray-600"}`}>
                  <span>{t.variance}</span><span>{shift.variance >= 0 ? "+" : ""}{formatUSD(shift.variance)}</span>
                </div>
              </>
            )}
          </div>

          {shift.notes && <div className={`${CARD} p-4`}><p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{t.closingNotes}</p><p className="text-sm">{shift.notes}</p></div>}
        </div>
        <div className="p-5 border-t dark:border-white/10 flex gap-3">
          <button onClick={printReport} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-[0_4px_0_0_#3730a3] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">{t.printZReport}</button>
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">{t.close}</button>
        </div>
      </div>
    </div>
  );
}

export default function ShiftPanel() {
  const { formatUSD } = useCurrency();
  const t = useShiftTranslation();
  const { lang } = useLang();

  const [activeShift, setActiveShift] = useState(null);
  const [shifts,      setShifts]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [zReport,     setZReport]     = useState(null);
  const [openFloat,   setOpenFloat]   = useState("");
  const [openDenoms,  setOpenDenoms]  = useState([]);
  const [useDenomsOpen, setUseDenomsOpen] = useState(false);
  const [closeDenoms, setCloseDenoms] = useState([]);
  const [useDenomsClose, setUseDenomsClose] = useState(false);
  const [closeCount,  setCloseCount]  = useState("");
  const [closeNotes,  setCloseNotes]  = useState("");
  const [showClose,   setShowClose]   = useState(false);
  const [cashEventModal, setCashEventModal] = useState(false);
  const [cashEvent, setCashEvent] = useState({ type: "paid_in", amount: "", reason: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([getActiveShift(), getShifts()]);
      setActiveShift(a); setShifts(s);
    } catch { toast.error(t.failedToLoad); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleOpen = async () => {
    const float = useDenomsOpen
      ? openDenoms.reduce((s, d) => s + d.subtotal, 0) / 90000
      : parseFloat(openFloat) || 0;
    try {
      await openShift({ openingFloat: float, openingDenominations: useDenomsOpen ? openDenoms : [] });
      toast.success(t.shiftOpened);
      setOpenFloat(""); setOpenDenoms([]); load();
    } catch (err) { toast.error(err.response?.data?.message || t.failed); }
  };

  const handleClose = async () => {
    if (!activeShift) return;
    const count = useDenomsClose
      ? closeDenoms.reduce((s, d) => s + d.subtotal, 0) / 90000
      : closeCount !== "" ? parseFloat(closeCount) : null;
    try {
      const closed = await closeShift(activeShift._id, { closingCount: count, closingDenominations: useDenomsClose ? closeDenoms : [], notes: closeNotes });
      toast.success(t.shiftClosed);
      setShowClose(false); setCloseCount(""); setCloseDenoms([]); setCloseNotes("");
      setZReport(closed); load();
    } catch (err) { toast.error(err.response?.data?.message || t.failed); }
  };

  const handleCashEvent = async () => {
    if (!cashEvent.amount || +cashEvent.amount <= 0) return toast.error(t.enterValidAmount);
    try {
      await api.post(`/shifts/${activeShift._id}/cash-event`, cashEvent);
      toast.success(`${cashEvent.type === "paid_in" ? t.paidIn : t.paidOut} $${cashEvent.amount}`);
      setCashEventModal(false); setCashEvent({ type: "paid_in", amount: "", reason: "" }); load();
    } catch (err) { toast.error(err.response?.data?.message || t.failed); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">{t.loading}</div>;

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-neutral-950 p-5" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="w-full space-y-5">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center"><Clock size={20} className="text-white"/></div>
          <div><h1 className="text-xl font-bold">{t.title}</h1><p className="text-xs text-gray-500">{t.subtitle}</p></div>
        </div>

        {/* No active shift */}
        {!activeShift && (
          <div className={`${CARD} p-6 space-y-4`}>
            <h2 className="font-semibold text-lg">{t.openNewShift}</h2>
            <div>
              <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                <input type="checkbox" checked={useDenomsOpen} onChange={e => setUseDenomsOpen(e.target.checked)} className="rounded"/>
                {t.countByDenoms}
              </label>
              {!useDenomsOpen ? (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t.openingFloat}</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={openFloat} onChange={e => setOpenFloat(e.target.value)}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
              ) : (
                <DenominationCounter value={openDenoms} onChange={setOpenDenoms} label={t.denomsLabel}/>
              )}
            </div>
            <button onClick={handleOpen} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-[0_4px_0_0_#3730a3] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">{t.openShift}</button>
          </div>
        )}

        {/* Active shift */}
        {activeShift && (
          <div className="space-y-4">
            <div className={`${CARD} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"/>
                  <span className="font-semibold">{t.shiftActive}</span>
                  <span className="text-xs text-gray-500">{t.since} {new Date(activeShift.openedAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCashEventModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 transition">
                    <DollarSign size={12}/> {t.cashInOut}
                  </button>
                  <button onClick={() => setShowClose(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition">
                    <X size={12}/> {t.closeShift}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: t.statOpeningFloat, value: formatUSD(activeShift.openingFloat || 0) },
                  { label: t.statPaidIn,       value: formatUSD(activeShift.paidIn || 0) },
                  { label: t.statPaidOut,      value: formatUSD(activeShift.paidOut || 0) },
                  { label: t.statOpened,       value: new Date(activeShift.openedAt).toLocaleTimeString() },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 dark:bg-[#1a1a1a] rounded-xl p-3 text-center">
                    <p className="text-sm font-bold text-gray-800 dark:text-white">{s.value}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Cash drawer events */}
              {activeShift.cashDrawerEvents?.length > 1 && (
                <div className="mt-4 space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t.cashDrawerEvents}</p>
                  {activeShift.cashDrawerEvents.slice(1).map((ev, i) => (
                    <div key={i} className="flex items-center justify-between text-xs px-3 py-1.5 bg-gray-50 dark:bg-white/5 rounded-lg">
                      <span className={`flex items-center gap-1 font-medium ${ev.type === "paid_in" ? "text-green-600" : "text-orange-600"}`}>
                        {ev.type === "paid_in" ? <ArrowUpCircle size={12}/> : <ArrowDownCircle size={12}/>}
                        {ev.type === "paid_in" ? t.paidIn : t.paidOut}
                      </span>
                      <span className="font-bold">${ev.amount?.toFixed(2)}</span>
                      <span className="text-gray-400">{ev.reason}</span>
                      <span className="text-gray-400">{new Date(ev.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close shift modal */}
            {showClose && (
              <div className={`${CARD} p-5 space-y-4 border-2 border-red-200 dark:border-red-500/30`}>
                <h2 className="font-semibold text-red-600 flex items-center gap-2"><AlertTriangle size={16}/> {t.closeShiftTitle}</h2>
                <div>
                  <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                    <input type="checkbox" checked={useDenomsClose} onChange={e => setUseDenomsClose(e.target.checked)} className="rounded"/>
                    {t.countClosingByDenoms}
                  </label>
                  {!useDenomsClose ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t.countedCash}</label>
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={closeCount} onChange={e => setCloseCount(e.target.value)}
                        className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 bg-transparent text-sm outline-none focus:ring-2 focus:ring-red-400"/>
                    </div>
                  ) : (
                    <DenominationCounter value={closeDenoms} onChange={setCloseDenoms} label={t.denomsLabel}/>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t.closingNotes}</label>
                  <textarea rows={2} value={closeNotes} onChange={e => setCloseNotes(e.target.value)}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 bg-transparent text-sm outline-none resize-none focus:ring-2 focus:ring-red-400"/>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleClose} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold shadow-[0_4px_0_0_#b91c1c] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">{t.closeAndPrint}</button>
                  <button onClick={() => setShowClose(false)} className="flex-1 py-3 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-semibold shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">{t.cancel}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Past shifts */}
        {shifts.filter(s => s.status === "closed").length > 0 && (
          <div className={`${CARD} overflow-hidden`}>
            <div className="px-5 py-4 border-b dark:border-white/10 flex items-center justify-between">
              <span className="font-semibold text-sm">{t.pastShifts}</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {shifts.filter(s => s.status === "closed").slice(0, 10).map(shift => (
                <div key={shift._id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer" onClick={() => setZReport(shift)}>
                  <div>
                    <p className="text-sm font-medium">{shift.username}</p>
                    <p className="text-xs text-gray-400">{new Date(shift.openedAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">{formatUSD(shift.netRevenue || 0)}</p>
                    <p className="text-xs text-gray-400">{shift.totalOrders} {t.orders}</p>
                  </div>
                  {shift.variance != null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${Math.abs(shift.variance) < 0.01 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {shift.variance >= 0 ? "+" : ""}${shift.variance?.toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Z-Report modal */}
      {zReport && <ZReport shift={zReport} onClose={() => setZReport(null)}/>}

      {/* Cash In/Out modal */}
      {cashEventModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setCashEventModal(false); }}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-bold mb-4">{t.cashDrawerEvent}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t.typeLabel}</label>
                <select value={cashEvent.type} onChange={e => setCashEvent(f => ({ ...f, type: e.target.value }))} className="w-full border dark:border-white/10 rounded-xl px-3 py-2 bg-transparent text-sm outline-none">
                  <option value="paid_in">{t.paidInOption}</option>
                  <option value="paid_out">{t.paidOutOption}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t.amountLabel}</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={cashEvent.amount} onChange={e => setCashEvent(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border dark:border-white/10 rounded-xl px-3 py-2 bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t.reasonLabel}</label>
                <input type="text" value={cashEvent.reason} onChange={e => setCashEvent(f => ({ ...f, reason: e.target.value }))}
                  className="w-full border dark:border-white/10 rounded-xl px-3 py-2 bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCashEvent} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-[0_4px_0_0_#3730a3] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">{t.confirm}</button>
                <button onClick={() => setCashEventModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">{t.cancel}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
