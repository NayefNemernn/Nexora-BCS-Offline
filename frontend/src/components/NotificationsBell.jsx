import React, { useEffect, useState } from "react";
import { Bell, X, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_CONFIG = {
  info:    { icon: Info,          bg: "bg-blue-50 dark:bg-blue-900/20",    text: "text-blue-600",   border: "border-blue-200 dark:border-blue-500/30" },
  warning: { icon: AlertTriangle, bg: "bg-yellow-50 dark:bg-yellow-900/20",text: "text-yellow-600", border: "border-yellow-200 dark:border-yellow-500/30" },
  success: { icon: CheckCircle,   bg: "bg-green-50 dark:bg-green-900/20",  text: "text-green-600",  border: "border-green-200 dark:border-green-500/30" },
  error:   { icon: XCircle,       bg: "bg-red-50 dark:bg-red-900/20",      text: "text-red-600",    border: "border-red-200 dark:border-red-500/30" },
};

export default function NotificationsBell() {
  const { store } = useAuth();
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (store?.notifications) {
      setNotifications(store.notifications);
    }
  }, [store]);

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    try {
      await api.post("/store/notifications/read");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const dismissNotification = (idx) => {
    setNotifications(prev => prev.filter((_, i) => i !== idx));
  };

  if (!notifications.length) return null;

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(v => !v); if (!open && unread > 0) markAllRead(); }}
        className="relative w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-neutral-800 shadow border border-gray-100 dark:border-neutral-700 hover:bg-gray-50 transition"
      >
        <Bell size={16} className="text-gray-600 dark:text-gray-300"/>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-12 left-0 w-80 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-neutral-700 overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b dark:border-neutral-700">
              <span className="font-semibold text-sm text-gray-800 dark:text-white">Notifications</span>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y dark:divide-neutral-700">
              {notifications.map((n, i) => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                const Icon = cfg.icon;
                return (
                  <div key={i} className={`flex items-start gap-3 px-4 py-3 ${n.read ? "opacity-60" : ""}`}>
                    <Icon size={16} className={`${cfg.text} mt-0.5 shrink-0`}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-white">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    <button onClick={() => dismissNotification(i)} className="text-gray-300 hover:text-gray-500 shrink-0"><X size={12}/></button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}