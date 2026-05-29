import { useState, useEffect } from "react";
import { ShoppingCart, Plus, Minus, Coffee, ArrowLeft, Zap } from "lucide-react";
import { useCafePublic } from "../CafePublicApp";
import { getPublicCafe, placePublicOrder } from "../../api/cafePublic.api";
import toast from "react-hot-toast";

const CATS = ["all", "drinks", "food", "desserts", "extras", "other"];

export default function CafeGuestMenu({ setPage }) {
  const { slug, table, setCafeData, setOrderId } = useCafePublic();
  const [menu,    setMenu]    = useState([]);
  const [store,   setStore]   = useState(null);
  const [cat,     setCat]     = useState("all");
  const [cart,    setCart]    = useState({});
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    getPublicCafe(slug)
      .then(d => { setStore(d.store); setMenu(d.menu); setCafeData(d); })
      .catch(() => toast.error("Failed to load menu"))
      .finally(() => setLoading(false));
  }, []);

  const add = (item) => setCart(c => ({ ...c, [item._id]: (c[item._id] || 0) + 1 }));
  const rem = (item) => setCart(c => { const n = { ...c }; if (n[item._id] > 1) n[item._id]--; else delete n[item._id]; return n; });

  const cartItems = menu.filter(m => cart[m._id]);
  const cartTotal = cartItems.reduce((s, m) => s + m.price * (cart[m._id] || 0), 0);
  const cartCount = Object.values(cart).reduce((s, v) => s + v, 0);

  const filtered = cat === "all" ? menu : menu.filter(m => m.category === cat);

  const placeOrder = async () => {
    if (!table) return toast.error("No table info — scan the QR code at your table");
    if (cartCount === 0) return;
    setPlacing(true);
    try {
      const items = cartItems.map(m => ({ menuItemId: m._id, quantity: cart[m._id] }));
      const data  = await placePublicOrder(slug, { tableNumber: Number(table), items });
      setOrderId(data.orderId);
      toast.success("Order sent to kitchen! 🎉");
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
    <div style={{ minHeight: "100vh", paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 440, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setPage("landing")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}><ArrowLeft size={20} /></button>
            <div>
              <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 16, margin: 0 }}>{store?.name}</h2>
              {table && <p style={{ color: "#c8793a", fontSize: 12, margin: 0, fontWeight: 700 }}>Table {table}</p>}
            </div>
          </div>
          <button onClick={() => setPage("auth")} style={{
            background: "rgba(200,121,58,0.2)", border: "1px solid rgba(200,121,58,0.4)",
            borderRadius: 10, padding: "6px 12px", color: "#c8793a", fontSize: 12, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <Zap size={12} /> Earn Points
          </button>
        </div>

        {/* Category tabs */}
        <div style={{ maxWidth: 440, margin: "10px auto 0", display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
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

      {/* Menu items */}
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "16px 16px 0" }}>
        {filtered.length === 0 && (
          <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", paddingTop: 40 }}>No items in this category</p>
        )}
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
              <span>{placing ? "Placing…" : `Order — ${store?.currencySymbol || "$"}${cartTotal.toFixed(2)}`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
