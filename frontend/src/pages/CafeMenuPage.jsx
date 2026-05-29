import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit2, ArrowLeft, UtensilsCrossed, Save, X, ToggleLeft, ToggleRight } from "lucide-react";
import * as cafeApi from "../api/cafe.api";
import toast from "react-hot-toast";

const CATS = [
  { key: "all",      label: "All",      color: "#6b7280", bg: "#f3f4f6" },
  { key: "drinks",   label: "☕ Drinks",  color: "#1d4ed8", bg: "#eff6ff" },
  { key: "food",     label: "🍽️ Food",   color: "#15803d", bg: "#f0fdf4" },
  { key: "desserts", label: "🍰 Desserts",color: "#9333ea", bg: "#faf5ff" },
  { key: "extras",   label: "✨ Extras",  color: "#b45309", bg: "#fff7ed" },
  { key: "other",    label: "📦 Other",   color: "#6b7280", bg: "#f3f4f6" },
];
const CAT_MAP = Object.fromEntries(CATS.map(c => [c.key, c]));
const EMPTY   = { name: "", category: "drinks", price: "", description: "" };

export default function CafeMenuPage({ setPage }) {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("all");
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState(EMPTY);
  const [editId,   setEditId]   = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await cafeApi.getCafeMenuItems()); }
    catch { toast.error("Failed to load menu"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditId(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => {
    setEditId(item._id);
    setForm({ name: item.name, category: item.category, price: item.price, description: item.description || "" });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    if (!form.price || isNaN(form.price) || +form.price < 0) return toast.error("Valid price required");
    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price) };
      if (editId) {
        const u = await cafeApi.updateCafeMenuItem(editId, payload);
        setItems(prev => prev.map(i => i._id === u._id ? u : i));
        toast.success("Updated");
      } else {
        const c = await cafeApi.createCafeMenuItem(payload);
        setItems(prev => [...prev, c]);
        toast.success("Added to menu");
      }
      setModal(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Remove "${item.name}" from the menu?`)) return;
    setDeleting(item._id);
    try {
      await cafeApi.deleteCafeMenuItem(item._id);
      setItems(prev => prev.filter(i => i._id !== item._id));
      toast.success("Removed");
    } catch { toast.error("Failed"); }
    finally { setDeleting(null); }
  };

  const toggleAvail = async (item) => {
    try {
      const u = await cafeApi.updateCafeMenuItem(item._id, { isAvailable: !item.isAvailable });
      setItems(prev => prev.map(i => i._id === u._id ? u : i));
    } catch { toast.error("Failed"); }
  };

  const visible = tab === "all" ? items : items.filter(i => i.category === tab);

  return (
    <div style={{ minHeight: "100%", background: "linear-gradient(160deg,#fdf8f0 0%,#f5ece0 100%)", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#2c1810 0%,#4a2518 100%)", padding: "22px 28px 18px", boxShadow: "0 4px 20px rgba(44,24,16,0.2)", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {setPage && (
              <button onClick={() => setPage("cafe")} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ArrowLeft size={16}/>
              </button>
            )}
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(200,121,58,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UtensilsCrossed size={20} color="#c8793a"/>
            </div>
            <div>
              <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 20, margin: 0 }}>Café Menu</h1>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: 0, marginTop: 2 }}>{items.length} items · manage what staff can order</p>
            </div>
          </div>
          <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 11, background: "#c8793a", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            <Plus size={15}/> Add Item
          </button>
        </div>
      </div>

      <div style={{ padding: "0 24px" }}>
        {/* Category tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {CATS.map(c => (
            <button key={c.key} onClick={() => setTab(c.key)}
              style={{ padding: "8px 16px", borderRadius: 20, border: `2px solid ${tab === c.key ? c.color : "#e8d5b5"}`, background: tab === c.key ? c.bg : "#fff", color: tab === c.key ? c.color : "#78716c", fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}>
              {c.label}
              {c.key !== "all" && (
                <span style={{ marginLeft: 6, fontSize: 10, background: "rgba(0,0,0,0.08)", padding: "1px 6px", borderRadius: 10 }}>
                  {items.filter(i => i.category === c.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Items grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#b45309" }}>Loading menu…</div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
            <p style={{ color: "#a16207", fontWeight: 700 }}>No items in this category</p>
            <button onClick={openAdd} style={{ marginTop: 10, color: "#b45309", background: "none", border: "none", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>Add first item</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {visible.map(item => {
              const cat = CAT_MAP[item.category] || CAT_MAP.other;
              return (
                <div key={item._id} style={{ background: "#fff", border: "1.5px solid #e8d5b5", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 10px rgba(44,24,16,0.06)", opacity: item.isAvailable ? 1 : 0.55 }}>
                  {/* Category stripe */}
                  <div style={{ height: 4, background: cat.color }}/>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 800, fontSize: 14, color: "#2c1810", margin: 0 }}>{item.name}</p>
                        {item.description && <p style={{ fontSize: 11, color: "#78716c", margin: "3px 0 0", lineHeight: 1.4 }}>{item.description}</p>}
                      </div>
                      <p style={{ fontWeight: 900, fontSize: 16, color: "#c8793a", margin: 0, flexShrink: 0 }}>
                        ${item.price.toFixed(2)}
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: cat.bg, color: cat.color }}>
                        {cat.label}
                      </span>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        {/* Available toggle */}
                        <button onClick={() => toggleAvail(item)} title={item.isAvailable ? "Mark unavailable" : "Mark available"}
                          style={{ background: "none", border: "none", cursor: "pointer", color: item.isAvailable ? "#15803d" : "#9ca3af", display: "flex", alignItems: "center" }}>
                          {item.isAvailable ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
                        </button>
                        <button onClick={() => openEdit(item)} style={{ width: 28, height: 28, borderRadius: 8, background: "#fdf8f0", border: "1px solid #e8d5b5", color: "#b45309", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Edit2 size={11}/>
                        </button>
                        <button onClick={() => handleDelete(item)} disabled={deleting === item._id}
                          style={{ width: 28, height: 28, borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: deleting === item._id ? 0.4 : 1 }}>
                          <Trash2 size={11}/>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(44,24,16,0.2)", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg,#2c1810,#4a2518)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>{editId ? "Edit Item" : "Add Menu Item"}</span>
              <button onClick={() => setModal(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14}/>
              </button>
            </div>
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Name */}
              <div>
                <label style={lbl}>Item Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus placeholder="e.g. Flat White" style={inp}/>
              </div>
              {/* Category + Price */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inp}>
                    {CATS.filter(c => c.key !== "all").map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Price *</label>
                  <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00" style={inp}/>
                </div>
              </div>
              {/* Description */}
              <div>
                <label style={lbl}>Description (optional)</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Single origin espresso with steamed milk" style={inp}/>
              </div>
              {/* Buttons */}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setModal(false)} style={{ flex: 1, padding: 11, borderRadius: 12, background: "#f5f5f4", border: "1.5px solid #e7e5e4", color: "#78716c", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 11, borderRadius: 12, background: "linear-gradient(135deg,#c8793a,#b45309)", border: "none", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: saving ? 0.6 : 1 }}>
                  <Save size={14}/> {saving ? "Saving…" : editId ? "Update Item" : "Add to Menu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = { fontSize: 11, fontWeight: 700, color: "#78716c", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 };
const inp = { width: "100%", padding: "10px 13px", borderRadius: 10, border: "1.5px solid #e8d5b5", background: "#fdf8f0", fontSize: 13, color: "#2c1810", outline: "none", boxSizing: "border-box" };
