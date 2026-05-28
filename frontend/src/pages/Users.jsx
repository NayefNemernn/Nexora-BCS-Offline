import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { changeUserPassword } from "../api/auth.api";
import { useUsersTranslation } from "../hooks/useUsersTranslation";
import { useLang } from "../context/LanguageContext";
import RequireAdmin from "../components/RequireAdmin";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, X, UserPlus, Search, Shield, User, Monitor, Clock } from "lucide-react";
import toast from "react-hot-toast";

export default function Users() {
  const t    = useUsersTranslation();
  const { lang } = useLang();
  const isAr = lang === "ar";

  const [users,   setUsers]   = useState([]);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "cashier" });
  const [pwModal,  setPwModal]  = useState(null);
  const [newPin,   setNewPin]   = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch { toast.error(t.failCreate); } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users", form);
      setForm({ username: "", password: "", role: "cashier" });
      setShowForm(false);
      fetchUsers();
      toast.success(t.userCreated);
    } catch (err) {
      toast.error(err.response?.data?.message || t.failCreate);
    }
  };

  const toggleStatus = async (user) => {
    try {
      await api.patch(`/users/${user._id}`, { active: !user.active });
      toast.success(user.active ? t.userDisabled : t.userEnabled);
      fetchUsers();
    } catch { toast.error(t.failCreate); }
  };

  const deleteUser = async (id) => {
    if (!confirm(t.deleteConfirm)) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
      toast.success(t.userDeleted);
    } catch {
      toast.error(t.failDelete);
    }
  };

  const handleChangePassword = async () => {
    if (newPin.length < 4) return toast.error(t.pinMinLength);
    setPwLoading(true);
    try {
      await changeUserPassword(pwModal._id, newPin);
      toast.success(`${t.pinChanged} ${pwModal.username}`);
      setPwModal(null);
      setNewPin("");
    } catch (err) {
      toast.error(err.response?.data?.message || t.failPin);
    } finally {
      setPwLoading(false);
    }
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-6 text-gray-500">{t.loading}</div>;

  return (
    <RequireAdmin>
      <div dir={isAr ? "rtl" : "ltr"} className="h-full overflow-y-auto">
        <div className="p-6 space-y-6">

          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Shield size={22} className="text-blue-500"/> {t.title}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t.subtitle}</p>
            </div>
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl
                hover:bg-blue-700 shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none text-sm font-medium">
              <UserPlus size={15}/> {t.addUser}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-4 text-gray-400"/>
            <input
              placeholder={t.searchStaff}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full ps-10 pe-4 py-3 rounded-xl
                bg-white dark:bg-[#141414]
                border border-gray-200 dark:border-white/10
                focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          {/* Create form */}
          <AnimatePresence>
            {showForm && (
              <motion.form
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                onSubmit={handleCreate}
                className="p-5 rounded-2xl bg-white dark:bg-[#141414]
                  border border-gray-200 dark:border-white/10
                  grid md:grid-cols-4 gap-3"
              >
                <input placeholder={t.username} required
                  className="border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5
                    bg-transparent text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}/>
                <input placeholder={t.pinPassword} type="password" required
                  className="border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5
                    bg-transparent text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/>
                <select
                  className="border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5
                    bg-white dark:bg-[#141414] text-sm outline-none"
                  value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="cashier">{t.cashier}</option>
                  <option value="admin">{t.admin}</option>
                </select>
                <button className="bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none text-sm font-medium">
                  {t.create}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Users grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(user => (
              <motion.div key={user._id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-white dark:bg-[#141414]
                  shadow-[6px_6px_16px_#d1d5db,-6px_-6px_16px_#ffffff]
                  dark:shadow-[6px_6px_16px_#050505,-6px_-6px_16px_#1a1a1a]
                  space-y-4"
              >
                {/* Avatar */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/40
                    flex items-center justify-center font-bold text-lg text-blue-600 dark:text-blue-300">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{user.username}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user.role === "admin" ? t.admin : t.cashier}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium
                  ${user.active
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
                  {user.active ? t.active : t.disabled}
                </span>

                {/* Device info */}
                <div className="space-y-1.5">
                  {user.deviceName ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Monitor size={12} className="shrink-0 text-blue-400"/>
                      <span className="truncate">{user.deviceName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-600">
                      <Monitor size={12} className="shrink-0"/>
                      <span>Not logged in</span>
                    </div>
                  )}
                  {user.lastLoginAt && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-600">
                      <Clock size={12} className="shrink-0"/>
                      <span>{new Date(user.lastLoginAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <button onClick={() => { setPwModal(user); setNewPin(""); }}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                      bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400
                      hover:bg-indigo-100 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none text-xs font-medium">
                    <KeyRound size={13}/> {t.changePin}
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => toggleStatus(user)}
                      className={`flex-1 py-2.5 rounded-xl text-white text-xs font-medium transition-[transform,box-shadow] duration-75 select-none active:shadow-none active:translate-y-[4px]
                        ${user.active ? "bg-red-500 hover:bg-red-600 shadow-[0_4px_0_0_#b91c1c]" : "bg-green-500 hover:bg-green-600 shadow-[0_4px_0_0_#15803d]"}`}>
                      {user.active ? t.disable : t.enable}
                    </button>
                    <button onClick={() => deleteUser(user._id)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-medium
                        bg-gray-100 dark:bg-[#252525] text-gray-600 dark:text-gray-400
                        hover:bg-gray-200 dark:hover:bg-[#333] shadow-[0_4px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                      {t.delete}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>

      {/* Change PIN modal */}
      <AnimatePresence>
        {pwModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
            onClick={e => { if (e.target === e.currentTarget) setPwModal(null); }}>
            <motion.div
              dir={isAr ? "rtl" : "ltr"}
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-8 w-full max-w-sm shadow-2xl">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold dark:text-white">
                  {t.changePinTitle} — <span className="text-blue-500">{pwModal.username}</span>
                </h2>
                <button onClick={() => setPwModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={18}/>
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t.changePinDesc}</p>
              <input type="password" placeholder={t.newPin} value={newPin}
                onChange={e => setNewPin(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10
                  bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none mb-4 text-sm"
                autoFocus/>
              <button onClick={handleChangePassword}
                disabled={pwLoading || newPin.length < 4}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm
                  hover:bg-blue-700 disabled:opacity-40 shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                {pwLoading ? t.saving : t.updatePin}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </RequireAdmin>
  );
}