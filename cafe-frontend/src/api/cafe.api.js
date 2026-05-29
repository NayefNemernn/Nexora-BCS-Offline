import api from "./axios";

// Menu items
export const getCafeMenuItems   = (params)     => api.get("/cafe/menu", { params }).then(r => r.data);
export const createCafeMenuItem = (data)       => api.post("/cafe/menu", data).then(r => r.data);
export const updateCafeMenuItem = (id, data)   => api.put(`/cafe/menu/${id}`, data).then(r => r.data);
export const deleteCafeMenuItem = (id)         => api.delete(`/cafe/menu/${id}`).then(r => r.data);

// Tables
export const getTables          = ()           => api.get("/cafe/tables").then(r => r.data);
export const createTable        = (data)       => api.post("/cafe/tables", data).then(r => r.data);
export const updateTable        = (id, data)   => api.put(`/cafe/tables/${id}`, data).then(r => r.data);
export const deleteTable        = (id)         => api.delete(`/cafe/tables/${id}`).then(r => r.data);
export const updateTableStatus  = (id, status) => api.put(`/cafe/tables/${id}/status`, { status }).then(r => r.data);

// Orders
export const getOrders          = (params)     => api.get("/cafe/orders", { params }).then(r => r.data);
export const getOrder           = (id)         => api.get(`/cafe/orders/${id}`).then(r => r.data);
export const openOrder          = (tableId)    => api.post("/cafe/orders", { tableId }).then(r => r.data);
export const openOutsideOrder   = (label)      => api.post("/cafe/orders", { label }).then(r => r.data);
export const addItems           = (id, items)  => api.post(`/cafe/orders/${id}/items`, { items }).then(r => r.data);
export const updateItem         = (id, itemId, data) => api.put(`/cafe/orders/${id}/items/${itemId}`, data).then(r => r.data);
export const cancelItem         = (id, itemId) => api.delete(`/cafe/orders/${id}/items/${itemId}`).then(r => r.data);
export const sendToKitchen      = (id)         => api.post(`/cafe/orders/${id}/send-to-kitchen`).then(r => r.data);
export const updateOrderMeta    = (id, data)   => api.put(`/cafe/orders/${id}/meta`, data).then(r => r.data);
export const checkoutOrder      = (id, data)   => api.post(`/cafe/orders/${id}/checkout`, data).then(r => r.data);
export const transferItems      = (data)       => api.post("/cafe/orders/transfer", data).then(r => r.data);
export const mergeOrders        = (data)       => api.post("/cafe/orders/merge", data).then(r => r.data);
export const cancelOrder        = (id)         => api.delete(`/cafe/orders/${id}`).then(r => r.data);

// Kitchen
export const getKitchenOrders   = ()           => api.get("/cafe/kitchen").then(r => r.data);
export const updateItemStatus   = (orderId, itemId, status) => api.put(`/cafe/kitchen/${orderId}/items/${itemId}/status`, { status }).then(r => r.data);

// Reservations
export const getReservations    = (params)     => api.get("/cafe/reservations", { params }).then(r => r.data);
export const createReservation  = (data)       => api.post("/cafe/reservations", data).then(r => r.data);
export const updateReservation  = (id, data)   => api.put(`/cafe/reservations/${id}`, data).then(r => r.data);
export const seatReservation    = (id)         => api.post(`/cafe/reservations/${id}/seat`).then(r => r.data);
export const cancelReservation  = (id)         => api.delete(`/cafe/reservations/${id}`).then(r => r.data);

// Reports
export const getCafeReports     = (params)     => api.get("/cafe/reports", { params }).then(r => r.data);
