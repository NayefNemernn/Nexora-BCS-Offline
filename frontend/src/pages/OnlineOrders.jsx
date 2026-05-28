import { useEffect, useState, useRef } from "react";
import { getOrders, acceptOrder, rejectOrder, cancelOrder } from "../api/orders.api";
import { connectSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  ShoppingBag, CheckCircle2, XCircle, Clock, Truck,
  Package, RefreshCw, Phone, MapPin, MessageSquare,
  Search, X, Tag, Star, Calendar, ChevronRight,
} from "lucide-react";

const STATUS_CONFIG = {
  pending:          { label: "Pending",          bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", dot: "bg-yellow-400", border: "border-yellow-200 dark:border-yellow-500/30" },
  accepted:         { label: "Accepted",          bg: "bg-blue-100 dark:bg-blue-900/30",   text: "text-blue-700 dark:text-blue-400",   dot: "bg-blue-500",   border: "border-blue-200 dark:border-blue-500/30"   },
  rejected:         { label: "Rejected",          bg: "bg-red-100 dark:bg-red-900/30",     text: "text-red-700 dark:text-red-400",     dot: "bg-red-400",    border: "border-red-200 dark:border-red-500/30"     },
  out_for_delivery: { label: "Out for Delivery",  bg: "bg-orange-100 dark:bg-orange-900/30",text: "text-orange-700 dark:text-orange-400",dot: "bg-orange-400",border: "border-orange-200 dark:border-orange-500/30"},
  pending_payment:  { label: "Pending Payment",   bg: "bg-purple-100 dark:bg-purple-900/30",text: "text-purple-700 dark:text-purple-400",dot: "bg-purple-400",border: "border-purple-200 dark:border-purple-500/30"},
  completed:        { label: "Completed",          bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", dot: "bg-green-500",  border: "border-green-200 dark:border-green-500/30"  },
  cancelled:        { label: "Cancelled",          bg: "bg-gray-100 dark:bg-gray-800",      text: "text-gray-500 dark:text-gray-400",   dot: "bg-gray-400",   border: "border-gray-200 dark:border-gray-600"       },
};

const FILTERS = ["all", "pending", "accepted", "out_for_delivery", "completed", "rejected"];

const pushBtn = "transition-[transform,box-shadow] duration-75 select-none active:translate-y-[4px] active:shadow-none";

function timeSince(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function OnlineOrders() {
  const { user, store: ctxStore } = useAuth();
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("all");
  const [selected,    setSelected]    = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectText,  setRejectText]  = useState("");
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelText,  setCancelText]  = useState("");
  const [processing,  setProcessing]  = useState(false);
  const [newCount,    setNewCount]    = useState(0);
  const [search,      setSearch]      = useState("");
  const audioRef = useRef(null);

  const storeId = ctxStore?._id || user?.storeId;

  const load = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? { status: filter } : {};
      const { orders: data } = await getOrders(params);
      setOrders(data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    if (!storeId) return;
    const s = connectSocket(storeId, "admin");
    const onNew = (order) => {
      setNewCount(n => n + 1);
      setOrders(prev => [order, ...prev]);
      toast.success(`🛒 New order: ${order.orderNumber} — $${order.total.toFixed(2)}`, { duration: 5000 });
      try { audioRef.current?.play(); } catch {}
    };
    const onStatusChange = ({ orderId, status }) =>
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o));

    s.on("new_order",            onNew);
    s.on("order_status_changed", onStatusChange);
    return () => { s.off("new_order", onNew); s.off("order_status_changed", onStatusChange); };
  }, [storeId]);

  const handleAccept = async (orderId) => {
    setProcessing(true);
    try {
      await acceptOrder(orderId);
      toast.success("Order accepted — sent to cashier");
      setSelected(s => s?._id === orderId ? { ...s, status: "accepted" } : s);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to accept");
    } finally { setProcessing(false); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setProcessing(true);
    try {
      await rejectOrder(rejectModal, rejectText);
      toast.success("Order rejected");
      setRejectModal(null); setRejectText(""); setSelected(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject");
    } finally { setProcessing(false); }
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    setProcessing(true);
    try {
      await cancelOrder(cancelModal, cancelText);
      toast.success("Order cancelled");
      setCancelModal(null); setCancelText(""); setSelected(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel");
    } finally { setProcessing(false); }
  };

  const filtered = orders
    .filter(o => filter === "all" || o.status === filter)
    .filter(o => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customer?.name?.toLowerCase().includes(q) ||
        o.customer?.phone?.includes(q)
      );
    });

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0b0b0b] overflow-hidden">
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* ── Top bar ── */}
      <div className="shrink-0 px-4 py-3 bg-white dark:bg-[#111] border-b border-gray-100 dark:border-white/5 flex items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShoppingBag size={20} className="text-blue-600 shrink-0" />
          <h1 className="font-bold text-lg dark:text-white truncate">Online Orders</h1>
          {newCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 animate-pulse shrink-0">
              {newCount} new
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search order, customer, phone…"
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-white/10
              bg-gray-50 dark:bg-[#1a1a1a] text-sm dark:text-white placeholder-gray-400
              focus:outline-none focus:border-blue-400 dark:focus:border-blue-500/60 transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="hidden lg:flex items-center gap-2 overflow-x-auto">
          {FILTERS.map(f => {
            const cfg = STATUS_CONFIG[f];
            const active = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold
                  ${pushBtn}
                  ${active
                    ? "bg-blue-600 text-white shadow-[0_4px_0_0_#1d4ed8]"
                    : "bg-white dark:bg-[#1c1c1c] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 shadow-[0_4px_0_0_rgba(0,0,0,0.08)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.35)] hover:bg-gray-50 dark:hover:bg-[#252525]"
                  }`}>
                {f === "all" ? "All" : cfg?.label || f}
              </button>
            );
          })}
        </div>

        <button onClick={() => { load(); setNewCount(0); }}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
            bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/10
            text-gray-700 dark:text-gray-200
            shadow-[0_4px_0_0_rgba(0,0,0,0.08)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.35)]
            ${pushBtn}`}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Mobile filter pills */}
      <div className="lg:hidden shrink-0 flex gap-2 overflow-x-auto px-4 py-2 bg-white dark:bg-[#111] border-b border-gray-100 dark:border-white/5">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold ${pushBtn}
              ${filter === f
                ? "bg-blue-600 text-white shadow-[0_3px_0_0_#1d4ed8]"
                : "bg-gray-100 dark:bg-[#1c1c1c] text-gray-600 dark:text-gray-300 shadow-[0_3px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_3px_0_0_rgba(0,0,0,0.35)]"
              }`}>
            {f === "all" ? "All" : STATUS_CONFIG[f]?.label || f}
          </button>
        ))}
      </div>

      {/* ── Master / Detail ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Order list ── */}
        <div className={`flex flex-col overflow-hidden border-r border-gray-100 dark:border-white/5
          ${selected ? "hidden lg:flex lg:w-[420px] xl:w-[480px] shrink-0" : "flex-1"}`}>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 dark:bg-[#1a1a1a] rounded-2xl animate-pulse" />
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                <Package size={48} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">No orders found</p>
              </div>
            ) : filtered.map(order => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const isSelected = selected?._id === order._id;
              return (
                <button
                  key={order._id}
                  onClick={() => setSelected(isSelected ? null : order)}
                  className={`w-full text-left rounded-2xl border p-4
                    transition-[transform,box-shadow,border-color] duration-75 select-none
                    ${isSelected
                      ? "border-blue-400 dark:border-blue-500/60 bg-blue-50 dark:bg-blue-900/10 shadow-[0_4px_0_0_rgba(59,130,246,0.3)]"
                      : "border-gray-200 dark:border-white/5 bg-white dark:bg-[#141414] shadow-[0_4px_0_0_rgba(0,0,0,0.08)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] hover:border-gray-300 dark:hover:border-white/10"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1.5 w-3 h-3 rounded-full shrink-0 ${cfg.dot} ${order.status === "pending" ? "animate-pulse" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm dark:text-white">{order.orderNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                        {order.customer?.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {order.items?.length} item{order.items?.length !== 1 ? "s" : ""} · {timeSince(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-base dark:text-white">${order.total?.toFixed(2)}</p>
                      <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 ml-auto mt-1" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Detail panel ── */}
        {selected ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#111]">

            {/* Detail header */}
            <div className="shrink-0 px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center gap-3">
              <button
                onClick={() => setSelected(null)}
                className={`lg:hidden w-10 h-10 flex items-center justify-center rounded-xl
                  bg-gray-100 dark:bg-[#1c1c1c] text-gray-600 dark:text-gray-300
                  shadow-[0_4px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)]
                  ${pushBtn}`}>
                ←
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-lg dark:text-white">{selected.orderNumber}</h2>
                  {(() => {
                    const cfg = STATUS_CONFIG[selected.status] || STATUS_CONFIG.pending;
                    return (
                      <span className={`text-sm px-3 py-1 rounded-full border font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-sm text-gray-400 mt-0.5">{timeSince(selected.createdAt)}</p>
              </div>
            </div>

            {/* Detail body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Customer info */}
              <div className="rounded-2xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/5 p-4 space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customer</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                      {selected.customer?.name?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold dark:text-white">{selected.customer?.name}</p>
                    {selected.customer?.phone && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone size={12} /> {selected.customer.phone}
                      </p>
                    )}
                  </div>
                </div>
                {selected.customer?.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin size={14} className="mt-0.5 shrink-0" />
                    <span>{selected.customer.address}</span>
                  </div>
                )}
                {selected.customer?.notes && (
                  <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <MessageSquare size={14} className="mt-0.5 shrink-0" />
                    <span>{selected.customer.notes}</span>
                  </div>
                )}
              </div>

              {/* Scheduled */}
              {selected.scheduledFor && (
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                  <Calendar size={15} className="shrink-0" />
                  <span>Scheduled: {new Date(selected.scheduledFor).toLocaleString()}</span>
                </div>
              )}

              {/* Items */}
              <div className="rounded-2xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/5 overflow-hidden">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">Items</p>
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {selected.items?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="font-medium text-sm dark:text-white">{item.name}</p>
                        <p className="text-xs text-gray-400">× {item.quantity}</p>
                      </div>
                      <span className="font-bold text-sm dark:text-white">${item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 pt-2 pb-4 space-y-1.5 border-t border-gray-100 dark:border-white/5">
                  {selected.deliveryFee > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Delivery fee</span>
                      <span>${selected.deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  {selected.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                      <span className="flex items-center gap-1"><Tag size={12} />
                        {selected.promoCode?.code ? `Promo (${selected.promoCode.code})` : "Discount"}
                      </span>
                      <span>−${selected.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {selected.tipAmount > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Tip</span>
                      <span>+${selected.tipAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base dark:text-white pt-1 border-t border-gray-100 dark:border-white/5">
                    <span>Total</span>
                    <span>${selected.total?.toFixed(2)}</span>
                  </div>
                  {selected.pointsEarned > 0 && (
                    <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                      <Star size={11} /> Customer earned {selected.pointsEarned} pts
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection / cancellation reason */}
              {(selected.status === "rejected" || selected.status === "cancelled") && selected.rejectionReason && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                  <XCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{selected.rejectionReason}</span>
                </div>
              )}
            </div>

            {/* ── Action buttons ── */}
            <div className="shrink-0 p-4 border-t border-gray-100 dark:border-white/5 space-y-3 bg-white dark:bg-[#111]">
              {selected.status === "pending" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAccept(selected._id)}
                    disabled={processing}
                    className={`flex-1 py-4 rounded-2xl font-bold text-base text-white
                      bg-gradient-to-r from-green-600 to-emerald-500
                      shadow-[0_6px_0_0_#15803d]
                      ${pushBtn}
                      disabled:opacity-50 disabled:shadow-none disabled:translate-y-0
                      flex items-center justify-center gap-2`}>
                    <CheckCircle2 size={18} /> Accept Order
                  </button>
                  <button
                    onClick={() => setRejectModal(selected._id)}
                    disabled={processing}
                    className={`flex-1 py-4 rounded-2xl font-bold text-base text-white
                      bg-red-500
                      shadow-[0_6px_0_0_#b91c1c]
                      ${pushBtn}
                      disabled:opacity-50 disabled:shadow-none disabled:translate-y-0
                      flex items-center justify-center gap-2`}>
                    <XCircle size={18} /> Reject
                  </button>
                </div>
              )}
              {!["completed", "cancelled", "rejected"].includes(selected.status) && (
                <button
                  onClick={() => setCancelModal(selected._id)}
                  disabled={processing}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm
                    border-2 border-red-300 dark:border-red-500/40 text-red-500 dark:text-red-400
                    shadow-[0_4px_0_0_rgba(239,68,68,0.2)] dark:shadow-[0_4px_0_0_rgba(239,68,68,0.15)]
                    ${pushBtn}
                    disabled:opacity-50 disabled:shadow-none disabled:translate-y-0
                    flex items-center justify-center gap-2`}>
                  <XCircle size={16} /> Cancel Order
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center text-gray-300 dark:text-gray-700 flex-col gap-3">
            <Package size={56} className="opacity-30" />
            <p className="text-sm font-medium">Select an order to view details</p>
          </div>
        )}
      </div>

      {/* ── Cancel modal ── */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-bold text-lg dark:text-white mb-4">Cancel Order</h2>
            <textarea
              value={cancelText} onChange={e => setCancelText(e.target.value)}
              placeholder="Reason for cancellation (optional)…"
              className="w-full border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm resize-none
                bg-gray-50 dark:bg-[#111] dark:text-white placeholder-gray-400
                focus:outline-none focus:border-red-400 transition"
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setCancelModal(null); setCancelText(""); }}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm
                  bg-gray-100 dark:bg-[#252525] text-gray-700 dark:text-gray-200
                  shadow-[0_4px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)]
                  ${pushBtn}`}>
                Back
              </button>
              <button onClick={handleCancel} disabled={processing}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm text-white
                  bg-red-500 shadow-[0_4px_0_0_#b91c1c]
                  ${pushBtn} disabled:opacity-60 disabled:shadow-none disabled:translate-y-0`}>
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-bold text-lg dark:text-white mb-4">Reject Order</h2>
            <textarea
              value={rejectText} onChange={e => setRejectText(e.target.value)}
              placeholder="Reason for rejection (optional)…"
              className="w-full border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm resize-none
                bg-gray-50 dark:bg-[#111] dark:text-white placeholder-gray-400
                focus:outline-none focus:border-red-400 transition"
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setRejectModal(null); setRejectText(""); }}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm
                  bg-gray-100 dark:bg-[#252525] text-gray-700 dark:text-gray-200
                  shadow-[0_4px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)]
                  ${pushBtn}`}>
                Cancel
              </button>
              <button onClick={handleReject} disabled={processing}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm text-white
                  bg-red-500 shadow-[0_4px_0_0_#b91c1c]
                  ${pushBtn} disabled:opacity-60 disabled:shadow-none disabled:translate-y-0`}>
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
