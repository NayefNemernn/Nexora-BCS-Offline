// src/api/customer.api.js
import api from "./axios";

export const getCustomers    = (q = "")    => api.get(`/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`).then(r => r.data);
export const getCustomerById = (id)        => api.get(`/customers/${id}`).then(r => r.data);
export const createCustomer  = (data)      => api.post("/customers", data).then(r => r.data);
export const updateCustomer  = (id, data)  => api.put(`/customers/${id}`, data).then(r => r.data);
export const deleteCustomer  = (id)        => api.delete(`/customers/${id}`).then(r => r.data);