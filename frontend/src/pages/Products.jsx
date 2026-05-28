import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRefresh } from "../context/RefreshContext";
import {
  Search, Barcode, Printer, ScanLine, X, Plus, Package, Upload, Download,
  FileSpreadsheet, CheckCircle, AlertCircle, ChevronLeft, ChevronRight,
  Trash2, SlidersHorizontal, ArrowUpDown, Filter, Layers,
} from "lucide-react";

import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  importProductsExcel,
} from "../api/product.api";
import { getBatchesForProduct, createBatch } from "../api/batch.api";

import { getCategories, createCategory } from "../api/category.api";
import {
  cacheProducts, getCachedProducts,
  cacheCategories, getCachedCategories,
  queueMutation,
} from "../lib/offlineDB";

import toast from "react-hot-toast";
import JsBarcode from "jsbarcode";

import ProductCard       from "../components/products/ProductCard";
import ProductEditPanel  from "../components/products/ProductEditPanel";
import ProductForm       from "../components/products/ProductForm";
import ImageDropzone     from "../components/products/ImageDropzone";
import AIProductFill     from "../components/products/AIProductFill";
import InventoryScanner  from "../components/products/InventoryScanner";
import ExchangeRateBar   from "../components/ExchangeRateBar";
import VoiceButton       from "../components/common/VoiceButton";
import { useProductsTranslation } from "../hooks/useProductsTranslation";
import { useCurrency } from "../context/CurrencyContext";

// ── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE         = 24;
const LOW_STOCK_MAX     = 5;
const BARCODE_FORMATS   = ["CODE128", "CODE39", "EAN13", "UPCA"];
const SORT_OPTIONS      = [
  { value: "date-desc",  labelKey: "sortNewest"    },
  { value: "date-asc",   labelKey: "sortOldest"    },
  { value: "name-asc",   labelKey: "sortNameAZ"    },
  { value: "name-desc",  labelKey: "sortNameZA"    },
  { value: "price-asc",  labelKey: "sortPriceUp"   },
  { value: "price-desc", labelKey: "sortPriceDown" },
  { value: "stock-asc",  labelKey: "sortStockUp"   },
  { value: "stock-desc", labelKey: "sortStockDown" },
];

// ── Pagination helper ─────────────────────────────────────────────────────────
function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Products() {
  const t = useProductsTranslation();
  const { tick, refresh } = useRefresh();

  // ── Core data ──
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);

  // ── Create-form state ──
  const [editingProduct, setEditingProduct] = useState(null);
  const [image,   setImage]   = useState(null);
  const [preview, setPreview] = useState("");
  const [form,    setForm]    = useState({ name: "", price: "", cost: "", stock: "", category: "", expiryDate: "", expiryAlertDays: 180 });
  const [barcode,  setBarcode]  = useState("");
  const [barcodeFormat, setBarcodeFormat] = useState("CODE128");

  // ── Inventory scan ──
  const [inventoryMode, setInventoryMode] = useState(false);
  const [dataLoaded,    setDataLoaded]    = useState(false); // true once API/cache has responded

  // ── Search & filter state ──
  const [search,         setSearch]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter,    setStockFilter]    = useState("all");
  const [sortKey,        setSortKey]        = useState("date-desc");
  const [currentPage,    setCurrentPage]    = useState(1);

  // ── Bulk select ──
  const [selectedIds, setSelectedIds] = useState(new Set());

  // ── Batch modal state ──
  const [batchProduct,   setBatchProduct]   = useState(null);
  const [productBatches, setProductBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [showAddBatch,   setShowAddBatch]   = useState(false);
  const [batchForm,          setBatchForm]          = useState({ expiryDate: "", initialQty: "", costPrice: "", notes: "" });
  const [batchExpiryDisplay, setBatchExpiryDisplay] = useState("");
  const [savingBatch,        setSavingBatch]        = useState(false);

  // ── Import state ──
  const [showImport,   setShowImport]   = useState(false);
  const [importFile,   setImportFile]   = useState(null);
  const [importing,    setImporting]    = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const importInputRef   = useRef(null);
  const previewBarcodeRef = useRef(null);
  const addFormRef        = useRef(null);

  // ── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, categoryFilter, stockFilter, sortKey]);

  // ── Load data (with offline cache fallback) ───────────────────────────────
  const load = async () => {
    // Load from cache immediately so the page isn't empty offline
    const cachedP = await getCachedProducts();
    const cachedC = await getCachedCategories();
    if (cachedP) { setProducts(cachedP); setDataLoaded(true); }
    if (cachedC) setCategories(cachedC);

    try {
      const [p, c] = await Promise.all([getAllProducts(), getCategories()]);
      setProducts(p);
      setCategories(c);
      setDataLoaded(true);
      await cacheProducts(p);
      await cacheCategories(c);
    } catch {
      if (!cachedP) toast.error(t.failedToLoad);
      else toast("📦 Showing cached products", { icon: "💾" });
    }
  };
  useEffect(() => { load(); }, [tick]);

  // ── Derived: filtered + sorted + paginated ───────────────────────────────
  const filtered = useMemo(() => {
    let r = [...products];

    // Text search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      r = r.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q))
      );
    }

    // Category filter
    if (categoryFilter) r = r.filter(p => p.category?._id === categoryFilter);

    // Stock filter
    if      (stockFilter === "out") r = r.filter(p => p.stock === 0);
    else if (stockFilter === "low") r = r.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_MAX);
    else if (stockFilter === "in")  r = r.filter(p => p.stock > LOW_STOCK_MAX);

    // Sort
    const [sortField, sortDir] = sortKey.split("-");
    r.sort((a, b) => {
      let v = 0;
      if      (sortField === "name")  v = a.name.localeCompare(b.name);
      else if (sortField === "price") v = a.price - b.price;
      else if (sortField === "stock") v = a.stock - b.stock;
      else                            v = new Date(a.createdAt) - new Date(b.createdAt);
      return sortDir === "asc" ? v : -v;
    });

    return r;
  }, [products, debouncedSearch, categoryFilter, stockFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const lowStock   = products.filter(p => p.stock <= LOW_STOCK_MAX);

  // ── Bulk select helpers ───────────────────────────────────────────────────
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }, []);

  const isAllPageSelected = paginated.length > 0 && paginated.every(p => selectedIds.has(p._id));

  const toggleSelectPage = () => {
    if (isAllPageSelected) {
      setSelectedIds(prev => {
        const s = new Set(prev);
        paginated.forEach(p => s.delete(p._id));
        return s;
      });
    } else {
      setSelectedIds(prev => {
        const s = new Set(prev);
        paginated.forEach(p => s.add(p._id));
        return s;
      });
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`${t.deleteProduct} (${selectedIds.size})`)) return;
    if (!navigator.onLine) {
      for (const id of selectedIds) {
        if (!id.startsWith("offline-")) {
          await queueMutation("delete_product", `/api/products/${id}`, "DELETE");
        }
      }
      const updated = products.filter(p => !selectedIds.has(p._id));
      setProducts(updated);
      await cacheProducts(updated);
      toast.success(`${t.deleted} (${selectedIds.size})`);
      setSelectedIds(new Set());
      return;
    }
    try {
      await Promise.all([...selectedIds].map(id => deleteProduct(id)));
      toast.success(`${t.deleted} (${selectedIds.size})`);
      setSelectedIds(new Set());
      refresh();
    } catch {
      toast.error(t.someDeletesFailed);
    }
  };

  // ── Barcode ───────────────────────────────────────────────────────────────
  const generateBarcode = () => {
    const ts = Date.now().toString();
    const code =
      barcodeFormat === "EAN13" ? ts.slice(-12).padStart(12, "0") :
      barcodeFormat === "UPCA"  ? ts.slice(-11).padStart(11, "0") : ts;
    setBarcode(code);
  };

  useEffect(() => {
    if (!barcode || !previewBarcodeRef.current) return;
    try {
      JsBarcode(previewBarcodeRef.current, barcode, {
        format: barcodeFormat, width: 2, height: 60,
        displayValue: true, fontSize: 13, margin: 8,
      });
    } catch {
      toast.error(`${t.cannotPrint} ${barcodeFormat}`);
    }
  }, [barcode, barcodeFormat]);

  const printLabel = () => {
    if (!barcode) { toast.error(t.generateBarcodeFirst); return; }
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    document.body.appendChild(svg);
    try {
      JsBarcode(svg, barcode, {
        format: barcodeFormat, width: 3, height: 80,
        displayValue: true, fontSize: 14, margin: 10,
        background: "#ffffff", lineColor: "#000000",
      });
    } catch {
      document.body.removeChild(svg);
      toast.error(`${t.cannotPrint} ${barcodeFormat}`);
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svg);
    document.body.removeChild(svg);
    const svgUrl = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale  = 3;
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, img.width, img.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(svgUrl);
      const win = window.open("", "_blank");
      win.document.write(`
        <!DOCTYPE html><html><head><title>Barcode Label — ${barcode}</title>
        <style>*{margin:0;padding:0;box-sizing:border-box}body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}img{max-width:100%}@media print{@page{margin:10mm}body{min-height:unset}}</style>
        </head><body><img src="${canvas.toDataURL("image/png")}"/>
        <script>window.onload=()=>window.print();<\/script></body></html>
      `);
      win.document.close();
    };
    img.src = svgUrl;
  };

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name || !barcode) { toast.error(t.nameRequired); return; }

    // Duplicate name detection
    const dup = products.find(p => p.name.trim().toLowerCase() === form.name.trim().toLowerCase());
    if (dup && !window.confirm(`"${dup.name}" ${t.alreadyExistsConfirm}`)) return;

    /* ── OFFLINE path (no image only) ── */
    if (!navigator.onLine) {
      if (image) {
        toast.error("❌ Image upload requires a connection — remove the image to save offline");
        return;
      }
      const catObj   = categories.find(c => c.name.toLowerCase() === (form.category || "").toLowerCase());
      const payload  = {
        name: form.name, barcode,
        price: +form.price || 0, cost: +form.cost || 0, stock: +form.stock || 0,
        category: catObj?._id || null,
        expiryDate: form.expiryDate || null,
        expiryAlertDays: form.expiryAlertDays ?? 180,
      };
      await queueMutation("create_product", "/api/products", "POST", payload);
      const fakeProduct = {
        _id: "offline-" + Date.now(), ...payload,
        category: catObj ? { _id: catObj._id, name: catObj.name } : null,
        image: "",
      };
      const updated = [fakeProduct, ...products];
      setProducts(updated);
      await cacheProducts(updated);
      toast.success("📴 Product saved — will sync when connected");
      setForm({ name: "", price: "", cost: "", stock: "", category: "", expiryDate: "", expiryAlertDays: 180 });
      setBarcode(""); setPreview(""); setImage(null);
      return;
    }

    /* ── ONLINE path ── */
    let categoryId = null;
    if (form.category) {
      const existing = categories.find(c => c.name.toLowerCase() === form.category.toLowerCase());
      categoryId = existing ? existing._id : (await createCategory({ name: form.category }))._id;
    }

    const data = new FormData();
    data.append("name",     form.name);
    data.append("barcode",  barcode);
    data.append("price",    form.price  || 0);
    data.append("cost",     form.cost   || 0);
    data.append("stock",    form.stock  || 0);
    data.append("category", categoryId || "");
    if (form.expiryDate) data.append("expiryDate", form.expiryDate);
    data.append("expiryAlertDays", String(Number(form.expiryAlertDays) || 180));
    if (image)           data.append("image", image);

    try {
      await createProduct(data);
      toast.success(t.productCreated);
      setForm({ name: "", price: "", cost: "", stock: "", category: "", expiryDate: "", expiryAlertDays: 180 });
      setBarcode(""); setPreview(""); setImage(null);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || t.failedToCreate);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const remove = async (id) => {
    if (!window.confirm(t.deleteProduct)) return;
    if (!navigator.onLine) {
      if (!id.startsWith("offline-")) {
        await queueMutation("delete_product", `/api/products/${id}`, "DELETE");
      }
      const updated = products.filter(p => p._id !== id);
      setProducts(updated);
      await cacheProducts(updated);
      toast.success(t.deleted);
      return;
    }
    await deleteProduct(id);
    toast.success(t.deleted);
    refresh();
  };

  // ── Import / Export ───────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!importFile) { toast.error(t.pleaseSelectExcel); return; }
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importProductsExcel(importFile);
      setImportResult(result);
      toast.success(result.message);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || t.importFailed);
    } finally {
      setImporting(false);
    }
  };

  const getExportRows = () => {
    const headers = ["Barcode", "Product Name", "Price (USD)", "Cost (USD)", "Stock", "Category", "Expiry Date", "Image URL"];
    const rows = products.map(p => [
      p.barcode, p.name, p.price, p.cost, p.stock,
      p.category?.name || "",
      p.expiryDate ? new Date(p.expiryDate).toISOString().slice(0, 10) : "",
      p.image || "",
    ]);
    return { headers, rows };
  };

  const handleExportCSV = () => {
    if (!dataLoaded) { toast.error("Products are still loading, please wait."); return; }
    if (products.length === 0) { toast.error(t.noProductsExport); return; }
    const { headers, rows } = getExportRows();
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `products_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success(`${t.export} CSV: ${products.length} ${t.productsLabel}`);
  };

  const handleExportExcel = async () => {
    if (!dataLoaded) { toast.error("Products are still loading, please wait."); return; }
    if (products.length === 0) { toast.error(t.noProductsExport); return; }
    const { headers, rows } = getExportRows();
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, `products_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${t.export} Excel: ${products.length} ${t.productsLabel}`);
  };

  // Inventory scan is handled by <InventoryScanner> component

  // ── AI fill ──────────────────────────────────────────────────────────────
  const { exchangeRate } = useCurrency();

  const handleAIFill = useCallback((fields) => {
    let price = parseFloat(fields.price) || 0;
    let cost  = parseFloat(fields.cost)  || 0;

    // Convert LBP prices to USD using the current exchange rate
    if (fields.priceCurrency === "LBP" && exchangeRate > 0) {
      price = parseFloat((price / exchangeRate).toFixed(4));
      cost  = parseFloat((cost  / exchangeRate).toFixed(4));
    }

    setForm(prev => ({
      ...prev,
      ...(fields.name                ? { name:       fields.name.trim()   } : {}),
      ...(price > 0                  ? { price:      String(price)         } : {}),
      ...(cost  > 0                  ? { cost:       String(cost)          } : {}),
      ...(fields.stock > 0           ? { stock:      String(fields.stock)  } : {}),
      ...(fields.category            ? { category:   fields.category       } : {}),
      ...(fields.expiryDate          ? { expiryDate: fields.expiryDate     } : {}),
    }));

    toast.success(t.fieldsFilled, { icon: "✨" });
  }, [exchangeRate]);

  // ── Batch modal helpers ───────────────────────────────────────────────────
  const openBatches = async (product) => {
    setBatchProduct(product);
    setShowAddBatch(false);
    setBatchForm({ expiryDate: "", initialQty: "", costPrice: "", notes: "" });
    setBatchExpiryDisplay("");
    setLoadingBatches(true);
    try {
      const data = await getBatchesForProduct(product._id);
      setProductBatches(data);
    } catch { setProductBatches([]); }
    finally { setLoadingBatches(false); }
  };

  const handleAddBatch = async () => {
    if (!batchForm.initialQty) { toast.error("Quantity is required"); return; }
    setSavingBatch(true);
    try {
      await createBatch({ productId: batchProduct._id, ...batchForm, initialQty: Number(batchForm.initialQty), costPrice: batchForm.costPrice ? Number(batchForm.costPrice) : undefined });
      toast.success("Batch added");
      setShowAddBatch(false);
      setBatchForm({ expiryDate: "", initialQty: "", costPrice: "", notes: "" });
      setBatchExpiryDisplay("");
      const data = await getBatchesForProduct(batchProduct._id);
      setProductBatches(data);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add batch");
    } finally { setSavingBatch(false); }
  };

  const fmtDate = (d) => {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
  };

  const batchExpiryBadge = (b) => {
    if (!b.expiryDate) return null;
    const days = Math.ceil((new Date(b.expiryDate) - new Date()) / 86400000);
    if (days < 0)  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Expired</span>;
    if (days <= 7) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{days}d left</span>;
    if (days <= 30) return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">{days}d left</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">{days}d left</span>;
  };

  // ── Shared select/input class ─────────────────────────────────────────────
  const selectCls = "px-3 py-2 rounded-xl text-sm outline-none transition " +
    "bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-white/5 " +
    "text-gray-700 dark:text-gray-300 focus:border-blue-400 dark:focus:border-blue-500/50";

  const activeFilters = categoryFilter || stockFilter !== "all" || sortKey !== "date-desc";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-neutral-950 transition-all duration-300 ${editingProduct ? "pr-[420px]" : ""}`}>

      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-4">

          <ExchangeRateBar />

          {/* ── TOP TOOLBAR ─────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3
            p-3 rounded-2xl bg-white dark:bg-[#141414]
            shadow-[6px_6px_16px_#d1d5db,-6px_-6px_16px_#ffffff]
            dark:shadow-[6px_6px_16px_#050505,-6px_-6px_16px_#1a1a1a]">

            {/* Search */}
            <div className="relative flex-1 min-w-48 flex items-center gap-2">
              <Search size={16} className="absolute left-3 text-gray-400"/>
              <input
                placeholder={t.searchProduct || "Search products…"}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none
                  bg-gray-50 dark:bg-[#0f0f0f]
                  border border-gray-200 dark:border-white/5
                  focus:border-blue-400 dark:focus:border-blue-500/50 transition"
              />
              <VoiceButton onResult={text => setSearch(text)}/>
            </div>

            <div className="flex items-center gap-2 flex-wrap">

              {/* Barcode format + generate */}
              <div className="flex items-center rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-[#1c1c1c]">
                <select
                  value={barcodeFormat}
                  onChange={e => setBarcodeFormat(e.target.value)}
                  className="text-xs px-2 py-2.5 bg-transparent text-gray-600 dark:text-gray-400 outline-none border-r border-gray-200 dark:border-white/10 cursor-pointer"
                >
                  {BARCODE_FORMATS.map(f => <option key={f}>{f}</option>)}
                </select>
                <button onClick={generateBarcode}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#252525] transition">
                  <Barcode size={14}/> {t.generateBarcode}
                </button>
              </div>

              <button onClick={printLabel}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm
                  bg-gray-100 dark:bg-[#1c1c1c] hover:bg-gray-200 dark:hover:bg-[#252525]
                  text-gray-700 dark:text-gray-300 transition">
                <Printer size={14}/> {t.printLabel}
              </button>

              <button
                onClick={() => setInventoryMode(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition
                  ${inventoryMode
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                  }`}
              >
                <ScanLine size={14}/>
                {inventoryMode ? t.stopScan : t.inventoryScan}
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                    bg-gray-100 dark:bg-[#1c1c1c] hover:bg-gray-200 dark:hover:bg-[#252525]
                    text-gray-700 dark:text-gray-300 transition">
                  <Download size={14}/> {t.export}
                </button>
                {showExportMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)}/>
                    <div className="absolute right-0 top-full mt-1 z-40 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
                      <button
                        onClick={() => { handleExportCSV(); setShowExportMenu(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition">
                        <Download size={13}/> CSV
                      </button>
                      <button
                        onClick={() => { handleExportExcel(); setShowExportMenu(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition">
                        <FileSpreadsheet size={13}/> Excel (.xlsx)
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => { setShowImport(true); setImportFile(null); setImportResult(null); }}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                  bg-green-600 hover:bg-green-700 text-white
                  shadow-[0_0_12px_rgba(34,197,94,0.3)] transition">
                <Upload size={14}/> {t.importExcel}
              </button>
            </div>
          </div>

          {/* ── FILTER BAR ───────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3
            px-4 py-3 rounded-2xl bg-white dark:bg-[#141414]
            shadow-[6px_6px_16px_#d1d5db,-6px_-6px_16px_#ffffff]
            dark:shadow-[6px_6px_16px_#050505,-6px_-6px_16px_#1a1a1a]">

            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">
              <Filter size={12}/> {t.filters}
            </div>

            {/* Category */}
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={selectCls}>
              <option value="">{t.allCategories}</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>

            {/* Stock level */}
            <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className={selectCls}>
              <option value="all">{t.allStockLevels}</option>
              <option value="in">{t.inStock} (&gt;{LOW_STOCK_MAX})</option>
              <option value="low">{t.lowStock} (1–{LOW_STOCK_MAX})</option>
              <option value="out">{t.outOfStock}</option>
            </select>

            {/* Sort */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0 ml-auto">
              <ArrowUpDown size={12}/> {t.sort}
            </div>
            <select value={sortKey} onChange={e => setSortKey(e.target.value)} className={selectCls}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{t[o.labelKey]}</option>)}
            </select>

            {/* Clear filters */}
            {activeFilters && (
              <button
                onClick={() => { setCategoryFilter(""); setStockFilter("all"); setSortKey("date-desc"); }}
                className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl
                  bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
              >
                <X size={11}/> {t.clearFilters}
              </button>
            )}
          </div>

          {/* ── INVENTORY SCANNER PANEL ──────────────────────────────────── */}
          <InventoryScanner
            inventoryMode={inventoryMode}
            setInventoryMode={setInventoryMode}
            products={products}
            setProducts={setProducts}
            updateProduct={updateProduct}
            createProduct={createProduct}
            categories={categories}
            onUnknownBarcode={(code) => {
              setBarcode(code);
              setTimeout(() => addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
            }}
          />

          {/* ── STATS ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t.totalProducts || "Total Products", value: products.length,    color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-900/20"   },
              { label: t.lowStock      || "Low Stock",      value: lowStock.length,     color: "text-red-600 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-900/20"     },
              { label: t.categories    || "Categories",     value: categories.length,   color: "text-purple-600 dark:text-purple-400",bg: "bg-purple-50 dark:bg-purple-900/20"},
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-4 border border-white/50 dark:border-white/5`}>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* ── ADD PRODUCT FORM ─────────────────────────────────────────── */}
          <div ref={addFormRef} className="rounded-2xl bg-white dark:bg-[#141414]
            shadow-[6px_6px_16px_#d1d5db,-6px_-6px_16px_#ffffff]
            dark:shadow-[6px_6px_16px_#050505,-6px_-6px_16px_#1a1a1a]
            overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
              <Plus size={16} className="text-blue-500"/>
              <span className="font-semibold text-sm">{t.addNewProduct}</span>
            </div>
            <div className="p-5 space-y-5">
              {/* AI fill panel */}
              <AIProductFill onFill={handleAIFill} categories={categories}/>
              <ProductForm
                form={form}
                setForm={setForm}
                barcode={barcode}
                setBarcode={setBarcode}
                categories={categories}
                onCreate={handleCreate}
                preview={preview}
                setPreview={setPreview}
                setImage={setImage}
                ImageDropzone={ImageDropzone}
              />
            </div>
          </div>

          {/* Barcode preview */}
          {barcode && (
            <div className="bg-white dark:bg-[#141414] rounded-2xl p-4 shadow flex items-center gap-4">
              <svg ref={previewBarcodeRef}/>
              <span className="text-xs text-gray-500 font-mono">{barcode}</span>
            </div>
          )}

          {/* ── BULK ACTIONS BAR ─────────────────────────────────────────── */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3
              px-4 py-3 rounded-2xl
              bg-blue-50 dark:bg-blue-900/20
              border border-blue-200 dark:border-blue-500/30">
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                {selectedIds.size} {t.selected}
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={toggleSelectPage}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-white/20 transition"
                >
                  {isAllPageSelected ? t.deselectPage : t.selectPage}
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/20 transition"
                >
                  {t.clear}
                </button>
                <button
                  onClick={bulkDelete}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition font-medium"
                >
                  <Trash2 size={12}/> {t.deleteSelected} {selectedIds.size}
                </button>
              </div>
            </div>
          )}

          {/* ── PRODUCTS GRID ────────────────────────────────────────────── */}
          <div>
            {/* Grid header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-gray-400"/>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  {filtered.length} {t.productsLabel}
                  {filtered.length !== products.length && (
                    <span className="font-normal text-gray-400"> {t.of} {products.length}</span>
                  )}
                </span>
              </div>
              {totalPages > 1 && (
                <span className="text-xs text-gray-400">
                  {t.page} {safePage} / {totalPages}
                </span>
              )}
            </div>

            {/* Grid or empty state */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Package size={40} className="opacity-20 mb-3"/>
                <p className="text-sm">{t.noProductsFound}</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 xl:grid-cols-16 gap-3">
                {paginated.map(p => (
                  <div key={p._id} className={p.image ? "col-span-2" : "col-span-1"}>
                    <ProductCard
                      product={p}
                      onDelete={remove}
                      onEdit={product => setEditingProduct(product)}
                      onBatches={openBatches}
                      selected={selectedIds.has(p._id)}
                      onToggleSelect={toggleSelect}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ── PAGINATION ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-6">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition
                    bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10
                    disabled:opacity-40 disabled:cursor-not-allowed
                    hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <ChevronLeft size={14}/> {t.prev}
                </button>

                {getPageNumbers(safePage, totalPages).map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm select-none">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-9 h-9 rounded-xl text-sm font-medium transition
                        ${p === safePage
                          ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                          : "bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition
                    bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10
                    disabled:opacity-40 disabled:cursor-not-allowed
                    hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  {t.next} <ChevronRight size={14}/>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── EDIT PANEL ─────────────────────────────────────────────────────── */}
      <ProductEditPanel
        editingProduct={editingProduct}
        setEditingProduct={setEditingProduct}
        setProducts={setProducts}
        updateProduct={updateProduct}
        editImage={image}
        setEditImage={setImage}
        editPreview={preview}
        setEditPreview={setPreview}
        categories={categories}
      />

      {/* ── BATCHES MODAL ──────────────────────────────────────────────────── */}
      {batchProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#141414] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Layers size={18} className="text-emerald-600 dark:text-emerald-400"/>
                </div>
                <div>
                  <h2 className="font-bold text-sm">{batchProduct.name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Batch tracking · {productBatches.length} batch{productBatches.length !== 1 ? "es" : ""}</p>
                </div>
              </div>
              <button onClick={() => setBatchProduct(null)} className="text-gray-400 hover:text-gray-600 transition"><X size={20}/></button>
            </div>

            {/* Batch list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingBatches ? (
                <div className="flex items-center justify-center py-10 text-gray-400 text-sm">Loading…</div>
              ) : productBatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Layers size={32} className="opacity-20 mb-2"/>
                  <p className="text-sm">No batches yet</p>
                </div>
              ) : productBatches.map(b => (
                <div key={b._id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#1c1c1c] border border-gray-100 dark:border-white/5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-300">{b.batchNumber}</span>
                      {batchExpiryBadge(b)}
                      {b.remainingQty === 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500">Depleted</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {b.expiryDate && <span>Exp: {fmtDate(b.expiryDate)}</span>}
                      {b.supplierName && <span>· {b.supplierName}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{b.remainingQty} <span className="text-xs font-normal text-gray-400">/ {b.initialQty}</span></p>
                    <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${b.initialQty > 0 ? (b.remainingQty / b.initialQty) * 100 : 0}%` }}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add batch form */}
            {showAddBatch ? (
              <div className="border-t border-gray-100 dark:border-white/5 p-4 space-y-3 shrink-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Receive New Stock</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Qty *</label>
                    <input type="number" min="1" placeholder="0" value={batchForm.initialQty} onChange={e => setBatchForm(f => ({ ...f, initialQty: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f0f0f] outline-none focus:border-emerald-400 transition"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Expiry Date</label>
                    <input type="text" inputMode="numeric" placeholder="dd/mm/yyyy" maxLength={10}
                      value={batchExpiryDisplay}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                        let display = digits;
                        if (digits.length > 2) display = digits.slice(0, 2) + "/" + digits.slice(2);
                        if (digits.length > 4) display = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
                        setBatchExpiryDisplay(display);
                        if (digits.length === 8)
                          setBatchForm(f => ({ ...f, expiryDate: `${digits.slice(4)}-${digits.slice(2,4)}-${digits.slice(0,2)}` }));
                        else if (digits.length === 0)
                          setBatchForm(f => ({ ...f, expiryDate: "" }));
                      }}
                      className="w-full px-3 py-2 rounded-xl text-sm border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f0f0f] outline-none focus:border-emerald-400 transition"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Cost Price</label>
                    <input type="number" min="0" step="0.01" placeholder="0.00" value={batchForm.costPrice} onChange={e => setBatchForm(f => ({ ...f, costPrice: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f0f0f] outline-none focus:border-emerald-400 transition"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                    <input placeholder="Optional" value={batchForm.notes} onChange={e => setBatchForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f0f0f] outline-none focus:border-emerald-400 transition"/>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowAddBatch(false)} className="flex-1 py-2 rounded-xl text-sm bg-gray-100 dark:bg-[#252525] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2f2f2f] transition">Cancel</button>
                  <button onClick={handleAddBatch} disabled={savingBatch}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition">
                    {savingBatch ? "Saving…" : "Add Batch"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-gray-100 dark:border-white/5 p-4 shrink-0">
                <button onClick={() => setShowAddBatch(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition">
                  <Plus size={15}/> Receive New Stock
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── IMPORT MODAL ───────────────────────────────────────────────────── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#141414] rounded-3xl shadow-2xl overflow-hidden">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <FileSpreadsheet size={18} className="text-green-600 dark:text-green-400"/>
                </div>
                <div>
                  <h2 className="font-bold text-sm">{t.importTitle}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{t.importSubtitle}</p>
                </div>
              </div>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20}/>
              </button>
            </div>

            <div className="p-6 space-y-4">

              <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 p-4">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">{t.step1Title}</p>
                <p className="text-xs text-blue-500 dark:text-blue-400 mb-3">{t.step1Sub}</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/products_import_template.xlsx"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                      bg-blue-600 hover:bg-blue-700 text-white transition"
                  >
                    <FileSpreadsheet size={13}/> {t.downloadTemplate}
                  </a>
                  <button
                    onClick={() => {
                      const headers = "Barcode,Product Name,Price (USD),Cost (USD),Stock,Category,Expiry Date,Image URL";
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(new Blob([headers + "\n"], { type: "text/csv;charset=utf-8;" }));
                      a.download = "products_import_template.csv";
                      a.click();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                      bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/50
                      text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40 transition"
                  >
                    <Download size={13}/> Template (.csv)
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">{t.step2Title}</p>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={e => { setImportFile(e.target.files[0]); setImportResult(null); }}
                />
                <div
                  onClick={() => importInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed rounded-2xl p-6
                    flex flex-col items-center gap-2 text-center transition
                    border-gray-200 dark:border-white/10
                    hover:border-green-400 dark:hover:border-green-500/50"
                >
                  {importFile ? (
                    <>
                      <FileSpreadsheet size={28} className="text-green-500"/>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">{importFile.name}</p>
                      <p className="text-xs text-gray-400">{t.clickToChange}</p>
                    </>
                  ) : (
                    <>
                      <Upload size={28} className="text-gray-300 dark:text-gray-600"/>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t.clickToSelect}</p>
                      <p className="text-xs text-gray-400">.xlsx · .xls · .csv</p>
                    </>
                  )}
                </div>
              </div>

              {importResult && (
                <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={15} className="text-green-500"/>
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">{t.importComplete}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: t.importAdded,   value: importResult.inserted,          color: "text-green-600 dark:text-green-400" },
                      { label: t.importSkipped, value: importResult.skipped,            color: "text-amber-600 dark:text-amber-400" },
                      { label: t.importErrors,  value: importResult.errors?.length || 0, color: "text-red-500" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-white dark:bg-white/5 rounded-xl p-2 text-center">
                        <p className={`text-xl font-bold ${color}`}>{value}</p>
                        <p className="text-xs text-gray-400">{label}</p>
                      </div>
                    ))}
                  </div>
                  {importResult.errors?.slice(0, 3).map((e, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                      <AlertCircle size={11}/> Row {e.row}: {e.reason}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowImport(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium
                    bg-gray-100 dark:bg-[#1c1c1c] hover:bg-gray-200 dark:hover:bg-[#252525]
                    text-gray-700 dark:text-gray-300 transition"
                >
                  {importResult ? t.clear : t.cancel}
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
                    bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed
                    text-white transition"
                >
                  {importing
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> {t.importing}</>
                    : <><Upload size={14}/> {t.importExcel}</>
                  }
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
