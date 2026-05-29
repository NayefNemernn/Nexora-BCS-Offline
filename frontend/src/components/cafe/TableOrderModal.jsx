import { useState, useEffect, useRef } from "react";
import { X, Plus, Minus, Trash2, Send, ArrowLeftRight, GitMerge, CreditCard, Search } from "lucide-react";
import * as cafeApi from "../../api/cafe.api";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  pending:   { bg: "#f3f4f6", color: "#6b7280", label: "Waiting"   },
  preparing: { bg: "#fef3c7", color: "#b45309", label: "Preparing" },
  ready:     { bg: "#d1fae5", color: "#065f46", label: "Ready ✓"   },
  served:    { bg: "#dbeafe", color: "#1d4ed8", label: "Served"    },
  cancelled: { bg: "#fee2e2", color: "#b91c1c", label: "Cancelled" },
};

const CAT_COLORS = {
  drinks:   { color: "#1d4ed8", bg: "#eff6ff" },
  food:     { color: "#15803d", bg: "#f0fdf4" },
  desserts: { color: "#9333ea", bg: "#faf5ff" },
  extras:   { color: "#b45309", bg: "#fff7ed" },
  other:    { color: "#6b7280", bg: "#f3f4f6" },
};

const C = { espresso: "#2c1810", caramel: "#c8793a", cream: "#fdf8f0", border: "#e8d5b5" };

/* table: { _id, number, seats, shape } OR null for outside orders
   initialOrder: pre-loaded order (for outside orders already created) */
export default function TableOrderModal({ table, initialOrder, onClose, onCheckout, allTables, currencySymbol }) {
  const [order,         setOrder]         = useState(initialOrder || null);
  const [menuItems,     setMenuItems]     = useState([]);
  const [search,        setSearch]        = useState("");
  const [activeTab,     setActiveTab]     = useState("all");
  const [loading,       setLoading]       = useState(!initialOrder);
  const [sending,       setSending]       = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [transferModal, setTransferModal] = useState(false);
  const [mergeModal,    setMergeModal]    = useState(false);
  const [noteItem,      setNoteItem]      = useState(null);
  const [noteText,      setNoteText]      = useState("");
  const [modItem,       setModItem]       = useState(null);
  const [modText,       setModText]       = useState("");
  const searchRef = useRef();

  const isOutside = !table?._id;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ord, items] = await Promise.all([
        initialOrder ? Promise.resolve(initialOrder) : cafeApi.openOrder(table?._id),
        cafeApi.getCafeMenuItems({ available: "true" }),
      ]);
      setOrder(ord);
      setMenuItems(Array.isArray(items) ? items : []);
    } catch { toast.error("Failed to load order"); }
    finally { setLoading(false); }
  };

  // Category tabs derived from loaded menu
  const categories = ["all", ...new Set(menuItems.map(i => i.category))];

  const filtered = menuItems.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchTab    = activeTab === "all" || p.category === activeTab;
    return matchSearch && matchTab;
  });

  const cs           = currencySymbol || "$";
  const activeItems  = order?.items.filter(i => i.status !== "cancelled") || [];
  const subtotal     = activeItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const pendingKitchen = activeItems.filter(i => i.status === "pending" && !i.sentToKitchen).length;
  const otherOccupied  = (allTables || []).filter(t => t._id !== table?._id && t.status === "occupied" && t.activeOrderId);

  const addItem = async (menuItem) => {
    if (!order) return;
    try {
      const u = await cafeApi.addItems(order._id, [{
        menuItemId: menuItem._id,
        name:       menuItem.name,
        price:      menuItem.price,
        quantity:   1,
      }]);
      setOrder(u);
    } catch { toast.error("Failed to add item"); }
  };

  const changeQty = async (itemId, delta) => {
    const item = order.items.find(i => i._id === itemId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty < 1) return cancelItemFn(itemId);
    try { const u = await cafeApi.updateItem(order._id, itemId, { quantity: newQty }); setOrder(u); }
    catch { toast.error("Failed"); }
  };

  const cancelItemFn = async (itemId) => {
    try { const u = await cafeApi.cancelItem(order._id, itemId); setOrder(u); }
    catch { toast.error("Failed"); }
  };

  const saveNote = async () => {
    if (!noteItem) return;
    try { const u = await cafeApi.updateItem(order._id, noteItem, { notes: noteText }); setOrder(u); setNoteItem(null); }
    catch { toast.error("Failed"); }
  };

  const addModifier = async () => {
    if (!modItem || !modText.trim()) return;
    const item = order.items.find(i => i._id === modItem);
    if (!item) return;
    try {
      const u = await cafeApi.updateItem(order._id, modItem, { modifiers: [...(item.modifiers || []), modText.trim()] });
      setOrder(u); setModText(""); setModItem(null);
    } catch { toast.error("Failed"); }
  };

  const removeModifier = async (itemId, idx) => {
    const item = order.items.find(i => i._id === itemId);
    if (!item) return;
    try {
      const u = await cafeApi.updateItem(order._id, itemId, { modifiers: item.modifiers.filter((_, i) => i !== idx) });
      setOrder(u);
    } catch { toast.error("Failed"); }
  };

  const handleSendToKitchen = async () => {
    if (!pendingKitchen) return toast("No new items to send");
    setSending(true);
    try {
      const u = await cafeApi.sendToKitchen(order._id);
      setOrder(u);
      toast.success(`${pendingKitchen} item${pendingKitchen > 1 ? "s" : ""} sent to kitchen!`);
    } catch { toast.error("Failed"); } finally { setSending(false); }
  };

  const handleTransfer = async (toTableId) => {
    if (!selectedItems.length) return toast("Select items to transfer");
    try {
      const { fromOrder } = await cafeApi.transferItems({ fromOrderId: order._id, toTableId, itemIds: selectedItems });
      setOrder(fromOrder); setSelectedItems([]); setTransferModal(false);
      toast.success("Items transferred");
    } catch { toast.error("Failed"); }
  };

  const handleMerge = async (targetOrderId, targetNum) => {
    try {
      await cafeApi.mergeOrders({ sourceOrderId: order._id, targetOrderId });
      toast.success(`Merged into Table ${targetNum}`);
      onClose();
    } catch { toast.error("Failed"); }
  };

  const tableLabel = isOutside
    ? (order?.label || "Walk-in")
    : `Table ${table.number}`;

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(44,24,16,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 40 }}>☕</span>
        <p style={{ color: C.espresso, fontWeight: 700 }}>Opening order…</p>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(44,24,16,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{ background: C.cream, borderRadius: 22, width: "100%", maxWidth: 940, height: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(44,24,16,0.35)" }}>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg,${C.espresso},#4a2518)`, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(200,121,58,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              {isOutside ? "🚶" : "☕"}
            </div>
            <div>
              <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 18, margin: 0 }}>{tableLabel}</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, margin: 0 }}>
                {isOutside ? "Walk-in / Counter order" : `${table.seats} seats · ${table.shape}`}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!isOutside && (
              <>
                <HdrBtn icon={<ArrowLeftRight size={13}/>} label="Transfer" onClick={() => setTransferModal(true)}/>
                <HdrBtn icon={<GitMerge size={13}/>}       label="Merge"    onClick={() => setMergeModal(true)}/>
              </>
            )}
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={16}/>
            </button>
          </div>
        </div>

        {/* Body — two columns */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* LEFT — Menu */}
          <div style={{ width: 260, borderRight: `1.5px solid ${C.border}`, display: "flex", flexDirection: "column", background: "#fff", flexShrink: 0 }}>
            {/* Search */}
            <div style={{ padding: "10px 10px 6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream, border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "8px 12px" }}>
                <Search size={13} color="#a16207"/>
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu…"
                  style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: C.espresso }}/>
              </div>
            </div>

            {/* Category tabs */}
            <div style={{ display: "flex", gap: 4, padding: "4px 10px 6px", flexWrap: "wrap" }}>
              {categories.map(cat => {
                const cc = CAT_COLORS[cat] || { color: "#6b7280", bg: "#f3f4f6" };
                const active = activeTab === cat;
                return (
                  <button key={cat} onClick={() => setActiveTab(cat)}
                    style={{ padding: "4px 10px", borderRadius: 20, border: `1.5px solid ${active ? cc.color : "#e8d5b5"}`, background: active ? cc.bg : "transparent", color: active ? cc.color : "#78716c", fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>
                    {cat === "all" ? "All" : cat}
                  </button>
                );
              })}
            </div>

            {/* Items list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
              {filtered.length === 0 && (
                <p style={{ textAlign: "center", color: "#a16207", fontSize: 12, marginTop: 20 }}>
                  {menuItems.length === 0 ? "No menu items yet — add them in Café Menu settings" : "No items found"}
                </p>
              )}
              {filtered.map(p => {
                const cc = CAT_COLORS[p.category] || CAT_COLORS.other;
                return (
                  <button key={p._id} onClick={() => addItem(p)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 11, background: C.cream, border: `1.5px solid ${C.border}`, cursor: "pointer", textAlign: "left", transition: "all 0.12s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#fff7ed"; e.currentTarget.style.borderColor = C.caramel; }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.cream; e.currentTarget.style.borderColor = C.border; }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: C.espresso, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: C.caramel }}>{cs}{p.price.toFixed(2)}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 10, background: cc.bg, color: cc.color }}>{p.category}</span>
                      </div>
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.caramel, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 6 }}>
                      <Plus size={12} color="#fff"/>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT — Order items */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {activeItems.length === 0 && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 40 }}>
                  <span style={{ fontSize: 36 }}>🍽️</span>
                  <p style={{ color: "#a16207", fontWeight: 600, fontSize: 14 }}>Order is empty</p>
                  <p style={{ color: "#78716c", fontSize: 12 }}>Add items from the menu on the left</p>
                </div>
              )}

              {order?.items.map(item => {
                const st = STATUS_BADGE[item.status] || STATUS_BADGE.pending;
                const isCancelled = item.status === "cancelled";
                return (
                  <div key={item._id} style={{ background: "#fff", border: `1.5px solid ${isCancelled ? "#fecaca" : C.border}`, borderRadius: 14, padding: "12px 14px", opacity: isCancelled ? 0.45 : 1, boxShadow: "0 1px 6px rgba(44,24,16,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      {!isCancelled && !isOutside && (
                        <input type="checkbox" checked={selectedItems.includes(item._id)}
                          onChange={e => setSelectedItems(prev => e.target.checked ? [...prev, item._id] : prev.filter(id => id !== item._id))}
                          style={{ marginTop: 3, accentColor: C.caramel, flexShrink: 0 }}/>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: C.espresso }}>{item.name}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                          {item.sentToKitchen && item.status === "pending" && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#f3e8ff", color: "#7c3aed" }}>In kitchen</span>
                          )}
                        </div>

                        {item.modifiers?.length > 0 && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                            {item.modifiers.map((m, i) => (
                              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#fdf8f0", border: `1px solid ${C.border}`, color: "#78716c" }}>
                                {m}
                                {item.status === "pending" && (
                                  <button onClick={() => removeModifier(item._id, i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#b91c1c", padding: 0, display: "flex", alignItems: "center" }}>
                                    <X size={8}/>
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}

                        {item.notes && <p style={{ fontSize: 11, color: "#a16207", fontStyle: "italic", margin: "3px 0 0" }}>"{item.notes}"</p>}

                        {item.status === "pending" && (
                          <div style={{ display: "flex", gap: 10, marginTop: 5 }}>
                            <button onClick={() => { setNoteItem(item._id); setNoteText(item.notes || ""); }} style={microBtn}>+ Note</button>
                            <button onClick={() => { setModItem(item._id); setModText(""); }} style={microBtn}>+ Modifier</button>
                          </div>
                        )}
                      </div>

                      {!isCancelled && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <button onClick={() => changeQty(item._id, -1)} style={qtyBtn}><Minus size={10}/></button>
                          <span style={{ fontWeight: 800, fontSize: 14, color: C.espresso, minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                          <button onClick={() => changeQty(item._id,  1)} style={qtyBtn}><Plus size={10}/></button>
                          <button onClick={() => cancelItemFn(item._id)} style={{ ...qtyBtn, background: "#fef2f2", color: "#b91c1c", marginLeft: 2 }}><Trash2 size={10}/></button>
                        </div>
                      )}

                      <span style={{ fontWeight: 800, fontSize: 14, color: C.espresso, minWidth: 60, textAlign: "right", flexShrink: 0 }}>
                        {cs}{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ borderTop: `1.5px solid ${C.border}`, padding: "14px 16px", background: "#fff", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "#78716c", fontWeight: 600 }}>SUBTOTAL</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.espresso }}>{cs}{subtotal.toFixed(2)}</p>
                </div>
                {pendingKitchen > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "#fff7ed", color: "#c8793a", border: "1px solid #fed7aa" }}>
                    {pendingKitchen} item{pendingKitchen > 1 ? "s" : ""} not sent
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleSendToKitchen} disabled={sending || !pendingKitchen}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 13, borderRadius: 13, background: pendingKitchen ? "linear-gradient(135deg,#ea580c,#c2410c)" : "#f3f4f6", border: "none", color: pendingKitchen ? "#fff" : "#9ca3af", fontWeight: 800, fontSize: 14, cursor: pendingKitchen ? "pointer" : "not-allowed" }}>
                  <Send size={15}/> {sending ? "Sending…" : "Send to Kitchen"}
                </button>
                <button onClick={() => onCheckout(order)} disabled={!activeItems.length}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 13, borderRadius: 13, background: activeItems.length ? `linear-gradient(135deg,${C.espresso},#4a2518)` : "#f3f4f6", border: "none", color: activeItems.length ? "#fff" : "#9ca3af", fontWeight: 800, fontSize: 14, cursor: activeItems.length ? "pointer" : "not-allowed" }}>
                  <CreditCard size={15}/> Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note mini-modal */}
      {noteItem && <MiniModal title="Add Note" onClose={() => setNoteItem(null)} onConfirm={saveNote} confirmLabel="Save Note">
        <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} autoFocus placeholder="e.g. extra hot, no ice…"
          style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.cream, fontSize: 13, resize: "none", outline: "none", boxSizing: "border-box", color: C.espresso }}/>
      </MiniModal>}

      {/* Modifier mini-modal */}
      {modItem && <MiniModal title="Add Modifier" onClose={() => setModItem(null)} onConfirm={addModifier} confirmLabel="Add">
        <input value={modText} onChange={e => setModText(e.target.value)} autoFocus placeholder="e.g. no sugar, oat milk…"
          onKeyDown={e => { if (e.key === "Enter") addModifier(); }}
          style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.cream, fontSize: 13, outline: "none", boxSizing: "border-box", color: C.espresso }}/>
      </MiniModal>}

      {/* Transfer modal */}
      {transferModal && (
        <MiniModal title={`Transfer ${selectedItems.length} item(s) to…`} onClose={() => setTransferModal(false)} noConfirm>
          {otherOccupied.length === 0
            ? <p style={{ color: "#78716c", fontSize: 13, textAlign: "center" }}>No other occupied tables</p>
            : otherOccupied.map(t => (
              <button key={t._id} onClick={() => handleTransfer(t._id)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderRadius: 12, background: C.cream, border: `1.5px solid ${C.border}`, cursor: "pointer", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: C.espresso }}>Table {t.number}</span>
              </button>
            ))}
        </MiniModal>
      )}

      {/* Merge modal */}
      {mergeModal && (
        <MiniModal title={`Merge Table ${table?.number} into…`} onClose={() => setMergeModal(false)} noConfirm>
          <p style={{ fontSize: 12, color: "#78716c", marginBottom: 10 }}>All items move to the target table.</p>
          {otherOccupied.length === 0
            ? <p style={{ color: "#78716c", fontSize: 13, textAlign: "center" }}>No other occupied tables</p>
            : otherOccupied.map(t => (
              <button key={t._id} onClick={() => handleMerge(t.activeOrderId, t.number)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderRadius: 12, background: "#fff7ed", border: "1.5px solid #fed7aa", cursor: "pointer", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: C.espresso }}>Table {t.number}</span>
                <GitMerge size={14} color={C.caramel}/>
              </button>
            ))}
        </MiniModal>
      )}
    </div>
  );
}

function HdrBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 9, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
      {icon}{label}
    </button>
  );
}

function MiniModal({ title, onClose, onConfirm, confirmLabel, noConfirm, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(44,24,16,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 340, boxShadow: "0 16px 50px rgba(44,24,16,0.25)", overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#2c1810,#4a2518)", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{title}</span>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 26, height: 26, borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={13}/></button>
        </div>
        <div style={{ padding: "16px 18px" }}>
          {children}
          {!noConfirm && (
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 9, borderRadius: 10, background: "#f5f5f4", border: "1.5px solid #e7e5e4", color: "#78716c", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={onConfirm} style={{ flex: 2, padding: 9, borderRadius: 10, background: "linear-gradient(135deg,#c8793a,#b45309)", border: "none", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>{confirmLabel}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const qtyBtn  = { width: 26, height: 26, borderRadius: 8, background: "#f5f5f4", border: "1.5px solid #e7e5e4", color: "#4b5563", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const microBtn = { background: "none", border: "none", color: "#b45309", fontSize: 11, fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 };
