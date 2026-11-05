// features/auth/services/azureLoginAttempt.ts
//
// Estado mínimo del intento de login con Office 365 en curso, guardado en sessionStorage (solo esta
// pestaña, nunca compartido ni persistente entre sesiones del navegador). Existe para que la pestaña
// pueda RECLAMAR su login pendiente aunque el navegador la haya descartado y recargado mientras el
// usuario estaba en Microsoft o en Authenticator (típico en celulares). Sin el codeVerifier el código de
// entrega no se puede canjear, así que se guarda aquí con vencimiento corto y se borra al terminar el
// intento (éxito, fallo o cancelación). Ver pkce.ts y AuthContext.tsx.

const ATTEMPT_KEY = "wsuta-azure-login-attempt";

/** Un login legítimo (incluida la MFA lenta) termina antes; pasado este tiempo el intento se descarta. */
export const AZURE_ATTEMPT_MAX_AGE_MS = 10 * 60 * 1000;

export interface AzureLoginAttempt {
  codeVerifier: string;
  reference: string;
  startedAt: number;
}

export function saveAzureAttempt(attempt: AzureLoginAttempt): void {
  try {
    sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
  } catch {
    /* modo privado o almacenamiento bloqueado: el login sigue funcionando solo con la memoria de la pestaña */
  }
}

export function loadAzureAttempt(now: number = Date.now()): AzureLoginAttempt | null {
  try {
    const raw = sessionStorage.getItem(ATTEMPT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AzureLoginAttempt>;
    const valid =
      typeof parsed.codeVerifier === "string" &&
      parsed.codeVerifier.length > 0 &&
      typeof parsed.reference === "string" &&
      typeof parsed.startedAt === "number";
    if (!valid || now - (parsed.startedAt as number) > AZURE_ATTEMPT_MAX_AGE_MS) {
      clearAzureAttempt();
      return null;
    }
    return parsed as AzureLoginAttempt;
  } catch {
    return null;
  }
}

export function clearAzureAttempt(): void {
  try {
    sessionStorage.removeItem(ATTEMPT_KEY);
  } catch {
    /* ignore */
  }
}
