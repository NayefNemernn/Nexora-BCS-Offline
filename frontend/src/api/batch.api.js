import api from "./axios";

export const getBatches           = (params = {}) => api.get("/batches", { params }).then(r => r.data);
export const getBatchesForProduct = (productId)   => api.get(`/batches/product/${productId}`).then(r => r.data);
export const createBatch          = (data)         => api.post("/batches", data).then(r => r.data);
export const updateBatch          = (id, data)     => api.put(`/batches/${id}`, data).then(r => r.data);
export const adjustBatch          = (id, data)     => api.patch(`/batches/${id}/adjust`, data).then(r => r.data);
export const deleteBatch          = (id)           => api.delete(`/batches/${id}`).then(r => r.data);
