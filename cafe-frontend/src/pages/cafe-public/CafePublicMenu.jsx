import { useState, useEffect } from "react";
import { ShoppingCart, Plus, Minus, Coffee, ArrowLeft, Gift, Star } from "lucide-react";
import { useCafePublic } from "../CafePublicApp";
import { getPublicCafe, placePublicOrder, getPublicRewards } from "../../api/cafePublic.api";
import toast from "react-hot-toast";

const CATS = ["all", "drinks", "food", "desserts", "extras", "other"];

export default function CafePublicMenu({ setPage }) {
  const { slug, table, token, customer, updateCustomer, setOrderId } = useCafePublic();
  const [menu,      setMenu]      = useState([]);
  const [store,     setStore]     = useState(null);
  const [rewards,   setRewards]   = useState([]);
  const [cat,       setCat]       = useState("all");
  const [cart,      setCart]      = useState({});
  const [notes,     setNotes]     = useState({});
  const [loading,   setLoading]   = useState(true);
  const [placing,   setPlacing]   = useState(false);
  const [rewardId,  setRewardId]  = useState(null);
  const [showRewards, setShowRewards] = useState(false);

  useEffect(() => {
    Promise.all([getPublicCafe(slug), getPublicRewards(slug)])
      .then(([cafe, rew]) => { setStore(cafe.store); setMenu(cafe.menu); setRewards(rew.rewards || []); })
      .catch(() => toast.error("Failed to load menu"))
      .finally(() => setLoading(false));
  }, []);

  const add = (item) => setCart(c => ({ ...c, [item._id]: (c[item._id] || 0) + 1 }));
  const rem = (item) => setCart(c => { const n = { ...c }; if (n[item._id] > 1) n[item._id]--; else delete n[item._id]; return n; });

  const cartItems = menu.filter(m => cart[m._id]);
  const cartTotal = cartItems.reduce((s, m) => s + m.price * (cart[m._id] || 0), 0);
  const cartCount = Object.values(cart).reduce((s, v) => s + v, 0);
  const filtered  = cat === "all" ? menu : menu.filter(m => m.category === cat);

  const selectedReward = rewards.find(r => r._id === rewardId);
  const canAfford      = selectedReward && (customer?.points || 0) >= selectedReward.pointsCost;

  const placeOrder = async () => {
    if (!table) return toast.error("No table info — scan the QR code at your table");
    if (cartCount === 0) return;
    setPlacing(true);
    try {
      const items = cartItems.map(m => ({
        menuItemId: m._id, quantity: cart[m._id], notes: notes[m._id] || "",
      }));
      const data = await placePublicOrder(slug, {
        tableNumber: Number(table),
        items,
        customerId: customer?._id,
        rewardId: canAfford ? rewardId : undefined,
      }, token);

      if (data.pointsEarned > 0) {
        toast.success(`Order placed! +${data.pointsEarned} pts earned 🎉`);
        updateCustomer({ ...customer, points: (customer?.points || 0) + data.pointsEarned });
      } else {
        toast.success("Order sent to kitchen! 🎉");
      }
      setOrderId(data.orderId);
      setPage("tracker");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <Coffee size={40} color="#c8793a" style={{ animation: "spin 2s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 440, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setPage("home")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}><ArrowLeft size={20} /></button>
              <div>
                <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 16, margin: 0 }}>{store?.name}</h2>
                {table && <p style={{ color: "#c8793a", fontSize: 12, margin: 0, fontWeight: 700 }}>Table {table}</p>}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(200,121,58,0.15)", border: "1px solid rgba(200,121,58,0.3)", borderRadius: 10, padding: "4px 10px" }}>
              <Star size={12} color="#c8793a" fill="#c8793a" />
              <span style={{ color: "#c8793a", fontWeight: 800, fontSize: 13 }}>{customer?.points?.toLocaleString() || 0}</span>
            </div>
          </div>

          {/* Category tabs */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)} style={{
                flexShrink: 0, padding: "5px 14px", borderRadius: 20,
                background: cat === c ? "rgba(200,121,58,0.9)" : "rgba(255,255,255,0.07)",
                border: "none", color: cat === c ? "#fff" : "rgba(255,255,255,0.5)",
                fontWeight: 700, fontSize: 12, cursor: "pointer", textTransform: "capitalize",
              }}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Rewards banner */}
      {rewards.length > 0 && (
        <div style={{ maxWidth: 440, margin: "12px auto 0", padding: "0 16px" }}>
          <button onClick={() => setShowRewards(!showRewards)} style={{
            width: "100%", padding: "10px 16px", borderRadius: 14,
            background: rewardId ? "rgba(100,200,100,0.15)" : "rgba(200,121,58,0.1)",
            border: `1px solid ${rewardId ? "rgba(100,200,100,0.3)" : "rgba(200,121,58,0.2)"}`,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          }}>
            <Gift size={16} color="#c8793a" />
            <span style={{ color: rewardId ? "#90ee90" : "#c8793a", fontWeight: 700, fontSize: 13, flex: 1, textAlign: "left" }}>
              {rewardId ? `✓ ${selectedReward?.name} applied` : `Redeem a reward (${customer?.points || 0} pts)`}
            </span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{showRewards ? "▲" : "▼"}</span>
          </button>

          {showRewards && (
            <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 12, marginTop: 4 }}>
              <button onClick={() => { setRewardId(null); setShowRewards(false); }} style={{
                width: "100%", padding: "8px 12px", borderRadius: 10, marginBottom: 8,
                background: !rewardId ? "rgba(200,121,58,0.2)" : "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 13,
              }}>No reward</button>
              {rewards.map(r => {
                const afford = (customer?.points || 0) >= r.pointsCost;
                return (
                  <button key={r._id} onClick={() => { if (afford) { setRewardId(r._id); setShowRewards(false); } }}
                    disabled={!afford} style={{
                      width: "100%", padding: "10px 12px", borderRadius: 10, marginBottom: 6, textAlign: "left",
                      background: rewardId === r._id ? "rgba(100,200,100,0.2)" : afford ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${rewardId === r._id ? "rgba(100,200,100,0.4)" : "rgba(255,255,255,0.08)"}`,
                      cursor: afford ? "pointer" : "not-allowed", opacity: afford ? 1 : 0.4,
                    }}>
                    <p style={{ color: "#fff", fontWeight: 700, fontSize: 13, margin: 0 }}>{r.name}</p>
                    <p style={{ color: "#c8793a", fontSize: 12, margin: "2px 0 0" }}>{r.pointsCost} pts {!afford && "(not enough)"}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Menu */}
      <div style={{ maxWidth: 440, margin: "12px auto 0", padding: "0 16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(item => (
            <div key={item._id} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: "14px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: 0 }}>{item.name}</p>
                {item.description && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: "2px 0 0" }}>{item.description}</p>}
                <p style={{ color: "#c8793a", fontWeight: 800, fontSize: 15, margin: "6px 0 0" }}>
                  {store?.currencySymbol || "$"}{item.price.toFixed(2)}
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 600, marginLeft: 6 }}>+10 pts</span>
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 12 }}>
                {cart[item._id] > 0 && (
                  <>
                    <button onClick={() => rem(item)} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Minus size={14} />
                    </button>
                    <span style={{ color: "#fff", fontWeight: 800, fontSize: 15, minWidth: 18, textAlign: "center" }}>{cart[item._id]}</span>
                  </>
                )}
                <button onClick={() => add(item)} style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: "linear-gradient(135deg,#c8793a,#8b4513)",
                  border: "none", color: "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 10px rgba(200,121,58,0.4)",
                }}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart bar */}
      {cartCount > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30, padding: "12px 16px", background: "rgba(26,8,0,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(200,121,58,0.2)" }}>
          <div style={{ maxWidth: 440, margin: "0 auto" }}>
            {rewardId && canAfford && (
              <p style={{ color: "#90ee90", fontSize: 12, textAlign: "center", margin: "0 0 6px", fontWeight: 700 }}>
                🎁 {selectedReward?.name} will be applied
              </p>
            )}
            <button onClick={placeOrder} disabled={placing} style={{
              width: "100%", padding: "15px 20px", borderRadius: 16,
              background: placing ? "rgba(200,121,58,0.4)" : "linear-gradient(135deg,#c8793a,#8b4513)",
              border: "none", color: "#fff", fontWeight: 800, fontSize: 15,
              cursor: placing ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              boxShadow: "0 4px 24px rgba(200,121,58,0.5)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ShoppingCart size={18} />
                <span>{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
              </div>
              <span>{placing ? "Placing…" : `${store?.currencySymbol || "$"}${cartTotal.toFixed(2)}`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
