// src/api/sale.api.js
import api from "./axios";

export const createSale    = (data)           => api.post("/sales", data).then(r => r.data);
export const getSales      = ()               => api.get("/sales").then(r => r.data);
export const getSaleById   = (id)             => api.get(`/sales/${id}`).then(r => r.data);
export const returnSale    = (id, data)       => api.post(`/sales/${id}/return`, data).then(r => r.data);
export const voidSale      = (id, data)       => api.post(`/sales/${id}/void`, data).then(r => r.data);
export const getProfitLoss = (from, to)       => api.get("/sales/profit-loss", { params: { from, to } }).then(r => r.data);