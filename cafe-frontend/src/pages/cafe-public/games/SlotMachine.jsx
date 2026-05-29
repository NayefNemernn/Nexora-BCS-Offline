import { useState, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { recordGameResult } from "../../../api/cafePublic.api";
import toast from "react-hot-toast";

const SYMBOLS = ["☕", "🧁", "🍰", "⭐", "🎲", "🍵"];

function randomSymbol() { return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]; }

function calcPrize(reels) {
  if (reels[0] === reels[1] && reels[1] === reels[2]) return reels[0] === "⭐" ? 500 : 200;
  if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) return 50;
  return 10;
}

export default function SlotMachine({ slug, token, isForPoints, onFinish, onBack }) {
  const [reels,   setReels]   = useState(["☕", "☕", "☕"]);
  const [spinning, setSpinning] = useState(false);
  const [result,   setResult]   = useState(null);
  const [done,     setDone]     = useState(false);
  const intervals = useRef([]);

  const spin = async () => {
    if (spinning || done) return;
    setSpinning(true);
    setResult(null);

    /* Animate each reel */
    const frames = [null, null, null];
    intervals.current = SYMBOLS.map((_, i) =>
      setInterval(() => {
        setReels(prev => {
          const next = [...prev];
          next[i] = randomSymbol();
          return next;
        });
      }, 80)
    );

    /* Stop reels one by one */
    const finalReels = [randomSymbol(), randomSymbol(), randomSymbol()];
    const stop = (idx) => {
      clearInterval(intervals.current[idx]);
      setReels(prev => { const n = [...prev]; n[idx] = finalReels[idx]; return n; });
    };

    setTimeout(() => stop(0), 700);
    setTimeout(() => stop(1), 1100);
    setTimeout(async () => {
      stop(2);
      setSpinning(false);
      const prize = calcPrize(finalReels);
      setResult({ reels: finalReels, prize });
      setDone(true);

      if (isForPoints && token) {
        try {
          const data = await recordGameResult(slug, token, "slot", { reels: finalReels });
          onFinish({ ...data, isForPoints: data.isForPoints });
        } catch { toast.error("Failed to save result"); }
      }
    }, 1500);
  };

  const prize = result ? calcPrize(result.reels) : null;

  return (
    <div style={{ textAlign: "center" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 13 }}>
        <ArrowLeft size={16} /> All Games
      </button>

      <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 22, marginBottom: 8 }}>🎰 Slot Machine</h2>
      {isForPoints && <p style={{ color: "#c8793a", fontSize: 13, marginBottom: 20 }}>Spin to earn points!</p>}
      {!isForPoints && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 20 }}>Playing for fun</p>}

      {/* Machine */}
      <div style={{
        background: "linear-gradient(135deg,rgba(200,121,58,0.2),rgba(139,69,19,0.15))",
        border: "2px solid rgba(200,121,58,0.4)", borderRadius: 28, padding: "32px 24px", marginBottom: 24,
        display: "inline-block", minWidth: 280,
      }}>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 24 }}>
          {reels.map((sym, i) => (
            <div key={i} style={{
              width: 80, height: 80, borderRadius: 16,
              background: "rgba(0,0,0,0.4)", border: "2px solid rgba(200,121,58,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, transition: spinning ? "none" : "all 0.3s",
              boxShadow: done && result?.reels[0] === result?.reels[1] && result?.reels[1] === result?.reels[2] ? "0 0 20px rgba(255,215,0,0.6)" : "none",
            }}>
              {sym}
            </div>
          ))}
        </div>

        <button onClick={spin} disabled={spinning || done} style={{
          padding: "14px 40px", borderRadius: 14,
          background: spinning || done ? "rgba(200,121,58,0.3)" : "linear-gradient(135deg,#c8793a,#8b4513)",
          border: "none", color: "#fff", fontWeight: 800, fontSize: 16,
          cursor: spinning || done ? "not-allowed" : "pointer",
          boxShadow: spinning || done ? "none" : "0 4px 20px rgba(200,121,58,0.5)",
        }}>
          {spinning ? "Spinning…" : done ? "Done!" : "SPIN"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "20px 24px" }}>
          {prize === 500 && <p style={{ color: "#ffd700", fontWeight: 900, fontSize: 20, margin: "0 0 8px" }}>⭐ JACKPOT! ⭐</p>}
          {prize === 200 && <p style={{ color: "#c8793a", fontWeight: 900, fontSize: 20, margin: "0 0 8px" }}>🎉 Three of a Kind!</p>}
          {prize === 50  && <p style={{ color: "#90ee90", fontWeight: 800, fontSize: 18, margin: "0 0 8px" }}>✨ Two Match!</p>}
          {prize === 10  && <p style={{ color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: 16, margin: "0 0 8px" }}>No match — consolation!</p>}
          <p style={{ color: "#c8793a", fontWeight: 900, fontSize: 28, margin: 0 }}>
            {isForPoints ? `+${prize} pts` : `Would win ${prize} pts`}
          </p>
        </div>
      )}
    </div>
  );
}
