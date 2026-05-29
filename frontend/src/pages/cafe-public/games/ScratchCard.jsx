import { useRef, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { recordGameResult } from "../../../api/cafePublic.api";
import toast from "react-hot-toast";

const PRIZES = ["coin", "coin", "gem", "gem", "crown", "coin", "gem", "coin", "coin"];
const PRIZE_LABELS = { coin: "🪙 50 pts", gem: "💎 150 pts", crown: "👑 300 pts" };
const PRIZE_PTS   = { coin: 50, gem: 150, crown: 300 };

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

export default function ScratchCard({ slug, token, isForPoints, onFinish, onBack }) {
  const canvasRef  = useRef(null);
  const [symbols,  setSymbols]  = useState(() => shuffle(PRIZES));
  const [revealed, setRevealed] = useState(Array(9).fill(false));
  const [done,     setDone]     = useState(false);
  const [winner,   setWinner]   = useState(null);
  const drawing    = useRef(false);

  /* Draw grey cover on canvas cells */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext("2d");
    const W = canvas.width / 3;
    const H = canvas.height / 3;
    for (let i = 0; i < 9; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      ctx.fillStyle = "#3d1a10";
      ctx.fillRect(col * W + 2, row * H + 2, W - 4, H - 4);
      ctx.fillStyle = "rgba(200,121,58,0.3)";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Scratch →", col * W + W / 2, row * H + H / 2);
    }
  }, []);

  const scratchCell = (idx) => {
    if (revealed[idx] || done) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const W = canvas.width / 3;
    const H = canvas.height / 3;
    const col = idx % 3;
    const row = Math.floor(idx / 3);

    ctx.clearRect(col * W, row * H, W, H);

    const next = [...revealed];
    next[idx]  = true;
    setRevealed(next);

    if (next.every(Boolean)) checkWin(symbols, next);
  };

  const checkWin = async (syms, rev) => {
    const counts = {};
    syms.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
    const prize = Object.entries(counts).find(([, c]) => c >= 3)?.[0] || null;
    setWinner(prize);
    setDone(true);

    if (isForPoints && token) {
      try {
        const data = await recordGameResult(slug, token, "scratch", { prize });
        onFinish({ ...data, isForPoints: data.isForPoints });
      } catch { toast.error("Failed to save result"); }
    }
  };

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src  = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    };
  };

  const handlePointer = (e) => {
    const canvas = canvasRef.current;
    const { x, y } = getPos(e, canvas);
    const W = canvas.width / 3;
    const H = canvas.height / 3;
    const col = Math.floor(x / W);
    const row = Math.floor(y / H);
    const idx = row * 3 + col;
    if (idx >= 0 && idx < 9) scratchCell(idx);
  };

  return (
    <div style={{ textAlign: "center" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 13 }}>
        <ArrowLeft size={16} /> All Games
      </button>
      <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 22, marginBottom: 8 }}>🃏 Scratch Card</h2>
      {isForPoints && <p style={{ color: "#c8793a", fontSize: 13, marginBottom: 16 }}>Scratch all tiles to reveal!</p>}
      {!isForPoints && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 16 }}>Playing for fun</p>}

      {/* Card */}
      <div style={{ position: "relative", display: "inline-block", borderRadius: 20, overflow: "hidden", border: "2px solid rgba(200,121,58,0.4)", boxShadow: "0 0 30px rgba(200,121,58,0.2)" }}>
        {/* Symbols underneath */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 90px)", gridTemplateRows: "repeat(3, 90px)", gap: 0 }}>
          {symbols.map((sym, i) => (
            <div key={i} style={{ width: 90, height: 90, background: "#1a0800", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, borderRight: "1px solid rgba(200,121,58,0.2)", borderBottom: "1px solid rgba(200,121,58,0.2)" }}>
              {PRIZE_LABELS[sym]?.split(" ")[0] || "?"}
            </div>
          ))}
        </div>

        {/* Scratch canvas on top */}
        <canvas
          ref={canvasRef}
          width={270} height={270}
          style={{ position: "absolute", top: 0, left: 0, cursor: "crosshair", touchAction: "none" }}
          onMouseMove={e => { if (e.buttons === 1) handlePointer(e); }}
          onMouseDown={handlePointer}
          onTouchMove={e => { e.preventDefault(); handlePointer(e); }}
          onTouchStart={handlePointer}
        />
      </div>

      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 10 }}>Drag or tap to scratch</p>

      {done && (
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "20px 24px", marginTop: 20 }}>
          {winner ? (
            <>
              <p style={{ color: "#90ee90", fontWeight: 900, fontSize: 20, margin: "0 0 6px" }}>🎉 You matched 3 {winner}s!</p>
              <p style={{ color: "#c8793a", fontWeight: 900, fontSize: 28, margin: 0 }}>
                {isForPoints ? `+${PRIZE_PTS[winner]} pts` : `Would win ${PRIZE_PTS[winner]} pts`}
              </p>
            </>
          ) : (
            <>
              <p style={{ color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: 16, margin: "0 0 6px" }}>No match this time 😔</p>
              <p style={{ color: "#c8793a", fontSize: 14, margin: 0 }}>
                {isForPoints ? "+20 pts consolation" : "Come back tomorrow!"}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
