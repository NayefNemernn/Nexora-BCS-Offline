import { isOnline } from "../lib/connectivity";
import axios from "axios";
import { getCachedProducts, getCachedCategories, getCachedCustomers } from "../lib/offlineDB";

const BASE_URL = import.meta.env.VITE_API_URL;

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