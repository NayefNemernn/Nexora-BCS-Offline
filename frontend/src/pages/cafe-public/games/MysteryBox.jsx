import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { recordGameResult } from "../../../api/cafePublic.api";
import toast from "react-hot-toast";

const OUTCOMES = [
  { points: 50,  label: "50 Points",  emoji: "🎁", rarity: "common" },
  { points: 100, label: "100 Points", emoji: "🎁", rarity: "common" },
  { points: 200, label: "200 Points", emoji: "💫", rarity: "rare" },
  { points: 300, label: "300 Points", emoji: "✨", rarity: "rare" },
  { points: 500, label: "JACKPOT!",   emoji: "🏆", rarity: "legendary" },
  { points: 0,   label: "50% Off Today!", emoji: "🎫", freeItem: true, rarity: "rare" },
];

const WEIGHTS = [35, 30, 15, 12, 3, 5]; // %

function pickOutcome() {
  const rnd = Math.random() * 100;
  let acc = 0;
  for (let i = 0; i < WEIGHTS.length; i++) {
    acc += WEIGHTS[i];
    if (rnd < acc) return OUTCOMES[i];
  }
  return OUTCOMES[0];
}

export default function MysteryBox({ slug, token, isForPoints, onFinish, onBack }) {
  const [picked,   setPicked]   = useState(null); // index
  const [outcome,  setOutcome]  = useState(null);
  const [opening,  setOpening]  = useState(false);
  const [done,     setDone]     = useState(false);

  const pick = async (idx) => {
    if (picked !== null || done) return;
    setPicked(idx);
    setOpening(true);

    setTimeout(async () => {
      const result = pickOutcome();
      setOutcome(result);
      setOpening(false);
      setDone(true);

      if (isForPoints && token) {
        try {
          const data = await recordGameResult(slug, token, "mystery", {
            points: result.points, freeItem: result.freeItem || false,
          });
          onFinish({ ...data, isForPoints: data.isForPoints });
        } catch { toast.error("Failed to save result"); }
      }
    }, 1200);
  };

  const RARITY_COLORS = {
    common:    "rgba(255,255,255,0.15)",
    rare:      "rgba(200,121,58,0.4)",
    legendary: "rgba(255,215,0,0.5)",
  };

  return (
    <div style={{ textAlign: "center" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 13 }}>
        <ArrowLeft size={16} /> All Games
      </button>
      <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 22, marginBottom: 8 }}>📦 Mystery Box</h2>
      {isForPoints && <p style={{ color: "#c8793a", fontSize: 13, marginBottom: 8 }}>Pick a box to reveal your prize!</p>}
      {!isForPoints && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 8 }}>Playing for fun</p>}

      {!done && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginBottom: 24 }}>Choose wisely…</p>}

      {/* Boxes */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 32 }}>
        {[0, 1, 2].map(i => {
          const isChosen = picked === i;
          const isOpen   = isChosen && outcome;
          const isLost   = picked !== null && !isChosen;

          return (
            <button key={i} onClick={() => pick(i)} disabled={picked !== null} style={{
              width: 90, height: 100, borderRadius: 20,
              background: isLost ? "rgba(255,255,255,0.03)"
                : isOpen ? `rgba(200,121,58,0.2)` : "rgba(255,255,255,0.08)",
              border: `2px solid ${isOpen ? "rgba(200,121,58,0.8)" : isLost ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.15)"}`,
              cursor: picked !== null ? "default" : "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
              transition: "all 0.4s",
              transform: isChosen && opening ? "scale(1.1)" : isOpen ? "scale(1.05)" : "scale(1)",
              opacity: isLost ? 0.3 : 1,
              boxShadow: isOpen ? "0 0 30px rgba(200,121,58,0.5)" : "none",
            }}>
              <span style={{ fontSize: isOpen ? 32 : 36, transition: "all 0.4s" }}>
                {isOpen ? outcome.emoji : "📦"}
              </span>
              {!isOpen && !isLost && (
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Box {i + 1}</span>
              )}
              {isOpen && (
                <span style={{ color: "#c8793a", fontSize: 11, fontWeight: 700 }}>Opened!</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Result */}
      {outcome && (
        <div style={{
          background: RARITY_COLORS[outcome.rarity] || "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "24px",
          animation: "fadeIn 0.5s ease",
        }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: "0 0 8px" }}>You found:</p>
          <p style={{ fontSize: 40, margin: "0 0 8px" }}>{outcome.emoji}</p>
          <p style={{ color: "#c8793a", fontWeight: 900, fontSize: 26, margin: "0 0 6px" }}>{outcome.label}</p>
          {outcome.freeItem && <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: 0 }}>Show this to staff when ordering!</p>}
          {isForPoints && outcome.points > 0 && <p style={{ color: "#90ee90", fontSize: 14, margin: "8px 0 0" }}>+{outcome.points} points added to your account!</p>}
          {!isForPoints && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "8px 0 0" }}>Sign in to earn real prizes</p>}
        </div>
      )}

      {opening && (
        <div style={{ color: "#c8793a", fontWeight: 700, fontSize: 16, animation: "pulse 0.5s infinite" }}>
          Opening…
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
}
