// utils/browserId.ts — versión final robusta y segura

import { logger } from "@/lib/logger";

// Si existe variable de entorno, se usa esa clave.
// Si no, se usa un valor estable por defecto.
const BROWSER_ID_KEY =
  import.meta.env.VITE_BROWSER_ID_KEY || "wsuta-browser-id";

/**
 * Obtiene o crea un identificador único por navegador.
 * Seguro para SSR, navegadores antiguos y modos privados.
 */
export function getBrowserId(): string {
  // Seguridad en servidores, tests o entornos sin window
  if (typeof window === "undefined") {
    logger.auth.warn("[BROWSER-ID] SSR MODE");
    return "server-browser";
  }

  try {
    let id = localStorage.getItem(BROWSER_ID_KEY);

    // Si no existe, lo generamos
    if (!id) {
      if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
      ) {
        id = crypto.randomUUID();
      } else {
        // Fallback para navegadores antiguos
        id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      }

      localStorage.setItem(BROWSER_ID_KEY, id);
    }

    return id;

  } catch {
    // Modo incógnito extremo o fallo en localStorage: ID efímero de respaldo
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

/**
 * Descripción legible del dispositivo ("Chrome 130 | Windows") a partir del
 * User-Agent. El backend ya guarda el User-Agent crudo aparte — esto es solo
 * una versión corta pensada para mostrarse directo en la pantalla de admin
 * de Sesiones Activas, sin tener que parsear el User-Agent completo ahí.
 */
export function getDeviceInfo(): string {
  if (typeof navigator === "undefined") return "server";

  const ua = navigator.userAgent;

  const browserMatch =
    ua.match(/(Edg)\/(\d+)/) ||
    ua.match(/(Chrome)\/(\d+)/) ||
    ua.match(/(Firefox)\/(\d+)/) ||
    ua.match(/(Version)\/(\d+).*Safari/) ||
    null;

  const browserName = browserMatch
    ? browserMatch[1] === "Edg"
      ? "Edge"
      : browserMatch[1] === "Version"
        ? "Safari"
        : browserMatch[1]
    : "Navegador";
  const browserVersion = browserMatch ? browserMatch[2] : "";

  const os = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Mac OS")
      ? "macOS"
      : ua.includes("Linux")
        ? "Linux"
        : ua.includes("Android")
          ? "Android"
          : ua.includes("iPhone") || ua.includes("iPad")
            ? "iOS"
            : "";

  return [`${browserName}${browserVersion ? " " + browserVersion : ""}`, os]
    .filter(Boolean)
    .join(" | ");
}
