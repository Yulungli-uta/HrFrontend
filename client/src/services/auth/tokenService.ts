// services/auth/tokenService.ts
import { TokenPair, UserSession } from './types';

export const tokenService = {
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  },

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  },

  getUserSession(): UserSession | null {
    const session = localStorage.getItem('userSession');
    return session ? JSON.parse(session) : null;
  },

  setTokens(tokens: TokenPair): void {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  },

  setUserSession(userData: UserSession): void {
    localStorage.setItem('userSession', JSON.stringify(userData));
  },

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userSession');
  },

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  },
};