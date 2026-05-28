import { isOnline } from "../lib/connectivity";
import React, { createContext, useContext, useState, useEffect } from "react";
import { logout as logoutApi } from "../api/auth.api";
import { getMyStore } from "../api/store.api";
import api from "../api/axios";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]   = useState(() => { try { return JSON.parse(localStorage.getItem("user"));  } catch { localStorage.removeItem("user");  return null; } });
  const [store, setStore] = useState(() => { try { return JSON.parse(localStorage.getItem("store")); } catch { localStorage.removeItem("store"); return null; } });

  /* ── Login: save user + store from API response ── */
  const login = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user",  JSON.stringify(data.user));
    localStorage.setItem("store", JSON.stringify(data.store));
    setUser(data.user);
    setStore(data.store);
  };

  /* ── Logout ── */
  const logout = async () => {
    await logoutApi();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("store");
    setUser(null);
    setStore(null);
  };

  /* ── Update store settings locally (after PUT /api/store) ── */
  const updateStore = (updatedFields) => {
    const updated = { ...store, ...updatedFields };
    localStorage.setItem("store", JSON.stringify(updated));
    setStore(updated);
  };

  /* ── Helpers ── */
  const storeName      = store?.name           || "Market POS";
  const currency       = store?.currency       || "USD";
  const currencySymbol = store?.currencySymbol || "$";
  const taxRate        = store?.taxRate        || 0;
  const language       = store?.language       || "en";
  const storePlan      = store?.plan           || "trial";
  const isAdmin        = user?.role === "admin" || user?.role === "superadmin";
  const isSuperAdmin   = user?.role === "superadmin";

  /* ── Plan expiry warning ── */
  const planExpired = store?.planExpiresAt
    ? new Date(store.planExpiresAt) < new Date()
    : false;

  const daysUntilExpiry = store?.planExpiresAt
    ? Math.ceil((new Date(store.planExpiresAt) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  /* ── Refresh store from server on mount (picks up superadmin changes) ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user || user.role === "superadmin") return;
    getMyStore()
      .then(freshStore => {
        const merged = { ...store, ...freshStore, _id: freshStore._id || store?._id };
        localStorage.setItem("store", JSON.stringify(merged));
        setStore(merged);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Global 401 interceptor ── */
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (res) => res,
      (error) => {
        // Only auto-logout when online — if offline, the 401 may be a stale
        // cached response from the SW or a transient failure; don't boot the user.
        const is401    = error.response?.status === 401;
        const hasToken = !!localStorage.getItem("token");
        const online   = isOnline();
        if (is401 && hasToken && online) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("store");
          setUser(null);
          setStore(null);
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user, store,
        login, logout, updateStore,
        storeName, currency, currencySymbol, taxRate, language,
        storePlan, isAdmin, isSuperAdmin,
        planExpired, daysUntilExpiry,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);