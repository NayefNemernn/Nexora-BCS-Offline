import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getDeliveryOrder, driverAcceptOrder } from "../api/index";
import { Loader2, CheckCircle2, XCircle, Truck } from "lucide-react";

export default function DriverAcceptPage() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const chatId     = searchParams.get("cid")  || "";
  const driverName = searchParams.get("name") || "Driver";

  const [order,    setOrder]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [status,   setStatus]   = useState(null); // null | "success" | "taken" | "error"
  const [message,  setMessage]  = useState("");

  useEffect(() => {
    getDeliveryOrder(orderId)
      .then(setOrder)
      .catch(() => setMessage("Could not load order."))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await driverAcceptOrder(orderId, chatId, driverName);
      setStatus("success");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to accept order";
      if (err.response?.status === 409) {
        setStatus("taken");
        setMessage(msg);
      } else {
        setStatus("error");
        setMessage(msg);
      }
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-orange-500" />
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-6 text-center">
        <CheckCircle2 size={72} className="text-green-500 mb-4" />
        <h1 className="text-2xl font-bold text-green-800">Order is yours!</h1>
        <p className="text-green-700 mt-2">
          You accepted <strong>{order?.orderNumber}</strong>.<br />
          Check Telegram for the delivery details and "Money Collected" button.
        </p>
      </div>
    );
  }

  if (status === "taken") {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center px-6 text-center">
        <XCircle size={72} className="text-orange-400 mb-4" />
        <h1 className="text-2xl font-bold text-orange-800">Already taken</h1>
        <p className="text-orange-700 mt-2">{message}</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center px-6 text-center">
        <XCircle size={72} className="text-red-400 mb-4" />
        <h1 className="text-2xl font-bold text-red-800">Error</h1>
        <p className="text-red-700 mt-2">{message}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 px-6 text-center">
        <p>{message || "Order not found."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-orange-500 text-white px-4 py-4 flex items-center gap-3">
        <Truck size={22} />
        <div>
          <h1 className="font-bold text-lg leading-tight">New Delivery Order</h1>
          <p className="text-orange-100 text-sm">{order.orderNumber}</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 space-y-4 max-w-md mx-auto w-full">
        {/* Customer */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Customer</p>
          <p className="font-semibold text-gray-800">{order.customer?.name}</p>
          <a href={`tel:${order.customer?.phone}`} className="text-blue-600 text-sm">
            📞 {order.customer?.phone}
          </a>
          {order.customer?.address && (
            <p className="text-gray-600 text-sm mt-1.5">📍 {order.customer.address}</p>
          )}
          {order.customer?.locationDescription && (
            <p className="text-gray-500 text-sm mt-0.5">🏢 {order.customer.locationDescription}</p>
          )}
          {order.customer?.lat && order.customer?.lng && (
            <a
              href={`https://maps.google.com/?q=${order.customer.lat},${order.customer.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-2 text-xs text-blue-600 underline"
            >
              📍 Open in Google Maps
            </a>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Items</p>
          <div className="space-y-1">
            {(order.items || []).map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700 truncate mr-2">{item.name} × {item.quantity}</span>
                <span className="font-semibold text-gray-800 shrink-0">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-sm text-gray-500 border-t pt-1 mt-1">
                <span>Delivery fee</span>
                <span>${order.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 border-t pt-1 mt-1">
              <span>Total to collect</span>
              <span className="text-orange-600">${order.total?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {order.customer?.notes && (
          <div className="bg-amber-50 rounded-2xl p-4 text-sm text-amber-800">
            📝 {order.customer.notes}
          </div>
        )}
      </div>

      {/* Accept button */}
      <div className="sticky bottom-0 px-4 py-4 bg-gray-50 border-t">
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-bold rounded-2xl text-lg transition-all flex items-center justify-center gap-2"
        >
          {accepting
            ? <><Loader2 size={20} className="animate-spin" /> Accepting...</>
            : "✅ Accept This Order"
          }
        </button>
      </div>
    </div>
  );
}
