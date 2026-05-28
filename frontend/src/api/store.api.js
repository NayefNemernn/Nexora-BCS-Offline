import api from "./axios";

/* ── Store Settings ─────────────────────────── */
export const getMyStore   = ()       => api.get("/store").then(r => r.data);
export const updateStore  = (data)   => api.put("/store", data).then(r => r.data);

/* ── Cashier Management ─────────────────────── */
export const addCashier     = (data)  => api.post("/store/users", data).then(r => r.data);
export const updateCashier  = (id, d) => api.put(`/store/users/${id}`, d).then(r => r.data);
export const removeCashier  = (id)    => api.delete(`/store/users/${id}`).then(r => r.data);