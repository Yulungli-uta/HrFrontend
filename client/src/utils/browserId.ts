// utils/browserId.ts — versión final robusta y segura

const DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";

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
    DEBUG && console.warn("[BROWSER-ID] SSR MODE");
    return "server-browser";
  }

  try {
    let id = localStorage.getItem(BROWSER_ID_KEY);

    // Si no existe, lo generamos
    if (!id) {
      // DEBUG && console.log("[BROWSER-ID] Generando nuevo ID…");

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

    // DEBUG && console.log("[BROWSER-ID] ID usado:", id);
    return id;

  } catch (err) {
    // Modo incógnito extremo o fallo en localStorage
    // DEBUG && console.error("[BROWSER-ID] localStorage falló:", err);

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
