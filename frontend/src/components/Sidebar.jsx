import {
  LayoutDashboard, ShoppingCart, Package, Tags,
  Users, BarChart3, ChevronLeft, ChevronRight,
  CreditCard, LogOut, Moon, Sun, Pencil, Check, X,
  Shield, Store, UserCircle2, Globe, Truck, Layers, Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useUIScale } from "../context/UIScaleContext";
import toast from "react-hot-toast";

export default function Sidebar({ user, page, setPage, store }) {
  const [collapsed, setCollapsed]   = useState(false);
  const { dark, setDark }           = useTheme();
  const { logout, storeName, updateStore } = useAuth();
  const { level, increase, decrease, max } = useUIScale();

  const [editing,   setEditing]   = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [saving,    setSaving]    = useState(false);

  const startEdit  = () => { setNameInput(storeName); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    try {
      await updateStore({ name: nameInput.trim() });
      toast.success("Store name updated");
      setEditing(false);
    } catch {
      toast.error("Failed to update store name");
    } finally { setSaving(false); }
  };

  const Item = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setPage(id)}
      title={collapsed ? label : ""}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all
        ${page === id
          ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]"
          : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
    >
      {Icon && <Icon size={18} className="flex-shrink-0" />}
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
    </button>
  );

  const isAdmin      = user?.role === "admin";

  return (
    <div className={`h-screen flex flex-col bg-white dark:bg-gray-900 border-r dark:border-gray-800 shadow-sm transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}>

      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-4 border-b dark:border-gray-800 min-h-[60px]">
        {!collapsed && (
          <div className="flex-1 min-w-0 mr-2">
            {editing ? (
              <div className="flex items-center gap-1">
                <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                  className="flex-1 min-w-0 text-sm font-bold bg-transparent border-b-2 border-blue-500 outline-none dark:text-white px-0.5"/>
                <button onClick={saveEdit} disabled={saving}
                  className="p-1 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition">
                  <Check size={14}/>
                </button>
                <button onClick={cancelEdit}
                  className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <X size={14}/>
                </button>
              </div>
            ) : (
              <button onClick={startEdit} title="Click to rename your store"
                className="group flex items-center gap-1.5 w-full text-left">
                <span className="font-bold text-base dark:text-white truncate">🧾 {storeName}</span>
                <Pencil size={11} className="shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition"/>
              </button>
            )}
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 shrink-0">
          {collapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
        </button>
      </div>

      {/* USER CHIP */}
      {!collapsed && (
        <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Logged in as</p>
          <p className="font-semibold text-sm dark:text-white">{user?.username}</p>
          <span className="text-xs text-blue-500 capitalize">{user?.role}</span>
        </div>
      )}

      {/* MENU */}
      <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto mt-2">
        {isAdmin && (
          <>
            <Item id="dashboard"     label="Dashboard"      icon={LayoutDashboard} />
            <Item id="users"         label="Users"          icon={Users} />
            <Item id="adminpanel"    label="Admin Panel"    icon={Shield} />
            <Item id="storesettings" label="Store Settings" icon={Store} />
          </>
        )}
        {isAdmin && (
          <>
            <Item id="onlineorders"    label="Online Orders"    icon={Globe}  />
            <Item id="pendingpayments" label="Pending Payments" icon={Truck}  />
            <Item id="batches"         label="Batch Tracking"   icon={Layers}   />
            <Item id="aiinsights"      label="AI Insights"      icon={Sparkles} />
          </>
        )}
        <Item id="pos"        label="Point of Sale" icon={ShoppingCart} />
        <Item id="products"   label="Products"      icon={Package} />
        <Item id="categories" label="Categories"    icon={Tags} />
        <Item id="customers"  label="Customers"     icon={UserCircle2} />
        {isAdmin && <Item id="reports"    label="Reports"       icon={BarChart3} />}
        <Item id="paylater"   label="Pay Later"     icon={CreditCard} />
      </nav>

      {/* FOOTER */}
      <div className="p-3 flex flex-col gap-2 border-t dark:border-gray-800">

        {/* UI Scale control */}
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800"
          title={collapsed ? "UI Size" : ""}>
          <button
            onClick={decrease} disabled={level === 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg font-bold text-base
              text-gray-600 dark:text-gray-300
              shadow-[0_3px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_3px_0_0_rgba(0,0,0,0.4)]
              active:shadow-none active:translate-y-[3px]
              bg-white dark:bg-gray-700
              hover:bg-gray-50 dark:hover:bg-gray-600
              disabled:opacity-30 disabled:shadow-none disabled:translate-y-0
              transition-[transform,box-shadow] duration-75 select-none shrink-0">
            −
          </button>
          {!collapsed && (
            <span className="flex-1 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 select-none">
              Size {level + 1}/{max + 1}
            </span>
          )}
          <button
            onClick={increase} disabled={level === max}
            className="w-8 h-8 flex items-center justify-center rounded-lg font-bold text-base
              text-gray-600 dark:text-gray-300
              shadow-[0_3px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_3px_0_0_rgba(0,0,0,0.4)]
              active:shadow-none active:translate-y-[3px]
              bg-white dark:bg-gray-700
              hover:bg-gray-50 dark:hover:bg-gray-600
              disabled:opacity-30 disabled:shadow-none disabled:translate-y-0
              transition-[transform,box-shadow] duration-75 select-none shrink-0">
            +
          </button>
        </div>

        <button onClick={() => setDark(!dark)} title={collapsed ? (dark ? "Light Mode" : "Dark Mode") : ""}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-sm">
          {dark ? <Sun size={16}/> : <Moon size={16}/>}
          {!collapsed && <span>{dark ? "Light Mode" : "Dark Mode"}</span>}
        </button>
        <button onClick={logout} title={collapsed ? "Logout" : ""}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-sm">
          <LogOut size={16}/>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}