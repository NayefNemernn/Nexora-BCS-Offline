import { useReceiptTranslation } from "../hooks/useReceiptTranslation";

export default function Receipt({ sale, storeName }) {
  const t = useReceiptTranslation();

  return (
    <div className="print-receipt p-4 text-sm">

      <h2 className="text-center font-bold text-lg mb-2">
        {storeName || sale?.store?.name || ""}
      </h2>

      <p className="text-center text-xs">
        {new Date().toLocaleString()}
      </p>

      <hr className="my-2"/>

      {sale.items.map((i, idx) => (
        <div key={idx} className="flex justify-between mb-1">
          <span>{i.name} × {i.quantity}</span>
          <span>${(i.price * i.quantity).toFixed(2)}</span>
        </div>
      ))}

      <hr className="my-2"/>

      <div className="flex justify-between font-bold">
        <span>{t.total}</span>
        <span>${sale.total.toFixed(2)}</span>
      </div>

    </div>
  );
}
