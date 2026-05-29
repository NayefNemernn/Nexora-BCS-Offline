import { useState } from "react";
import { X, User, Phone, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { customerLogin, customerRegister } from "../api/index";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

export default function AuthModal({ slug, onClose }) {
  const [tab, setTab]         = useState("login");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const setAuth               = useAuthStore(s => s.setAuth);

  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone.trim() || !form.password)
      return toast.error("Phone and password are required");
    if (tab === "register" && !form.name.trim())
      return toast.error("Name is required");

    setLoading(true);
    try {
      const fn   = tab === "login" ? customerLogin : customerRegister;
      const data = tab === "login"
        ? { phone: form.phone, password: form.password }
        : { name: form.name, phone: form.phone, password: form.password };
      const res = await fn(slug, data);
      setAuth(res.token, res.customer);
      toast.success(tab === "login" ? `Welcome back, ${res.customer.name}!` : "Account created!");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-bold text-lg text-gray-800">
            {tab === "login" ? "Login" : "Create Account"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mx-5 mb-4 bg-gray-100 rounded-2xl p-1">
          {["login", "register"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all
                ${tab === t ? "bg-white shadow text-blue-600" : "text-gray-500"}`}>
              {t === "login" ? "Login" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-6 space-y-3">
          {tab === "register" && (
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={form.name} onChange={e => set("name", e.target.value)}
                placeholder="Full name"
                className="w-full pl-9 pr-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="relative">
            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={form.phone} onChange={e => set("phone", e.target.value)}
              placeholder="Phone number" type="tel"
              className="w-full pl-9 pr-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={form.password} onChange={e => set("password", e.target.value)}
              placeholder="Password" type={showPw ? "text" : "password"}
              className="w-full pl-9 pr-10 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="button" onClick={() => setShowPw(p => !p)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2">
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Please wait...</>
              : tab === "login" ? "Login" : "Create Account"
            }
          </button>
        </form>
      </div>
    </div>
  );
}
