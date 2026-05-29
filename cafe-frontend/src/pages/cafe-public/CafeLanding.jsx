import { useEffect, useState } from "react";
import { Coffee, Zap, ChevronRight, Star } from "lucide-react";
import { useCafePublic } from "../CafePublicApp";
import { getPublicCafe } from "../../api/cafePublic.api";
import toast from "react-hot-toast";

export default function CafeLanding({ setPage }) {
  const { slug, table, setCafeData } = useCafePublic();
  const [loading, setLoading] = useState(true);
  const [store,   setStore]   = useState(null);

  useEffect(() => {
    getPublicCafe(slug)
      .then(data => { setStore(data.store); setCafeData(data); })
      .catch(() => toast.error("Café not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", color: "#c8793a" }}>
        <Coffee size={48} style={{ animation: "spin 2s linear infinite" }} />
        <p style={{ color: "rgba(255,255,255,0.6)", marginTop: 12 }}>Loading café…</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{
          width: 90, height: 90, borderRadius: 28,
          background: "linear-gradient(135deg,#c8793a,#8b4513)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
          boxShadow: "0 0 40px rgba(200,121,58,0.5)",
        }}>
          <Coffee size={44} color="#fff" />
        </div>
        <h1 style={{ color: "#fff", fontWeight: 900, fontSize: 28, margin: 0 }}>
          {store?.name || "Café"}
        </h1>
        {table && (
          <div style={{
            display: "inline-block", marginTop: 10,
            background: "rgba(200,121,58,0.2)", border: "1px solid rgba(200,121,58,0.5)",
            borderRadius: 20, padding: "4px 16px",
            color: "#c8793a", fontWeight: 700, fontSize: 14,
          }}>
            Table {table}
          </div>
        )}
      </div>

      {/* Choice cards */}
      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Play & Earn */}
        <button onClick={() => setPage("auth")} style={{
          background: "linear-gradient(135deg,#c8793a 0%,#8b4513 100%)",
          border: "none", borderRadius: 20, padding: "24px 20px",
          cursor: "pointer", textAlign: "left",
          boxShadow: "0 8px 32px rgba(200,121,58,0.4)",
          transition: "transform 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 12, padding: 8 }}>
              <Zap size={22} color="#fff" />
            </div>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>Play & Earn</span>
            <ChevronRight size={18} color="rgba(255,255,255,0.7)" style={{ marginLeft: "auto" }} />
          </div>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            Sign in, play games, earn loyalty points and get free rewards every visit
          </p>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {["🎰 Slot", "🎡 Wheel", "🃏 Scratch", "📦 Mystery", "🧠 Trivia"].map(g => (
              <span key={g} style={{
                background: "rgba(255,255,255,0.15)", borderRadius: 8,
                padding: "2px 8px", color: "#fff", fontSize: 11, fontWeight: 600,
              }}>{g}</span>
            ))}
          </div>
        </button>

        {/* Quick Menu */}
        <button onClick={() => setPage("guest")} style={{
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 20, padding: "24px 20px",
          cursor: "pointer", textAlign: "left",
          transition: "transform 0.15s, border-color 0.15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(200,121,58,0.4)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 8 }}>
              <Coffee size={22} color="#c8793a" />
            </div>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>Quick Menu</span>
            <ChevronRight size={18} color="rgba(255,255,255,0.4)" style={{ marginLeft: "auto" }} />
          </div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            Browse and order without signing in. Play games for fun after ordering
          </p>
        </button>
      </div>

      <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 32, textAlign: "center" }}>
        Powered by Nexora BCS
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
