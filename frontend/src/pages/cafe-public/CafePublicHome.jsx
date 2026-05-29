import { useState, useEffect } from "react";
import { Coffee, Star, Zap, LogOut, Gift, Clock, ChevronRight, Award } from "lucide-react";
import { useCafePublic } from "../CafePublicApp";
import { cafeCustomerCheckin, getGameStatus, getPublicRewards } from "../../api/cafePublic.api";
import toast from "react-hot-toast";

const TIER_COLORS = {
  bronze:  { bg: "#cd7f32", text: "#fff", glow: "rgba(205,127,50,0.4)" },
  silver:  { bg: "#c0c0c0", text: "#1a1a1a", glow: "rgba(192,192,192,0.4)" },
  gold:    { bg: "#ffd700", text: "#1a1a1a", glow: "rgba(255,215,0,0.4)" },
  diamond: { bg: "linear-gradient(135deg,#b9f2ff,#7ec8e3)", text: "#1a1a1a", glow: "rgba(185,242,255,0.4)" },
};

const GAMES = [
  { id: "slot",    label: "Slot Machine",   emoji: "🎰", desc: "Spin 3 reels for up to 500 pts" },
  { id: "wheel",   label: "Spin the Wheel", emoji: "🎡", desc: "8 segments — points & special prizes" },
  { id: "scratch", label: "Scratch Card",   emoji: "🃏", desc: "Scratch to reveal hidden prizes" },
  { id: "mystery", label: "Mystery Box",    emoji: "📦", desc: "Pick a box — points or free item" },
  { id: "trivia",  label: "Trivia",         emoji: "🧠", desc: "Answer 3 questions, earn 110 pts max" },
];

export default function CafePublicHome({ setPage, setGameMode }) {
  const { slug, token, customer, updateCustomer, logout, table } = useCafePublic();
  const [gameStatus, setGameStatus] = useState(null);
  const [rewards,    setRewards]    = useState([]);
  const [checkedIn,  setCheckedIn]  = useState(false);

  useEffect(() => {
    getGameStatus(slug, token).then(d => setGameStatus(d)).catch(() => {});
    getPublicRewards(slug).then(d => setRewards(d.rewards || [])).catch(() => {});
  }, []);

  const handleCheckin = async () => {
    if (checkedIn) return;
    try {
      const d = await cafeCustomerCheckin(slug, token);
      if (d.alreadyClaimed) {
        toast("Already checked in today ☕", { icon: "ℹ️" });
      } else {
        toast.success(`+${d.pointsAwarded} pts — daily check-in! 🎉`);
        updateCustomer(d.customer);
        setCheckedIn(true);
      }
    } catch { toast.error("Check-in failed"); }
  };

  const openGame = (gameId) => {
    const canEarn  = gameStatus?.canEarnPoints;
    const isFirst  = canEarn && gameId !== gameStatus?.playedForPoints;
    setGameMode(canEarn ? "earn" : "fun");
    setPage("games");
    /* Pass selected game via sessionStorage so GameHub picks it up */
    sessionStorage.setItem("cafe_selected_game", gameId);
  };

  const tier   = customer?.tier || "bronze";
  const tc     = TIER_COLORS[tier] || TIER_COLORS.bronze;
  const points = customer?.points || 0;
  const canEarn = gameStatus?.canEarnPoints;

  return (
    <div style={{ minHeight: "100vh", padding: "20px 16px 40px", maxWidth: 440, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Coffee size={22} color="#c8793a" />
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>My Account</span>
        </div>
        <button onClick={logout} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
          <LogOut size={14} /> Logout
        </button>
      </div>

      {/* Points card */}
      <div style={{
        background: "linear-gradient(135deg,rgba(200,121,58,0.25),rgba(139,69,19,0.25))",
        border: "1px solid rgba(200,121,58,0.3)", borderRadius: 24, padding: 24, marginBottom: 20,
        boxShadow: `0 0 40px ${tc.glow}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Your Points</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
              <span style={{ color: "#c8793a", fontWeight: 900, fontSize: 48, lineHeight: 1 }}>{points.toLocaleString()}</span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>pts</span>
            </div>
          </div>
          <div style={{
            background: typeof tc.bg === "string" && tc.bg.includes("gradient") ? tc.bg : tc.bg,
            backgroundColor: tc.bg,
            color: tc.text, borderRadius: 12, padding: "6px 14px",
            fontWeight: 800, fontSize: 13, textTransform: "capitalize",
            boxShadow: `0 4px 12px ${tc.glow}`,
          }}>
            {tier} ⭐
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: 0 }}>Hi, {customer?.name}!</p>
          {table && <span style={{ background: "rgba(200,121,58,0.3)", color: "#c8793a", borderRadius: 8, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>Table {table}</span>}
        </div>

        {/* Pending bonus */}
        {customer?.pendingBonus?.doubleOrderPoints && (
          <div style={{ marginTop: 12, background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: 10, padding: "8px 12px" }}>
            <span style={{ color: "#ffd700", fontSize: 12, fontWeight: 700 }}>⚡ Double points active on your next order!</span>
          </div>
        )}
        {customer?.pendingBonus?.freeAddOn && (
          <div style={{ marginTop: 8, background: "rgba(100,255,100,0.1)", border: "1px solid rgba(100,255,100,0.3)", borderRadius: 10, padding: "8px 12px" }}>
            <span style={{ color: "#90ee90", fontSize: 12, fontWeight: 700 }}>🎁 {customer.pendingBonus.freeAddOn} — use on your next order!</span>
          </div>
        )}
      </div>

      {/* Daily check-in */}
      <button onClick={handleCheckin} style={{
        width: "100%", padding: "14px 20px", borderRadius: 16, marginBottom: 20,
        background: checkedIn ? "rgba(255,255,255,0.05)" : "rgba(200,121,58,0.15)",
        border: `1px solid ${checkedIn ? "rgba(255,255,255,0.1)" : "rgba(200,121,58,0.4)"}`,
        cursor: checkedIn ? "default" : "pointer",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <Clock size={20} color={checkedIn ? "rgba(255,255,255,0.3)" : "#c8793a"} />
        <div style={{ textAlign: "left" }}>
          <p style={{ color: checkedIn ? "rgba(255,255,255,0.3)" : "#fff", fontWeight: 700, fontSize: 14, margin: 0 }}>
            {checkedIn ? "Checked in today ✓" : "Daily Check-In"}
          </p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0 }}>+10 pts every day you visit</p>
        </div>
        {!checkedIn && <Zap size={18} color="#c8793a" style={{ marginLeft: "auto" }} />}
      </button>

      {/* Action buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <button onClick={() => setPage("menu")} style={{
          padding: "16px 12px", borderRadius: 16,
          background: "linear-gradient(135deg,#c8793a,#8b4513)",
          border: "none", cursor: "pointer", color: "#fff", fontWeight: 800, fontSize: 14,
          boxShadow: "0 4px 20px rgba(200,121,58,0.4)",
        }}>
          ☕ Order Now
        </button>
        <button onClick={() => { setPage("rewards"); }} style={{
          padding: "16px 12px", borderRadius: 16,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 14,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Gift size={16} color="#c8793a" /> Rewards
        </button>
      </div>

      {/* Games */}
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 16, margin: 0 }}>Games</h3>
        {canEarn ? (
          <span style={{ background: "rgba(200,121,58,0.2)", color: "#c8793a", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, border: "1px solid rgba(200,121,58,0.3)" }}>
            🎯 1 earn available
          </span>
        ) : (
          <span style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", borderRadius: 8, padding: "3px 10px", fontSize: 11 }}>
            Fun only today
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {GAMES.map(g => {
          const isForPoints = canEarn; // any game earns points if it's the first
          return (
            <button key={g.id} onClick={() => openGame(g.id)} style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16, padding: "14px 16px",
              cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: 14,
              transition: "border-color 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(200,121,58,0.4)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
            >
              <span style={{ fontSize: 28 }}>{g.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: 0 }}>{g.label}</p>
                  {isForPoints && (
                    <span style={{ background: "rgba(200,121,58,0.2)", color: "#c8793a", fontSize: 10, padding: "1px 6px", borderRadius: 6, fontWeight: 700, border: "1px solid rgba(200,121,58,0.3)" }}>EARN</span>
                  )}
                </div>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0 }}>{g.desc}</p>
              </div>
              <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
