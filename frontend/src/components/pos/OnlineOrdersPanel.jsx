import { useState, useEffect, useCallback } from "react";
import { Truck, X, ChevronRight, Package, Clock, CheckCircle2, XCircle, RefreshCw, BadgeCheck } from "lucide-react";
import { getOrders, acceptOrder, rejectOrder, markOutForDelivery, confirmPayment } from "../../api/orders.api";
import { connectSocket } from "../../lib/socket";
import toast from "react-hot-toast";

const STATUS_LABEL = {
  pending:          { label: "Pending",         color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  accepted:         { label: "Accepted",        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  out_for_delivery: { label: "Out for Delivery",color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  pending_payment:  { label: "Pending Payment", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  completed:        { label: "Completed",       color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  rejected:         { label: "Rejected",        color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

/* dot color + whether to pulse per status */
const STATUS_DOT = {
  pending:          { dot: "#facc15", pulse: true  },
  accepted:         { dot: "#60a5fa", pulse: false },
  out_for_delivery: { dot: "#a78bfa", pulse: false },
  pending_payment:  { dot: "#fb923c", pulse: false },
};

export default function OnlineOrdersPanel({ storeId, userRole, onLoadToCart }) {
  const [open,     setOpen]    = useState(false);
  const [orders,   setOrders]  = useState([]);
  const [loading,  setLoading] = useState(false);
  const [badge,    setBadge]   = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [actioned, setActioned] = useState({});

  const activeStatuses = ["pending", "accepted", "out_for_delivery", "pending_payment"];

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrders({ limit: 30 });
      const list = (data.orders || []).filter(o => activeStatuses.includes(o.status));
      setOrders(list);
      const unread = list.filter(o => o.status === "pending").length;
      setBadge(unread);
    } catch {
      // silently ignore if backend offline
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when panel opens
  useEffect(() => {
    if (storeId) fetchOrders();
  }, [storeId, fetchOrders]);

  useEffect(() => {
    if (open) fetchOrders();
  }, [open]);

  // Socket listeners
  useEffect(() => {
    if (!storeId) return;
    const role = userRole === "admin" ? "admin" : "cashier";
    const s = connectSocket(storeId, role);

    const onNewOrder = (order) => {
      setBadge(b => b + 1);
      toast("🛵 New online order!", {
        duration: 6000,
        style: { background: "#f97316", color: "white", fontWeight: "bold" },
      });
      setOrders(prev => {
        const exists = prev.find(o => o._id === order._id);
        if (exists) return prev;
        return [{ ...order, status: "pending" }, ...prev];
      });
    };

    const onStatusChanged = ({ orderId, status, driverName }) => {
      setOrders(prev => prev.map(o => {
        if (o._id !== orderId) return o;
        const updated = { ...o, status };
        if (driverName) updated.assignedDriver = { ...o.assignedDriver, name: driverName, chatId: o.assignedDriver?.chatId || "set" };
        return updated;
      }).filter(o => activeStatuses.includes(o.status)));
      if (status === "pending") setBadge(b => b + 1);
    };

    s.on("new_order", onNewOrder);
    s.on("order_status_changed", onStatusChanged);
    return () => {
      s.off("new_order", onNewOrder);
      s.off("order_status_changed", onStatusChanged);
    };
  }, [storeId, userRole]);

  const handleAccept = async (order) => {
    try {
      await acceptOrder(order._id);
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: "accepted" } : o));
      setBadge(b => Math.max(0, b - 1));
      toast.success(`Order ${order.orderNumber} accepted`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to accept");
    }
  };

  const handleReject = async (order) => {
    if (!confirm(`Reject order ${order.orderNumber}?`)) return;
    try {
      await rejectOrder(order._id, "");
      setOrders(prev => prev.filter(o => o._id !== order._id));
      setBadge(b => Math.max(0, b - 1));
      toast.success("Order rejected");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject");
    }
  };

  const handleLoadToCart = (order) => {
    onLoadToCart(order);
    setActioned(prev => ({ ...prev, [order._id]: { ...prev[order._id], cartLoaded: true } }));
    toast.success(`${order.orderNumber} items added to cart`);
  };

  const handleMarkOutForDelivery = async (order) => {
    try {
      const res = await markOutForDelivery(order._id);
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: "out_for_delivery" } : o));
      setActioned(prev => ({ ...prev, [order._id]: { ...prev[order._id], driverSent: true } }));
      if (res.telegramSent) {
        toast.success(`✈️ Telegram sent to driver — ${order.orderNumber}`);
      } else {
        toast.error(`Order dispatched but Telegram failed: ${res.telegramError}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    }
  };

  const handleConfirmPayment = async (order) => {
    if (!confirm(`Confirm cash received for ${order.orderNumber}? ($${order.total?.toFixed(2)})`)) return;
    try {
      await confirmPayment(order._id);
      setOrders(prev => prev.filter(o => o._id !== order._id));
      toast.success(`💵 Payment confirmed — ${order.orderNumber} completed`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to confirm payment");
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* Toggle button — fixed to right edge */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
        <button
          onClick={() => { setOpen(true); setBadge(0); }}
          className={`
            bg-orange-500 hover:bg-orange-600 text-white
            px-2 py-4 rounded-l-2xl shadow-xl transition-all
            flex flex-col items-center gap-2
            ${badge > 0 ? "ring-2 ring-orange-300 ring-offset-1" : ""}
          `}
          title="Online Orders"
        >
          <Truck size={18} />

          {/* Status dots — one per active status that has ≥1 order */}
          {Object.entries(STATUS_DOT).map(([status, cfg]) => {
            const count = orders.filter(o => o.status === status).length;
            if (!count) return null;
            return (
              <div key={status} className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${cfg.pulse ? "animate-pulse" : ""}`}
                  style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }}
                />
                <span className="text-[10px] font-bold leading-none">{count}</span>
              </div>
            );
          })}

          <span className="text-[9px] font-semibold opacity-80 [writing-mode:vertical-rl] rotate-180 tracking-widest">
            ORDERS
          </span>
        </button>

        {/* Notification badge */}
        {badge > 0 && (
          <span className="absolute -top-2 left-1
            min-w-[22px] h-[22px] px-1 rounded-full
            bg-red-500 text-white text-[11px] font-black
            flex items-center justify-center
            ring-2 ring-white dark:ring-neutral-950
            shadow-lg shadow-red-500/50
            animate-bounce pointer-events-none">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in panel */}
      <div className={`
        fixed top-0 right-0 h-full z-50
        w-[380px] max-w-full
        bg-white dark:bg-[#141414]
        shadow-2xl flex flex-col
        transition-transform duration-300
        ${open ? "translate-x-0" : "translate-x-full"}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-white/10 bg-orange-500 text-white">
          <div className="flex items-center gap-2 font-bold text-base">
            <Truck size={18} />
            Online Orders
            {orders.length > 0 && (
              <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs font-semibold">
                {orders.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchOrders} className="p-1 hover:bg-white/20 rounded-lg transition" title="Refresh">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto">
          {loading && orders.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <RefreshCw size={20} className="animate-spin mr-2" />
              Loading…
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <Package size={32} className="opacity-40" />
              <p className="text-sm">No active orders</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-white/10">
              {orders.map(order => {
                const st = STATUS_LABEL[order.status] || STATUS_LABEL.pending;
                const isExpanded = expanded === order._id;
                return (
                  <div key={order._id} className="px-4 py-3">
                    {/* Order header row */}
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => setExpanded(isExpanded ? null : order._id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-gray-800 dark:text-white">
                            {order.orderNumber}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {order.customer?.name} · {order.customer?.phone}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                            ${order.total?.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock size={10} /> {formatTime(order.createdAt)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className={`text-gray-400 transition-transform mt-1 shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-3 space-y-3">
                        {/* Address */}
                        {order.customer?.address && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-xl px-3 py-2">
                            📍 {order.customer.address}
                          </p>
                        )}

                        {/* Items */}
                        <div className="bg-gray-50 dark:bg-white/5 rounded-xl px-3 py-2 space-y-1">
                          {(order.items || []).map((item, i) => (
                            <div key={i} className="flex justify-between text-xs text-gray-700 dark:text-gray-300">
                              <span className="truncate mr-2">{item.name} × {item.quantity}</span>
                              <span className="shrink-0 font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          {order.deliveryFee > 0 && (
                            <div className="flex justify-between text-xs text-gray-500 border-t dark:border-white/10 pt-1 mt-1">
                              <span>Delivery fee</span>
                              <span>${order.deliveryFee.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs font-bold text-gray-800 dark:text-white border-t dark:border-white/10 pt-1 mt-1">
                            <span>Total</span>
                            <span>${order.total?.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Notes */}
                        {order.customer?.notes && (
                          <p className="text-xs text-gray-500 italic bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2">
                            📝 {order.customer.notes}
                          </p>
                        )}

                        {/* Action buttons */}
                        <div className="space-y-2">
                          {/* Pending — admin accept/reject */}
                          {order.status === "pending" && userRole === "admin" && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReject(order)}
                                className="flex-1 py-2 rounded-xl border border-red-300 text-red-500 text-xs font-semibold
                                  hover:bg-red-50 dark:hover:bg-red-900/20 transition flex items-center justify-center gap-1">
                                <XCircle size={13} /> Reject
                              </button>
                              <button
                                onClick={() => handleAccept(order)}
                                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold
                                  transition flex items-center justify-center gap-1">
                                <CheckCircle2 size={13} /> Accept
                              </button>
                            </div>
                          )}

                          {/* Accepted — both buttons always visible until each is pressed */}
                          {order.status === "accepted" && (() => {
                            const done = actioned[order._id] || {};
                            return (
                              <div className="space-y-2">
                                {done.cartLoaded ? (
                                  <div className="w-full py-2.5 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold flex items-center justify-center gap-1.5">
                                    <CheckCircle2 size={14} /> Items Loaded to Cart
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleLoadToCart(order)}
                                    className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold
                                      transition flex items-center justify-center gap-1.5">
                                    <Truck size={14} /> Load Items to Cart
                                  </button>
                                )}
                                {done.driverSent ? (
                                  <div className="w-full py-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-semibold flex items-center justify-center gap-1.5">
                                    <CheckCircle2 size={13} /> Sent to Driver
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleMarkOutForDelivery(order)}
                                    className="w-full py-2 rounded-xl border border-purple-400 text-purple-600 dark:text-purple-400 text-xs font-semibold
                                      hover:bg-purple-50 dark:hover:bg-purple-900/20 transition flex items-center justify-center gap-1.5">
                                    🚀 Send Order to Driver (Telegram)
                                  </button>
                                )}
                              </div>
                            );
                          })()}

                          {/* out_for_delivery — dispatch button if no driver yet */}
                          {order.status === "out_for_delivery" && !order.assignedDriver?.chatId && (
                            <button
                              onClick={() => handleMarkOutForDelivery(order)}
                              className="w-full py-2 rounded-xl border border-purple-400 text-purple-600 dark:text-purple-400 text-xs font-semibold
                                hover:bg-purple-50 dark:hover:bg-purple-900/20 transition flex items-center justify-center gap-1.5">
                              🚀 Send Order to Driver (Telegram)
                            </button>
                          )}

                          {/* Out for delivery — show assigned driver or waiting */}
                          {order.status === "out_for_delivery" && (
                            <div className="w-full py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 text-xs font-semibold text-center">
                              {order.assignedDriver?.chatId
                                ? `🚚 Driver: ${order.assignedDriver.name}`
                                : "🚚 Waiting for driver to accept..."}
                            </div>
                          )}

                          {/* Pending payment — cashier confirms cash received */}
                          {order.status === "pending_payment" && (
                            <div className="space-y-2">
                              <div className="w-full py-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 text-xs font-semibold text-center">
                                💵 Driver collected cash — awaiting your confirmation
                              </div>
                              <button
                                onClick={() => handleConfirmPayment(order)}
                                className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold
                                  transition flex items-center justify-center gap-1.5">
                                <BadgeCheck size={14} /> Confirm Cash Received
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
