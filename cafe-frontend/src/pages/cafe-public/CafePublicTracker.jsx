import { useState, useEffect, useRef } from "react";
import { Coffee, CheckCircle, Clock, ChefHat, Star, Gamepad2 } from "lucide-react";
import { useCafePublic } from "../CafePublicApp";
import { trackOrder, cafeCustomerRate } from "../../api/cafePublic.api";
import toast from "react-hot-toast";

const STAGES = [
  { key: "received",   label: "Order Received",   icon: "📋", desc: "Kitchen got your order" },
  { key: "preparing",  label: "Preparing",         icon: "👨‍🍳", desc: "Your items are being made" },
  { key: "ready",      label: "Almost Ready",      icon: "⏱️",  desc: "Almost done!" },
  { key: "served",     label: "Enjoy!",             icon: "☕",  desc: "Your order is on the way" },
];

function getStage(summary) {
  if (!summary) return 0;
  if (summary.served === summary.total)    return 3;
  if (summary.ready > 0)                  return 2;
  if (summary.preparing > 0)              return 1;
  return 0;
}

export default function CafePublicTracker({ setPage }) {
  const { slug, token, customer, orderId, updateCustomer } = useCafePublic();
  const [order,    setOrder]    = useState(null);
  const [summary,  setSummary]  = useState(null);
  const [rated,    setRated]    = useState(false);
  const [rating,   setRating]   = useState(0);
  const [comment,  setComment]  = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef(null);

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      const data = await trackOrder(slug, orderId);
      setOrder(data.order);
      setSummary(data.summary);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchOrder();
    pollRef.current = setInterval(fetchOrder, 8000);
    return () => clearInterval(pollRef.current);
  }, [orderId]);

  const submitRating = async () => {
    if (!rating || !token) return;
    setSubmitting(true);
    try {
      const data = await cafeCustomerRate(slug, token, { orderId, rating, comment });
      toast.success(`+${data.pointsAwarded} pts for rating! ⭐`);
      updateCustomer(data.customer);
      setRated(true);
    } catch { toast.error("Failed to submit rating"); }
    finally { setSubmitting(false); }
  };

  const stage       = getStage(summary);
  const currentStage = STAGES[stage];

  return (
    <div style={{ minHeight: "100vh", padding: "24px 16px 40px", maxWidth: 440, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ width: 60, height: 60, borderRadius: 20, background: "linear-gradient(135deg,#c8793a,#8b4513)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 0 30px rgba(200,121,58,0.4)" }}>
          <Coffee size={28} color="#fff" />
        </div>
        <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 22, margin: "0 0 4px" }}>Order Tracker</h2>
        {order?.tableNumber && <p style={{ color: "#c8793a", fontSize: 14, margin: 0, fontWeight: 700 }}>Table {order.tableNumber}</p>}
      </div>

      {/* Stage display */}
      <div style={{
        background: "linear-gradient(135deg,rgba(200,121,58,0.2),rgba(139,69,19,0.15))",
        border: "1px solid rgba(200,121,58,0.3)", borderRadius: 24, padding: 28, marginBottom: 24, textAlign: "center",
      }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>{currentStage?.icon}</div>
        <h3 style={{ color: "#fff", fontWeight: 900, fontSize: 20, margin: "0 0 6px" }}>{currentStage?.label}</h3>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, margin: 0 }}>{currentStage?.desc}</p>
      </div>

      {/* Progress steps */}
      <div style={{ marginBottom: 24 }}>
        {STAGES.map((s, i) => (
          <div key={s.key} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: i < STAGES.length - 1 ? 0 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: i <= stage ? "linear-gradient(135deg,#c8793a,#8b4513)" : "rgba(255,255,255,0.08)",
                border: i === stage ? "2px solid rgba(200,121,58,0.8)" : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: i <= stage ? "0 0 12px rgba(200,121,58,0.4)" : "none",
              }}>
                {i < stage ? <CheckCircle size={16} color="#fff" /> : <span style={{ fontSize: 14 }}>{s.icon}</span>}
              </div>
              {i < STAGES.length - 1 && (
                <div style={{ width: 2, height: 32, background: i < stage ? "rgba(200,121,58,0.6)" : "rgba(255,255,255,0.08)", margin: "2px 0" }} />
              )}
            </div>
            <div style={{ paddingTop: 4, paddingBottom: 16 }}>
              <p style={{ color: i <= stage ? "#fff" : "rgba(255,255,255,0.3)", fontWeight: 700, fontSize: 14, margin: 0 }}>{s.label}</p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: "2px 0 0" }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Items list */}
      {order?.items?.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "14px 16px", marginBottom: 20 }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 10px" }}>Your Items</p>
          {order.items.filter(i => i.status !== "cancelled").map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < order.items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <span style={{ color: "#fff", fontSize: 13 }}>{item.quantity || 1}× {item.name}</span>
              <span style={{ fontSize: 14 }}>{item.status === "served" ? "✅" : item.status === "ready" ? "🔔" : item.status === "preparing" ? "👨‍🍳" : "⏳"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Rating (logged in, not yet rated, order is served) */}
      {token && customer && stage >= 2 && !rated && (
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Star size={18} color="#c8793a" />
            <p style={{ color: "#fff", fontWeight: 800, fontSize: 15, margin: 0 }}>Rate your order <span style={{ color: "#c8793a" }}>+5 pts</span></p>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)} style={{
                width: 40, height: 40, borderRadius: 10, fontSize: 20,
                background: rating >= n ? "rgba(255,215,0,0.2)" : "rgba(255,255,255,0.07)",
                border: `1px solid ${rating >= n ? "rgba(255,215,0,0.4)" : "rgba(255,255,255,0.1)"}`,
                cursor: "pointer",
              }}>⭐</button>
            ))}
          </div>
          <textarea
            value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Leave a comment (optional)"
            rows={2}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, resize: "none", boxSizing: "border-box", outline: "none" }}
          />
          <button onClick={submitRating} disabled={!rating || submitting} style={{
            marginTop: 10, width: "100%", padding: "12px", borderRadius: 12,
            background: rating ? "linear-gradient(135deg,#c8793a,#8b4513)" : "rgba(255,255,255,0.08)",
            border: "none", color: rating ? "#fff" : "rgba(255,255,255,0.3)", fontWeight: 700, fontSize: 14,
            cursor: rating ? "pointer" : "not-allowed",
          }}>
            {submitting ? "Submitting…" : "Submit Rating"}
          </button>
        </div>
      )}

      {rated && (
        <div style={{ background: "rgba(100,200,100,0.1)", border: "1px solid rgba(100,200,100,0.2)", borderRadius: 16, padding: "12px 16px", marginBottom: 16, textAlign: "center" }}>
          <p style={{ color: "#90ee90", fontWeight: 700, fontSize: 14, margin: 0 }}>✓ Thanks for your feedback! +5 pts added</p>
        </div>
      )}

      {/* Play games CTA */}
      <button onClick={() => { sessionStorage.removeItem("cafe_selected_game"); setPage("games"); }} style={{
        width: "100%", padding: "16px", borderRadius: 18,
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,121,58,0.3)",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      }}>
        <Gamepad2 size={20} color="#c8793a" />
        <div style={{ textAlign: "left" }}>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: 0 }}>Play Games While You Wait</p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0 }}>
            {token ? "Earn more points!" : "Just for fun — no account needed"}
          </p>
        </div>
      </button>
    </div>
  );
}
