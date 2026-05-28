import { useEffect, useState } from "react";
import { getPendingSales, confirmPayment } from "../api/orders.api";
import toast from "react-hot-toast";
import { Truck, CheckCircle2, Clock, MapPin, Phone, RefreshCw, Banknote } from "lucide-react";

export default function PendingPayments() {
  const [sales,      setSales]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [confirming, setConfirming] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPendingSales();
      setSales(data);
    } catch {
      toast.error("Failed to load pending payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleConfirm = async (sale) => {
    if (!sale.orderId?._id) return toast.error("No linked order found");
    setConfirming(sale._id);
    try {
      await confirmPayment(sale.orderId._id);
      toast.success(`Payment confirmed — ${sale.orderId.orderNumber}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to confirm payment");
    } finally {
      setConfirming(null);
    }
  };

  const timeSince = (date) => {
    const m = Math.floor((Date.now() - new Date(date)) / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m/60)}h ${m % 60}m ago`;
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-neutral-950 p-5 w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Truck size={24} className="text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Pending Payments</h1>
          {sales.length > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {sales.length}
            </span>
          )}
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        These delivery orders are out with the driver. Confirm cash received once the driver returns.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Banknote size={48} className="mx-auto mb-3 opacity-30" />
          <p>No pending payments</p>
          <p className="text-sm mt-1">All delivery orders have been settled</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sales.map(sale => {
            const order = sale.orderId;
            const isProcessing = confirming === sale._id;
            return (
              <div key={sale._id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-orange-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-800 dark:text-white">
                          {order?.orderNumber || "Order"}
                        </span>
                        <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                          Out for delivery
                        </span>
                      </div>
                      <p className="font-medium text-gray-700 dark:text-gray-300">
                        {order?.customer?.name || sale.customerName}
                      </p>
                      {order?.customer?.phone && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone size={12} /> {order.customer.phone}
                        </p>
                      )}
                      {sale.deliveryAddress && (
                        <p className="text-sm text-gray-500 flex items-start gap-1 mt-0.5">
                          <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                          <span className="truncate">{sale.deliveryAddress}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-bold text-gray-800 dark:text-white">
                        ${sale.total?.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                        <Clock size={11} /> {timeSince(sale.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mt-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-1">
                    {sale.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
                        <span>{item.name} × {item.quantity}</span>
                        <span>${item.subtotal?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirm button */}
                <button
                  onClick={() => handleConfirm(sale)}
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                  {isProcessing
                    ? <><RefreshCw size={16} className="animate-spin" /> Confirming...</>
                    : <><CheckCircle2 size={16} /> Confirm Cash Received</>
                  }
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
