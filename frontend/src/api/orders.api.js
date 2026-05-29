import api from "./axios";

export const getOrders         = (params = {}) => api.get("/orders", { params }).then(r => r.data);
export const getOrderById      = (id)           => api.get(`/orders/${id}`).then(r => r.data);
export const getPendingSales   = ()             => api.get("/orders/pending-sales").then(r => r.data);
export const acceptOrder       = (id)           => api.patch(`/orders/${id}/accept`).then(r => r.data);
export const rejectOrder       = (id, reason)   => api.patch(`/orders/${id}/reject`, { reason }).then(r => r.data);
export const cancelOrder       = (id, reason)   => api.patch(`/orders/${id}/cancel`, { reason }).then(r => r.data);
export const markOutForDelivery = (id) => api.patch(`/orders/${id}/out-for-delivery`).then(r => r.data);
export const confirmPayment     = (id) => api.patch(`/orders/${id}/payment-received`).then(r => r.data);
export const updateOnlineStore = (data) => api.patch("/store/online-settings", data).then(r => r.data);

// Promo codes (admin)
export const getPromos    = ()          => api.get("/promos").then(r => r.data);
export const createPromo  = (data)      => api.post("/promos", data).then(r => r.data);
export const updatePromo  = (id, data)  => api.put(`/promos/${id}`, data).then(r => r.data);
export const deletePromo  = (id)        => api.delete(`/promos/${id}`).then(r => r.data);

// Points offers (admin)
export const getPointsOffers   = ()         => api.get("/points-offers").then(r => r.data);
export const createPointsOffer = (data)     => api.post("/points-offers", data).then(r => r.data);
export const updatePointsOffer = (id, data) => api.put(`/points-offers/${id}`, data).then(r => r.data);
export const deletePointsOffer = (id)       => api.delete(`/points-offers/${id}`).then(r => r.data);
