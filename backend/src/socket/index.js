import { Server } from "socket.io";

let io = null;

export const initSocket = (httpServer) => {
  const corsOrigins = process.env.SOCKET_CORS_ORIGIN
    ? process.env.SOCKET_CORS_ORIGIN.split(",").map(s => s.trim())
    : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (origin.endsWith(".vercel.app")) return cb(null, true);
        if (origin.endsWith(".railway.app")) return cb(null, true);
        if (corsOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`Socket CORS: origin ${origin} not allowed`));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("join_room", (room) => {
      socket.join(room);
    });

    socket.on("leave_room", (room) => {
      socket.leave(room);
    });
  });

  return io;
};

export const getIO = () => io;
