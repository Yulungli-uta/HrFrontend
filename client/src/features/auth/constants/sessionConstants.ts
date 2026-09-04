/**
 * features/auth/constants/sessionConstants.ts
 *
 * Única fuente de verdad para las constantes de política de sesión.
 * SRP: centraliza todos los parámetros de tiempo, almacenamiento y eventos
 * de actividad para que AuthContext y fetch.ts los consuman sin duplicar valores.
 */

// ─── Claves de localStorage ────────────────────────────────────────────────────

/** Clave para persistir el timestamp de última actividad del usuario */
export const LS_LAST_ACTIVITY = "wsuta-last-activity";

/** Clave para persistir los detalles del empleado en sesión */
export const LS_EMPLOYEE_DETAILS = "wsuta-employee-details";

// ─── Tiempos de política de sesión ────────────────────────────────────────────

/**
 * Tiempo de inactividad en ms antes de cerrar sesión automáticamente.
 * Configurable mediante la variable de entorno VITE_INACTIVITY_TIMEOUT.
 * Default: 15 minutos.
 */
export const INACTIVITY_TIMEOUT: number =
  Number(import.meta.env.VITE_INACTIVITY_TIMEOUT) || 15 * 60 * 1000;

/**
 * Intervalo en ms para el polling de verificación de inactividad.
 * 30 segundos: balance entre precisión y performance.
 */
export const INACTIVITY_CHECK_INTERVAL_MS = 30_000;

/**
 * Margen en ms antes de la expiración del access token para hacer refresh proactivo.
 * 60 segundos: evita que el token expire justo durante una petición.
 */
export const REFRESH_MARGIN_MS = 60_000;

// ─── Eventos de actividad del usuario ─────────────────────────────────────────

/**
 * Lista de eventos DOM que se consideran actividad del usuario.
 * Usado por AuthContext para resetear el timer de inactividad.
 */
export const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keypress",
  "scroll",
  "touchstart",
  "click",
] as const;

export type ActivityEvent = (typeof ACTIVITY_EVENTS)[number];

// ─── Login AzureAD vía popup (backend Python) ─────────────────────────────────

/**
 * Nombre del BroadcastChannel usado para avisar a la pestaña que abrió el popup
 * de login AzureAD que el backend (RepositoryUta en Python) ya entregó el
 * resultado. Reemplaza a window.opener.postMessage: login.microsoftonline.com
 * envía Cross-Origin-Opener-Policy: same-origin, que corta window.opener de
 * forma permanente en cuanto el popup navega ahí — BroadcastChannel no depende
 * de esa relación y solo requiere compartir origen (por eso el popup pasa por
 * /auth/azure/relay, del mismo origen que esta pestaña, antes de avisar).
 */
export const AZURE_LOGIN_BROADCAST_CHANNEL = "wsuta-azure-login-delivery";
