import { useAuth } from "../context/AuthContext";

export default function ReceiptPreview({ sale, amount }) {
  const { storeName } = useAuth();

  if (!sale) return null;

  const remaining = sale.balance - amount;

  return (
    <div id="receipt" className="text-sm">
      <h2 className="text-center font-bold text-lg">{storeName}</h2>
      <p className="text-center text-gray-500 mb-3">Payment Receipt</p>

      <div className="border-t pt-2">
        <p><strong>Customer:</strong> {sale.customerName}</p>
        {sale.phone && <p><strong>Phone:</strong> {sale.phone}</p>}
        <p><strong>Date:</strong> {new Date().toLocaleString()}</p>
      </div>

      <div className="border-t mt-3 pt-2">
        <p className="flex justify-between"><span>Total</span><span>${sale.total.toFixed(2)}</span></p>
        <p className="flex justify-between"><span>Already Paid</span><span>${sale.paid.toFixed(2)}</span></p>
        <p className="flex justify-between font-semibold"><span>Payment</span><span>${amount.toFixed(2)}</span></p>
        <p className="flex justify-between text-orange-600"><span>Remaining</span><span>${remaining.toFixed(2)}</span></p>
      </div>

      <p className="text-center mt-4 text-xs text-gray-500">Thank you for your business</p>
    </div>
  );
}