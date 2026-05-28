import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Check, UserCheck, XCircle, Calendar, Phone, Users } from "lucide-react";
import * as cafeApi from "../api/cafe.api";
import toast from "react-hot-toast";

const STATUS_STYLE = {
  pending:   { bg: "#fef9c3", color: "#a16207", border: "#fde68a", label: "Pending"   },
  confirmed: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", label: "Confirmed" },
  seated:    { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", label: "Seated"    },
  cancelled: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", label: "Cancelled" },
};

const fmt = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
const dateStr = (d) => d.toISOString().split("T")[0];
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const isToday  = (d) => dateStr(d) === dateStr(new Date());
const EMPTY    = { customerName: "", phone: "", partySize: 2, time: "12:00", notes: "", tableId: "" };

export default function CafeReservations({ setPage }) {
  const [date,         setDate]         = useState(new Date());
  const [reservations, setReservations] = useState([]);
  const [tables,       setTables]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [form,         setForm]         = useState(EMPTY);
  const [saving,       setSaving]       = useState(false);

  useEffect(() => { load(); }, [date]);
  useEffect(() => { cafeApi.getTables().then(setTables).catch(() => {}); }, []);

  const load = async () => {
    setLoading(true);
    try { setReservations(await cafeApi.getReservations({ date: dateStr(date) })); }
    catch { toast.error("Failed to load reservations"); }
    finally { setLoading(false); }
  };

  const openAdd  = () => { setEditTarget(null); setForm(EMPTY); setModal(true); };
  const openEdit = (r) => { setEditTarget(r); setForm({ customerName: r.customerName, phone: r.phone, partySize: r.partySize, time: r.time, notes: r.notes, tableId: r.tableId?._id || "" }); setModal(true); };

  const handleSave = async () => {
    if (!form.customerName.trim()) return toast.error("Customer name required");
    setSaving(true);
    try {
      const payload = { ...form, date: dateStr(date), partySize: parseInt(form.partySize) || 1, tableId: form.tableId || null };
      editTarget ? await cafeApi.updateReservation(editTarget._id, payload) : await cafeApi.createReservation(payload);
      toast.success(editTarget ? "Updated" : "Reservation created");
      setModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  const handleConfirm = async (r) => { try { await cafeApi.updateReservation(r._id, { status: "confirmed" }); load(); } catch { toast.error("Failed"); } };
  const handleSeat    = async (r) => { try { await cafeApi.seatReservation(r._id); toast.success(`${r.customerName} seated`); load(); } catch (err) { toast.error(err.response?.data?.message || "Failed"); } };
  const handleCancel  = async (r) => { if (!window.confirm(`Cancel for ${r.customerName}?`)) return; try { await cafeApi.cancelReservation(r._id); load(); } catch { toast.error("Failed"); } };

  const byStatus = (s) => reservations.filter(r => r.status === s);
  const active   = reservations.filter(r => !["cancelled","seated"].includes(r.status));

  return (
    <div style={{ minHeight: "100%", background: "linear-gradient(160deg,#fdf8f0 0%,#f5ece0 100%)", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#2c1810 0%,#4a2518 100%)", padding: "22px 28px 18px", boxShadow: "0 4px 20px rgba(44,24,16,0.2)", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(200,121,58,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={20} color="#c8793a"/>
            </div>
            <div>
              <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 20, margin: 0 }}>Reservations</h1>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: 0, marginTop: 2 }}>
                {active.length} active today
              </p>
            </div>
          </div>
          <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 11, background: "#c8793a", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            <Plus size={15}/> New Reservation
          </button>
        </div>
      </div>

      <div style={{ padding: "0 24px" }}>
        {/* Date nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 24 }}>
          <button onClick={() => setDate(addDays(date,-1))} style={navBtnStyle}><ChevronLeft size={18}/></button>
          <div style={{ textAlign: "center", minWidth: 220 }}>
            <p style={{ fontWeight: 800, fontSize: 18, color: "#2c1810", margin: 0 }}>{fmt(date)}</p>
            <p style={{ fontSize: 12, color: "#a16207", margin: 0, marginTop: 2 }}>
              {isToday(date) ? "Today" : ""} · {reservations.length} reservation{reservations.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={() => setDate(addDays(date,1))} style={navBtnStyle}><ChevronRight size={18}/></button>
        </div>

        {!isToday(date) && (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <button onClick={() => setDate(new Date())} style={{ color: "#b45309", fontSize: 12, fontWeight: 600, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Back to Today</button>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#b45309" }}>Loading…</div>
        ) : reservations.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
            <p style={{ color: "#a16207", fontWeight: 700, fontSize: 16 }}>No reservations for this day</p>
            <button onClick={openAdd} style={{ marginTop: 12, color: "#b45309", fontSize: 13, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Add one now</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 720, margin: "0 auto" }}>
            {[...reservations].sort((a,b) => a.time.localeCompare(b.time)).map(r => {
              const st = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
              return (
                <div key={r._id} style={{ background: "#fff", border: `1.5px solid ${st.border}`, borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, boxShadow: "0 2px 12px rgba(44,24,16,0.06)", opacity: r.status === "cancelled" ? 0.55 : 1 }}>
                  <div style={{ display: "flex", gap: 16, flex: 1 }}>
                    {/* Time */}
                    <div style={{ textAlign: "center", minWidth: 52 }}>
                      <p style={{ fontWeight: 800, fontSize: 20, color: "#c8793a", margin: 0, lineHeight: 1.1 }}>{r.time}</p>
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: "#2c1810" }}>{r.customerName}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
                      </div>
                      <div style={{ display: "flex", gap: 14, marginTop: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "#78716c", display: "flex", alignItems: "center", gap: 4 }}>
                          <Users size={11}/> {r.partySize} guests
                        </span>
                        {r.phone && (
                          <span style={{ fontSize: 12, color: "#78716c", display: "flex", alignItems: "center", gap: 4 }}>
                            <Phone size={11}/> {r.phone}
                          </span>
                        )}
                        {r.tableId && (
                          <span style={{ fontSize: 12, color: "#78716c" }}>Table {r.tableId?.number || "–"}</span>
                        )}
                      </div>
                      {r.notes && <p style={{ fontSize: 12, color: "#a16207", fontStyle: "italic", margin: "4px 0 0" }}>"{r.notes}"</p>}
                    </div>
                  </div>

                  {/* Actions */}
                  {!["cancelled","seated"].includes(r.status) && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {r.status === "pending" && (
                        <ActionBtn icon={<Check size={13}/>} label="Confirm" color="#1d4ed8" bg="#eff6ff" onClick={() => handleConfirm(r)}/>
                      )}
                      <ActionBtn icon={<UserCheck size={13}/>} label="Seat" color="#15803d" bg="#f0fdf4" onClick={() => handleSeat(r)}/>
                      <ActionBtn icon={<Plus size={13} style={{transform:"rotate(45deg)"}}/>} label="Edit" color="#6b7280" bg="#f9fafb" onClick={() => openEdit(r)}/>
                      <ActionBtn icon={<XCircle size={13}/>} label="Cancel" color="#b91c1c" bg="#fef2f2" onClick={() => handleCancel(r)}/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(44,24,16,0.2)", overflow: "hidden" }}>
            {/* Modal header */}
            <div style={{ background: "linear-gradient(135deg,#2c1810,#4a2518)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>📅</span>
                <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>{editTarget ? "Edit Reservation" : "New Reservation"}</span>
              </div>
              <button onClick={() => setModal(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15}/>
              </button>
            </div>

            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Customer Name *" value={form.customerName} onChange={v => setForm(p=>({...p,customerName:v}))} autoFocus/>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Phone" value={form.phone} onChange={v => setForm(p=>({...p,phone:v}))}/>
                <Field label="Party Size" type="number" min="1" value={form.partySize} onChange={v => setForm(p=>({...p,partySize:v}))}/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Time" type="time" value={form.time} onChange={v => setForm(p=>({...p,time:v}))}/>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#78716c", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Table (optional)</label>
                  <select value={form.tableId} onChange={e => setForm(p=>({...p,tableId:e.target.value}))} style={inputStyle}>
                    <option value="">Any table</option>
                    {tables.filter(t=>t.status==="available").map(t=><option key={t._id} value={t._id}>Table {t.number} ({t.seats}p)</option>)}
                  </select>
                </div>
              </div>
              <Field label="Notes" value={form.notes} onChange={v => setForm(p=>({...p,notes:v}))}/>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setModal(false)} style={{ flex: 1, padding: "11px", borderRadius: 12, background: "#f5f5f4", border: "1.5px solid #e7e5e4", color: "#78716c", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "11px", borderRadius: 12, background: "linear-gradient(135deg,#c8793a,#b45309)", border: "none", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving…" : editTarget ? "Update Reservation" : "Create Reservation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle = { width: 38, height: 38, borderRadius: 11, background: "#fff", border: "1.5px solid #e8d5b5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#78716c" };
const inputStyle  = { width: "100%", padding: "9px 12px", borderRadius: 10, border: "1.5px solid #e8d5b5", background: "#fdf8f0", fontSize: 13, color: "#2c1810", outline: "none", boxSizing: "border-box" };

function Field({ label, value, onChange, type = "text", autoFocus, min }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#78716c", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} autoFocus={autoFocus} min={min} style={inputStyle}/>
    </div>
  );
}

function ActionBtn({ icon, label, color, bg, onClick }) {
  return (
    <button onClick={onClick} title={label}
      style={{ padding: "7px 10px", borderRadius: 10, background: bg, border: `1.5px solid ${color}22`, color, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, transition: "opacity 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.opacity="0.75"}
      onMouseLeave={e => e.currentTarget.style.opacity="1"}>
      {icon} {label}
    </button>
  );
}
