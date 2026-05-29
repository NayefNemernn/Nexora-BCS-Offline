import { isOnline } from "../lib/connectivity";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import {
  LayoutDashboard, ShoppingCart, Package, Tags, Users, BarChart3,
  Clock, Sun, Moon, LogOut, Pencil, Check, X, Shield, Store,
  UserCircle2, ClipboardList, TrendingDown, Tag, Truck, Globe, Layers, Sparkles, Smartphone,
} from "lucide-react";
import { useTheme }  from "../context/ThemeContext";
import { useAuth }   from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import NotificationsBell from "../components/NotificationsBell";
import toast from "react-hot-toast";

const NAV_LABELS = {
  dashboard:       "Dashboard",
  pos:             "POS",
  products:        "Products",
  categories:      "Categories",
  users:           "Users",
  reports:         "Reports",
  mobilereports:   "Quick Report",
  paylater:        "Pay Later",
  customers:       "Customers",
  shift:           "Shift / Z-Report",
  adminpanel:      "Admin Panel",
  storesettings:   "Store Settings",
  stock:           "Stock",
  expenses:        "Expenses",
  discounts:       "Discounts",
  suppliers:       "Suppliers",
  superadminpanel: "Super Admin",
  onlineorders:    "Online Orders",
  pendingpayments: "Pending Payments",
  batches:         "Batch Tracking",
  aiinsights:      "AI Insights",
};

const NAV_COLORS = {
  dashboard:       { bg: "#6366f1", glow: "rgba(99,102,241,0.5)"   },
  pos:             { bg: "#10b981", glow: "rgba(16,185,129,0.5)"   },
  products:        { bg: "#3b82f6", glow: "rgba(59,130,246,0.5)"   },
  categories:      { bg: "#f59e0b", glow: "rgba(245,158,11,0.5)"   },
  users:           { bg: "#ec4899", glow: "rgba(236,72,153,0.5)"   },
  reports:         { bg: "#8b5cf6", glow: "rgba(139,92,246,0.5)"   },
  mobilereports:   { bg: "#229ED9", glow: "rgba(34,158,217,0.5)"   },
  paylater:        { bg: "#ef4444", glow: "rgba(239,68,68,0.5)"    },
  customers:       { bg: "#0ea5e9", glow: "rgba(14,165,233,0.5)"   },
  shift:           { bg: "#4f46e5", glow: "rgba(79,70,229,0.5)"    },
  adminpanel:      { bg: "#0f172a", glow: "rgba(15,23,42,0.6)"     },
  storesettings:   { bg: "#6366f1", glow: "rgba(99,102,241,0.5)"   },
  stock:           { bg: "#0891b2", glow: "rgba(8,145,178,0.5)"    },
  expenses:        { bg: "#dc2626", glow: "rgba(220,38,38,0.5)"    },
  discounts:       { bg: "#16a34a", glow: "rgba(22,163,74,0.5)"    },
  suppliers:       { bg: "#7c3aed", glow: "rgba(124,58,237,0.5)"   },
  superadminpanel: { bg: "#7c3aed", glow: "rgba(124,58,237,0.5)"   },
  onlineorders:    { bg: "#0284c7", glow: "rgba(2,132,199,0.5)"    },
  pendingpayments: { bg: "#ea580c", glow: "rgba(234,88,12,0.5)"    },
  batches:         { bg: "#059669", glow: "rgba(5,150,105,0.5)"    },
  aiinsights:      { bg: "#7c3aed", glow: "rgba(124,58,237,0.5)"  },
};

export default function DashboardLayout({ children, page, setPage, user }) {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang }   = useLang();
  const { logout, storeName, updateStore, store } = useAuth();

  const isAdmin      = user?.role === "admin";
  const isSuperAdmin = user?.role === "superadmin";
  const isPOS        = page === "pos";

  const [open,       setOpen]       = useState(false);
  const [online,     setOnline]     = useState(isOnline());
  const [isMobile,   setIsMobile]   = useState(() => window.innerWidth < 640);
  const navRef                      = useRef(null);

  useEffect(() => {
    const up   = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online",  up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState("");
  const [savingName,  setSavingName]  = useState(false);
  const nameInputRef = useRef(null);

  const startEditName  = (e) => { e.stopPropagation(); setNameInput(storeName); setEditingName(true); setTimeout(() => nameInputRef.current?.focus(), 50); };
  const cancelEditName = (e) => { e?.stopPropagation(); setEditingName(false); };
  const saveEditName   = async (e) => {
    e?.stopPropagation();
    if (!nameInput.trim()) return;
    setSavingName(true);
    try { await updateStore({ name: nameInput.trim() }); toast.success("Store name updated"); setEditingName(false); }
    catch { toast.error("Failed to update store name"); }
    finally { setSavingName(false); }
  };

  const menu = isSuperAdmin
    ? [{ key: "superadminpanel", icon: Globe }]
    : [
        { key: "dashboard",       icon: LayoutDashboard, adminOnly: true  },
        { key: "pos",             icon: ShoppingCart,    adminOnly: false },
        { key: "products",        icon: Package,         adminOnly: false },
        { key: "categories",      icon: Tags,            adminOnly: false },
        { key: "customers",       icon: UserCircle2,     adminOnly: false },
        { key: "users",           icon: Users,           adminOnly: true  },
        { key: "reports",         icon: BarChart3,       adminOnly: true  },
        { key: "mobilereports",   icon: Smartphone,      adminOnly: true  },
        { key: "paylater",        icon: Clock,           adminOnly: false },
        { key: "shift",           icon: ClipboardList,   adminOnly: false },
        { key: "stock",           icon: TrendingDown,    adminOnly: true  },
        { key: "expenses",        icon: TrendingDown,    adminOnly: true  },
        { key: "discounts",       icon: Tag,             adminOnly: true  },
        { key: "suppliers",       icon: Truck,           adminOnly: true  },
        { key: "onlineorders",    icon: Globe,           adminOnly: true  },
        { key: "pendingpayments", icon: Truck,           adminOnly: false },
        { key: "batches",         icon: Layers,          adminOnly: true  },
        { key: "aiinsights",      icon: Sparkles,        adminOnly: true  },
        { key: "adminpanel",      icon: Shield,          adminOnly: true  },
        { key: "storesettings",   icon: Store,           adminOnly: true  },
      ].filter(item => !item.adminOnly || isAdmin);

  const toggle  = useCallback(() => setOpen(v => !v), []);
  const close   = useCallback(() => { setOpen(false); setEditingName(false); }, []);

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;
      if ((e.key === "`" || e.key === "F1" || (e.key === "s" && !isTyping && !e.ctrlKey && !e.metaKey))) {
        e.preventDefault(); toggle();
      }
      if (e.key === "Escape") close();
      const idx = parseInt(e.key) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < menu.length && open) { setPage(menu[idx].key); close(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, menu, toggle, close, setPage]);

  useEffect(() => {
    if (!open || isMobile) return;
    const onClickOutside = (e) => { if (navRef.current && !navRef.current.contains(e.target)) close(); };
    setTimeout(() => document.addEventListener("mousedown", onClickOutside), 0);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, close, isMobile]);

  const activeColor = NAV_COLORS[page] || NAV_COLORS.pos;

  /* ── Shared panel sections ── */
  const PanelHeader = () => (
    <div className="flex items-center justify-between gap-3 px-4 py-3
      border-b border-gray-200 dark:border-white/[0.10]
      bg-gray-50 dark:bg-[#0d0d16]">
      {/* User */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
          style={{ background: activeColor.bg, boxShadow: `0 0 10px ${activeColor.glow}` }}>
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-800 dark:text-white truncate">{user?.username}</p>
          <p className="text-[10px] capitalize font-semibold" style={{ color: activeColor.bg }}>{user?.role}</p>
        </div>
      </div>

      {/* Store name (editable) */}
      {!isSuperAdmin && (
        <div className="flex-1 flex justify-end min-w-0">
          {editingName ? (
            <div className="flex items-center gap-1">
              <input
                ref={nameInputRef}
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") saveEditName(); if (e.key === "Escape") cancelEditName(); }}
                className="text-[11px] font-semibold bg-transparent border-b border-blue-500 outline-none text-gray-800 dark:text-white w-28"
                placeholder="Store name…"
              />
              <button onClick={saveEditName} disabled={savingName} className="p-0.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition"><Check size={11}/></button>
              <button onClick={cancelEditName} className="p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition"><X size={11}/></button>
            </div>
          ) : (
            <button onClick={startEditName} className="group flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition truncate max-w-[140px]">
              🧾 {storeName}
              <Pencil size={9} className="shrink-0 opacity-0 group-hover:opacity-100 transition text-blue-400"/>
            </button>
          )}
        </div>
      )}

      {isSuperAdmin && (
        <span className="text-[11px] font-semibold text-purple-400">🌐 Platform</span>
      )}
    </div>
  );

  const PanelUtility = () => (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5
      border-t border-gray-200 dark:border-white/[0.10]
      bg-gray-50 dark:bg-[#0d0d16]">
      <div className="flex items-center gap-1.5">
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center
            bg-white dark:bg-white/10 border border-gray-200 dark:border-white/[0.14]
            text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white
            hover:bg-gray-100 dark:hover:bg-white/[0.16] transition"
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun size={13} className="text-amber-400"/> : <Moon size={13}/>}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={toggleLang}
          className="w-8 h-8 rounded-lg flex items-center justify-center
            bg-white dark:bg-white/10 border border-gray-200 dark:border-white/[0.14]
            text-[10px] font-bold text-gray-600 dark:text-gray-200
            hover:text-gray-900 dark:hover:text-white
            hover:bg-gray-100 dark:hover:bg-white/[0.16] transition"
          title="Switch language"
        >
          {lang === "en" ? "AR" : "EN"}
        </motion.button>

        {!isSuperAdmin && <NotificationsBell />}
      </div>

      <motion.button
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={() => logout()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
          text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300
          bg-red-50 dark:bg-red-500/[0.12] hover:bg-red-100 dark:hover:bg-red-500/[0.22]
          border border-red-100 dark:border-red-500/[0.20] transition"
      >
        <LogOut size={12}/> Logout
      </motion.button>
    </div>
  );

  const NavItem = ({ item, index, cols }) => {
    const Icon   = item.icon;
    const active = page === item.key;
    const color  = NAV_COLORS[item.key];

    return (
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8, pointerEvents: "none" }}
        transition={{ delay: index * 0.025, type: "spring", stiffness: 400, damping: 28 }}
        onClick={() => { setPage(item.key); close(); }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className={`
          w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left
          transition-all duration-150 relative overflow-hidden
          ${active
            ? "text-white shadow-lg"
            : "text-gray-600 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-white/[0.08]"
          }
        `}
        style={active ? {
          background: color.bg,
          boxShadow: `0 4px 14px ${color.glow}`,
        } : {}}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: active ? "rgba(255,255,255,0.22)" : color.bg + "26" }}
        >
          <Icon size={14} style={{ color: active ? "white" : color.bg }} />
        </div>

        <span className="text-xs font-semibold truncate flex-1">
          {NAV_LABELS[item.key]}
        </span>

        {!isMobile && (
          <span className={`text-[10px] font-mono shrink-0 ${active ? "text-white/60" : "text-gray-400 dark:text-gray-500"}`}>
            {index + 1}
          </span>
        )}

        {active && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ background: color.bg }}
            animate={{ opacity: [0.12, 0, 0.12] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>
    );
  };

  /* ── DESKTOP PANEL ── */
  const DesktopPanel = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 16, pointerEvents: "none" }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="absolute bottom-16 left-0 w-[420px]
        bg-white dark:bg-[#13131f]
        backdrop-blur-xl rounded-2xl overflow-hidden
        border border-gray-200 dark:border-white/[0.10]"
      style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06)" }}
    >
      <PanelHeader />

      <div className="p-3 grid grid-cols-2 gap-1.5">
        {menu.map((item, i) => (
          <NavItem key={item.key} item={item} index={i} />
        ))}
      </div>

      <PanelUtility />

      <div className="px-4 py-2 border-t border-gray-100 dark:border-white/[0.07]">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
          <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-white/[0.10] font-mono text-[9px] text-gray-600 dark:text-gray-300">S</kbd>
          {" "}or{" "}
          <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-white/[0.10] font-mono text-[9px] text-gray-600 dark:text-gray-300">`</kbd>
          {" "}toggle · {" "}
          <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-white/[0.10] font-mono text-[9px] text-gray-600 dark:text-gray-300">1–{menu.length}</kbd>
          {" "}jump · {" "}
          <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-white/[0.10] font-mono text-[9px] text-gray-600 dark:text-gray-300">Esc</kbd>
          {" "}close
        </p>
      </div>
    </motion.div>
  );

  /* ── MOBILE PANEL (bottom sheet) ── */
  const MobilePanel = () => (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, pointerEvents: "none" }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={close}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 350, damping: 35 }}
        className="fixed bottom-0 left-0 right-0 z-50
          bg-white dark:bg-[#13131f]
          rounded-t-3xl overflow-hidden
          border-t border-l border-r border-gray-200 dark:border-white/[0.10]"
        style={{ maxHeight: "88vh", boxShadow: "0 -8px 40px rgba(0,0,0,0.35)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-white/20"/>
        </div>

        <PanelHeader />

        {/* Nav grid — 3 columns on mobile for compact layout */}
        <div className="p-3 overflow-y-auto grid grid-cols-3 gap-1.5" style={{ maxHeight: "calc(88vh - 160px)" }}>
          {menu.map((item, i) => (
            <NavItem key={item.key} item={item} index={i} />
          ))}
        </div>

        <PanelUtility />
      </motion.div>
    </>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-neutral-950 text-gray-900 dark:text-white overflow-hidden">

      {/* ── FLOATING NAV ── */}
      <div ref={navRef} className="fixed bottom-5 left-5 z-50">

        <AnimatePresence>
          {open && !isMobile && <DesktopPanel />}
        </AnimatePresence>

        {/* Trigger button */}
        <motion.button
          onClick={toggle}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.88 }}
          className="relative w-12 h-12 rounded-full flex items-center justify-center shadow-xl focus:outline-none"
          style={{
            background: open ? "#1e1e2e" : activeColor.bg,
            boxShadow: open
              ? "0 0 0 2px rgba(255,255,255,0.15), 0 8px 32px rgba(0,0,0,0.4)"
              : `0 0 0 3px white, 0 0 24px ${activeColor.glow}, 0 8px 24px ${activeColor.glow}`,
          }}
          title="Navigation (` or F1)"
        >
          <motion.div animate={{ rotate: open ? 45 : 0, scale: open ? 0.8 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
            {open ? (
              <X size={18} color="white"/>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="4"  cy="4"  r="2" fill="white"/>
                <circle cx="9"  cy="4"  r="2" fill="white" fillOpacity="0.7"/>
                <circle cx="14" cy="4"  r="2" fill="white" fillOpacity="0.4"/>
                <circle cx="4"  cy="9"  r="2" fill="white" fillOpacity="0.7"/>
                <circle cx="9"  cy="9"  r="2" fill="white"/>
                <circle cx="14" cy="9"  r="2" fill="white" fillOpacity="0.7"/>
                <circle cx="4"  cy="14" r="2" fill="white" fillOpacity="0.4"/>
                <circle cx="9"  cy="14" r="2" fill="white" fillOpacity="0.7"/>
                <circle cx="14" cy="14" r="2" fill="white"/>
              </svg>
            )}
          </motion.div>

          {!open && (
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background: activeColor.bg }}
              animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </motion.button>
      </div>

      {/* Mobile bottom sheet rendered via portal-like approach */}
      <AnimatePresence>
        {open && isMobile && <MobilePanel />}
      </AnimatePresence>

      {/* ── MAIN CONTENT ── */}
      <main className={`flex-1 overflow-hidden ${!isPOS ? "overflow-y-auto p-6 pb-10" : ""} ${!online ? "pt-9" : ""}`}>
        {children}
      </main>
    </div>
  );
}
