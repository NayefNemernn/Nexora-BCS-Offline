import React, { useState } from "react";
import { register } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import { Store, User, Lock, Globe, ArrowRight, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthTranslation } from "../hooks/useAuthTranslation";

export default function Register({ onBackToLogin }) {
  const { login } = useAuth();
  const t = useAuthTranslation();
  const [step,    setStep]    = useState(1); // 1 = store info, 2 = account info
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    storeName:  "",
    currency:   "USD",
    language:   "en",
    username:   "",
    password:   "",
    confirmPw:  "",
  });
  const [error, setError] = useState("");

  const CURRENCIES = [
    { code: "USD", symbol: "$",  label: "US Dollar" },
    { code: "EUR", symbol: "€",  label: "Euro" },
    { code: "GBP", symbol: "£",  label: "British Pound" },
    { code: "LBP", symbol: "LL", label: "Lebanese Pound" },
    { code: "SAR", symbol: "﷼",  label: "Saudi Riyal" },
    { code: "AED", symbol: "د.إ",label: "UAE Dirham" },
    { code: "EGP", symbol: "£",  label: "Egyptian Pound" },
    { code: "TRY", symbol: "₺",  label: "Turkish Lira" },
    { code: "INR", symbol: "₹",  label: "Indian Rupee" },
  ];

  const selectedCurrency = CURRENCIES.find(c => c.code === form.currency) || CURRENCIES[0];

  const handleStep1 = () => {
    if (!form.storeName.trim()) { setError(t.storeNameRequired); return; }
    setError(""); setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPw) { setError(t.passwordMismatch); return; }
    if (form.password.length < 4)         { setError(t.passwordTooShort); return; }

    setLoading(true);
    try {
      const data = await register({
        storeName:      form.storeName,
        username:       form.username,
        password:       form.password,
        currency:       form.currency,
        currencySymbol: selectedCurrency.symbol,
        language:       form.language,
      });
      toast.success(t.storeCreated);
      // Auto-login after register
      const loginData = await import("../api/auth.api").then(m => m.login({ username: form.username, password: form.password }));
      login(loginData);
    } catch (err) {
      setError(err.response?.data?.message || t.registrationFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / title */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Store size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t.createYourStore}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.freeTrial}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map(s => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${step >= s ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400"}`}>
                {step > s ? <CheckCircle size={16} /> : s}
              </div>
              {s < 2 && <div className={`h-0.5 w-12 transition-colors ${step > s ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">

          {/* Step 1: Store Info */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-white">{t.storeDetails}</h2>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">{t.storeName}</label>
                <input
                  type="text"
                  placeholder="My Market"
                  value={form.storeName}
                  onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && handleStep1()}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">{t.currency}</label>
                <select
                  value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.symbol} — {c.label} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">{t.language}</label>
                <select
                  value={form.language}
                  onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="en">{t.langEnglish}</option>
                  <option value="ar">{t.langArabic}</option>
                  <option value="fr">{t.langFrench}</option>
                  <option value="es">{t.langSpanish}</option>
                  <option value="tr">{t.langTurkish}</option>
                </select>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button onClick={handleStep1}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition">
                {t.next} <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* Step 2: Account Info */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-white">{t.adminAccount}</h2>
              <p className="text-xs text-gray-500">{t.adminAccountDesc} <span className="font-medium text-indigo-600">{form.storeName}</span></p>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">{t.usernameLabel}</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required type="text" placeholder="admin"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full pl-10 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">{t.passwordLabel}</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required type="password" placeholder={t.passwordPlaceholder}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full pl-10 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">{t.confirmPassword}</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required type="password" placeholder={t.repeatPassword}
                    value={form.confirmPw}
                    onChange={e => setForm(f => ({ ...f, confirmPw: e.target.value }))}
                    className="w-full pl-10 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  {t.back}
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition">
                  {loading ? t.creatingStore : t.createStore}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          {t.alreadyHaveStore}{" "}
          <button onClick={onBackToLogin} className="text-indigo-600 font-medium hover:underline">{t.signIn}</button>
        </p>
      </div>
    </div>
  );
}
