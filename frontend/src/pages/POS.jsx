import { useRefresh }    from "../context/RefreshContext";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { getAllProducts } from "../api/product.api";
import { getCategories } from "../api/category.api";
import { useCart }       from "../hooks/useCart";
import CheckoutModal     from "../components/CheckoutModal";
import Cart              from "../components/pos/Cart";
import BarcodeScanner    from "../components/pos/BarcodeScanner";
import { useAuth }       from "../context/AuthContext";
import { useTranslation } from "../hooks/useTranslation";
import { useCurrency }   from "../context/CurrencyContext";
import ExchangeRateBar   from "../components/ExchangeRateBar";
import VoiceButton       from "../components/common/VoiceButton";
import { connectSocket } from "../lib/socket";
import { Truck, X as XIcon, PauseCircle, LockOpen, History } from "lucide-react";
import { openCashDrawer, connectCashDrawer, cashDrawerSupported } from "../lib/cashDrawer";
import OnlineOrdersPanel from "../components/pos/OnlineOrdersPanel";
import {
  cacheProducts, getCachedProducts,
  cacheCategories, getCachedCategories,
  cacheCustomers,
} from "../lib/offlineDB";
import api from "../api/axios";
import toast             from "react-hot-toast";
import { ShoppingBag, Search, RotateCcw } from "lucide-react";
import QuickReturn from "../components/QuickReturn";
import CashierSalesHistory from "../components/pos/CashierSalesHistory";

import { getCategoryIcon } from "../lib/categoryIcon";

const nameHue = (str) => [...(str || "")].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);

const POS_PAGE_SIZE = 40;

// ── Subtle dot-grid background ────────────────────────────────────────────────
const dotGrid = {
  backgroundImage: `radial-gradient(circle, rgba(99,102,241,0.08) 1px, transparent 1px)`,
  backgroundSize: "24px 24px",
};

export default function POS({ setPage }) {
  const { tick } = useRefresh();

  const [products,         setProducts]         = useState([]);
  const [categories,       setCategories]       = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search,           setSearch]           = useState("");
  const [openCheckout,     setOpenCheckout]     = useState(false);
  const [openReturn,       setOpenReturn]       = useState(false);
  const [openHistory,      setOpenHistory]      = useState(false);
  const [loading,          setLoading]          = useState(true);
  const [flashId,          setFlashId]          = useState(null);
  const [posPage,          setPosPage]          = useState(1);

  const { cart, addToCart, increase, decrease, clearCart, loadCart, loadDeliveryOrder, total } = useCart();
  const { user, store: ctxStore }   = useAuth();
  const { t }      = useTranslation();
  const { toLBP, toLBPNice, formatLBP, formatUSD, displayCurrency } = useCurrency();

  const [incomingOrder,  setIncomingOrder]  = useState(null);
  const [isDeliveryMode, setIsDeliveryMode] = useState(false);
  const [deliveryOrder,  setDeliveryOrder]  = useState(null);

  // ── Held carts (client-side only, no stock deducted) ──────────────────────
  const [heldCarts,    setHeldCarts]    = useState([]);
  const [holdCounter,  setHoldCounter]  = useState(0);

  // ── Cart resize drag ──────────────────────────────────────────────────────
  const [cartWidth, setCartWidth] = useState(() => {
    const saved = parseInt(localStorage.getItem("pos_cart_width"), 10);
    return saved && saved >= 260 && saved <= 640 ? saved : 360;
  });
  const isDragging      = useRef(false);
  const dragStartX      = useRef(0);
  const dragStartWidth  = useRef(cartWidth);

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return;
      const delta = dragStartX.current - e.clientX;
      setCartWidth(Math.max(260, Math.min(640, dragStartWidth.current + delta)));
    };
    const onUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        localStorage.setItem("pos_cart_width", dragStartWidth.current + (dragStartX.current - dragStartX.current));
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("pos_cart_width", cartWidth);
  }, [cartWidth]);

  const handleResizeStart = (e) => {
    isDragging.current     = true;
    dragStartX.current     = e.clientX;
    dragStartWidth.current = cartWidth;
    e.preventDefault();
  };

  const holdCart = () => {
    if (cart.length === 0) return;
    const n = holdCounter + 1;
    setHoldCounter(n);
    setHeldCarts(prev => [...prev, { id: Date.now(), label: `Order #${n}`, items: [...cart] }]);
    clearCart();
    toast("Order held — serve next customer", { icon: "⏸️" });
  };

  const resumeCart = (heldId) => {
    const held = heldCarts.find(h => h.id === heldId);
    if (!held) return;
    if (cart.length > 0) {
      const n = holdCounter + 1;
      setHoldCounter(n);
      setHeldCarts(prev => [
        ...prev.filter(h => h.id !== heldId),
        { id: Date.now(), label: `Order #${n}`, items: [...cart] },
      ]);
    } else {
      setHeldCarts(prev => prev.filter(h => h.id !== heldId));
    }
    loadCart(held.items);
    toast.success(`Resumed ${held.label}`);
  };

  const discardHeld = (heldId) => {
    setHeldCarts(prev => prev.filter(h => h.id !== heldId));
  };

  const handleOpenDrawer = async () => {
    const result = await openCashDrawer();
    if (result.ok) {
      toast.success("Cash drawer opened");
    } else if (result.reason === "unsupported") {
      toast.error("Cash drawer not supported in this browser (use Chrome/Edge)");
    } else if (result.reason === "not_connected") {
      const connected = await connectCashDrawer();
      if (connected) {
        const retry = await openCashDrawer();
        if (retry.ok) toast.success("Cash drawer connected & opened");
      } else {
        toast.error("Could not connect to cash drawer");
      }
    } else {
      toast.error("Failed to open cash drawer");
    }
  };

  /* ── load products ── */
  const load = async () => {
    const cachedP = await getCachedProducts();
    const cachedC = await getCachedCategories();
    if (cachedP) { setProducts(cachedP); setLoading(false); }
    if (cachedC) setCategories(cachedC);
    try {
      const [p, c, cusRes] = await Promise.all([
        getAllProducts(),
        getCategories(),
        api.get("/customers").catch(() => ({ data: [] })),
      ]);
      // Only update if we actually got data (guard against empty API response)
      if (p && p.length > 0) { setProducts(p); await cacheProducts(p); }
      if (c && c.length > 0) { setCategories(c); await cacheCategories(c); }
      await cacheCustomers(cusRes.data);
    } catch {
      if (!cachedP) toast("📦 No cached products available", { icon: "⚠️" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tick]);

  useEffect(() => {
    const onOnline = () => load();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  const barcodeMap = useMemo(() => {
    const map = {};
    products.forEach(p => { if (p.barcode) map[p.barcode.toString()] = p; });
    return map;
  }, [products]);

  const addProductSafe = (product) => {
    if (!product)            { toast.error(t.productNotFound); return; }
    if (product.stock === 0) { toast.error(t.outOfStock);      return; }
    addToCart(product);
    // Brief flash animation
    setFlashId(product._id);
    setTimeout(() => setFlashId(id => id === product._id ? null : id), 300);
  };

  const handleSearchEnter = (e) => {
    if (e.key !== "Enter") return;
    const code = search.trim();
    if (!code) return;
    const product = barcodeMap[code];
    addProductSafe(product);
    setSearch("");
  };

  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") { clearCart(); toast(t.cartCleared); } };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  // Socket: show toast when a new order arrives
  useEffect(() => {
    const storeId = ctxStore?._id;
    if (!storeId) return;
    const role = user?.role === "admin" ? "admin" : "cashier";
    const s = connectSocket(storeId, role);

    const onNewOrder = (order) => {
      toast(`🚚 New order: ${order.orderNumber}`, { icon: "🔔" });
    };
    const onOrderAccepted = (order) => {
      setIncomingOrder(order);
      toast.success(`Order ${order.orderNumber} accepted — ready for pickup`);
    };

    s.on("new_order", onNewOrder);
    s.on("order_accepted", onOrderAccepted);
    return () => {
      s.off("new_order", onNewOrder);
      s.off("order_accepted", onOrderAccepted);
    };
  }, [ctxStore?._id]);

  const loadOrderToCart = (order) => {
    clearCart();
    loadDeliveryOrder(order.items);
    setDeliveryOrder(order);
    setIsDeliveryMode(true);
    setIncomingOrder(null);
    setOpenCheckout(false);
    toast.success(`🚚 Order ${order.orderNumber} loaded to cart`);
  };

  const clearDeliveryMode = () => {
    setIsDeliveryMode(false);
    setDeliveryOrder(null);
    clearCart();
  };

  const filteredProducts = products.filter(p => {
    const matchCat    = selectedCategory === "all" || p.category?._id === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        (p.barcode && p.barcode.includes(search));
    return matchCat && matchSearch;
  });

  // Reset to page 1 whenever the filter changes
  useEffect(() => { setPosPage(1); }, [search, selectedCategory]);

  const totalPosPages   = Math.max(1, Math.ceil(filteredProducts.length / POS_PAGE_SIZE));
  const safePosPage     = Math.min(posPage, totalPosPages);
  const paginatedProducts = filteredProducts.slice((safePosPage - 1) * POS_PAGE_SIZE, safePosPage * POS_PAGE_SIZE);

  const renderPrice = (price) => {
    if (displayCurrency === "usd")
      return <span className="text-green-500 dark:text-green-400 font-bold text-sm tabular-nums">{formatUSD(price)}</span>;
    if (displayCurrency === "lbp")
      return <span className="text-amber-500 dark:text-amber-400 font-bold text-sm tabular-nums">{formatLBP(toLBP(price))}</span>;
    return (
      <div className="flex flex-col leading-tight">
        <span className="text-green-500 dark:text-green-400 font-bold text-sm tabular-nums">{formatUSD(price)}</span>
        <span className="text-amber-500 dark:text-amber-400 font-semibold text-sm tabular-nums">{formatLBP(toLBP(price))}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0b0b0b] text-gray-900 dark:text-white overflow-hidden">

      <BarcodeScanner barcodeMap={barcodeMap} onScan={addProductSafe} />

      {/* ── Branded Header ── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2
        bg-[#0f172a] dark:bg-[#080d18]
        border-b border-white/5">

        {/* BCS Logo mark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0
            bg-gradient-to-br from-blue-500 to-indigo-600
            shadow-[0_0_12px_rgba(99,102,241,0.5)]">
            <span className="text-white font-black text-[9px] tracking-tight">BCS</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-white text-[11px] font-bold tracking-wide whitespace-nowrap">
              Business Control System
            </span>
            <span className="text-white/35 text-[9px] font-medium tracking-[0.2em] uppercase mt-0.5">
              From Nexora
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/10 mx-1 shrink-0"/>

        {/* Exchange rate (compact, right-aligned) */}
        <div className="flex-1 flex justify-end">
          <ExchangeRateBar compact />
        </div>

        {/* Cash Drawer button */}
        <button
          onClick={handleOpenDrawer}
          title="Open cash drawer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            bg-white/10 hover:bg-emerald-500/80 text-white/80 hover:text-white
            transition shrink-0">
          <LockOpen size={11}/> Drawer
        </button>

        {/* Return button */}
        <button
          onClick={() => setOpenReturn(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            bg-white/10 hover:bg-white/20 text-white/80 hover:text-white
            transition shrink-0">
          <RotateCcw size={11}/> {t.returnBtn || "Return"}
        </button>

        {/* History button — cashier only */}
        {user?.role === "cashier" && (
          <button
            onClick={() => setOpenHistory(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              bg-white/10 hover:bg-blue-500/80 text-white/80 hover:text-white
              transition shrink-0">
            <History size={11}/> History
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden gap-3 px-3 pb-3">

        {/* ── LEFT: Products ── */}
        <div className="flex-1 flex flex-col overflow-hidden gap-2 min-w-0">

          {/* ── Search bar ── */}
          <div className="shrink-0 flex items-center gap-2
            bg-white dark:bg-[#141414] rounded-2xl px-4 py-2.5
            shadow-[6px_6px_16px_#d1d5db,-6px_-6px_16px_#ffffff]
            dark:shadow-[6px_6px_16px_#050505,-6px_-6px_16px_#1a1a1a]">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchEnter}
              placeholder={t.search}
              className="flex-1 bg-transparent outline-none text-sm placeholder-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full
                  bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400
                  hover:bg-gray-300 dark:hover:bg-white/20 hover:text-gray-700 dark:hover:text-white
                  transition"
              >
                <XIcon size={10}/>
              </button>
            )}
            {/* Live product count */}
            {!loading && (
              <span className="text-[11px] text-gray-400 shrink-0 hidden sm:block tabular-nums">
                {filteredProducts.length} products
                {totalPosPages > 1 && ` · p${safePosPage}/${totalPosPages}`}
              </span>
            )}
            {/* Scan hint */}
            <span className="hidden md:flex items-center gap-1 text-[10px] text-gray-300 dark:text-gray-600
              border border-gray-200 dark:border-white/10 px-1.5 py-0.5 rounded-md font-mono shrink-0">
              ↵ scan
            </span>
            <VoiceButton onResult={text => setSearch(text)} />
          </div>

          {/* ── Category pills ── */}
          <div className="relative shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[{ _id: "all", name: t.all }, ...categories].map(c => (
                <button
                  key={c._id}
                  onClick={() => setSelectedCategory(c._id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold
                    whitespace-nowrap shrink-0 select-none
                    transition-[transform,box-shadow,background-color] duration-75
                    ${selectedCategory === c._id
                      ? "bg-blue-600 text-white shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px]"
                      : "bg-white dark:bg-[#1c1c1c] text-gray-600 dark:text-gray-300 shadow-[0_4px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.35)] active:shadow-none active:translate-y-[4px] hover:bg-gray-50 dark:hover:bg-[#252525]"
                    }`}
                >
                  <span className="text-base leading-none">
                    {c._id === "all" ? "🏪" : getCategoryIcon(c.name)}
                  </span>
                  {c.name}
                </button>
              ))}
            </div>
            {/* Scroll fade on right */}
            <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none
              bg-gradient-to-l from-gray-50 dark:from-[#0b0b0b] to-transparent"/>
          </div>

          {/* ── Products grid ── */}
          <div className="flex-1 overflow-y-auto rounded-2xl" style={dotGrid}>
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm">Loading products…</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 p-1 pb-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
                {paginatedProducts.map(p => {
                  const qty   = cart.find(i => i.productId === p._id)?.quantity || 0;
                  const out   = p.stock === 0;
                  const flash = flashId === p._id;
                  return (
                    <div
                      key={p._id}
                      onClick={() => addProductSafe(p)}
                      className={`
                        ${p.image ? "col-span-2" : "col-span-1"}
                        relative flex flex-col rounded-2xl overflow-visible
                        bg-white dark:bg-[#141414]
                        transition-[transform,box-shadow] duration-75 select-none
                        ${out
                          ? "opacity-60 cursor-not-allowed shadow-[0_4px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.35)]"
                          : "cursor-pointer shadow-[0_6px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_6px_0_0_rgba(0,0,0,0.45)] active:shadow-none active:translate-y-[6px]"
                        }
                        ${flash ? "scale-[1.03]" : ""}
                        ${qty > 0 ? "ring-2 ring-blue-500/60 ring-offset-1 dark:ring-offset-[#0b0b0b]" : ""}
                      `}
                    >
                      <div className="rounded-2xl overflow-hidden flex flex-col flex-1">
                      {/* Out-of-stock overlay */}
                      {out && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center
                          bg-black/40 backdrop-blur-[1px] rounded-2xl">
                          <span className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow">
                            {t.out}
                          </span>
                        </div>
                      )}

                      {/* Cart quantity badge */}
                      {qty > 0 && (
                        <div className="absolute top-2 left-2 z-20 min-w-[22px] h-[22px] px-1.5
                          rounded-full bg-blue-600 text-white text-[10px] font-bold
                          flex items-center justify-center shadow-lg shadow-blue-600/40">
                          {qty}
                        </div>
                      )}

                      {/* Image or initials banner */}
                      {p.image ? (
                        <div className="h-32 relative overflow-hidden">
                          <img
                            src={p.image}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                          {p.category?.name && (
                            <span className="absolute bottom-1.5 right-1.5
                              text-[9px] font-semibold px-1.5 py-0.5 rounded-full
                              bg-black/55 text-white backdrop-blur-sm leading-none">
                              {p.category.name}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="h-20 relative flex items-center justify-center select-none"
                          style={{ background: `linear-gradient(135deg, hsl(${nameHue(p.name)},60%,58%), hsl(${(nameHue(p.name)+40)%360},65%,45%))` }}>
                          <span className="text-4xl drop-shadow">
                            {getCategoryIcon(p.category?.name)}
                          </span>
                          {p.category?.name && (
                            <span className="absolute bottom-1.5 right-1.5
                              text-[9px] font-semibold px-1.5 py-0.5 rounded-full
                              bg-black/30 text-white backdrop-blur-sm leading-none">
                              {p.category.name}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-2.5 flex flex-col gap-1.5">
                        <p className="text-xs font-semibold truncate leading-tight text-gray-800 dark:text-white">
                          {p.name}
                        </p>

                        {/* Price row */}
                        <div className="flex items-center justify-between">
                          {renderPrice(p.price)}
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full
                            ${p.stock <= 5
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                              : "bg-gray-100 dark:bg-white/5 text-gray-400"
                            }`}>
                            {t.stock}: {p.stock}
                          </span>
                        </div>

                        {/* +/- controls */}
                        <div className="flex items-center mt-0.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <button
                              disabled={out}
                              onClick={() => decrease(p._id)}
                              className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-[#252525]
                                text-sm font-bold flex items-center justify-center
                                shadow-[0_3px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_3px_0_0_rgba(0,0,0,0.4)]
                                active:shadow-none active:translate-y-[3px]
                                hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500
                                transition-[transform,box-shadow,background-color] duration-75
                                disabled:opacity-40 select-none"
                            >−</button>
                            <span className="text-xs font-bold w-4 text-center tabular-nums">{qty}</span>
                            <button
                              disabled={out}
                              onClick={() => increase(p._id)}
                              className="w-8 h-8 rounded-xl bg-blue-600 text-white
                                text-sm font-bold flex items-center justify-center
                                shadow-[0_3px_0_0_#1d4ed8]
                                active:shadow-none active:translate-y-[3px]
                                hover:bg-blue-500
                                transition-[transform,box-shadow,background-color] duration-75
                                disabled:opacity-40 select-none"
                            >+</button>
                          </div>
                        </div>
                      </div>
                      </div>
                    </div>
                  );
                })}

                {filteredProducts.length === 0 && !loading && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                      <ShoppingBag size={28} className="opacity-40"/>
                    </div>
                    <p className="text-sm font-medium">No products found</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Try a different search or category</p>
                  </div>
                )}

                {/* Pagination controls */}
                {totalPosPages > 1 && (
                  <div className="col-span-full flex items-center justify-center gap-2 pt-2 pb-1">
                    <button
                      onClick={() => setPosPage(p => Math.max(1, p - 1))}
                      disabled={safePosPage === 1}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/10
                        text-sm font-bold text-gray-600 dark:text-gray-300
                        disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-[#252525] transition"
                    >‹</button>
                    {Array.from({ length: totalPosPages }, (_, i) => i + 1)
                      .filter(n => n === 1 || n === totalPosPages || Math.abs(n - safePosPage) <= 1)
                      .reduce((acc, n, i, arr) => {
                        if (i > 0 && n - arr[i - 1] > 1) acc.push("…");
                        acc.push(n);
                        return acc;
                      }, [])
                      .map((n, i) => n === "…" ? (
                        <span key={`ellipsis-${i}`} className="text-xs text-gray-400 px-1">…</span>
                      ) : (
                        <button key={n} onClick={() => setPosPage(n)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                            n === safePosPage
                              ? "bg-blue-600 text-white shadow-[0_3px_0_0_#1d4ed8]"
                              : "bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252525]"
                          }`}
                        >{n}</button>
                      ))
                    }
                    <button
                      onClick={() => setPosPage(p => Math.min(totalPosPages, p + 1))}
                      disabled={safePosPage === totalPosPages}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/10
                        text-sm font-bold text-gray-600 dark:text-gray-300
                        disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-[#252525] transition"
                    >›</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Drag handle ── */}
        <div
          onMouseDown={handleResizeStart}
          className="shrink-0 w-3 flex items-center justify-center cursor-col-resize group select-none"
          title="Drag to resize cart"
        >
          <div className="w-1 h-16 rounded-full bg-gray-200 dark:bg-white/10
            group-hover:bg-blue-400 dark:group-hover:bg-blue-500
            transition-colors duration-150"/>
        </div>

        {/* ── RIGHT: Cart + Held orders ── */}
        <div style={{ width: cartWidth }} className="shrink-0 flex flex-col gap-2 overflow-hidden">
          <Cart
            cart={cart}
            increase={increase}
            decrease={decrease}
            clearCart={clearCart}
            total={total}
            onCheckout={() => setOpenCheckout(true)}
            onHold={holdCart}
            heldCount={heldCarts.length}
            t={t}
            formatUSD={formatUSD}
            formatLBP={formatLBP}
            toLBP={toLBP}
            toLBPNice={toLBPNice}
            displayCurrency={displayCurrency}
          />

          {/* Held orders panel */}
          {heldCarts.length > 0 && (
            <div className="shrink-0 rounded-2xl bg-white dark:bg-[#141414] border border-amber-200 dark:border-amber-500/20 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-amber-100 dark:border-amber-500/10 flex items-center gap-2 bg-amber-50/60 dark:bg-amber-900/10">
                <PauseCircle size={13} className="text-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">On Hold</span>
                <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold tabular-nums">
                  {heldCarts.length}
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                {heldCarts.map(h => (
                  <div key={h.id} className="flex items-center gap-2 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{h.label}</p>
                      <p className="text-xs text-gray-400 tabular-nums">
                        {h.items.length} item{h.items.length !== 1 ? "s" : ""} · {formatUSD(h.items.reduce((s, i) => s + i.price * i.quantity, 0))}
                      </p>
                    </div>
                    <button
                      onClick={() => resumeCart(h.id)}
                      className="text-xs px-3 py-2 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold shrink-0
                        shadow-[0_3px_0_0_rgba(22,163,74,0.3)] dark:shadow-[0_3px_0_0_rgba(22,163,74,0.2)]
                        active:shadow-none active:translate-y-[3px]
                        transition-[transform,box-shadow] duration-75 select-none"
                    >
                      Resume
                    </button>
                    <button
                      onClick={() => discardHeld(h.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
                        hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
                        shadow-[0_3px_0_0_rgba(0,0,0,0.08)] dark:shadow-[0_3px_0_0_rgba(0,0,0,0.3)]
                        active:shadow-none active:translate-y-[3px]
                        transition-[transform,box-shadow,background-color] duration-75 select-none shrink-0"
                    >
                      <XIcon size={12}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delivery mode banner */}
      {isDeliveryMode && deliveryOrder && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-orange-500 text-white px-4 py-2 flex items-center justify-between text-sm font-semibold">
          <div className="flex items-center gap-2">
            <Truck size={16} />
            <span>Delivery Order: {deliveryOrder.orderNumber} — {deliveryOrder.customer?.name} — {deliveryOrder.customer?.phone}</span>
          </div>
          <button onClick={clearDeliveryMode} className="p-1 hover:bg-orange-600 rounded transition">
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* Incoming order popup */}
      {incomingOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Truck size={24} className="text-orange-500" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 dark:text-white">New Delivery Order!</h2>
                <p className="text-sm text-gray-500">{incomingOrder.orderNumber}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4 space-y-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{incomingOrder.customer?.name}</p>
              {incomingOrder.customer?.address && (
                <p className="text-xs text-gray-500">{incomingOrder.customer.address}</p>
              )}
              <p className="text-sm font-bold text-blue-600 mt-2">${incomingOrder.total?.toFixed(2)}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIncomingOrder(null)}
                className="flex-1 py-2.5 border rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm font-medium">
                Dismiss
              </button>
              <button onClick={() => loadOrderToCart(incomingOrder)}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition text-sm flex items-center justify-center gap-1.5">
                <Truck size={14} /> Load to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {openCheckout && (
        <CheckoutModal
          cart={cart}
          total={total}
          clearCart={clearCart}
          close={() => setOpenCheckout(false)}
          deliveryOrder={isDeliveryMode ? deliveryOrder : null}
          onDeliveryCheckoutDone={() => { setIsDeliveryMode(false); setDeliveryOrder(null); }}
        />
      )}
      {openReturn && (
        <QuickReturn
          onClose={() => setOpenReturn(false)}
          storeName={user?.storeName || "Market POS"}
        />
      )}

      {openHistory && user?.role === "cashier" && (
        <CashierSalesHistory
          userId={user.id || user._id}
          onClose={() => setOpenHistory(false)}
        />
      )}

      {/* ── Online Orders side panel ── */}
      <OnlineOrdersPanel
        storeId={ctxStore?._id}
        userRole={user?.role}
        onLoadToCart={loadOrderToCart}
      />
    </div>
  );
}
