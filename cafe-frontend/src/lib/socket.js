import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";
let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(BASE_URL, { autoConnect: false, transports: ["websocket", "polling"] });
  }
  return socket;
};

export const connectSocket = (storeId, role) => {
  const s = getSocket();
  if (!s.connected) s.connect();

  s.emit("join_room", `store_${storeId}_${role}`);
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
};
