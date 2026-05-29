import React, { useState, useEffect, useRef } from "react";
import { login as loginApi } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { FaUserShield, FaUser, FaCashRegister } from "react-icons/fa";
import ThemeToggle from "../components/ThemeToggle";
import { useAuthTranslation } from "../hooks/useAuthTranslation";

export default function Login({ onShowRegister }) {
  const { login } = useAuth();
  const t = useAuthTranslation();

  const [username, setUsername] = useState("");
  const [pin,      setPin]      = useState("");
  const [step,     setStep]     = useState("username"); // "username" | "pin"
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const inputRef = useRef(null);

  // Focus input on mount and on step change
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [step]);

  // Keyboard PIN entry
  useEffect(() => {
    if (step !== "pin") return;
    const handleKey = (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "Backspace")                        setPin(p => p.slice(0, -1));
      else if (e.key === "Escape")                      { setPin(""); setError(""); }
      else if (e.key === "Enter" && pin.length >= 4)    submitLogin(pin);
      else if (/^[0-9]$/.test(e.key) && pin.length < 6) setPin(p => p + e.key);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [step, pin]);

  // Auto-submit at 6 digits
  useEffect(() => {
    if (pin.length === 6) submitLogin(pin);
  }, [pin]);

  const goToPin = () => {
    if (!username.trim()) { setError(t.enterUsername); return; }
    setError("");
    setPin("");
    setStep("pin");
  };

  const submitLogin = async (currentPin) => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await loginApi({ username: username.trim(), password: currentPin });
      login(data);
    } catch (err) {
      setError(err.response?.data?.message || t.invalidCredentials);
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setStep("username");
    setPin("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center relative overflow-hidden">
      <ThemeToggle />
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative p-8 rounded-3xl w-[420px] bg-[#151515]
          shadow-[0_0_40px_rgba(59,130,246,0.15),15px_15px_40px_#050505,-15px_-15px_40px_#1f1f1f]"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl mb-3
            shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            <FaCashRegister />
          </div>
          <h1 className="text-2xl text-white font-bold">Market POS</h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === "pin" ? `${t.enterPinFor} ${username}` : t.typeUsernameHint}
          </p>
        </div>

        <AnimatePresence mode="wait">

          {/* ── STEP 1: Username ── */}
          {step === "username" && (
            <motion.div key="step-username"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>

              <div className="relative mb-3">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={t.usernamePlaceholder}
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") goToPin(); }}
                  className="w-full px-4 py-3.5 rounded-2xl
                    bg-[#1c1c1c] border border-white/10
                    text-white placeholder-gray-600
                    focus:outline-none focus:border-blue-500/60
                    focus:shadow-[0_0_15px_rgba(59,130,246,0.1)]
                    transition text-sm"
                />
              </div>

              {error && (
                <p className="text-red-400 text-center text-sm mb-3">{error}</p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={goToPin}
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition
                  shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              >
                {t.continueBtn}
              </motion.button>

              <p className="text-center text-gray-700 text-xs mt-4">
                {t.startTypingHint}
              </p>
            </motion.div>
          )}

          {/* ── STEP 2: PIN pad ── */}
          {step === "pin" && (
            <motion.div key="step-pin"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

              {/* Selected user chip */}
              <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-2xl bg-[#1c1c1c]">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 text-sm">
                  <FaUser />
                </div>
                <span className="text-white font-medium text-sm flex-1">{username}</span>
                <button onClick={clearSelection}
                  className="text-gray-500 hover:text-gray-300 text-xs transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
                  {t.changeUser}
                </button>
              </div>

              {/* PIN dots */}
              <div className="flex justify-center gap-3 mb-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <motion.div key={i}
                    animate={{ scale: pin.length > i ? 1.25 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className={`w-3 h-3 rounded-full transition-colors duration-150 ${
                      pin.length > i
                        ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                        : "bg-gray-700"
                    }`}
                  />
                ))}
              </div>

              <p className="text-center text-gray-600 text-xs mb-3">
                {t.tapOrKeyboard}
              </p>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-red-400 text-center text-sm mb-3">
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2.5">
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <motion.button key={n}
                    whileHover={{ scale: 1.05, boxShadow: "0 0 12px rgba(59,130,246,0.25)" }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => { if (pin.length < 6) setPin(p => p + String(n)); }}
                    disabled={loading}
                    className="py-4 rounded-2xl text-xl font-semibold text-white
                      bg-[#1c1c1c] border border-white/5
                      hover:border-blue-500/30 transition-all disabled:opacity-40">
                    {n}
                  </motion.button>
                ))}
                <motion.button whileTap={{ scale: 0.92 }}
                  onClick={() => { setPin(""); setError(""); }}
                  className="py-4 rounded-2xl text-red-400 font-bold text-sm
                    bg-[#1c1c1c] border border-white/5 hover:border-red-500/30 transition-all">
                  C
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
                  onClick={() => { if (pin.length < 6) setPin(p => p + "0"); }}
                  disabled={loading}
                  className="py-4 rounded-2xl text-xl font-semibold text-white
                    bg-[#1c1c1c] border border-white/5
                    hover:border-blue-500/30 transition-all disabled:opacity-40">
                  0
                </motion.button>
                <motion.button whileTap={{ scale: 0.92 }}
                  onClick={() => setPin(p => p.slice(0, -1))}
                  className="py-4 rounded-2xl text-white text-lg
                    bg-[#1c1c1c] border border-white/5 hover:border-white/20 transition-all">
                  ⌫
                </motion.button>
              </div>

              {loading && (
                <div className="flex justify-center mt-4">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Register link */}
        {onShowRegister && (
          <p className="text-center text-xs text-gray-600 mt-5">
            {t.newStore}{" "}
            <button onClick={onShowRegister} className="text-blue-500 hover:text-blue-400 transition">
              {t.createAccount}
            </button>
          </p>
        )}

        <p className="text-center text-xs text-gray-700 mt-3">
          {t.madeBy} <span className="text-blue-500">Abbas El Nemer</span>
        </p>
      </motion.div>
    </div>
  );
}
