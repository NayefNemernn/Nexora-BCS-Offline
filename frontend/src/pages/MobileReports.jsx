import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth }     from "../context/AuthContext";
import toast           from "react-hot-toast";
import {
  TrendingUp, ShoppingCart, Package, DollarSign,
  Users, AlertTriangle, Send, RefreshCw, ChevronDown,
} from "lucide-react";

const PERIODS = [
  { key: "today", label: "Today"      },
  { key: "week",  label: "This Week"  },
  { key: "month", label: "This Month" },
  { key: "year",  label: "This Year"  },
];

const PM_EMOJI = {
  cash: "💵", card: "💳", paylater: "🕐",
  split: "➗", bank_transfer: "🏦", cash_on_delivery: "🚚",
};

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-white dark:bg-[#141414] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5">
    <div className="flex items-center gap-2 mb-1">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={14} className="text-white" />
      </div>
      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">{label}</span>
    </div>
    <p className="text-xl font-black text-gray-900 dark:text-white">{value}</p>
    {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

export default function MobileReports() {
  const { formatUSD } = useCurrency();
  const { store }     = useAuth();

  const [period,  setPeriod]  = useState("today");
  const [stats,   setStats]   = useState(null);
  const [sales,   setSales]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, sRes] = await Promise.all([
        api.get(`/dashboard?period=${period}`),
        api.get("/sales?limit=30"),
      ]);
      setStats(dRes.data);
      setSales(sRes.data || []);
    } catch (err) {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // Compute payment method breakdown from sales list
  const payMethods = React.useMemo(() => {
    const map = {};
    const since = {
      today: new Date(new Date().setHours(0,0,0,0)),
      week:  new Date(Date.now() - 7 * 86400000),
      month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      year:  new Date(new Date().getFullYear(), 0, 1),
    }[period];

    sales.filter(s => new Date(s.createdAt) >= since && s.status !== "voided").forEach(s => {
      const m = s.paymentMethod || "unknown";
      map[m] = map[m] || { total: 0, count: 0 };
      map[m].total += s.total;
      map[m].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [sales, period]);

  const recentSales = React.useMemo(() => {
    const since = {
      today: new Date(new Date().setHours(0,0,0,0)),
      week:  new Date(Date.now() - 7 * 86400000),
      month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      year:  new Date(new Date().getFullYear(), 0, 1),
    }[period];
    return sales
      .filter(s => new Date(s.createdAt) >= since && s.status !== "voided")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [sales, period]);

  const visibleSales = showAll ? recentSales : recentSales.slice(0, 10);

  const sendToTelegram = async () => {
    setSending(true);
    try {
      await api.post(`/telegram/report?period=${period}`);
      toast.success("Report sent to Telegram ✅");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const revenue    = stats?.[`${period === "today" ? "today" : period}Sales`]   ?? stats?.todaySales   ?? 0;
  const orders     = stats?.[`${period === "today" ? "today" : period}Orders`]  ?? stats?.todayOrders  ?? 0;
  const periodKey  = period === "today" ? "today" : period;
  const rev = stats?.[`${periodKey}Sales`]  ?? 0;
  const ord = stats?.[`${periodKey}Orders`] ?? 0;
  const avgOrder = ord > 0 ? rev / ord : 0;

  return (
    <div className="max-w-lg mx-auto px-3 pb-16">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-100 dark:bg-neutral-950 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-black text-gray-900 dark:text-white">📊 Reports</h1>
          <button onClick={load} className="p-2 rounded-lg bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 text-gray-500">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Period tabs */}
        <div className="flex gap-1.5 bg-white dark:bg-[#141414] p-1 rounded-xl border border-gray-100 dark:border-white/5">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                period === p.key
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="space-y-4 mt-3">

          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={DollarSign} label="Revenue" value={formatUSD(rev)}
              sub={`${ord} orders`} color="bg-blue-600" />
            <StatCard icon={ShoppingCart} label="Orders" value={ord}
              sub={avgOrder > 0 ? `avg ${formatUSD(avgOrder)}` : "—"} color="bg-emerald-600" />
            <StatCard icon={Package} label="Products" value={stats?.totalProducts ?? "—"}
              sub={`${stats?.lowStock ?? 0} low stock`} color="bg-amber-500" />
            <StatCard icon={Users} label="Customers" value={stats?.customers ?? "—"}
              sub={stats?.payLaterAccounts > 0 ? `${formatUSD(stats.payLaterOutstanding)} owed` : "no debt"}
              color="bg-purple-600" />
          </div>

          {/* Low stock alert */}
          {(stats?.lowStockProducts?.length > 0) && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-amber-600" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Low Stock</span>
              </div>
              <div className="space-y-1">
                {stats.lowStockProducts.map(p => (
                  <div key={p._id} className="flex justify-between text-xs text-amber-700 dark:text-amber-300">
                    <span>{p.name}</span>
                    <span className="font-bold">{p.stock} left</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top products */}
          {stats?.topProducts?.length > 0 && (
            <div className="bg-white dark:bg-[#141414] rounded-2xl p-4 border border-gray-100 dark:border-white/5">
              <h2 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">🏆 Top Products</h2>
              <div className="space-y-2">
                {stats.topProducts.map((p, i) => {
                  const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
                  const pct = stats.topProducts[0]?.sold > 0 ? (p.sold / stats.topProducts[0].sold) * 100 : 0;
                  return (
                    <div key={p._id}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-800 dark:text-gray-200 font-medium">{medals[i]} {p.name}</span>
                        <span className="text-gray-500 font-semibold">×{p.sold}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment methods */}
          {payMethods.length > 0 && (
            <div className="bg-white dark:bg-[#141414] rounded-2xl p-4 border border-gray-100 dark:border-white/5">
              <h2 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">💳 Payment Methods</h2>
              <div className="space-y-2">
                {payMethods.map(([method, data]) => (
                  <div key={method} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 dark:text-gray-300">
                      {PM_EMOJI[method] || "💰"} {method.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-gray-900 dark:text-white">{formatUSD(data.total)}</span>
                      <span className="text-gray-400 ml-1">({data.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent sales */}
          <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
              <h2 className="text-xs font-bold text-gray-700 dark:text-gray-300">
                🧾 Recent Sales ({recentSales.length})
              </h2>
            </div>
            {recentSales.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-8">No sales in this period</p>
            ) : (
              <>
                <div className="divide-y divide-gray-50 dark:divide-white/5">
                  {visibleSales.map(s => {
                    const t = new Date(s.createdAt);
                    const timeStr = t.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
                    const dateStr = t.toLocaleDateString("en-GB",{day:"2-digit",month:"short"});
                    return (
                      <div key={s._id} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                            {s.customerName || "Walk-in"}
                          </p>
                          <p className="text-[10px] text-gray-400">{dateStr} · {timeStr}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{formatUSD(s.total)}</p>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                            s.paymentMethod === "cash"      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" :
                            s.paymentMethod === "card"      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" :
                            s.paymentMethod === "paylater"  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" :
                            "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                          }`}>
                            {(s.paymentMethod || "—").replace(/_/g," ")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {recentSales.length > 10 && (
                  <button onClick={() => setShowAll(v => !v)}
                    className="w-full flex items-center justify-center gap-1 py-2.5 text-xs text-blue-600 dark:text-blue-400 font-semibold border-t border-gray-50 dark:border-white/5">
                    {showAll ? "Show less" : `Show all ${recentSales.length}`}
                    <ChevronDown size={12} className={`transition-transform ${showAll ? "rotate-180" : ""}`} />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Send to Telegram */}
          <button onClick={sendToTelegram} disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
              bg-[#229ED9] hover:bg-[#1a8fc4] active:scale-95 transition
              text-white text-sm font-bold shadow-lg shadow-[#229ED9]/30 disabled:opacity-60">
            <Send size={15} />
            {sending ? "Sending…" : `Send ${PERIODS.find(p=>p.key===period)?.label} Report to Telegram`}
          </button>

          {!store?.telegramBotToken && (
            <p className="text-center text-[11px] text-gray-400">
              ⚙️ Configure your Telegram bot in Store Settings to enable sending reports.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
