// features/auth/services/azureLoginMessages.ts
//
// Catálogo de fallos del login con Office 365: cada uno dice qué pasó (en términos que el usuario
// entiende) y qué hacer. El motivo exacto de un rechazo de autenticación NUNCA llega al navegador
// (lo exige RepositoryUta): solo una categoría genérica y una referencia corta que soporte puede
// buscar en el log del servidor. Ver AuthContext.tsx y RepositoryUta AuthController.AzureCallback.

export type AzureLoginFailureCode =
  | "CANCELLED"
  | "EXPIRED_ATTEMPT"
  | "NO_ACCESS"
  | "SERVER_ERROR"
  | "NOT_DELIVERED"
  | "TIMEOUT"
  | "EXCHANGE_INVALID"
  | "RATE_LIMITED"
  | "NETWORK"
  | "LOST_STATE"
  | "UNKNOWN";

export interface AzureLoginFailureInfo {
  code: AzureLoginFailureCode;
  title: string;
  description: string;
  /** true: no es un error (el usuario canceló); se muestra sin aviso rojo. */
  neutral: boolean;
}

const KNOWN_CODES: ReadonlySet<string> = new Set<AzureLoginFailureCode>([
  "CANCELLED",
  "EXPIRED_ATTEMPT",
  "NO_ACCESS",
  "SERVER_ERROR",
  "NOT_DELIVERED",
  "TIMEOUT",
  "EXCHANGE_INVALID",
  "RATE_LIMITED",
  "NETWORK",
  "LOST_STATE",
  "UNKNOWN",
]);

/** Convierte el código que manda el servidor (WebSocket o relay) en uno conocido; lo desconocido es UNKNOWN. */
export function toAzureLoginFailureCode(value: unknown): AzureLoginFailureCode {
  return typeof value === "string" && KNOWN_CODES.has(value)
    ? (value as AzureLoginFailureCode)
    : "UNKNOWN";
}

/** Fallo tipado del canje del código de entrega; `kind` decide el mensaje que ve el usuario. */
export class AzureExchangeError extends Error {
  readonly kind: AzureLoginFailureCode;

  constructor(kind: AzureLoginFailureCode, message?: string) {
    super(message ?? kind);
    this.name = "AzureExchangeError";
    this.kind = kind;
  }
}

/** Clasifica el estado HTTP de una llamada de autenticación (0 = sin respuesta: red o tiempo agotado). */
export function failureCodeFromHttpStatus(status: number): AzureLoginFailureCode {
  if (status === 0) return "NETWORK";
  if (status === 401 || status === 400) return "EXCHANGE_INVALID";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVER_ERROR";
  return "UNKNOWN";
}

/** Referencia corta del intento (8 caracteres) para citarla a soporte cuando el fallo es solo del navegador. */
export function newAttemptReference(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

const withReference = (text: string, reference?: string): string =>
  reference ? `${text} Código de referencia: ${reference}.` : text;

/** Mensaje para el usuario de un fallo del login con Office 365. */
export function describeAzureLoginFailure(
  code: AzureLoginFailureCode,
  reference?: string
): AzureLoginFailureInfo {
  const failure = (title: string, description: string, neutral = false): AzureLoginFailureInfo => ({
    code,
    title,
    description,
    neutral,
  });

  switch (code) {
    case "CANCELLED":
      return failure(
        "Inicio de sesión no completado",
        "No se completó el inicio de sesión con Microsoft. Si pulsaste «Atrás» o cancelaste, puedes intentarlo de nuevo.",
        true
      );
    case "EXPIRED_ATTEMPT":
      return failure(
        "El intento de inicio de sesión expiró",
        withReference(
          "Vuelve a pulsar «Iniciar sesión con Office 365» y completa la verificación de Microsoft sin demora.",
          reference
        )
      );
    case "NO_ACCESS":
      return failure(
        "No se pudo habilitar tu acceso",
        withReference(
          "Microsoft confirmó tu identidad, pero esta cuenta no tiene acceso habilitado al sistema. Comunica el código de referencia a DITIC.",
          reference
        )
      );
    case "SERVER_ERROR":
      return failure(
        "Error del servidor de autenticación",
        withReference(
          "Intenta de nuevo en unos minutos. Si el problema continúa, comunica el código de referencia a DITIC.",
          reference
        )
      );
    case "NOT_DELIVERED":
      return failure(
        "No se completó el inicio de sesión",
        withReference(
          "No recibimos la confirmación de Microsoft en esta pestaña. Si ya cerraste la ventana de Microsoft, recarga la página (F5) e intenta de nuevo sin cambiar de aplicación hasta terminar.",
          reference
        )
      );
    case "TIMEOUT":
      return failure(
        "El inicio de sesión tardó demasiado",
        withReference(
          "Intenta de nuevo. Si te vuelve a pasar, recarga la página (F5) antes de reintentar.",
          reference
        )
      );
    case "EXCHANGE_INVALID":
      return failure(
        "El enlace de inicio de sesión ya no es válido",
        "El enlace expiró o ya se usó. Vuelve a pulsar «Iniciar sesión con Office 365»."
      );
    case "RATE_LIMITED":
      return failure(
        "Demasiados intentos seguidos",
        "Espera un minuto e intenta de nuevo."
      );
    case "NETWORK":
      return failure(
        "Sin conexión con el servidor de autenticación",
        "Revisa tu conexión a internet e intenta de nuevo."
      );
    case "LOST_STATE":
      return failure(
        "Se perdió el estado del inicio de sesión",
        "La página se recargó o se limpió el navegador durante el inicio de sesión. Vuelve a pulsar «Iniciar sesión con Office 365»."
      );
    default:
      return failure(
        "No se completó el inicio de sesión",
        withReference("Intenta de nuevo. Si continúa, recarga la página (F5).", reference)
      );
  }
}
