import React, { useState } from "react";
import { useCurrency } from "../context/CurrencyContext";
import { DollarSign, RefreshCw } from "lucide-react";

export default function ExchangeRateBar({ compact = false }) {
  const { exchangeRate, updateRate, displayCurrency, updateDisplayCurrency } = useCurrency();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(exchangeRate);

  const save = () => { updateRate(draft); setEditing(false); };

  /* ── Compact variant (used in the POS header) ── */
  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <span className="text-white/50 text-[11px]">$1 =</span>
            <input
              autoFocus type="number" value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === "Enter" && save()}
              className="w-20 px-2 py-0.5 rounded-lg text-xs outline-none
                bg-white/10 border border-white/20 text-white"
            />
            <span className="text-white/50 text-[11px]">ل.ل</span>
            <button onClick={save}
              className="px-2 py-0.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-[11px] font-semibold transition">
              ✓
            </button>
            <button onClick={() => setEditing(false)}
              className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-[11px] transition">
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setDraft(exchangeRate); setEditing(true); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg
              bg-white/10 hover:bg-white/20 transition group"
          >
            <DollarSign size={10} className="text-blue-300"/>
            <span className="text-[11px] text-white/50">$1 =</span>
            <span className="text-[11px] font-bold text-white">{parseInt(exchangeRate).toLocaleString()}</span>
            <span className="text-[11px] text-white/50">ل.ل</span>
            <RefreshCw size={9} className="text-blue-300 ml-0.5 group-hover:rotate-180 transition-transform duration-300"/>
          </button>
        )}

        {/* Currency display toggle */}
        <div className="flex gap-0.5 p-0.5 bg-white/10 rounded-lg">
          {[{v:"both",l:"Both"},{v:"usd",l:"USD"},{v:"lbp",l:"LBP"}].map(({v,l}) => (
            <button key={v} onClick={() => updateDisplayCurrency(v)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition ${
                displayCurrency === v
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-white/50 hover:text-white/80"
              }`}
            >{l}</button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="
      relative z-10
      flex flex-wrap items-center gap-3
      px-4 py-2
      rounded-2xl
      bg-amber-50 dark:bg-amber-950/30
      border border-amber-200 dark:border-amber-800/50
      text-sm
    ">

      {/* Icon + Label */}
      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
        <DollarSign size={14} />
        <span>Exchange Rate</span>
      </div>

      {/* Rate input */}
      {editing ? (
        <div className="flex items-center gap-2">
          <span className="text-amber-600 dark:text-amber-400 text-xs">$1 =</span>
          <input
            autoFocus
            type="number"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="
              w-28 px-2 py-1 rounded-lg text-sm outline-none
              bg-white dark:bg-[#1a1a1a]
              border border-amber-300 dark:border-amber-700
              text-gray-900 dark:text-white
            "
          />
          <span className="text-amber-600 dark:text-amber-400 text-xs">ل.ل</span>
          <button
            onClick={save}
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-[#2a2a2a] text-xs transition"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setDraft(exchangeRate); setEditing(true); }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-[#1a1a1a] border border-amber-200 dark:border-amber-800 hover:border-amber-400 transition text-gray-700 dark:text-gray-300"
        >
          <span className="text-xs text-amber-500">$1 =</span>
          <span className="font-semibold">{parseInt(exchangeRate).toLocaleString()}</span>
          <span className="text-xs text-amber-500">ل.ل</span>
          <RefreshCw size={11} className="text-amber-400 ml-1" />
        </button>
      )}

      {/* Display preference */}
      <div className="flex items-center gap-1 ml-auto">
        <span className="text-amber-600 dark:text-amber-400 text-xs mr-1">Show:</span>
        {[
          { value: "both", label: "Both" },
          { value: "usd",  label: "USD" },
          { value: "lbp",  label: "LBP" },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => updateDisplayCurrency(opt.value)}
            className={`
              px-2.5 py-1 rounded-lg text-xs font-medium transition
              ${displayCurrency === opt.value
                ? "bg-amber-500 text-white"
                : "bg-white dark:bg-[#1a1a1a] border border-amber-200 dark:border-amber-800 text-gray-600 dark:text-gray-400 hover:border-amber-400"
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>

    </div>
 
);
}