// src/api/stock.api.js
import api from "./axios";

export const adjustStock  = (data)         => api.post("/stock/adjust", data).then(r => r.data);
export const getStockLogs = (productId="") => api.get(`/stock/logs${productId ? `?productId=${productId}` : ""}`).then(r => r.data);