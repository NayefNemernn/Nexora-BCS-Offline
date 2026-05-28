import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CafeApp       from "./pages/CafeApp";
import CafePublicApp from "./pages/CafePublicApp";

// /play/:slug  → customer-facing public app (QR ordering + games)
// everything else → staff app
const isPublicPath = window.location.pathname.startsWith("/play/");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isPublicPath ? <CafePublicApp /> : <CafeApp />}
  </StrictMode>
);
