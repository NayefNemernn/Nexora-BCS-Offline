import { useState, useEffect, useCallback } from "react";
import { Settings, Calendar, Monitor, RefreshCw, Coffee, Users, Clock, Plus, ShoppingBag } from "lucide-react";
import FloorMap        from "../components/cafe/FloorMap";
import TableOrderModal from "../components/cafe/TableOrderModal";
import CafeBillModal   from "../components/cafe/CafeBillModal";
import * as cafeApi    from "../api/cafe.api";
import { useAuth }     from "../context/AuthContext";
import { connectSocket } from "../lib/socket";
import toast from "react-hot-toast";

const STATS = [
  { key: "available", label: "Available", icon: "🟢", bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
  { key: "occupied",  label: "Occupied",  icon: "🟠", bg: "#fff7ed", border: "#fed7aa", text: "#b45309" },
  { key: "reserved",  label: "Reserved",  icon: "🔵", bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  { key: "cleaning",  label: "Cleaning",  icon: "🟡", bg: "#fefce8", border: "#fde68a", text: "#a16207" },
];

export default function Cafe({ setPage }) {
  const { store, currencySymbol, user } = useAuth();
  const [tables,            setTables]            = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [activeTable,       setActiveTable]       = useState(null);
  const [checkoutOrder,     setCheckoutOrder]     = useState(null);
  const [outsideOrders,     setOutsideOrders]     = useState([]);
  const [activeOutsideOrder,setActiveOutsideOrder]= useState(null);
  const [newWalkInLoading,  setNewWalkInLoading]  = useState(false);

  const loadTables = useCallback(async () => {
    try { setTables(await cafeApi.getTables()); }
    catch { toast.error("Failed to load tables"); }
    finally { setLoading(false); }
  }, []);

  const loadOutsideOrders = useCallback(async () => {
    try { setOutsideOrders(await cafeApi.getOrders({ orderType: "takeaway", status: "open" })); }
    catch {}
  }, []);

  useEffect(() => {
    loadTables();
    loadOutsideOrders();
    const socket = connectSocket(store?._id, "cafe");
    socket.on("cafe_table_updated", upd => setTables(prev => prev.map(t => t._id === upd._id ? { ...t, ...upd } : t)));
    socket.on("cafe_table_deleted", ({ _id }) => setTables(prev => prev.filter(t => t._id !== _id)));
    socket.on("cafe_order_updated", upd => {
      if (upd.orderType === "takeaway") {
        if (upd.status === "open") setOutsideOrders(prev => { const exists = prev.find(o => o._id === upd._id); return exists ? prev.map(o => o._id === upd._id ? upd : o) : [...prev, upd]; });
        else setOutsideOrders(prev => prev.filter(o => o._id !== upd._id));
      }
    });
    return () => { socket.off("cafe_table_updated"); socket.off("cafe_table_deleted"); socket.off("cafe_order_updated"); };
  }, [store?._id, loadTables, loadOutsideOrders]);

  const handleCheckout = (order) => { setActiveTable(null); setActiveOutsideOrder(null); setCheckoutOrder(order); };
  const handleDone     = () => { setCheckoutOrder(null); setActiveTable(null); loadTables(); loadOutsideOrders(); };

  const handleNewWalkIn = async () => {
    setNewWalkInLoading(true);
    try {
      const label = `Walk-in #${outsideOrders.length + 1}`;
      const order = await cafeApi.openOutsideOrder(label);
      setOutsideOrders(prev => [...prev, order]);
      setActiveOutsideOrder(order);
    } catch { toast.error("Failed to create walk-in order"); }
    finally { setNewWalkInLoading(false); }
  };

  const handleOutsideOrderClose = () => { setActiveOutsideOrder(null); loadOutsideOrders(); };

  const stats = STATS.map(s => ({ ...s, count: tables.filter(t => t.status === s.key).length }));
  const occupied = tables.filter(t => t.status === "occupied").length;

  return (
    <div style={{ minHeight: "100%", background: "linear-gradient(160deg,#fdf8f0 0%,#f5ece0 100%)", padding: "0 0 32px" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#2c1810 0%,#4a2518 100%)", padding: "24px 28px 20px", marginBottom: 24, boxShadow: "0 4px 20px rgba(44,24,16,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>☕</div>
            <div>
              <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 22, margin: 0, letterSpacing: -0.3 }}>Café Floor</h1>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, margin: 0, marginTop: 2 }}>
                {tables.length} tables · {occupied} occupied
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <NavBtn icon={<RefreshCw size={14}/>} label="Refresh"       onClick={loadTables}                    bg="rgba(255,255,255,0.1)" />
            <NavBtn icon={<Monitor   size={14}/>} label="Kitchen"       onClick={() => setPage("cafekitchen")}  bg="rgba(255,255,255,0.1)" />
            <NavBtn icon={<Calendar  size={14}/>} label="Reservations"  onClick={() => setPage("cafereservations")} bg="#c8793a" />
            {user?.role === "admin" && (
              <NavBtn icon={<Settings size={14}/>} label="Table Layout" onClick={() => setPage("cafesettings")} bg="rgba(255,255,255,0.1)" />
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 24px" }}>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {stats.map(s => (
            <div key={s.key} style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ color: s.text, fontWeight: 700, fontSize: 13, margin: 0 }}>{s.label}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span style={{ color: s.text, fontWeight: 800, fontSize: 26, lineHeight: 1 }}>{s.count}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Floor map */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, gap: 12 }}>
            <Coffee size={24} style={{ color: "#b45309", animation: "spin 1s linear infinite" }}/>
            <span style={{ color: "#b45309", fontWeight: 600 }}>Loading floor…</span>
          </div>
        ) : (
          <FloorMap tables={tables} editMode={false} onTableClick={setActiveTable} mapWidth={900} mapHeight={540}/>
        )}

        {/* Legend */}
        <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
          {STATS.map(s => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11 }}>{s.icon}</span>
              <span style={{ fontSize: 12, color: s.text, fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
          <span style={{ fontSize: 11, color: "#a16207", marginLeft: "auto" }}>Tap a table to open its order</span>
        </div>

        {/* ── Outside / Walk-in Orders ── */}
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#c8793a,#8b4513)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShoppingBag size={17} color="#fff"/>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#2c1810" }}>Walk-in & Counter Orders</h2>
                <p style={{ margin: 0, fontSize: 11, color: "#78716c" }}>{outsideOrders.length} active</p>
              </div>
            </div>
            <button onClick={handleNewWalkIn} disabled={newWalkInLoading}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 12, background: "linear-gradient(135deg,#c8793a,#b45309)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: newWalkInLoading ? 0.6 : 1 }}>
              <Plus size={15}/> {newWalkInLoading ? "Opening…" : "New Walk-in"}
            </button>
          </div>

          {outsideOrders.length === 0 ? (
            <div style={{ background: "#fff", border: "1.5px dashed #e8d5b5", borderRadius: 16, padding: "28px 0", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🛍️</div>
              <p style={{ color: "#a16207", fontWeight: 600, margin: 0, fontSize: 13 }}>No active walk-in orders</p>
              <p style={{ color: "#b8a090", fontSize: 11, margin: "4px 0 0" }}>Click "New Walk-in" to start a counter or takeaway order</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
              {outsideOrders.map(order => {
                const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;
                const total     = order.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0;
                const elapsed   = Math.round((Date.now() - new Date(order.openedAt)) / 60000);
                return (
                  <button key={order._id} onClick={() => setActiveOutsideOrder(order)}
                    style={{ background: "#fff", border: "1.5px solid #e8d5b5", borderRadius: 16, padding: "16px 18px", textAlign: "left", cursor: "pointer", boxShadow: "0 2px 10px rgba(44,24,16,0.06)", transition: "box-shadow 0.15s", width: "100%" }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 18px rgba(200,121,58,0.18)"}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 10px rgba(44,24,16,0.06)"}>
                    <div style={{ height: 3, background: "linear-gradient(90deg,#c8793a,#b45309)", borderRadius: 2, marginBottom: 12, marginLeft: -18, marginRight: -18, marginTop: -16 }}/>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: 14, color: "#2c1810", margin: 0 }}>{order.label || "Walk-in"}</p>
                        <p style={{ fontSize: 11, color: "#78716c", margin: "3px 0 0" }}>{itemCount} item{itemCount !== 1 ? "s" : ""} · {elapsed}m ago</p>
                      </div>
                      <p style={{ fontWeight: 900, fontSize: 16, color: "#c8793a", margin: 0, flexShrink: 0 }}>
                        {currencySymbol}{total.toFixed(2)}
                      </p>
                    </div>
                    <div style={{ marginTop: 10, padding: "5px 10px", borderRadius: 8, background: "#fff7ed", border: "1px solid #fed7aa", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <ShoppingBag size={11} color="#b45309"/>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309" }}>Counter / Takeaway</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {activeTable && !checkoutOrder && (
        <TableOrderModal
          table={activeTable}
          allTables={tables}
          currencySymbol={currencySymbol}
          onClose={() => { setActiveTable(null); loadTables(); }}
          onCheckout={handleCheckout}
        />
      )}
      {activeOutsideOrder && !checkoutOrder && (
        <TableOrderModal
          table={null}
          initialOrder={activeOutsideOrder}
          allTables={tables}
          currencySymbol={currencySymbol}
          onClose={handleOutsideOrderClose}
          onCheckout={handleCheckout}
        />
      )}
      {checkoutOrder && (
        <CafeBillModal
          order={checkoutOrder}
          table={{ number: checkoutOrder.tableNumber || checkoutOrder.label }}
          taxRate={store?.taxRate || 0}
          currencySymbol={currencySymbol}
          onClose={() => setCheckoutOrder(null)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}

function NavBtn({ icon, label, onClick, bg }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: bg, border: "none", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "opacity 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
      {icon}{label}
    </button>
  );
}
