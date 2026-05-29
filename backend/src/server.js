import { createServer } from "http";
import app from "./app.js";
import dotenv from "dotenv";
dotenv.config();
import { connectDB }               from "./config/db.js";
import { PORT }                    from "./config/env.js";
import { initSocket }              from "./socket/index.js";
import { ensureDesktopSuperAdmin } from "./seed/desktopSetup.js";
import { importLicenseIfNeeded }   from "./services/licenseManager.js";

const startServer = async () => {
  await connectDB();
  await importLicenseIfNeeded();   // seeds store+admin from .nexora on first launch
  await ensureDesktopSuperAdmin();

  const httpServer = createServer(app);
  initSocket(httpServer);

  const port = process.env.PORT || PORT || 5000;
  httpServer.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
};

startServer();
