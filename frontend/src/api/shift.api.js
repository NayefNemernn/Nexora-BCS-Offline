// src/api/shift.api.js
import api from "./axios";

export const getActiveShift = ()          => api.get("/shifts/active").then(r => r.data);
export const getShifts      = ()          => api.get("/shifts").then(r => r.data);
export const openShift      = (data)      => api.post("/shifts/open", data).then(r => r.data);
export const closeShift     = (id, data)  => api.post(`/shifts/${id}/close`, data).then(r => r.data);