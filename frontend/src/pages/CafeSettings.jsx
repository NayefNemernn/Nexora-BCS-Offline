import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, ArrowLeft, Save, Settings, Gift, QrCode, Users, Brain } from "lucide-react";
import FloorMap     from "../components/cafe/FloorMap";
import * as cafeApi from "../api/cafe.api";
import api          from "../api/axios";
import toast        from "react-hot-toast";

const SHAPES  = ["square", "round", "rectangle"];
const COLORS  = ["", "#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#c8793a"];
const EMPTY   = { number: "", shape: "square", seats: 4, color: "" };
const TABS    = [
  { key: "tables",  label: "Tables",  icon: "🏠" },
  { key: "loyalty", label: "Loyalty", icon: "⭐" },
  { key: "qr",      label: "QR Codes",icon: "📱" },
];

const labelStyle = { fontSize: 11, fontWeight: 700, color: "#78716c", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 };
const inputStyle  = { width: "100%", padding: "10px 13px", borderRadius: 10, border: "1.5px solid #e8d5b5", background: "#fdf8f0", fontSize: 14, color: "#2c1810", outline: "none", boxSizing: "border-box" };
const darkInput   = { width: "100%", padding: "10px 13px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", fontSize: 14, color: "#fff", outline: "none", boxSizing: "border-box" };
const darkLabel   = { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 };

/* ── QR code image via free public API ── */
function qrUrl(data) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
}

export default function CafeSettings({ setPage }) {
  const [activeTab, setActiveTab] = useState("tables");

  /* ── Tables state ── */
  const [tables,    setTables]     = useState([]);
  const [loading,   setLoading]    = useState(true);
  const [modal,     setModal]      = useState(false);
  const [editTarget,setEditTarget] = useState(null);
  const [form,      setForm]       = useState(EMPTY);
  const [saving,    setSaving]     = useState(false);
  const [deleting,  setDeleting]   = useState(null);

  /* ── Loyalty state ── */
  const [rewards,       setRewards]       = useState([]);
  const [trivia,        setTrivia]        = useState([]);
  const [customers,     setCustomers]     = useState([]);
  const [ptsPerItem,    setPtsPerItem]    = useState(10);
  const [loyaltyLoaded, setLoyaltyLoaded] = useState(false);
  const [rewardForm,    setRewardForm]    = useState({ name: "", description: "", pointsCost: "", rewardType: "free_item", value: "" });
  const [triviaForm,    setTriviaForm]    = useState({ question: "", options: ["","","",""], correctIndex: 0, category: "general" });
  const [adjustModal,   setAdjustModal]   = useState(null); // {customer}
  const [adjustAmt,     setAdjustAmt]     = useState("");
  const [adjustDesc,    setAdjustDesc]    = useState("");

  /* Store slug for QR */
  const [storeSlug, setStoreSlug] = useState("");

  const loadTables = useCallback(async () => {
    setLoading(true);
    try { setTables(await cafeApi.getTables()); }
    catch { toast.error("Failed to load tables"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTables(); }, [loadTables]);

  useEffect(() => {
    /* Get store slug from auth store in localStorage */
    try {
      const store = JSON.parse(localStorage.getItem("cafe_store") || "{}");
      setStoreSlug(store.slug || "");
      setPtsPerItem(store.cafePointsPerItem || 10);
    } catch {}
  }, []);

  const loadLoyalty = useCallback(async () => {
    if (loyaltyLoaded) return;
    try {
      const [rew, tri, cust] = await Promise.all([
        api.get("/cafe/rewards").then(r => r.data.rewards),
        api.get("/cafe/trivia").then(r => r.data.questions),
        api.get("/cafe/customers").then(r => r.data.customers),
      ]);
      setRewards(rew); setTrivia(tri); setCustomers(cust);
      setLoyaltyLoaded(true);
    } catch { toast.error("Failed to load loyalty data"); }
  }, [loyaltyLoaded]);

  useEffect(() => {
    if (activeTab === "loyalty") loadLoyalty();
  }, [activeTab]);

  /* ── Table CRUD ── */
  const openAdd = () => {
    const next = tables.length > 0 ? Math.max(...tables.map(t=>t.number)) + 1 : 1;
    setForm({ ...EMPTY, number: next }); setEditTarget(null); setModal(true);
  };
  const openEdit = (t) => { setForm({ number: t.number, shape: t.shape, seats: t.seats, color: t.color||"" }); setEditTarget(t); setModal(true); };
  const handleSave = async () => {
    const payload = { number: Number(form.number), shape: form.shape, seats: Number(form.seats), color: form.color };
    if (!form.number) return toast.error("Table number required");
    setSaving(true);
    try {
      if (editTarget) {
        const u = await cafeApi.updateTable(editTarget._id, payload);
        setTables(prev => prev.map(t => t._id===u._id ? u : t));
        toast.success("Table updated");
      } else {
        const c = await cafeApi.createTable(payload);
        setTables(prev => [...prev, c]);
        toast.success("Table added");
      }
      setModal(false);
    } catch (err) { toast.error(err.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };
  const handleDelete = async (table) => {
    if (!window.confirm(`Delete Table ${table.number}?`)) return;
    setDeleting(table._id);
    try { await cafeApi.deleteTable(table._id); setTables(prev => prev.filter(t=>t._id!==table._id)); toast.success("Deleted"); }
    catch { toast.error("Delete failed"); }
    finally { setDeleting(null); }
  };
  const handleMove = async (id, x, y) => {
    try { const u = await cafeApi.updateTable(id, { x, y }); setTables(prev => prev.map(t=>t._id===id?{...t,...u}:t)); }
    catch { toast.error("Failed to save position"); }
  };

  /* ── Reward CRUD ── */
  const saveReward = async () => {
    if (!rewardForm.name || !rewardForm.pointsCost) return toast.error("Name and points required");
    try {
      const r = await api.post("/cafe/rewards", { ...rewardForm, pointsCost: Number(rewardForm.pointsCost), value: Number(rewardForm.value) || 0 });
      setRewards(prev => [...prev, r.data.reward]);
      setRewardForm({ name: "", description: "", pointsCost: "", rewardType: "free_item", value: "" });
      toast.success("Reward added");
    } catch { toast.error("Failed"); }
  };
  const deleteReward = async (id) => {
    if (!window.confirm("Delete reward?")) return;
    await api.delete(`/cafe/rewards/${id}`);
    setRewards(prev => prev.filter(r => r._id !== id));
    toast.success("Reward deleted");
  };
  const toggleReward = async (reward) => {
    const r = await api.put(`/cafe/rewards/${reward._id}`, { isActive: !reward.isActive });
    setRewards(prev => prev.map(x => x._id === reward._id ? r.data.reward : x));
  };

  /* ── Trivia CRUD ── */
  const saveTrivia = async () => {
    if (!triviaForm.question || triviaForm.options.some(o => !o)) return toast.error("Fill all fields");
    try {
      const q = await api.post("/cafe/trivia", triviaForm);
      setTrivia(prev => [...prev, q.data.question]);
      setTriviaForm({ question: "", options: ["","","",""], correctIndex: 0, category: "general" });
      toast.success("Question added");
    } catch { toast.error("Failed"); }
  };
  const deleteTrivia = async (id) => {
    await api.delete(`/cafe/trivia/${id}`);
    setTrivia(prev => prev.filter(q => q._id !== id));
    toast.success("Question deleted");
  };

  /* ── Points config ── */
  const savePtsConfig = async () => {
    await api.put("/cafe/loyalty/config", { cafePointsPerItem: Number(ptsPerItem) });
    toast.success("Points config saved");
  };

  /* ── Adjust customer points ── */
  const handleAdjust = async () => {
    if (!adjustAmt) return toast.error("Enter amount");
    await api.put(`/cafe/customers/${adjustModal._id}/points`, { amount: Number(adjustAmt), description: adjustDesc });
    setCustomers(prev => prev.map(c => c._id === adjustModal._id ? { ...c, points: c.points + Number(adjustAmt) } : c));
    toast.success("Points adjusted");
    setAdjustModal(null); setAdjustAmt(""); setAdjustDesc("");
  };

  /* ── Print QR ── */
  const printQR = (tableNum) => {
    const url  = `${window.location.origin}/cafe/play/${storeSlug}?table=${tableNum}`;
    const win  = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Table ${tableNum} QR</title>
      <style>body{font-family:sans-serif;text-align:center;padding:40px}h2{margin-bottom:20px}p{color:#666;font-size:13px;margin-top:12px}</style>
      </head><body>
      <h2>☕ Table ${tableNum}</h2>
      <img src="${qrUrl(url)}" width="220" height="220" />
      <p>${url}</p>
      <script>window.onload=()=>window.print()</script>
      </body></html>
    `);
    win.document.close();
  };

  /* ── Render ── */
  const bg = "#fdf8f0";

  return (
    <div style={{ minHeight: "100%", background: bg, paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#2c1810 0%,#4a2518 100%)", padding: "22px 28px 0", boxShadow: "0 4px 20px rgba(44,24,16,0.2)", marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => setPage("cafe")} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowLeft size={16}/>
            </button>
            <div>
              <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 20, margin: 0 }}>Café Settings</h1>
            </div>
          </div>
          {activeTab === "tables" && (
            <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 11, background: "#c8793a", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              <Plus size={15}/> Add Table
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: "9px 18px", border: "none", borderRadius: "10px 10px 0 0",
              background: activeTab === t.key ? bg : "rgba(255,255,255,0.08)",
              color: activeTab === t.key ? "#2c1810" : "rgba(255,255,255,0.6)",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLES TAB ── */}
      {activeTab === "tables" && (
        <div style={{ padding: "24px 24px" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 80, color: "#b45309" }}>Loading…</div>
          ) : (
            <FloorMap tables={tables} editMode={true} onTableClick={openEdit} onTableMove={handleMove} mapWidth={900} mapHeight={520}/>
          )}
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, color: "#78716c", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 14 }}>All Tables ({tables.length})</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>
              {tables.map(t => (
                <div key={t._id} style={{ background: "#fff", border: "1.5px solid #e8d5b5", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, boxShadow: "0 2px 8px rgba(44,24,16,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {t.color && <span style={{ width: 12, height: 12, borderRadius: "50%", background: t.color, flexShrink: 0 }}/>}
                    <div>
                      <p style={{ fontWeight: 800, fontSize: 14, color: "#2c1810", margin: 0 }}>Table {t.number}</p>
                      <p style={{ fontSize: 11, color: "#a16207", margin: 0 }}>{t.shape} · {t.seats}p</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => openEdit(t)} style={{ padding: "5px 8px", borderRadius: 8, background: "#fdf8f0", border: "1px solid #e8d5b5", color: "#b45309", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                    <button onClick={() => handleDelete(t)} disabled={deleting===t._id} style={{ width: 28, height: 28, borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: deleting===t._id?0.4:1 }}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
              ))}
              {tables.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: "#a16207" }}>
                  <p style={{ fontWeight: 600 }}>No tables yet</p>
                  <button onClick={openAdd} style={{ marginTop: 8, color: "#b45309", fontSize: 13, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Add your first table</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LOYALTY TAB ── */}
      {activeTab === "loyalty" && (
        <div style={{ padding: "24px 24px", maxWidth: 860 }}>
          {/* Points config */}
          <div style={{ background: "linear-gradient(135deg,#2c1810,#4a2518)", borderRadius: 18, padding: "20px 24px", marginBottom: 28 }}>
            <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 15, margin: "0 0 12px" }}>⚙️ Points Configuration</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={darkLabel}>Points per item ordered</label>
                <input type="number" min="1" value={ptsPerItem} onChange={e => setPtsPerItem(e.target.value)} style={{ ...darkInput, width: 120 }} />
              </div>
              <button onClick={savePtsConfig} style={{ padding: "10px 20px", borderRadius: 12, background: "#c8793a", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 18 }}>Save</button>
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: "8px 0 0" }}>Multiplied by customer tier. Bronze×1 Silver×1.25 Gold×1.5 Diamond×2</p>
          </div>

          {/* Rewards */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ color: "#2c1810", fontWeight: 800, fontSize: 16, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <Gift size={18} color="#c8793a" /> Rewards ({rewards.length})
            </h3>
            {/* Add reward form */}
            <div style={{ background: "#fff", border: "1.5px solid #e8d5b5", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 2px 10px rgba(44,24,16,0.05)" }}>
              <h4 style={{ color: "#2c1810", fontWeight: 700, fontSize: 14, margin: "0 0 14px" }}>Add New Reward</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Name *</label>
                  <input value={rewardForm.name} onChange={e => setRewardForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Free Espresso" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Points Cost *</label>
                  <input type="number" min="1" value={rewardForm.pointsCost} onChange={e => setRewardForm(p => ({...p, pointsCost: e.target.value}))} placeholder="e.g. 300" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={rewardForm.rewardType} onChange={e => setRewardForm(p => ({...p, rewardType: e.target.value}))} style={inputStyle}>
                    <option value="free_item">Free Item</option>
                    <option value="discount_percent">Discount %</option>
                    <option value="discount_amount">Discount Amount</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <input value={rewardForm.description} onChange={e => setRewardForm(p => ({...p, description: e.target.value}))} placeholder="Optional description" style={inputStyle} />
                </div>
              </div>
              <button onClick={saveReward} style={{ padding: "10px 24px", borderRadius: 11, background: "#c8793a", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                <Plus size={14} style={{ marginRight: 4 }} />Add Reward
              </button>
            </div>
            {/* Reward list */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
              {rewards.map(r => (
                <div key={r._id} style={{ background: "#fff", border: "1.5px solid #e8d5b5", borderRadius: 14, padding: "14px 16px", opacity: r.isActive ? 1 : 0.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: 14, color: "#2c1810", margin: 0 }}>{r.name}</p>
                      <p style={{ color: "#c8793a", fontWeight: 700, fontSize: 13, margin: "3px 0" }}>{r.pointsCost} pts</p>
                      <p style={{ color: "#78716c", fontSize: 11, margin: 0, textTransform: "capitalize" }}>{r.rewardType.replace("_"," ")}</p>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => toggleReward(r)} style={{ padding: "4px 8px", borderRadius: 8, background: r.isActive ? "#f0fdf4" : "#fef2f2", border: `1px solid ${r.isActive ? "#bbf7d0" : "#fecaca"}`, color: r.isActive ? "#16a34a" : "#dc2626", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                        {r.isActive ? "ON" : "OFF"}
                      </button>
                      <button onClick={() => deleteReward(r._id)} style={{ width: 26, height: 26, borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {rewards.length === 0 && <p style={{ color: "#a16207", fontSize: 13 }}>No rewards yet</p>}
            </div>
          </div>

          {/* Trivia */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ color: "#2c1810", fontWeight: 800, fontSize: 16, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <Brain size={18} color="#c8793a" /> Trivia Questions ({trivia.length})
            </h3>
            <div style={{ background: "#fff", border: "1.5px solid #e8d5b5", borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <h4 style={{ color: "#2c1810", fontWeight: 700, fontSize: 14, margin: "0 0 14px" }}>Add Question</h4>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Question *</label>
                <input value={triviaForm.question} onChange={e => setTriviaForm(p => ({...p, question: e.target.value}))} placeholder="e.g. What country is coffee from?" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                {triviaForm.options.map((opt, i) => (
                  <div key={i}>
                    <label style={{ ...labelStyle, color: triviaForm.correctIndex === i ? "#16a34a" : "#78716c" }}>
                      Option {String.fromCharCode(65+i)} {triviaForm.correctIndex === i ? "✓ Correct" : ""}
                    </label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={opt} onChange={e => { const opts = [...triviaForm.options]; opts[i] = e.target.value; setTriviaForm(p => ({...p, options: opts})); }} placeholder={`Option ${String.fromCharCode(65+i)}`} style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={() => setTriviaForm(p => ({...p, correctIndex: i}))} style={{ padding: "0 10px", borderRadius: 8, background: triviaForm.correctIndex === i ? "#f0fdf4" : "#fdf8f0", border: `1px solid ${triviaForm.correctIndex === i ? "#bbf7d0" : "#e8d5b5"}`, color: triviaForm.correctIndex === i ? "#16a34a" : "#78716c", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✓</button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={saveTrivia} style={{ padding: "10px 24px", borderRadius: 11, background: "#c8793a", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                <Plus size={14} style={{ marginRight: 4 }} />Add Question
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {trivia.map((q, i) => (
                <div key={q._id} style={{ background: "#fff", border: "1.5px solid #e8d5b5", borderRadius: 12, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13, color: "#2c1810", margin: 0 }}>Q{i+1}. {q.question}</p>
                    <p style={{ color: "#78716c", fontSize: 11, margin: "2px 0 0" }}>Correct: {q.options?.[q.correctIndex]}</p>
                  </div>
                  <button onClick={() => deleteTrivia(q._id)} style={{ width: 28, height: 28, borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {trivia.length === 0 && <p style={{ color: "#a16207", fontSize: 13 }}>No questions yet — the game will use default coffee questions</p>}
            </div>
          </div>

          {/* Customers */}
          <div>
            <h3 style={{ color: "#2c1810", fontWeight: 800, fontSize: 16, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={18} color="#c8793a" /> Customers ({customers.length})
            </h3>
            <div style={{ background: "#fff", border: "1.5px solid #e8d5b5", borderRadius: 16, overflow: "hidden" }}>
              {customers.length === 0 && <p style={{ color: "#a16207", fontSize: 13, padding: 16 }}>No registered customers yet</p>}
              {customers.map((c, i) => (
                <div key={c._id} style={{ padding: "12px 16px", borderBottom: i < customers.length - 1 ? "1px solid #f0e6d3" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13, color: "#2c1810", margin: 0 }}>{c.name}</p>
                    <p style={{ color: "#78716c", fontSize: 11, margin: "1px 0 0" }}>{c.phone} · {c.tier} · {c.points?.toLocaleString()} pts</p>
                  </div>
                  <button onClick={() => setAdjustModal(c)} style={{ padding: "5px 12px", borderRadius: 8, background: "#fdf8f0", border: "1px solid #e8d5b5", color: "#b45309", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    Adjust pts
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── QR CODES TAB ── */}
      {activeTab === "qr" && (
        <div style={{ padding: "24px 24px" }}>
          {!storeSlug ? (
            <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 14, padding: 20 }}>
              <p style={{ color: "#92400e", fontWeight: 700, margin: 0 }}>⚠️ Store slug not found — make sure you're logged into the café staff account</p>
            </div>
          ) : (
            <>
              <p style={{ color: "#78716c", fontSize: 14, marginBottom: 24 }}>
                Each QR code links to: <code style={{ background: "#f5ece0", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>cafe/play/{storeSlug}?table=N</code>
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
                {tables.map(t => {
                  const url = `${window.location.origin}/cafe/play/${storeSlug}?table=${t.number}`;
                  return (
                    <div key={t._id} style={{ background: "#fff", border: "1.5px solid #e8d5b5", borderRadius: 18, padding: 20, textAlign: "center", boxShadow: "0 2px 10px rgba(44,24,16,0.06)" }}>
                      <p style={{ fontWeight: 800, fontSize: 15, color: "#2c1810", margin: "0 0 12px" }}>Table {t.number}</p>
                      <img src={qrUrl(url)} alt={`QR Table ${t.number}`} width={140} height={140} style={{ borderRadius: 10 }} />
                      <p style={{ color: "#78716c", fontSize: 10, margin: "8px 0 12px", wordBreak: "break-all" }}>{url}</p>
                      <button onClick={() => printQR(t.number)} style={{
                        width: "100%", padding: "8px 0", borderRadius: 10,
                        background: "#c8793a", border: "none", color: "#fff",
                        fontWeight: 700, fontSize: 13, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}>
                        <QrCode size={14} /> Print QR
                      </button>
                    </div>
                  );
                })}
                {tables.length === 0 && <p style={{ color: "#a16207", fontSize: 13 }}>Add tables first to generate QR codes</p>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Table modal ── */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(44,24,16,0.2)", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg,#2c1810,#4a2518)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>{editTarget ? `Edit Table ${editTarget.number}` : "Add New Table"}</span>
              <button onClick={() => setModal(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
              <div><label style={labelStyle}>Table Number *</label><input type="number" min="1" value={form.number} onChange={e=>setForm(p=>({...p,number:e.target.value}))} autoFocus style={inputStyle}/></div>
              <div>
                <label style={labelStyle}>Shape</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {SHAPES.map(s => (<button key={s} onClick={() => setForm(p=>({...p,shape:s}))} style={{ flex: 1, padding: "9px 6px", borderRadius: 10, border: `2px solid ${form.shape===s?"#c8793a":"#e8d5b5"}`, background: form.shape===s?"#fff7ed":"#fdf8f0", color: form.shape===s?"#b45309":"#78716c", fontWeight: 700, fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>{s === "round" ? "⭕" : s === "rectangle" ? "▬" : "⬛"} {s}</button>))}
                </div>
              </div>
              <div><label style={labelStyle}>Seats</label><input type="number" min="1" max="20" value={form.seats} onChange={e=>setForm(p=>({...p,seats:e.target.value}))} style={inputStyle}/></div>
              <div>
                <label style={labelStyle}>Color Tag</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{COLORS.map(c => (<button key={c} onClick={() => setForm(p=>({...p,color:c}))} style={{ width: 28, height: 28, borderRadius: "50%", background: c||"#e8d5b5", border: `2.5px solid ${form.color===c?"#2c1810":"transparent"}`, cursor: "pointer", boxSizing: "border-box" }}/>))}</div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setModal(false)} style={{ flex: 1, padding: 11, borderRadius: 12, background: "#f5f5f4", border: "1.5px solid #e7e5e4", color: "#78716c", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 11, borderRadius: 12, background: "linear-gradient(135deg,#c8793a,#b45309)", border: "none", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: saving?0.6:1 }}>
                  <Save size={14}/> {saving ? "Saving…" : editTarget ? "Update" : "Add Table"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust points modal ── */}
      {adjustModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 360, padding: 24 }}>
            <h3 style={{ color: "#2c1810", fontWeight: 800, fontSize: 17, margin: "0 0 16px" }}>Adjust Points — {adjustModal.name}</h3>
            <p style={{ color: "#78716c", fontSize: 13, margin: "0 0 14px" }}>Current: {adjustModal.points?.toLocaleString()} pts</p>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Amount (negative to deduct)</label>
              <input type="number" value={adjustAmt} onChange={e => setAdjustAmt(e.target.value)} placeholder="e.g. 50 or -20" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Reason</label>
              <input value={adjustDesc} onChange={e => setAdjustDesc(e.target.value)} placeholder="e.g. compensation" style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setAdjustModal(null)} style={{ flex: 1, padding: 11, borderRadius: 12, background: "#f5f5f4", border: "1.5px solid #e7e5e4", color: "#78716c", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleAdjust} style={{ flex: 2, padding: 11, borderRadius: 12, background: "#c8793a", border: "none", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Save Adjustment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
