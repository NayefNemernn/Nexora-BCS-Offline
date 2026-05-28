import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Wand2, ChevronDown, CheckCheck,
  RefreshCw, AlertCircle, Package, Tag, DollarSign,
  Hash, Calendar, Layers,
} from "lucide-react";
import VoiceButton from "../common/VoiceButton";
import { parseProductPrompt } from "../../api/product.api";
import { useProductsTranslation } from "../../hooks/useProductsTranslation";

const COLOR_MAP = {
  violet: { bg: "bg-violet-50 dark:bg-violet-900/20",  border: "border-violet-200 dark:border-violet-500/30", text: "text-violet-700 dark:text-violet-300", icon: "text-violet-500" },
  green:  { bg: "bg-green-50 dark:bg-green-900/20",    border: "border-green-200 dark:border-green-500/30",   text: "text-green-700 dark:text-green-300",   icon: "text-green-500"  },
  blue:   { bg: "bg-blue-50 dark:bg-blue-900/20",      border: "border-blue-200 dark:border-blue-500/30",     text: "text-blue-700 dark:text-blue-300",     icon: "text-blue-500"   },
  amber:  { bg: "bg-amber-50 dark:bg-amber-900/20",    border: "border-amber-200 dark:border-amber-500/30",   text: "text-amber-700 dark:text-amber-300",   icon: "text-amber-500"  },
  purple: { bg: "bg-purple-50 dark:bg-purple-900/20",  border: "border-purple-200 dark:border-purple-500/30", text: "text-purple-700 dark:text-purple-300", icon: "text-purple-500" },
  red:    { bg: "bg-red-50 dark:bg-red-900/20",        border: "border-red-200 dark:border-red-500/30",       text: "text-red-700 dark:text-red-300",       icon: "text-red-500"    },
};

// ── Framer variants ───────────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
};
const chipVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.93 },
  show:   { opacity: 1, y: 0,  scale: 1,   transition: { type: "spring", stiffness: 380, damping: 28 } },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatFieldValue(key, value, currency, t) {
  if (value === null || value === undefined || value === "" || (typeof value === "number" && value === 0 && key !== "stock")) return null;
  if (key === "price" || key === "cost") {
    const num = Number(value);
    if (num <= 0) return null;
    return currency === "LBP"
      ? `${num.toLocaleString()} ل.ل`
      : `$${num.toFixed(2)}`;
  }
  if (key === "stock") return `${value} ${t.chipUnits}`;
  return String(value);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AIProductFill({ onFill, categories = [] }) {
  const t = useProductsTranslation();

  const [open,    setOpen]    = useState(false);
  const [prompt,  setPrompt]  = useState("");
  const [parsing, setParsing] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const textareaRef = useRef(null);

  // Field meta built from translation keys
  const FIELD_META = [
    { key: "name",       labelKey: "chipName",     Icon: Package,    color: "violet"  },
    { key: "price",      labelKey: "chipPrice",    Icon: DollarSign, color: "green"   },
    { key: "cost",       labelKey: "chipCost",     Icon: DollarSign, color: "blue"    },
    { key: "stock",      labelKey: "chipStock",    Icon: Hash,       color: "amber"   },
    { key: "category",   labelKey: "chipCategory", Icon: Tag,        color: "purple"  },
    { key: "expiryDate", labelKey: "chipExpiry",   Icon: Calendar,   color: "red"     },
  ];

  // Focus textarea when panel opens
  useEffect(() => {
    if (open && !result && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 250);
    }
  }, [open]);

  const analyze = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || parsing) return;
    setParsing(true);
    setResult(null);
    setError(null);
    try {
      const categoryNames = categories.map(c => c.name);
      const data = await parseProductPrompt(trimmed, categoryNames);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || t.failedAnalyze);
    } finally {
      setParsing(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") analyze();
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setPrompt("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const apply = () => {
    if (!result) return;
    onFill(result);
    setTimeout(() => {
      setResult(null);
      setPrompt("");
      setOpen(false);
    }, 120);
  };

  const chips = result
    ? FIELD_META
        .map(m => ({ ...m, label: t[m.labelKey], display: formatFieldValue(m.key, result[m.key], result.priceCurrency, t) }))
        .filter(m => m.display !== null)
    : [];

  const aiPlaceholder = `${t.aiPlaceholderLine1}\n\n• ${t.aiPlaceholderEx1}\n• ${t.aiPlaceholderEx2}`;

  return (
    <div className={`rounded-2xl border transition-colors duration-300 overflow-hidden
      ${open
        ? "border-violet-200 dark:border-violet-500/40"
        : "border-violet-100 dark:border-violet-500/20"
      }
      bg-gradient-to-br from-violet-50/80 via-blue-50/40 to-transparent
      dark:from-violet-950/25 dark:via-blue-950/10 dark:to-transparent`}
    >

      {/* ── Header / toggle ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left group"
      >
        <div className="relative w-8 h-8 rounded-xl shrink-0 overflow-hidden
          bg-gradient-to-br from-violet-500 to-blue-500
          shadow-[0_3px_10px_rgba(139,92,246,0.45)]
          group-hover:shadow-[0_3px_14px_rgba(139,92,246,0.6)] transition-shadow">
          <Sparkles size={15} className="text-white absolute inset-0 m-auto"/>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-violet-900 dark:text-violet-100">
              {t.aiProductFill}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full
              bg-violet-100 dark:bg-violet-900/50
              text-violet-600 dark:text-violet-400 font-semibold tracking-wide">
              <Layers size={8}/> AI
            </span>
          </div>
          {!open && (
            <p className="text-xs text-violet-400 dark:text-violet-500 mt-0.5 truncate">
              {t.aiSubtitle}
            </p>
          )}
        </div>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          className="shrink-0 text-violet-400"
        >
          <ChevronDown size={16}/>
        </motion.div>
      </button>

      {/* ── Body ── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-4 pt-1 space-y-3">

              <div className="h-px bg-gradient-to-r from-violet-200 via-blue-200 to-transparent dark:from-violet-500/30 dark:via-blue-500/20 dark:to-transparent"/>

              {/* ── Prompt input ── */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  rows={3}
                  value={prompt}
                  onChange={e => { setPrompt(e.target.value); if (error) setError(null); if (result) setResult(null); }}
                  onKeyDown={handleKeyDown}
                  disabled={parsing}
                  placeholder={aiPlaceholder}
                  className="w-full px-4 py-3 pr-14 rounded-xl text-sm resize-none outline-none transition-all
                    bg-white dark:bg-[#0c0c0c]
                    border border-violet-200 dark:border-violet-500/30
                    text-gray-800 dark:text-gray-100
                    placeholder-gray-400 dark:placeholder-gray-600
                    focus:border-violet-400 dark:focus:border-violet-500
                    focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="absolute bottom-2.5 right-2.5">
                  <VoiceButton
                    onResult={text => { setPrompt(text); setError(null); setResult(null); }}
                    lang="auto"
                    continuous
                  />
                </div>
                {prompt.trim() && !parsing && !result && (
                  <p className="absolute bottom-2.5 left-3 text-[10px] text-violet-300 dark:text-violet-600 pointer-events-none select-none">
                    {t.ctrlEnterHint}
                  </p>
                )}
              </div>

              {/* ── Analyze button ── */}
              <AnimatePresence>
                {!result && (
                  <motion.button
                    key="analyze-btn"
                    type="button"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    onClick={analyze}
                    disabled={parsing || !prompt.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                      text-sm font-semibold text-white transition-all
                      bg-gradient-to-r from-violet-600 to-blue-600
                      hover:from-violet-500 hover:to-blue-500
                      shadow-[0_4px_14px_rgba(139,92,246,0.35)]
                      hover:shadow-[0_4px_22px_rgba(139,92,246,0.55)]
                      disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none
                      active:scale-[0.98]"
                  >
                    {parsing ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
                          className="inline-flex"
                        >
                          <Sparkles size={15}/>
                        </motion.span>
                        <span>{t.analyzing}</span>
                      </>
                    ) : (
                      <>
                        <Wand2 size={15}/>
                        <span>{t.fillWithAI}</span>
                      </>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>

              {/* ── Error ── */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-2.5 px-4 py-3 rounded-xl
                      bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30"
                  >
                    <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5"/>
                    <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Result ── */}
              <AnimatePresence>
                {result && chips.length > 0 && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-2 gap-2"
                    >
                      {chips.map(({ key, label, Icon, color, display }) => {
                        const c = COLOR_MAP[color];
                        return (
                          <motion.div
                            key={key}
                            variants={chipVariants}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${c.bg} ${c.border}`}
                          >
                            <div className={`shrink-0 ${c.icon}`}><Icon size={13}/></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-0.5">{label}</p>
                              <p className={`text-xs font-bold truncate ${c.text}`}>{display}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>

                    {result.priceCurrency === "LBP" && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[11px] text-amber-600 dark:text-amber-400 text-center"
                      >
                        {t.lbpNotice}
                      </motion.p>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: chips.length * 0.07 + 0.05 }}
                      className="flex gap-2 pt-1"
                    >
                      <button
                        type="button"
                        onClick={reset}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition
                          bg-white dark:bg-white/8 border border-gray-200 dark:border-white/10
                          text-gray-600 dark:text-gray-400
                          hover:bg-gray-50 dark:hover:bg-white/15"
                      >
                        <RefreshCw size={12}/> {t.tryAgain}
                      </button>

                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={apply}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                          text-sm font-bold text-white transition-all
                          bg-gradient-to-r from-violet-600 to-blue-600
                          hover:from-violet-500 hover:to-blue-500
                          shadow-[0_4px_14px_rgba(139,92,246,0.4)]
                          hover:shadow-[0_4px_20px_rgba(139,92,246,0.6)]"
                      >
                        <CheckCheck size={15}/>
                        {t.applyToForm}
                      </motion.button>
                    </motion.div>

                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
