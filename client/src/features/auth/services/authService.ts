// features/auth/services/authService.ts
import { ApiResponse } from "@/lib/api";
import { TokenPair, UserSession, LoginRequest } from "../types/authTypes";
import { tokenService } from "./tokenService";
import { getBrowserId } from "@/utils/browserId";
import { logger } from "@/lib/logger";

const AUTH_API_BASE_URL =
  import.meta.env.VITE_AUTH_API_BASE_URL || "http://localhost:5010";

const APP_CLIENT_ID = import.meta.env.VITE_APP_CLIENT_ID;

/** -------------------------------------------
 * Cliente seguro para autenticación
 * ------------------------------------------- */
async function authFetch<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${AUTH_API_BASE_URL}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
      ...init,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      if (res.status === 204) {
        return { status: "success", data: undefined as T };
      }

      try {
        const data = await res.json();
        return { status: "success", data };
      } catch {
        const text = await res.text();
        return { status: "success", data: text as T };
      }
    }

    // Errores HTTP
    let details: any;
    try {
      details = await res.json();
    } catch {
      try {
        details = await res.text();
      } catch {
        details = res.statusText;
      }
    }

    return {
      status: "error",
      error: {
        code: res.status,
        message: `HTTP Error ${res.status}: ${res.statusText}`,
        details,
      },
    };
  } catch (err: unknown) {
    clearTimeout(timeout);

    return {
      status: "error",
      error: {
        code: 0,
        message:
          (err as any).name === "AbortError"
            ? "Request timed out"
            : `Network error: ${(err as any).message || "Unknown error"}`,
      },
    };
  }
}

/** -------------------------------------------
 * Servicio de autenticación
 * ------------------------------------------- */
export const authService = {
  /** -----------------------------------------
   * LOGIN LOCAL
   * -------------------------------------- */
  async loginLocal(credentials: LoginRequest): Promise<TokenPair> {
    logger.auth.debug("loginLocal initiated", credentials.email);

    const res = await authFetch<{
      data: TokenPair;
      success: boolean;
      message: string;
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (res.status === "error") {
      logger.auth.error("loginLocal failed", res.error.code);
      throw new Error(res.error.message ?? "Credenciales inválidas");
    }

    if (res.data?.success && res.data?.data) {
      logger.auth.debug("loginLocal success");
      return res.data.data;
    }

    throw new Error("Estructura de respuesta inválida");
  },

  /** -----------------------------------------
   * REFRESH TOKEN
   * -------------------------------------- */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    logger.auth.debug("refreshToken initiated");

    const res = await authFetch<{ data: TokenPair; success: boolean }>(
      "/api/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }
    );

    if (res.status === "error") {
      logger.auth.error("refreshToken failed", res.error.code);
      throw new Error(res.error.message ?? "Error al renovar token");
    }

    if (res.data?.success && res.data?.data) {
      logger.auth.debug("refreshToken success");
      return res.data.data;
    }

    throw new Error("Estructura de respuesta inválida");
  },

  /** -----------------------------------------
   * LOGOUT — revoca la sesión en el servidor
   * -------------------------------------- */
  /**
   * Best-effort: revoca el refresh token en RepositoryUta para que la sesión
   * de 7 días no quede activa tras cerrar sesión. Nunca lanza: si el servidor
   * no responde, el logout local (limpieza de tokens) procede igual.
   */
  async logout(refreshToken: string): Promise<void> {
    logger.auth.debug("logout (revocación en servidor) initiated");

    const res = await authFetch("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });

    if (res.status === "error") {
      logger.auth.error("logout en servidor falló (la sesión local se limpia igual)", res.error.code);
      return;
    }

    logger.auth.debug("logout en servidor OK");
  },

  /** -----------------------------------------
   * GET CURRENT USER
   * -------------------------------------- */
  async getCurrentUser(accessToken: string): Promise<UserSession> {
    logger.auth.debug("getCurrentUser initiated");

    const res = await authFetch<{ data: UserSession; success: boolean }>(
      "/api/auth/me",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (res.status === "error") {
      logger.auth.error("getCurrentUser failed", res.error.code);
      throw new Error(
        res.error.message ?? "Error al obtener información del usuario"
      );
    }

    if (res.data?.success && res.data?.data) {
      const user: UserSession = res.data.data;
      const adGroups = tokenService.extractAdGroups(accessToken);
      logger.auth.debug(
        adGroups.length > 0
          ? `Grupos AD recibidos en JWT: ${adGroups.length}`
          : "No hay grupos AD en el JWT (AD inactivo o usuario sin grupos)"
      );
      logger.auth.debug("getCurrentUser OK");
      return { ...user, adGroups };
    }

    throw new Error("Estructura de respuesta inválida");
  },

  /** -----------------------------------------
   * OBTENER URL DE LOGIN AZURE
   * -------------------------------------- */
  async getAzureAuthUrl(codeChallenge?: string): Promise<{ url: string; state: string }> {
    logger.auth.debug("getAzureAuthUrl initiated");

    const browserId = getBrowserId();

    const params = new URLSearchParams({
      clientId: APP_CLIENT_ID,
      browserId, // 🔥 CLAVE para Opción A
      ...(codeChallenge ? { codeChallenge } : {}),
    });

    const res = await authFetch<{
      data: { url: string; state: string };
      success: boolean;
    }>(`/api/auth/azure/url?${params.toString()}`);

    if (res.status === "error") {
      logger.auth.error("getAzureAuthUrl failed", res.error.code);
      throw new Error(res.error.message ?? "Error al obtener URL de Azure");
    }

    if (res.data?.success && res.data?.data) {
      logger.auth.debug("getAzureAuthUrl success");
      return res.data.data;
    }

    throw new Error("Estructura de respuesta inválida");
  },

  /** -----------------------------------------
   * HANDLE CALLBACK AZURE
   * -------------------------------------- */
  async handleAzureCallback(code: string, state: string): Promise<TokenPair> {
    logger.auth.debug("handleAzureCallback initiated");

    const res = await authFetch<{ data: TokenPair; success: boolean }>(
      `/api/auth/azure/callback?code=${encodeURIComponent(
        code
      )}&state=${encodeURIComponent(state)}`
    );

    if (res.status === "error") {
      logger.auth.error("Azure callback failed", res.error.code);
      throw new Error(
        res.error.message ?? "Error al procesar autenticación con Azure"
      );
    }

    if (res.data?.success && res.data?.data) {
      logger.auth.debug("Azure callback OK");
      return res.data.data;
    }

    throw new Error("Estructura de respuesta inválida");
  },

  /** -----------------------------------------
   * INTERCAMBIO PKCE (login Office 365)
   * -------------------------------------- */
  /**
   * Canjea el deliveryCode recibido por WebSocket por el par de tokens real,
   * demostrando posesión del codeVerifier que nunca salió de esta pestaña.
   * Ver features/auth/services/pkce.ts.
   */
  async exchangeAzureDeliveryCode(
    deliveryCode: string,
    codeVerifier: string
  ): Promise<TokenPair> {
    logger.auth.debug("exchangeAzureDeliveryCode initiated");

    const res = await authFetch<{ data: TokenPair; success: boolean }>(
      "/api/auth/azure/exchange",
      {
        method: "POST",
        body: JSON.stringify({ deliveryCode, codeVerifier }),
      }
    );

    if (res.status === "error") {
      logger.auth.error("exchangeAzureDeliveryCode failed", res.error.code);
      throw new Error(res.error.message ?? "Código de entrega inválido o expirado");
    }

    if (res.data?.success && res.data?.data) {
      logger.auth.debug("exchangeAzureDeliveryCode success");
      return res.data.data;
    }

    throw new Error("Estructura de respuesta inválida");
  },
};
