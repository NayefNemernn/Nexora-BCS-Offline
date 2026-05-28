import api from "./axios";

export const getUsers = async () => {
  const res = await api.get("/users");
  return res.data;
};

export const createUser = async (data) => {
  const res = await api.post("/users", data);
  return res.data;
};

export const deleteUser = async (id) => {
  await api.delete(`/users/${id}`);
};
