import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDeliveryOrder, confirmCashCollected } from "../api/index";

const STATUS_STEP = {
  out_for_delivery: 0,
  pending_payment:  1,
  completed:        2,
};

export default function DeliveryPage() {
  const { orderId } = useParams();
  const [order,     setOrder]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [confirming,setConfirming]= useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    getDeliveryOrder(orderId)
      .then(setOrder)
      .catch(() => setError("Order not found"))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await confirmCashCollected(orderId);
      setOrder(o => ({ ...o, status: "pending_payment" }));
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to confirm");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="text-6xl mb-4">❌</div>
      <p className="text-gray-700 font-semibold">{error}</p>
    </div>
  );

  const alreadyCollected = order.status === "pending_payment" || order.status === "completed";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-orange-500 text-white px-5 py-5 text-center">
        <div className="text-4xl mb-2">🚚</div>
        <h1 className="text-xl font-bold">Delivery Order</h1>
        <p className="text-orange-100 text-sm mt-1">{order.orderNumber}</p>
      </div>

      <div className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">

        {/* Customer info */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Customer</p>
          <div className="space-y-2">
            <p className="font-semibold text-gray-800 text-lg">{order.customer?.name}</p>
            <a
              href={`tel:${order.customer?.phone}`}
              className="flex items-center gap-2 text-blue-600 font-medium text-base"
            >
              📞 {order.customer?.phone}
            </a>
            {order.customer?.address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(order.customer.address)}`}
                target="_blank" rel="noreferrer"
                className="flex items-start gap-2 text-gray-600 text-sm"
              >
                <span className="mt-0.5">📍</span>
                <span>{order.customer.address}</span>
              </a>
            )}
            {order.customer?.notes && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
                📝 {order.customer.notes}
              </p>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Order Items</p>
          <div className="space-y-2">
            {(order.items || []).map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.name} <span className="text-gray-400">× {item.quantity}</span></span>
                <span className="font-semibold text-gray-800">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-sm text-gray-500 border-t pt-2 mt-1">
                <span>Delivery fee</span>
                <span>${order.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base text-gray-900 border-t pt-2 mt-1">
              <span>Total to collect</span>
              <span className="text-orange-600">${order.total?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action */}
        {done || alreadyCollected ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-2">
            <div className="text-5xl">✅</div>
            <p className="font-bold text-green-700 text-lg">Cash Collected!</p>
            <p className="text-green-600 text-sm">The store has been notified. Hand the cash to the manager.</p>
          </div>
        ) : (
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full py-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-70
              text-white font-bold text-xl rounded-2xl shadow-lg shadow-orange-500/30
              transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {confirming ? (
              <><div className="w-6 h-6 border-3 border-white/40 border-t-white rounded-full animate-spin" /> Confirming...</>
            ) : (
              <>✅ I Collected the Cash</>
            )}
          </button>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          Tap after you receive ${order.total?.toFixed(2)} from the customer
        </p>
      </div>
    </div>
  );
}
