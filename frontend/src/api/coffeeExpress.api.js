import api from "./axios";

export const getCoffeeExpressStatus = () => api.get("/coffee-express/status").then(r => r.data);
export const unlockCoffeeExpress    = (code) => api.post("/coffee-express/unlock", { code }).then(r => r.data);
