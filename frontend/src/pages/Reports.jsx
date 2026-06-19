import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRefresh }              from "../context/RefreshContext";
import { useLang }                 from "../context/LanguageContext";
import { useReportsTranslation }   from "../hooks/useReportsTranslation";
import { useCurrency }             from "../context/CurrencyContext";
import api                         from "../api/axios";
import { getProfitLoss, voidSale } from "../api/sale.api";
import ReturnModal                 from "../components/ReturnModal";
import toast                       from "react-hot-toast";
import { motion }                  from "framer-motion";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, ShoppingCart, CreditCard, Clock, DollarSign,
  AlertCircle, AlertTriangle, Package, Bell, RotateCcw,
  Download, Users, Shield, Send,
} from "lucide-react";

const CARD = "rounded-2xl bg-white dark:bg-[#141414] shadow-[6px_6px_16px_#d1d5db,-6px_-6px_16px_#ffffff] dark:shadow-[6px_6px_16px_#050505,-6px_-6px_16px_#1a1a1a]";
const PIE_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6"];
// Fixed per-method colors so pie and legend always match
const PM_COLORS = {
  cash:             { hex: "#10b981", text: "text-emerald-600 dark:text-emerald-400" },
  card:             { hex: "#3b82f6", text: "text-blue-600    dark:text-blue-400"    },
  paylater:         { hex: "#ef4444", text: "text-red-600     dark:text-red-400"     },
  split:            { hex: "#f59e0b", text: "text-amber-600   dark:text-amber-400"   },
  bank_transfer:    { hex: "#6366f1", text: "text-indigo-600  dark:text-indigo-400"  },
  cash_on_delivery: { hex: "#f97316", text: "text-orange-600  dark:text-orange-400"  },
};
const METHOD_COLOR = {
  cash:             "bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-300",
  card:             "bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-300",
  paylater:         "bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-300",
  split:            "bg-amber-100  dark:bg-amber-900/30  text-amber-700  dark:text-amber-300",
  bank_transfer:    "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
  cash_on_delivery: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
};
const Empty = ({ msg = "No data" }) => (
  <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm">{msg}</div>
);

export default function Reports() {
  const { tick }  = useRefresh();
  const { lang }  = useLang();
  const t         = useReportsTranslation();
  const isAr      = lang === "ar";
  const { formatUSD, formatLBP, toLBPNice } = useCurrency();
  const fLBP = (v) => formatLBP(toLBPNice(v));

  const [sales,     setSales]     = useState([]);
  const [holdSales, setHoldSales] = useState([]);
  const [alerts,    setAlerts]    = useState({ lowStock: [], expiring: [] });
  const [auditLogs, setAuditLogs] = useState([]);
  const [plData,    setPlData]    = useState(null);
  const [plSubTab,  setPlSubTab]  = useState("pl"); // "pl" | "earned"
  const [plDateFrom,setPlDateFrom]= useState("");
  const [plDateTo,  setPlDateTo]  = useState("");
  const [loading,   setLoading]   = useState(true);
  const [period,    setPeriod]    = useState("week");
  const [tab,       setTab]       = useState("overview");
  const [saleTypeFilter, setSaleTypeFilter] = useState("all");
  const [txMethodFilter, setTxMethodFilter] = useState("all");
  const [txStatusFilter, setTxStatusFilter] = useState("all");
  const [txSearch,       setTxSearch]       = useState("");
  const [txDateFrom,     setTxDateFrom]     = useState("");
  const [txDateTo,       setTxDateTo]       = useState("");
  const [txMinAmount,    setTxMinAmount]    = useState("");
  const [txMaxAmount,    setTxMaxAmount]    = useState("");
  const [txSortBy,       setTxSortBy]       = useState("date");   // date | amount | customer
  const [txSortDir,      setTxSortDir]      = useState("desc");   // asc | desc
  const [txPage,         setTxPage]         = useState(1);
  const [returnSale,  setReturnSale]  = useState(null);
  const [voidModal,   setVoidModal]   = useState(null);
  const [sendingTg,   setSendingTg]   = useState(false);
  const [sendingTgChart, setSendingTgChart] = useState(false);
  const [voidPin,     setVoidPin]     = useState("");
  const [voidReason,  setVoidReason]  = useState("");
  const [voidLoading, setVoidLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sRes, hRes, aRes] = await Promise.all([
        api.get("/sales", { params: { limit: 0 } }), api.get("/hold-sales"), api.get("/products/alerts"),
      ]);
      setSales(sRes.data); setHoldSales(hRes.data); setAlerts(aRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [tick, load]);

  const loadPL = useCallback(async () => {
    try {
      const now = new Date();
      let from, to;
      if (plDateFrom) {
        from = plDateFrom;
        to   = plDateTo || now.toISOString().split("T")[0];
      } else {
        if (period === "day") from = now.toISOString().split("T")[0];
        else if (period === "week") from = new Date(Date.now() - 7*86400000).toISOString().split("T")[0];
        else if (period === "month") from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        else from = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
        to = now.toISOString().split("T")[0];
      }
      setPlData(await getProfitLoss(from, to));
    } catch { setPlData(null); }
  }, [period, plDateFrom, plDateTo]);

  const loadAudit = useCallback(async () => {
    try { setAuditLogs((await api.get("/audit", { params: { limit: 200 } })).data); } catch {}
  }, []);

  useEffect(() => {
    if (tab === "profit") loadPL();
    if (tab === "audit")  loadAudit();
  }, [tab, loadPL, loadAudit, plDateFrom, plDateTo]);

  /* ── filter ── */
  const filteredSales = useMemo(() => {
    const now = new Date();
    let cutoff = new Date();
    if (period === "day") { cutoff.setHours(0,0,0,0); }
    else if (period === "week") { cutoff.setDate(cutoff.getDate() - 7); }
    else if (period === "month") { cutoff = new Date(now.getFullYear(), now.getMonth(), 1); }
    else { cutoff = new Date(now.getFullYear(), 0, 1); } // year
    return sales.filter(s => new Date(s.createdAt) >= cutoff);
  }, [sales, period]);

  /* ── KPIs ── */
  const totalRevenue       = useMemo(() => filteredSales.reduce((s,x) => s+x.total, 0), [filteredSales]);
  const cashRevenue        = useMemo(() => filteredSales.filter(s=>s.paymentMethod==="cash").reduce((s,x)=>s+x.total,0), [filteredSales]);
  const cardRevenue        = useMemo(() => filteredSales.filter(s=>s.paymentMethod==="card").reduce((s,x)=>s+x.total,0), [filteredSales]);
  const payLaterTotal      = useMemo(() => filteredSales.filter(s=>s.paymentMethod==="paylater").reduce((s,x)=>s+x.total,0), [filteredSales]);
  const splitTotal         = useMemo(() => filteredSales.filter(s=>s.paymentMethod==="split").reduce((s,x)=>s+x.total,0), [filteredSales]);
  const bankTransferTotal  = useMemo(() => filteredSales.filter(s=>s.paymentMethod==="bank_transfer").reduce((s,x)=>s+x.total,0), [filteredSales]);
  const codTotal           = useMemo(() => filteredSales.filter(s=>s.paymentMethod==="cash_on_delivery").reduce((s,x)=>s+x.total,0), [filteredSales]);
  const inStoreTotal       = useMemo(() => filteredSales.filter(s=>!s.saleType||s.saleType==="in_store").reduce((s,x)=>s+x.total,0), [filteredSales]);
  const deliveryTotal      = useMemo(() => filteredSales.filter(s=>s.saleType==="delivery").reduce((s,x)=>s+x.total,0), [filteredSales]);
  const avgSale       = filteredSales.length ? totalRevenue/filteredSales.length : 0;
  const outstandingCredit = useMemo(() => holdSales.reduce((s,h)=>s+(h.balance||0),0), [holdSales]);
  const totalCreditGiven  = useMemo(() => holdSales.reduce((s,h)=>s+(h.total||0),0),   [holdSales]);
  const totalCreditPaid   = useMemo(() => holdSales.reduce((s,h)=>s+(h.paid||0),0),    [holdSales]);

  /* ── charts ── */
  const revenueChart = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const d = new Date(s.createdAt);
      let key;
      if (period === "day") key = `${d.getHours()}:00`;
      else if (period === "year") key = d.toLocaleDateString(isAr?"ar-SA":"en-US",{month:"short",year:"2-digit"});
      else key = d.toLocaleDateString(isAr?"ar-SA":"en-US",{weekday:"short",month:"short",day:"numeric"});
      if (!map[key]) map[key] = { label:key, revenue:0, count:0 };
      map[key].revenue += s.total; map[key].count += 1;
    });
    return Object.values(map);
  }, [filteredSales, period, isAr]);

  const paymentBreakdown = useMemo(() => {
    const map = {cash:0,card:0,paylater:0,split:0,bank_transfer:0,cash_on_delivery:0};
    filteredSales.forEach(s => { map[s.paymentMethod]=(map[s.paymentMethod]||0)+s.total; });
    return [
      {key:"cash",             name:t.cash||"Cash",              value:+map.cash.toFixed(2)             },
      {key:"card",             name:t.card||"Card",              value:+map.card.toFixed(2)             },
      {key:"bank_transfer",    name:"Bank Transfer",             value:+map.bank_transfer.toFixed(2)    },
      {key:"cash_on_delivery", name:"Cash on Delivery",          value:+map.cash_on_delivery.toFixed(2) },
      {key:"paylater",         name:t.credit||"Pay Later",       value:+map.paylater.toFixed(2)         },
      {key:"split",            name:t.split||"Split",            value:+map.split.toFixed(2)            },
    ];
  }, [filteredSales, t]);

  const topProducts = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => s.items.forEach(item => {
      const name = item.name||"Unknown";
      if (!map[name]) map[name]={name,qty:0,revenue:0};
      map[name].qty += item.quantity;
      map[name].revenue += item.subtotal||item.price*item.quantity;
    }));
    return Object.values(map).sort((a,b)=>b.qty-a.qty).slice(0,8);
  }, [filteredSales]);

  const hourlyData = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const h = new Date(s.createdAt).getHours();
      const key = `${String(h).padStart(2,"0")}:00`;
      if (!map[key]) map[key]={hour:key,sales:0,count:0};
      map[key].sales += s.total; map[key].count += 1;
    });
    return Object.values(map).sort((a,b)=>a.hour.localeCompare(b.hour));
  }, [filteredSales]);

  const cashierPerf = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const name = s.userId?.username||"Unknown";
      if (!map[name]) map[name]={name,orders:0,revenue:0,refunds:0};
      map[name].orders++;
      map[name].revenue += s.total;
      map[name].refunds += s.totalRefunded||0;
    });
    return Object.values(map).sort((a,b)=>b.revenue-a.revenue);
  }, [filteredSales]);

  const exportCSV = () => {
    const rows = [
      ["ID","Date","Customer","Payment","Total","Discount","Refunded","Status"],
      ...filteredSales.map(s=>[s._id,new Date(s.createdAt).toLocaleString(),s.customerName||"",s.paymentMethod,s.total.toFixed(2),(s.discountAmount||0).toFixed(2),(s.totalRefunded||0).toFixed(2),s.status]),
    ];
    const csv=rows.map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=`sales-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleVoid = async () => {
    if (!voidModal||!voidReason.trim()) return;
    setVoidLoading(true);
    try {
      await voidSale(voidModal._id,{managerPin:voidPin,reason:voidReason});
      setSales(prev=>prev.map(s=>s._id===voidModal._id?{...s,status:"fully_returned"}:s));
      setVoidModal(null); setVoidPin(""); setVoidReason("");
      toast.success("Sale voided");
    } catch(err) { toast.error(err.response?.data?.message||"Void failed"); }
    finally { setVoidLoading(false); }
  };

  const fmtDate = d => new Date(d).toLocaleString(isAr?"ar-SA":"en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
  const fmtD    = d => new Date(d).toLocaleDateString(isAr?"ar-SA":"en-US",{day:"numeric",month:"short",year:"numeric"});

  const statusBadge = s=>({
    completed:          "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    partially_returned: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    fully_returned:     "bg-gray-100  dark:bg-gray-800    text-gray-500  dark:text-gray-400",
  }[s]||"bg-gray-100 text-gray-500");

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"/>{t.loading}
    </div>
  );

  const TABS = [
    ["overview",     t.tabOverview||"Overview",         <TrendingUp size={14}/>  ],
    ["profit",       "P&L",                             <DollarSign size={14}/>  ],
    ["transactions", t.tabTransactions||"Transactions", <ShoppingCart size={14}/>],
    ["cashiers",     "Cashiers",                        <Users size={14}/>       ],
    ["paylater",     t.tabPayLater||"Pay Later",        <CreditCard size={14}/>  ],
    ["alerts",       t.tabAlerts||"Alerts",             <Bell size={14}/>        ],
    ["audit",        "Audit Log",                       <Shield size={14}/>      ],
  ];

  return (
    <div dir={isAr?"rtl":"ltr"} className="h-full overflow-y-auto">
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp size={22} className="text-purple-500"/> {t.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t.subtitle}</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {[["day",t.today||"Today"],["week",t.week||"Week"],["month",t.month||"Month"],["year",t.year||"Year"]].map(([val,label])=>(
              <button key={val} onClick={()=>setPeriod(val)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-[transform,box-shadow] duration-75 select-none ${period===val?"bg-purple-600 text-white shadow-[0_4px_0_0_#6d28d9] active:shadow-none active:translate-y-[4px]":"bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px]"}`}>
                {label}
              </button>
            ))}
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414] hover:bg-gray-50 text-gray-600 dark:text-gray-300 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
              <Download size={14}/> CSV
            </button>
            <button disabled={sendingTg} onClick={async () => {
                setSendingTg(true);
                const periodMap = { day: "today", week: "week", month: "month", year: "year" };
                try {
                  await api.post(`/telegram/report?period=${periodMap[period] || "today"}`);
                  toast.success("Report sent to Telegram ✅");
                } catch (err) {
                  toast.error(err.response?.data?.message || "Failed to send to Telegram");
                } finally { setSendingTg(false); }
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm border border-[#229ED9]/40 bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] font-semibold shadow-[0_4px_0_0_rgba(34,158,217,0.25)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none disabled:opacity-50">
              <Send size={14}/> {sendingTg ? "Sending…" : "Telegram"}
            </button>
            <button disabled={sendingTgChart} onClick={async () => {
                setSendingTgChart(true);
                const periodMap = { day: "today", week: "week", month: "month", year: "year" };
                try {
                  await api.post(`/telegram/report?period=${periodMap[period] || "today"}&charts=1`);
                  toast.success("Charts sent to Telegram 📊");
                } catch (err) {
                  toast.error(err.response?.data?.message || "Failed to send charts");
                } finally { setSendingTgChart(false); }
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm border border-purple-400/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 font-semibold shadow-[0_4px_0_0_rgba(168,85,247,0.25)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none disabled:opacity-50">
              <Send size={14}/> {sendingTgChart ? "Sending…" : "📊 Charts"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map(([key,label,icon])=>(
            <button key={key} onClick={()=>setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-[transform,box-shadow] duration-75 select-none shrink-0
                ${tab===key?"bg-purple-600 text-white shadow-[0_4px_0_0_#6d28d9] active:shadow-none active:translate-y-[4px]":"bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px]"}`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {tab==="overview"&&(
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {label:t.totalRevenue,value:fLBP(totalRevenue),              icon:<DollarSign size={18}/>,  color:"text-green-600 dark:text-green-400",   bg:"bg-green-50 dark:bg-green-900/20"  },
                {label:t.totalSales,  value:filteredSales.length,          icon:<ShoppingCart size={18}/>,color:"text-blue-600 dark:text-blue-400",     bg:"bg-blue-50 dark:bg-blue-900/20"   },
                {label:t.averageSale, value:fLBP(avgSale),                 icon:<TrendingUp size={18}/>,  color:"text-purple-600 dark:text-purple-400", bg:"bg-purple-50 dark:bg-purple-900/20"},
                {label:t.outstanding, value:fLBP(outstandingCredit),       icon:<AlertCircle size={18}/>,color:"text-red-600 dark:text-red-400",   bg:"bg-red-50 dark:bg-red-900/20"     },
              ].map(({label,value,icon,color,bg})=>(
                <motion.div key={label} whileHover={{scale:1.03}} className={`${CARD} ${bg} p-4`}>
                  <div className={`${color} mb-2`}>{icon}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                </motion.div>
              ))}
            </div>
            {deliveryTotal > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <motion.div whileHover={{scale:1.03}} className={`${CARD} bg-gray-50 dark:bg-[#141414] p-4`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400">In-Store Sales</p>
                  <p className="text-2xl font-bold mt-1 text-gray-700 dark:text-gray-300">{fLBP(inStoreTotal)}</p>
                </motion.div>
                <motion.div whileHover={{scale:1.03}} className={`${CARD} bg-orange-50 dark:bg-orange-900/20 p-4`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400">🚚 Delivery Sales</p>
                  <p className="text-2xl font-bold mt-1 text-orange-600 dark:text-orange-400">{fLBP(deliveryTotal)}</p>
                </motion.div>
              </div>
            )}
            <div className={`${CARD} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">{t.revenueTrend}</h3>
                <span className="text-xs text-gray-400">{period==="day"?t.byHour:period==="year"?t.byMonth:t.byDay}</span>
              </div>
              {revenueChart.length===0?<Empty msg={t.noSales}/>:(
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={revenueChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                    <XAxis dataKey="label" tick={{fontSize:11}}/>
                    <YAxis tick={{fontSize:11}}/>
                    <Tooltip formatter={v=>[fLBP(Number(v)),t.revenue||"Revenue"]}/>
                    <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2.5} dot={{r:4}} activeDot={{r:6}}/>
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div className={`${CARD} p-5`}>
                <h3 className="font-semibold text-sm mb-4">{t.topProducts}</h3>
                {topProducts.length===0?<Empty/>:(
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                      <XAxis type="number" tick={{fontSize:10}}/>
                      <YAxis dataKey="name" type="category" tick={{fontSize:10}} width={80}/>
                      <Tooltip/>
                      <Bar dataKey="qty" fill="#6366f1" radius={[0,4,4,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className={`${CARD} p-5`}>
                <h3 className="font-semibold text-sm mb-4">{t.paymentMethods}</h3>
                {paymentBreakdown.every(x=>x.value===0) ? (
                  /* show empty legend even when no sales */
                  <div className="grid grid-cols-3 gap-2">
                    {paymentBreakdown.map(m=>(
                      <div key={m.key} className="text-center bg-gray-50 dark:bg-[#1c1c1c] rounded-xl p-2">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{background:PM_COLORS[m.key].hex}}/>
                          <p className="text-xs text-gray-400">{m.name}</p>
                        </div>
                        <p className={`text-sm font-bold ${PM_COLORS[m.key].text}`}>0 ل.ل</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={paymentBreakdown.filter(x=>x.value>0)}
                          dataKey="value" nameKey="name"
                          cx="50%" cy="50%" outerRadius={65}
                          label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                        >
                          {paymentBreakdown.filter(x=>x.value>0).map(m=>(
                            <Cell key={m.key} fill={PM_COLORS[m.key].hex}/>
                          ))}
                        </Pie>
                        <Tooltip formatter={v=>fLBP(Number(v))}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {paymentBreakdown.map(m=>(
                        <div key={m.key} className="text-center bg-gray-50 dark:bg-[#1c1c1c] rounded-xl p-2">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{background:PM_COLORS[m.key].hex}}/>
                            <p className="text-xs text-gray-400">{m.name}</p>
                          </div>
                          <p className={`text-sm font-bold ${PM_COLORS[m.key].text}`}>{fLBP(m.value)}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className={`${CARD} p-5`}>
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Clock size={14} className="text-amber-500"/>{t.hourlySales}</h3>
              {hourlyData.length===0?<Empty/>:(
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                    <XAxis dataKey="hour" tick={{fontSize:11}}/>
                    <YAxis tick={{fontSize:11}}/>
                    <Tooltip formatter={v=>[fLBP(Number(v)),t.revenue||"Revenue"]}/>
                    <Bar dataKey="sales" fill="#f59e0b" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* ═══ P&L ═══ */}
        {tab==="profit"&&(
          <div className="space-y-5">
            {/* Date range filter */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414] px-4 py-3">
              <span className="text-xs font-semibold text-gray-500">Date range:</span>
              <input type="date" value={plDateFrom} onChange={e=>{setPlDateFrom(e.target.value);setPlData(null);}}
                className="px-2 py-1.5 rounded-xl text-xs border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414] text-gray-700 dark:text-gray-300 focus:outline-none focus:border-purple-500"/>
              <span className="text-xs text-gray-400">→</span>
              <input type="date" value={plDateTo} onChange={e=>{setPlDateTo(e.target.value);setPlData(null);}}
                className="px-2 py-1.5 rounded-xl text-xs border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414] text-gray-700 dark:text-gray-300 focus:outline-none focus:border-purple-500"/>
              {(plDateFrom||plDateTo)&&(
                <button onClick={()=>{setPlDateFrom("");setPlDateTo("");setPlData(null);}}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-500/30">
                  Clear
                </button>
              )}
              {plDateFrom&&(
                <span className="ml-auto text-xs text-purple-600 dark:text-purple-400 font-medium">
                  Custom range: {plDateFrom} → {plDateTo||"today"}
                </span>
              )}
              {!plDateFrom&&(
                <span className="ml-auto text-xs text-gray-400">Using period: <strong>{period}</strong></span>
              )}
            </div>
            {/* Sub-tab switcher */}
            <div className="flex gap-2">
              {[{id:"pl",label:"P&L Report"},{id:"earned",label:"Earned from Sales"}].map(s=>(
                <button key={s.id} onClick={()=>setPlSubTab(s.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    plSubTab===s.id
                      ? "bg-purple-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.35)]"
                      : "bg-gray-100 dark:bg-[#1c1c1c] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#252525]"
                  }`}>{s.label}</button>
              ))}
            </div>

            {!plData?<div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"/></div>:(
              <>
                {/* ── P&L Report ── */}
                {plSubTab==="pl"&&(
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        {title:"Revenue",      value:fLBP(plData.revenue),     color:"text-blue-600 dark:text-blue-400",    bg:"bg-blue-50 dark:bg-blue-900/20"   },
                        {title:"COGS",         value:fLBP(plData.cogs),        color:"text-red-600 dark:text-red-400",      bg:"bg-red-50 dark:bg-red-900/20"     },
                        {title:"Gross Profit", value:fLBP(plData.grossProfit), color:plData.grossProfit>=0?"text-green-600 dark:text-green-400":"text-red-600", bg:plData.grossProfit>=0?"bg-green-50 dark:bg-green-900/20":"bg-red-50 dark:bg-red-900/20"},
                        {title:"Margin",       value:`${plData.grossMargin}%`,      color:"text-purple-600 dark:text-purple-400",bg:"bg-purple-50 dark:bg-purple-900/20"},
                      ].map(k=>(
                        <div key={k.title} className={`${CARD} p-4 ${k.bg}`}>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{k.title}</p>
                          <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                        </div>
                      ))}
                    </div>
                    {plData.inventoryValue != null && (
                      <div className={`${CARD} p-4 flex items-center justify-between bg-amber-50 dark:bg-amber-900/20`}>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Total Inventory Cost</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Current stock valued at purchase (batch) cost</p>
                        </div>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{fLBP(plData.inventoryValue)}</p>
                      </div>
                    )}
                    <div className={`${CARD} p-5 space-y-2`}>
                      {[
                        {label:"Revenue",                    r:plData.revenue,   s:"",  c:"text-gray-700 dark:text-gray-300"},
                        {label:"− Cost of goods sold (COGS)",r:plData.cogs,      s:"−", c:"text-red-500"},
                        {label:"− Discounts",                r:plData.discounts, s:"−", c:"text-amber-500"},
                        {label:"− Refunds",                  r:plData.refunds,   s:"−", c:"text-red-500"},
                      ].map(x=>(
                        <div key={x.label} className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">{x.label}</span>
                          <span className={x.c}>{x.s}{fLBP(x.r)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-dashed border-gray-200 dark:border-white/10 pt-3">
                        <span className="font-bold">Gross Profit</span>
                        <span className={`text-xl font-black ${plData.grossProfit>=0?"text-green-600 dark:text-green-400":"text-red-600"}`}>{fLBP(plData.grossProfit)}</span>
                      </div>
                    </div>
                    <div className={`${CARD} overflow-hidden`}>
                      <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 font-semibold text-sm">Product profitability</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-[#1c1c1c] text-xs text-gray-400"><tr>
                            <th className="px-5 py-3 text-left">Product</th>
                            <th className="px-3 py-3 text-center">Sold</th>
                            <th className="px-3 py-3 text-right">Revenue</th>
                            <th className="px-3 py-3 text-right">Profit</th>
                            <th className="px-3 py-3 text-right">Margin</th>
                          </tr></thead>
                          <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                            {plData.productBreakdown.slice(0,15).map(p=>(
                              <tr key={p.name} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                <td className="px-5 py-3 font-medium truncate max-w-[160px]">{p.name}</td>
                                <td className="px-3 py-3 text-center text-gray-500">{p.quantity}</td>
                                <td className="px-3 py-3 text-right text-blue-600 dark:text-blue-400">{fLBP(p.revenue)}</td>
                                <td className={`px-3 py-3 text-right font-semibold ${p.profit>=0?"text-green-600 dark:text-green-400":"text-red-500"}`}>{fLBP(p.profit)}</td>
                                <td className="px-3 py-3 text-right text-purple-600 dark:text-purple-400">{p.margin}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Earned from Sales ── */}
                {plSubTab==="earned"&&(()=>{
                  const breakdown = plData.productBreakdown;
                  const totalEarned      = breakdown.reduce((s,p)=>s+p.profit,0);
                  const earnedProfitable = breakdown.filter(p=>p.profit>0).reduce((s,p)=>s+p.profit,0);
                  const sorted = [...breakdown].sort((a,b)=>b.profit-a.profit);
                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`${CARD} p-5`}>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Earned from Sales</p>
                          <p className={`text-3xl font-black ${totalEarned>=0?"text-green-600 dark:text-green-400":"text-red-500"}`}>{fLBP(totalEarned)}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">SUM of (price − cost) × qty per product</p>
                        </div>
                        <div className={`${CARD} p-5`}>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Earned (profitable items only)</p>
                          <p className="text-3xl font-black text-green-600 dark:text-green-400">{fLBP(earnedProfitable)}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Products where price &gt; cost</p>
                        </div>
                        <div className={`${CARD} p-5`}>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Revenue (money collected)</p>
                          <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{fLBP(plData.revenue)}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Total charged to customers</p>
                        </div>
                      </div>

                      <div className={`${CARD} overflow-hidden`}>
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 font-semibold text-sm">
                          Earned per product (price − cost) × qty
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-[#1c1c1c] text-xs text-gray-400">
                              <tr>
                                <th className="px-5 py-3 text-left">Product</th>
                                <th className="px-3 py-3 text-center">Sold</th>
                                <th className="px-3 py-3 text-right">Revenue</th>
                                <th className="px-3 py-3 text-right">Earned</th>
                                <th className="px-3 py-3 text-right">Margin</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                              {sorted.map(p=>(
                                <tr key={p.name} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                  <td className="px-5 py-3 font-medium truncate max-w-[200px]">{p.name}</td>
                                  <td className="px-3 py-3 text-center text-gray-500">{p.quantity}</td>
                                  <td className="px-3 py-3 text-right text-blue-600 dark:text-blue-400">{fLBP(p.revenue)}</td>
                                  <td className={`px-3 py-3 text-right font-bold ${p.profit>0?"text-green-600 dark:text-green-400":p.profit<0?"text-red-500":"text-gray-400"}`}>
                                    {fLBP(p.profit)}
                                  </td>
                                  <td className="px-3 py-3 text-right text-purple-600 dark:text-purple-400">{p.margin}%</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50 dark:bg-[#1c1c1c] border-t-2 border-gray-200 dark:border-white/10">
                              <tr>
                                <td className="px-5 py-3 font-bold text-sm" colSpan={2}>Total</td>
                                <td className="px-3 py-3 text-right font-bold text-blue-600 dark:text-blue-400">{fLBP(plData.revenue)}</td>
                                <td className={`px-3 py-3 text-right font-black text-base ${totalEarned>=0?"text-green-600 dark:text-green-400":"text-red-500"}`}>{fLBP(totalEarned)}</td>
                                <td className="px-3 py-3 text-right font-bold text-purple-600 dark:text-purple-400">
                                  {plData.revenue>0?((totalEarned/plData.revenue)*100).toFixed(1):0}%
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* ═══ TRANSACTIONS ═══ */}
        {tab==="transactions"&&(()=>{
          const TX_PAGE_SIZE = 200;
          const rawTotal = (s) => (s.items||[]).reduce((a,i)=>a+i.price*i.quantity,0)-(s.discountAmount||0)+(s.taxAmount||0);
          // Use ALL sales (unlimited — not filtered by period)
          let txSales = saleTypeFilter==="delivery" ? sales.filter(s=>s.saleType==="delivery")
            : saleTypeFilter==="in_store" ? sales.filter(s=>!s.saleType||s.saleType==="in_store")
            : sales;
          if (txMethodFilter !== "all") txSales = txSales.filter(s=>s.paymentMethod===txMethodFilter);
          if (txStatusFilter !== "all") txSales = txSales.filter(s=>s.status===txStatusFilter);
          if (txSearch.trim()) txSales = txSales.filter(s=>
            (s.customerName||"").toLowerCase().includes(txSearch.toLowerCase()) ||
            (s.items||[]).some(i=>i.name.toLowerCase().includes(txSearch.toLowerCase()))
          );
          if (txDateFrom) txSales = txSales.filter(s=>new Date(s.createdAt) >= new Date(txDateFrom));
          if (txDateTo)   txSales = txSales.filter(s=>new Date(s.createdAt) <= new Date(txDateTo + "T23:59:59"));
          if (txMinAmount) txSales = txSales.filter(s=>parseFloat(toLBPNice(rawTotal(s))) >= parseFloat(txMinAmount));
          if (txMaxAmount) txSales = txSales.filter(s=>parseFloat(toLBPNice(rawTotal(s))) <= parseFloat(txMaxAmount));
          // Sort
          txSales = [...txSales].sort((a,b)=>{
            let va, vb;
            if (txSortBy==="amount")   { va=rawTotal(a);              vb=rawTotal(b); }
            else if (txSortBy==="customer") { va=(a.customerName||"").toLowerCase(); vb=(b.customerName||"").toLowerCase(); }
            else                       { va=new Date(a.createdAt);    vb=new Date(b.createdAt); }
            const cmp = typeof va==="string" ? va.localeCompare(vb) : va-vb;
            return txSortDir==="asc" ? cmp : -cmp;
          });
          const txTotal   = txSales.reduce((s,x)=>s+rawTotal(x),0);
          const totalPages = Math.max(1, Math.ceil(txSales.length / TX_PAGE_SIZE));
          const safePage   = Math.min(txPage, totalPages);
          const txPageSales = txSales.slice((safePage-1)*TX_PAGE_SIZE, safePage*TX_PAGE_SIZE);
          const hasFilter = txSearch||txMethodFilter!=="all"||txStatusFilter!=="all"||saleTypeFilter!=="all"||txDateFrom||txDateTo||txMinAmount||txMaxAmount;
          const clearAll  = ()=>{setTxSearch("");setTxMethodFilter("all");setTxStatusFilter("all");setSaleTypeFilter("all");setTxDateFrom("");setTxDateTo("");setTxMinAmount("");setTxMaxAmount("");setTxSortBy("date");setTxSortDir("desc");setTxPage(1);};
          const selClass  = "px-2 py-1.5 rounded-xl text-xs font-semibold border bg-white dark:bg-[#141414] border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 focus:outline-none focus:border-purple-500";
          const inpClass  = "px-2 py-1.5 rounded-xl text-xs border bg-white dark:bg-[#141414] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-purple-500";
          return (
            <div className="space-y-4">
              {/* Filters */}
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414] p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search */}
                  <input value={txSearch} onChange={e=>{setTxSearch(e.target.value);setTxPage(1);}} placeholder="Search customer / item…"
                    className={inpClass + " w-44"}/>
                  {/* Type */}
                  <select value={saleTypeFilter} onChange={e=>{setSaleTypeFilter(e.target.value);setTxPage(1);}} className={selClass}>
                    <option value="all">All Types</option>
                    <option value="in_store">In-Store</option>
                    <option value="delivery">Delivery</option>
                  </select>
                  {/* Method */}
                  <select value={txMethodFilter} onChange={e=>{setTxMethodFilter(e.target.value);setTxPage(1);}} className={selClass}>
                    <option value="all">All Methods</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="paylater">Pay Later</option>
                    <option value="split">Split</option>
                    <option value="cash_on_delivery">Cash on Delivery</option>
                  </select>
                  {/* Status */}
                  <select value={txStatusFilter} onChange={e=>{setTxStatusFilter(e.target.value);setTxPage(1);}} className={selClass}>
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending_payment">Pending</option>
                    <option value="fully_returned">Returned</option>
                    <option value="voided">Voided</option>
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Date range */}
                  <label className="text-xs text-gray-400 shrink-0">Date:</label>
                  <input type="date" value={txDateFrom} onChange={e=>{setTxDateFrom(e.target.value);setTxPage(1);}}
                    className={inpClass}/>
                  <span className="text-xs text-gray-400">→</span>
                  <input type="date" value={txDateTo} onChange={e=>{setTxDateTo(e.target.value);setTxPage(1);}}
                    className={inpClass}/>
                  {/* Amount range */}
                  <label className="text-xs text-gray-400 shrink-0 ml-2">Amount ل.ل:</label>
                  <input type="number" value={txMinAmount} onChange={e=>{setTxMinAmount(e.target.value);setTxPage(1);}} placeholder="Min"
                    className={inpClass + " w-28"}/>
                  <span className="text-xs text-gray-400">—</span>
                  <input type="number" value={txMaxAmount} onChange={e=>{setTxMaxAmount(e.target.value);setTxPage(1);}} placeholder="Max"
                    className={inpClass + " w-28"}/>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Sort */}
                  <label className="text-xs text-gray-400 shrink-0">Sort by:</label>
                  {[
                    {val:"date",     label:"Date"},
                    {val:"amount",   label:"Amount"},
                    {val:"customer", label:"Customer A→Z"},
                  ].map(opt=>(
                    <button key={opt.val} onClick={()=>{ if(txSortBy===opt.val) setTxSortDir(d=>d==="asc"?"desc":"asc"); else {setTxSortBy(opt.val); setTxSortDir(opt.val==="customer"?"asc":"desc");} setTxPage(1); }}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${txSortBy===opt.val?"bg-purple-600 text-white border-purple-600":"bg-white dark:bg-[#141414] border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300"}`}>
                      {opt.label}
                      {txSortBy===opt.val && <span>{txSortDir==="asc" ? "↑" : "↓"}</span>}
                    </button>
                  ))}
                  {hasFilter && (
                    <button onClick={clearAll}
                      className="px-2 py-1.5 rounded-xl text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-500/30 ml-1">
                      Clear all
                    </button>
                  )}
                  <p className="text-xs text-gray-400 ml-auto">
                    {txSales.length} {t.transactionsDesc} · {t.total}: <span className="font-bold text-green-600">{fLBP(txTotal)}</span>
                  </p>
                </div>
              </div>
              <div className={`${CARD} overflow-hidden`}>
                {txSales.length===0?<Empty msg={t.noSales}/>:(
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-[#1c1c1c] text-xs text-gray-400"><tr>
                        <th className="px-5 py-3 text-left">{t.date}</th>
                        <th className="px-4 py-3 text-left">{t.items}</th>
                        <th className="px-4 py-3 text-right">{t.total}</th>
                        <th className="px-4 py-3 text-center">{t.payment}</th>
                        <th className="px-4 py-3 text-center">Type</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                        {txPageSales.map(sale=>(
                          <tr key={sale._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <td className="px-5 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">{fmtDate(sale.createdAt)}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {(sale.items||[]).map((item,i)=>(
                                  <span key={i} className="text-xs bg-gray-100 dark:bg-[#252525] px-2 py-0.5 rounded-full whitespace-nowrap">{item.name} ×{item.quantity}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">
                              <div className="text-green-600 dark:text-green-400">{fLBP(rawTotal(sale))}</div>
                              {(sale.totalRefunded||0)>0&&<div className="text-xs text-red-500">−{fLBP(sale.totalRefunded)}</div>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${METHOD_COLOR[sale.paymentMethod]||"bg-gray-100 text-gray-600"}`}>
                                {sale.paymentMethod==="paylater"?t.credit:sale.paymentMethod?.replace("_"," ")}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {sale.saleType==="delivery"
                                ? <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium">🚚 Delivery</span>
                                : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium">In-Store</span>
                              }
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge(sale.status)}`}>{sale.status?.replace("_"," ")}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {sale.status!=="fully_returned"&&(
                                  <button onClick={()=>setReturnSale(sale)} title="Return"
                                    className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition"><RotateCcw size={12}/></button>
                                )}
                                {sale.status==="completed"&&(
                                  <button onClick={()=>setVoidModal(sale)} title="Void"
                                    className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition"><AlertCircle size={12}/></button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-[#1c1c1c]">
                        <tr>
                          <td className="px-5 py-3 font-semibold text-xs text-gray-500" colSpan={2}>
                            {txSales.length} {t.transactionsDesc} — page {safePage} of {totalPages}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">{fLBP(txTotal)}</td>
                          <td colSpan={4}/>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button onClick={()=>setTxPage(1)} disabled={safePage===1}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414] text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 transition">
                    «
                  </button>
                  <button onClick={()=>setTxPage(p=>Math.max(1,p-1))} disabled={safePage===1}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414] text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 transition">
                    ‹ Prev
                  </button>
                  {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>Math.abs(p-safePage)<=2||p===1||p===totalPages).reduce((acc,p,idx,arr)=>{
                    if(idx>0&&arr[idx-1]!==p-1) acc.push("…");
                    acc.push(p);
                    return acc;
                  },[]).map((p,i)=>(
                    typeof p==="string"
                      ? <span key={i} className="px-1 text-xs text-gray-400">…</span>
                      : <button key={p} onClick={()=>setTxPage(p)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${safePage===p?"bg-purple-600 text-white border-purple-600":"border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414] text-gray-600 dark:text-gray-300 hover:bg-gray-50"}`}>
                          {p}
                        </button>
                  ))}
                  <button onClick={()=>setTxPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414] text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 transition">
                    Next ›
                  </button>
                  <button onClick={()=>setTxPage(totalPages)} disabled={safePage===totalPages}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414] text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 transition">
                    »
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ═══ CASHIERS ═══ */}
        {tab==="cashiers"&&(
          <div className={`${CARD} overflow-hidden`}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 font-semibold text-sm">Cashier performance</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#1c1c1c] text-xs text-gray-400"><tr>
                <th className="px-5 py-3 text-left">Cashier</th><th className="px-4 py-3 text-center">Orders</th>
                <th className="px-4 py-3 text-right">Revenue</th><th className="px-4 py-3 text-right">Refunds</th><th className="px-4 py-3 text-right">Net</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {cashierPerf.map(c=>(
                  <tr key={c.name} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-5 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{c.orders}</td>
                    <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-semibold">{fLBP(c.revenue)}</td>
                    <td className="px-4 py-3 text-right text-red-500">{fLBP(c.refunds)}</td>
                    <td className="px-4 py-3 text-right font-bold">{fLBP(c.revenue-c.refunds)}</td>
                  </tr>
                ))}
                {cashierPerf.length===0&&<tr><td colSpan={5} className="text-center py-10 text-gray-400">{t.noData}</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ PAY LATER ═══ */}
        {tab==="paylater"&&(
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              {[
                {label:t.totalCreditGiven,value:fLBP(totalCreditGiven),color:"text-orange-600 dark:text-orange-400",bg:"bg-orange-50 dark:bg-orange-900/20"},
                {label:t.totalPaidBack,   value:fLBP(totalCreditPaid), color:"text-green-600  dark:text-green-400", bg:"bg-green-50  dark:bg-green-900/20" },
                {label:t.outstandingBal,  value:fLBP(outstandingCredit),color:"text-red-600   dark:text-red-400",   bg:"bg-red-50    dark:bg-red-900/20"  },
              ].map(({label,value,color,bg})=>(
                <div key={label} className={`${CARD} ${bg} p-5`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  <p className={`text-2xl font-bold mt-2 ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className={`${CARD} p-5`}>
              <h3 className="font-semibold text-sm mb-1">{t.payLaterSales} — {period==="day"?t.today:period==="week"?t.thisWeek:period==="month"?t.thisMonth:t.thisYear}</h3>
              <p className="text-xs text-gray-400 mb-4">{t.payLaterPeriodDesc}</p>
              {filteredSales.filter(s=>s.paymentMethod==="paylater").length===0?<Empty msg={t.noPayLaterSales}/>:(
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100 dark:border-white/10 text-xs text-gray-400">
                    <th className="pb-2 text-left">{t.date}</th><th className="pb-2 text-left">Customer</th>
                    <th className="pb-2 text-center">{t.items}</th><th className="pb-2 text-right">{t.total}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {filteredSales.filter(s=>s.paymentMethod==="paylater").map(s=>(
                      <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="py-2.5 text-gray-500 text-xs">{fmtDate(s.createdAt)}</td>
                        <td className="py-2.5">{s.customerName||"—"}</td>
                        <td className="py-2.5 text-center">{s.items.reduce((a,i)=>a+i.quantity,0)}</td>
                        <td className="py-2.5 text-right font-semibold text-red-500">{fLBP(s.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="border-t-2 border-gray-200 dark:border-white/10">
                    <td className="pt-3 font-semibold text-xs text-gray-500" colSpan={3}>{t.periodTotal}</td>
                    <td className="pt-3 text-right font-bold text-red-600">{fLBP(payLaterTotal)}</td>
                  </tr></tfoot>
                </table>
              )}
            </div>
            <div className={`${CARD} p-5`}>
              <h3 className="font-semibold text-sm mb-1 flex items-center gap-2"><AlertCircle size={14} className="text-red-500"/>{t.openAccounts}</h3>
              <p className="text-xs text-gray-400 mb-4">{t.openAccountsDesc}</p>
              {holdSales.length===0?<Empty msg={t.noOpenAccounts}/>:(
                <div className="space-y-3">
                  {holdSales.map(h=>(
                    <div key={h._id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#1c1c1c] border border-gray-100 dark:border-white/5">
                      <div>
                        <p className="font-semibold text-sm">{h.customerName}</p>
                        {h.phone&&<p className="text-xs text-gray-400">{h.phone}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{t.total}: ${h.total?.toFixed(2)} · {t.paid}: ${h.paid?.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-500 text-lg">${h.balance?.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{t.balance}</p>
                        <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{width:`${Math.min(100,h.total>0?(h.paid/h.total)*100:0)}%`}}/>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{h.total>0?Math.round((h.paid/h.total)*100):0}% {t.paid}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ ALERTS ═══ */}
        {tab==="alerts"&&(()=>{
          const expiryBadge=dL=>{
            if(dL<0) return{label:t.alertBadgeExpired,cls:"bg-red-600 text-white"};
            if(dL===0)return{label:t.today_exp,       cls:"bg-red-600 text-white"};
            if(dL<=7) return{label:t.alertBadgeCritical,cls:"bg-red-500 text-white"};
            if(dL<=14)return{label:t.alertBadgeWarning, cls:"bg-amber-500 text-white"};
            return     {label:t.alertBadgeSoon,         cls:"bg-yellow-400 text-yellow-900"};
          };
          const stockBadge=s=>{
            if(s===0)return{label:"OUT",              cls:"bg-red-600 text-white"};
            if(s<=2) return{label:t.alertBadgeCritical,cls:"bg-red-500 text-white"};
            return       {label:t.alertBadgeWarning,  cls:"bg-amber-500 text-white"};
          };
          const totalAlerts=alerts.lowStock.length+alerts.expiring.length;
          return(
            <div className="space-y-5">
              {totalAlerts===0?(
                <div className={`${CARD} p-8 text-center`}>
                  <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle size={24} className="text-green-600 dark:text-green-400"/>
                  </div>
                  <p className="font-semibold text-green-700 dark:text-green-400">{t.noAlerts}</p>
                </div>
              ):(
                <div className="grid grid-cols-2 gap-4">
                  <div className={`${CARD} p-4 bg-amber-50 dark:bg-amber-900/15`}>
                    <div className="flex items-center gap-2 mb-1"><Package size={16} className="text-amber-600"/><p className="text-xs text-gray-500">{t.lowStockAlerts}</p></div>
                    <p className="text-3xl font-bold text-amber-600">{alerts.lowStock.length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.lowStockDesc}</p>
                  </div>
                  <div className={`${CARD} p-4 bg-red-50 dark:bg-red-900/15`}>
                    <div className="flex items-center gap-2 mb-1"><AlertTriangle size={16} className="text-red-600"/><p className="text-xs text-gray-500">{t.expiryAlerts}</p></div>
                    <p className="text-3xl font-bold text-red-600">{alerts.expiring.length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.expiryDesc}</p>
                  </div>
                </div>
              )}
              {alerts.lowStock.length>0&&(
                <div className={`${CARD} overflow-hidden`}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-amber-500"/>
                      <h3 className="font-semibold text-sm">{t.lowStockAlerts}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">{alerts.lowStock.length}</span>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-[#1c1c1c] text-xs text-gray-400"><tr>
                      <th className="px-5 py-3 text-left">Product</th><th className="px-4 py-3 text-left">{t.category}</th>
                      <th className="px-4 py-3 text-center">{t.stockLevel}</th><th className="px-4 py-3 text-right">{t.price||"Price"}</th><th className="px-4 py-3 text-center">Status</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                      {alerts.lowStock.map(p=>{
                        const{label,cls}=stockBadge(p.stock);
                        return(
                          <tr key={p._id} className={p.stock===0?"bg-red-50/50 dark:bg-red-900/10":"hover:bg-gray-50 dark:hover:bg-white/5"}>
                            <td className="px-5 py-3 font-medium">{p.name}</td>
                            <td className="px-4 py-3 text-gray-500">{p.category||"—"}</td>
                            <td className="px-4 py-3 text-center"><span className={`text-lg font-bold ${p.stock===0?"text-red-600":"text-amber-600"}`}>{p.stock}</span><span className="text-xs text-gray-400 block">{t.unitsLeft}</span></td>
                            <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">${p.price?.toFixed(2)}</td>
                            <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${cls}`}>{label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {alerts.expiring.length>0&&(
                <div className={`${CARD} overflow-hidden`}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-500"/>
                      <h3 className="font-semibold text-sm">{t.expiryAlerts}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">{alerts.expiring.length}</span>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-[#1c1c1c] text-xs text-gray-400"><tr>
                      <th className="px-5 py-3 text-left">Product</th><th className="px-4 py-3 text-left">{t.category}</th>
                      <th className="px-4 py-3 text-center">{t.stockLevel}</th><th className="px-4 py-3 text-center">{t.expiryDate}</th><th className="px-4 py-3 text-center">Status</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                      {alerts.expiring.map(p=>{
                        const{label,cls}=expiryBadge(p.daysLeft);
                        return(
                          <tr key={p._id} className={p.expired?"bg-red-50/60 dark:bg-red-900/15":p.daysLeft<=7?"bg-orange-50/40 dark:bg-orange-900/10":""}>
                            <td className="px-5 py-3 font-medium">{p.name}</td>
                            <td className="px-4 py-3 text-gray-500">{p.category||"—"}</td>
                            <td className="px-4 py-3 text-center"><span className="font-semibold">{p.stock}</span><span className="text-xs text-gray-400 block">{t.unitsLeft}</span></td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-semibold text-sm block ${p.expired?"text-red-600":p.daysLeft<=7?"text-orange-500":"text-gray-700 dark:text-gray-300"}`}>{fmtD(p.expiryDate)}</span>
                              <span className={`text-xs ${p.expired?"text-red-500 font-semibold":"text-gray-400"}`}>
                                {p.expired?`${Math.abs(p.daysLeft)} ${t.days} ago`:p.daysLeft===0?t.today_exp:p.daysLeft===1?t.tomorrow:`${t.expiresIn} ${p.daysLeft} ${t.days}`}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${cls}`}>{label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* ═══ AUDIT LOG ═══ */}
        {tab==="audit"&&(
          <div className={`${CARD} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-[#1c1c1c] text-xs text-gray-400"><tr>
                  <th className="px-5 py-3 text-left">Time</th><th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Action</th><th className="px-4 py-3 text-left">Description</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {auditLogs.map(log=>(
                    <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                      <td className="px-4 py-3 font-medium">{log.username||log.userId?.username||"—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                          log.action.includes("void")||log.action.includes("delet")?"bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                          :log.action.includes("return")?"bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                          :log.action==="sale_created"?"bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          :"bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                        }`}>{log.action.replace(/_/g," ")}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{log.description}</td>
                    </tr>
                  ))}
                  {auditLogs.length===0&&<tr><td colSpan={4} className="text-center py-10 text-gray-400">No audit logs yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {returnSale&&<ReturnModal sale={returnSale} onClose={()=>setReturnSale(null)} onSuccess={()=>{setReturnSale(null);load();}}/>}

      {voidModal&&(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#141414] rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500"/>
              <h2 className="font-bold">Void Sale #{voidModal._id?.toString().slice(-6)}</h2>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">Reverses the sale and restocks all items. Cannot be undone.</p>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">Reason *</label>
                <input value={voidReason} onChange={e=>setVoidReason(e.target.value)} placeholder="Enter reason..."
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] border-2 border-transparent focus:border-red-400 outline-none text-sm transition"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">Manager PIN (if set)</label>
                <input value={voidPin} onChange={e=>setVoidPin(e.target.value)} type="password" placeholder="PIN"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] border-2 border-transparent focus:border-red-400 outline-none text-sm transition"/>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={()=>{setVoidModal(null);setVoidPin("");setVoidReason("");}}
                  className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 transition">Cancel</button>
                <button onClick={handleVoid} disabled={voidLoading||!voidReason.trim()}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {voidLoading?<><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Voiding...</>:"Void Sale"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}