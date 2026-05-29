import api from "./axios";

export const getOfferSuggestions   = ()            => api.get("/ai/offer-suggestions").then(r => r.data);
export const getReorderSuggestions = ()            => api.get("/ai/reorder-suggestions").then(r => r.data);

export const getPurchaseOrders     = ()            => api.get("/ai/purchase-orders").then(r => r.data);
export const savePurchaseOrder     = (data)        => api.post("/ai/purchase-orders", data).then(r => r.data);
export const updatePurchaseOrder   = (id, data)    => api.put(`/ai/purchase-orders/${id}`, data).then(r => r.data);
export const deletePurchaseOrder   = (id)          => api.delete(`/ai/purchase-orders/${id}`).then(r => r.data);
