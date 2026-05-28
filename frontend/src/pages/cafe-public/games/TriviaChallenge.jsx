import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Clock } from "lucide-react";
import { recordGameResult } from "../../../api/cafePublic.api";
import toast from "react-hot-toast";
/* Fallback questions if no store trivia set up */
const FALLBACK = [
  { question: "What country is coffee originally from?", options: ["Brazil", "Ethiopia", "Colombia", "Italy"], correctIndex: 1 },
  { question: "Espresso is brewed by forcing water through coffee grounds at:", options: ["Low pressure", "High pressure", "Boiling water", "Cold water"], correctIndex: 1 },
  { question: "A latte is espresso combined with:", options: ["Steamed milk", "Cream", "Water", "Chocolate"], correctIndex: 0 },
];

const TIMER = 30;

export default function TriviaChallenge({ slug, token, isForPoints, onFinish, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [qIdx,      setQIdx]      = useState(0);
  const [answers,   setAnswers]   = useState([]); // indices of chosen answers
  const [chosen,    setChosen]    = useState(null);
  const [timeLeft,  setTimeLeft]  = useState(TIMER);
  const [done,      setDone]      = useState(false);
  const [loading,   setLoading]   = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    fetch(`${base}/api/cafe/trivia/public/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const q = d.questions?.length >= 3 ? d.questions : FALLBACK;
        setQuestions(shuffle(q).slice(0, 3));
      })
      .catch(() => setQuestions(FALLBACK))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (done || loading || questions.length === 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleAnswer(-1); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [qIdx, done, loading]);

  const handleAnswer = async (idx) => {
    clearInterval(timerRef.current);
    setChosen(idx);

    const correct = questions[qIdx]?.correctIndex;
    const newAnswers = [...answers, { chosen: idx, correct }];

    setTimeout(async () => {
      if (qIdx + 1 < questions.length) {
        setAnswers(newAnswers);
        setQIdx(q => q + 1);
        setChosen(null);
        setTimeLeft(TIMER);
      } else {
        /* Game over */
        setAnswers(newAnswers);
        setDone(true);
        const correctCount = newAnswers.filter(a => a.chosen === a.correct).length;

        if (isForPoints && token) {
          try {
            const data = await recordGameResult(slug, token, "trivia", {
              correct: correctCount, total: questions.length,
            });
            onFinish({ ...data, isForPoints: data.isForPoints });
          } catch { toast.error("Failed to save result"); }
        }
      }
    }, 1200);
  };

  function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

  if (loading) return <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", paddingTop: 40 }}>Loading questions…</div>;

  const q = questions[qIdx];
  const correctCount = answers.filter(a => a.chosen === a.correct).length;
  const totalPts = done ? correctCount * 30 + (correctCount === questions.length ? 20 : 0) : 0;
  const timerPct = (timeLeft / TIMER) * 100;

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 13 }}>
        <ArrowLeft size={16} /> All Games
      </button>
      <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 22, marginBottom: 4, textAlign: "center" }}>🧠 Trivia Challenge</h2>
      {isForPoints && <p style={{ color: "#c8793a", fontSize: 13, marginBottom: 20, textAlign: "center" }}>30 pts per correct • 20 bonus for 3/3</p>}

      {done ? (
        <div style={{ textAlign: "center", paddingTop: 20 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>
            {correctCount === 3 ? "🏆" : correctCount >= 2 ? "🌟" : correctCount >= 1 ? "✨" : "😔"}
          </div>
          <h3 style={{ color: "#fff", fontWeight: 900, fontSize: 24, margin: "0 0 8px" }}>
            {correctCount}/{questions.length} Correct
          </h3>
          {correctCount === 3 && <p style={{ color: "#ffd700", fontSize: 14, margin: "0 0 16px" }}>Perfect score! +20 bonus pts!</p>}
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 20 }}>
            <p style={{ color: "#c8793a", fontWeight: 900, fontSize: 32, margin: 0 }}>
              {isForPoints ? `+${totalPts} pts` : `Would earn ${totalPts} pts`}
            </p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "6px 0 0" }}>
              {correctCount * 30} base {correctCount === 3 ? "+ 20 streak bonus" : ""}
            </p>
          </div>
          {/* Answer review */}
          <div style={{ marginTop: 16, textAlign: "left" }}>
            {questions.map((qu, i) => {
              const a   = answers[i];
              const win = a?.chosen === a?.correct;
              return (
                <div key={i} style={{ background: win ? "rgba(100,200,100,0.1)" : "rgba(200,50,50,0.1)", border: `1px solid ${win ? "rgba(100,200,100,0.2)" : "rgba(200,50,50,0.2)"}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8 }}>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: "0 0 4px" }}>{qu.question}</p>
                  <p style={{ color: win ? "#90ee90" : "#ff8080", fontSize: 12, margin: 0, fontWeight: 700 }}>
                    {win ? "✓ " : "✗ "}{qu.options[a?.chosen ?? -1] || "No answer"} {!win && `→ ${qu.options[qu.correctIndex]}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Question {qIdx + 1}/{questions.length}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: timeLeft <= 10 ? "#ff8080" : "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 700 }}>
              <Clock size={14} />
              {timeLeft}s
            </div>
          </div>

          {/* Timer bar */}
          <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 4, marginBottom: 20, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${timerPct}%`, background: timeLeft <= 10 ? "#ff8080" : "#c8793a", borderRadius: 4, transition: "width 1s linear, background 0.3s" }} />
          </div>

          {/* Question */}
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "20px 20px", marginBottom: 16 }}>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: 0, lineHeight: 1.5, textAlign: "center" }}>{q?.question}</p>
          </div>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q?.options?.map((opt, i) => {
              const isChosen  = chosen === i;
              const isCorrect = q.correctIndex === i;
              const showResult = chosen !== null;

              let bg     = "rgba(255,255,255,0.06)";
              let border = "rgba(255,255,255,0.12)";
              let color  = "#fff";
              if (showResult) {
                if (isCorrect) { bg = "rgba(100,200,100,0.2)"; border = "rgba(100,200,100,0.5)"; color = "#90ee90"; }
                else if (isChosen) { bg = "rgba(200,50,50,0.2)"; border = "rgba(200,50,50,0.4)"; color = "#ff8080"; }
              }

              return (
                <button key={i} onClick={() => !chosen && handleAnswer(i)} style={{
                  padding: "14px 16px", borderRadius: 14, textAlign: "left",
                  background: bg, border: `1.5px solid ${border}`, color, fontWeight: 600, fontSize: 14,
                  cursor: chosen ? "default" : "pointer", transition: "all 0.2s",
                }}>
                  <span style={{ opacity: 0.6, marginRight: 10 }}>{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
