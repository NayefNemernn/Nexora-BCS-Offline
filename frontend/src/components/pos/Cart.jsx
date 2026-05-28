import { ShoppingBag, Trash2, PauseCircle } from "lucide-react";
import CartItem from "./CartItem";

export default function Cart({
  cart,
  increase,
  decrease,
  clearCart,
  total,
  onCheckout,
  onHold,
  heldCount,
  t,
  formatUSD,
  formatLBP,
  toLBP,
  toLBPNice,
  displayCurrency,
}) {
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const renderTotal = () => {
    if (displayCurrency === "lbp")
      return <span className="font-bold text-lg text-amber-500 tabular-nums">{formatLBP(toLBPNice(total))}</span>;
    if (displayCurrency === "usd")
      return <span className="font-bold text-lg text-green-500 tabular-nums">{formatUSD(total)}</span>;
    return (
      <div className="text-right">
        <div className="font-bold text-green-500 tabular-nums">{formatUSD(total)}</div>
        <div className="font-bold text-amber-500 tabular-nums">{formatLBP(toLBPNice(total))}</div>
      </div>
    );
  };

  const checkoutLabel = () => {
    const base = t.checkout;
    if (cart.length === 0) return base;
    if (displayCurrency === "lbp") return `${base} · ${formatLBP(toLBPNice(total))}`;
    return `${base} · ${formatUSD(total)}`;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col
      bg-white dark:bg-[#141414] rounded-2xl
      shadow-[6px_6px_16px_#d1d5db,-6px_-6px_16px_#ffffff]
      dark:shadow-[6px_6px_16px_#050505,-6px_-6px_16px_#1a1a1a]
      overflow-hidden">

      {/* ── Header ── */}
      <div className="relative px-4 py-3 flex items-center justify-between shrink-0
        border-b border-gray-100 dark:border-white/5
        bg-gradient-to-r from-blue-50/60 to-transparent dark:from-blue-950/20 dark:to-transparent">

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <ShoppingBag size={14} className="text-blue-600 dark:text-blue-400" />
          </div>
          <span className="font-semibold text-sm">{t.currentOrder}</span>
          {heldCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-semibold tabular-nums">
              {heldCount} held
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <>
              <button
                onClick={onHold}
                title="Hold order"
                className="w-9 h-9 flex items-center justify-center rounded-xl
                  bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400
                  shadow-[0_4px_0_0_rgba(245,158,11,0.3)] dark:shadow-[0_4px_0_0_rgba(245,158,11,0.2)]
                  active:shadow-none active:translate-y-[4px]
                  hover:bg-amber-100 dark:hover:bg-amber-900/30
                  transition-[transform,box-shadow,background-color] duration-75 select-none"
              >
                <PauseCircle size={15}/>
              </button>
              <button
                onClick={clearCart}
                title="Clear cart"
                className="w-9 h-9 flex items-center justify-center rounded-xl
                  bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400
                  shadow-[0_4px_0_0_rgba(239,68,68,0.25)] dark:shadow-[0_4px_0_0_rgba(239,68,68,0.15)]
                  active:shadow-none active:translate-y-[4px]
                  hover:bg-red-100 dark:hover:bg-red-900/30
                  transition-[transform,box-shadow,background-color] duration-75 select-none"
              >
                <Trash2 size={15}/>
              </button>
            </>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold tabular-nums
            ${cartCount > 0
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"}`}>
            {cartCount} {cartCount === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      {/* ── Items ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10 gap-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                <ShoppingBag size={28} className="text-gray-300 dark:text-gray-600"/>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <span className="text-blue-400 text-xs font-bold">0</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-400">{t.cartEmpty}</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">Tap a product to add it</p>
            </div>
          </div>
        ) : (
          cart.map((item) => (
            <CartItem
              key={item.productId}
              item={item}
              onIncrease={increase}
              onDecrease={decrease}
              formatUSD={formatUSD}
              formatLBP={formatLBP}
              toLBP={toLBP}
              toLBPNice={toLBPNice}
              displayCurrency={displayCurrency}
            />
          ))
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5 shrink-0 space-y-3
        bg-gradient-to-t from-gray-50/80 to-transparent dark:from-[#111]/60 dark:to-transparent">

        {/* Totals row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">{cartCount} {cartCount === 1 ? "item" : "items"}</p>
            <p className="text-sm font-bold">{t.total}</p>
          </div>
          {renderTotal()}
        </div>

        {/* Checkout button */}
        <button
          onClick={onCheckout}
          disabled={cart.length === 0}
          className="w-full py-4 rounded-xl font-bold text-base
            text-white
            bg-gradient-to-r from-green-600 to-emerald-500
            hover:from-green-500 hover:to-emerald-400
            shadow-[0_6px_0_0_#15803d]
            active:shadow-none active:translate-y-[6px]
            transition-[transform,box-shadow] duration-75 select-none
            disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
        >
          {checkoutLabel()}
        </button>
      </div>
    </div>
  );
}
