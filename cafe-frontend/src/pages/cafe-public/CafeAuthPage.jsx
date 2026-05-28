import { useState } from "react";
import { Coffee, Phone, Lock, User, Eye, EyeOff, ArrowLeft } from "lucide-react";
import confetti from "canvas-confetti";
import { useCafePublic } from "../CafePublicApp";
import { cafeCustomerLogin, cafeCustomerRegister } from "../../api/cafePublic.api";
import toast from "react-hot-toast";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function CafeAuthPage({ setPage }) {
  const { slug, saveCustomer } = useCafePublic();
  const [mode,    setMode]    = useState("login"); // login | register
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [form,    setForm]    = useState({ name: "", phone: "", password: "" });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone || !form.password) return toast.error("Phone and password required");
    if (mode === "register" && !form.name) return toast.error("Name required");
    setLoading(true);
    try {
      const fn   = mode === "register" ? cafeCustomerRegister : cafeCustomerLogin;
      const data = await fn(slug, form);
      saveCustomer(data.customer, data.token);
      if (mode === "register") {
        toast.success("Welcome! +100 pts bonus 🎉");
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ["#c8793a", "#ffd700", "#fff"] });
      } else {
        toast.success("Welcome back!");
      }
      setPage("home");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  /* Google sign-in via GSI */
  const handleGoogleLoad = (el) => {
    if (!el || !GOOGLE_CLIENT_ID || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        setLoading(true);
        try {
          const { cafeCustomerGoogle } = await import("../../api/cafePublic.api");
          const data = await cafeCustomerGoogle(slug, credential);
          saveCustomer(data.customer, data.token);
          if (data.isNew) {
            toast.success("Welcome! +100 pts bonus 🎉");
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ["#c8793a", "#ffd700", "#fff"] });
          } else {
            toast.success("Welcome back!");
          }
          setPage("home");
        } catch { toast.error("Google sign-in failed"); }
        finally { setLoading(false); }
      },
    });
    window.google.accounts.id.renderButton(el, {
      theme: "filled_black", size: "large", shape: "pill", width: 320, text: "continue_with",
    });
  };

  const inputStyle = {
    width: "100%", padding: "13px 14px 13px 44px",
    background: "rgba(255,255,255,0.07)",
    border: "1.5px solid rgba(255,255,255,0.12)",
    borderRadius: 12, color: "#fff", fontSize: 14,
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Back */}
        <button onClick={() => setPage("landing")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 13 }}>
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 70, height: 70, borderRadius: 22, background: "linear-gradient(135deg,#c8793a,#8b4513)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 0 30px rgba(200,121,58,0.4)" }}>
            <Coffee size={32} color="#fff" />
          </div>
          <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 24, margin: 0 }}>
            {mode === "login" ? "Welcome Back" : "Join & Earn"}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "6px 0 0" }}>
            {mode === "login" ? "Sign in to your café account" : "Create an account to start earning points"}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "28px 24px" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && (
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}><User size={16} color="rgba(255,255,255,0.35)" /></div>
                <input style={inputStyle} placeholder="Your name" value={form.name} onChange={e => set("name", e.target.value)} />
              </div>
            )}
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}><Phone size={16} color="rgba(255,255,255,0.35)" /></div>
              <input style={inputStyle} placeholder="Phone number" value={form.phone} onChange={e => set("phone", e.target.value)} />
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}><Lock size={16} color="rgba(255,255,255,0.35)" /></div>
              <input style={{ ...inputStyle, paddingRight: 44 }} type={show ? "text" : "password"} placeholder="Password" value={form.password} onChange={e => set("password", e.target.value)} />
              <button type="button" onClick={() => setShow(!show)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer" }}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" disabled={loading} style={{
              padding: "14px", borderRadius: 13, marginTop: 4,
              background: loading ? "rgba(200,121,58,0.4)" : "linear-gradient(135deg,#c8793a,#8b4513)",
              border: "none", color: "#fff", fontWeight: 800, fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 20px rgba(200,121,58,0.4)",
            }}>
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>or</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
          </div>

          {/* Google button */}
          {GOOGLE_CLIENT_ID ? (
            <div ref={handleGoogleLoad} style={{ display: "flex", justifyContent: "center" }} />
          ) : (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 12 }}>Google sign-in not configured</div>
          )}

          {/* Toggle */}
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 20, marginBottom: 0 }}>
            {mode === "login" ? "No account? " : "Already have an account? "}
            <button onClick={() => setMode(mode === "login" ? "register" : "login")}
              style={{ background: "none", border: "none", color: "#c8793a", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              {mode === "login" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      {/* Load Google GSI script */}
      {GOOGLE_CLIENT_ID && !window.google && (
        <script src="https://accounts.google.com/gsi/client" async defer
          onLoad={() => window.dispatchEvent(new Event("google-loaded"))} />
      )}
    </div>
  );
}
