import api from "./axios";

export const cafeLogin = (data) => api.post("/cafe/auth/login", data).then(r => r.data);
export const cafeGetMe = ()     => api.get("/cafe/auth/me").then(r => r.data);
