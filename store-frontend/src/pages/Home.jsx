import { useEffect, useState } from "react";
import { useParams, useOutletContext, Link } from "react-router-dom";
import { getStoreProducts } from "../api/index";
import ProductCard from "../components/ProductCard";
import FloatingCart from "../components/FloatingCart";
import { Search, SlidersHorizontal } from "lucide-react";

export default function Home() {
  const { slug }   = useParams();
  const { store }  = useOutletContext();

  const [products,    setProducts]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [activeCat,   setActiveCat]   = useState("all");

  useEffect(() => {
    getStoreProducts(slug)
      .then(({ products, categories }) => {
        setProducts(products);
        setCategories(categories);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = activeCat === "all" || p.category?._id === activeCat;
    return matchSearch && matchCat;
  });

  const sym = store?.currencySymbol || "$";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-28">
      {/* Store banner */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800">{store?.name}</h1>
        {store?.address && <p className="text-sm text-gray-500 mt-1">{store.address}</p>}
        {store?.deliveryFee > 0 && (
          <p className="text-sm text-blue-600 mt-1 font-medium">
            🚚 Delivery fee: {sym}{store.deliveryFee}
          </p>
        )}
        {store?.minimumOrder > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            Min. order: {sym}{store.minimumOrder}
          </p>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
          <button
            onClick={() => setActiveCat("all")}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all
              ${activeCat === "all" ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:border-blue-400"}`}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c._id}
              onClick={() => setActiveCat(c._id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all
                ${activeCat === c._id ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:border-blue-400"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border h-56 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <span className="text-5xl block mb-3">📭</span>
          <p>No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map(p => (
            <ProductCard key={p._id} product={p} currency={sym} />
          ))}
        </div>
      )}

      <FloatingCart currency={sym} />
    </div>
  );
}
