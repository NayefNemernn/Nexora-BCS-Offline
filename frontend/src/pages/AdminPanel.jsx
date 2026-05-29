import React, { useEffect, useState } from "react";
import api from "../api/axios";
import RequireAdmin from "../components/RequireAdmin";
import toast from "react-hot-toast";
import { useAdminTranslation } from "../hooks/useAdminTranslation";
import { useLang } from "../context/LanguageContext";
import {
  Shield, Users, Monitor, Wifi, WifiOff, KeyRound,
  LogOut, Search, UserPlus, X, CheckCircle, XCircle,
  ChevronDown, ChevronUp, RefreshCw, Smartphone, Plus, Minus, Trash2
} from "lucide-react";

export default function AdminPanel() {
  const t = useAdminTranslation();
  const { lang } = useLang();

  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ username: "", password: "", role: "cashier" });
  const [pwModal,  setPwModal]  = useState(null);
  const [newPin,   setNewPin]   = useState("");
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch { toast.error(t.failedToLoad); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users", form);
      setForm({ username: "", password: "", role: "cashier" });
      setShowForm(false);
      toast.success(t.userCreated);
      load();
    } catch (err) { toast.error(err.response?.data?.message || t.failed); }
  };

  const toggleStatus = async (user) => {
    try {
      await api.patch(`/users/${user._id}`, { active: !user.active });
      toast.success(`${user.username} ${user.active ? t.toastDisabled : t.toastEnabled}`);
      load();
    } catch { toast.error(t.failed); }
  };

  const forceLogout = async (user) => {
    try {
      await api.post(`/users/${user._id}/force-logout`);
      toast.success(`${user.username} ${t.loggedOut}`);
      load();
    } catch { toast.error(t.failed); }
  };

  const forceLogoutDevice = async (userId, deviceId, deviceName) => {
    try {
      await api.post(`/users/${userId}/force-logout-device`, { deviceId });
      toast.success(`"${deviceName}" ${t.deviceKicked}`);
      load();
    } catch { toast.error(t.failed); }
  };

  const updateMaxDevices = async (user, newMax) => {
    if (newMax < 1 || newMax > 10) return;
    try {
      await api.patch(`/users/${user._id}`, { maxDevices: newMax });
      toast.success(`${t.maxDevicesUpdated} ${newMax}`);
      load();
    } catch { toast.error(t.failed); }
  };

  const deleteUser = async (user) => {
    if (!confirm(`${t.deleteConfirm} "${user.username}"?`)) return;
    try {
      await api.delete(`/users/${user._id}`);
      toast.success(t.userDeleted);
      load();
    } catch (err) { toast.error(err.response?.data?.message || t.failed); }
  };

  const changePassword = async () => {
    if (newPin.length < 4) { toast.error(t.minFourChars); return; }
    try {
      await api.post(`/users/${pwModal._id}/change-password`, { newPassword: newPin });
      toast.success(`${t.passwordChanged} ${pwModal.username}`);
      setPwModal(null); setNewPin("");
    } catch { toast.error(t.failedToChange); }
  };

  const timeAgo = (date) => {
    if (!date) return t.never;
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60)    return t.justNow;
    if (s < 3600)  return `${Math.floor(s/60)} ${t.mAgo}`;
    if (s < 86400) return `${Math.floor(s/3600)} ${t.hAgo}`;
    return new Date(date).toLocaleDateString();
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <RequireAdmin>
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    </RequireAdmin>
  );

  return (
    <RequireAdmin>
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-neutral-950" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="p-5 space-y-5">

          {/* HEADER */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Shield size={20} className="text-white"/>
              </div>
              <div>
                <h1 className="text-xl font-bold">{t.title}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm
                bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10
                hover:bg-gray-50 dark:hover:bg-[#1c1c1c] text-gray-600 dark:text-gray-300
                shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                <RefreshCw size={13}/> {t.refresh}
              </button>
              <button onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium
                  bg-blue-600 hover:bg-blue-700 text-white
                  shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                <UserPlus size={14}/> {t.addUser}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input placeholder={t.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)}
              className="w-full ps-9 pe-4 py-2.5 rounded-xl text-sm outline-none
                bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 focus:border-blue-400 transition"/>
          </div>

          {/* Add user form */}
          {showForm && (
            <form onSubmit={handleCreate}
              className="p-4 rounded-2xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 grid sm:grid-cols-4 gap-3">
              <input placeholder={t.usernamePlaceholder} required value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 bg-transparent text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
              <input placeholder={t.passwordPlaceholder} type="password" required value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 bg-transparent text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-[#141414] text-sm outline-none">
                <option value="cashier">{t.cashier}</option>
              </select>
              <button className="bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none text-sm font-semibold py-2.5">
                {t.createUser}
              </button>
            </form>
          )}

          {/* Users list */}
          <div className="space-y-3">
            {filtered.map(user => (
              <div key={user._id} className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">

                {/* Main row */}
                <div className="flex items-center gap-4 px-5 py-4 flex-wrap">

                  {/* Avatar + info */}
                  <div className="flex items-center gap-3 flex-1 min-w-48">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                        ${user.role === "admin" ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600" : "bg-gray-100 dark:bg-gray-800 text-gray-600"}`}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      {user.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#141414]"/>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{user.username}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${user.role === "admin" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                          {user.role}
                        </span>
                        {!user.active && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 font-medium">{t.disabled}</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{t.joined} {new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Device cap control */}
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-xl px-3 py-2">
                    <Smartphone size={13} className="text-blue-500 shrink-0"/>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{t.maxDevices}</span>
                    <button onClick={() => updateMaxDevices(user, (user.maxDevices||1) - 1)} disabled={(user.maxDevices||1) <= 1}
                      className="w-6 h-6 rounded-lg bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30">
                      <Minus size={11}/>
                    </button>
                    <span className="text-sm font-bold w-4 text-center">{user.maxDevices || 1}</span>
                    <button onClick={() => updateMaxDevices(user, (user.maxDevices||1) + 1)} disabled={(user.maxDevices||1) >= 10}
                      className="w-6 h-6 rounded-lg bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30">
                      <Plus size={11}/>
                    </button>
                    <span className="text-xs text-gray-400 whitespace-nowrap">({user.activeDevices || 0} {t.active})</span>
                  </div>

                  {/* Online status */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 min-w-32">
                    {user.isOnline
                      ? <><Wifi size={12} className="text-green-500 shrink-0"/><span className="text-green-600">{user.activeDevices} {user.activeDevices !== 1 ? t.onlinePlural : t.online}</span></>
                      : <><WifiOff size={12} className="shrink-0"/><span>{user.lastLoginAt ? `${t.lastSeen} ${timeAgo(user.lastLoginAt)}` : t.never}</span></>
                    }
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ms-auto flex-wrap">
                    <button onClick={() => { setPwModal(user); setNewPin(""); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                        bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100
                        shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                      <KeyRound size={11}/> {t.password}
                    </button>
                    {user.isOnline && (
                      <button onClick={() => forceLogout(user)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                          bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100
                          shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                        <LogOut size={11}/> {t.kickAll}
                      </button>
                    )}
                    <button onClick={() => toggleStatus(user)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-[transform,box-shadow] duration-75 select-none active:shadow-none active:translate-y-[4px]
                        ${user.active ? "bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)]" : "bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)]"}`}>
                      {user.active ? <><XCircle size={11}/> {t.disable}</> : <><CheckCircle size={11}/> {t.enable}</>}
                    </button>
                    <button onClick={() => deleteUser(user)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition">
                      <Trash2 size={14}/>
                    </button>
                    <button onClick={() => setExpanded(p => ({ ...p, [user._id]: !p[user._id] }))}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition">
                      {expanded[user._id] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    </button>
                  </div>
                </div>

                {/* Expanded: device list */}
                {expanded[user._id] && user.devices?.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/20 px-5 py-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Smartphone size={11}/> {t.activeDevices} ({user.devices.length}/{user.maxDevices || 1})
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {user.devices.map((d, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-[#141414] rounded-xl border border-gray-100 dark:border-white/5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                            <Monitor size={14} className="text-blue-500"/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{d.deviceName || "Unknown"}</p>
                            <p className="text-xs text-gray-400">{d.deviceOS} · {d.deviceBrowser}</p>
                            <p className="text-xs text-gray-400">{timeAgo(d.lastLoginAt)}</p>
                          </div>
                          <button onClick={() => forceLogoutDevice(user._id, d.deviceId, d.deviceName)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition shrink-0">
                            <LogOut size={12}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center text-gray-400 py-12">{t.noUsersFound}</div>
            )}
          </div>
        </div>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      {pwModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setPwModal(null); }}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">{t.changePassword} — <span className="text-blue-500">{pwModal.username}</span></h2>
              <button onClick={() => setPwModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <input type="password" placeholder={t.newPasswordPlaceholder} value={newPin}
              onChange={e => setNewPin(e.target.value)} autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10
                bg-transparent focus:ring-2 focus:ring-blue-500 outline-none text-sm mb-4"/>
            <button onClick={changePassword} disabled={newPin.length < 4}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
              {t.updatePassword}
            </button>
          </div>
        </div>
      )}
    </RequireAdmin>
  );
}
