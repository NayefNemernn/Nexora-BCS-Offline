import { useState, useEffect } from "react";
import { ArrowLeft, Gift, Star, Lock } from "lucide-react";
import { useCafePublic } from "../CafePublicApp";
import { getPublicRewards, cafeCustomerHistory } from "../../api/cafePublic.api";
import toast from "react-hot-toast";

const TIER_COLORS = {
  bronze:  "#cd7f32",
  silver:  "#c0c0c0",
  gold:    "#ffd700",
  diamond: "#b9f2ff",
};

export default function CafePublicRewards({ setPage }) {
  const { slug, token, customer } = useCafePublic();
  const [rewards,  setRewards]  = useState([]);
  const [history,  setHistory]  = useState([]);
  const [tab,      setTab]      = useState("rewards"); // rewards | history
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      getPublicRewards(slug),
      token ? cafeCustomerHistory(slug, token) : Promise.resolve({ history: [] }),
    ]).then(([rew, hist]) => {
      setRewards(rew.rewards || []);
      setHistory(hist.history || []);
    }).catch(() => toast.error("Failed to load rewards"))
      .finally(() => setLoading(false));
  }, []);

  const points = customer?.points || 0;
  const tier   = customer?.tier   || "bronze";

  return (
    <div style={{ minHeight: "100vh", padding: "20px 16px 40px", maxWidth: 440, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setPage("home")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 20, margin: 0 }}>Rewards</h2>
      </div>

      {/* Points banner */}
      <div style={{ background: "linear-gradient(135deg,rgba(200,121,58,0.25),rgba(139,69,19,0.2))", border: "1px solid rgba(200,121,58,0.3)", borderRadius: 20, padding: "18px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: 0 }}>Your Balance</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
            <span style={{ color: "#c8793a", fontWeight: 900, fontSize: 32 }}>{points.toLocaleString()}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>pts</span>
          </div>
        </div>
        <div style={{ background: TIER_COLORS[tier], color: "#1a1a1a", borderRadius: 12, padding: "6px 14px", fontWeight: 800, fontSize: 13, textTransform: "capitalize" }}>
          {tier} ⭐
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 4, marginBottom: 20 }}>
        {["rewards", "history"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "8px", borderRadius: 8, border: "none",
            background: tab === t ? "#c8793a" : "transparent",
            color: tab === t ? "#fff" : "rgba(255,255,255,0.4)",
            fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "capitalize",
          }}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: 40 }}>Loading…</div>
      ) : tab === "rewards" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rewards.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)" }}>
              <Gift size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>No rewards configured yet</p>
            </div>
          )}
          {rewards.map(r => {
            const canAfford = points >= r.pointsCost;
            return (
              <div key={r._id} style={{
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${canAfford ? "rgba(200,121,58,0.3)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 18, padding: "18px 20px",
                opacity: canAfford ? 1 : 0.6,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Gift size={16} color={canAfford ? "#c8793a" : "rgba(255,255,255,0.3)"} />
                      <p style={{ color: "#fff", fontWeight: 800, fontSize: 15, margin: 0 }}>{r.name}</p>
                    </div>
                    {r.description && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 10px" }}>{r.description}</p>}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(200,121,58,0.15)", borderRadius: 8, padding: "4px 10px" }}>
                        <Star size={12} color="#c8793a" fill="#c8793a" />
                        <span style={{ color: "#c8793a", fontWeight: 800, fontSize: 13 }}>{r.pointsCost} pts</span>
                      </div>
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, textTransform: "capitalize" }}>
                        {r.rewardType.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  {!canAfford && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
                      <Lock size={12} />
                      <span>{r.pointsCost - points} more</span>
                    </div>
                  )}
                </div>
                {canAfford && (
                  <p style={{ color: "rgba(100,200,100,0.8)", fontSize: 12, margin: "10px 0 0", fontWeight: 600 }}>
                    ✓ You can redeem this! Apply it at checkout when ordering.
                  </p>
                )}
              </div>
            );
          })}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px", marginTop: 8 }}>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
              💡 Rewards are applied at checkout. Tap "Order Now" from the home screen, then select a reward from the cart.
            </p>
          </div>
        </div>
      ) : (
        /* History tab */
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {history.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)" }}>
              <Star size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>No points history yet</p>
            </div>
          )}
          {history.map((tx, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ color: "#fff", fontWeight: 600, fontSize: 13, margin: 0 }}>{tx.description || tx.source}</p>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, margin: "2px 0 0" }}>
                  {new Date(tx.createdAt).toLocaleDateString()} · Balance after: {tx.balanceAfter?.toLocaleString()} pts
                </p>
              </div>
              <span style={{
                fontWeight: 900, fontSize: 15,
                color: tx.type === "earned" ? "#90ee90" : "#ff8080",
              }}>
                {tx.type === "earned" ? "+" : "-"}{tx.amount}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
