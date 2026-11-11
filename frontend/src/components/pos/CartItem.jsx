import { Package, X } from "lucide-react";
import { useState } from "react";
import { isWeighed, subUnitOf, parseQuantityInput, lineTotal, formatQty } from "../../lib/quantity";

const QTY_ERRORS = {
  invalid:   "Enter a number",
  negative:  "Must be more than 0",
  zero:      "Must be more than 0",
  precision: "Max 3 decimals",
  too_large: "Too large",
};

export default function CartItem({ item, onIncrease, onDecrease, onSetQuantity, onRemove, formatUSD, formatLBP, toLBP, toLBPNice, displayCurrency }) {
  const [imgError, setImgError] = useState(false);

  const weighed = isWeighed(item.unitType);
  const subUnit = subUnitOf(item.unitType);

  // ── kg / L entry — what the cashier typed, and whether it's in g / mL ──
  const [qtyText,  setQtyText]  = useState(() => (weighed && item.quantity > 0 ? String(item.quantity) : ""));
  const [inSub,    setInSub]    = useState(false);
  const [qtyError, setQtyError] = useState("");

  const applyQty = (text, sub) => {
    const parsed = parseQuantityInput(text, item.unitType, { inSubUnit: sub });
    if (!parsed.ok) {
      onSetQuantity(item.productId, 0);
      setQtyError(parsed.error === "precision" && sub ? `Whole ${subUnit} only` : QTY_ERRORS[parsed.error] || "");
      return;
    }
    if (onSetQuantity(item.productId, parsed.quantity)) setQtyError("");
    else {
      onSetQuantity(item.productId, 0);
      setQtyError(`Only ${formatQty(item.stock, item.unitType)} in stock`);
    }
  };

  const handleQtyChange = (text) => { setQtyText(text); applyQty(text, inSub); };
  const toggleSubUnit   = () => { setInSub(!inSub); applyQty(qtyText, !inSub); };

  const total = lineTotal(item.price, item.quantity, item.unitType);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 rounded-xl
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
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">
          {weighed && item.quantity > 0 && <>{formatQty(item.quantity, item.unitType)} × </>}
          {displayCurrency === "lbp"
            ? formatLBP(toLBPNice(item.price))
            : formatUSD(item.price)}
          {" "}/ {weighed ? item.unitType : "unit"}
        </p>
      </div>

      {/* Qty controls — a kg / L line gets its amount typed on a row of its own below */}
      {weighed ? (
        <div className="order-last w-full flex items-center justify-end gap-1.5">
          <p className="flex-1 min-w-0 text-[10px] font-semibold text-red-500 truncate">{qtyError}</p>
          <input
            autoFocus={item.quantity === 0}
            value={qtyText}
            onChange={(e) => handleQtyChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            inputMode="decimal"
            placeholder={inSub ? "0" : "0.000"}
            aria-label={`${item.name} quantity in ${inSub ? subUnit : item.unitType}`}
            className={`w-24 h-9 px-2 rounded-xl text-sm font-bold text-right tabular-nums outline-none
              bg-white dark:bg-[#141414] border-2 transition-colors
              ${qtyError
                ? "border-red-400"
                : item.quantity > 0
                  ? "border-gray-200 dark:border-white/10 focus:border-blue-400"
                  : "border-amber-400"}`}
          />
          {/* Unit — tap to type grams / millilitres instead */}
          <button
            type="button"
            onClick={toggleSubUnit}
            title={`Enter in ${inSub ? item.unitType : subUnit}`}
            className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-[#2a2a2a] text-xs font-bold
              flex items-center justify-center
              shadow-[0_4px_0_0_rgba(0,0,0,0.15)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)]
              active:shadow-none active:translate-y-[4px]
              hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400
              transition-[transform,box-shadow,background-color] duration-75 select-none"
          >{inSub ? subUnit : item.unitType}</button>
          <button
            type="button"
            onClick={() => onRemove(item.productId)}
            title="Remove"
            className="w-7 h-9 rounded-xl text-gray-400 flex items-center justify-center
              hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400
              transition-colors select-none"
          ><X size={13}/></button>
        </div>
      ) : (
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
      )}

      {/* Line total */}
      <div className="text-right shrink-0 min-w-[56px]">
        <div className="text-xs font-bold text-green-500 tabular-nums">
          {formatUSD(total)}
        </div>
        {displayCurrency !== "usd" && (
          <div className="text-xs text-amber-500 tabular-nums">
            {formatLBP(toLBPNice(total))}
          </div>
        )}
      </div>
    </div>
  );
}
