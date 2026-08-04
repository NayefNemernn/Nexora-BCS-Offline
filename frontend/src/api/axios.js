import { isOnline } from "../lib/connectivity";
import axios from "axios";
import { getCachedProducts, getCachedCategories, getCachedCustomers } from "../lib/offlineDB";

// Falls back to same-origin /api if VITE_API_URL wasn't baked in at build time
// (e.g. a build run without cross-env VITE_API_URL=... set) — without this,
// axios silently uses a relative baseURL that strips the /api prefix, requests
// 404 into the SPA's index.html fallback, and callers get an HTML string
// instead of JSON where they expected an array.
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// 🔓 Public client (NO token) — used for login, get users
export const authApi = axios.create({
  baseURL: BASE_URL
});

// 🔐 Protected client (WITH token)
const api = axios.create({
  baseURL: BASE_URL
});

// Attach JWT token to every protected request
// Use café staff token when on /cafe path, otherwise use main POS token
api.interceptors.request.use((config) => {
  const isCafe = window.location.pathname === "/cafe" || window.location.pathname.startsWith("/cafe/");
  const token  = (isCafe && localStorage.getItem("cafe_token")) || localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* When offline and a GET request fails, return IDB-cached data for known endpoints */
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const { config } = err;
    if (!isOnline() && config?.method === "get") {
      const path = config.url?.replace(/\?.*$/, "") || "";
      let cached = null;
      if (path.includes("/products"))   cached = await getCachedProducts().catch(() => null);
      if (path.includes("/categories")) cached = await getCachedCategories().catch(() => null);
      if (path.includes("/customers"))  cached = await getCachedCustomers().catch(() => null);
      if (cached) return { data: cached, status: 200, headers: {}, config, offline: true };
    }
    return Promise.reject(err);
  }
);

export default api;