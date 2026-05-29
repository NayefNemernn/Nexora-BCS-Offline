import { authApi } from "./axios";
import api from "./axios";

const getDeviceId = () => {
  let id = localStorage.getItem("deviceId");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("deviceId", id); }
  return id;
};

const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let os = "Unknown OS";
  if      (/Windows NT 10/.test(ua))     os = "Windows 10/11";
  else if (/Windows NT 6\.3/.test(ua))   os = "Windows 8.1";
  else if (/Windows NT 6\.1/.test(ua))   os = "Windows 7";
  else if (/Windows/.test(ua))           os = "Windows";
  else if (/Mac OS X/.test(ua))          os = "macOS";
  else if (/Android/.test(ua))           os = "Android";
  else if (/iPhone|iPad/.test(ua))       os = "iOS";
  else if (/Linux/.test(ua))             os = "Linux";

  let browser = "Unknown";
  if      (/Edg\//.test(ua))                          browser = "Edge";
  else if (/OPR\/|Opera/.test(ua))                    browser = "Opera";
  else if (/Chrome\//.test(ua))                       browser = "Chrome";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  else if (/Firefox\//.test(ua))                      browser = "Firefox";

  return { os, browser, name: `${browser} on ${os}` };
};

/* ── Public (no token needed) ────────────────── */

// Register a new store + admin account
export const register = async ({ username, password, storeName, currency, language }) => {
  const res = await authApi.post("/auth/register", { username, password, storeName, currency, language });
  return res.data;
};

// Login (returns { token, user, store })
export const login = async ({ username, password }) => {
  const { os, browser, name } = getDeviceInfo();
  const res = await authApi.post("/auth/login", {
    username, password,
    deviceId:      getDeviceId(),
    deviceName:    name,
    deviceOS:      os,
    deviceBrowser: browser,
  });
  return res.data;
};

// Get users for login page (shows store's cashiers)
// NOTE: this is now protected — you need to pass storeSlug or remove this flow
// Simplest approach: show a text input for username instead of a user picker
export const getLoginUsers = async () => {
  try {
    const res = await authApi.get("/auth/users");
    return res.data;
  } catch {
    return []; // gracefully return empty if fails
  }
};

/* ── Protected ───────────────────────────────── */
export const logout = async () => {
  try { await api.post("/auth/logout"); } catch {}
};

export const changeUserPassword = async (userId, newPassword) => {
  const res = await api.post(`/users/${userId}/change-password`, { newPassword });
  return res.data;
};