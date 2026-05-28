import { useState, useEffect, createContext, useContext } from "react";
import { Toaster } from "react-hot-toast";
import CafeLanding       from "./cafe-public/CafeLanding";
import CafeAuthPage      from "./cafe-public/CafeAuthPage";
import CafePublicHome    from "./cafe-public/CafePublicHome";
import CafePublicMenu    from "./cafe-public/CafePublicMenu";
import CafePublicTracker from "./cafe-public/CafePublicTracker";
import CafeGuestMenu       from "./cafe-public/CafeGuestMenu";
import GameHub             from "./cafe-public/GameHub";
import CafePublicRewards   from "./cafe-public/CafePublicRewards";

/* ── Parse slug + table from URL ── */
const parsePath = () => {
  const path  = window.location.pathname; // /play/:slug
  const parts = path.split("/");          // ["", "play", slug]
  const slug  = parts[2] || "";
  const params = new URLSearchParams(window.location.search);
  const table  = params.get("table") || null;
  return { slug, table };
};

/* ── Context ── */
export const CafePublicCtx = createContext(null);
export const useCafePublic = () => useContext(CafePublicCtx);

const TOKEN_KEY = "cafe_customer_token";
const CUST_KEY  = "cafe_customer_data";

export default function CafePublicApp() {
  const { slug, table } = parsePath();

  const [page,      setPage]     = useState("landing"); // landing | auth | home | menu | tracker | guest | games | rewards
  const [token,     setToken]    = useState(() => localStorage.getItem(TOKEN_KEY));
  const [customer,  setCustomer] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CUST_KEY)); } catch { return null; }
  });
  const [cafeData,  setCafeData] = useState(null); // { store, menu }
  const [orderId,   setOrderId]  = useState(null);
  const [gameMode,  setGameMode] = useState("earn"); // earn | fun

  const saveCustomer = (cust, tok) => {
    setCustomer(cust);
    setToken(tok);
    localStorage.setItem(TOKEN_KEY, tok);
    localStorage.setItem(CUST_KEY, JSON.stringify(cust));
  };

  const updateCustomer = (cust) => {
    setCustomer(cust);
    localStorage.setItem(CUST_KEY, JSON.stringify(cust));
  };

  const logout = () => {
    setCustomer(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CUST_KEY);
    setPage("landing");
  };

  /* Auto-navigate if already logged in */
  useEffect(() => {
    if (token && customer && page === "landing") setPage("home");
  }, []);

  const ctx = {
    slug, table, token, customer, cafeData, orderId,
    setCafeData, setOrderId, setPage, saveCustomer, updateCustomer, logout,
  };

  const BG = "min-height:100vh; background:linear-gradient(160deg,#1a0800 0%,#2d1209 50%,#1a0800 100%)";

  const renderPage = () => {
    switch (page) {
      case "landing":  return <CafeLanding  setPage={setPage} />;
      case "auth":     return <CafeAuthPage setPage={setPage} />;
      case "home":     return <CafePublicHome setPage={setPage} setGameMode={setGameMode} />;
      case "menu":     return <CafePublicMenu setPage={setPage} />;
      case "tracker":  return <CafePublicTracker setPage={setPage} />;
      case "guest":    return <CafeGuestMenu setPage={setPage} />;
      case "games":    return <GameHub setPage={setPage} mode={gameMode} />;
      case "rewards":  return <CafePublicRewards setPage={setPage} />;
      default:         return <CafeLanding setPage={setPage} />;
    }
  };

  return (
    <CafePublicCtx.Provider value={ctx}>
      <Toaster position="top-center" toastOptions={{ style: { background: "#2d1209", color: "#fff", border: "1px solid rgba(200,121,58,0.3)" } }} />
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#1a0800 0%,#2d1209 50%,#1a0800 100%)" }}>
        {renderPage()}
      </div>
    </CafePublicCtx.Provider>
  );
}
