import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = (slug, token) => {
  const inst = axios.create({ baseURL: `${BASE}/api/cafe/public/${slug}` });
  if (token) inst.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  return inst;
};

/* ── Café info + menu ── */
export const getPublicCafe    = (slug) => api(slug).get("/").then(r => r.data);
export const getPublicRewards = (slug) => api(slug).get("/rewards").then(r => r.data);
export const trackOrder       = (slug, orderId) => api(slug).get(`/order/${orderId}`).then(r => r.data);
export const placePublicOrder = (slug, data, token) =>
  api(slug, token).post("/order", data).then(r => r.data);

/* ── Customer auth ── */
export const cafeCustomerRegister = (slug, data) =>
  api(slug).post("/customers/register", data).then(r => r.data);
export const cafeCustomerLogin = (slug, data) =>
  api(slug).post("/customers/login", data).then(r => r.data);
export const cafeCustomerGoogle = (slug, credential) =>
  api(slug).post("/customers/google", { credential }).then(r => r.data);
export const cafeCustomerMe = (slug, token) =>
  api(slug, token).get("/customers/me").then(r => r.data);
export const cafeCustomerCheckin = (slug, token) =>
  api(slug, token).post("/customers/checkin").then(r => r.data);
export const cafeCustomerRedeem = (slug, token, rewardId) =>
  api(slug, token).post("/customers/redeem", { rewardId }).then(r => r.data);
export const cafeCustomerHistory = (slug, token) =>
  api(slug, token).get("/customers/history").then(r => r.data);
export const cafeCustomerRate = (slug, token, data) =>
  api(slug, token).post("/customers/rate", data).then(r => r.data);

/* ── Games ── */
export const getGameStatus    = (slug, token) =>
  api(slug, token).get("/games/status").then(r => r.data);
export const recordGameResult = (slug, token, gameType, result) =>
  api(slug, token).post("/games/result", { gameType, result }).then(r => r.data);
