import React, { useState, useEffect, useRef } from "react";
import { useProductsTranslation } from "../../hooks/useProductsTranslation";
import { useCurrency } from "../../context/CurrencyContext";
import VoiceButton from "../common/VoiceButton";
import { Calculator, Calendar } from "lucide-react";

// ── Brand logo / product image auto-detect ───────────────────────────────────
async function findBrandLogo(name) {
  // Strip sizes/units in English and Arabic
  const brand = name
    .replace(/\b\d+\s*(ml|l|g|kg|oz|lb|cl|pack|pcs|x\s*\d+)\b/gi, "")
    .replace(/[٠-٩\d]+\s*(مل|لتر|غرام|كغ|جرام|علبة|حبة)/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(" ");
  if (brand.length < 2) return null;

  const isArabic = /[؀-ۿ]/.test(brand);
  // Arabic first for Arabic names; English first otherwise
  const langs = isArabic ? ["ar", "en"] : ["en", "ar"];

  for (const lang of langs) {
    const abort = new AbortController();
    const tid = setTimeout(() => abort.abort(), 5000);
    try {
      // Use MediaWiki Action API: fuzzy search + image in one request, CORS via origin=*
      const params = new URLSearchParams({
        action:      "query",
        generator:   "search",
        gsrsearch:   brand,
        gsrlimit:    "1",
        prop:        "pageimages",
        piprop:      "thumbnail",
        pithumbsize: "300",
        format:      "json",
        origin:      "*",
      });
      const res = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?${params}`,
        { signal: abort.signal }
      );
      clearTimeout(tid);
      if (res.ok) {
        const data = await res.json();
        const pages = data.query?.pages;
        if (pages) {
          const img = Object.values(pages)[0]?.thumbnail?.source;
          if (img) return img;
        }
      }
    } catch {
      clearTimeout(tid);
    }
  }

  return null;
}

export default function ProductForm({
  form,
  setForm,
  barcode,
  setBarcode,
  categories,
  onCreate,
  preview,
  setPreview,
  setImage,
  ImageDropzone
}) {
  const t = useProductsTranslation();
  const { exchangeRate, formatLBP, toLBP, toLBPNice, formatUSD } = useCurrency();

  // Shared currency for BOTH price and cost — one toggle controls both
  const [priceCurrency, setPriceCurrency] = useState("lbp"); // "usd" | "lbp"
  const [priceInput,    setPriceInput]    = useState(form.price || "");
  const [costInput,     setCostInput]     = useState(form.cost || "");
  const [expiryDisplay, setExpiryDisplay] = useState(
    form.expiryDate ? (() => { const d = form.expiryDate.split("-"); return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : ""; })() : ""
  );

  const handleExpiryInput = (raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let display = digits;
    if (digits.length > 2) display = digits.slice(0, 2) + "/" + digits.slice(2);
    if (digits.length > 4) display = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
    setExpiryDisplay(display);
    if (digits.length === 8)
      setForm({ ...form, expiryDate: `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}` });
    else if (digits.length === 0)
      setForm({ ...form, expiryDate: "" });
  };

  // Reset expiry display when parent clears the form
  useEffect(() => { if (!form.expiryDate) setExpiryDisplay(""); }, [form.expiryDate]);

  // Sync price display when form.price is set externally (e.g. AI fill or form reset).
  // We track whether the last form.price change came from the user typing so we
  // never accidentally reset priceCurrency back to "usd" mid-typing.
  const prevFormPrice    = useRef(form.price);
  const skipEffect       = useRef(false);
  const expiryPickerRef  = useRef(null);

  // ── Brand logo auto-detect ───────────────────────────────────────────────
  const [logoSearching, setLogoSearching] = useState(false);
  const logoTimerRef = useRef(null);
  const previewRef   = useRef(preview);
  useEffect(() => { previewRef.current = preview; }, [preview]);

  useEffect(() => {
    const name = form.name?.trim() || "";
    clearTimeout(logoTimerRef.current);
    if (name.length < 3) return;
    logoTimerRef.current = setTimeout(async () => {
      if (previewRef.current) return; // don't override an existing image
      setLogoSearching(true);
      try {
        const url = await findBrandLogo(name);
        if (!url || previewRef.current) return;
        try {
          const res = await fetch(url, { mode: "cors" });
          if (res.ok) {
            const blob = await res.blob();
            setImage(new File([blob], "brand-logo.png", { type: "image/png" }));
            setPreview(URL.createObjectURL(blob));
          } else {
            setPreview(url);
          }
        } catch {
          setPreview(url); // preview-only fallback if CORS blocks the blob fetch
        }
      } finally {
        setLogoSearching(false);
      }
    }, 800);
    return () => clearTimeout(logoTimerRef.current);
  }, [form.name]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (skipEffect.current) {
      // This change was caused by handlePriceChange — just advance the tracker.
      skipEffect.current = false;
      prevFormPrice.current = form.price;
      return;
    }
    // External change (AI fill, form reset, etc.) — sync the visible input.
    if (form.price !== prevFormPrice.current) {
      if (form.price !== "") {
        setPriceInput(String(form.price));
        setPriceCurrency("usd"); // AI always sends USD
      } else {
        setPriceInput("");
      }
      prevFormPrice.current = form.price;
    }
  }, [form.price]);

  // ── Box unit-cost calculator ─────────────────────────────────────────────
  const [showCalc,  setShowCalc]  = useState(false);
  const [boxCost,   setBoxCost]   = useState("");
  const [boxUnits,  setBoxUnits]  = useState("");

  const calcUnitCost = () => {
    const c = parseFloat(boxCost);
    const u = parseFloat(boxUnits);
    if (!c || !u || u <= 0) return null;
    // Result is in the active display currency (same units the user typed)
    return priceCurrency === "lbp"
      ? Math.round(c / u)
      : +(c / u).toFixed(2);
  };

  const applyCalcCost = () => {
    const unit = calcUnitCost();
    if (!unit) return;
    // Pass display-currency value directly — handleCostChange converts to USD
    handleCostChange(unit.toString());
    setShowCalc(false);
    setBoxCost(""); setBoxUnits("");
  };

  // Sync cost input when reset externally (form cleared, AI fill, etc.)
  // Sync cost input on external reset (form cleared, AI fill, etc.)
  const prevFormCost = useRef(form.cost);
  const skipCostEffect = useRef(false);
  useEffect(() => {
    if (skipCostEffect.current) { skipCostEffect.current = false; prevFormCost.current = form.cost; return; }
    if (form.cost !== prevFormCost.current) {
      setCostInput(form.cost !== "" ? String(form.cost) : "");
      prevFormCost.current = form.cost;
    }
  }, [form.cost]);

  // When price input changes, convert and store USD in form (backend always gets USD)
  const handlePriceChange = (raw) => {
    setPriceInput(raw);
    skipEffect.current = true;
    const num = parseFloat(raw);
    if (isNaN(num) || raw === "") { setForm({ ...form, price: "" }); return; }
    setForm({ ...form, price: priceCurrency === "lbp" ? String((num * 1000) / exchangeRate) : raw });
  };

  // When currency toggle switches, convert BOTH price and cost displays
  const switchCurrency = (to) => {
    if (to === priceCurrency) return;
    const p = parseFloat(priceInput);
    const c = parseFloat(costInput);
    if (to === "lbp") {
      if (!isNaN(p) && p > 0) setPriceInput(Math.round((p * exchangeRate) / 1000).toString());
      if (!isNaN(c) && c > 0) setCostInput(Math.round((c * exchangeRate) / 1000).toString());
    } else {
      const toUSD2 = (n) => String((n * 1000) / exchangeRate);
      if (!isNaN(p) && p > 0) setPriceInput(toUSD2(p));
      if (!isNaN(c) && c > 0) setCostInput(toUSD2(c));
    }
    setPriceCurrency(to);
  };

  // Cost change handler — uses same priceCurrency (shared toggle)
  const handleCostChange = (raw) => {
    setCostInput(raw);
    skipCostEffect.current = true;
    const num = parseFloat(raw);
    if (isNaN(num) || raw === "") { setForm({ ...form, cost: "" }); return; }
    setForm({ ...form, cost: priceCurrency === "lbp" ? String((num * 1000) / exchangeRate) : raw });
  };

  // Computed preview of the other currency
  const otherCurrencyPreview = () => {
    const num = parseFloat(priceInput);
    if (isNaN(num) || num <= 0) return null;
    if (priceCurrency === "usd") {
      return `≈ ${formatLBP(toLBPNice(num))}`;
    } else {
      const fullLBP = num * 1000;
      return `${formatLBP(fullLBP)}  ≈  ${formatUSD(fullLBP / exchangeRate)}`;
    }
  };

  const inputClass = `
    w-full px-4 py-3 rounded-2xl outline-none text-sm
    bg-gray-100 dark:bg-[#0f0f0f]
    text-gray-900 dark:text-white
    placeholder-gray-400 dark:placeholder-gray-600
    shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff]
    dark:shadow-[inset_4px_4px_8px_#050505,inset_-4px_-4px_8px_#1a1a1a]
    transition-all duration-150
    focus:shadow-[inset_4px_4px_8px_#bfdbfe,inset_-4px_-4px_8px_#ffffff]
    dark:focus:shadow-[inset_4px_4px_8px_#1e3a5f,inset_-4px_-4px_8px_#1a1a1a]
  `;

  const labelClass = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide";

  const fields = [
    {
      key: "name",
      label: t.productName || "Product Name",
      placeholder: "e.g. Coca-Cola 330ml",
      type: "text",
      value: form.name,
      onChange: (v) => setForm({ ...form, name: v }),
      voiceFilter: (t) => t,
    },
    {
      key: "stock",
      label: t.stock || "Stock",
      placeholder: "0",
      type: "number",
      value: form.stock,
      onChange: (v) => setForm({ ...form, stock: v }),
      voiceFilter: (t) => t.replace(/[^0-9]/g, ""),
    },
    {
      key: "category",
      label: t.category || "Category",
      placeholder: "e.g. Beverages",
      type: "text",
      list: "categories",
      value: form.category,
      onChange: (v) => setForm({ ...form, category: v }),
      voiceFilter: (t) => t,
    },
    {
      key: "barcode",
      label: t.barcode || "Barcode",
      placeholder: "Scan or type barcode",
      type: "text",
      value: barcode,
      onChange: (v) => setBarcode(v),
      voiceFilter: (t) => t.replace(/[^0-9]/g, ""),
    },
  ];

  const preview_val = otherCurrencyPreview();

  return (
    <div className="
      bg-gray-100 dark:bg-[#0b0b0b]
      rounded-3xl p-6 space-y-6
      shadow-[10px_10px_25px_#d1d5db,-10px_-10px_25px_#ffffff]
      dark:shadow-[10px_10px_25px_#050505,-10px_-10px_25px_#1f1f1f]
    ">

      {/* TITLE */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 rounded-full bg-green-500" />
        <h2 className="font-bold text-base tracking-tight">
          {t.addNewProduct || "Add New Product"}
        </h2>
      </div>

      {/* FIELDS GRID — all equal columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* === PRICE FIELD — special with USD/LBP toggle === */}
        <div className="sm:col-span-2 xl:col-span-1">
          <label className={labelClass}>
            {t.price || "Price"}
          </label>

          {/* Currency toggle */}
          <div className="flex gap-1 mb-2">
            <button
              type="button"
              onClick={() => switchCurrency("usd")}
              className={`
                flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all
                ${priceCurrency === "usd"
                  ? "bg-green-500 text-white shadow-[0_2px_8px_rgba(34,197,94,0.4)]"
                  : "bg-gray-200 dark:bg-[#1c1c1c] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }
              `}
            >
              $ USD
            </button>
            <button
              type="button"
              onClick={() => switchCurrency("lbp")}
              className={`
                flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all
                ${priceCurrency === "lbp"
                  ? "bg-amber-500 text-white shadow-[0_2px_8px_rgba(245,158,11,0.4)]"
                  : "bg-gray-200 dark:bg-[#1c1c1c] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }
              `}
            >
              ل.ل LBP
            </button>
          </div>

          {/* Price input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className={`
                absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none
                ${priceCurrency === "usd" ? "text-green-500" : "text-amber-500"}
              `}>
                {priceCurrency === "usd" ? "$" : "ل"}
              </span>
              <input
                type="number"
                placeholder={priceCurrency === "usd" ? "0.00" : "0"}
                value={priceInput}
                onChange={(e) => handlePriceChange(e.target.value)}
                className={inputClass + (priceCurrency === "lbp" ? " pl-7 pr-12" : " pl-7")}
              />
              {priceCurrency === "lbp" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-xs pointer-events-none select-none">
                  ,000
                </span>
              )}
            </div>
            <VoiceButton
              onResult={(text) => {
                const num = text.replace(/[^0-9.]/g, "");
                if (num) handlePriceChange(num);
              }}
              color="green"
            />
          </div>

          {/* Live conversion preview */}
          {preview_val && (
            <p className={`text-xs mt-1.5 px-1 font-medium ${priceCurrency === "usd" ? "text-amber-500" : "text-green-500"}`}>
              {preview_val}
            </p>
          )}
        </div>

        {/* === COST FIELD — follows same currency as price (no separate toggle) === */}
        <div className="sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelClass + " mb-0"}>{t.cost || "Cost Price"}</label>
            <button
              type="button"
              onClick={() => setShowCalc(v => !v)}
              title="Box / unit calculator"
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold transition
                ${showCalc
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-white/10 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
            >
              <Calculator size={11}/> Calc
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none ${priceCurrency === "usd" ? "text-green-500" : "text-amber-500"}`}>
                {priceCurrency === "usd" ? "$" : "ل"}
              </span>
              <input
                type="number"
                placeholder={priceCurrency === "usd" ? "0.00" : "0"}
                value={costInput}
                onChange={(e) => handleCostChange(e.target.value)}
                className={inputClass + (priceCurrency === "lbp" ? " pl-7 pr-12" : " pl-7")}
              />
              {priceCurrency === "lbp" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-xs pointer-events-none select-none">,000</span>
              )}
            </div>
            <VoiceButton onResult={(text) => { const n = text.replace(/[^0-9.]/g,""); if(n) handleCostChange(n); }} color="green"/>
          </div>
          {costInput && parseFloat(costInput) > 0 && (
            <p className={`text-xs mt-1.5 px-1 font-medium ${priceCurrency === "usd" ? "text-amber-500" : "text-green-500"}`}>
              {priceCurrency === "usd"
                ? `≈ ${formatLBP(toLBPNice(parseFloat(costInput)))}`
                : `${formatLBP(parseFloat(costInput) * 1000)} ≈ $${((parseFloat(costInput) * 1000) / exchangeRate).toFixed(2)}`
              }
            </p>
          )}

          {/* ── Box calculator ── */}
          {showCalc && (
            <div className="mt-2 p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 space-y-2">
              <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Box Calculator</p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 mb-1">
                    Box total cost ({priceCurrency === "lbp" ? "ل.ل ,000" : "$"})
                  </p>
                  <div className="relative">
                    <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none ${priceCurrency === "lbp" ? "text-amber-500" : "text-green-500"}`}>
                      {priceCurrency === "lbp" ? "ل" : "$"}
                    </span>
                    <input
                      type="number" min="0" step={priceCurrency === "lbp" ? "1" : "0.01"}
                      placeholder={priceCurrency === "lbp" ? "18" : "18.00"}
                      value={boxCost}
                      onChange={e => setBoxCost(e.target.value)}
                      className={`w-full pl-7 py-2 rounded-xl text-sm bg-white dark:bg-[#1c1c1c] border border-blue-200 dark:border-blue-500/30 outline-none focus:border-blue-400 transition${priceCurrency === "lbp" ? " pr-10" : ""}`}
                    />
                    {priceCurrency === "lbp" && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-xs pointer-events-none">,000</span>
                    )}
                  </div>
                </div>
                <span className="text-gray-400 font-bold text-lg pt-4">÷</span>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 mb-1">Units per box</p>
                  <input
                    type="number" min="1" step="1" placeholder="24"
                    value={boxUnits}
                    onChange={e => setBoxUnits(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-white dark:bg-[#1c1c1c] border border-blue-200 dark:border-blue-500/30 outline-none focus:border-blue-400 transition"
                  />
                </div>
              </div>
              {calcUnitCost() !== null && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {priceCurrency === "lbp"
                      ? `= ${calcUnitCost().toLocaleString()},000 ل.ل / unit`
                      : `= $${calcUnitCost()} / unit`
                    }
                  </span>
                  <button
                    type="button"
                    onClick={applyCalcCost}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* === ALL OTHER FIELDS === */}
        {fields.map((field) => (
          <div key={field.key}>
            <label className={labelClass}>{field.label}</label>
            <div className="flex items-center gap-2">
              <input
                type={field.type}
                list={field.list}
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className={inputClass}
              />
              <VoiceButton
                onResult={(text) => {
                  const filtered = field.voiceFilter(text);
                  if (filtered) field.onChange(filtered);
                }}
                color={field.type === "text" ? "blue" : "green"}
              />
            </div>
          </div>
        ))}

        {/* === EXPIRY DATE — optional === */}
        <div>
          <label className={labelClass}>
            {t.expiryDate || "Expiry Date"} <span className="normal-case text-gray-300 dark:text-gray-600 font-normal">{t.optional || "(optional)"}</span>
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/yyyy"
              maxLength={10}
              value={expiryDisplay}
              onChange={e => handleExpiryInput(e.target.value)}
              className={inputClass + " pr-9"}
            />
            <button
              type="button"
              onClick={() => expiryPickerRef.current?.showPicker?.()}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition"
            >
              <Calendar size={15}/>
            </button>
            <input
              type="date"
              ref={expiryPickerRef}
              tabIndex={-1}
              value={form.expiryDate || ""}
              onChange={e => {
                const iso = e.target.value;
                if (iso) {
                  const d = iso.split("-");
                  setExpiryDisplay(`${d[2]}/${d[1]}/${d[0]}`);
                  setForm({ ...form, expiryDate: iso });
                } else {
                  setExpiryDisplay("");
                  setForm({ ...form, expiryDate: "" });
                }
              }}
              className="absolute inset-0 opacity-0 pointer-events-none w-0"/>
          </div>
          {form.expiryDate && (() => {
            const days  = Math.ceil((new Date(form.expiryDate) - new Date()) / 86400000);
            const color = days <= 7 ? "text-red-500" : days <= 30 ? "text-amber-500" : "text-green-500";
            return <p className={`text-xs mt-1 font-medium ${color}`}>{t.expiresIn || "Expires in"} {days} {t.days || "days"}</p>;
          })()}
        </div>

        {/* === EXPIRY ALERT THRESHOLD === */}
        <div>
          <label className={labelClass}>
            Alert before expiry
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max="3650"
              placeholder="180"
              value={form.expiryAlertDays ?? 180}
              onChange={e => setForm({ ...form, expiryAlertDays: e.target.value === "" ? "" : Number(e.target.value) })}
              className={inputClass}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">days</span>
          </div>
          <p className="text-xs mt-1 text-gray-400">
            {(() => { const d = Number(form.expiryAlertDays) || 180; return `Show in reports ${d} days before expiry${d >= 30 && d % 30 === 0 ? ` (${d / 30} months)` : ""}`; })()}
          </p>
        </div>

      </div>

      {/* Logo search indicator */}
      {logoSearching && (
        <div className="flex items-center gap-2 -mt-2">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-blue-400 animate-spin"/>
          <span className="text-xs text-gray-400 dark:text-gray-500">Looking for brand logo…</span>
        </div>
      )}

      {/* CATEGORY DATALIST */}
      <datalist id="categories">
        {categories.map(c => (
          <option key={c._id} value={c.name} />
        ))}
      </datalist>

      {/* IMAGE DROPZONE */}
      <ImageDropzone
        preview={preview}
        setPreview={setPreview}
        setImage={setImage}
      />

      {/* IMAGE PREVIEW */}
      {preview && (
        <div className="
          relative h-44 rounded-2xl overflow-hidden
          bg-gray-100 dark:bg-[#141414]
          shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff]
          dark:shadow-[inset_4px_4px_8px_#050505,inset_-4px_-4px_8px_#1a1a1a]
          flex items-center justify-center
        ">
          <img
            src={preview}
            className="h-40 object-contain rounded-xl"
            onError={() => { setPreview(""); setImage(null); }}
          />
          <button
            type="button"
            onClick={() => { setPreview(""); setImage(null); }}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center
              rounded-full bg-red-500 hover:bg-red-600 text-white shadow-md transition"
            title="Remove image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* ADD BUTTON */}
      <div className="flex justify-end">
        <button
          onClick={onCreate}
          className="
            flex items-center gap-2
            px-7 py-2.5 rounded-full
            bg-green-600 hover:bg-green-700
            text-white font-semibold text-sm
            shadow-[0_4px_14px_rgba(34,197,94,0.35)]
            hover:shadow-[0_4px_20px_rgba(34,197,94,0.5)]
            transition-all duration-200
            hover:scale-[1.03]
          "
        >
          <span className="text-lg leading-none">+</span>
          {t.addProduct || "Add Product"}
        </button>
      </div>

    </div>
  );
}