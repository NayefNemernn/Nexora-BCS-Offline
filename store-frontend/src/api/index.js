import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({ baseURL: BASE_URL });

const authH = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const getStoreInfo       = (slug)     => api.get(`/api/public/${slug}`).then(r => r.data);

// Customer auth
export const customerRegister   = (slug, data)          => api.post(`/api/public/${slug}/auth/register`, data).then(r => r.data);
export const customerLogin      = (slug, data)          => api.post(`/api/public/${slug}/auth/login`, data).then(r => r.data);
export const customerGetMe      = (slug, token)         => api.get(`/api/public/${slug}/auth/me`, authH(token)).then(r => r.data);
export const customerUpdateMe   = (slug, token, data)   => api.patch(`/api/public/${slug}/auth/me`, data, authH(token)).then(r => r.data);

// Saved addresses
export const getAddresses   = (slug, token)           => api.get(`/api/public/${slug}/auth/addresses`, authH(token)).then(r => r.data);
export const addAddress     = (slug, token, data)     => api.post(`/api/public/${slug}/auth/addresses`, data, authH(token)).then(r => r.data);
export const deleteAddress  = (slug, token, addrId)  => api.delete(`/api/public/${slug}/auth/addresses/${addrId}`, authH(token)).then(r => r.data);

export const getStoreProducts   = (slug)     => api.get(`/api/public/${slug}/products`).then(r => r.data);

// Promo & points
export const validatePromo  = (slug, data)  => api.post(`/api/public/${slug}/promo/validate`, data).then(r => r.data);
export const getPointsOffers= (slug)        => api.get(`/api/public/${slug}/points-offers`).then(r => r.data);

// Orders
export const submitOrder = (data, token) =>
  api.post("/api/orders", data, token ? authH(token) : {}).then(r => r.data);
export const trackOrder         = (orderId)  => api.get(`/api/orders/track/${orderId}`).then(r => r.data);
export const getDeliveryOrder     = (orderId)                       => api.get(`/api/orders/delivery/${orderId}`).then(r => r.data);
export const confirmCashCollected = (orderId)                       => api.patch(`/api/orders/${orderId}/cash-collected`).then(r => r.data);
export const driverAcceptOrder    = (orderId, chatId, driverName)   => api.patch(`/api/orders/${orderId}/driver-accept`, { chatId, driverName }).then(r => r.data);
