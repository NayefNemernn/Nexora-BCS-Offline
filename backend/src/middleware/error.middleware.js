// Global error handler — mount LAST in app.js after all routes
export const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log stack in development
  if (process.env.NODE_ENV !== "production") {
    console.error(`[${req.method}] ${req.originalUrl} →`, err.stack || err);
  }

  res.status(status).json({ message });
};