// features/auth/services/authService.ts
import { ApiResponse } from "@/lib/api";
import { TokenPair, UserSession, LoginRequest } from "../types/authTypes";
import { getBrowserId } from "@/utils/browserId";
import { parseApiError } from '@/lib/error-handling';

const DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";

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
    DEBUG && console.log("[AUTH] loginLocal initiated", credentials.email);

    const res = await authFetch<{
      data: TokenPair;
      success: boolean;
      message: string;
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    console.log("loginLocal - respuesta: "+ res);
    if (res.status === "error") {
      DEBUG && console.error("[AUTH] loginLocal failed", res.error);
      throw new Error(res.error.message ?? "Credenciales inválidas");
    }

    if (res.data?.success && res.data?.data) {
      DEBUG && console.log("[AUTH] loginLocal success");
      return res.data.data;
    }

    throw new Error("Estructura de respuesta inválida");
  },

  /** -----------------------------------------
   * REFRESH TOKEN
   * -------------------------------------- */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    DEBUG && console.log("[AUTH] refreshToken initiated");

    const res = await authFetch<{ data: TokenPair; success: boolean }>(
      "/api/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }
    );

    if (res.status === "error") {
      DEBUG && console.error("[AUTH] refreshToken failed", res.error);
      throw new Error(res.error.message ?? "Error al renovar token");
    }

    if (res.data?.success && res.data?.data) {
      DEBUG && console.log("[AUTH] refreshToken success");
      return res.data.data;
    }

    throw new Error("Estructura de respuesta inválida");
  },

  /** -----------------------------------------
   * GET CURRENT USER
   * -------------------------------------- */
  async getCurrentUser(accessToken: string): Promise<UserSession> {
    DEBUG &&
      console.log("[AUTH] getCurrentUser with token:", accessToken?.slice(0, 10));

    const res = await authFetch<{ data: UserSession; success: boolean }>(
      "/api/auth/me",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (res.status === "error") {
      DEBUG && console.error("[AUTH] getCurrentUser FAILED", res.error);
      throw new Error(
        res.error.message ?? "Error al obtener información del usuario"
      );
    }

    if (res.data?.success && res.data?.data) {
      DEBUG && console.log("[AUTH] getCurrentUser OK");
      return res.data.data;
    }

    throw new Error("Estructura de respuesta inválida");
  },

  /** -----------------------------------------
   * OBTENER URL DE LOGIN AZURE
   * -------------------------------------- */
  async getAzureAuthUrl(): Promise<{ url: string; state: string }> {
    DEBUG && console.log("[AUTH] getAzureAuthUrl initiated");

    const browserId = getBrowserId();

    const params = new URLSearchParams({
      clientId: APP_CLIENT_ID,
      browserId, // 🔥 CLAVE para Opción A
    });

    const res = await authFetch<{
      data: { url: string; state: string };
      success: boolean;
    }>(`/api/auth/azure/url?${params.toString()}`);

    if (res.status === "error") {
      DEBUG && console.error("[AUTH] getAzureAuthUrl FAILED", res.error);
      throw new Error(res.error.message ?? "Error al obtener URL de Azure");
    }

    if (res.data?.success && res.data?.data) {
      DEBUG &&
        console.log("[AUTH] getAzureAuthUrl SUCCESS", res.data.data.url);
      return res.data.data;
    }

    throw new Error("Estructura de respuesta inválida");
  },

  /** -----------------------------------------
   * HANDLE CALLBACK AZURE
   * -------------------------------------- */
  async handleAzureCallback(code: string, state: string): Promise<TokenPair> {
    DEBUG && console.log("[AUTH] handleAzureCallback", { state });

    const res = await authFetch<{ data: TokenPair; success: boolean }>(
      `/api/auth/azure/callback?code=${encodeURIComponent(
        code
      )}&state=${encodeURIComponent(state)}`
    );

    if (res.status === "error") {
      DEBUG && console.error("[AUTH] Azure callback FAILED", res.error);
      throw new Error(
        res.error.message ?? "Error al procesar autenticación con Azure"
      );
    }

    if (res.data?.success && res.data?.data) {
      DEBUG && console.log("[AUTH] Azure callback OK");
      return res.data.data;
    }

    throw new Error("Estructura de respuesta inválida");
  },
};
