import React from "react";
import { motion } from "framer-motion";
import { Check, Layers, Trash2 } from "lucide-react";
import { useProductsTranslation } from "../../hooks/useProductsTranslation";
import { getCategoryIcon } from "../../lib/categoryIcon";

const LOW_STOCK_THRESHOLD = 5;
const nameHue = (str) => [...(str || "")].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);

export default function ProductCard({ product, onDelete, onEdit, onBatches, selected, onToggleSelect }) {
  const t = useProductsTranslation();
  const lowStock = product.stock <= LOW_STOCK_THRESHOLD;

  return (
    <motion.div
      layout
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onEdit(product)}
      className="
        relative p-3 space-y-2 cursor-pointer h-full overflow-hidden
        rounded-3xl
        bg-gray-100 dark:bg-[#141414]
        shadow-[10px_10px_25px_#d1d5db,-10px_-10px_25px_#ffffff]
        dark:shadow-[10px_10px_25px_#050505,-10px_-10px_25px_#1f1f1f]
      "
    >
      {/* Bulk-select checkbox */}
      <div
        className="absolute top-2 left-2 z-10"
        onClick={e => { e.stopPropagation(); onToggleSelect?.(product._id); }}
      >
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
          ${selected
            ? "bg-blue-600 border-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
            : "bg-white/80 dark:bg-black/60 border-gray-300 dark:border-white/30 hover:border-blue-400"
          }`}>
          {selected && <Check size={11} className="text-white" strokeWidth={3}/>}
        </div>
      </div>

      {/* IMAGE or initials banner */}
      {product.image ? (
        <div className="h-32 rounded-2xl overflow-hidden">
          <img src={product.image} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-20 rounded-2xl flex items-center justify-center select-none"
          style={{ background: `linear-gradient(135deg, hsl(${nameHue(product.name)},60%,58%), hsl(${(nameHue(product.name)+40)%360},65%,45%))` }}>
          <span className="text-4xl drop-shadow">
            {getCategoryIcon(product.category?.name)}
          </span>
        </div>
      )}

      {/* NAME */}
      <h3 className="font-semibold text-gray-800 dark:text-gray-100">
        {product.name}
      </h3>

      {/* PRICE */}
      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
        ${parseFloat(product.price).toFixed(1)}
      </p>

      {/* BARCODE */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t.barcodeLabel}: {product.barcode}
      </p>

      {/* FOOTER */}
      <div className="space-y-2">
        {/* Stock badge — full width */}
        <span className={`
          block w-full text-center text-xs px-2 py-1 rounded-xl font-semibold
          ${lowStock
            ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
            : "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
          }
        `}>
          {t.stockLabel}: {product.stock}
        </span>

        {/* Action buttons — stacked row inside card */}
        <div
          className="flex gap-1.5"
          onClick={e => e.stopPropagation()}
        >
          {onBatches && (
            <button
              onClick={e => { e.stopPropagation(); onBatches(product); }}
              title="View batches"
              className="flex-1 flex items-center justify-center py-1.5 rounded-xl
                bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400
                hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition"
            >
              <Layers size={13}/>
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete(product._id); }}
            title={t.delete}
            className="flex-1 flex items-center justify-center py-1.5 rounded-xl
              bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400
              hover:bg-red-100 dark:hover:bg-red-900/30 transition"
          >
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
