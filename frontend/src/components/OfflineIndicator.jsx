import { useState, useEffect, useCallback } from "react";
import useOfflineSales from "../hooks/useOfflineSales";
import { getProductsCacheAge } from "../lib/offlineDB";
import { useLang } from "../context/LanguageContext";
import toast from "react-hot-toast";
import { WifiOff, RefreshCw, CloudOff, UploadCloud, Clock } from "lucide-react";

function formatAge(ms) {
  if (ms === null) return null;
  const sec = Math.floor(ms / 1000);
  if (sec < 60)    return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60)    return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)     return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

// In Electron (desktop), navigator.onLine reflects internet — not the local
// backend. We treat the app as always online when running as a desktop app.
const IS_ELECTRON = Boolean(window.electronAPI);

export default function OfflineIndicator() {
  const [isOnline,     setIsOnline]     = useState(IS_ELECTRON ? true : navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [cacheAge,     setCacheAge]     = useState(null);
  const [syncing,      setSyncing]      = useState(false);
  const { sync, getPendingCount }       = useOfflineSales();
  const { lang }                        = useLang();
  const isAr = lang === "ar";

  const refreshCount = useCallback(async () => {
    try {
      setPendingCount(await getPendingCount());
      setCacheAge(await getProductsCacheAge());
    } catch {}
  }, [getPendingCount]);

  useEffect(() => {
    refreshCount();

    const runSync = async () => {
      if (syncing) return;
      const count = await getPendingCount();
      if (count === 0) return;
      setSyncing(true);
      try {
        const { synced, failed } = await sync();
        if (synced > 0) toast.success(isAr ? `✅ تمت مزامنة ${synced} سجل` : `✅ ${synced} record(s) synced!`);
        if (failed > 0) toast.error(isAr ? `⚠️ فشل ${failed} سجل` : `⚠️ ${failed} failed to sync`);
        await refreshCount();
      } finally { setSyncing(false); }
    };

    const goOnline = async () => {
      if (IS_ELECTRON) return; // desktop is always "online"
      setIsOnline(true);
      /* small delay — let the network stabilise before hitting the API */
      await new Promise(r => setTimeout(r, 1500));
      await runSync();
    };

    const goOffline = () => {
      if (IS_ELECTRON) return; // desktop doesn't need internet
      setIsOnline(false);
      toast(isAr ? "📴 أنت غير متصل — ستُحفظ المبيعات محلياً" : "📴 You're offline — sales will be saved locally", {
        icon: "⚠️", duration: 4000,
      });
    };

    const onSynced = () => refreshCount();

    window.addEventListener("online",        goOnline);
    window.addEventListener("offline",       goOffline);
    window.addEventListener("offlineSynced", onSynced);

    /* every 30 s: auto-sync if online and there are pending items */
    const interval = setInterval(async () => {
      await refreshCount();
      if (navigator.onLine) await runSync();
    }, 30000);

    return () => {
      window.removeEventListener("online",        goOnline);
      window.removeEventListener("offline",       goOffline);
      window.removeEventListener("offlineSynced", onSynced);
      clearInterval(interval);
    };
  }, [sync, getPendingCount, refreshCount, isAr]);

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error(isAr ? "أنت غير متصل بالإنترنت" : "You're offline — connect to internet first");
      return;
    }
    if (syncing) return;
    setSyncing(true);
    try {
      const { synced, failed } = await sync();
      if (synced > 0) toast.success(isAr ? `✅ تمت مزامنة ${synced} سجل` : `✅ ${synced} record(s) synced!`);
      else if (failed === 0) toast(isAr ? "لا شيء للمزامنة" : "Nothing to sync", { icon: "✓" });
      if (failed > 0) toast.error(isAr ? `⚠️ فشل ${failed}` : `⚠️ ${failed} failed`);
      await refreshCount();
    } finally {
      setSyncing(false);
    }
  };

  /* ── offline banner ── */
  if (!isOnline) {
    const ageStr = formatAge(cacheAge);
    return (
      <div dir={isAr ? "rtl" : "ltr"} className="fixed top-0 left-0 right-0 z-[200] bg-red-500 text-white">
        <div className="flex items-center justify-between px-4 py-2 max-w-screen-xl mx-auto gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <WifiOff size={15}/>
            {isAr ? "وضع بدون إنترنت" : "Offline Mode"}
            {pendingCount > 0 && (
              <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">
                {pendingCount} {isAr ? "معلق" : "pending"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-red-200">
            {ageStr && (
              <span className="flex items-center gap-1">
                <Clock size={11}/>
                {isAr ? `آخر مزامنة: ${ageStr}` : `Cache: ${ageStr}`}
              </span>
            )}
            <span>{isAr ? "المبيعات محفوظة محلياً وستُزامن عند الاتصال" : "Sales are saved locally and will sync when connected"}</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── online with pending records ── */
  if (pendingCount === 0) return null;

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-white">
      <div className="flex items-center justify-between px-4 py-2 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CloudOff size={15}/>
          {isAr
            ? `${pendingCount} سجل${pendingCount !== 1 ? "" : ""} في انتظار المزامنة`
            : `${pendingCount} offline record${pendingCount !== 1 ? "s" : ""} waiting to sync`}
        </div>
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition px-3 py-1 rounded-lg text-xs font-bold"
        >
          {syncing
            ? <><RefreshCw size={12} className="animate-spin"/> {isAr ? "جارٍ المزامنة..." : "Syncing..."}</>
            : <><UploadCloud size={12}/> {isAr ? "مزامنة الآن" : "Sync Now"}</>}
        </button>
      </div>
    </div>
  );
}
