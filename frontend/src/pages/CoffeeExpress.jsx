import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { getCoffeeExpressStatus, unlockCoffeeExpress } from "../api/coffeeExpress.api";
import { getAllProducts, createProduct, updateProduct, deleteProduct } from "../api/product.api";
import { coffeeBeansStyle } from "../lib/coffeeTheme";
import toast from "react-hot-toast";
import { Coffee, Lock, Plus, Pencil, Trash2, X, Save, ImagePlus, Loader2, Search } from "lucide-react";

const SIZE_PRESETS     = ["Small", "Medium", "Large"];
const CATEGORY_PRESETS = ["Hot", "Cold", "Bakery"];
const EMPTY_SIZE  = () => ({ label: "", price: "" });
const EMPTY_FORM  = { name: "", category: "" };

// Lazily import the bg-removal model only when actually needed (it's a heavy WASM bundle)
async function stripBackground(file) {
  const { removeBackground } = await import("@imgly/background-removal");
  return removeBackground(file, { model: "small", output: { format: "image/png", quality: 1 } });
}

export default function CoffeeExpress() {
  const { store, updateStore } = useAuth();
  const { formatUSD } = useCurrency();

  const [enabled,    setEnabled]    = useState(!!store?.coffeeExpressEnabled);
  const [checking,   setChecking]   = useState(true);
  const [code,       setCode]       = useState("");
  const [unlocking,  setUnlocking]  = useState(false);

  const [cups,        setCups]        = useState([]);
  const [loadingCups, setLoadingCups] = useState(false);

  const [form,    setForm]    = useState(EMPTY_FORM);
  const [sizes,   setSizes]   = useState([EMPTY_SIZE()]);
  const [image,   setImage]   = useState(null);
  const [preview, setPreview] = useState("");
  const [removingBg, setRemovingBg] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const [editingGroup, setEditingGroup] = useState(null); // name of group being edited
  const [editForm,     setEditForm]     = useState(EMPTY_FORM);
  const [editImage,    setEditImage]    = useState(null);
  const [editPreview,  setEditPreview]  = useState("");
  const [editRemovingBg, setEditRemovingBg] = useState(false);

  const [cupSearch, setCupSearch] = useState("");

  const loadCups = () => {
    setLoadingCups(true);
    getAllProducts()
      .then(all => setCups(all.filter(p => p.isCoffeeCup)))
      .catch(() => {})
      .finally(() => setLoadingCups(false));
  };

  useEffect(() => {
    getCoffeeExpressStatus()
      .then(r => { setEnabled(r.enabled); if (r.enabled) loadCups(); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  // Group cups sharing the same name — each group can have one or several sizes,
  // where every size is its own real Product (own stock/price), so the existing
  // cart/checkout/stock pipeline keeps working untouched.
  const groups = useMemo(() => {
    const byName = new Map();
    for (const c of cups) {
      if (!byName.has(c.name)) byName.set(c.name, { name: c.name, image: c.image, category: c.coffeeCategory || "", items: [] });
      const g = byName.get(c.name);
      // A size added later (e.g. via "+ Medium") has no photo/category of its own — don't let it
      // blank out one a sibling size already has, since createdAt-desc sort puts it first.
      if (!g.image && c.image) g.image = c.image;
      if (!g.category && c.coffeeCategory) g.category = c.coffeeCategory;
      g.items.push(c);
    }
    return [...byName.values()];
  }, [cups]);

  const visibleGroups = useMemo(() => {
    const q = cupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q));
  }, [groups, cupSearch]);

  const handleUnlock = async () => {
    if (!code.trim()) return toast.error("Enter the coffee code.");
    setUnlocking(true);
    try {
      const r = await unlockCoffeeExpress(code.trim());
      toast.success(r.message || "Coffee Express unlocked!");
      setEnabled(true);
      updateStore({ coffeeExpressEnabled: true });
      loadCups();
    } catch (e) {
      toast.error(e.response?.data?.message || "Invalid code.");
    } finally {
      setUnlocking(false);
    }
  };

  // Auto-strip the background from any uploaded cup photo so it floats cleanly on the rail
  const handleImagePick = async (file, setImg, setPrev, setBusy) => {
    if (!file) { setImg(null); setPrev(""); return; }
    setBusy(true);
    try {
      const cleaned = await stripBackground(file);
      setImg(cleaned);
      setPrev(URL.createObjectURL(cleaned));
    } catch {
      // Fall back to the original photo if background removal fails
      setImg(file);
      setPrev(URL.createObjectURL(file));
    } finally {
      setBusy(false);
    }
  };

  const updateSizeRow = (idx, field, val) => setSizes(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  const addSizeRow    = (label = "") => setSizes(prev => [...prev, { label, price: "" }]);
  const removeSizeRow = (idx) => setSizes(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

  const handleAddCup = async () => {
    if (!form.name.trim()) return toast.error("Cup name is required.");
    const validSizes = sizes.filter(s => s.price !== "" && Number(s.price) > 0);
    if (validSizes.length === 0) return toast.error("Enter a price for at least one size.");
    setSaving(true);
    try {
      for (const s of validSizes) {
        const data = new FormData();
        data.append("name", form.name.trim());
        data.append("price", s.price);
        data.append("isCoffeeCup", "true");
        data.append("cupSize", s.label.trim());
        data.append("coffeeCategory", form.category.trim());
        if (image) data.append("image", image, "cup.png");
        await createProduct(data);
      }
      toast.success("Coffee cup added!");
      setForm(EMPTY_FORM);
      setSizes([EMPTY_SIZE()]);
      setImage(null);
      setPreview("");
      loadCups();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to add cup.");
    } finally {
      setSaving(false);
    }
  };

  const startEditGroup = (group) => {
    setEditingGroup(group.name);
    setEditForm({ name: group.name, category: group.category || "" });
    setEditImage(null);
    setEditPreview(group.image || "");
  };

  const cancelEditGroup = () => {
    setEditingGroup(null);
    setEditForm(EMPTY_FORM);
    setEditImage(null);
    setEditPreview("");
  };

  const saveEditGroup = async (group) => {
    if (!editForm.name.trim()) return toast.error("Cup name is required.");
    setSaving(true);
    try {
      for (const item of group.items) {
        const data = new FormData();
        data.append("name", editForm.name.trim());
        data.append("isCoffeeCup", "true");
        data.append("coffeeCategory", editForm.category.trim());
        if (editImage) data.append("image", editImage, "cup.png");
        await updateProduct(item._id, data);
      }
      toast.success("Cup updated!");
      cancelEditGroup();
      loadCups();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to update cup.");
    } finally {
      setSaving(false);
    }
  };

  const addSizeToGroup = async (group, label) => {
    const price = window.prompt(`Price for "${label || "this size"}"?`);
    if (price === null || price === "" || Number(price) <= 0) return;
    try {
      const data = new FormData();
      data.append("name", group.name);
      data.append("price", price);
      data.append("isCoffeeCup", "true");
      data.append("cupSize", label);
      data.append("coffeeCategory", group.category || "");
      await createProduct(data);
      toast.success("Size added!");
      loadCups();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to add size.");
    }
  };

  const updateSizePrice = async (item) => {
    const price = window.prompt(`New price for ${item.cupSize || item.name}`, item.price);
    if (price === null || price === "" || Number(price) <= 0) return;
    try {
      const data = new FormData();
      data.append("price", price);
      await updateProduct(item._id, data);
      toast.success("Price updated!");
      loadCups();
    } catch {
      toast.error("Failed to update price.");
    }
  };

  const handleDeleteSize = async (item) => {
    if (!window.confirm(`Remove ${item.cupSize ? `"${item.cupSize}" size of ` : ""}"${item.name}"?`)) return;
    try {
      await deleteProduct(item._id);
      toast.success("Removed");
      setCups(prev => prev.filter(c => c._id !== item._id));
    } catch {
      toast.error("Failed to remove.");
    }
  };

  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-amber-200 bg-white text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm";

  if (checking) {
    return (
      <div className="flex items-center justify-center h-full text-amber-700" style={coffeeBeansStyle}>
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6" style={coffeeBeansStyle}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center
          bg-gradient-to-br from-amber-700 to-amber-900 shadow-[0_0_16px_rgba(146,64,14,0.35)]">
          <Coffee size={20} className="text-amber-100" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-amber-950">Coffee Express</h1>
          <p className="text-xs text-amber-700/70">Street coffee-cup stand for the POS</p>
        </div>
      </div>

      {!enabled ? (
        /* ── LOCKED: code entry ── */
        <div className="max-w-md mx-auto mt-12 p-8 rounded-3xl border border-amber-200
          bg-white/90 backdrop-blur shadow-xl text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-amber-100">
            <Lock size={26} className="text-amber-700" />
          </div>
          <div>
            <h2 className="font-bold text-amber-950">Coffee Express is locked</h2>
            <p className="text-xs text-amber-700/70 mt-1">
              Enter the activation code from your provider to unlock the coffee-cup feature.
            </p>
          </div>
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleUnlock()}
            placeholder="Enter coffee code…"
            className={`${inputCls} text-center font-mono tracking-widest`}
          />
          <button
            onClick={handleUnlock}
            disabled={unlocking || !code.trim()}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white
              bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800
              shadow-[0_4px_0_0_#78350f] active:shadow-none active:translate-y-[4px]
              transition-[transform,box-shadow] duration-75 disabled:opacity-40 select-none"
          >
            {unlocking ? "Unlocking…" : "Unlock Coffee Express"}
          </button>
        </div>
      ) : (
        /* ── UNLOCKED: management UI ── */
        <div className="space-y-6 max-w-4xl">
          {/* Add cup form */}
          <div className="p-5 rounded-2xl border border-amber-200 bg-white/90 backdrop-blur space-y-4">
            <h3 className="font-semibold text-sm text-amber-900 flex items-center gap-2">
              <Plus size={15} /> Add a coffee cup
            </h3>

            <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-start">
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Espresso, Cappuccino…"
                className={inputCls}
              />
              <label className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed
                border-amber-300 text-xs font-semibold text-amber-700
                cursor-pointer hover:bg-amber-50 transition shrink-0">
                {removingBg ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                {removingBg ? "Removing bg…" : "Photo"}
                <input type="file" accept="image/*" className="hidden" disabled={removingBg}
                  onChange={e => handleImagePick(e.target.files?.[0], setImage, setPreview, setRemovingBg)} />
              </label>
            </div>

            {preview && (
              <div className="w-20 h-20 rounded-xl flex items-center justify-center" style={coffeeBeansStyle}>
                <img src={preview} className="max-w-full max-h-full object-contain drop-shadow" />
              </div>
            )}

            {/* Menu category — drives the category tabs shown on the POS menu */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-800">Menu category</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {CATEGORY_PRESETS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, category: f.category === c ? "" : c }))}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition ${
                      form.category === c
                        ? "bg-amber-700 text-white border-amber-700"
                        : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    }`}>
                    {c}
                  </button>
                ))}
                <input
                  value={CATEGORY_PRESETS.includes(form.category) ? "" : form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Custom category…"
                  className="text-[11px] px-2.5 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-600 outline-none focus:ring-1 focus:ring-amber-400 w-32"
                />
              </div>
            </div>

            {/* Sizes */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-800">Sizes &amp; prices</p>
              {sizes.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={s.label}
                    onChange={e => updateSizeRow(idx, "label", e.target.value)}
                    placeholder="Size (optional)"
                    className={`${inputCls} text-xs py-2 max-w-[140px]`}
                  />
                  <input
                    type="number" min="0" step="0.01"
                    value={s.price}
                    onChange={e => updateSizeRow(idx, "price", e.target.value)}
                    placeholder="Price"
                    className={`${inputCls} text-xs py-2 max-w-[110px]`}
                  />
                  {sizes.length > 1 && (
                    <button onClick={() => removeSizeRow(idx)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition shrink-0">
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {SIZE_PRESETS.filter(p => !sizes.some(s => s.label === p)).map(p => (
                  <button key={p} onClick={() => addSizeRow(p)}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition">
                    + {p}
                  </button>
                ))}
                <button onClick={() => addSizeRow("")}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 transition">
                  + Custom size
                </button>
              </div>
            </div>

            <button
              onClick={handleAddCup}
              disabled={saving || removingBg}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white
                bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800
                shadow-[0_4px_0_0_#78350f] active:shadow-none active:translate-y-[4px]
                transition-[transform,box-shadow] duration-75 disabled:opacity-40 select-none"
            >
              {saving ? "Adding…" : "Add Cup"}
            </button>
          </div>

          {/* Cup list */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-semibold text-sm text-amber-900">
                Your cups {groups.length > 0 && <span className="text-amber-600/60">({groups.length})</span>}
              </h3>
              {groups.length > 0 && (
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-400" />
                  <input
                    value={cupSearch}
                    onChange={e => setCupSearch(e.target.value)}
                    placeholder="Search cups…"
                    className="text-xs pl-7 pr-3 py-1.5 rounded-full border border-amber-200 bg-white text-gray-700 outline-none focus:ring-1 focus:ring-amber-400 w-40"
                  />
                </div>
              )}
            </div>
            {loadingCups ? (
              <p className="text-xs text-amber-700/60">Loading…</p>
            ) : groups.length === 0 ? (
              <div className="text-center py-12 text-amber-700/50">
                <Coffee size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No coffee cups yet — add your first one above.</p>
              </div>
            ) : visibleGroups.length === 0 ? (
              <p className="text-xs text-amber-700/50 text-center py-6">No cups match "{cupSearch}".</p>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                {visibleGroups.map(group => (
                  <div key={group.name} className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur overflow-hidden">
                    {editingGroup === group.name ? (
                      <div className="p-3 space-y-2">
                        <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          className={`${inputCls} text-xs py-2`} placeholder="Name" />
                        <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed
                          border-amber-300 text-[11px] font-semibold text-amber-700
                          cursor-pointer hover:bg-amber-50 transition">
                          {editRemovingBg ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                          {editRemovingBg ? "Removing bg…" : "Change photo"}
                          <input type="file" accept="image/*" className="hidden" disabled={editRemovingBg}
                            onChange={e => handleImagePick(e.target.files?.[0], setEditImage, setEditPreview, setEditRemovingBg)} />
                        </label>
                        {editPreview && (
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={coffeeBeansStyle}>
                            <img src={editPreview} className="max-w-full max-h-full object-contain" />
                          </div>
                        )}
                        <div className="flex items-center gap-1 flex-wrap">
                          {CATEGORY_PRESETS.map(c => (
                            <button key={c} onClick={() => setEditForm(f => ({ ...f, category: f.category === c ? "" : c }))}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition ${
                                editForm.category === c
                                  ? "bg-amber-700 text-white border-amber-700"
                                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                              }`}>
                              {c}
                            </button>
                          ))}
                          <input
                            value={CATEGORY_PRESETS.includes(editForm.category) ? "" : editForm.category}
                            onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                            placeholder="Custom…"
                            className="text-[10px] px-2 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 outline-none focus:ring-1 focus:ring-amber-400 w-20"
                          />
                        </div>
                        <div className="flex gap-1.5 pt-1">
                          <button onClick={() => saveEditGroup(group)} disabled={saving || editRemovingBg}
                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold
                              bg-amber-700 hover:bg-amber-800 text-white transition disabled:opacity-40">
                            <Save size={12} /> Save
                          </button>
                          <button onClick={cancelEditGroup}
                            className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100
                              text-gray-600 hover:bg-gray-200 transition">
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="h-28 relative flex items-center justify-center" style={coffeeBeansStyle}>
                          {group.image ? (
                            <img src={group.image} className="max-h-24 max-w-[85%] object-contain drop-shadow-lg" />
                          ) : (
                            <span className="text-4xl">☕</span>
                          )}
                          {group.category && (
                            <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-700 text-white shadow">
                              {group.category}
                            </span>
                          )}
                          <div className="absolute top-1.5 right-1.5 flex gap-1">
                            <button onClick={() => startEditGroup(group)}
                              className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition">
                              <Pencil size={11} />
                            </button>
                          </div>
                        </div>
                        <div className="p-2.5 space-y-1.5">
                          <p className="text-xs font-semibold text-amber-950 truncate">{group.name}</p>
                          {group.items.map(item => (
                            <div key={item._id} className="flex items-center justify-between gap-1 text-[11px]">
                              <button onClick={() => updateSizePrice(item)}
                                className="flex-1 flex items-center justify-between gap-1 px-1.5 py-1 rounded-md hover:bg-amber-50 transition text-left">
                                <span className="text-amber-700">{item.cupSize || "Regular"}</span>
                                <span className="font-bold text-amber-800">{formatUSD(item.price)}</span>
                              </button>
                              <button onClick={() => handleDeleteSize(item)}
                                className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition shrink-0">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ))}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {SIZE_PRESETS.filter(p => !group.items.some(i => i.cupSize === p)).map(p => (
                              <button key={p} onClick={() => addSizeToGroup(group, p)}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition">
                                + {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
