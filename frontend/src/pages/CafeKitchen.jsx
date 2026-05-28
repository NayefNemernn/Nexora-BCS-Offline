import { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw, ArrowLeft, Volume2, VolumeX, Coffee } from "lucide-react";
import * as cafeApi from "../api/cafe.api";
import { useAuth }  from "../context/AuthContext";
import { connectSocket } from "../lib/socket";
import toast from "react-hot-toast";

const STATUS_NEXT  = { pending: "preparing", preparing: "ready", ready: "served" };
const STATUS_STYLE = {
  pending:   { bg: "#374151", border: "#4b5563", badge: "#6b7280", label: "Pending"   },
  preparing: { bg: "#78350f", border: "#92400e", badge: "#d97706", label: "Preparing" },
  ready:     { bg: "#14532d", border: "#166534", badge: "#16a34a", label: "Ready ✓"   },
  served:    { bg: "#1e3a5f", border: "#1d4ed8", badge: "#3b82f6", label: "Served"    },
};

function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 820;
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(); osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

function elapsed(d) {
  if (!d) return "";
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m/60)}h ${m%60}m`;
}

export default function CafeKitchen({ setPage }) {
  const { store }  = useAuth();
  const [orders,   setOrders]  = useState([]);
  const [loading,  setLoading] = useState(true);
  const [sound,    setSound]   = useState(true);
  const soundRef = useRef(true);
  soundRef.current = sound;

  const loadOrders = useCallback(async () => {
    try { setOrders(await cafeApi.getKitchenOrders()); }
    catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadOrders();
    const socket = connectSocket(store?._id, "kitchen");
    socket.on("cafe_kitchen_new",  () => { if (soundRef.current) playBeep(); loadOrders(); });
    socket.on("cafe_order_updated", () => loadOrders());
    const iv = setInterval(loadOrders, 30000);
    return () => { socket.off("cafe_kitchen_new"); socket.off("cafe_order_updated"); clearInterval(iv); };
  }, [store?._id, loadOrders]);

  const advance = async (orderId, itemId, current) => {
    const next = STATUS_NEXT[current];
    if (!next) return;
    try {
      const upd = await cafeApi.updateItemStatus(orderId, itemId, next);
      setOrders(prev => prev.map(o => o._id === upd._id ? upd : o)
        .filter(o => o.items.some(i => i.sentToKitchen && !["served","cancelled"].includes(i.status))));
    } catch { toast.error("Failed"); }
  };

  const kitchenOrders = orders.map(o => ({
    ...o,
    kitchenItems: o.items.filter(i => i.sentToKitchen && !["served","cancelled"].includes(i.status)),
  })).filter(o => o.kitchenItems.length > 0);

  return (
    <div style={{ minHeight: "100vh", background: "#111827", color: "#fff", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1c0a04,#2c1810)", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => setPage("cafe")} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={16}/>
          </button>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(200,121,58,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>☕</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Kitchen Display</h1>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
              {kitchenOrders.length} active · click items to advance status · auto-refresh 30s
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Status legend */}
          <div style={{ display: "flex", gap: 6, marginRight: 12 }}>
            {Object.entries(STATUS_STYLE).slice(0,3).map(([s, st]) => (
              <span key={s} style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: st.badge + "33", color: st.badge, border: `1px solid ${st.badge}44` }}>{st.label}</span>
            ))}
          </div>
          <button onClick={() => setSound(!sound)} style={{ width: 36, height: 36, borderRadius: 10, background: sound ? "rgba(200,121,58,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${sound ? "#c8793a55" : "rgba(255,255,255,0.1)"}`, color: sound ? "#c8793a" : "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {sound ? <Volume2 size={15}/> : <VolumeX size={15}/>}
          </button>
          <button onClick={loadOrders} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""}/>
          </button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Coffee size={24} style={{ color: "#c8793a" }}/>
          <span style={{ color: "#c8793a", fontWeight: 600 }}>Loading orders…</span>
        </div>
      ) : kitchenOrders.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <div style={{ fontSize: 64 }}>✅</div>
          <p style={{ color: "#d1d5db", fontSize: 18, fontWeight: 700, margin: 0 }}>All caught up!</p>
          <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>No pending kitchen orders</p>
        </div>
      ) : (
        <div style={{ flex: 1, padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, alignContent: "start", overflowY: "auto" }}>
          {kitchenOrders.map(order => {
            const allReady = order.kitchenItems.every(i => i.status === "ready");
            return (
              <div key={order._id} style={{ background: allReady ? "#052e16" : "#1f2937", border: `1.5px solid ${allReady ? "#166534" : "#374151"}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
                {/* Card header */}
                <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${allReady ? "#14532d" : "#374151"}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: allReady ? "#14532d" : "#374151", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: allReady ? "#4ade80" : "#d1d5db" }}>
                      {order.tableNumber}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#f9fafb" }}>Table {order.tableNumber}</p>
                      <p style={{ margin: 0, fontSize: 10, color: "#9ca3af" }}>{elapsed(order.openedAt)}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: allReady ? "#14532d" : "#374151", color: allReady ? "#4ade80" : "#9ca3af" }}>
                    {order.kitchenItems.length} items
                  </span>
                </div>

                {/* Items */}
                <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {order.kitchenItems.map(item => {
                    const st = STATUS_STYLE[item.status] || STATUS_STYLE.pending;
                    const nextLabel = STATUS_NEXT[item.status] ? `→ ${STATUS_STYLE[STATUS_NEXT[item.status]]?.label}` : "✓ Done";
                    return (
                      <button key={item._id} onClick={() => advance(order._id, item._id, item.status)}
                        style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 12, background: st.bg, border: `1.5px solid ${st.border}`, cursor: "pointer", transition: "transform 0.1s, opacity 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                        onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
                        onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#f9fafb" }}>
                              ×{item.quantity} {item.name}
                            </p>
                            {item.modifiers?.length > 0 && (
                              <p style={{ margin: "2px 0 0", fontSize: 10, color: "#9ca3af" }}>{item.modifiers.join(" · ")}</p>
                            )}
                            {item.notes && (
                              <p style={{ margin: "2px 0 0", fontSize: 10, color: "#9ca3af", fontStyle: "italic" }}>"{item.notes}"</p>
                            )}
                          </div>
                          <div style={{ textAlign: "right", shrink: 0 }}>
                            <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 8, background: st.badge + "33", color: st.badge, fontWeight: 700, display: "block" }}>{st.label}</span>
                            {STATUS_NEXT[item.status] && (
                              <span style={{ fontSize: 9, color: "#6b7280", marginTop: 2, display: "block" }}>{nextLabel}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {allReady && (
                  <div style={{ margin: "0 12px 12px", padding: "8px", borderRadius: 10, background: "#14532d", textAlign: "center", color: "#4ade80", fontSize: 12, fontWeight: 700 }}>
                    ✓ All Ready — Serve Now!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
