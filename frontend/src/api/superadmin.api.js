import api from "./axios";

export const getPlatformStats       = ()           => api.get("/superadmin/stats").then(r => r.data);
export const getActivityFeed        = ()           => api.get("/superadmin/activity").then(r => r.data);
export const getPlatformAuditLog    = (params)     => api.get("/superadmin/audit", { params }).then(r => r.data);
export const exportStores           = ()           => api.get("/superadmin/export").then(r => r.data);
export const getSuperAdminProfile         = ()          => api.get("/superadmin/profile").then(r => r.data);
export const updateSuperAdminProfile      = (data)     => api.put("/superadmin/profile", data).then(r => r.data);
export const kickSuperAdminDevice         = (deviceId) => api.post("/superadmin/profile/kick-device", { deviceId }).then(r => r.data);
export const getSuperAdminTelegramChatId  = ()          => api.get("/superadmin/profile/telegram-chat-id").then(r => r.data);

export const getAllStores            = ()           => api.get("/superadmin/stores").then(r => r.data);
export const createStore            = (data)       => api.post("/superadmin/stores", data).then(r => r.data);
export const bulkAction             = (data)       => api.post("/superadmin/stores/bulk-action", data).then(r => r.data);
export const bulkNotify             = (data)       => api.post("/superadmin/stores/bulk-notify", data).then(r => r.data);

export const getStoreDetails        = (id)         => api.get(`/superadmin/stores/${id}`).then(r => r.data);
export const deleteStore            = (id)         => api.delete(`/superadmin/stores/${id}`).then(r => r.data);
export const updateStorePlan        = (id, data)   => api.put(`/superadmin/stores/${id}/plan`, data).then(r => r.data);
export const toggleStoreActive      = (id)         => api.put(`/superadmin/stores/${id}/toggle`).then(r => r.data);
export const toggleCafeEnabled      = (id)         => api.put(`/superadmin/stores/${id}/toggle-cafe`).then(r => r.data);
export const resetAdminPassword     = (id, data)   => api.put(`/superadmin/stores/${id}/reset-password`, data).then(r => r.data);
export const createCashier          = (id, data)   => api.post(`/superadmin/stores/${id}/cashier`, data).then(r => r.data);
export const impersonateStore       = (id)         => api.post(`/superadmin/stores/${id}/impersonate`).then(r => r.data);
export const sendNotification       = (id, data)   => api.post(`/superadmin/stores/${id}/notify`, data).then(r => r.data);
export const updateStoreNotes       = (id, data)   => api.put(`/superadmin/stores/${id}/notes`, data).then(r => r.data);
export const setWelcomeMessage      = (id, data)   => api.put(`/superadmin/stores/${id}/welcome`, data).then(r => r.data);
export const transferOwner          = (id, data)   => api.post(`/superadmin/stores/${id}/transfer`, data).then(r => r.data);
export const cloneStore             = (id, data)   => api.post(`/superadmin/stores/${id}/clone`, data).then(r => r.data);

// Store users management
export const getStoreUsers          = (id)         => api.get(`/superadmin/stores/${id}/users`).then(r => r.data);
export const getStoreGlobalStats    = (id)         => api.get(`/superadmin/stores/${id}/users/stats`).then(r => r.data);
export const createStoreUser        = (id, data)   => api.post(`/superadmin/stores/${id}/users`, data).then(r => r.data);
export const updateStoreUser        = (id, uid, d) => api.patch(`/superadmin/stores/${id}/users/${uid}`, d).then(r => r.data);
export const deleteStoreUser        = (id, uid)    => api.delete(`/superadmin/stores/${id}/users/${uid}`).then(r => r.data);
export const forceLogoutStoreUser   = (id, uid)    => api.post(`/superadmin/stores/${id}/users/${uid}/force-logout`).then(r => r.data);
export const forceLogoutStoreDevice = (id, uid, d) => api.post(`/superadmin/stores/${id}/users/${uid}/force-logout-device`, d).then(r => r.data);
export const changeStoreUserPW      = (id, uid, d) => api.post(`/superadmin/stores/${id}/users/${uid}/change-password`, d).then(r => r.data);
export const getStoreUserSales      = (id, uid)    => api.get(`/superadmin/stores/${id}/users/${uid}/sales`).then(r => r.data);
export const clearStoreUserSales    = (id, uid)    => api.delete(`/superadmin/stores/${id}/users/${uid}/clear-sales`).then(r => r.data);
export const clearStoreUserProducts = (id, uid)    => api.delete(`/superadmin/stores/${id}/users/${uid}/clear-products`).then(r => r.data);
export const copyProductsToStore   = (id, targetStoreId)      => api.post(`/superadmin/stores/${id}/copy-products`, { targetStoreId }).then(r => r.data);
export const getCafeStaffList      = (storeId)               => api.get(`/superadmin/stores/${storeId}/cafe-staff`).then(r => r.data);
export const createCafeStaffMember = (storeId, data)          => api.post(`/superadmin/stores/${storeId}/cafe-staff`, data).then(r => r.data);
export const updateCafeStaffMember = (storeId, staffId, data) => api.patch(`/superadmin/stores/${storeId}/cafe-staff/${staffId}`, data).then(r => r.data);
export const deleteCafeStaffMember = (storeId, staffId)       => api.delete(`/superadmin/stores/${storeId}/cafe-staff/${staffId}`).then(r => r.data);
