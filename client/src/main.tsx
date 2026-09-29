import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import App from "./App";
import "./index.css";
import "./uta-branding.css";
import { logger } from "@/lib/logger";
import { installSpanishZodErrorMap } from "@/lib/zodErrorMap";

// Hallazgo informe UTA-DITIC-PS-027-2026, observación 32: validadores Zod "pelados"
// (z.number().int().positive() sin segundo argumento) mostraban el mensaje por defecto en
// inglés. Se instala una sola vez, antes de que se monte cualquier formulario.
installSpanishZodErrorMap();

// Global error handlers
window.addEventListener('unhandledrejection', (event) => {
  logger.error("main", 'Unhandled promise rejection:', event.reason);
  // Prevent the default browser behavior
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  logger.error("main", 'Unhandled error:', event.error);
});


// ✅ Base dinámico: local "/" ; producción "/WsUtaSystem"
// const base =
//   import.meta.env.PROD ? (import.meta.env.VITE_BASE_PATH?.replace(/\/$/, "") || "/WsUtaSystem") : "/";
const base = import.meta.env.BASE_URL.replace(/\/$/, "");


createRoot(document.getElementById("root")!).render(
  <Router base={base}>
    <App />
  </Router>
);

// createRoot(document.getElementById("root")!).render(<App />);