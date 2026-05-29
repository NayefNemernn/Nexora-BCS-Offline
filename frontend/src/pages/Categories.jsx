import React, { useEffect, useState } from "react";
import { useRefresh } from "../context/RefreshContext";
import { useLang } from "../context/LanguageContext";
import { useCategoriesTranslation } from "../hooks/useCategoriesTranslation";
import api from "../api/axios";
import { motion, AnimatePresence } from "framer-motion";
import { Tags, Plus, Trash2, Search } from "lucide-react";

export default function Categories() {
  const { tick, refresh } = useRefresh();
  const { lang }          = useLang();
  const t                 = useCategoriesTranslation();
  const isAr              = lang === "ar";

  const [categories, setCategories] = useState([]);
  const [name,       setName]       = useState("");
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError(t.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, [tick]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    try {
      await api.post("/categories", { name: name.trim() });
      setName("");
      refresh();
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || t.createFailed);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await api.delete(`/categories/${id}`);
      refresh();
      setCategories(prev => prev.filter(c => c._id !== id));
    } catch {
      alert(t.deleteFailed);
    }
  };

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="p-6 text-gray-500 dark:text-gray-400 animate-pulse">{t.loading}</div>
  );

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Tags size={22} className="text-blue-500"/> {t.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {categories.length} {t.total}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-4 text-gray-400"/>
          <input
            placeholder={t.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full ps-10 pe-4 py-3 rounded-xl
              bg-white dark:bg-[#141414]
              border border-gray-200 dark:border-white/10
              focus:ring-2 focus:ring-blue-500 outline-none
              text-sm"
          />
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t.newCategory}
            className="flex-1 px-4 py-3 rounded-xl
              bg-white dark:bg-[#141414]
              border border-gray-200 dark:border-white/10
              focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-3 rounded-xl
              bg-blue-600 hover:bg-blue-700 text-white font-medium
              shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none text-sm"
          >
            <Plus size={16}/> {t.add}
          </button>
        </form>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Tags size={40} className="opacity-20 mb-3"/>
            <p className="text-sm">{search ? t.noCategories : t.noCategories}</p>
            {!search && <p className="text-xs mt-1">{t.addFirst}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <AnimatePresence>
              {filtered.map(cat => (
                <motion.div
                  key={cat._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.03 }}
                  className="p-5 rounded-2xl
                    bg-white dark:bg-[#141414]
                    shadow-[6px_6px_16px_#d1d5db,-6px_-6px_16px_#ffffff]
                    dark:shadow-[6px_6px_16px_#050505,-6px_-6px_16px_#1a1a1a]
                    flex justify-between items-center gap-2"
                >
                  <span className="font-medium text-sm truncate">{cat.name}</span>
                  <button
                    onClick={() => handleDelete(cat._id)}
                    className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400
                      transition shrink-0 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={14}/>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
}