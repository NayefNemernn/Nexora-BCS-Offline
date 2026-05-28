import { useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { getStoreInfo } from "../api/index";
import Navbar from "../components/Navbar";
import { useCartStore } from "../store/cartStore";
import toast from "react-hot-toast";

export default function StorePage() {
  const { slug } = useParams();
  const [store,   setStore]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const setSlug = useCartStore(s => s.setSlug);

  useEffect(() => {
    setSlug(slug);
    getStoreInfo(slug)
      .then(setStore)
      .catch(err => {
        const msg = err.response?.data?.message || "Store not found";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 gap-4">
      <span className="text-6xl">🏪</span>
      <h1 className="text-2xl font-bold text-gray-800">Store Unavailable</h1>
      <p className="text-gray-500">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar store={store} />
      <Outlet context={{ store }} />
    </div>
  );
}
