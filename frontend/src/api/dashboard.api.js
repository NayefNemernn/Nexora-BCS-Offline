import api from "./axios";

export const getDashboardStats = async (period = "today") => {
  const res = await api.get("/dashboard", { params: { period } });
  return res.data;
};
