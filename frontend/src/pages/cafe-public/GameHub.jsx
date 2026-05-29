import { useState, useEffect } from "react";
import { ArrowLeft, Star } from "lucide-react";
import confetti from "canvas-confetti";
import { useCafePublic } from "../CafePublicApp";
import SlotMachine    from "./games/SlotMachine";
import SpinWheel      from "./games/SpinWheel";
import ScratchCard    from "./games/ScratchCard";
import MysteryBox     from "./games/MysteryBox";
import TriviaChallenge from "./games/TriviaChallenge";
import { getGameStatus } from "../../api/cafePublic.api";

const GAMES = [
  { id: "slot",    label: "Slot Machine",   emoji: "🎰" },
  { id: "wheel",   label: "Spin the Wheel", emoji: "🎡" },
  { id: "scratch", label: "Scratch Card",   emoji: "🃏" },
  { id: "mystery", label: "Mystery Box",    emoji: "📦" },
  { id: "trivia",  label: "Trivia",         emoji: "🧠" },
];

export default function GameHub({ setPage, mode }) {
  const { slug, token, customer, updateCustomer } = useCafePublic();
  const [selected,   setSelected]   = useState(null);
  const [canEarn,    setCanEarn]     = useState(mode === "earn");
  const [earnedPts,  setEarnedPts]  = useState(null); // points just won
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    /* Pick up pre-selected game from home */
    const preset = sessionStorage.getItem("cafe_selected_game");
    if (preset) { sessionStorage.removeItem("cafe_selected_game"); setSelected(preset); }

    if (token) {
      getGameStatus(slug, token).then(d => setCanEarn(d.canEarnPoints)).catch(() => {});
    }
  }, []);

  const onGameFinish = ({ pointsAwarded, isForPoints, customer: updatedCustomer, specialPrize }) => {
    if (updatedCustomer) updateCustomer(updatedCustomer);
    if (isForPoints && pointsAwarded > 0) {
      setEarnedPts(pointsAwarded);
      setShowReward(true);
      setCanEarn(false);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ["#c8793a", "#ffd700", "#fff", "#8b4513"] });
    }
    setSelected(null);
  };

  const GameComponent = selected === "slot"    ? SlotMachine
    : selected === "wheel"   ? SpinWheel
    : selected === "scratch" ? ScratchCard
    : selected === "mystery" ? MysteryBox
    : selected === "trivia"  ? TriviaChallenge
    : null;

  return (
    <div style={{ minHeight: "100vh", padding: "20px 16px 40px", maxWidth: 440, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => setPage(token ? "home" : "tracker")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 20, margin: 0 }}>Games</h2>
        {!canEarn && token && (
          <span style={{ marginLeft: "auto", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)", borderRadius: 8, padding: "3px 10px", fontSize: 11 }}>
            Fun only
          </span>
        )}
        {canEarn && token && (
          <span style={{ marginLeft: "auto", background: "rgba(200,121,58,0.2)", color: "#c8793a", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, border: "1px solid rgba(200,121,58,0.3)" }}>
            🎯 1 earn left
          </span>
        )}
      </div>

      {/* Points reward popup */}
      {showReward && (
        <div style={{
          position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        }} onClick={() => setShowReward(false)}>
          <div style={{ background: "linear-gradient(135deg,#1a0800,#2d1209)", border: "2px solid rgba(200,121,58,0.5)", borderRadius: 28, padding: 40, textAlign: "center", maxWidth: 320, margin: 20 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 60, marginBottom: 8 }}>🎉</div>
            <h3 style={{ color: "#c8793a", fontWeight: 900, fontSize: 28, margin: "0 0 8px" }}>+{earnedPts} pts!</h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 24 }}>Points added to your account</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 24 }}>
              <Star size={16} color="#ffd700" fill="#ffd700" />
              <span style={{ color: "#fff", fontWeight: 700 }}>{customer?.points?.toLocaleString() || 0} total pts</span>
            </div>
            <button onClick={() => setShowReward(false)} style={{
              width: "100%", padding: "14px", borderRadius: 14,
              background: "linear-gradient(135deg,#c8793a,#8b4513)",
              border: "none", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer",
            }}>Play More Games</button>
          </div>
        </div>
      )}

      {/* Game render */}
      {GameComponent && !showReward ? (
        <GameComponent
          slug={slug}
          token={token}
          isForPoints={canEarn && !!token}
          onFinish={onGameFinish}
          onBack={() => setSelected(null)}
        />
      ) : (
        /* Game selector grid */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!token && (
            <div style={{ background: "rgba(200,121,58,0.1)", border: "1px solid rgba(200,121,58,0.2)", borderRadius: 14, padding: "12px 16px", marginBottom: 4 }}>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: 0, textAlign: "center" }}>
                Playing for fun — <button onClick={() => setPage("auth")} style={{ background: "none", border: "none", color: "#c8793a", fontWeight: 700, cursor: "pointer", fontSize: 13, padding: 0 }}>sign in</button> to earn points
              </p>
            </div>
          )}
          {GAMES.map(g => (
            <button key={g.id} onClick={() => setSelected(g.id)} style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 18, padding: "20px 20px",
              cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: 16,
              transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,121,58,0.5)"; e.currentTarget.style.background = "rgba(200,121,58,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            >
              <span style={{ fontSize: 36 }}>{g.emoji}</span>
              <div>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: 16, margin: 0 }}>{g.label}</p>
                {canEarn && token && (
                  <p style={{ color: "#c8793a", fontSize: 12, margin: "2px 0 0", fontWeight: 600 }}>Tap to earn points →</p>
                )}
                {(!canEarn || !token) && (
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: "2px 0 0" }}>Play for fun →</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
