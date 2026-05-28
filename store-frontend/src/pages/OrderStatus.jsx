import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { trackOrder } from "../api/index";
import { CheckCircle2, Clock, Truck, XCircle, Package, Loader2, Calendar, Tag, Star } from "lucide-react";

const STATUS_STEPS = [
  { key: "pending",          label: "Order Received",      icon: Clock,         color: "text-yellow-500" },
  { key: "accepted",         label: "Accepted",            icon: CheckCircle2,  color: "text-blue-500"   },
  { key: "out_for_delivery", label: "Out for Delivery",    icon: Truck,         color: "text-orange-500" },
  { key: "completed",        label: "Delivered",           icon: Package,       color: "text-green-500"  },
];

const STATUS_IDX = {
  pending:          0,
  accepted:         1,
  out_for_delivery: 2,
  pending_payment:  2,
  completed:        3,
};

export default function OrderStatus() {
  const { slug, orderId } = useParams();
  const location = useLocation();
  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const pointsEarnedFromNav = location.state?.pointsEarned || 0;

  const fetchOrder = () => {
    trackOrder(orderId)
      .then(setOrder)
      .catch(err => setError(err.response?.data?.message || "Order not found"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrder();
    // Poll every 15 seconds for status updates
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 size={36} className="animate-spin text-blue-500" />
    </div>
  );

  if (error) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <XCircle size={48} className="mx-auto text-red-400 mb-3" />
      <p className="text-gray-600">{error}</p>
      <Link to={`/store/${slug}`} className="text-blue-600 hover:underline text-sm mt-3 block">← Back to store</Link>
    </div>
  );

  const isRejected  = order.status === "rejected" || order.status === "cancelled";
  const currentStep = isRejected ? -1 : (STATUS_IDX[order.status] ?? 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Success header */}
      <div className="text-center mb-8">
        {isRejected ? (
          <>
            <XCircle size={64} className="mx-auto text-red-400 mb-3" />
            <h1 className="text-2xl font-bold text-gray-800">Order Rejected</h1>
          </>
        ) : order.status === "completed" ? (
          <>
            <CheckCircle2 size={64} className="mx-auto text-green-500 mb-3" />
            <h1 className="text-2xl font-bold text-gray-800">Order Delivered!</h1>
            <p className="text-gray-500 text-sm mt-1">Thank you for your order</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
              <Truck size={32} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Order Placed!</h1>
            <p className="text-gray-500 text-sm mt-1">We'll notify you as it progresses</p>
          </>
        )}

        <div className="mt-3 inline-block bg-gray-100 rounded-xl px-4 py-2">
          <p className="text-xs text-gray-500">Order number</p>
          <p className="font-bold text-gray-800 text-lg">{order.orderNumber}</p>
        </div>
      </div>

      {/* Status timeline */}
      {!isRejected && (
        <div className="bg-white rounded-2xl border p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-5">Order Status</h2>
          <div className="space-y-5">
            {STATUS_STEPS.map((step, idx) => {
              const Icon    = step.icon;
              const done    = idx <= currentStep;
              const current = idx === currentStep;
              return (
                <div key={step.key} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                    ${done ? "bg-blue-600" : "bg-gray-100"}`}>
                    <Icon size={18} className={done ? "text-white" : "text-gray-400"} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${done ? "text-gray-800" : "text-gray-400"}`}>
                      {step.label}
                    </p>
                    {current && (
                      <p className="text-xs text-blue-500 flex items-center gap-1 mt-0.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Current status
                      </p>
                    )}
                  </div>
                  {done && <CheckCircle2 size={16} className="text-blue-600 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scheduled delivery notice */}
      {order.scheduledFor && (
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4 mb-4 flex items-center gap-3">
          <Calendar size={20} className="text-blue-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-700">Scheduled Delivery</p>
            <p className="text-xs text-blue-600">{new Date(order.scheduledFor).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Customer info */}
      <div className="bg-white rounded-2xl border p-4 mb-5">
        <p className="text-sm font-medium text-gray-500 mb-1">Delivering to</p>
        <p className="font-semibold text-gray-800">{order.customer?.name}</p>
      </div>

      {/* Total with breakdown */}
      <div className="bg-blue-50 rounded-2xl p-4 mb-5 space-y-2">
        {order.discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span className="flex items-center gap-1"><Tag size={12} /> Discount</span>
            <span>−${order.discount.toFixed(2)}</span>
          </div>
        )}
        {order.tipAmount > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tip</span>
            <span>+${order.tipAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-1 border-t border-blue-200">
          <span className="font-medium text-gray-700">💵 Cash on delivery</span>
          <span className="text-xl font-bold text-blue-700">${order.total?.toFixed(2)}</span>
        </div>
      </div>

      {/* Points earned (completed order) */}
      {order.status === "completed" && (order.pointsEarned > 0 || pointsEarnedFromNav > 0) && (
        <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-4 mb-5 flex items-center gap-3">
          <Star size={20} className="text-yellow-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-700">Points Earned!</p>
            <p className="text-xs text-yellow-600">+{order.pointsEarned || pointsEarnedFromNav} loyalty points added to your account</p>
          </div>
        </div>
      )}

      <Link to={`/store/${slug}`}
        className="block text-center py-3 rounded-2xl border border-blue-600 text-blue-600 font-semibold hover:bg-blue-50 transition">
        ← Continue shopping
      </Link>

      <p className="text-xs text-gray-400 text-center mt-4">
        This page refreshes automatically every 15 seconds
      </p>
    </div>
  );
}
