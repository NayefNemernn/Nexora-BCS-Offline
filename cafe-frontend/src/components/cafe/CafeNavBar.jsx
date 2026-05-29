import { Coffee, Monitor, Calendar, Settings, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";

const NAV = [
  { key: "cafe",             label: "Floor",        icon: "🏠" },
  { key: "cafekitchen",      label: "Kitchen",      icon: "👨‍🍳" },
  { key: "cafereservations", label: "Reservations", icon: "📅" },
  { key: "cafemenu",         label: "Menu",         icon: "🍽️",  managerOnly: true  },
  { key: "cafereports",      label: "Reports",      icon: "📊",  managerOnly: true  },
  { key: "cafesettings",     label: "Settings",     icon: "⚙️",  managerOnly: true  },
];

export default function CafeNavBar({ page, setPage, cafeStaff, cafeStore, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isManager = cafeStaff?.role === "manager";
  const visibleNav = NAV.filter(n => !n.managerOnly || isManager);

  return (
    <>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "linear-gradient(135deg,#2c1810 0%,#4a2518 100%)",
        boxShadow: "0 2px 20px rgba(44,24,16,0.35)",
        height: 58,
        display: "flex", alignItems: "center",
        padding: "0 18px",
        gap: 8,
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg,#c8793a,#8b4513)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Coffee size={18} color="#fff"/>
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: -0.2 }}>
              {cafeStore?.name || "Café"}
            </span>
            <span style={{ color: "#c8793a", fontSize: 10, fontWeight: 600 }}>
              {isManager ? "Manager" : "Staff"} · {cafeStaff?.name}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.12)", marginRight: 4 }}/>

        {/* Nav items */}
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {visibleNav.map(n => {
            const active = page === n.key;
            return (
              <button key={n.key} onClick={() => setPage(n.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 13px",
                  borderRadius: 10,
                  background: active ? "rgba(200,121,58,0.25)" : "transparent",
                  border: active ? "1.5px solid rgba(200,121,58,0.5)" : "1.5px solid transparent",
                  color: active ? "#c8793a" : "rgba(255,255,255,0.6)",
                  fontWeight: active ? 700 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}>
                <span>{n.icon}</span>
                {n.label}
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <button onClick={onLogout}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 13px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.1)",
            border: "1.5px solid rgba(239,68,68,0.25)",
            color: "#f87171",
            fontWeight: 600, fontSize: 12,
            cursor: "pointer",
            flexShrink: 0,
          }}>
          <LogOut size={13}/>
          Logout
        </button>
      </div>

      {/* Spacer for fixed navbar */}
      <div style={{ height: 58 }}/>
    </>
  );
}
