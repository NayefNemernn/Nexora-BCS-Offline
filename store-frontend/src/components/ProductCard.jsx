import { Plus, Check } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import { useState } from "react";

export default function ProductCard({ product, currency }) {
  const addItem = useCartStore(s => s.addItem);
  const items   = useCartStore(s => s.items);
  const qty     = items.find(i => i.productId === product._id)?.quantity || 0;

  const [flash, setFlash] = useState(false);

  const handleAdd = () => {
    addItem(product);
    setFlash(true);
    setTimeout(() => setFlash(false), 800);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {product.imageUrl || product.image ? (
        <img
          src={product.imageUrl || product.image}
          alt={product.name}
          className="w-full h-40 object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
          <span className="text-4xl">🛒</span>
        </div>
      )}

      <div className="p-3 flex flex-col flex-1">
        <p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2 flex-1">
          {product.name}
        </p>
        {product.category?.name && (
          <p className="text-xs text-gray-400 mt-1">{product.category.name}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-blue-600">
            {currency || "$"}{product.price.toFixed(2)}
          </span>
          <button
            onClick={handleAdd}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all
              ${flash
                ? "bg-green-500 text-white scale-95"
                : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
          >
            {flash ? <Check size={14} /> : <Plus size={14} />}
            {qty > 0 ? `(${qty})` : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
