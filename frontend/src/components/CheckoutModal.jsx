import { isOnline } from "../lib/connectivity";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { createSale } from "../api/sale.api";
import { createHoldSale } from "../api/holdSale.api";
import { getCustomers, createCustomer } from "../api/customer.api";
import { useTranslation } from "../hooks/useTranslation";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";
import VoiceButton from "./common/VoiceButton";
import useOfflineSales from "../hooks/useOfflineSales";
import toast from "react-hot-toast";
import { openCashDrawer } from "../lib/cashDrawer";
import QRCode from "qrcode";
import {
  X, Banknote, CreditCard, Clock, User, Phone,
  Printer, CheckCircle2, ShoppingBag, ArrowLeftRight,
  Tag, Users, Plus, Scissors, ChevronDown, ChevronUp,
  Truck, MapPin,
} from "lucide-react";

/* ── thermal receipt printer ─────────────────────────────── */
async function printReceipt(sale, { toLBP, formatLBP, formatUSD, exchangeRate, change, storeName, taxRate, taxNumber, storeUrl, deliveryPhone }) {
  const win = window.open("", "_blank", "width=360,height=700");
  if (!win) { window.print(); return; }

  let qrDataUrl = null;
  if (storeUrl) {
    try { qrDataUrl = await QRCode.toDataURL(storeUrl, { width: 128, margin: 1, color: { dark: "#000000", light: "#ffffff" } }); }
    catch { /* skip QR if generation fails */ }
  }

  const itemRows = sale.items.map(i => `
    <tr>
      <td>${i.name}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:right">$${(i.price * i.quantity).toFixed(2)}</td>
    </tr>
    <tr class="sub-row">
      <td colspan="3">$${i.price.toFixed(2)} each &nbsp;·&nbsp; ${parseInt(toLBP(i.price)).toLocaleString()} ل.ل</td>
    </tr>
  `).join("");

  const now = new Date();

  /* build payment label for split */
  let methodLabel = "";
  if (sale.paymentMethod === "split" && sale.splitPayments?.length) {
    methodLabel = sale.splitPayments.map(p =>
      `${p.method === "cash" ? "Cash" : p.method === "card" ? "Card" : "Pay Later"}: $${p.amount.toFixed(2)}`
    ).join(" + ");
  } else {
    methodLabel = { cash: "Cash", card: "Card", paylater: "Pay Later" }[sale.paymentMethod] || sale.paymentMethod;
  }

  const discountRow = sale.discountAmount > 0 ? `
    <tr class="disc-row">
      <td>Discount</td><td></td>
      <td style="text-align:right">−$${sale.discountAmount.toFixed(2)}</td>
    </tr>` : "";

  const subtotalBeforeVat = sale.subtotal ?? sale.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const vatAmt = sale.taxAmount ?? 0;
  const vatRow = (taxRate > 0 && vatAmt > 0) ? `
    <tr class="vat-row">
      <td>Subtotal</td><td></td>
      <td style="text-align:right">$${(+subtotalBeforeVat).toFixed(2)}</td>
    </tr>
    <tr class="vat-row">
      <td>VAT (${taxRate}%)</td><td></td>
      <td style="text-align:right">$${vatAmt.toFixed(2)}</td>
    </tr>` : "";

  const changeRow = change > 0 ? `
    <tr class="change-row">
      <td>Change</td><td></td>
      <td style="text-align:right">$${change.toFixed(2)}</td>
    </tr>
    <tr class="sub-row"><td colspan="3">${parseInt(toLBP(change)).toLocaleString()} ل.ل</td></tr>` : "";

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Receipt</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:14px;font-weight:700;color:#000;width:80mm;padding:6mm 3mm}
  .store{text-align:center;margin-bottom:8px}
  .store h1{font-size:22px;font-weight:900;letter-spacing:3px}
  .store p{font-size:11px;font-weight:700;color:#333;margin-top:3px}
  hr{border:none;border-top:2px solid #000;margin:8px 0}
  hr.thin{border-top:1px dashed #555;margin:6px 0}
  table{width:100%;border-collapse:collapse}
  thead th{font-size:11px;text-transform:uppercase;color:#000;padding-bottom:6px;font-weight:900;border-bottom:1px solid #000}
  thead th:nth-child(2){text-align:center}
  thead th:last-child{text-align:right}
  td{padding:4px 0;vertical-align:top;font-weight:700}
  .item-name{font-size:13px;font-weight:900}
  .sub-row td{font-size:11px;color:#444;font-weight:700;padding-bottom:5px}
  .disc-row td{color:#7c2d12;font-size:13px;font-weight:900;padding-top:3px}
  .vat-row td{font-size:12px;font-weight:700;color:#555;padding-top:2px}
  .total-row td{font-weight:900;font-size:17px;padding-top:8px;border-top:2px solid #000}
  .lbp-row td{font-size:11px;font-weight:700;color:#7c2d12;padding-bottom:6px}
  .change-row td{color:#14532d;font-weight:900;font-size:14px;padding-top:4px}
  .method{margin-top:8px;font-size:12px;font-weight:700}
  .badge{background:#000;color:#fff;border-radius:4px;padding:3px 8px;font-weight:900;font-size:11px;letter-spacing:1px}
  .footer{text-align:center;font-size:12px;font-weight:900;color:#000;margin-top:10px;letter-spacing:1px}
  .id{text-align:center;font-size:10px;font-weight:700;color:#555;margin-top:4px}
  .qr-section{text-align:center;margin-top:10px;padding-top:8px;border-top:1px dashed #555}
  .qr-section img{width:110px;height:110px;margin:4px auto;display:block}
  .qr-label{font-size:11px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:#000}
  .qr-url{font-size:10px;color:#333;font-weight:700;word-break:break-all;margin-top:2px}
  .del-phone{font-size:12px;font-weight:900;color:#000;margin-top:5px}
  @media print{@page{size:80mm auto;margin:0}body{padding:4mm 2mm}}
</style></head><body>
  <div class="store">
    <h1>${storeName.toUpperCase()}</h1>
    <p>${now.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})} &nbsp;·&nbsp; ${now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</p>
    ${taxNumber ? `<p style="font-size:11px">VAT No: ${taxNumber}</p>` : ""}
    ${sale.customerName ? `<p>Customer: ${sale.customerName}</p>` : ""}
  </div>
  <hr/>
  <table>
    <thead><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Price</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <hr/>
  <table><tbody>
    ${discountRow}
    ${vatRow}
    <tr class="total-row"><td>TOTAL</td><td></td><td style="text-align:right">$${sale.total.toFixed(2)}</td></tr>
    <tr class="lbp-row"><td colspan="3">${parseInt(toLBP(sale.total)).toLocaleString()} ل.ل &nbsp;·&nbsp; @ ${parseInt(exchangeRate).toLocaleString()} ل.ل/$1</td></tr>
    ${changeRow}
    <tr><td colspan="3" class="method">Payment: <span class="badge">${methodLabel}</span></td></tr>
  </tbody></table>
  <hr/>
  <p class="footer">★ Thank you for your business! ★</p>
  ${sale._id && !sale._id.toString().startsWith("offline") ? `<p class="id">#${sale._id}</p>` : ""}
  ${(qrDataUrl || deliveryPhone) ? `
  <div class="qr-section">
    ${qrDataUrl ? `
      <p class="qr-label">🛒 Order Online</p>
      <img src="${qrDataUrl}" alt="Online Store QR"/>
      <p class="qr-url">${storeUrl}</p>
    ` : ""}
    ${deliveryPhone ? `<p class="del-phone">📞 Delivery: ${deliveryPhone}</p>` : ""}
  </div>` : ""}
  <script>window.onload=()=>{window.print();window.close();}<\/script>
</body></html>`;

  win.document.write(html);
  win.document.close();
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function CheckoutModal({ cart, total, close, clearCart, deliveryOrder = null, onDeliveryCheckoutDone }) {
  const { t }           = useTranslation();
  const { saveOffline } = useOfflineSales();
  const { toLBP, toLBPNice, formatLBP, formatUSD, exchangeRate } = useCurrency();
  const { storeName, taxRate, store }   = useAuth();
  const STORE_FRONTEND_URL = import.meta.env.VITE_STORE_URL || "http://localhost:5174";
  const storeUrl      = store?.slug ? `${STORE_FRONTEND_URL}/store/${store.slug}` : null;
  const deliveryPhone = store?.deliveryPhone || null;

  // Delivery mode: pre-fill
  const isDelivery = !!deliveryOrder;

  /* ── payment method ── */
  const [method, setMethod]               = useState(isDelivery ? "cash_on_delivery" : "cash");   // cash | card | paylater | split | bank_transfer | cash_on_delivery
  const [amountCurrency, setAmountCurrency] = useState("usd");

  /* ── cash amount & change ── */
  const [cashAmount, setCashAmount]       = useState("");
  const [change, setChange]               = useState(0);
  const [shortfall, setShortfall]         = useState(0);
  const amountRef                         = useRef(null);

  /* ── split payment ── */
  const [splitCash, setSplitCash]         = useState("");
  const [splitPayLater, setSplitPayLater] = useState("");

  /* ── discount ── */
  const [showDiscount, setShowDiscount]   = useState(false);
  const [discountType, setDiscountType]   = useState("fixed");  // fixed | percent
  const [discountValue, setDiscountValue] = useState("");

  /* ── customer ── */
  const [showCustomer, setShowCustomer]   = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers]         = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showSuggestions, setShowSuggestions]   = useState(false);
  const [newPhone, setNewPhone]           = useState("");

  /* ── ui state ── */
  const [receipt, setReceipt]             = useState(null);
  const [loading, setLoading]             = useState(false);

  /* ── computed discount ── */
  const discountAmount = (() => {
    const v = parseFloat(discountValue) || 0;
    if (discountType === "percent") return +Math.min((v / 100) * total, total).toFixed(2);
    return +Math.min(v, total).toFixed(2);
  })();

  /* ── VAT calculation (only on non-exempt items) ── */
  const vatableSubtotal = cart.reduce((sum, i) => i.vatExempt ? sum : sum + i.price * i.quantity, 0);
  const vatAmount = taxRate > 0 ? +(vatableSubtotal * (taxRate / 100)).toFixed(2) : 0;

  const finalTotal = +(total + vatAmount - discountAmount).toFixed(2);

  /* ── change calc ── */
  useEffect(() => {
    if (method !== "cash") { setChange(0); setShortfall(0); return; }
    const received = parseFloat(cashAmount) || 0;
    const receivedUSD = amountCurrency === "lbp" ? (received * 1000) / exchangeRate : received;
    const diff = receivedUSD - finalTotal;
    setChange(Math.max(diff, 0));
    setShortfall(received > 0 ? Math.max(-diff, 0) : 0);
  }, [cashAmount, finalTotal, amountCurrency, exchangeRate, method]);

  /* ── auto-fill split paylater when cash entered ── */
  useEffect(() => {
    if (method !== "split") return;
    const cash = parseFloat(splitCash) || 0;
    const remaining = +(Math.max(finalTotal - cash, 0)).toFixed(2);
    setSplitPayLater(remaining > 0 ? remaining.toString() : "");
  }, [splitCash, finalTotal, method]);

  /* ── load customers ── */
  useEffect(() => {
    if (!showCustomer) return;
    getCustomers().then(setCustomers).catch(() => {});
  }, [showCustomer]);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );

  /* focus cash input */
  useEffect(() => {
    if (method === "cash") setTimeout(() => amountRef.current?.focus(), 80);
  }, [method]);

  /* ── complete sale ── */
  const completeSale = async () => {
    if (cart.length === 0) { toast.error(t.cartEmpty); return; }

    /* validations */
    if (method === "split") {
      const cash      = parseFloat(splitCash) || 0;
      const payLater  = parseFloat(splitPayLater) || 0;
      if (cash <= 0) { toast.error(t.splitEnterCash); return; }
      const splitTotal = +(cash + payLater).toFixed(2);
      if (Math.abs(splitTotal - finalTotal) > 0.01) {
        toast.error(`${t.splitMismatch} ($${splitTotal.toFixed(2)} ≠ $${finalTotal.toFixed(2)})`);
        return;
      }
      if (payLater > 0 && !selectedCustomer && !customerSearch.trim()) {
        toast.error(t.splitCustomerRequired);
        return;
      }
    }

    if (method === "paylater" && !selectedCustomer && !customerSearch.trim()) {
      toast.error(t.enterCustomerName); return;
    }

    /* if paylater only — use holdSale flow (online) or mutation queue (offline) */
    if (method === "paylater") {
      if (!isOnline()) {
        /* queue to /api/hold-sales so it syncs to the correct endpoint */
        const offlinePayload = {
          customerName: selectedCustomer?.name || customerSearch.trim() || "",
          phone:        selectedCustomer?.phone || newPhone || "",
          items: cart.map(i => ({ productId: i.productId, name: i.name, price: i.price, quantity: i.quantity })),
          total: finalTotal,
        };
        const { queueMutation } = await import("../lib/offlineDB");
        await queueMutation("create_hold_sale", "/api/hold-sales", "POST", offlinePayload);
        toast.success("📴 Pay Later saved — will sync when connected");
        setReceipt({
          _id: "offline-" + Date.now(),
          items: cart.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })),
          subtotal: total, taxAmount: vatAmount,
          total: finalTotal, discountAmount, paymentMethod: "paylater",
          customerName: offlinePayload.customerName,
          createdAt: new Date().toISOString(), offline: true,
        });
        clearCart();
        return;
      }
      setLoading(true);
      try {
        await createHoldSale({
          customerName: selectedCustomer?.name || customerSearch.trim(),
          phone: selectedCustomer?.phone || newPhone,
          items: cart.map(i => ({ productId: i.productId, name: i.name, price: i.price, quantity: i.quantity })),
          total: finalTotal,
        });
        toast.success(t.payLaterSaved);
        clearCart(); close();
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed");
      } finally { setLoading(false); }
      return;
    }

    setLoading(true);
    try {
      /* build payload */
      const payload = {
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
        paymentMethod: method,
        discountAmount,
        customerName:  isDelivery ? (deliveryOrder.customer?.name || "") : (selectedCustomer?.name || customerSearch.trim() || ""),
        customerId:    selectedCustomer?._id  || null,
        phone:         isDelivery ? (deliveryOrder.customer?.phone || "") : (selectedCustomer?.phone || newPhone || ""),
        notes:         isDelivery ? (deliveryOrder.customer?.notes || "") : "",
        // Delivery fields
        saleType:        isDelivery ? "delivery"              : "in_store",
        orderId:         isDelivery ? deliveryOrder._id       : null,
        deliveryAddress: isDelivery ? (deliveryOrder.customer?.address || "") : "",
      };

      if (method === "split") {
        const cash     = parseFloat(splitCash) || 0;
        const payLater = parseFloat(splitPayLater) || 0;
        payload.splitPayments = [
          { method: "cash",     amount: +cash.toFixed(2) },
          ...(payLater > 0 ? [{ method: "paylater", amount: +payLater.toFixed(2) }] : []),
        ];
      }

      let saleResult;
      if (isOnline()) {
        const res = await createSale(payload);
        saleResult = res.sale;
        clearCart();
        if (isDelivery && onDeliveryCheckoutDone) onDeliveryCheckoutDone();
      } else {
        await saveOffline(payload);
        toast.success("📴 Sale saved — will sync when connected");
        saleResult = {
          _id: "offline-" + Date.now(),
          items: cart.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })),
          subtotal: total, taxAmount: vatAmount,
          total: finalTotal, discountAmount, paymentMethod: method,
          splitPayments: payload.splitPayments || [],
          customerName: payload.customerName,
          createdAt: new Date().toISOString(), offline: true,
        };
        clearCart();
      }
      // Auto-open cash drawer for cash payments
      if (method === "cash" || method === "split") {
        openCashDrawer();
      }
      setReceipt(saleResult);
    } catch (err) {
      toast.error(err.response?.data?.message || t.checkoutFailed);
    } finally {
      setLoading(false);
    }
  };

  /* ════════════ RECEIPT SUCCESS SCREEN ════════════ */
  if (receipt) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-[#141414] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
          <div className="bg-green-600 px-6 py-8 text-center">
            <CheckCircle2 size={48} className="text-white mx-auto mb-3" strokeWidth={1.5}/>
            <h2 className="text-white text-xl font-bold">Sale Complete!</h2>
            <p className="text-green-200 text-sm mt-1">{new Date().toLocaleString()}</p>
            {receipt.customerName && <p className="text-green-200 text-sm mt-1">{receipt.customerName}</p>}
          </div>

          {receipt.offline && (
            <div className="bg-yellow-500 text-black text-xs text-center font-semibold px-3 py-2">
              ⚠️ Offline — will sync automatically when connected
            </div>
          )}

          <div className="px-6 py-4 space-y-2 max-h-64 overflow-y-auto">
            {receipt.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{item.name} <span className="text-gray-400">× {item.quantity}</span></span>
                <span className="font-medium">{formatUSD(item.price * item.quantity)}</span>
              </div>
            ))}

            <div className="border-t border-dashed border-gray-200 dark:border-white/10 pt-2 space-y-1">
              {receipt.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                  <span>Discount</span>
                  <span>−{formatUSD(receipt.discountAmount)}</span>
                </div>
              )}
              {taxRate > 0 && (receipt.taxAmount ?? 0) > 0 && (
                <>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Subtotal (excl. VAT)</span>
                    <span>{formatUSD(receipt.subtotal ?? receipt.total - (receipt.taxAmount ?? 0))}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>VAT ({taxRate}%)</span>
                    <span>+{formatUSD(receipt.taxAmount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <div className="text-right">
                  <div>{formatUSD(receipt.total)}</div>
                  <div className="text-amber-500">{formatLBP(toLBPNice(receipt.total))}</div>
                </div>
              </div>
              {change > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-semibold">
                  <span>Change</span>
                  <div className="text-right">
                    <div>{formatUSD(change)}</div>
                    <div>{formatLBP(toLBPNice(change))}</div>
                  </div>
                </div>
              )}
              {/* split breakdown */}
              {receipt.paymentMethod === "split" && receipt.splitPayments?.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 pt-1">
                  {receipt.splitPayments.map((p, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="capitalize">{p.method === "paylater" ? "Pay Later" : p.method}</span>
                      <span>{formatUSD(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => printReceipt(receipt, { toLBP, formatLBP, formatUSD, exchangeRate, change, storeName, taxRate, taxNumber: store?.taxNumber || "", storeUrl, deliveryPhone })}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition"
            >
              <Printer size={16}/> Print
            </button>
            <button
              onClick={() => { setReceipt(null); close(); }}
              className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════ CHECKOUT FORM ════════════ */
  const ALL_METHODS = [
    { id: "cash",             label: "Cash",         Icon: Banknote,   color: "green",  deliveryOnly: false },
    { id: "card",             label: "Card",         Icon: CreditCard, color: "blue",   deliveryOnly: false },
    { id: "bank_transfer",    label: "Bank",         Icon: ArrowLeftRight, color: "teal", deliveryOnly: false },
    { id: "split",            label: "Split",        Icon: Scissors,   color: "amber",  deliveryOnly: false },
    { id: "paylater",         label: "Pay Later",    Icon: Clock,      color: "purple", deliveryOnly: false },
    { id: "cash_on_delivery", label: "COD",          Icon: Truck,      color: "orange", deliveryOnly: true  },
  ];
  const METHODS = isDelivery
    ? ALL_METHODS.filter(m => m.id === "cash_on_delivery")
    : ALL_METHODS.filter(m => !m.deliveryOnly);

  const activeStyle = {
    green:  "bg-green-600  text-white border-green-600",
    blue:   "bg-blue-600   text-white border-blue-600",
    teal:   "bg-teal-600   text-white border-teal-600",
    amber:  "bg-amber-500  text-white border-amber-500",
    purple: "bg-purple-600 text-white border-purple-600",
    orange: "bg-orange-500 text-white border-orange-500",
  };

  const isPayLaterNeeded = method === "paylater" ||
    (method === "split" && (parseFloat(splitPayLater) || 0) > 0);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#141414] rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5">
          <div>
            <h2 className="font-bold text-lg">Complete Payment</h2>
            <p className="text-xs text-gray-400">{cart.length} item{cart.length !== 1 ? "s" : ""} · {formatUSD(total)}</p>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#1c1c1c] flex items-center justify-center hover:bg-gray-200 transition">
            <X size={16}/>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

          {/* ── Total card ── */}
          <div className="bg-blue-600 text-white rounded-2xl p-4">
            <p className="text-blue-200 text-xs mb-2">Total Amount</p>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black">{formatUSD(finalTotal)}</p>
                {(discountAmount > 0 || vatAmount > 0) && (
                  <p className="text-blue-300 text-sm line-through mb-1">{formatUSD(total)}</p>
                )}
              </div>
              <p className="text-3xl font-black tabular-nums">{formatLBP(toLBPNice(finalTotal))}</p>
            </div>
            {(discountAmount > 0 || vatAmount > 0) && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {discountAmount > 0 && (
                  <span className="bg-amber-400/30 text-amber-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    −{formatUSD(discountAmount)} off
                  </span>
                )}
                {vatAmount > 0 && (
                  <span className="bg-white/20 text-blue-100 rounded-full px-2.5 py-0.5 text-xs">
                    VAT {taxRate}%: +{formatUSD(vatAmount)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Discount toggle ── */}
          <div>
            <button
              onClick={() => setShowDiscount(v => !v)}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            >
              <Tag size={14}/>
              {showDiscount ? "Remove discount" : "Add discount"}
              {showDiscount ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>

            {showDiscount && (
              <div className="mt-2 flex gap-2 items-center">
                <div className="flex bg-gray-100 dark:bg-[#1c1c1c] rounded-xl p-1">
                  {[{id:"fixed",label:"$"},{id:"percent",label:"%"}].map(d => (
                    <button key={d.id} onClick={() => setDiscountType(d.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${discountType === d.id ? "bg-amber-500 text-white" : "text-gray-500"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                    {discountType === "fixed" ? "$" : "%"}
                  </span>
                  <input
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    type="number" min="0"
                    placeholder={discountType === "fixed" ? "0.00" : "0"}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] border-2 border-transparent focus:border-amber-400 outline-none text-sm font-bold transition"
                  />
                </div>
                {discountAmount > 0 && (
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                    −{formatUSD(discountAmount)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Delivery info banner */}
          {isDelivery && deliveryOrder && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/30 rounded-2xl p-3 space-y-1">
              <p className="text-xs font-semibold text-orange-600 flex items-center gap-1"><Truck size={13}/> Delivery Order — {deliveryOrder.orderNumber}</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white">{deliveryOrder.customer?.name}</p>
              {deliveryOrder.customer?.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={11}/> {deliveryOrder.customer.phone}</p>}
              {deliveryOrder.customer?.address && <p className="text-xs text-gray-500 flex items-start gap-1"><MapPin size={11} className="mt-0.5 flex-shrink-0"/>{deliveryOrder.customer.address}</p>}
            </div>
          )}

          {/* ── Payment method ── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Payment Method</p>
            <div className={`grid gap-2 ${METHODS.length <= 4 ? "grid-cols-4" : "grid-cols-3"}`}>
              {METHODS.map(({ id, label, Icon, color }) => {
                const isActive  = method === id;
                const disabled  = id === "paylater" && !isOnline();
                return (
                  <button key={id}
                    onClick={() => { if (disabled) { toast.error("Pay Later requires internet"); return; } setMethod(id); }}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 font-semibold text-xs transition
                      ${isActive ? activeStyle[color] : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300"}
                      ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <Icon size={18} strokeWidth={1.8}/>{label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── CASH fields ── */}
          {method === "cash" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Received in</span>
                <div className="flex bg-gray-100 dark:bg-[#1c1c1c] rounded-xl p-1 gap-1">
                  {[{id:"usd",label:"USD $",cls:"bg-green-600"},{id:"lbp",label:"LBP ل.ل",cls:"bg-amber-500"}].map(c => (
                    <button key={c.id} onClick={() => {
                      setAmountCurrency(c.id);
                      setCashAmount("");
                    }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${amountCurrency === c.id ? c.cls + " text-white" : "text-gray-500"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                    {amountCurrency === "usd" ? "$" : "ل.ل"}
                  </span>
                  <input ref={amountRef} value={cashAmount} onChange={e => setCashAmount(e.target.value)}
                    placeholder="Amount received" type="number"
                    className={`w-full pl-9 py-3 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] border-2 border-transparent focus:border-green-400 outline-none text-lg font-bold transition ${amountCurrency === "lbp" ? "pr-12" : "pr-3"}`}/>
                  {amountCurrency === "lbp" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-xs pointer-events-none select-none">
                      ,000
                    </span>
                  )}
                </div>
                <VoiceButton onResult={t => { const n = t.replace(/[^0-9.]/g,""); if(n) setCashAmount(n); }} color="green"/>
              </div>
              {/* Full LBP preview when using thousands shorthand */}
              {amountCurrency === "lbp" && parseFloat(cashAmount) > 0 && (
                <p className="text-xs text-amber-500 font-medium px-1 -mt-1">
                  {formatLBP(parseFloat(cashAmount) * 1000)}  ≈  {formatUSD((parseFloat(cashAmount) * 1000) / exchangeRate)}
                </p>
              )}
              {/* Change / Remaining display */}
              <div className={`flex justify-between items-center rounded-xl px-4 py-3 transition-all ${
                shortfall > 0
                  ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  : change > 0
                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                    : "bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/5"
              }`}>
                <div className="flex items-center gap-2">
                  <ArrowLeftRight size={14} className={shortfall > 0 ? "text-red-500" : change > 0 ? "text-green-500" : "text-gray-400"}/>
                  <span className="text-sm font-medium">{shortfall > 0 ? "Remaining" : "Change"}</span>
                </div>
                <div className="text-right">
                  {shortfall > 0 ? (
                    <>
                      <div className="font-bold text-base text-red-600 dark:text-red-400">{formatUSD(shortfall)}</div>
                      <div className="font-bold text-sm text-red-400">{formatLBP(toLBPNice(shortfall))}</div>
                    </>
                  ) : (
                    <>
                      <div className={`font-bold text-base ${change > 0 ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>{formatUSD(change)}</div>
                      {change > 0 && <div className="font-bold text-base text-amber-500">{formatLBP(toLBPNice(change))}</div>}
                    </>
                  )}
                </div>
              </div>
              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2">
                {[20,50,100].map(v => (
                  <button key={v} onClick={() => { setCashAmount(v); setAmountCurrency("usd"); }}
                    className="bg-gray-100 dark:bg-[#1c1c1c] hover:bg-gray-200 dark:hover:bg-[#252525] py-2.5 rounded-xl text-sm font-semibold transition">
                    ${v}
                  </button>
                ))}
                <button onClick={() => { setCashAmount(finalTotal); setAmountCurrency("usd"); }}
                  className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 py-2.5 rounded-xl text-xs font-semibold transition">
                  Exact
                </button>
              </div>
            </div>
          )}

          {/* ── SPLIT payment ── */}
          {method === "split" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Enter how much the customer pays in cash — the rest goes to Pay Later.</p>
              <div className="space-y-2">
                <div className="relative">
                  <Banknote size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500"/>
                  <span className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
                  <input value={splitCash} onChange={e => setSplitCash(e.target.value)}
                    type="number" min="0" max={finalTotal}
                    placeholder="Cash amount"
                    className="w-full pl-14 pr-3 py-3 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] border-2 border-transparent focus:border-green-400 outline-none text-base font-bold transition"/>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Cash</span>
                </div>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500"/>
                  <span className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
                  <input value={splitPayLater} readOnly
                    className="w-full pl-14 pr-3 py-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 outline-none text-base font-bold text-purple-700 dark:text-purple-300 cursor-default"/>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Pay Later</span>
                </div>
              </div>
              {/* validation feedback */}
              {splitCash && (
                <div className={`text-xs text-center py-2 rounded-lg font-semibold ${
                  Math.abs((parseFloat(splitCash)||0) + (parseFloat(splitPayLater)||0) - finalTotal) < 0.01
                    ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                    : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                }`}>
                  Total: {formatUSD((parseFloat(splitCash)||0) + (parseFloat(splitPayLater)||0))} / {formatUSD(finalTotal)}
                </div>
              )}
            </div>
          )}

          {/* ── Customer section (paylater or split with paylater portion) ── */}
          {isPayLaterNeeded && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Customer</p>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search or enter customer name"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] border-2 border-transparent focus:border-purple-400 outline-none text-sm transition"/>
                {showSuggestions && customerSearch && (
                  <div className="absolute top-full mt-1 bg-white dark:bg-[#1c1c1c] w-full rounded-xl shadow-xl border border-gray-100 dark:border-white/10 max-h-40 overflow-y-auto z-20">
                    {filteredCustomers.map(c => (
                      <button key={c._id}
                        onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); setShowSuggestions(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] text-sm">
                        <div className="font-medium">{c.name}</div>
                        {c.phone && <div className="text-xs text-gray-400">{c.phone}</div>}
                        {c.outstandingBalance > 0 && (
                          <div className="text-xs text-red-500">Balance: {formatUSD(c.outstandingBalance)}</div>
                        )}
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && customerSearch.length >= 2 && (
                      <button
                        onClick={() => { setShowSuggestions(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]">
                        <Plus size={14}/> Add "{customerSearch}" as new customer
                      </button>
                    )}
                  </div>
                )}
              </div>
              {/* Show outstanding balance warning */}
              {selectedCustomer?.outstandingBalance > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-xs text-red-600 dark:text-red-400">
                  ⚠️ Outstanding balance: {formatUSD(selectedCustomer.outstandingBalance)}
                </div>
              )}
              {!selectedCustomer && customerSearch.length >= 2 && (
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input value={newPhone} onChange={e => setNewPhone(e.target.value)}
                    placeholder="Phone number (optional)"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] border-2 border-transparent focus:border-purple-400 outline-none text-sm transition"/>
                </div>
              )}
            </div>
          )}

          {/* ── Optional customer for cash/card ── */}
          {(method === "cash" || method === "card") && (
            <div>
              <button
                onClick={() => setShowCustomer(v => !v)}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 transition"
              >
                <Users size={14}/>
                {showCustomer ? "Hide customer" : "Attach customer (optional)"}
                {showCustomer ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
              </button>
              {showCustomer && (
                <div className="mt-2 relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search customer"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] border-2 border-transparent focus:border-blue-400 outline-none text-sm transition"/>
                  {showSuggestions && customerSearch && (
                    <div className="absolute top-full mt-1 bg-white dark:bg-[#1c1c1c] w-full rounded-xl shadow-xl border border-gray-100 dark:border-white/10 max-h-40 overflow-y-auto z-20">
                      {filteredCustomers.map(c => (
                        <button key={c._id}
                          onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); setShowSuggestions(false); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] text-sm">
                          <div className="font-medium">{c.name}</div>
                          {c.phone && <div className="text-xs text-gray-400">{c.phone}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Complete Sale button ── */}
        <div className="px-6 pb-6 pt-3 border-t border-gray-100 dark:border-white/5">
          <button onClick={completeSale} disabled={loading || shortfall > 0}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(22,163,74,0.35)]">
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                  Processing...
                </span>
              : `Complete Sale · ${formatUSD(finalTotal)}`}
          </button>
        </div>

      </div>
    </div>
  );
}