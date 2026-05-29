import api from "./axios";

export const getProductByBarcode = async (barcode) => {
  const res = await api.get(`/products/barcode/${barcode}`);
  return res.data;
};

export const getAllProducts = async () => {
  const res = await api.get("/products");
  return res.data;
};

export const createProduct = async (data) => {
  const res = await api.post("/products", data);
  return res.data;
};

export const updateProduct = async (id, data) => {
  const res = await api.put(`/products/${id}`, data);
  return res.data;
};

export const getProductStats = async (id) => {
  const res = await api.get(`/products/${id}/stats`);
  return res.data;
};

export const deleteProduct = async (id) => {
  await api.delete(`/products/${id}`);
};

// IMPORT from Excel
export const importProductsExcel = async (file) => {
  const data = new FormData();
  data.append("file", file);
  const res = await api.post("/products/import", data);
  return res.data;
};

// AI — parse free-text / voice description into product fields
// categories: string[] of store category names for exact matching
export const parseProductPrompt = async (prompt, categories = []) => {
  const res = await api.post("/products/parse-prompt", { prompt, categories });
  return res.data;
};