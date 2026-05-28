import { useState } from "react";
import { Coffee, Eye, EyeOff, Lock, User } from "lucide-react";
import CoffeeBackground from "../components/cafe/CoffeeBackground";
import { cafeLogin } from "../api/cafeAuth.api";
import toast from "react-hot-toast";

export default function CafeLogin({ onLogin }) {
  const [form,    setForm]    = useState({ username: "", password: "" });
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) return toast.error("Enter username and password");
    setLoading(true);
    try {
      const data = await cafeLogin(form);
      onLogin(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "linear-gradient(160deg,#1c0a04 0%,#2c1810 40%,#4a2518 70%,#3d1a10 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      <CoffeeBackground />

      {/* Overlay tint */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 1 }}/>

      {/* Login card */}
      <div style={{
        position: "relative", zIndex: 2,
        width: "100%", maxWidth: 400,
        margin: 16,
      }}>
        {/* Logo area */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: "linear-gradient(135deg,#c8793a,#8b4513)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 8px 32px rgba(200,121,58,0.4)",
          }}>
            <Coffee size={38} color="#fff"/>
          </div>
          <h1 style={{ color: "#fff", fontWeight: 900, fontSize: 28, margin: 0, letterSpacing: -0.5 }}>
            Café Staff
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: "6px 0 0" }}>
            Sign in with your credentials
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 24,
          padding: "32px 28px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
        }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Username */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 8 }}>
                Username
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
                  <User size={16} color="rgba(255,255,255,0.4)"/>
                </div>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  autoFocus
                  autoComplete="username"
                  placeholder="your.username"
                  style={{
                    width: "100%", padding: "13px 14px 13px 44px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1.5px solid rgba(255,255,255,0.15)",
                    borderRadius: 12, color: "#fff", fontSize: 14,
                    outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "#c8793a"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
                  <Lock size={16} color="rgba(255,255,255,0.4)"/>
                </div>
                <input
                  type={show ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{
                    width: "100%", padding: "13px 44px 13px 44px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1.5px solid rgba(255,255,255,0.15)",
                    borderRadius: 12, color: "#fff", fontSize: 14,
                    outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "#c8793a"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
                />
                <button type="button" onClick={() => setShow(!show)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex" }}>
                  {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              marginTop: 8,
              padding: "15px",
              borderRadius: 13,
              background: loading ? "rgba(200,121,58,0.4)" : "linear-gradient(135deg,#c8793a 0%,#8b4513 100%)",
              border: "none", color: "#fff",
              fontWeight: 800, fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: loading ? "none" : "0 4px 20px rgba(200,121,58,0.4)",
              transition: "all 0.2s",
              opacity: loading ? 0.7 : 1,
            }}>
              <Coffee size={17}/>
              {loading ? "Signing in…" : "Sign In to Café"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 20 }}>
          Credentials provided by your café manager
        </p>
      </div>
    </div>
  );
}
