import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { TrendingUp, Users, ShoppingBag, ChefHat, Star, Gamepad2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

const PERIODS  = ["daily", "weekly", "monthly", "yearly"];
const COLORS   = ["#c8793a", "#8b4513", "#ffd700", "#90ee90", "#7ec8e3", "#ff8080"];
const TIER_CLR = { bronze: "#cd7f32", silver: "#c0c0c0", gold: "#ffd700", diamond: "#b9f2ff" };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Card({ title, value, sub, icon: Icon, color = "#c8793a" }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>{title}</p>
          <p style={{ color: "#fff", fontWeight: 900, fontSize: 24, margin: "6px 0 2px" }}>{value}</p>
          {sub && <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: 0 }}>{sub}</p>}
        </div>
        {Icon && <div style={{ background: `rgba(200,121,58,0.15)`, borderRadius: 12, padding: 10 }}><Icon size={20} color={color} /></div>}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 16, margin: "28px 0 12px", borderLeft: "3px solid #c8793a", paddingLeft: 12 }}>{children}</h3>;
}

export default function CafeReports() {
  const { store, currencySymbol } = useAuth();
  const [period, setPeriod] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [data,    setData]   = useState({});

  useEffect(() => { fetchAll(); }, [period]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sales, peak, items, tables, kitchen, reservations, customers, games] = await Promise.all([
        api.get(`/cafe/reports/sales?period=${period}`).then(r => r.data),
        api.get(`/cafe/reports/peak-hours?period=${period}`).then(r => r.data),
        api.get(`/cafe/reports/items?period=${period}`).then(r => r.data),
        api.get(`/cafe/reports/tables?period=${period}`).then(r => r.data),
        api.get(`/cafe/reports/kitchen?period=${period}`).then(r => r.data),
        api.get(`/cafe/reports/reservations?period=${period}`).then(r => r.data),
        api.get(`/cafe/reports/customers?period=${period}`).then(r => r.data),
        api.get(`/cafe/reports/games?period=${period}`).then(r => r.data),
      ]);
      setData({ sales, peak, items, tables, kitchen, reservations, customers, games });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  /* Build peak heatmap grid */
  const buildHeatmap = () => {
    const map = {};
    (data.peak?.data || []).forEach(d => {
      map[`${d._id.day}-${d._id.hour}`] = d.count;
    });
    const maxVal = Math.max(...Object.values(map), 1);
    return { map, maxVal };
  };

  const { map: heatMap, maxVal } = buildHeatmap();

  const fmt  = (n) => `${currencySymbol}${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const fmtN = (n) => (n || 0).toLocaleString();

  return (
    <div style={{ padding: "20px 20px 60px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header + period selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 22, margin: 0 }}>☕ Café Reports</h2>
        <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 4 }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "6px 14px", borderRadius: 8, border: "none",
              background: period === p ? "#c8793a" : "transparent",
              color: period === p ? "#fff" : "rgba(255,255,255,0.4)",
              fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "capitalize",
              transition: "all 0.15s",
            }}>{p}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: "rgba(255,255,255,0.3)" }}>Loading reports…</div>
      ) : (
        <>
          {/* ── Revenue ── */}
          <SectionTitle>Revenue</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
            <Card title="Total Revenue"  value={fmt(data.sales?.totalRevenue)}   icon={TrendingUp} />
            <Card title="Total Orders"   value={fmtN(data.sales?.totalOrders)}   icon={ShoppingBag} />
            <Card title="Avg Order"      value={fmt(data.sales?.avgOrderValue)}   icon={TrendingUp} />
          </div>
          {(data.sales?.grouped || []).length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "16px 8px 8px" }}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.sales.grouped}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="_id" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1a0800", border: "1px solid rgba(200,121,58,0.4)", borderRadius: 10 }} labelStyle={{ color: "#fff" }} />
                  <Line type="monotone" dataKey="revenue" stroke="#c8793a" strokeWidth={2} dot={false} name={`Revenue (${currencySymbol})`} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Peak Hours ── */}
          <SectionTitle>Peak Hours</SectionTitle>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px repeat(24, 1fr)", gap: 2, minWidth: 600 }}>
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 9 }}>{h}</div>
              ))}
              {DAY_LABELS.map((day, d) => (
                <>
                  <div key={day} style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, display: "flex", alignItems: "center" }}>{day}</div>
                  {Array.from({ length: 24 }, (_, h) => {
                    const v   = heatMap[`${d + 1}-${h}`] || 0;
                    const pct = v / maxVal;
                    return (
                      <div key={h} title={`${day} ${h}:00 — ${v} orders`} style={{
                        height: 16, borderRadius: 3,
                        background: pct > 0 ? `rgba(200,121,58,${0.15 + pct * 0.85})` : "rgba(255,255,255,0.04)",
                      }} />
                    );
                  })}
                </>
              ))}
            </div>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, margin: "8px 0 0", textAlign: "right" }}>Columns = hours (0–23) | Rows = days of week</p>
          </div>

          {/* ── Menu Performance ── */}
          <SectionTitle>Menu Performance</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* Top by revenue */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "16px 8px 8px" }}>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: "0 0 12px 8px", fontWeight: 700, textTransform: "uppercase" }}>Top 10 by Revenue</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(data.items?.top10ByRevenue || []).slice(0, 8)} layout="vertical">
                  <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#1a0800", border: "1px solid rgba(200,121,58,0.3)", borderRadius: 8 }} formatter={v => [fmt(v), "Revenue"]} />
                  <Bar dataKey="revenue" fill="#c8793a" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Category donut */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "16px 8px" }}>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: "0 0 12px 8px", fontWeight: 700, textTransform: "uppercase" }}>By Category</p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.items?.categories || []} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {(data.items?.categories || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => [fmt(v), "Revenue"]} contentStyle={{ background: "#1a0800", border: "1px solid rgba(200,121,58,0.3)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Slow movers */}
          {(data.items?.bottom5 || []).length > 0 && (
            <div style={{ background: "rgba(200,50,50,0.08)", border: "1px solid rgba(200,50,50,0.15)", borderRadius: 14, padding: "12px 16px" }}>
              <p style={{ color: "rgba(200,80,80,0.9)", fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>⚠️ Slow Movers</p>
              {data.items.bottom5.map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{item.name}</span>
                  <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{item.units} sold · {fmt(item.revenue)}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Table Analytics ── */}
          <SectionTitle>Table Analytics</SectionTitle>
          {(data.tables?.tables || []).length > 0 ? (
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "16px 8px 8px" }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.tables.tables}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="tableNumber" tickFormatter={v => `T${v}`} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1a0800", border: "1px solid rgba(200,121,58,0.3)", borderRadius: 8 }} formatter={(v, n) => [n === "revenue" ? fmt(v) : `${v} min`, n]} />
                  <Bar dataKey="revenue"    fill="#c8793a" name="Revenue"      radius={[4,4,0,0]} />
                  <Bar dataKey="avgMinutes" fill="rgba(200,121,58,0.35)" name="Avg time (min)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No closed orders in this period</p>}

          {/* ── Kitchen ── */}
          <SectionTitle>Kitchen Stats</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
            <Card title="Total Orders"  value={fmtN(data.kitchen?.totalOrders)} icon={ChefHat} />
            <Card title="Total Items"   value={fmtN(data.kitchen?.totalItems)}  icon={ShoppingBag} />
          </div>
          {(data.kitchen?.categoryBreakdown || []).length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "16px 8px 8px" }}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.kitchen.categoryBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="category" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1a0800", border: "1px solid rgba(200,121,58,0.3)", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#8b4513" name="Items" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Reservations ── */}
          <SectionTitle>Reservations</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12, marginBottom: 16 }}>
            <Card title="Total"     value={fmtN(data.reservations?.total)}     />
            <Card title="Completed" value={fmtN(data.reservations?.completed)} />
            <Card title="No-Shows"  value={fmtN(data.reservations?.noShows)}  color="#ff8080" />
            <Card title="Fill Rate" value={`${data.reservations?.fillRate || 0}%`} />
          </div>
          {(data.reservations?.topSlots || []).length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "12px 16px" }}>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, textTransform: "uppercase", margin: "0 0 8px" }}>Most Booked Slots</p>
              {data.reservations.topSlots.map(slot => (
                <div key={slot.time} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: "#fff", fontSize: 13 }}>{slot.time}</span>
                  <span style={{ color: "#c8793a", fontWeight: 700, fontSize: 13 }}>{slot.count} reservations</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Customer Loyalty ── */}
          <SectionTitle>Customer Loyalty</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
            <Card title="Total Customers"  value={fmtN(data.customers?.totalCustomers)}         icon={Users} />
            <Card title="New This Period"  value={fmtN(data.customers?.newThisPeriod)}           icon={Users} />
            <Card title="Points Issued"    value={fmtN(data.customers?.totalPointsDistributed)}  icon={Star} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Tier donut */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "16px 8px" }}>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: "0 0 12px 8px", fontWeight: 700, textTransform: "uppercase" }}>Tier Breakdown</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={data.customers?.tierBreakdown || []} dataKey="count" nameKey="tier" cx="50%" cy="50%" outerRadius={60}>
                    {(data.customers?.tierBreakdown || []).map(t => <Cell key={t.tier} fill={TIER_CLR[t.tier] || "#c8793a"} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1a0800", border: "1px solid rgba(200,121,58,0.3)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Top 10 leaderboard */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "16px" }}>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: "0 0 10px", fontWeight: 700, textTransform: "uppercase" }}>Top Customers</p>
              {(data.customers?.top10Spenders || []).slice(0, 5).map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: TIER_CLR[c.tier], fontSize: 12, fontWeight: 700, minWidth: 16 }}>#{i + 1}</span>
                  <span style={{ color: "#fff", fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                  <span style={{ color: "#c8793a", fontSize: 12, fontWeight: 700 }}>{c.points.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Games ── */}
          <SectionTitle>Game Stats</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
            <Card title="Total Games Played"   value={fmtN(data.games?.totalGames)}       icon={Gamepad2} />
            <Card title="Pts from Games"       value={fmtN(data.games?.totalPtsFromGames)} icon={Star} />
            <Card title="Most Played"          value={data.games?.mostPlayed || "—"}       icon={Gamepad2} />
          </div>
          {(data.games?.byType || []).length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "16px 8px 8px" }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.games.byType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="game" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1a0800", border: "1px solid rgba(200,121,58,0.3)", borderRadius: 8 }} />
                  <Bar dataKey="total"     fill="#c8793a" name="Total plays"  radius={[4,4,0,0]} />
                  <Bar dataKey="forPoints" fill="#8b4513" name="For points"   radius={[4,4,0,0]} />
                  <Legend wrapperStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
