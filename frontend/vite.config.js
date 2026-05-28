import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "public",
      filename: "sw.js",
      injectRegister: null,   // we register manually in main.jsx
      manifest: false,        // we have our own manifest.json in public/
      injectManifest: {
        injectionPoint: "self.__WB_MANIFEST",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,mp3}"],
      },
      devOptions: { enabled: false },
    }),
  ],
  optimizeDeps: {
    exclude: ["@imgly/background-removal"],
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
