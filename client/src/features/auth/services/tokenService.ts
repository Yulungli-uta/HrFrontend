// features/auth/services/tokenService.ts
import { TokenPair, UserSession } from "../types/authTypes";
import { getBrowserId } from "@/utils/browserId";

const DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";

function logToken(...args: any[]) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log("[TOKEN]", ...args);
  }
}

function key(suffix: string): string {
  const browserId = getBrowserId();
  return `wsuta:${browserId}:${suffix}`;
}

export const tokenService = {
  getAccessToken(): string | null {
    try {
      const token = localStorage.getItem(key("accessToken"));
      logToken("getAccessToken →", token ? "EXISTS" : "NULL");
      return token;
    } catch (e) {
      console.error("[TOKEN] Error reading accessToken:", e);
      return null;
    }
  },

  getRefreshToken(): string | null {
    try {
      const token = localStorage.getItem(key("refreshToken"));
      logToken("getRefreshToken →", token ? "EXISTS" : "NULL");
      return token;
    } catch (e) {
      console.error("[TOKEN] Error reading refreshToken:", e);
      return null;
    }
  },

  getUserSession(): UserSession | null {
    try {
      const raw = localStorage.getItem(key("userSession"));
      if (!raw) {
        logToken("getUserSession → NULL");
        return null;
      }
      const session = JSON.parse(raw) as UserSession;
      logToken("getUserSession → OK", session);
      return session;
    } catch (e) {
      console.error("[TOKEN] Error parsing userSession:", e);
      return null;
    }
  },

  setTokens(tokens: TokenPair): void {
    try {
      logToken("Saving tokens:", tokens);
      localStorage.setItem(key("accessToken"), tokens.accessToken);
      localStorage.setItem(key("refreshToken"), tokens.refreshToken);
    } catch (e) {
      console.error("[TOKEN] Error saving tokens:", e);
    }
  },

  setUserSession(userData: UserSession): void {
    try {
      logToken("setUserSession:", {
        id: userData.id,
        email: userData.email,
        userType: userData.userType,
      });
      localStorage.setItem(key("userSession"), JSON.stringify(userData));
    } catch (e) {
      console.error("[TOKEN] Error saving userSession:", e);
    }
  },

  clearTokens(): void {
    try {
      logToken("clearTokens()");
      localStorage.removeItem(key("accessToken"));
      localStorage.removeItem(key("refreshToken"));
      localStorage.removeItem(key("userSession"));
    } catch (e) {
      console.error("[TOKEN] Error clearing tokens:", e);
    }
  },

  extractAdGroups(token: string): string[] {
    try {
      const payloadB64 = token.split(".")[1];
      if (!payloadB64) return [];
      const payload = JSON.parse(atob(payloadB64)) as Record<string, unknown>;
      const raw = payload["ad_group"];
      if (!raw) return [];
      const groups = Array.isArray(raw) ? raw : [raw];
      logToken("extractAdGroups →", groups);
      return groups.filter((g): g is string => typeof g === "string");
    } catch (e) {
      console.error("[TOKEN] Error extrayendo ad_group del JWT:", e);
      return [];
    }
  },

  isTokenExpired(token: string): boolean {
    try {
      const payloadPart = token.split(".")[1];
      if (!payloadPart) {
        logToken("isTokenExpired → invalid token (no payload)");
        return true;
      }

      const payloadJson = atob(payloadPart);
      const payload = JSON.parse(payloadJson) as { exp?: number };

      if (!payload.exp) {
        logToken("isTokenExpired → no exp in payload");
        return true;
      }

      const expired = payload.exp * 1000 < Date.now();
      logToken("isTokenExpired →", expired ? "EXPIRED" : "VALID");
      return expired;
    } catch (e) {
      console.error("[TOKEN] Error decoding token:", e);
      return true;
    }
  },
};
