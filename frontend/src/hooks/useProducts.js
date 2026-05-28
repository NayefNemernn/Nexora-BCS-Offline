import { useState, useEffect, useCallback } from "react";
import { getAllProducts } from "../api/product.api";
import toast from "react-hot-toast";

export const useProducts = () => {
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllProducts();
      localStorage.setItem("cached_products", JSON.stringify(data));
      setProducts(data);
      setError(null);
    } catch (err) {
      const cached = localStorage.getItem("cached_products");
      if (cached) {
        setProducts(JSON.parse(cached));
        toast("📦 Showing cached products", { icon: "💾" });
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { products, loading, error, reload: load };
};