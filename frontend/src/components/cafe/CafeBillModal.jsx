import { useState } from "react";
import { X, CreditCard, Banknote, SplitSquareVertical, Receipt } from "lucide-react";
import * as cafeApi from "../../api/cafe.api";
import toast from "react-hot-toast";

const PAY_METHODS = [
  { id: "cash",  label: "Cash",  icon: "💵", Icon: Banknote           },
  { id: "card",  label: "Card",  icon: "💳", Icon: CreditCard          },
  { id: "split", label: "Split", icon: "✂️", Icon: SplitSquareVertical },
];

export default function CafeBillModal({ order, table, taxRate, currencySymbol, onClose, onDone }) {
  const cs = currencySymbol || "$";
  const [serviceCharge, setServiceCharge] = useState(order.serviceCharge || 0);
  const [discount,      setDiscount]      = useState(order.discount      || 0);
  const [payMethod,     setPayMethod]     = useState("cash");
  const [splits,        setSplits]        = useState([{ method: "cash", amount: "" }, { method: "card", amount: "" }]);
  const [splitWays,     setSplitWays]     = useState(2);
  const [splitMode,     setSplitMode]     = useState("even");
  const [customerName,  setCustomerName]  = useState("");
  const [processing,    setProcessing]    = useState(false);

  const activeItems = order.items.filter(i => i.status !== "cancelled");
  const subtotal    = activeItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const scAmt       = +(subtotal * serviceCharge / 100).toFixed(2);
  const discAmt     = +(subtotal * discount / 100).toFixed(2);
  const taxable     = +(subtotal + scAmt - discAmt).toFixed(2);
  const taxAmt      = +(taxable * (taxRate || 0) / 100).toFixed(2);
  const total       = +(taxable + taxAmt).toFixed(2);
  const perPerson   = splitMode === "even" ? (total / splitWays).toFixed(2) : null;

  const handleCheckout = async () => {
    setProcessing(true);
    try {
      await cafeApi.updateOrderMeta(order._id, { serviceCharge, discount });
      let body = { paymentMethod: payMethod, customerName };
      if (payMethod === "split") {
        const filled = splits.filter(s => s.amount && !isNaN(s.amount));
        const summed = filled.reduce((s, x) => s + parseFloat(x.amount), 0);
        if (Math.abs(summed - total) > 0.01) {
          toast.error(`Split total ${cs}${summed.toFixed(2)} doesn't match bill ${cs}${total.toFixed(2)}`);
          setProcessing(false); return;
        }
        body.splitPayments = filled.map(s => ({ method: s.method, amount: parseFloat(s.amount) }));
      }
      const { sale } = await cafeApi.checkoutOrder(order._id, body);
      toast.success(`Table ${table.number} checked out — ${cs}${total.toFixed(2)}`);
      onDone(sale);
    } catch (err) {
      toast.error(err.response?.data?.message || "Checkout failed");
    } finally { setProcessing(false); }
  };

  const updateSplit = (i, field, val) =>
    setSplits(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  const autoFillSplit = () =>
    setSplits(Array.from({ length: splitWays }, (_, i) => ({
      method: i % 2 === 0 ? "cash" : "card",
      amount: (total / splitWays).toFixed(2),
    })));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 55, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 500, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 64px rgba(44,24,16,0.28)" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#2c1810 0%,#4a2518 100%)", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(200,121,58,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Receipt size={20} color="#c8793a"/>
            </div>
            <div>
              <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 18, margin: 0 }}>Bill — Table {table.number}</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, margin: 0, marginTop: 2 }}>{activeItems.length} item{activeItems.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16}/>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16, background: "linear-gradient(160deg,#fdf8f0 0%,#f5ece0 100%)" }}>

          {/* Receipt items */}
          <div style={{ background: "#fff", border: "1.5px solid #e8d5b5", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: "#fdf8f0", borderBottom: "1px solid #e8d5b5" }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#a16207", textTransform: "uppercase", letterSpacing: 0.6 }}>Order Items</span>
            </div>
            {activeItems.map((item, idx) => (
              <div key={item._id} style={{ padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: idx < activeItems.length - 1 ? "1px solid #f3e8d6" : "none" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: "#2c1810", margin: 0 }}>{item.name}</p>
                  {item.modifiers?.length > 0 && (
                    <p style={{ fontSize: 10, color: "#a16207", margin: "2px 0 0" }}>{item.modifiers.join(" · ")}</p>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: 12, color: "#78716c", margin: 0 }}>{item.quantity} × {cs}{item.price.toFixed(2)}</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#2c1810", margin: 0 }}>{cs}{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charges & totals */}
          <div style={{ background: "#fff", border: "1.5px solid #e8d5b5", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: "#fdf8f0", borderBottom: "1px solid #e8d5b5" }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#a16207", textTransform: "uppercase", letterSpacing: 0.6 }}>Adjustments</span>
            </div>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Subtotal */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#78716c" }}>Subtotal</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#2c1810" }}>{cs}{subtotal.toFixed(2)}</span>
              </div>
              {/* Service charge */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: "#78716c", flex: 1 }}>Service Charge</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="number" min="0" max="100" value={serviceCharge}
                    onChange={e => setServiceCharge(parseFloat(e.target.value) || 0)}
                    style={{ width: 56, padding: "5px 8px", borderRadius: 8, border: "1.5px solid #e8d5b5", background: "#fdf8f0", fontSize: 12, color: "#2c1810", outline: "none", textAlign: "center" }}/>
                  <span style={{ fontSize: 11, color: "#78716c" }}>%</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#15803d", minWidth: 64, textAlign: "right" }}>+{cs}{scAmt.toFixed(2)}</span>
                </div>
              </div>
              {/* Discount */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: "#78716c", flex: 1 }}>Discount</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="number" min="0" max="100" value={discount}
                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                    style={{ width: 56, padding: "5px 8px", borderRadius: 8, border: "1.5px solid #e8d5b5", background: "#fdf8f0", fontSize: 12, color: "#2c1810", outline: "none", textAlign: "center" }}/>
                  <span style={{ fontSize: 11, color: "#78716c" }}>%</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c", minWidth: 64, textAlign: "right" }}>-{cs}{discAmt.toFixed(2)}</span>
                </div>
              </div>
              {/* Tax */}
              {taxRate > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#78716c" }}>Tax ({taxRate}%)</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#2c1810" }}>+{cs}{taxAmt.toFixed(2)}</span>
                </div>
              )}
              {/* Total */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, marginTop: 4, borderTop: "2px dashed #e8d5b5" }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#2c1810" }}>Total</span>
                <span style={{ fontSize: 26, fontWeight: 900, color: "#c8793a", letterSpacing: -0.5 }}>{cs}{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer name */}
          <input value={customerName} onChange={e => setCustomerName(e.target.value)}
            placeholder="Customer name (optional)"
            style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1.5px solid #e8d5b5", background: "#fff", fontSize: 13, color: "#2c1810", outline: "none", boxSizing: "border-box" }}/>

          {/* Payment method */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#a16207", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>Payment Method</p>
            <div style={{ display: "flex", gap: 10 }}>
              {PAY_METHODS.map(({ id, label, icon }) => (
                <button key={id} onClick={() => setPayMethod(id)}
                  style={{ flex: 1, padding: "14px 8px", borderRadius: 14, border: `2px solid ${payMethod === id ? "#c8793a" : "#e8d5b5"}`, background: payMethod === id ? "#fff7ed" : "#fff", color: payMethod === id ? "#b45309" : "#78716c", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Split config */}
          {payMethod === "split" && (
            <div style={{ background: "#fff", border: "1.5px solid #e8d5b5", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", background: "#fdf8f0", borderBottom: "1px solid #e8d5b5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#a16207", textTransform: "uppercase", letterSpacing: 0.6 }}>Split Bill</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {["even","custom"].map(m => (
                    <button key={m} onClick={() => setSplitMode(m)}
                      style={{ padding: "4px 12px", borderRadius: 8, border: "none", background: splitMode === m ? "#c8793a" : "#f5ece0", color: splitMode === m ? "#fff" : "#78716c", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {splitMode === "even" ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, color: "#78716c" }}>Number of ways</span>
                      <input type="number" min="2" max="20" value={splitWays}
                        onChange={e => setSplitWays(Math.max(2, parseInt(e.target.value) || 2))}
                        style={{ width: 60, padding: "6px 10px", borderRadius: 9, border: "1.5px solid #e8d5b5", background: "#fdf8f0", fontSize: 13, color: "#2c1810", outline: "none", textAlign: "center", marginLeft: "auto" }}/>
                    </div>
                    <div style={{ textAlign: "center", padding: "14px 0", background: "#fdf8f0", borderRadius: 12 }}>
                      <p style={{ fontSize: 28, fontWeight: 900, color: "#c8793a", margin: 0 }}>{cs}{perPerson}</p>
                      <p style={{ fontSize: 11, color: "#a16207", margin: "4px 0 0" }}>per person · {splitWays} ways</p>
                    </div>
                  </>
                ) : (
                  <>
                    <button onClick={autoFillSplit} style={{ alignSelf: "flex-end", color: "#c8793a", fontSize: 11, fontWeight: 700, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                      Auto-fill evenly
                    </button>
                    {splits.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#78716c", minWidth: 60 }}>Person {i + 1}</span>
                        <select value={s.method} onChange={e => updateSplit(i, "method", e.target.value)}
                          style={{ flex: 1, padding: "7px 10px", borderRadius: 9, border: "1.5px solid #e8d5b5", background: "#fdf8f0", fontSize: 12, color: "#2c1810", outline: "none" }}>
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                        </select>
                        <input type="number" value={s.amount} onChange={e => updateSplit(i, "amount", e.target.value)}
                          placeholder={cs + "0.00"}
                          style={{ width: 90, padding: "7px 10px", borderRadius: 9, border: "1.5px solid #e8d5b5", background: "#fdf8f0", fontSize: 12, color: "#2c1810", outline: "none" }}/>
                      </div>
                    ))}
                    {splits.length < 10 && (
                      <button onClick={() => setSplits(p => [...p, { method: "cash", amount: "" }])}
                        style={{ alignSelf: "flex-start", color: "#c8793a", fontSize: 11, fontWeight: 700, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                        + Add person
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 22px", borderTop: "1.5px solid #e8d5b5", display: "flex", gap: 10, flexShrink: 0, background: "#fff" }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "13px", borderRadius: 13, background: "#f5f5f4", border: "1.5px solid #e7e5e4", color: "#78716c", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleCheckout} disabled={processing}
            style={{ flex: 2, padding: "13px", borderRadius: 13, background: processing ? "#e8c4a0" : "linear-gradient(135deg,#2c1810 0%,#4a2518 100%)", border: "none", color: "#fff", fontWeight: 800, fontSize: 14, cursor: processing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity 0.15s", opacity: processing ? 0.7 : 1 }}>
            <CreditCard size={16}/>
            {processing ? "Processing…" : `Checkout  ${cs}${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
