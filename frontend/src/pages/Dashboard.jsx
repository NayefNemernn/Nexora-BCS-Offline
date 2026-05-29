import { useEffect, useState } from "react";
import { useRefresh } from "../context/RefreshContext";
import { useLang } from "../context/LanguageContext";
import { useDashboardTranslation } from "../hooks/useDashboardTranslation";
import { getDashboardStats } from "../api/dashboard.api";
import { motion } from "framer-motion";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { TrendingUp, Package, AlertTriangle, DollarSign, CreditCard } from "lucide-react";

const CARD = "p-6 rounded-2xl bg-white dark:bg-[#141414] shadow-[6px_6px_16px_#d1d5db,-6px_-6px_16px_#ffffff] dark:shadow-[6px_6px_16px_#050505,-6px_-6px_16px_#1a1a1a]";

const PERIODS = ["today", "week", "month", "year"];

export default function Dashboard() {
  const t                     = useDashboardTranslation();
  const { lang }              = useLang();
  const { tick }              = useRefresh();
  const isAr                  = lang === "ar";

  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [salesMode, setSalesMode] = useState("today");
  const [showSales,    setShowSales]    = useState(true);
  const [showTop,      setShowTop]      = useState(true);
  const [showLow,      setShowLow]      = useState(true);
  const [showReceipts, setShowReceipts] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDashboardStats(salesMode);
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tick, salesMode]);

  const salesValue = salesMode === "today" ? stats?.todaySales
    : salesMode === "week"  ? stats?.weekSales
    : salesMode === "month" ? stats?.monthSales
    : stats?.yearSales;

  const salesLabel = salesMode === "today" ? t.todaySales
    : salesMode === "week"  ? t.weekSales
    : salesMode === "month" ? t.monthSales
    : t.yearSales;

  const chartAxisLabel = salesMode === "today" ? t.byHour
    : salesMode === "year" ? t.byMonth
    : t.byDay;

  if (loading) return (
    <div className="p-6 animate-pulse text-gray-500 dark:text-gray-400">{t.loading}</div>
  );

  const Toggle = ({ label, state, set }) => (
    <button onClick={() => set(!state)}
      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-[transform,box-shadow] duration-75 select-none
        ${state
          ? "bg-blue-600 text-white shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px]"
          : "bg-white dark:bg-[#141414] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px]"}`}>
      {label}
    </button>
  );

  const KpiCard = ({ title, value, icon, color, bg }) => (
    <motion.div whileHover={{ scale: 1.03 }} className={`${CARD} ${bg}`}>
      <div className={`${color} mb-2`}>{icon}</div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </motion.div>
  );

  const periodLabel = {
    today: t.today,
    week:  t.week,
    month: t.month,
    year:  t.year,
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp size={22} className="text-blue-500" /> {t.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t.subtitle}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setSalesMode(p)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-[transform,box-shadow] duration-75 select-none
                  ${salesMode === p
                    ? "bg-blue-600 text-white shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px]"
                    : "bg-white dark:bg-[#141414] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px]"}`}>
                {periodLabel[p]}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiCard
            title={salesLabel}
            value={<motion.span key={salesValue} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              ${Number(salesValue || 0).toFixed(2)}
            </motion.span>}
            icon={<DollarSign size={18}/>}
            color="text-green-600 dark:text-green-400"
            bg="bg-green-50 dark:bg-green-900/20"
          />
          <KpiCard title={t.products}  value={stats?.totalProducts ?? 0} icon={<Package size={18}/>}       color="text-blue-600 dark:text-blue-400"     bg="bg-blue-50 dark:bg-blue-900/20"   />
          <KpiCard title={t.lowStock}  value={stats?.lowStock      ?? 0} icon={<AlertTriangle size={18}/>} color="text-red-600 dark:text-red-400"       bg="bg-red-50 dark:bg-red-900/20"     />
          <KpiCard title={t.customers} value={stats?.customers     ?? 0} icon={<TrendingUp size={18}/>}    color="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-900/20"/>
          <KpiCard
            title={t.payLaterOutstanding}
            value={<motion.span key={stats?.payLaterOutstanding} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              ${Number(stats?.payLaterOutstanding || 0).toFixed(2)}
            </motion.span>}
            icon={<CreditCard size={18}/>}
            color="text-amber-600 dark:text-amber-400"
            bg="bg-amber-50 dark:bg-amber-900/20"
          />
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-2">
          <Toggle label={t.salesChart}    state={showSales}    set={setShowSales}/>
          <Toggle label={t.topProducts}   state={showTop}      set={setShowTop}/>
          <Toggle label={t.lowStock}      state={showLow}      set={setShowLow}/>
          <Toggle label={t.receipts}      state={showReceipts} set={setShowReceipts}/>
        </div>

        {/* Sales chart */}
        {showSales && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={CARD}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">{t.salesChart}</h3>
              <span className="text-xs text-gray-400">{chartAxisLabel}</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats?.salesChart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis dataKey="day" tick={{ fontSize: 11 }}/>
                <YAxis tick={{ fontSize: 11 }}/>
                <Tooltip formatter={v => [`$${Number(v).toFixed(2)}`, t.periodSales]}/>
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }}/>
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Grid: top products / low stock / recent receipts */}
        <div className="grid md:grid-cols-3 gap-5">

          {showTop && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={CARD}>
              <h3 className="font-semibold mb-4 text-sm">{t.topProducts}</h3>
              <div className="space-y-2">
                {stats?.topProducts?.length ? stats.topProducts.map((p, i) => (
                  <div key={p._id} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-white/5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                      <span className="truncate">{p.name}</span>
                    </div>
                    <span className="font-semibold text-blue-600 dark:text-blue-400 shrink-0">{p.sold} {t.sold}</span>
                  </div>
                )) : <p className="text-sm text-gray-400">{t.noData}</p>}
              </div>
            </motion.div>
          )}

          {showLow && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={CARD}>
              <h3 className="font-semibold mb-4 text-sm">{t.lowStockProducts}</h3>
              <div className="space-y-2">
                {stats?.lowStockProducts?.length ? stats.lowStockProducts.map(p => (
                  <div key={p._id} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-white/5 text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="font-semibold text-red-500 shrink-0">{p.stock} {t.stock}</span>
                  </div>
                )) : <p className="text-sm text-gray-400">{t.noData}</p>}
              </div>
            </motion.div>
          )}

          {showReceipts && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={CARD}>
              <h3 className="font-semibold mb-4 text-sm">{t.recentReceipts}</h3>
              <div className="space-y-2">
                {stats?.recentSales?.length ? stats.recentSales.map(r => (
                  <div key={r._id} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-white/5 text-sm">
                    <span className="truncate">{r.customerName || t.walkIn}</span>
                    <span className="font-semibold text-green-600 dark:text-green-400 shrink-0">${r.total}</span>
                  </div>
                )) : <p className="text-sm text-gray-400">{t.noData}</p>}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
