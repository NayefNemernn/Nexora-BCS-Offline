import { useState } from "react";
import { ShoppingCart, Store, User, LogOut, ChevronDown } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useCartStore, selectItemCount } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import AuthModal from "./AuthModal";

export default function Navbar({ store }) {
  const { slug }   = useParams();
  const count      = useCartStore(selectItemCount);
  const { customer, logout } = useAuthStore();
  const [showAuth,    setShowAuth]    = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to={`/store/${slug}`} className="flex items-center gap-2">
            {store?.logo ? (
              <img src={store.logo} alt={store.name} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <Store size={28} className="text-blue-600" />
            )}
            <span className="font-bold text-lg text-gray-800">{store?.name || "Store"}</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Auth */}
            {customer ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(p => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition">
                  <User size={15} />
                  <span className="max-w-[90px] truncate">{customer.name}</span>
                  <ChevronDown size={13} />
                </button>
                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                    <div className="absolute right-0 mt-1 w-44 bg-white rounded-2xl shadow-xl border z-20 overflow-hidden">
                      <button
                        onClick={() => { logout(); setShowDropdown(false); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition">
                        <LogOut size={14} /> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition">
                <User size={15} /> Login
              </button>
            )}

            {/* Cart */}
            <Link to={`/store/${slug}/cart`} className="relative p-2 rounded-full hover:bg-gray-100 transition">
              <ShoppingCart size={24} className="text-gray-700" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {showAuth && <AuthModal slug={slug} onClose={() => setShowAuth(false)} />}
    </>
  );
}
