import api from "./axios";

export const getSuppliers = () => api.get("/suppliers").then(r => r.data);
