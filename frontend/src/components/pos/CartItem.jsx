import { Package } from "lucide-react";
import { useState } from "react";

export default function CartItem({ item, onIncrease, onDecrease, formatUSD, formatLBP, toLBP, toLBPNice, displayCurrency }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl
      bg-gray-50 dark:bg-[#1c1c1c]
      border border-gray-100 dark:border-white/5
      hover:border-blue-200 dark:hover:border-blue-500/20 transition-colors">

      {/* Thumbnail */}
      <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center">
        {item.image && !imgError ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Package size={20} className="text-gray-400 dark:text-gray-500" />
        )}
      </div>

      {/* Name + unit price */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate leading-tight">{item.name}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {displayCurrency === "lbp"
            ? formatLBP(toLBPNice(item.price))
            : formatUSD(item.price)}
          {" "}/ unit
        </p>
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onDecrease(item.productId)}
          className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-[#2a2a2a] text-sm font-bold
            flex items-center justify-center
            shadow-[0_4px_0_0_rgba(0,0,0,0.15)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)]
            active:shadow-none active:translate-y-[4px]
            hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400
            transition-[transform,box-shadow,background-color] duration-75 select-none"
        >−</button>
        <span className="text-sm font-bold w-5 text-center tabular-nums">{item.quantity}</span>
        <button
          onClick={() => onIncrease(item.productId)}
          className="w-9 h-9 rounded-xl bg-blue-600 text-white text-sm font-bold
            flex items-center justify-center
            shadow-[0_4px_0_0_#1d4ed8]
            active:shadow-none active:translate-y-[4px]
            hover:bg-blue-500
            transition-[transform,box-shadow,background-color] duration-75 select-none"
        >+</button>
      </div>

      {/* Line total */}
      <div className="text-right shrink-0 min-w-[56px]">
        <div className="text-xs font-bold text-green-500 tabular-nums">
          {formatUSD(item.price * item.quantity)}
        </div>
        {displayCurrency !== "usd" && (
          <div className="text-xs text-amber-500 tabular-nums">
            {formatLBP(toLBPNice(item.price * item.quantity))}
          </div>
        )}
      </div>
    </div>
  );
}
