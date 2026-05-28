import api from "./axios";

export const createHoldSale      = (data)      => api.post("/hold-sales", data).then(r => r.data);
export const getHoldSales        = ()           => api.get("/hold-sales").then(r => r.data);
export const getHoldSaleNames    = ()           => api.get("/hold-sales/names").then(r => r.data);
export const deleteHoldSale      = (id)         => api.delete(`/hold-sales/${id}`).then(r => r.data);

export const payHoldSale         = (id, data)   => api.post(`/hold-sales/${id}/pay`, data).then(r => r.data);
export const updateHoldCustomer  = (id, data)   => api.put(`/hold-sales/${id}/customer`, data).then(r => r.data);
export const updateCreditLimit   = (id, data)   => api.patch(`/hold-sales/${id}/limit`, data).then(r => r.data);

export const getRecentPayments   = ()           => api.get("/hold-sales/payments/recent").then(r => r.data);
export const paymentsThisMonth   = ()           => api.get("/hold-sales/payments/month").then(r => r.data);
export const getCustomerPayments = (name)       => api.get(`/hold-sales/payments/customer/${encodeURIComponent(name)}`).then(r => r.data);
export const getCustomerInvoices = (name)       => api.get(`/hold-sales/invoices/${encodeURIComponent(name)}`).then(r => r.data);
