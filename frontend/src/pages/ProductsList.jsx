import React, { useEffect, useState, useMemo } from "react";
import { getAllProducts } from "../api/product.api";
import { useCurrency } from "../context/CurrencyContext";
import { FileDown, X, ChevronUp, ChevronDown } from "lucide-react";

export default function ProductsList() {
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [categories, setCategories] = useState([]);
  const { formatUSD, formatLBP, toLBPNice } = useCurrency();

  // Column filters
  const [nameFilter,     setNameFilter]     = useState("");
  const [catFilter,      setCatFilter]      = useState("all");
  const [minCost,        setMinCost]        = useState("");
  const [maxCost,        setMaxCost]        = useState("");
  const [minPrice,       setMinPrice]       = useState("");
  const [maxPrice,       setMaxPrice]       = useState("");
  const [minStock,       setMinStock]       = useState("");
  const [maxStock,       setMaxStock]       = useState("");
  const [sortCol,        setSortCol]        = useState("name");
  const [sortDir,        setSortDir]        = useState("asc");
  const [selected,       setSelected]       = useState(new Set());

  useEffect(() => {
    getAllProducts()
      .then(data => {
        setProducts(data);
        const cats = [...new Set(data.map(p => p.category?.name).filter(Boolean))].sort();
        setCategories(cats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (nameFilter)         list = list.filter(p => p.name.toLowerCase().includes(nameFilter.toLowerCase()));
    if (catFilter !== "all") list = list.filter(p => (p.category?.name || "") === catFilter);
    if (minCost !== "")     list = list.filter(p => parseFloat(toLBPNice(p.cost)) >= parseFloat(minCost));
    if (maxCost !== "")     list = list.filter(p => parseFloat(toLBPNice(p.cost)) <= parseFloat(maxCost));
    if (minPrice !== "")    list = list.filter(p => parseFloat(toLBPNice(p.price)) >= parseFloat(minPrice));
    if (maxPrice !== "")    list = list.filter(p => parseFloat(toLBPNice(p.price)) <= parseFloat(maxPrice));
    if (minStock !== "")    list = list.filter(p => p.stock >= parseFloat(minStock));
    if (maxStock !== "")    list = list.filter(p => p.stock <= parseFloat(maxStock));

    list.sort((a, b) => {
      let va, vb;
      if (sortCol === "name")     { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortCol === "cat") { va = (a.category?.name||"").toLowerCase(); vb = (b.category?.name||"").toLowerCase(); }
      else if (sortCol === "cost")  { va = a.cost;  vb = b.cost; }
      else if (sortCol === "price") { va = a.price; vb = b.price; }
      else if (sortCol === "stock") { va = a.stock; vb = b.stock; }
      else { va = 0; vb = 0; }
      return sortDir === "asc" ? (va > vb ? 1 : va < vb ? -1 : 0) : (va < vb ? 1 : va > vb ? -1 : 0);
    });
    return list;
  }, [products, nameFilter, catFilter, minCost, maxCost, minPrice, maxPrice, minStock, maxStock, sortCol, sortDir, toLBPNice]);

  const clearAll = () => {
    setNameFilter(""); setCatFilter("all");
    setMinCost(""); setMaxCost("");
    setMinPrice(""); setMaxPrice("");
    setMinStock(""); setMaxStock("");
  };
  const hasFilter = nameFilter || catFilter !== "all" || minCost || maxCost || minPrice || maxPrice || minStock || maxStock;

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p._id));
  const toggleSelectAll = () => {
    setSelected(prev => {
      if (allSelected) return new Set();
      return new Set(filtered.map(p => p._id));
    });
  };
  const toggleSelectOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const SortIcon = ({ col }) => sortCol !== col ? null :
    sortDir === "asc" ? <ChevronUp size={11}/> : <ChevronDown size={11}/>;

  const exportCSV = () => {
    const header = ["Name","Category","Cost (ل.ل)","Cost ($)","Price (ل.ل)","Price ($)","Stock"];
    const rows = filtered.map(p => [
      `"${p.name}"`, `"${p.category?.name||"-"}"`,
      toLBPNice(p.cost), parseFloat(p.cost).toFixed(2),
      toLBPNice(p.price), parseFloat(p.price).toFixed(2),
      p.stock,
    ]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "products-list.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const inCls = "w-full px-2 py-1 text-xs rounded-lg bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500/60 placeholder-gray-300 dark:placeholder-gray-600";
  const thCls = "px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide";

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Products List</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {filtered.length} / {products.length} products
            {selected.size > 0 && <span className="ml-2 text-blue-500 font-semibold">· {selected.size} selected</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={() => setSelected(new Set())}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-500 border border-blue-200 dark:border-blue-500/30">
              <X size={12}/> Clear selection
            </button>
          )}
          {hasFilter && (
            <button onClick={clearAll}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-500/30">
              <X size={12}/> Clear filters
            </button>
          )}
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition">
            <FileDown size={14}/> Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#1c1c1c] border-b border-gray-200 dark:border-white/10">
                <th className={thCls + " w-6"}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                    className="w-4 h-4 rounded accent-blue-500 cursor-pointer"/>
                </th>
                <th className={thCls + " w-6"}>#</th>
                <th className={thCls + " cursor-pointer"} onClick={()=>toggleSort("name")}>
                  <span className="flex items-center gap-1">Name <SortIcon col="name"/></span>
                </th>
                <th className={thCls + " cursor-pointer"} onClick={()=>toggleSort("cat")}>
                  <span className="flex items-center gap-1">Category <SortIcon col="cat"/></span>
                </th>
                <th className={thCls + " text-right cursor-pointer"} onClick={()=>toggleSort("cost")}>
                  <span className="flex items-center justify-end gap-1">Cost <SortIcon col="cost"/></span>
                </th>
                <th className={thCls + " text-right cursor-pointer"} onClick={()=>toggleSort("price")}>
                  <span className="flex items-center justify-end gap-1">Selling Price <SortIcon col="price"/></span>
                </th>
                <th className={thCls + " text-right cursor-pointer"} onClick={()=>toggleSort("stock")}>
                  <span className="flex items-center justify-end gap-1">Stock <SortIcon col="stock"/></span>
                </th>
              </tr>
              {/* Filter row */}
              <tr className="bg-gray-50 dark:bg-[#1c1c1c] border-b border-gray-200 dark:border-white/10">
                <td className="px-4 py-2"/>
                <td className="px-4 py-2"/>
                <td className="px-3 py-2">
                  <input value={nameFilter} onChange={e=>setNameFilter(e.target.value)} placeholder="Filter name…" className={inCls}/>
                </td>
                <td className="px-3 py-2">
                  <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
                    className={inCls + " cursor-pointer"}>
                    <option value="all">All</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <input value={minCost} onChange={e=>setMinCost(e.target.value)} placeholder="Min ل.ل" className={inCls} type="number"/>
                    <input value={maxCost} onChange={e=>setMaxCost(e.target.value)} placeholder="Max ل.ل" className={inCls} type="number"/>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <input value={minPrice} onChange={e=>setMinPrice(e.target.value)} placeholder="Min ل.ل" className={inCls} type="number"/>
                    <input value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="Max ل.ل" className={inCls} type="number"/>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <input value={minStock} onChange={e=>setMinStock(e.target.value)} placeholder="Min" className={inCls} type="number"/>
                    <input value={maxStock} onChange={e=>setMaxStock(e.target.value)} placeholder="Max" className={inCls} type="number"/>
                  </div>
                </td>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <div className="flex justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No products found</td></tr>
              ) : filtered.map((p, i) => {
                const isSelected = selected.has(p._id);
                return (
                <tr key={p._id} className={`border-b border-gray-100 dark:border-white/5 transition-colors ${
                  isSelected ? "bg-blue-100 dark:bg-blue-900/30" : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                }`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelectOne(p._id)}
                      className="w-4 h-4 rounded accent-blue-500 cursor-pointer"/>
                  </td>
                  <td className="px-4 py-3 text-gray-400 tabular-nums text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {p.category?.name || <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-semibold text-amber-500">{formatLBP(toLBPNice(p.cost))}</p>
                    <p className="text-xs text-blue-400">{formatUSD(p.cost)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-semibold text-amber-500">{formatLBP(toLBPNice(p.price))}</p>
                    <p className="text-xs text-blue-400">{formatUSD(p.price)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                      p.stock <= 5
                        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    }`}>{p.stock}</span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
