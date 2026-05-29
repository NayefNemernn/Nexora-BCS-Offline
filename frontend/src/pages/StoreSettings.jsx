import React, { useEffect, useRef, useState } from "react";
import { getMyStore, updateStore, addCashier, updateCashier, removeCashier } from "../api/store.api";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useStoreSettingsTranslation } from "../hooks/useStoreSettingsTranslation";
import { useLang } from "../context/LanguageContext";
import { updateOnlineStore, getPromos, createPromo, updatePromo, deletePromo, getPointsOffers, createPointsOffer, updatePointsOffer, deletePointsOffer } from "../api/orders.api";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import {
  Store, Users, Settings, CreditCard, UserPlus, Trash2,
  LogOut, KeyRound, X, Save, CheckCircle, XCircle,
  AlertTriangle, Clock, ChevronDown, ChevronUp,
  Globe, Copy, Share2, Printer, ToggleLeft, ToggleRight,
  Tag, Star, Plus, Pencil,
} from "lucide-react";

const PLAN_COLORS = {
  trial:      "bg-yellow-100 text-yellow-700 border-yellow-200",
  basic:      "bg-blue-100 text-blue-700 border-blue-200",
  pro:        "bg-purple-100 text-purple-700 border-purple-200",
  enterprise: "bg-green-100 text-green-700 border-green-200",
};

export default function StoreSettings() {
  const { store: ctxStore, updateStore: updateCtxStore, user } = useAuth();
  const t = useStoreSettingsTranslation();
  const { lang } = useLang();

  const [tab,          setTab]          = useState("settings");
  const [store,        setStore]        = useState(null);
  const [cashiers,     setCashiers]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [pwModal,      setPwModal]      = useState(null);
  const [newPassword,  setNewPassword]  = useState("");
  const [expanded,     setExpanded]     = useState({});

  const [form, setForm] = useState({
    name: "", address: "", phone: "", email: "", taxNumber: "",
    currency: "USD", currencySymbol: "$", taxRate: 0,
    language: "en", receiptFooter: "",
  });

  const [cashierForm, setCashierForm] = useState({ username: "", password: "", maxDevices: 1 });
  const [onlineForm,  setOnlineForm]  = useState({ isOnlineStoreActive: false, deliveryFee: 0, minimumOrder: 0, deliveryTimeMin: 30, deliveryTimeMax: 60, pointsEnabled: false, pointsPerUnit: 1, telegramBotToken: "", adminTelegramChatId: "", deliveryDrivers: [], deliveryPhone: "" });
  const [savingOnline, setSavingOnline] = useState(false);
  const [fetchingChatId, setFetchingChatId] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: "", chatId: "" });

  // Promos state
  const [promos,       setPromos]       = useState([]);
  const [promoForm,    setPromoForm]    = useState({ code: "", type: "percent", value: "", minOrder: "", usageLimit: "", expiresAt: "", isActive: true });
  const [editingPromo, setEditingPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // Points offers state
  const [ptOffers,      setPtOffers]      = useState([]);
  const [ptForm,        setPtForm]        = useState({ name: "", description: "", pointsCost: "", offerType: "discount_fixed", offerValue: "", isActive: true, validUntil: "" });
  const [editingOffer,  setEditingOffer]  = useState(null);
  const [ptLoading,     setPtLoading]     = useState(false);
  const [backendUrl, setBackendUrl] = useState(import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL?.replace(/\/api$/, "") || "http://localhost:5000");
  const [settingWebhook, setSettingWebhook] = useState(false);
  const qrRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [storeData, usersData] = await Promise.all([
        getMyStore(),
        api.get("/users").then(r => r.data),
      ]);
      setStore(storeData);
      setCashiers(usersData);
      setForm({
        name:           storeData.name           || "",
        address:        storeData.address        || "",
        phone:          storeData.phone          || "",
        email:          storeData.email          || "",
        taxNumber:      storeData.taxNumber      || "",
        currency:       storeData.currency       || "USD",
        currencySymbol: storeData.currencySymbol || "$",
        taxRate:        storeData.taxRate        || 0,
        language:       storeData.language       || "en",
        receiptFooter:  storeData.receiptFooter  || "",
      });
      setOnlineForm({
        isOnlineStoreActive: storeData.isOnlineStoreActive || false,
        deliveryFee:         storeData.deliveryFee         || 0,
        minimumOrder:        storeData.minimumOrder        || 0,
        deliveryTimeMin:     storeData.deliveryTimeMin     || 30,
        deliveryTimeMax:     storeData.deliveryTimeMax     || 60,
        pointsEnabled:       storeData.pointsEnabled       || false,
        pointsPerUnit:       storeData.pointsPerUnit       || 1,
        telegramBotToken:    storeData.telegramBotToken    || "",
        adminTelegramChatId: storeData.adminTelegramChatId || "",
        deliveryDrivers:     storeData.deliveryDrivers     || [],
        deliveryPhone:       storeData.deliveryPhone       || "",
      });
    } catch {
      toast.error(t.failedToLoad);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateStore(form);
      updateCtxStore(res.store);
      setStore(res.store);
      toast.success(t.saved);
    } catch {
      toast.error(t.failedToSave);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCashier = async (e) => {
    e.preventDefault();
    try {
      await addCashier(cashierForm);
      toast.success(t.cashierAdded);
      setCashierForm({ username: "", password: "", maxDevices: 1 });
      setShowAddForm(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || t.failedToAdd);
    }
  };

  const handleToggleCashier = async (cashier) => {
    try {
      await updateCashier(cashier._id, { active: !cashier.active });
      toast.success(`${cashier.username} ${cashier.active ? t.toastDisabled : t.toastEnabled}`);
      loadData();
    } catch {
      toast.error(t.failedToUpdate);
    }
  };

  const handleRemoveCashier = async (cashier) => {
    if (!confirm(`Permanently delete "${cashier.username}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${cashier._id}`);
      toast.success(t.userDeleted);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || t.failedToDelete);
    }
  };

  const handleForceLogout = async (cashier) => {
    try {
      await api.post(`/users/${cashier._id}/force-logout`);
      toast.success(`${cashier.username} ${t.loggedOut}`);
      loadData();
    } catch {
      toast.error(t.failed);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 4) { toast.error(t.minFourChars); return; }
    try {
      await api.post(`/users/${pwModal._id}/change-password`, { newPassword });
      toast.success(t.passwordChanged);
      setPwModal(null); setNewPassword("");
    } catch {
      toast.error(t.failedToChange);
    }
  };

  const handleUpdateDevices = async (cashier, delta) => {
    const newMax = (cashier.maxDevices || 1) + delta;
    if (newMax < 1 || newMax > 10) return;
    try {
      await api.patch(`/users/${cashier._id}`, { maxDevices: newMax });
      toast.success(`${t.maxDevicesSet} ${newMax}`);
      loadData();
    } catch {
      toast.error(t.failed);
    }
  };

  const STORE_FRONTEND_URL = import.meta.env.VITE_STORE_URL || "http://localhost:5174";
  const storePublicUrl = store?.slug ? `${STORE_FRONTEND_URL}/store/${store.slug}` : "";

  const handleSaveOnline = async () => {
    setSavingOnline(true);
    try {
      const res = await updateOnlineStore(onlineForm);
      setStore(s => ({ ...s, ...onlineForm }));
      toast.success("Online store settings saved");
    } catch {
      toast.error("Failed to save online store settings");
    } finally { setSavingOnline(false); }
  };

  const testTelegram = async () => {
    setTestingTelegram(true);
    try {
      const res = await api.post("/store/telegram-test");
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Test failed");
    } finally { setTestingTelegram(false); }
  };

  const fetchDeliveryManChatId = async () => {
    setFetchingChatId(true);
    try {
      const res = await api.get("/store/telegram-last-chat");
      setNewDriver(d => ({ ...d, chatId: String(res.data.id), name: d.name || res.data.name }));
      toast.success(`Got Chat ID: ${res.data.id} (${res.data.name})`);
    } catch (err) {
      toast.error(err.response?.data?.message || "No message received yet");
    } finally { setFetchingChatId(false); }
  };

  const addDriver = () => {
    if (!newDriver.name.trim() || !newDriver.chatId.trim()) {
      toast.error("Enter both driver name and chat ID"); return;
    }
    setOnlineForm(f => ({ ...f, deliveryDrivers: [...f.deliveryDrivers, { name: newDriver.name.trim(), chatId: newDriver.chatId.trim() }] }));
    setNewDriver({ name: "", chatId: "" });
  };

  const removeDriver = (idx) => {
    setOnlineForm(f => ({ ...f, deliveryDrivers: f.deliveryDrivers.filter((_, i) => i !== idx) }));
  };

  const setupWebhook = async () => {
    setSettingWebhook(true);
    try {
      const res = await api.post("/store/telegram-set-webhook", { backendUrl });
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to set webhook");
    } finally { setSettingWebhook(false); }
  };

  const copyStoreLink = () => {
    navigator.clipboard.writeText(storePublicUrl);
    toast.success("Store link copied!");
  };

  const shareWhatsApp = () => {
    const msg = `🛒 Shop online at *${store?.name}*!\n\n${storePublicUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const printQR = () => {
    const svg  = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const win = window.open("", "_blank", "width=400,height=600");
    win.document.write(`<!DOCTYPE html><html><head><title>QR Code</title>
    <style>
      body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;padding:20px;text-align:center}
      .store-name{font-size:24px;font-weight:900;margin-bottom:10px}
      .scan-text{font-size:18px;font-weight:700;color:#555;margin-bottom:20px}
      svg{width:220px;height:220px}
      .url{font-size:11px;color:#888;margin-top:16px;word-break:break-all;max-width:260px}
      @media print{@page{size:A5;margin:1cm}}
    </style></head><body>
    <div class="store-name">🧾 ${store?.name}</div>
    <div class="scan-text">📱 Scan here to order online</div>
    ${svgData}
    <div class="url">${storePublicUrl}</div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  // ── Promo handlers ──────────────────────────────────────────
  const loadPromos = async () => {
    setPromoLoading(true);
    try { setPromos(await getPromos()); } catch {}
    finally { setPromoLoading(false); }
  };

  const handleSavePromo = async () => {
    try {
      const payload = {
        code:       promoForm.code,
        type:       promoForm.type,
        value:      Number(promoForm.value),
        minOrder:   Number(promoForm.minOrder) || 0,
        usageLimit: Number(promoForm.usageLimit) || 0,
        expiresAt:  promoForm.expiresAt || null,
        isActive:   promoForm.isActive,
      };
      if (editingPromo) {
        await updatePromo(editingPromo._id, payload);
        toast.success("Promo updated");
      } else {
        await createPromo(payload);
        toast.success("Promo created");
      }
      setEditingPromo(null);
      setPromoForm({ code: "", type: "percent", value: "", minOrder: "", usageLimit: "", expiresAt: "", isActive: true });
      loadPromos();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to save promo"); }
  };

  const handleDeletePromo = async (id) => {
    if (!confirm("Delete this promo code?")) return;
    try { await deletePromo(id); toast.success("Deleted"); loadPromos(); }
    catch { toast.error("Failed to delete"); }
  };

  const startEditPromo = (p) => {
    setEditingPromo(p);
    setPromoForm({ code: p.code, type: p.type, value: p.value, minOrder: p.minOrder || "", usageLimit: p.usageLimit || "", expiresAt: p.expiresAt ? p.expiresAt.slice(0, 10) : "", isActive: p.isActive });
  };

  // ── Points offer handlers ────────────────────────────────────
  const loadPtOffers = async () => {
    setPtLoading(true);
    try { setPtOffers(await getPointsOffers()); } catch {}
    finally { setPtLoading(false); }
  };

  const handleSavePtOffer = async () => {
    try {
      const payload = {
        name:        ptForm.name,
        description: ptForm.description,
        pointsCost:  Number(ptForm.pointsCost),
        offerType:   ptForm.offerType,
        offerValue:  Number(ptForm.offerValue) || 0,
        isActive:    ptForm.isActive,
        validUntil:  ptForm.validUntil || null,
      };
      if (editingOffer) {
        await updatePointsOffer(editingOffer._id, payload);
        toast.success("Offer updated");
      } else {
        await createPointsOffer(payload);
        toast.success("Offer created");
      }
      setEditingOffer(null);
      setPtForm({ name: "", description: "", pointsCost: "", offerType: "discount_fixed", offerValue: "", isActive: true, validUntil: "" });
      loadPtOffers();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to save offer"); }
  };

  const handleDeletePtOffer = async (id) => {
    if (!confirm("Delete this offer?")) return;
    try { await deletePointsOffer(id); toast.success("Deleted"); loadPtOffers(); }
    catch { toast.error("Failed to delete"); }
  };

  const startEditOffer = (o) => {
    setEditingOffer(o);
    setPtForm({ name: o.name, description: o.description || "", pointsCost: o.pointsCost, offerType: o.offerType, offerValue: o.offerValue || "", isActive: o.isActive, validUntil: o.validUntil ? o.validUntil.slice(0, 10) : "" });
  };

  const expiry    = store?.planExpiresAt ? new Date(store.planExpiresAt) : null;
  const expired   = expiry && expiry < new Date();
  const daysLeft  = expiry ? Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)) : null;

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-neutral-950" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="p-5 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Store size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold dark:text-white">{t.title}</h1>
            <p className="text-xs text-gray-500">{store?.name} · {store?.slug}</p>
          </div>
        </div>

        {/* Plan Banner */}
        {store && (
          <div className={`flex items-center gap-4 p-4 rounded-2xl border ${expired ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-500/30" : daysLeft <= 7 ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-500/30" : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"}`}>
            <CreditCard size={18} className={expired ? "text-red-500" : daysLeft <= 7 ? "text-yellow-500" : "text-indigo-500"} />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${PLAN_COLORS[store.plan] || "bg-gray-100 text-gray-600"}`}>
                  {(store.plan || "trial").toUpperCase()} PLAN
                </span>
                {expired
                  ? <span className="text-sm text-red-600 font-medium flex items-center gap-1"><AlertTriangle size={13}/> {t.planExpired}</span>
                  : daysLeft <= 7
                  ? <span className="text-sm text-yellow-600 font-medium flex items-center gap-1"><Clock size={13}/> {daysLeft} {t.daysRemaining}</span>
                  : <span className="text-sm text-gray-500">{daysLeft} {t.daysRemaining} · {t.expires} {expiry?.toLocaleDateString()}</span>
                }
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {store.maxUsers} {t.usersUsed} · {store.maxProducts} {t.totalProducts || "products"} · {cashiers.length} {t.devicesActive}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/10 w-fit flex-wrap">
          {[
            { id: "settings",     label: t.storeInfo,     icon: Settings },
            { id: "cashiers",     label: t.team,          icon: Users    },
            { id: "onlinestore",  label: "Online Store",  icon: Globe    },
            { id: "promos",       label: "Promos",        icon: Tag      },
            { id: "points",       label: "Points",        icon: Star     },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => {
              setTab(id);
              if (id === "promos")  loadPromos();
              if (id === "points")  loadPtOffers();
            }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-[transform,box-shadow] duration-75 select-none
                ${tab === id ? "bg-indigo-600 text-white shadow-[0_4px_0_0_#3730a3] active:shadow-none active:translate-y-[4px]" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 active:translate-y-[4px]"}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── STORE SETTINGS TAB ── */}
        {tab === "settings" && (
          <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/5 p-6 space-y-6">

            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{t.businessInfo}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: t.storeName,  key: "name",      placeholder: "My Store" },
                  { label: t.phone,      key: "phone",     placeholder: "+1 555 0000" },
                  { label: t.email,      key: "email",     placeholder: "store@example.com", type: "email" },
                  { label: t.address,    key: "address",   placeholder: "123 Main St" },
                  { label: t.taxNumber,  key: "taxNumber", placeholder: "VAT/EIN" },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                    <input
                      type={type || "text"}
                      value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{t.currencyTax}</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t.currencyCode}</label>
                  <input
                    value={form.currency}
                    onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
                    placeholder="USD"
                    maxLength={3}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t.currencySymbol}</label>
                  <input
                    value={form.currencySymbol}
                    onChange={e => setForm(f => ({ ...f, currencySymbol: e.target.value }))}
                    placeholder="$"
                    maxLength={3}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t.taxRate}</label>
                  <input
                    type="number" min="0" max="100" step="0.1"
                    value={form.taxRate}
                    onChange={e => setForm(f => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{t.receiptFooter}</h2>
              <textarea
                value={form.receiptFooter}
                onChange={e => setForm(f => ({ ...f, receiptFooter: e.target.value }))}
                placeholder={t.receiptFooterPlaceholder}
                rows={3}
                className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-[0_4px_0_0_#3730a3] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"
            >
              <Save size={14} />
              {saving ? t.saving : t.saveSettings}
            </button>
          </div>
        )}

        {/* ── TEAM TAB ── */}
        {tab === "cashiers" && (
          <div className="space-y-4">

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {cashiers.length} / {store?.maxUsers} {t.usersUsed}
              </p>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_0_0_#3730a3] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none"
              >
                <UserPlus size={14} /> {t.addCashier}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddCashier}
                className="p-4 rounded-2xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 grid sm:grid-cols-4 gap-3">
                <input
                  required placeholder={t.usernameLabel}
                  value={cashierForm.username}
                  onChange={e => setCashierForm(f => ({ ...f, username: e.target.value }))}
                  className="border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
                <input
                  required type="password" placeholder={t.passwordLabel}
                  value={cashierForm.password}
                  onChange={e => setCashierForm(f => ({ ...f, password: e.target.value }))}
                  className="border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
                <select
                  value={cashierForm.maxDevices}
                  onChange={e => setCashierForm(f => ({ ...f, maxDevices: +e.target.value }))}
                  className="border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-[#141414] dark:text-white text-sm outline-none"
                >
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} {n > 1 ? t.devicesUnitPlural : t.devicesUnit}</option>)}
                </select>
                <button className="bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none text-sm font-semibold py-2.5">
                  {t.create}
                </button>
              </form>
            )}

            <div className="space-y-3">
              {cashiers.map(cashier => {
                const isSelf = cashier._id === user?._id;
                return (
                <div key={cashier._id} className={`bg-white dark:bg-[#141414] rounded-2xl border overflow-hidden
                  ${isSelf ? "border-indigo-200 dark:border-indigo-500/30" : "border-gray-100 dark:border-white/5"}`}>
                  <div className="flex items-center gap-4 px-5 py-4 flex-wrap">

                    <div className="flex items-center gap-3 flex-1 min-w-40">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                          ${cashier.role === "admin" ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600" : "bg-gray-100 dark:bg-gray-800 text-gray-600"}`}>
                          {cashier.username.charAt(0).toUpperCase()}
                        </div>
                        {cashier.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#141414]"/>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm dark:text-white">{cashier.username}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">{cashier.role}</span>
                          {isSelf && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 font-medium">{t.you}</span>}
                          {!cashier.active && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">{t.disabled}</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {cashier.activeDevices || 0}/{cashier.maxDevices || 1} {t.devicesActive}
                        </p>
                      </div>
                    </div>

                    {/* Device controls */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleUpdateDevices(cashier, -1)} disabled={(cashier.maxDevices || 1) <= 1}
                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 text-sm transition">−</button>
                      <span className="text-sm font-semibold w-4 text-center dark:text-white">{cashier.maxDevices || 1}</span>
                      <button onClick={() => handleUpdateDevices(cashier, +1)} disabled={(cashier.maxDevices || 1) >= 10}
                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 text-sm transition">+</button>
                      <span className="text-xs text-gray-400">{t.devicesUnitPlural}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ms-auto">
                      <button onClick={() => { setPwModal(cashier); setNewPassword(""); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition">
                        <KeyRound size={11} /> {t.passwordLabel}
                      </button>
                      {cashier.isOnline && !isSelf && (
                        <button onClick={() => handleForceLogout(cashier)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 transition">
                          <LogOut size={11} /> {t.kick}
                        </button>
                      )}
                      <button onClick={() => handleToggleCashier(cashier)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition
                          ${cashier.active ? "bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100" : "bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100"}`}>
                        {cashier.active ? <><XCircle size={11}/> {t.disable}</> : <><CheckCircle size={11}/> {t.enable}</>}
                      </button>
                      {!isSelf && (
                        <button onClick={() => handleRemoveCashier(cashier)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}

              {cashiers.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t.noUsersFound}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ONLINE STORE TAB ── */}
        {tab === "onlinestore" && (
          <div className="space-y-5">

            {/* Toggle + basic settings */}
            <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/5 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800 dark:text-white">Online Store</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Allow customers to browse and order online</p>
                </div>
                <button onClick={() => setOnlineForm(f => ({ ...f, isOnlineStoreActive: !f.isOnlineStoreActive }))}
                  className="flex items-center gap-2 transition">
                  {onlineForm.isOnlineStoreActive
                    ? <ToggleRight size={36} className="text-green-500" />
                    : <ToggleLeft  size={36} className="text-gray-400"  />}
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Delivery Fee ({store?.currencySymbol})</label>
                  <input type="number" min="0" step="0.01"
                    value={onlineForm.deliveryFee}
                    onChange={e => setOnlineForm(f => ({ ...f, deliveryFee: +e.target.value }))}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Minimum Order ({store?.currencySymbol})</label>
                  <input type="number" min="0" step="0.01"
                    value={onlineForm.minimumOrder}
                    onChange={e => setOnlineForm(f => ({ ...f, minimumOrder: +e.target.value }))}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Est. Delivery Min (minutes)</label>
                  <input type="number" min="1"
                    value={onlineForm.deliveryTimeMin}
                    onChange={e => setOnlineForm(f => ({ ...f, deliveryTimeMin: +e.target.value }))}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Est. Delivery Max (minutes)</label>
                  <input type="number" min="1"
                    value={onlineForm.deliveryTimeMax}
                    onChange={e => setOnlineForm(f => ({ ...f, deliveryTimeMax: +e.target.value }))}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              {/* Points system */}
              <div className="border-t dark:border-white/10 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-1.5"><Star size={14} className="text-yellow-500" /> Loyalty Points</p>
                    <p className="text-xs text-gray-500 mt-0.5">Customers earn points on every completed order</p>
                  </div>
                  <button onClick={() => setOnlineForm(f => ({ ...f, pointsEnabled: !f.pointsEnabled }))} className="flex items-center gap-2 transition">
                    {onlineForm.pointsEnabled ? <ToggleRight size={32} className="text-green-500" /> : <ToggleLeft size={32} className="text-gray-400" />}
                  </button>
                </div>
                {onlineForm.pointsEnabled && (
                  <div className="max-w-xs">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Points per {store?.currencySymbol || "$"} spent</label>
                    <input type="number" min="0.1" step="0.1"
                      value={onlineForm.pointsPerUnit}
                      onChange={e => setOnlineForm(f => ({ ...f, pointsPerUnit: +e.target.value }))}
                      className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                    <p className="text-xs text-gray-400 mt-1">e.g. 1 = 1 point per $1 spent</p>
                  </div>
                )}
              </div>

              {/* Delivery phone number */}
              <div className="border-t dark:border-white/10 pt-4">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Delivery Contact Number
                </label>
                <p className="text-xs text-gray-400 mb-2">Printed on receipts so customers can call for delivery inquiries.</p>
                <input
                  type="tel"
                  placeholder="+961 XX XXX XXX"
                  value={onlineForm.deliveryPhone}
                  onChange={e => setOnlineForm(f => ({ ...f, deliveryPhone: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button onClick={handleSaveOnline} disabled={savingOnline}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm shadow-[0_4px_0_0_#3730a3] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                <Save size={15} />
                {savingOnline ? "Saving..." : "Save Online Settings"}
              </button>
            </div>

            {/* Telegram delivery notifications */}
            <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/5 p-6 space-y-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✈️</span>
                <div>
                  <h2 className="font-semibold text-gray-800 dark:text-white">Telegram — Delivery Drivers</h2>
                  <p className="text-sm text-gray-500 mt-0.5">All drivers get notified. First to accept claims the order.</p>
                </div>
              </div>

              {/* Bot token */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Bot Token (from @BotFather)</label>
                <input type="text" placeholder="1234567890:AAFxxxxx"
                  value={onlineForm.telegramBotToken}
                  onChange={e => setOnlineForm(f => ({ ...f, telegramBotToken: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              </div>

              {/* Admin chat ID for reports */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Admin Chat ID <span className="text-blue-500">(for reports)</span>
                </label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Your personal Telegram chat ID"
                    value={onlineForm.adminTelegramChatId}
                    onChange={e => setOnlineForm(f => ({ ...f, adminTelegramChatId: e.target.value }))}
                    className="flex-1 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                  <button
                    disabled={fetchingChatId || !onlineForm.telegramBotToken}
                    onClick={async () => {
                      setFetchingChatId(true);
                      try {
                        const res = await import("../api/axios").then(m => m.default.get("/store/telegram-chat-id", { params: { token: onlineForm.telegramBotToken } }));
                        if (res.data?.id) {
                          setOnlineForm(f => ({ ...f, adminTelegramChatId: String(res.data.id) }));
                          toast.success(`Got chat ID: ${res.data.id}`);
                        } else {
                          toast.error("No recent message found. Send any message to your bot first.");
                        }
                      } catch { toast.error("Failed to fetch chat ID"); }
                      finally { setFetchingChatId(false); }
                    }}
                    className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs font-semibold rounded-xl transition disabled:opacity-50 whitespace-nowrap">
                    {fetchingChatId ? "..." : "Get ID"}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Send any message to your bot first, then click "Get ID". Used to receive sales reports.
                </p>
              </div>

              {/* Drivers list */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Drivers ({onlineForm.deliveryDrivers.length})
                </label>
                {onlineForm.deliveryDrivers.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {onlineForm.deliveryDrivers.map((d, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 rounded-xl px-3 py-2.5">
                        <span className="text-lg">🚗</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">{d.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{d.chatId}</p>
                        </div>
                        <button onClick={() => removeDriver(i)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new driver */}
                <div className="border border-dashed border-gray-200 dark:border-white/10 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Add Driver</p>
                  <input type="text" placeholder="Driver name (e.g. Ahmad)"
                    value={newDriver.name}
                    onChange={e => setNewDriver(d => ({ ...d, name: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                  <div className="flex gap-2">
                    <input type="text" placeholder="Chat ID (e.g. 123456789)"
                      value={newDriver.chatId}
                      onChange={e => setNewDriver(d => ({ ...d, chatId: e.target.value }))}
                      className="flex-1 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                    <button onClick={fetchDeliveryManChatId} disabled={fetchingChatId || !onlineForm.telegramBotToken}
                      className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs font-semibold rounded-xl transition disabled:opacity-50 whitespace-nowrap">
                      {fetchingChatId ? "..." : "Get ID"}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400">Driver must send any message to the bot first, then click "Get ID"</p>
                  <button onClick={addDriver}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition">
                    + Add Driver
                  </button>
                </div>
              </div>

              {/* Webhook setup */}
              <div className="border border-gray-100 dark:border-white/10 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Webhook (for "Accept" button to work)</p>
                <input type="text" placeholder="https://your-api.railway.app"
                  value={backendUrl}
                  onChange={e => setBackendUrl(e.target.value)}
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                <p className="text-[11px] text-gray-400">Your backend URL. Must be HTTPS for Telegram buttons to work.</p>
                <button onClick={setupWebhook} disabled={settingWebhook || !onlineForm.telegramBotToken}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition">
                  {settingWebhook ? "Setting..." : "🔗 Set Webhook"}
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={handleSaveOnline} disabled={savingOnline}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                  <Save size={15} />
                  {savingOnline ? "Saving..." : "Save"}
                </button>
                <button onClick={testTelegram} disabled={testingTelegram}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                  {testingTelegram ? "Sending..." : "✈️ Test All Drivers"}
                </button>
              </div>
            </div>

            {/* Store link + QR */}
            {store?.slug && (
              <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/5 p-6 space-y-5">
                <h2 className="font-semibold text-gray-800 dark:text-white">Store Link & QR Code</h2>

                {/* URL display */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm text-blue-600 font-mono truncate border dark:border-gray-700">
                    {storePublicUrl}
                  </div>
                  <button onClick={copyStoreLink}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition" title="Copy link">
                    <Copy size={16} className="text-gray-600 dark:text-gray-300" />
                  </button>
                  <button onClick={shareWhatsApp}
                    className="p-2.5 rounded-xl bg-green-500 hover:bg-green-600 transition" title="Share on WhatsApp">
                    <Share2 size={16} className="text-white" />
                  </button>
                </div>

                {/* QR Code */}
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div ref={qrRef} className="bg-white p-4 rounded-2xl border shadow-sm">
                    <QRCodeSVG value={storePublicUrl} size={160} level="H" includeMargin />
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Print this QR code and place it at your counter so customers can scan to order online.
                    </p>
                    <button onClick={printQR}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 dark:bg-white dark:text-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-700 dark:hover:bg-gray-100 shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                      <Printer size={16} /> Print QR Code
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Promos Tab ─────────────────────────────────────── */}
        {tab === "promos" && (
          <div className="space-y-5">
            {/* Promo form */}
            <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/5 p-6 space-y-4">
              <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Tag size={16} className="text-indigo-500" />
                {editingPromo ? "Edit Promo Code" : "New Promo Code"}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Code</label>
                  <input value={promoForm.code} onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. SAVE10"
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                  <select value={promoForm.type} onChange={e => setPromoForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-[#141414] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="percent">Percent (%)</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Value ({promoForm.type === "percent" ? "%" : store?.currencySymbol})</label>
                  <input type="number" min="0" value={promoForm.value} onChange={e => setPromoForm(f => ({ ...f, value: e.target.value }))}
                    placeholder="0"
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Min Order ({store?.currencySymbol}) — 0 for none</label>
                  <input type="number" min="0" value={promoForm.minOrder} onChange={e => setPromoForm(f => ({ ...f, minOrder: e.target.value }))}
                    placeholder="0"
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Usage Limit — 0 for unlimited</label>
                  <input type="number" min="0" value={promoForm.usageLimit} onChange={e => setPromoForm(f => ({ ...f, usageLimit: e.target.value }))}
                    placeholder="0"
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Expires (optional)</label>
                  <input type="date" value={promoForm.expiresAt} onChange={e => setPromoForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={promoForm.isActive} onChange={e => setPromoForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
                </label>
                <button onClick={handleSavePromo}
                  className="ml-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-[0_4px_0_0_#3730a3] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                  <Save size={14} /> {editingPromo ? "Update" : "Create"} Promo
                </button>
                {editingPromo && (
                  <button onClick={() => { setEditingPromo(null); setPromoForm({ code: "", type: "percent", value: "", minOrder: "", usageLimit: "", expiresAt: "", isActive: true }); }}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Promo list */}
            <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/5 p-6">
              <h3 className="font-semibold text-gray-700 dark:text-white mb-4">All Promo Codes</h3>
              {promoLoading ? (
                <div className="text-sm text-gray-400">Loading...</div>
              ) : promos.length === 0 ? (
                <div className="text-sm text-gray-400">No promo codes yet.</div>
              ) : (
                <div className="space-y-2">
                  {promos.map(p => (
                    <div key={p._id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-gray-800 dark:text-white">{p.code}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${p.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                            {p.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {p.type === "percent" ? `${p.value}% off` : `${store?.currencySymbol}${p.value} off`}
                          {p.minOrder > 0 ? ` · min ${store?.currencySymbol}${p.minOrder}` : ""}
                          {p.usageLimit > 0 ? ` · ${p.usedCount}/${p.usageLimit} used` : ` · ${p.usedCount} used`}
                          {p.expiresAt ? ` · expires ${new Date(p.expiresAt).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <button onClick={() => startEditPromo(p)} className="p-1.5 text-gray-400 hover:text-indigo-600 transition"><Pencil size={14} /></button>
                      <button onClick={() => handleDeletePromo(p._id)} className="p-1.5 text-gray-400 hover:text-red-500 transition"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Points Offers Tab ──────────────────────────────── */}
        {tab === "points" && (
          <div className="space-y-5">
            {/* Offer form */}
            <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/5 p-6 space-y-4">
              <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Star size={16} className="text-yellow-500" />
                {editingOffer ? "Edit Points Offer" : "New Points Offer"}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Offer Name</label>
                  <input value={ptForm.name} onChange={e => setPtForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Free Delivery"
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
                  <input value={ptForm.description} onChange={e => setPtForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="e.g. Redeem 100 points for free delivery"
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Points Cost</label>
                  <input type="number" min="1" value={ptForm.pointsCost} onChange={e => setPtForm(f => ({ ...f, pointsCost: e.target.value }))}
                    placeholder="100"
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Offer Type</label>
                  <select value={ptForm.offerType} onChange={e => setPtForm(f => ({ ...f, offerType: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-[#141414] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="discount_fixed">Fixed Discount</option>
                    <option value="discount_percent">Percent Discount</option>
                    <option value="free_delivery">Free Delivery</option>
                  </select>
                </div>
                {ptForm.offerType !== "free_delivery" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Offer Value ({ptForm.offerType === "discount_percent" ? "%" : store?.currencySymbol})
                    </label>
                    <input type="number" min="0" value={ptForm.offerValue} onChange={e => setPtForm(f => ({ ...f, offerValue: e.target.value }))}
                      placeholder="0"
                      className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Valid Until (optional)</label>
                  <input type="date" value={ptForm.validUntil} onChange={e => setPtForm(f => ({ ...f, validUntil: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={ptForm.isActive} onChange={e => setPtForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
                </label>
                <button onClick={handleSavePtOffer}
                  className="ml-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-[0_4px_0_0_#3730a3] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                  <Save size={14} /> {editingOffer ? "Update" : "Create"} Offer
                </button>
                {editingOffer && (
                  <button onClick={() => { setEditingOffer(null); setPtForm({ name: "", description: "", pointsCost: "", offerType: "discount_fixed", offerValue: "", isActive: true, validUntil: "" }); }}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 shadow-[0_4px_0_0_rgba(0,0,0,0.12)] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Offers list */}
            <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/5 p-6">
              <h3 className="font-semibold text-gray-700 dark:text-white mb-4">All Points Offers</h3>
              {ptLoading ? (
                <div className="text-sm text-gray-400">Loading...</div>
              ) : ptOffers.length === 0 ? (
                <div className="text-sm text-gray-400">No points offers yet. Enable points in the Online Store tab first.</div>
              ) : (
                <div className="space-y-2">
                  {ptOffers.map(o => (
                    <div key={o._id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                      <Star size={16} className="text-yellow-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800 dark:text-white">{o.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${o.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                            {o.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {o.pointsCost} pts ·{" "}
                          {o.offerType === "free_delivery" ? "Free Delivery" : o.offerType === "discount_percent" ? `${o.offerValue}% off` : `${store?.currencySymbol}${o.offerValue} off`}
                          {o.usedCount > 0 ? ` · used ${o.usedCount}x` : ""}
                          {o.validUntil ? ` · expires ${new Date(o.validUntil).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <button onClick={() => startEditOffer(o)} className="p-1.5 text-gray-400 hover:text-indigo-600 transition"><Pencil size={14} /></button>
                      <button onClick={() => handleDeletePtOffer(o._id)} className="p-1.5 text-gray-400 hover:text-red-500 transition"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      {pwModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setPwModal(null); }}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold dark:text-white">{t.changePassword} — <span className="text-indigo-500">{pwModal.username}</span></h2>
              <button onClick={() => setPwModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <input
              type="password" placeholder={t.newPasswordPlaceholder} value={newPassword}
              onChange={e => setNewPassword(e.target.value)} autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm mb-4"
            />
            <button onClick={handleChangePassword} disabled={newPassword.length < 4}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm shadow-[0_4px_0_0_#3730a3] active:shadow-none active:translate-y-[4px] transition-[transform,box-shadow] duration-75 select-none">
              {t.updatePassword}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
