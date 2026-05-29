const KEYFRAMES = `
  @keyframes cafloat {
    0%   { transform: translateY(110vh) translateX(0px)   rotate(0deg);   opacity: 0; }
    6%   { opacity: 1; }
    30%  { transform: translateY(75vh)  translateX(28px)  rotate(90deg);  }
    55%  { transform: translateY(45vh)  translateX(-18px) rotate(185deg); }
    80%  { transform: translateY(18vh)  translateX(22px)  rotate(270deg); }
    94%  { opacity: 1; }
    100% { transform: translateY(-15vh) translateX(0px)   rotate(360deg); opacity: 0; }
  }
  @keyframes cafloat2 {
    0%   { transform: translateY(110vh) translateX(0px)   rotate(0deg);   opacity: 0; }
    6%   { opacity: 1; }
    30%  { transform: translateY(75vh)  translateX(-24px) rotate(-80deg); }
    55%  { transform: translateY(45vh)  translateX(16px)  rotate(-170deg);}
    80%  { transform: translateY(18vh)  translateX(-20px) rotate(-265deg);}
    94%  { opacity: 1; }
    100% { transform: translateY(-15vh) translateX(0px)   rotate(-360deg);opacity: 0; }
  }
  @keyframes casteam {
    0%   { transform: translateY(0)    scaleX(1)   rotate(-4deg); opacity: 0;   }
    20%  { opacity: 0.55; }
    60%  { transform: translateY(-50px) scaleX(1.6) rotate(4deg);  opacity: 0.3; }
    100% { transform: translateY(-95px) scaleX(0.7) rotate(-2deg); opacity: 0;   }
  }
  @keyframes capulse {
    0%,100% { transform: scale(1);   opacity: 0.65; }
    50%     { transform: scale(1.35);opacity: 0.3;  }
  }
`;

const ITEMS = [
  /* cups */
  { t: "emoji", c: "☕", sz: 44, x: 4,  dur: 14, dl: 0   },
  { t: "emoji", c: "☕", sz: 28, x: 13, dur: 19, dl: -5  },
  { t: "emoji", c: "☕", sz: 52, x: 26, dur: 11, dl: -11 },
  { t: "emoji", c: "☕", sz: 34, x: 40, dur: 22, dl: -3  },
  { t: "emoji", c: "☕", sz: 46, x: 55, dur: 15, dl: -8  },
  { t: "emoji", c: "☕", sz: 26, x: 69, dur: 24, dl: -1  },
  { t: "emoji", c: "☕", sz: 38, x: 82, dur: 17, dl: -14 },
  { t: "emoji", c: "☕", sz: 50, x: 91, dur: 13, dl: -6  },
  /* pots */
  { t: "emoji", c: "🫖", sz: 38, x: 8,  dur: 18, dl: -9  },
  { t: "emoji", c: "🫖", sz: 30, x: 33, dur: 23, dl: -2  },
  { t: "emoji", c: "🫖", sz: 46, x: 62, dur: 12, dl: -12 },
  { t: "emoji", c: "🫖", sz: 34, x: 78, dur: 20, dl: -4  },
  /* hearts */
  { t: "emoji", c: "♥",  sz: 22, x: 22, dur: 16, dl: -7,  col: "#c8793a" },
  { t: "emoji", c: "♥",  sz: 18, x: 48, dur: 20, dl: -3,  col: "#e8a060" },
  { t: "emoji", c: "♥",  sz: 24, x: 76, dur: 13, dl: -10, col: "#a05020" },
  /* beans (CSS ovals) */
  { t: "bean",  x: 18, dur: 10, dl: -7  },
  { t: "bean",  x: 37, dur: 14, dl: -15 },
  { t: "bean",  x: 58, dur: 17, dl: -2  },
  { t: "bean",  x: 74, dur: 11, dl: -9  },
  { t: "bean",  x: 87, dur: 15, dl: -5  },
  /* steam wisps */
  { t: "steam", x: 6,  dur: 7, dl: -3  },
  { t: "steam", x: 29, dur: 9, dl: -6  },
  { t: "steam", x: 51, dur: 8, dl: -1  },
  { t: "steam", x: 68, dur: 11,dl: -8  },
  { t: "steam", x: 90, dur: 6, dl: -4  },
];

export default function CoffeeBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      <style>{KEYFRAMES}</style>

      {ITEMS.map((item, i) => {
        const anim = i % 2 === 0 ? "cafloat" : "cafloat2";

        if (item.t === "emoji") return (
          <div key={i} style={{
            position: "absolute",
            left: `${item.x}%`,
            bottom: 0,
            fontSize: item.sz,
            color: item.col || undefined,
            opacity: 0.18,
            animation: `${anim} ${item.dur}s ease-in-out ${item.dl}s infinite`,
            userSelect: "none",
            willChange: "transform",
          }}>
            {item.c}
          </div>
        );

        if (item.t === "bean") return (
          <div key={i} style={{
            position: "absolute",
            left: `${item.x}%`,
            bottom: 0,
            width: 22, height: 14,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#6b3a1f,#3d1e0b)",
            opacity: 0.22,
            animation: `${anim} ${item.dur}s ease-in-out ${item.dl}s infinite`,
            willChange: "transform",
          }}/>
        );

        if (item.t === "steam") return (
          <div key={i} style={{
            position: "absolute",
            left: `${item.x}%`,
            bottom: "15%",
            width: 12, height: 12,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.7)",
            filter: "blur(3px)",
            opacity: 0,
            animation: `casteam ${item.dur}s ease-out ${item.dl}s infinite`,
            willChange: "transform",
          }}/>
        );

        return null;
      })}
    </div>
  );
}
