import React, { useState, useEffect, useRef } from "react";
import { login as loginApi } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { FaUser, FaCashRegister } from "react-icons/fa";
import ThemeToggle from "../components/ThemeToggle";
import { useAuthTranslation } from "../hooks/useAuthTranslation";
import api from "../api/axios";

export default function Login() {
  const { login } = useAuth();
  const t = useAuthTranslation();

  const [licenseStatus, setLicenseStatus] = useState(null); // null=checking, true=ok, false=needed
  const [activating,    setActivating]    = useState(false);
  const [activateError, setActivateError] = useState("");

  const [username,    setUsername]    = useState("");
  const [pin,         setPin]         = useState("");
  const [textPass,    setTextPass]    = useState("");
  const [useTextMode, setUseTextMode] = useState(false);
  const [step,        setStep]        = useState("username");
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);

  const inputRef = useRef(null);

  // Check license on mount
  useEffect(() => {
    api.get("/license/check")
      .then(r => setLicenseStatus(r.data.licensed === true))
      .catch(() => setLicenseStatus(true)); // if check fails, show login anyway
  }, []);

  // Focus input on step change
  useEffect(() => {
    if (licenseStatus) setTimeout(() => inputRef.current?.focus(), 100);
  }, [step, licenseStatus]);

  // Keyboard PIN entry
  useEffect(() => {
    if (step !== "pin" || useTextMode) return;
    const handleKey = (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "Backspace")                        setPin(p => p.slice(0, -1));
      else if (e.key === "Escape")                      { setPin(""); setError(""); }
      else if (e.key === "Enter" && pin.length >= 4)    submitLogin(pin);
      else if (/^[0-9]$/.test(e.key) && pin.length < 6) setPin(p => p + e.key);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [step, pin, useTextMode]);

  // Auto-submit at 6 digits (PIN mode only)
  useEffect(() => {
    if (!useTextMode && pin.length === 6) submitLogin(pin);
  }, [pin, useTextMode]);

  const goToPin = () => {
    if (!username.trim()) { setError(t.enterUsername); return; }
    setError("");
    setPin("");
    setStep("pin");
  };

  const submitLogin = async (currentPin) => {
    if (loading) return;
    const password = useTextMode ? textPass : currentPin;
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const data = await loginApi({ username: username.trim(), password });
      login(data);
    } catch (err) {
      setError(err.response?.data?.message || t.invalidCredentials);
      setPin("");
      setTextPass("");
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setStep("username");
    setPin("");
    setTextPass("");
    setError("");
  };

  const handleActivateLicense = async () => {
    setActivateError("");
    let content = null;

    // Use Electron native file picker if available, otherwise fall back to input
    if (window.electronAPI?.pickNexoraFile) {
      content = await window.electronAPI.pickNexoraFile();
      if (!content) return; // user cancelled
    } else {
      // Browser fallback — shouldn't happen in production
      return;
    }

    setActivating(true);
    try {
      const res = await api.post("/license/activate", { licenseContent: content });
      if (res.data.adminUsername) {
        setUsername(res.data.adminUsername);
        setStep("pin");
      }
      setLicenseStatus(true);
    } catch (err) {
      setActivateError(err.response?.data?.message || "Invalid license file.");
    } finally {
      setActivating(false);
    }
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
          <h1 className="text-2xl text-white font-bold">Nexora POS</h1>
          <p className="text-gray-500 text-sm mt-1">
            {licenseStatus === null
              ? "Checking license…"
              : !licenseStatus
              ? "Activate your license to continue"
              : step === "pin" ? `${t.enterPinFor} ${username}` : t.typeUsernameHint}
          </p>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Checking license ── */}
          {licenseStatus === null && (
            <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </motion.div>
          )}

          {/* ── No license — activation screen ── */}
          {licenseStatus === false && (
            <motion.div key="activate"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2">
                <p className="text-amber-400 text-sm font-semibold">No license installed</p>
                <p className="text-gray-400 text-xs">Contact your software provider to get a <code className="text-amber-300">.nexora</code> license file, then activate below.</p>
              </div>

              {activateError && (
                <p className="text-red-400 text-sm text-center">{activateError}</p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleActivateLicense}
                disabled={activating}
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                  text-white font-semibold text-sm transition shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                {activating ? "Activating…" : "Select License File (.nexora)"}
              </motion.button>

              <p className="text-center text-xs text-gray-700 mt-1">
                Manager?{" "}
                <button onClick={() => setLicenseStatus(true)}
                  className="text-gray-500 hover:text-gray-400 underline transition">
                  Sign in here
                </button>
              </p>
            </motion.div>
          )}

          {/* ── Licensed — normal login ── */}
          {licenseStatus === true && (
            <>
              {/* STEP 1: Username */}
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
                  {error && <p className="text-red-400 text-center text-sm mb-3">{error}</p>}
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={goToPin}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition
                      shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    {t.continueBtn}
                  </motion.button>
                  <p className="text-center text-gray-700 text-xs mt-4">{t.startTypingHint}</p>
                </motion.div>
              )}

              {/* STEP 2: PIN pad */}
              {step === "pin" && (
                <motion.div key="step-pin"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
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

                  {/* Toggle between PIN pad and text password */}
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => { setUseTextMode(m => !m); setPin(""); setTextPass(""); setError(""); }}
                      className="text-xs text-gray-500 hover:text-gray-300 transition underline">
                      {useTextMode ? "Use PIN pad" : "Use text password"}
                    </button>
                  </div>

                  {useTextMode ? (
                    /* ── Text password input ── */
                    <div className="space-y-3">
                      <input
                        ref={inputRef}
                        type="password"
                        placeholder="Enter password"
                        value={textPass}
                        onChange={e => { setTextPass(e.target.value); setError(""); }}
                        onKeyDown={e => { if (e.key === "Enter" && textPass) submitLogin(textPass); }}
                        autoFocus
                        className="w-full px-4 py-3.5 rounded-2xl
                          bg-[#1c1c1c] border border-white/10
                          text-white placeholder-gray-600
                          focus:outline-none focus:border-blue-500/60
                          focus:shadow-[0_0_15px_rgba(59,130,246,0.1)]
                          transition text-sm"
                      />
                      {error && <p className="text-red-400 text-center text-sm">{error}</p>}
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => submitLogin(textPass)}
                        disabled={loading || !textPass}
                        className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                          text-white font-semibold text-sm transition shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                        {loading ? "Signing in…" : "Sign In"}
                      </motion.button>
                    </div>
                  ) : (
                    /* ── Numeric PIN pad ── */
                    <>
                      <div className="flex justify-center gap-3 mb-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <motion.div key={i}
                            animate={{ scale: pin.length > i ? 1.25 : 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            className={`w-3 h-3 rounded-full transition-colors duration-150 ${
                              pin.length > i ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" : "bg-gray-700"
                            }`}
                          />
                        ))}
                      </div>

                      <p className="text-center text-gray-600 text-xs mb-3">{t.tapOrKeyboard}</p>

                      <AnimatePresence>
                        {error && (
                          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="text-red-400 text-center text-sm mb-3">{error}</motion.p>
                        )}
                      </AnimatePresence>

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
                    </>
                  )}
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-gray-700 mt-5">
          {t.madeBy} <span className="text-blue-500">Abbas El Nemer</span>
        </p>
      </motion.div>
    </div>
  );
}
