import { useState, useRef, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { recordGameResult } from "../../../api/cafePublic.api";
import toast from "react-hot-toast";

const SEGMENTS = [
  { label: "25 pts",          color: "#c8793a", pts: 25 },
  { label: "100 pts",         color: "#8b4513", pts: 100 },
  { label: "Free add-on",     color: "#2d7a2d", pts: 0  },
  { label: "50 pts",          color: "#c8793a", pts: 50 },
  { label: "200 pts",         color: "#ffd700", pts: 200 },
  { label: "15 pts",          color: "#8b4513", pts: 15 },
  { label: "Double order pts",color: "#7ec8e3", pts: 0  },
  { label: "75 pts",          color: "#c8793a", pts: 75 },
];

const SIZE    = 280;
const CX      = SIZE / 2;
const ANGLE   = (2 * Math.PI) / SEGMENTS.length;

function segmentPath(i) {
  const start = i * ANGLE - Math.PI / 2;
  const end   = start + ANGLE;
  const r     = SIZE / 2 - 4;
  const x1    = CX + r * Math.cos(start);
  const y1    = CX + r * Math.sin(start);
  const x2    = CX + r * Math.cos(end);
  const y2    = CX + r * Math.sin(end);
  return `M${CX},${CX} L${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2} Z`;
}

function labelPos(i) {
  const mid = i * ANGLE + ANGLE / 2 - Math.PI / 2;
  const r   = SIZE / 2 - 44;
  return { x: CX + r * Math.cos(mid), y: CX + r * Math.sin(mid), angle: (mid * 180) / Math.PI + 90 };
}

export default function SpinWheel({ slug, token, isForPoints, onFinish, onBack }) {
  const [rotation, setRotation]   = useState(0);
  const [spinning,  setSpinning]  = useState(false);
  const [result,    setResult]    = useState(null);
  const [done,      setDone]      = useState(false);
  const rotRef = useRef(0);

  const spin = async () => {
    if (spinning || done) return;
    setSpinning(true);

    const extra  = 1800 + Math.floor(Math.random() * 1800); // 5–10 rotations
    const target = rotRef.current + extra;
    rotRef.current = target;
    setRotation(target);

    setTimeout(async () => {
      const norm    = ((target % 360) + 360) % 360;
      const segIdx  = Math.floor(((360 - norm) % 360) / (360 / SEGMENTS.length));
      const seg     = SEGMENTS[segIdx % SEGMENTS.length];
      setResult(seg);
      setSpinning(false);
      setDone(true);

      if (isForPoints && token) {
        try {
          const data = await recordGameResult(slug, token, "wheel", { segment: seg.label });
          onFinish({ ...data, isForPoints: data.isForPoints });
        } catch { toast.error("Failed to save result"); }
      }
    }, 4000);
  };

  return (
    <div style={{ textAlign: "center" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 13 }}>
        <ArrowLeft size={16} /> All Games
      </button>
      <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 22, marginBottom: 8 }}>🎡 Spin the Wheel</h2>
      {isForPoints && <p style={{ color: "#c8793a", fontSize: 13, marginBottom: 16 }}>One spin to earn points!</p>}
      {!isForPoints && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 16 }}>Playing for fun</p>}

      {/* Pointer */}
      <div style={{ position: "relative", display: "inline-block" }}>
        <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", zIndex: 10, fontSize: 24 }}>▼</div>

        <svg width={SIZE} height={SIZE} style={{
          transition: spinning ? `transform 4s cubic-bezier(0.17,0.67,0.12,0.99)` : "none",
          transform: `rotate(${rotation}deg)`,
          filter: "drop-shadow(0 0 20px rgba(200,121,58,0.4))",
        }}>
          {SEGMENTS.map((seg, i) => {
            const lp = labelPos(i);
            return (
              <g key={i}>
                <path d={segmentPath(i)} fill={seg.color} stroke="rgba(0,0,0,0.3)" strokeWidth={2} />
                <text
                  x={lp.x} y={lp.y}
                  textAnchor="middle" dominantBaseline="middle"
                  transform={`rotate(${lp.angle}, ${lp.x}, ${lp.y})`}
                  fontSize={9} fontWeight="800" fill="#fff"
                  style={{ userSelect: "none" }}
                >
                  {seg.label.length > 10 ? seg.label.slice(0, 9) + "…" : seg.label}
                </text>
              </g>
            );
          })}
          <circle cx={CX} cy={CX} r={18} fill="#1a0800" stroke="rgba(200,121,58,0.6)" strokeWidth={3} />
        </svg>
      </div>

      <div style={{ marginTop: 20, marginBottom: 24 }}>
        <button onClick={spin} disabled={spinning || done} style={{
          padding: "14px 48px", borderRadius: 14,
          background: spinning || done ? "rgba(200,121,58,0.3)" : "linear-gradient(135deg,#c8793a,#8b4513)",
          border: "none", color: "#fff", fontWeight: 800, fontSize: 16,
          cursor: spinning || done ? "not-allowed" : "pointer",
          boxShadow: spinning || done ? "none" : "0 4px 20px rgba(200,121,58,0.5)",
        }}>
          {spinning ? "Spinning…" : done ? "Done!" : "SPIN"}
        </button>
      </div>

      {result && (
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "20px 24px" }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: "0 0 6px" }}>You landed on</p>
          <p style={{ color: "#c8793a", fontWeight: 900, fontSize: 26, margin: 0 }}>{result.label}</p>
          {isForPoints && result.pts > 0 && <p style={{ color: "#90ee90", fontSize: 14, margin: "8px 0 0" }}>+{result.pts} points added!</p>}
          {isForPoints && result.pts === 0 && <p style={{ color: "#90ee90", fontSize: 14, margin: "8px 0 0" }}>Special prize saved to your account!</p>}
          {!isForPoints && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "8px 0 0" }}>Sign in to earn real points</p>}
        </div>
      )}
    </div>
  );
}
