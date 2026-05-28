import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cafe_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = api; // alias used by some imports

export default api;
