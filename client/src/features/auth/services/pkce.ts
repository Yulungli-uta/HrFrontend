// features/auth/services/pkce.ts
//
// Utilidades PKCE (RFC 7636) para el login con Office 365.
// El codeVerifier se genera y permanece SOLO en memoria de la pestaña que inicia el
// login: nunca se persiste (localStorage/sessionStorage) ni viaja por ningún canal.
// Solo su hash (codeChallenge) se envía al servidor antes de abrir el popup de
// Microsoft. Ver AuthContext.tsx (loginWithOffice365) y RepositoryUta/AzureAuthService.

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Genera un codeVerifier aleatorio (32 bytes → ~43 caracteres base64url). */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/** Calcula codeChallenge = base64url(SHA-256(codeVerifier)), según RFC 7636. */
export async function computeCodeChallenge(codeVerifier: string): Promise<string> {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}
