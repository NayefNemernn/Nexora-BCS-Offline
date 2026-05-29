import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import CafeLogin       from "./CafeLogin";
import CafeNavBar      from "../components/cafe/CafeNavBar";
import CoffeeBackground from "../components/cafe/CoffeeBackground";
import Cafe            from "./Cafe";
import CafeKitchen     from "./CafeKitchen";
import CafeReservations from "./CafeReservations";
import CafeSettings    from "./CafeSettings";
import CafeMenuPage    from "./CafeMenuPage";
import CafeReports    from "./CafeReports";

function getStored(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

export default function CafeApp() {
  const [cafeStaff, setCafeStaff] = useState(() => getStored("cafe_staff"));
  const [cafeStore, setCafeStore] = useState(() => getStored("cafe_store"));
  const [page,      setPage]      = useState("cafe");

  const hasToken = Boolean(localStorage.getItem("cafe_token"));

  /* ── Login ── */
  const handleLogin = ({ token, staff, store }) => {
    localStorage.setItem("cafe_token",  token);
    localStorage.setItem("cafe_staff",  JSON.stringify(staff));
    localStorage.setItem("cafe_store",  JSON.stringify(store));
    setCafeStaff(staff);
    setCafeStore(store);
    setPage("cafe");
  };

  /* ── Logout ── */
  const handleLogout = () => {
    localStorage.removeItem("cafe_token");
    localStorage.removeItem("cafe_staff");
    localStorage.removeItem("cafe_store");
    setCafeStaff(null);
    setCafeStore(null);
  };

  if (!hasToken || !cafeStaff) {
    return (
      <>
        <Toaster position="top-right"/>
        <CafeLogin onLogin={handleLogin}/>
      </>
    );
  }

  const isManager = cafeStaff.role === "manager";

  /* Override AuthContext so existing café pages (Cafe, CafeKitchen, etc.)
     can call useAuth() and get store/user data from café session */
  const fakeAuth = {
    user: {
      _id:      cafeStaff._id,
      username: cafeStaff.username,
      role:     isManager ? "admin" : "cashier",
    },
    store:          cafeStore,
    currencySymbol: cafeStore?.currencySymbol || "$",
    planExpired:    false,
    daysUntilExpiry: null,
    logout:         handleLogout,
  };

  const renderPage = () => {
    switch (page) {
      case "cafe":             return <Cafe setPage={setPage}/>;
      case "cafekitchen":      return <CafeKitchen setPage={setPage}/>;
      case "cafereservations": return <CafeReservations setPage={setPage}/>;
      case "cafemenu":
        return isManager ? <CafeMenuPage setPage={setPage}/> : <Cafe setPage={setPage}/>;
      case "cafereports":
        return isManager ? <CafeReports /> : <Cafe setPage={setPage}/>;
      case "cafesettings":
        return isManager ? <CafeSettings setPage={setPage}/> : <Cafe setPage={setPage}/>;
      default:                 return <Cafe setPage={setPage}/>;
    }
  };

  return (
    <AuthContext.Provider value={fakeAuth}>
      <Toaster position="top-right"/>

      {/* Subtle animated background visible behind page content */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, opacity: 0.35 }}>
        <CoffeeBackground/>
      </div>

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", background: "linear-gradient(160deg,#fdf8f0ee 0%,#f5ece0ee 100%)" }}>
        <CafeNavBar
          page={page}
          setPage={setPage}
          cafeStaff={cafeStaff}
          cafeStore={cafeStore}
          onLogout={handleLogout}
        />
        {renderPage()}
      </div>
    </AuthContext.Provider>
  );
}
