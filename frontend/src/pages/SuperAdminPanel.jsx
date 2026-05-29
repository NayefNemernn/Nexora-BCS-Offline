import React, { useEffect, useState } from "react";
import {
  getAllStores, getPlatformStats, updateStorePlan, toggleStoreActive, toggleCafeEnabled,
  createStore, deleteStore, resetAdminPassword, impersonateStore,
  sendNotification, getStoreDetails, bulkAction, bulkNotify,
  transferOwner, cloneStore, exportStores, getPlatformAuditLog,
  updateStoreNotes, setWelcomeMessage, getActivityFeed,
  updateSuperAdminProfile, createCashier,
  getStoreUsers, getStoreGlobalStats, createStoreUser, updateStoreUser,
  deleteStoreUser, forceLogoutStoreUser, forceLogoutStoreDevice,
  changeStoreUserPW, getStoreUserSales, clearStoreUserSales, clearStoreUserProducts,
  getSuperAdminProfile, kickSuperAdminDevice, getSuperAdminTelegramChatId,
  getCafeStaffList, createCafeStaffMember, updateCafeStaffMember, deleteCafeStaffMember,
  copyProductsToStore,
} from "../api/superadmin.api";
import { useAuth } from "../context/AuthContext";
import { useSuperAdminTranslation } from "../hooks/useSuperAdminTranslation";
import { useLang } from "../context/LanguageContext";
import toast from "react-hot-toast";
import {
  Users, Wifi, WifiOff, Monitor, Smartphone, LogOut, KeyRound,
  CheckCircle, XCircle, Trash2, Plus, Minus, Eye, TrendingUp,
  DollarSign, ShoppingCart, Activity, Package, ChevronDown, ChevronUp,
  Search, UserPlus, X, RefreshCw,
} from "lucide-react";

/* ── helpers ── */
const PLAN_COLORS = { trial: "bg-yellow-100 text-yellow-700", basic: "bg-blue-100 text-blue-700", pro: "bg-purple-100 text-purple-700", enterprise: "bg-green-100 text-green-700" };
const PLAN_LIMITS = { trial: { maxUsers: 2, maxProducts: 100, days: 14 }, basic: { maxUsers: 5, maxProducts: 500, days: 30 }, pro: { maxUsers: 20, maxProducts: 2000, days: 365 }, enterprise: { maxUsers: 100, maxProducts: 99999, days: 365 } };
const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className={`bg-white dark:bg-[#16161f] rounded-2xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} shadow-2xl shadow-black/30 max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-white/8`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/8">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition text-lg leading-none">✕</button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  </div>
);

export default function SuperAdminPanel() {
  const { user, login } = useAuth();
  const t = useSuperAdminTranslation();
  const { lang } = useLang();
  const TABS = [t.tabStores, t.tabActivity, t.tabAuditLog, t.tabProfile];
  const timeAgo = (date) => { if (!date) return t.never; const s = Math.floor((Date.now() - new Date(date)) / 1000); if (s < 60) return t.justNow; if (s < 3600) return `${Math.floor(s/60)} ${t.mAgo}`; if (s < 86400) return `${Math.floor(s/3600)} ${t.hAgo}`; return new Date(date).toLocaleDateString(); };
  const [tab,      setTab]      = useState(t.tabStores);
  const [stats,    setStats]    = useState(null);
  const [stores,   setStores]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState([]);

  // Store modals
  const [editingPlan,    setEditingPlan]    = useState(null);
  const [planForm,       setPlanForm]       = useState({ plan: "", maxUsers: "", maxProducts: "", expiresAt: "", monthlyPrice: "" });
  const [createModal,    setCreateModal]    = useState(false);
  const [createForm,     setCreateForm]     = useState({ storeName: "", storeType: "market", username: "", password: "", cafeName: "", cafeUsername: "", cafePassword: "", currency: "USD", language: "en", plan: "trial" });
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [resetTarget,    setResetTarget]    = useState(null);
  const [resetPassword,  setResetPassword]  = useState("");
  const [notifyTarget,   setNotifyTarget]   = useState(null);
  const [notifyForm,     setNotifyForm]     = useState({ message: "", type: "info" });
  const [detailStore,    setDetailStore]    = useState(null);
  const [detailData,     setDetailData]     = useState(null);
  const [detailLoading,  setDetailLoading]  = useState(false);
  const [cloneTarget,    setCloneTarget]    = useState(null);
  const [cloneForm,      setCloneForm]      = useState({ newStoreName: "", newUsername: "", newPassword: "" });
  const [copyTarget,     setCopyTarget]     = useState(null);
  const [copyDestId,     setCopyDestId]     = useState("");
  const [copyResult,     setCopyResult]     = useState(null);
  const [copyLoading,    setCopyLoading]    = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferForm,   setTransferForm]   = useState({ newUsername: "", newPassword: "" });
  const [welcomeTarget,  setWelcomeTarget]  = useState(null);
  const [welcomeMsg,     setWelcomeMsg]     = useState("");
  const [notesTarget,    setNotesTarget]    = useState(null);
  const [notesText,      setNotesText]      = useState("");
  const [bulkNotifyModal,  setBulkNotifyModal]  = useState(false);
  const [bulkNotifyForm,   setBulkNotifyForm]   = useState({ message: "", type: "info" });
  const [bulkExtendDays,   setBulkExtendDays]   = useState(30);
  const [profileForm,      setProfileForm]      = useState({ username: user?.username || "", newPassword: "", maxDevices: 1, platformTelegramBotToken: "", platformAdminChatId: "" });
  const [fetchingTgChatId, setFetchingTgChatId] = useState(false);
  const [savingTelegram,   setSavingTelegram]   = useState(false);
  const [profileInfo,      setProfileInfo]      = useState(null);
  const [activity,         setActivity]         = useState([]);
  const [auditLogs,        setAuditLogs]        = useState([]);

  // Store users panel
  const [usersStoreTarget, setUsersStoreTarget] = useState(null);
  const [storeUsers,       setStoreUsers]       = useState([]);
  const [storeStats,       setStoreStats]       = useState(null);
  const [usersLoading,     setUsersLoading]     = useState(false);
  const [usersSearch,      setUsersSearch]      = useState("");
  const [usersTab,         setUsersTab]         = useState("overview");
  const [showUserForm,     setShowUserForm]      = useState(false);
  const [userForm,         setUserForm]          = useState({ username: "", password: "", role: "cashier" });
  const [userPwModal,      setUserPwModal]       = useState(null);
  const [userNewPin,       setUserNewPin]        = useState("");
  const [userSalesModal,   setUserSalesModal]    = useState(null);
  const [userSales,        setUserSales]         = useState([]);
  const [expandedUser,     setExpandedUser]      = useState({});

  // Café staff panel
  const [cafeStaffStore,   setCafeStaffStore]    = useState(null);
  const [cafeStaffList,    setCafeStaffList]      = useState([]);
  const [cafeStaffLoading, setCafeStaffLoading]   = useState(false);
  const [cafeStaffForm,    setCafeStaffForm]      = useState({ name: "", username: "", password: "", role: "staff" });
  const [cafeStaffShowForm,setCafeStaffShowForm]  = useState(false);

  useEffect(() => { loadData(); }, []);
  // Reset to first tab when language switches so tab comparison stays valid
  useEffect(() => { setTab(t.tabStores); }, [lang]);

  const loadData = async () => {
    try { const [s, st] = await Promise.all([getPlatformStats(), getAllStores()]); setStats(s); setStores(st); }
    catch { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === t.tabActivity)  getActivityFeed().then(setActivity).catch(() => toast.error("Failed"));
    if (tab === t.tabAuditLog)  getPlatformAuditLog({ limit: 100 }).then(setAuditLogs).catch(() => toast.error("Failed"));
    if (tab === t.tabProfile)   getSuperAdminProfile().then(info => { setProfileInfo(info); setProfileForm(f => ({ ...f, username: info.username, maxDevices: info.maxDevices || 1, platformTelegramBotToken: info.platformTelegramBotToken || "", platformAdminChatId: info.platformAdminChatId || "" })); }).catch(() => {});
  }, [tab]);

  /* ── Store handlers ── */
  const handleToggle      = async (id) => { try { const r = await toggleStoreActive(id); toast.success(`Store ${r.active ? "activated" : "deactivated"}`); setStores(p => p.map(s => s._id === id ? { ...s, active: r.active } : s)); } catch { toast.error("Failed"); } };
  const handleToggleCafe  = async (id) => { try { const r = await toggleCafeEnabled(id); toast.success(`Café ${r.cafeEnabled ? "enabled" : "disabled"}`); setStores(p => p.map(s => s._id === id ? { ...s, cafeEnabled: r.cafeEnabled } : s)); } catch { toast.error("Failed"); } };
  const openPlanEditor    = (store) => { setEditingPlan(store); const d = PLAN_LIMITS[store.plan] || PLAN_LIMITS.basic; const exp = store.planExpiresAt ? new Date(store.planExpiresAt).toISOString().split("T")[0] : ""; setPlanForm({ plan: store.plan, maxUsers: store.maxUsers || d.maxUsers, maxProducts: store.maxProducts || d.maxProducts, expiresAt: exp, monthlyPrice: store.monthlyPrice || "" }); };
  const handlePlanChange  = (e) => { const d = PLAN_LIMITS[e.target.value]; const exp = new Date(); exp.setDate(exp.getDate() + d.days); setPlanForm(f => ({ ...f, plan: e.target.value, maxUsers: d.maxUsers, maxProducts: d.maxProducts, expiresAt: exp.toISOString().split("T")[0] })); };
  const savePlan          = async () => { try { await updateStorePlan(editingPlan._id, planForm); toast.success("Plan updated"); setEditingPlan(null); loadData(); } catch { toast.error("Failed"); } };
  const handleCreateStore = async () => { try { await createStore(createForm); toast.success("Store created"); setCreateModal(false); setCreateForm({ storeName: "", storeType: "market", username: "", password: "", cafeName: "", cafeUsername: "", cafePassword: "", currency: "USD", language: "en", plan: "trial" }); loadData(); } catch (e) { toast.error(e.response?.data?.message || "Failed"); } };
  const handleDeleteStore = async () => { try { await deleteStore(deleteTarget._id); toast.success("Store deleted"); setDeleteTarget(null); loadData(); } catch { toast.error("Failed"); } };
  const handleResetPW     = async () => { if (!resetPassword.trim()) return toast.error("Enter password"); try { await resetAdminPassword(resetTarget._id, { newPassword: resetPassword }); toast.success("Password reset"); setResetTarget(null); setResetPassword(""); } catch { toast.error("Failed"); } };
  const handleImpersonate = async (store) => { try { const d = await impersonateStore(store._id); toast.success(`Logged in as ${d.user.username}`); login(d); } catch { toast.error("Failed"); } };
  const handleNotify      = async () => { if (!notifyForm.message.trim()) return toast.error("Enter message"); try { await sendNotification(notifyTarget._id, notifyForm); toast.success("Sent"); setNotifyTarget(null); setNotifyForm({ message: "", type: "info" }); } catch { toast.error("Failed"); } };
  const handleClone       = async () => { try { await cloneStore(cloneTarget._id, cloneForm); toast.success("Cloned"); setCloneTarget(null); setCloneForm({ newStoreName: "", newUsername: "", newPassword: "" }); loadData(); } catch (e) { toast.error(e.response?.data?.message || "Failed"); } };
  const handleCopyProducts = async () => {
    if (!copyDestId) return toast.error("Please select a destination store");
    setCopyLoading(true);
    setCopyResult(null);
    try {
      const res = await copyProductsToStore(copyTarget._id, copyDestId);
      setCopyResult(res);
      toast.success(res.message);
    } catch (e) {
      toast.error(e.response?.data?.message || "Copy failed");
    } finally {
      setCopyLoading(false);
    }
  };
  const handleTransfer    = async () => { try { await transferOwner(transferTarget._id, transferForm); toast.success("Transferred"); setTransferTarget(null); setTransferForm({ newUsername: "", newPassword: "" }); loadData(); } catch (e) { toast.error(e.response?.data?.message || "Failed"); } };
  const handleWelcome     = async () => { try { await setWelcomeMessage(welcomeTarget._id, { welcomeMessage: welcomeMsg }); toast.success("Saved"); setWelcomeTarget(null); } catch { toast.error("Failed"); } };
  const handleNotes       = async () => { try { await updateStoreNotes(notesTarget._id, { notes: notesText }); toast.success("Saved"); setNotesTarget(null); } catch { toast.error("Failed"); } };
  const handleBulkNotify  = async () => { if (!bulkNotifyForm.message.trim()) return toast.error("Enter message"); try { const r = await bulkNotify({ ...bulkNotifyForm, storeIds: selected.length ? selected : undefined }); toast.success(r.message); setBulkNotifyModal(false); } catch { toast.error("Failed"); } };
  const handleBulkAction  = async (action) => { if (!selected.length) return toast.error("Select stores first"); try { const r = await bulkAction({ storeIds: selected, action, days: bulkExtendDays }); toast.success(r.message); setSelected([]); loadData(); } catch { toast.error("Failed"); } };
  const handleExport      = async () => { try { const data = await exportStores(); const csv = [Object.keys(data[0]).join(","), ...data.map(r => Object.values(r).join(","))].join("\n"); const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv); a.download = "stores.csv"; a.click(); toast.success("Exported"); } catch { toast.error("Failed"); } };
  const handleProfile     = async () => { try { const r = await updateSuperAdminProfile(profileForm); toast.success(r.message); setProfileInfo(p => p ? { ...p, maxDevices: r.maxDevices || profileForm.maxDevices } : p); } catch (e) { toast.error(e.response?.data?.message || "Failed"); } };

  const handleSaveTelegram = async () => {
    setSavingTelegram(true);
    try {
      await updateSuperAdminProfile({ platformTelegramBotToken: profileForm.platformTelegramBotToken, platformAdminChatId: profileForm.platformAdminChatId });
      toast.success("Telegram settings saved");
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setSavingTelegram(false); }
  };

  const handleGetTelegramChatId = async () => {
    setFetchingTgChatId(true);
    try {
      const res = await getSuperAdminTelegramChatId();
      setProfileForm(f => ({ ...f, platformAdminChatId: String(res.id) }));
      toast.success(`Got Chat ID: ${res.id} (${res.name})`);
    } catch (e) { toast.error(e.response?.data?.message || "Send a message to the bot first"); }
    finally { setFetchingTgChatId(false); }
  };
  const handleKickOwnDevice = async (deviceId, name) => {
    if (!window.confirm(`Kick session "${name || "Unknown device"}"?`)) return;
    try {
      await kickSuperAdminDevice(deviceId);
      toast.success("Session kicked");
      getSuperAdminProfile().then(info => setProfileInfo(info)).catch(() => {});
    } catch { toast.error("Failed to kick session"); }
  };

  const openDetails = async (store) => {
    setDetailStore(store); setDetailLoading(true);
    try { setDetailData(await getStoreDetails(store._id)); } catch { toast.error("Failed"); } finally { setDetailLoading(false); }
  };

  /* ── Store Users handlers ── */
  const openStoreUsers = async (store) => {
    setUsersStoreTarget(store); setUsersLoading(true); setStoreUsers([]); setStoreStats(null); setUsersTab("overview");
    try {
      const [users, stats] = await Promise.all([getStoreUsers(store._id), getStoreGlobalStats(store._id)]);
      setStoreUsers(users); setStoreStats(stats);
    } catch { toast.error("Failed to load users"); }
    finally { setUsersLoading(false); }
  };

  const reloadStoreUsers = async () => {
    if (!usersStoreTarget) return;
    try {
      const [users, stats] = await Promise.all([getStoreUsers(usersStoreTarget._id), getStoreGlobalStats(usersStoreTarget._id)]);
      setStoreUsers(users); setStoreStats(stats);
    } catch { toast.error("Failed"); }
  };

  const handleCreateStoreUser  = async (e) => { e.preventDefault(); try { await createStoreUser(usersStoreTarget._id, userForm); toast.success("User created"); setShowUserForm(false); setUserForm({ username: "", password: "", role: "cashier" }); reloadStoreUsers(); } catch (err) { toast.error(err.response?.data?.message || "Failed"); } };
  const handleToggleStoreUser  = async (u) => { try { await updateStoreUser(usersStoreTarget._id, u._id, { active: !u.active }); toast.success(`${u.username} ${u.active ? "disabled" : "enabled"}`); reloadStoreUsers(); } catch { toast.error("Failed"); } };
  const handleDeleteStoreUser  = async (u) => { if (!confirm(`Delete "${u.username}"?`)) return; try { await deleteStoreUser(usersStoreTarget._id, u._id); toast.success("Deleted"); reloadStoreUsers(); } catch { toast.error("Failed"); } };
  const handleForceLogout      = async (u) => { try { await forceLogoutStoreUser(usersStoreTarget._id, u._id); toast.success(`${u.username} logged out`); reloadStoreUsers(); } catch { toast.error("Failed"); } };
  const handleKickDevice       = async (u, deviceId, name) => { try { await forceLogoutStoreDevice(usersStoreTarget._id, u._id, { deviceId }); toast.success(`Device "${name}" kicked`); reloadStoreUsers(); } catch { toast.error("Failed"); } };
  const handleChangeUserPW     = async () => { if (userNewPin.length < 4) return toast.error("Min 4 chars"); try { await changeStoreUserPW(usersStoreTarget._id, userPwModal._id, { newPassword: userNewPin }); toast.success("Password changed"); setUserPwModal(null); setUserNewPin(""); } catch { toast.error("Failed"); } };
  const handleViewSales        = async (u) => { setUserSalesModal(u); try { setUserSales(await getStoreUserSales(usersStoreTarget._id, u._id)); } catch { toast.error("Failed"); } };
  const handleClearUserSales   = async (u) => { if (!confirm(`Delete ALL sales for "${u.username}"?`)) return; try { const r = await clearStoreUserSales(usersStoreTarget._id, u._id); toast.success(r.message); reloadStoreUsers(); } catch { toast.error("Failed"); } };
  const handleClearUserProducts = async (u) => { if (!confirm(`Delete ALL products for this store?`)) return; try { const r = await clearStoreUserProducts(usersStoreTarget._id, u._id); toast.success(r.message); reloadStoreUsers(); } catch { toast.error("Failed"); } };
  const handleUpdateMaxDevices  = async (u, newMax) => { if (newMax < 1 || newMax > 10) return; try { await updateStoreUser(usersStoreTarget._id, u._id, { maxDevices: newMax }); reloadStoreUsers(); } catch { toast.error("Failed"); } };

  /* ── Café staff handlers ── */
  const openCafeStaff = async (store) => {
    setCafeStaffStore(store); setCafeStaffLoading(true); setCafeStaffList([]); setCafeStaffShowForm(false);
    setCafeStaffForm({ name: "", username: "", password: "", role: "staff" });
    try { setCafeStaffList(await getCafeStaffList(store._id)); } catch { toast.error("Failed to load café staff"); }
    finally { setCafeStaffLoading(false); }
  };
  const handleCreateCafeStaff = async (e) => {
    e.preventDefault();
    if (!cafeStaffForm.name || !cafeStaffForm.username || !cafeStaffForm.password)
      return toast.error("All fields required");
    try {
      const s = await createCafeStaffMember(cafeStaffStore._id, cafeStaffForm);
      setCafeStaffList(p => [s, ...p]);
      setCafeStaffForm({ name: "", username: "", password: "", role: "staff" });
      setCafeStaffShowForm(false);
      toast.success("Staff member created");
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };
  const handleToggleCafeStaff = async (s) => {
    try {
      const u = await updateCafeStaffMember(cafeStaffStore._id, s._id, { isActive: !s.isActive });
      setCafeStaffList(p => p.map(x => x._id === s._id ? { ...x, isActive: u.isActive } : x));
      toast.success(`${s.name} ${u.isActive ? "enabled" : "disabled"}`);
    } catch { toast.error("Failed"); }
  };
  const handleDeleteCafeStaff = async (s) => {
    if (!confirm(`Delete staff "${s.name}"?`)) return;
    try {
      await deleteCafeStaffMember(cafeStaffStore._id, s._id);
      setCafeStaffList(p => p.filter(x => x._id !== s._id));
      toast.success("Deleted");
    } catch { toast.error("Failed"); }
  };

  const toggleSelect = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const selectAll    = () => setSelected(filtered.map(s => s._id));
  const clearSelect  = () => setSelected([]);

  const filtered      = stores.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.owner?.username?.toLowerCase().includes(search.toLowerCase()));
  const filteredUsers = storeUsers.filter(u => u.username.toLowerCase().includes(usersSearch.toLowerCase()));

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#f4f6fb] dark:bg-[#0d0d15]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
        <p className="text-sm font-semibold text-gray-400">{t.detailLoading}</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f2f4f8] dark:bg-[#0c0c14] overflow-hidden" dir={lang === "ar" ? "rtl" : "ltr"}>

      {/* ══════════════════════ SIDEBAR ══════════════════════ */}
      <aside className="w-[220px] shrink-0 bg-white dark:bg-[#10101c] border-r border-gray-200 dark:border-white/[0.05] flex flex-col overflow-hidden">

        {/* Brand */}
        <div className="flex items-center gap-3 px-5 h-[58px] border-b border-gray-100 dark:border-white/[0.04] shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-600/30 shrink-0">
            <span className="text-sm">🌐</span>
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-[13px] font-black text-gray-900 dark:text-white tracking-tight">NEXORA</p>
            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-[0.18em]">Super Admin</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-4 pb-2 space-y-0.5 overflow-y-auto">
          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] px-3 mb-3">Menu</p>
          {[
            { key: t.tabStores,   icon: "🏪", badge: stores.length },
            { key: t.tabActivity, icon: "⚡" },
            { key: t.tabAuditLog, icon: "📋" },
            { key: t.tabProfile,  icon: "👤" },
          ].map(({ key: tk, icon, badge }) => (
            <button key={tk} onClick={() => setTab(tk)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all text-left ${
                tab === tk
                  ? "bg-blue-50 dark:bg-blue-600/[0.15] text-blue-700 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-gray-100"
              }`}>
              <span className="text-[15px] leading-none">{icon}</span>
              <span className="flex-1 truncate">{tk}</span>
              {badge !== undefined && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                  tab === tk ? "bg-blue-100 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300" : "bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-gray-500"
                }`}>{badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Platform quick stats */}
        {stats && (
          <div className="mx-3 mb-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04] shrink-0">
            <p className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-[0.18em] mb-2.5">Platform</p>
            {[
              { label: "Active Stores", value: `${stats.activeStores} / ${stats.totalStores}` },
              { label: "Total Users",   value: stats.totalUsers },
              { label: "Revenue",       value: fmt(stats.totalRevenue) },
              { label: "Expiring",      value: stats.expiringSoon, warn: stats.expiringSoon > 0 },
              { label: "Expired",       value: stats.expired,      danger: stats.expired > 0 },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between py-1">
                <span className="text-[11px] text-gray-400 dark:text-gray-500">{s.label}</span>
                <span className={`text-[11px] font-black ${
                  s.danger && s.value > 0 ? "text-red-500 dark:text-red-400"
                  : s.warn && s.value > 0  ? "text-amber-500 dark:text-amber-400"
                  : "text-gray-800 dark:text-gray-200"
                }`}>{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ══════════════════════ MAIN AREA ══════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top bar ── */}
        <header className="h-[58px] bg-white dark:bg-[#10101c] border-b border-gray-200 dark:border-white/[0.05] flex items-center gap-4 px-6 shrink-0">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-xs text-gray-400 dark:text-gray-600 font-medium">Super Admin</span>
            <span className="text-gray-300 dark:text-gray-700">/</span>
            <span className="text-sm font-bold text-gray-800 dark:text-white truncate">{tab}</span>
          </div>
          {tab === t.tabStores && (
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
              <input type="text" placeholder="Search stores…" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 dark:border-white/[0.08] rounded-xl text-[13px] bg-gray-50 dark:bg-white/[0.04] dark:text-white w-56 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition placeholder-gray-400"/>
            </div>
          )}
          <button onClick={() => setCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-bold shadow-md shadow-blue-600/25 transition shrink-0">
            <span className="text-base leading-none">+</span> {t.createStore}
          </button>
        </header>

        {/* ── Stats strip ── */}
        {stats && (
          <div className="bg-white dark:bg-[#10101c] border-b border-gray-200 dark:border-white/[0.05] px-6 py-0 flex items-stretch overflow-x-auto shrink-0">
            {[
              { icon: "🏪", label: "Stores",   value: stats.totalStores },
              { icon: "✅", label: "Active",   value: stats.activeStores },
              { icon: "👤", label: "Users",    value: stats.totalUsers },
              { icon: "📦", label: "Products", value: stats.totalProducts },
              { icon: "💰", label: "Revenue",  value: fmt(stats.totalRevenue) },
              { icon: "⚠️", label: "Expiring", value: stats.expiringSoon, warn: stats.expiringSoon > 0 },
              { icon: "🚨", label: "Expired",  value: stats.expired,      danger: stats.expired > 0 },
            ].map((s, i) => (
              <div key={s.label} className={`flex items-center gap-3 px-5 py-3 border-r border-gray-100 dark:border-white/[0.04] whitespace-nowrap hover:bg-gray-50 dark:hover:bg-white/[0.02] transition ${
                i === 0 ? "pl-0" : ""
              }`}>
                <span className="text-base leading-none">{s.icon}</span>
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-600 leading-none font-medium">{s.label}</p>
                  <p className={`text-[15px] font-black leading-tight mt-0.5 ${
                    s.danger && s.value > 0 ? "text-red-600 dark:text-red-400"
                    : s.warn && s.value > 0  ? "text-amber-600 dark:text-amber-400"
                    : "text-gray-900 dark:text-white"
                  }`}>{s.value}</p>
                </div>
              </div>
            ))}
            {stats?.planDistribution?.length > 0 && (
              <div className="flex items-center gap-2 px-5">
                {stats.planDistribution.map(p => (
                  <span key={p._id} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap ${PLAN_COLORS[p._id] || "bg-gray-100 text-gray-600"}`}>
                    {p.count} {p._id}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-auto p-5 space-y-5">

      {/* ── STORES TAB ── */}
      {tab === t.tabStores && (
        <div className="bg-white dark:bg-[#13131f] rounded-2xl shadow-sm border border-gray-100 dark:border-white/[0.05]">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.05] flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-gray-800 dark:text-white">{t.allStores}
                <span className="ml-2 text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{stores.length}</span>
              </h2>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
              <input type="text" placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:bg-gray-800 dark:text-white w-48 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition"/>
            </div>
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold transition">
              📊 {t.exportCsv}
            </button>
            {!selected.length
              ? <button onClick={selectAll} className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-200 font-semibold transition">{t.selectAll}</button>
              : <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex-wrap">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{selected.length} {t.selected}</span>
                  <div className="w-px h-4 bg-blue-200 dark:bg-blue-700"/>
                  <button onClick={() => handleBulkAction("enable")}  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-semibold transition">{t.btnEnable}</button>
                  <button onClick={() => handleBulkAction("disable")} className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-semibold transition">{t.btnDisable}</button>
                  <button onClick={() => handleBulkAction("extend")}  className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 font-semibold transition">+{bulkExtendDays}d</button>
                  <input type="number" value={bulkExtendDays} onChange={e => setBulkExtendDays(+e.target.value)} className="w-12 text-xs border border-blue-200 dark:border-blue-700 rounded-lg px-1.5 py-1 dark:bg-blue-900/30 dark:text-blue-300 outline-none text-center" />
                  <button onClick={() => setBulkNotifyModal(true)} className="px-2 py-1 text-xs bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 font-semibold transition">{t.notify}</button>
                  <button onClick={clearSelect} className="px-2 py-1 text-xs bg-gray-200 text-gray-500 rounded-lg hover:bg-gray-300 font-semibold transition">{t.clear}</button>
                </div>
            }
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-white/[0.05]">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" className="rounded" checked={selected.length === filtered.length && filtered.length > 0} onChange={e => e.target.checked ? selectAll() : clearSelect()} />
                  </th>
                  {[t.colStore, t.colOwner, t.colPlan, t.colExpires, t.colUsers, t.colProducts, t.colRevenue, t.colPrice, t.colStatus].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map(store => {
                  const expiry = store.planExpiresAt ? new Date(store.planExpiresAt) : null;
                  const expired = expiry && expiry < new Date();
                  const daysLeft = expiry ? Math.ceil((expiry - new Date()) / 86400000) : null;
                  return (
                    <tr key={store._id} className={`group transition-colors ${selected.includes(store._id) ? "bg-blue-50 dark:bg-blue-900/10" : "hover:bg-gray-50/80 dark:hover:bg-gray-800/40"}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" className="rounded" checked={selected.includes(store._id)} onChange={() => toggleSelect(store._id)} />
                      </td>

                      {/* Store name + slug */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-sm text-gray-800 dark:text-white">{store.name}</div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-gray-400 font-mono">{store.slug}</span>
                          {store.storeType === "cafe" && <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">☕ Café</span>}
                          {store.storeType === "both" && <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">🏪+☕</span>}
                          {store.internalNotes && <span className="text-[9px] text-amber-600 dark:text-amber-400">📝 note</span>}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">{store.owner?.username || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${PLAN_COLORS[store.plan] || "bg-gray-100 text-gray-600"}`}>{store.plan}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {expiry ? (
                          <span className={`px-2 py-1 rounded-lg ${expired ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : daysLeft <= 7 ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`}>
                            {expired ? "Expired" : `${daysLeft}d`}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-center font-semibold text-gray-600 dark:text-gray-300">{store.userCount ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-center font-semibold text-gray-600 dark:text-gray-300">{store.productCount ?? "—"}</td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200">${(store.totalRevenue || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{store.monthlyPrice ? `$${store.monthlyPrice}` : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${store.active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${store.active ? "bg-green-500" : "bg-red-500"}`}/>
                          {store.active ? t.statusActive : t.statusOff}
                        </span>
                      </td>

                      {/* ── Grouped actions ── */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">

                          {/* Group 1: Core access */}
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => openDetails(store)}      className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition whitespace-nowrap">View</button>
                            <button onClick={() => openStoreUsers(store)}   className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 transition whitespace-nowrap">👥 Users</button>
                            <button onClick={() => openPlanEditor(store)}   className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 transition whitespace-nowrap">Plan</button>
                          </div>

                          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5"/>

                          {/* Group 2: Account control */}
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => handleToggle(store._id)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition whitespace-nowrap ${store.active ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200"}`}>
                              {store.active ? t.btnDisable : t.btnEnable}
                            </button>
                            <button onClick={() => handleImpersonate(store)} className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 transition whitespace-nowrap">Login As</button>
                            <button onClick={() => { setResetTarget(store); setResetPassword(""); }} className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 transition whitespace-nowrap">Reset PW</button>
                          </div>

                          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5"/>

                          {/* Group 3: Communication */}
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => setNotifyTarget(store)}                                          className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 transition whitespace-nowrap">Notify</button>
                            <button onClick={() => { setWelcomeTarget(store); setWelcomeMsg(store.welcomeMessage || ""); }} className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 hover:bg-pink-200 transition whitespace-nowrap">Welcome</button>
                            <button onClick={() => { setNotesTarget(store); setNotesText(store.internalNotes || ""); }}    className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 transition whitespace-nowrap">Notes</button>
                          </div>

                          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5"/>

                          {/* Group 4: Management */}
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => setTransferTarget(store)}                                     className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 transition whitespace-nowrap">Transfer</button>
                            <button onClick={() => setCloneTarget(store)}                                        className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-200 transition whitespace-nowrap">Clone</button>
                            <button onClick={() => { setCopyTarget(store); setCopyDestId(""); setCopyResult(null); }} className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 transition whitespace-nowrap">📦 Copy</button>
                          </div>

                          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5"/>

                          {/* Group 5: Café */}
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => handleToggleCafe(store._id)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition whitespace-nowrap ${store.cafeEnabled ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200"}`}>
                              ☕ {store.cafeEnabled ? "Café ON" : "Café OFF"}
                            </button>
                            <button onClick={() => openCafeStaff(store)} className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 transition whitespace-nowrap">👨‍🍳 Staff</button>
                          </div>

                          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5"/>

                          {/* Group 6: Danger */}
                          <button onClick={() => setDeleteTarget(store)} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 transition whitespace-nowrap">
                            🗑 {t.btnDelete}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-14 text-center">
                      <div className="text-3xl mb-2">🏪</div>
                      <p className="text-sm font-semibold text-gray-400">{t.noStoresFound}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ACTIVITY TAB ── */}
      {tab === t.tabActivity && (
        <div className="bg-white dark:bg-[#13131f] rounded-2xl shadow-sm border border-gray-100 dark:border-white/[0.05]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.05]">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <h2 className="text-base font-bold text-gray-800 dark:text-white">{t.recentActivity}</h2>
            </div>
            <button onClick={() => getActivityFeed().then(setActivity)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 font-semibold transition">
              <RefreshCw size={11}/> {t.refresh}
            </button>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-[65vh] overflow-y-auto">
            {activity.map((item, i) => {
              const typeMap = {
                sale:  { icon: "💳", color: "bg-green-100 dark:bg-green-900/30",  text: "text-green-600 dark:text-green-400" },
                user:  { icon: "👤", color: "bg-blue-100 dark:bg-blue-900/30",   text: "text-blue-600 dark:text-blue-400"  },
                store: { icon: "🏪", color: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400" },
              };
              const style = typeMap[item.type] || typeMap.store;
              return (
                <div key={i} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <div className={`w-9 h-9 rounded-xl ${style.color} flex items-center justify-center shrink-0 text-base`}>{style.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-white leading-snug">
                      {item.type === "sale"  && <><span className="font-black text-green-600">${item.amount?.toFixed(2)}</span> <span className="text-gray-500">{t.saleAt}</span> <span className={`font-semibold ${style.text}`}>{item.store}</span></>}
                      {item.type === "user"  && <><span className="text-gray-500">{t.newUser}</span> <span className="font-bold">{item.role}</span> <span className={`font-semibold ${style.text}`}>@{item.username}</span> <span className="text-gray-500">{t.at}</span> {item.store}</>}
                      {item.type === "store" && <><span className="text-gray-500">{t.newStore}</span> <span className="font-bold">{item.name}</span> <span className="text-gray-400">— {item.plan}</span></>}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(item.time).toLocaleString()}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${style.color} ${style.text} shrink-0 uppercase tracking-wide`}>{item.type}</span>
                </div>
              );
            })}
            {activity.length === 0 && (
              <div className="text-center py-16">
                <div className="text-4xl mb-2">⚡</div>
                <p className="text-sm font-semibold text-gray-400">{t.noRecentActivity}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AUDIT LOG TAB ── */}
      {tab === t.tabAuditLog && (
        <div className="bg-white dark:bg-[#13131f] rounded-2xl shadow-sm border border-gray-100 dark:border-white/[0.05]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.05]">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <h2 className="text-base font-bold text-gray-800 dark:text-white">{t.platformAuditLog}</h2>
            </div>
            <button onClick={() => getPlatformAuditLog({ limit: 100 }).then(setAuditLogs)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 font-semibold transition">
              <RefreshCw size={11}/> {t.refresh}
            </button>
          </div>
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-white/[0.05]">
                  {[t.auditColStore, t.auditColUser, t.auditColAction, t.auditColDesc, t.auditColTime].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {auditLogs.map(log => {
                  const actionColor = log.action?.includes("delete") || log.action?.includes("DELETE") ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    : log.action?.includes("create") || log.action?.includes("CREATE") ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : log.action?.includes("update") || log.action?.includes("UPDATE") ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    : log.action?.includes("login") || log.action?.includes("LOGIN") ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
                  return (
                    <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-4 py-3 text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">{log.storeId?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200">@{log.username}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${actionColor}`}>{log.action}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">{log.description}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
                {auditLogs.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-14 text-center">
                    <div className="text-3xl mb-2">📋</div>
                    <p className="text-sm font-semibold text-gray-400">{t.noAuditLogs}</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PROFILE TAB ── */}
      {tab === t.tabProfile && (
        <div className="grid lg:grid-cols-2 gap-5 max-w-3xl">

          {/* Credentials card */}
          <div className="bg-white dark:bg-[#13131f] rounded-2xl shadow-sm border border-gray-100 dark:border-white/[0.05]">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/[0.05]">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="text-lg">👤</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-white">{t.superAdminProfile}</h2>
                <p className="text-xs text-gray-400">Credentials &amp; access</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t.usernameLabel}</label>
                <input type="text" value={profileForm.username} onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 dark:bg-gray-800 dark:text-white text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t.newPasswordLabel}</label>
                <input type="text" placeholder={t.newPasswordPh} value={profileForm.newPassword} onChange={e => setProfileForm(f => ({ ...f, newPassword: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 dark:bg-gray-800 dark:text-white text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition"/>
              </div>

              {/* Max devices */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Max Devices
                  {profileInfo && <span className="ml-2 normal-case font-normal text-gray-400">({profileInfo.activeDevices} currently active)</span>}
                </label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <Smartphone size={14} className="text-blue-500 shrink-0"/>
                  <span className="text-sm text-gray-600 dark:text-gray-300 flex-1">Simultaneous logins allowed</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setProfileForm(f => ({ ...f, maxDevices: Math.max(1, (f.maxDevices || 1) - 1) }))}
                      disabled={(profileForm.maxDevices || 1) <= 1}
                      className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 transition">
                      <Minus size={12}/>
                    </button>
                    <span className="text-base font-black w-7 text-center text-gray-800 dark:text-white">{profileForm.maxDevices || 1}</span>
                    <button type="button" onClick={() => setProfileForm(f => ({ ...f, maxDevices: Math.min(10, (f.maxDevices || 1) + 1) }))}
                      disabled={(profileForm.maxDevices || 1) >= 10}
                      className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 transition">
                      <Plus size={12}/>
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={handleProfile} className="w-full bg-blue-600 text-white rounded-xl py-2.5 font-bold text-sm hover:bg-blue-700 shadow shadow-blue-500/20 transition">{t.saveProfile}</button>
            </div>
          </div>

          {/* Telegram Notifications card */}
          <div className="bg-white dark:bg-[#13131f] rounded-2xl shadow-sm border border-gray-100 dark:border-white/[0.05]">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/[0.05]">
              <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                <span className="text-lg">✈️</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-white">Telegram Notifications</h2>
                <p className="text-xs text-gray-400">Get alerted on new free trial registrations</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Bot Token (from @BotFather)</label>
                <input
                  type="text"
                  placeholder="1234567890:AAFxxxxx"
                  value={profileForm.platformTelegramBotToken}
                  onChange={e => setProfileForm(f => ({ ...f, platformTelegramBotToken: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 dark:bg-gray-800 dark:text-white text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Your Chat ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="123456789"
                    value={profileForm.platformAdminChatId}
                    onChange={e => setProfileForm(f => ({ ...f, platformAdminChatId: e.target.value }))}
                    className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 dark:bg-gray-800 dark:text-white text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition font-mono"
                  />
                  <button
                    onClick={handleGetTelegramChatId}
                    disabled={fetchingTgChatId || !profileForm.platformTelegramBotToken}
                    className="px-3 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition whitespace-nowrap"
                  >
                    {fetchingTgChatId ? "..." : "Get My ID"}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">Open Telegram → send any message to the bot → click "Get My ID"</p>
              </div>
              <button
                onClick={handleSaveTelegram}
                disabled={savingTelegram}
                className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl py-2.5 font-bold text-sm transition"
              >
                {savingTelegram ? "Saving..." : "Save Telegram Settings"}
              </button>
            </div>
          </div>

          {/* Active sessions card */}
          <div className="bg-white dark:bg-[#13131f] rounded-2xl shadow-sm border border-gray-100 dark:border-white/[0.05]">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/[0.05]">
              <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Monitor size={16} className="text-green-600 dark:text-green-400"/>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-white">Active Sessions</h2>
                <p className="text-xs text-gray-400">
                  {profileInfo ? `${profileInfo.devices?.length || 0} / ${profileInfo.maxDevices} devices` : "Loading…"}
                </p>
              </div>
            </div>
            <div className="p-5 space-y-2">
              {profileInfo?.devices?.length > 0 ? profileInfo.devices.map((d, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-100 dark:hover:border-blue-800 transition">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <Monitor size={13} className="text-blue-500"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{d.deviceName || "Unknown device"}</p>
                    <p className="text-xs text-gray-400">{d.deviceOS} · {d.deviceBrowser} · {timeAgo(d.lastLoginAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>Active
                    </span>
                    <button
                      onClick={() => handleKickOwnDevice(d.deviceId, d.deviceName)}
                      title="Kick this session"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-800/40 transition"
                    >
                      <LogOut size={11}/> Kick
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <Monitor size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2"/>
                  <p className="text-sm text-gray-400">No active sessions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════ STORE USERS MODAL ════ */}
      {usersStoreTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl shadow-2xl max-h-[96vh] flex flex-col">

            {/* ── Header ── */}
            <div className="flex items-start justify-between px-5 py-4 border-b dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-blue-600 dark:text-blue-400"/>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-gray-800 dark:text-white">{usersStoreTarget.name}</h2>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${PLAN_COLORS[usersStoreTarget.plan] || "bg-gray-100 text-gray-600"}`}>{usersStoreTarget.plan}</span>
                    {usersStoreTarget.storeType === "cafe" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-semibold">☕ Café</span>}
                    {usersStoreTarget.storeType === "both"  && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-semibold">🏪+☕</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">User Management · {storeUsers.length} {storeUsers.length === 1 ? "user" : "users"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={reloadStoreUsers}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium">
                  <RefreshCw size={12}/> Refresh
                </button>
                <button onClick={() => { setShowUserForm(true); setUsersTab("users"); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold">
                  <UserPlus size={12}/> Add User
                </button>
                <button onClick={() => { setUsersStoreTarget(null); setStoreUsers([]); setStoreStats(null); setShowUserForm(false); }}
                  className="w-8 h-8 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition">
                  <X size={16}/>
                </button>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex items-center gap-1 px-5 pt-3 pb-0 shrink-0">
              {[
                { id: "overview", label: "Overview",                         icon: "📊" },
                { id: "users",    label: `Users (${storeUsers.length})`,     icon: "👥" },
              ].map(tab => (
                <button key={tab.id} onClick={() => setUsersTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border-b-2 ${
                    usersTab === tab.id
                      ? "text-blue-600 dark:text-blue-400 border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "text-gray-500 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
              {usersLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                  <p className="text-sm text-gray-400">Loading user data…</p>
                </div>
              ) : (
                <>
                  {/* ── OVERVIEW TAB ── */}
                  {usersTab === "overview" && storeStats && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: "Total Users",    value: storeStats.totalUsers,        icon: Users,        color: "blue" },
                          { label: "Today Revenue",  value: fmt(storeStats.todayRevenue), icon: DollarSign,   color: "emerald" },
                          { label: "Today Orders",   value: storeStats.todayOrders,       icon: ShoppingCart, color: "purple" },
                          { label: "Month Revenue",  value: fmt(storeStats.monthRevenue), icon: TrendingUp,   color: "amber" },
                          { label: "Month Orders",   value: storeStats.monthOrders,       icon: Activity,     color: "indigo" },
                          { label: "Total Revenue",  value: fmt(storeStats.totalRevenue), icon: DollarSign,   color: "green" },
                          { label: "Total Orders",   value: storeStats.totalOrders,       icon: ShoppingCart, color: "violet" },
                          { label: "Total Products", value: storeStats.totalProducts,     icon: Package,      color: "cyan" },
                        ].map(({ label, value, icon: Icon, color }) => (
                          <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:shadow-sm transition group">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-gray-500 font-medium leading-tight">{label}</p>
                              <div className={`w-7 h-7 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <Icon size={13} className={`text-${color}-600 dark:text-${color}-400`}/>
                              </div>
                            </div>
                            <p className={`text-xl font-black text-${color}-600 dark:text-${color}-400`}>{value}</p>
                          </div>
                        ))}
                      </div>

                      {storeStats.topUsers?.length > 0 && (
                        <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                          <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                            <TrendingUp size={14} className="text-amber-500"/>
                            <span className="font-bold text-sm text-gray-700 dark:text-gray-200">Top Performers</span>
                          </div>
                          <div className="divide-y dark:divide-gray-700 bg-white dark:bg-gray-900">
                            {storeStats.topUsers.map((u, i) => (
                              <div key={u._id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                <div className="flex items-center gap-3">
                                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0
                                    ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300" : "bg-orange-100 text-orange-600"}`}>
                                    {i + 1}
                                  </span>
                                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{u.username}</span>
                                </div>
                                <div className="flex items-center gap-6">
                                  <div className="text-right">
                                    <p className="text-xs text-gray-400">Orders</p>
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{u.orders}</p>
                                  </div>
                                  <div className="text-right min-w-[70px]">
                                    <p className="text-xs text-gray-400">Revenue</p>
                                    <p className="text-sm font-black text-green-600">{fmt(u.revenue)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── USERS TAB ── */}
                  {usersTab === "users" && (
                    <div className="space-y-4">
                      {/* Search bar */}
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                          <input placeholder="Search users by name…" value={usersSearch} onChange={e => setUsersSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition"/>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 font-medium">{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}</span>
                      </div>

                      {/* Add user form */}
                      {showUserForm && (
                        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                              <UserPlus size={14}/> New User
                            </p>
                            <button onClick={() => setShowUserForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                              <X size={14}/>
                            </button>
                          </div>
                          <form onSubmit={handleCreateStoreUser} className="grid sm:grid-cols-4 gap-3">
                            <input placeholder="Username" required value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                              className="border dark:border-gray-600 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-400 transition"/>
                            <input placeholder="Password" type="password" required value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                              className="border dark:border-gray-600 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-400 transition"/>
                            <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                              className="border dark:border-gray-600 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-700 text-sm dark:text-white outline-none">
                              <option value="cashier">Cashier</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button type="submit" className="bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold py-2.5 flex items-center justify-center gap-1.5 transition">
                              <Plus size={14}/> Create
                            </button>
                          </form>
                        </div>
                      )}

                      {/* User cards */}
                      <div className="space-y-3">
                        {filteredUsers.map(u => (
                          <div key={u._id} className={`rounded-2xl border overflow-hidden transition-all ${
                            u.active
                              ? "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm"
                              : "bg-red-50/40 dark:bg-red-900/10 border-red-100 dark:border-red-800/30"
                          }`}>
                            {/* ── Main row ── */}
                            <div className="px-4 py-4">
                              <div className="flex items-center gap-4 flex-wrap">

                                {/* Identity */}
                                <div className="flex items-center gap-3 min-w-[160px]">
                                  <div className="relative shrink-0">
                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm select-none
                                      ${u.role === "admin" ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                                      {u.username.charAt(0).toUpperCase()}
                                    </div>
                                    {u.isOnline && (
                                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"/>
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="font-bold text-sm text-gray-800 dark:text-white">{u.username}</p>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide
                                        ${u.role === "admin" ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
                                        {u.role}
                                      </span>
                                      {!u.active && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-bold uppercase">Disabled</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
                                  </div>
                                </div>

                                {/* Online pill */}
                                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold shrink-0
                                  ${u.isOnline ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400"}`}>
                                  {u.isOnline ? <Wifi size={11}/> : <WifiOff size={11}/>}
                                  {u.isOnline
                                    ? `${u.activeDevices} device${u.activeDevices !== 1 ? "s" : ""} online`
                                    : `Last: ${timeAgo(u.lastLoginAt)}`}
                                </div>

                                {/* Device limit control */}
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2 shrink-0 border border-gray-100 dark:border-gray-600">
                                  <Smartphone size={12} className="text-blue-500 shrink-0"/>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Max devices</span>
                                  <button onClick={() => handleUpdateMaxDevices(u, (u.maxDevices||1)-1)} disabled={(u.maxDevices||1) <= 1}
                                    className="w-5 h-5 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-30 transition">
                                    <Minus size={9}/>
                                  </button>
                                  <span className="text-sm font-black w-5 text-center text-gray-800 dark:text-white">{u.maxDevices || 1}</span>
                                  <button onClick={() => handleUpdateMaxDevices(u, (u.maxDevices||1)+1)} disabled={(u.maxDevices||1) >= 10}
                                    className="w-5 h-5 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-30 transition">
                                    <Plus size={9}/>
                                  </button>
                                  <span className="text-xs text-gray-400">({u.activeDevices || 0} active)</span>
                                </div>

                                {/* Revenue & orders */}
                                <div className="flex items-center gap-4">
                                  <div className="text-center">
                                    <p className="text-base font-black text-green-600 dark:text-green-400 leading-none">{fmt(u.stats?.totalRevenue)}</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Revenue</p>
                                  </div>
                                  <div className="w-px h-8 bg-gray-200 dark:bg-gray-600"/>
                                  <div className="text-center">
                                    <p className="text-base font-black text-gray-700 dark:text-white leading-none">{u.stats?.totalOrders || 0}</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Orders</p>
                                  </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex items-center gap-1.5 ml-auto flex-wrap shrink-0">
                                  <button onClick={() => handleViewSales(u)} title="View Sales History"
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition font-semibold">
                                    <Eye size={11}/> Sales
                                  </button>
                                  <button onClick={() => { setUserPwModal(u); setUserNewPin(""); }} title="Change Password"
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition font-semibold">
                                    <KeyRound size={11}/> Password
                                  </button>
                                  {u.isOnline && (
                                    <button onClick={() => handleForceLogout(u)} title="Force Logout All Devices"
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition font-semibold">
                                      <LogOut size={11}/> Kick All
                                    </button>
                                  )}
                                  <button onClick={() => handleToggleStoreUser(u)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition
                                      ${u.active
                                        ? "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100"
                                        : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100"}`}>
                                    {u.active ? <><XCircle size={11}/> Disable</> : <><CheckCircle size={11}/> Enable</>}
                                  </button>
                                  <button onClick={() => handleDeleteStoreUser(u)} title="Delete User"
                                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition">
                                    <Trash2 size={14}/>
                                  </button>
                                  <button onClick={() => setExpandedUser(p => ({ ...p, [u._id]: !p[u._id] }))}
                                    title={expandedUser[u._id] ? "Collapse" : "Expand devices & danger zone"}
                                    className={`p-1.5 rounded-lg transition ${expandedUser[u._id] ? "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
                                    {expandedUser[u._id] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* ── Expanded panel ── */}
                            {expandedUser[u._id] && (
                              <div className="border-t dark:border-gray-700">
                                {/* Active sessions */}
                                {u.devices?.length > 0 && (
                                  <div className="px-4 py-4 bg-gray-50 dark:bg-gray-800/60">
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                      <Smartphone size={11}/> Active Sessions ({u.devices.length}/{u.maxDevices||1})
                                    </p>
                                    <div className="grid sm:grid-cols-3 gap-2">
                                      {u.devices.map((d, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                          <Monitor size={13} className="text-blue-500 shrink-0"/>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{d.deviceName || "Unknown device"}</p>
                                            <p className="text-[10px] text-gray-400">{d.deviceOS} · {timeAgo(d.lastLoginAt)}</p>
                                          </div>
                                          <button onClick={() => handleKickDevice(u, d.deviceId, d.deviceName)} title="Kick this device"
                                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition shrink-0">
                                            <LogOut size={12}/>
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {/* Danger zone */}
                                <div className="px-4 py-4 bg-red-50/60 dark:bg-red-950/20 border-t border-red-100 dark:border-red-500/10">
                                  <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <Trash2 size={11}/> Danger Zone
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <button onClick={() => handleClearUserSales(u)}
                                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-gray-800 border border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 transition shadow-sm">
                                      <Trash2 size={11}/> Clear All Sales
                                      <span className="text-red-400 font-normal opacity-80">({u.stats?.totalOrders || 0} orders)</span>
                                    </button>
                                    <button onClick={() => handleClearUserProducts(u)}
                                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-gray-800 border border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 transition shadow-sm">
                                      <Trash2 size={11}/> Clear All Products
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        {filteredUsers.length === 0 && (
                          <div className="text-center py-14">
                            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                              <Users size={24} className="text-gray-300 dark:text-gray-600"/>
                            </div>
                            <p className="text-sm font-semibold text-gray-400">No users found</p>
                            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Try a different search or add a new user</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════ ALL OTHER MODALS ════ */}

      {/* Create Store */}
      {createModal && (
        <Modal title={t.modalCreateStore} onClose={() => setCreateModal(false)}>
          <div className="space-y-4">

            {/* Store name */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t.fieldStoreName}</label>
              <input type="text" placeholder="e.g. My Café" value={createForm.storeName} onChange={e => setCreateForm(p => ({ ...p, storeName: e.target.value }))} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>

            {/* Store type selector */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Store Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "market", icon: "🛒", label: "Market Only" },
                  { key: "cafe",   icon: "☕", label: "Café Only"   },
                  { key: "both",   icon: "🏪", label: "Market + Café" },
                ].map(opt => (
                  <button key={opt.key} type="button"
                    onClick={() => setCreateForm(p => ({ ...p, storeType: opt.key }))}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-sm font-semibold transition
                      ${createForm.storeType === opt.key
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300"}`}>
                    <span className="text-xl">{opt.icon}</span>
                    <span className="text-xs leading-tight text-center">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Market admin credentials */}
            {(createForm.storeType === "market" || createForm.storeType === "both") && (
              <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">🛒 Market Admin Login</p>
                {[{ label: "Admin Username", key: "username", ph: "e.g. marketAdmin" }, { label: "Admin Password", key: "password", ph: "e.g. 123456" }].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{f.label}</label>
                    <input type="text" placeholder={f.ph} value={createForm[f.key]} onChange={e => setCreateForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                  </div>
                ))}
              </div>
            )}

            {/* Café manager credentials */}
            {(createForm.storeType === "cafe" || createForm.storeType === "both") && (
              <div className="space-y-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">☕ Café Manager Login</p>
                {[{ label: "Manager Name", key: "cafeName", ph: "e.g. Sara" }, { label: "Manager Username", key: "cafeUsername", ph: "e.g. cafeManager" }, { label: "Manager Password", key: "cafePassword", ph: "e.g. 123456" }].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{f.label}</label>
                    <input type="text" placeholder={f.ph} value={createForm[f.key]} onChange={e => setCreateForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                  </div>
                ))}
              </div>
            )}

            {/* Plan + Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t.fieldPlan}</label>
                <select value={createForm.plan} onChange={e => setCreateForm(p => ({ ...p, plan: e.target.value }))} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  {["trial", "basic", "pro", "enterprise"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t.fieldCurrency}</label>
                <select value={createForm.currency} onChange={e => setCreateForm(p => ({ ...p, currency: e.target.value }))} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  {["USD", "EUR", "GBP", "LBP", "SAR", "AED"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={handleCreateStore} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 font-medium hover:bg-blue-700">{t.btnCreateStore}</button>
              <button onClick={() => setCreateModal(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 font-medium dark:bg-gray-700 dark:text-gray-300">{t.cancel}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Plan Editor */}
      {editingPlan && (
        <Modal title={`${t.modalEditPlan} — ${editingPlan.name}`} onClose={() => setEditingPlan(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t.fieldPlan}</label>
              <select value={planForm.plan} onChange={handlePlanChange} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                {["trial", "basic", "pro", "enterprise"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[{ label: t.fieldMaxUsers, key: "maxUsers" }, { label: t.fieldMaxProducts, key: "maxProducts" }].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{f.label}</label>
                  <input type="number" min="1" value={planForm[f.key]} onChange={e => setPlanForm(p => ({ ...p, [f.key]: +e.target.value }))} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t.fieldExpiresAt}</label>
              <input type="date" value={planForm.expiresAt} onChange={e => setPlanForm(p => ({ ...p, expiresAt: e.target.value }))} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t.fieldMonthlyPrice}</label>
              <input type="number" min="0" step="0.01" placeholder="e.g. 29.99" value={planForm.monthlyPrice} onChange={e => setPlanForm(p => ({ ...p, monthlyPrice: e.target.value }))} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={savePlan} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 font-medium hover:bg-blue-700">{t.btnSavePlan}</button>
              <button onClick={() => setEditingPlan(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 font-medium dark:bg-gray-700 dark:text-gray-300">{t.cancel}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Password */}
      {resetTarget && (
        <Modal title={`${t.modalResetPw} — ${resetTarget.name}`} onClose={() => setResetTarget(null)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">{t.resetPwDesc} <strong>{resetTarget.name}</strong></p>
            <input type="text" placeholder={t.fieldNewPassword} value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            <div className="flex gap-3">
              <button onClick={handleResetPW} className="flex-1 bg-yellow-500 text-white rounded-xl py-2.5 font-medium hover:bg-yellow-600">{t.btnReset}</button>
              <button onClick={() => setResetTarget(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 font-medium dark:bg-gray-700 dark:text-gray-300">{t.cancel}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Notify */}
      {notifyTarget && (
        <Modal title={`${t.modalNotify} — ${notifyTarget.name}`} onClose={() => setNotifyTarget(null)}>
          <div className="space-y-3">
            <textarea rows={3} placeholder={t.fieldMessage} value={notifyForm.message} onChange={e => setNotifyForm(f => ({ ...f, message: e.target.value }))} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none" />
            <select value={notifyForm.type} onChange={e => setNotifyForm(f => ({ ...f, type: e.target.value }))} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              {["info", "warning", "success", "error"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={handleNotify} className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 font-medium hover:bg-indigo-700">{t.btnSend}</button>
              <button onClick={() => setNotifyTarget(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 font-medium dark:bg-gray-700 dark:text-gray-300">{t.cancel}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Notify */}
      {bulkNotifyModal && (
        <Modal title={`${t.modalBulkNotify} (${selected.length || "all"} ${t.stores})`} onClose={() => setBulkNotifyModal(false)}>
          <div className="space-y-3">
            <textarea rows={3} placeholder={t.fieldMessage} value={bulkNotifyForm.message} onChange={e => setBulkNotifyForm(f => ({ ...f, message: e.target.value }))} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none" />
            <select value={bulkNotifyForm.type} onChange={e => setBulkNotifyForm(f => ({ ...f, type: e.target.value }))} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              {["info", "warning", "success", "error"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={handleBulkNotify} className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 font-medium hover:bg-indigo-700">{t.btnSend}</button>
              <button onClick={() => setBulkNotifyModal(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 font-medium dark:bg-gray-700 dark:text-gray-300">{t.cancel}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Clone */}
      {cloneTarget && (
        <Modal title={`${t.modalClone} — ${cloneTarget.name}`} onClose={() => setCloneTarget(null)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">{t.cloneDesc}</p>
            {[{ label: t.fieldNewStoreName, key: "newStoreName", ph: "e.g. My Market 2" }, { label: t.fieldNewAdminUser, key: "newUsername", ph: "e.g. admin2" }, { label: t.fieldNewAdminPass, key: "newPassword", ph: "e.g. 123456" }].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{f.label}</label>
                <input type="text" placeholder={f.ph} value={cloneForm[f.key]} onChange={e => setCloneForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={handleClone} className="flex-1 bg-cyan-600 text-white rounded-xl py-2.5 font-medium hover:bg-cyan-700">{t.btnCloneStore}</button>
              <button onClick={() => setCloneTarget(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 font-medium dark:bg-gray-700 dark:text-gray-300">{t.cancel}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Copy Products */}
      {copyTarget && (
        <Modal title={`📦 Copy Products — ${copyTarget.name}`} onClose={() => { setCopyTarget(null); setCopyResult(null); }}>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Copy all products and categories from <strong>{copyTarget.name}</strong> to another existing store.
              Products with duplicate barcodes in the destination will be skipped.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Destination Store</label>
              <select
                value={copyDestId}
                onChange={e => { setCopyDestId(e.target.value); setCopyResult(null); }}
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">— Select a store —</option>
                {stores.filter(s => String(s._id) !== String(copyTarget._id)).map(s => (
                  <option key={s._id} value={s._id}>{s.name} ({s.owner?.username})</option>
                ))}
              </select>
            </div>

            {copyResult && (
              <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-4 space-y-1">
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">✅ Done!</p>
                <p className="text-sm text-green-600 dark:text-green-400">Products copied: <strong>{copyResult.productsCopied}</strong></p>
                <p className="text-sm text-green-600 dark:text-green-400">Categories copied: <strong>{copyResult.categoriesCopied}</strong></p>
                {copyResult.skipped > 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">Skipped (duplicate barcode): <strong>{copyResult.skipped}</strong></p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCopyProducts}
                disabled={!copyDestId || copyLoading}
                className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 font-medium hover:bg-emerald-700 disabled:opacity-40"
              >
                {copyLoading ? "Copying…" : "Copy Products & Categories"}
              </button>
              <button onClick={() => { setCopyTarget(null); setCopyResult(null); }} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 font-medium dark:bg-gray-700 dark:text-gray-300">Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Transfer */}
      {transferTarget && (
        <Modal title={`${t.modalTransfer} — ${transferTarget.name}`} onClose={() => setTransferTarget(null)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">{t.transferDesc}</p>
            {[{ label: t.fieldNewAdminUser, key: "newUsername", ph: "e.g. newAdmin" }, { label: t.fieldNewAdminPass, key: "newPassword", ph: "e.g. 123456" }].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{f.label}</label>
                <input type="text" placeholder={f.ph} value={transferForm[f.key]} onChange={e => setTransferForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={handleTransfer} className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 font-medium hover:bg-orange-600">{t.btnTransferStore}</button>
              <button onClick={() => setTransferTarget(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 font-medium dark:bg-gray-700 dark:text-gray-300">{t.cancel}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Welcome Message */}
      {welcomeTarget && (
        <Modal title={`${t.modalWelcome} — ${welcomeTarget.name}`} onClose={() => setWelcomeTarget(null)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">{t.welcomeDesc}</p>
            <textarea rows={3} placeholder={t.welcomePh} value={welcomeMsg} onChange={e => setWelcomeMsg(e.target.value)} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none" />
            <div className="flex gap-3">
              <button onClick={handleWelcome} className="flex-1 bg-pink-600 text-white rounded-xl py-2.5 font-medium hover:bg-pink-700">{t.btnSave}</button>
              <button onClick={() => setWelcomeTarget(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 font-medium dark:bg-gray-700 dark:text-gray-300">{t.cancel}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Internal Notes */}
      {notesTarget && (
        <Modal title={`${t.modalNotes} — ${notesTarget.name}`} onClose={() => setNotesTarget(null)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">{t.notesDesc}</p>
            <textarea rows={4} placeholder={t.notesPh} value={notesText} onChange={e => setNotesText(e.target.value)} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none" />
            <div className="flex gap-3">
              <button onClick={handleNotes} className="flex-1 bg-amber-500 text-white rounded-xl py-2.5 font-medium hover:bg-amber-600">{t.btnSaveNotes}</button>
              <button onClick={() => setNotesTarget(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 font-medium dark:bg-gray-700 dark:text-gray-300">{t.cancel}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Store Confirm */}
      {deleteTarget && (
        <Modal title={t.modalDelete} onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">Delete <strong>{deleteTarget.name}</strong>? {t.deleteDesc}</p>
            <div className="flex gap-3">
              <button onClick={handleDeleteStore} className="flex-1 bg-red-600 text-white rounded-xl py-2.5 font-medium hover:bg-red-700">{t.btnConfirmDelete}</button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 font-medium dark:bg-gray-700 dark:text-gray-300">{t.cancel}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Store Details */}
      {detailStore && (
        <Modal title={`${t.modalDetails} — ${detailStore.name}`} onClose={() => { setDetailStore(null); setDetailData(null); }} wide>
          {detailLoading ? <div className="flex justify-center py-8 text-gray-400">{t.detailLoading}</div> : detailData ? (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[{ label: t.stat30dSales, value: `$${detailData.last30DaysSales.toFixed(2)}` }, { label: t.stat30dOrders, value: detailData.last30DaysOrders }, { label: t.statProducts, value: detailData.productCount }].map(s => (
                  <div key={s.label} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-center">
                    <div className="font-bold text-gray-800 dark:text-white">{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">{t.detailUsers} ({detailData.users.length})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {detailData.users.map(u => (
                    <div key={u._id} className="flex items-center justify-between text-sm px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="font-medium">{u.username}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>{u.role}</span>
                      <span className="text-xs text-gray-400">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : t.never}</span>
                    </div>
                  ))}
                </div>
              </div>
              {detailData.recentSales?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">{t.detailRecentSales}</h4>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {detailData.recentSales.map(sale => (
                      <div key={sale._id} className="flex items-center justify-between text-sm px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <span className="text-xs text-gray-400">{new Date(sale.createdAt).toLocaleDateString()}</span>
                        <span className="text-xs text-gray-500">{sale.items?.length || 0} items · {sale.paymentMethod}</span>
                        <span className="font-medium">${sale.total?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : <div className="text-center text-gray-400 py-8">{t.noData}</div>}
        </Modal>
      )}

      {/* User Change Password Modal */}
      {userPwModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setUserPwModal(null); }}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">{t.modalChangePw} — <span className="text-blue-500">{userPwModal.username}</span></h2>
              <button onClick={() => setUserPwModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <input type="password" placeholder={t.newPwPh} value={userNewPin} onChange={e => setUserNewPin(e.target.value)} autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none text-sm mb-4"/>
            <button onClick={handleChangeUserPW} disabled={userNewPin.length < 4} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition">{t.btnUpdatePw}</button>
          </div>
        </div>
      )}

      {/* User Sales Modal */}
      {userSalesModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setUserSalesModal(null); }}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b dark:border-white/10">
              <div>
                <h2 className="font-bold">{t.modalSales} — <span className="text-blue-500">{userSalesModal.username}</span></h2>
                <p className="text-xs text-gray-400 mt-0.5">{t.last50Tx}</p>
              </div>
              <button onClick={() => setUserSalesModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <div className="overflow-y-auto max-h-96 divide-y dark:divide-white/5">
              {userSales.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">{t.noSalesYet}</p>
                : userSales.map(s => (
                  <div key={s._id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium">${s.total?.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.paymentMethod === "cash" ? "bg-green-100 text-green-600" : s.paymentMethod === "card" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}>{s.paymentMethod}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{s.items?.length || 0} items</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CAFÉ STAFF MODAL ── */}
      {cafeStaffStore && (
        <Modal title={`☕ Café Staff — ${cafeStaffStore.name}`} onClose={() => setCafeStaffStore(null)} wide>
          <div className="space-y-4">
            {/* URL hint */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                Staff access URL: <code className="bg-amber-100 dark:bg-amber-800 px-1.5 py-0.5 rounded font-mono">/cafe</code>
                {" "}— share this URL along with their username &amp; password
              </p>
            </div>

            {/* Add staff form toggle */}
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-800 dark:text-white text-sm">
                Staff Members ({cafeStaffList.length})
              </h4>
              <button onClick={() => setCafeStaffShowForm(!cafeStaffShowForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600">
                {cafeStaffShowForm ? "✕ Cancel" : "+ Add Staff"}
              </button>
            </div>

            {/* Create form */}
            {cafeStaffShowForm && (
              <form onSubmit={handleCreateCafeStaff} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Full Name</label>
                    <input value={cafeStaffForm.name} onChange={e => setCafeStaffForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Ali Hassan"
                      className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-white outline-none focus:border-amber-400"/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Username</label>
                    <input value={cafeStaffForm.username} onChange={e => setCafeStaffForm(p => ({ ...p, username: e.target.value }))}
                      placeholder="e.g. ali.hassan"
                      className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-white outline-none focus:border-amber-400"/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Password</label>
                    <input type="password" value={cafeStaffForm.password} onChange={e => setCafeStaffForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="Set password"
                      className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-white outline-none focus:border-amber-400"/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Role</label>
                    <select value={cafeStaffForm.role} onChange={e => setCafeStaffForm(p => ({ ...p, role: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-white outline-none">
                      <option value="staff">Staff (Floor + Kitchen)</option>
                      <option value="manager">Manager (Full Access)</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold">
                  Create Staff Member
                </button>
              </form>
            )}

            {/* Staff list */}
            {cafeStaffLoading ? (
              <div className="text-center py-6 text-gray-400">Loading…</div>
            ) : cafeStaffList.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">☕</div>
                <p className="text-sm">No café staff yet. Add the first member above.</p>
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-700 rounded-xl border dark:border-gray-700 overflow-hidden">
                {cafeStaffList.map(s => (
                  <div key={s._id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${s.role === "manager" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}>
                      {s.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold dark:text-white">{s.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.role === "manager" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                          {s.role}
                        </span>
                        {!s.isActive && <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded font-medium">Disabled</span>}
                      </div>
                      <p className="text-xs text-gray-400 font-mono">@{s.username}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleCafeStaff(s)}
                        className={`px-2 py-1 rounded text-xs font-semibold ${s.isActive ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400" : "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"}`}>
                        {s.isActive ? "Disable" : "Enable"}
                      </button>
                      <button onClick={() => handleDeleteCafeStaff(s)}
                        className="px-2 py-1 rounded text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

        </div>{/* end scrollable content */}
      </div>{/* end main area */}

    </div>
  );
}