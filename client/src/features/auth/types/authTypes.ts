/**
 * features/auth/types/authTypes.ts
 *
 * Tipos de sesión y autenticación — fuente oficial.
 * Consolida lo que antes estaba en services/auth/types.ts.
 * SRP: solo tipos relacionados con el ciclo de vida de la sesión del usuario.
 */

// ─── Tokens ────────────────────────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  tokenType?: string;
}

// ─── Sesión de usuario ─────────────────────────────────────────────────────────

export interface MenuItem {
  id: number;
  name: string;
  url: string | null;
  icon: string | null;
  parentId: number | null;
  order: number;
  isVisible: boolean;
  moduleName: string | null;
  isDeleted: boolean;
}

export interface UserSession {
  id: string;
  username: string;
  fullName: string;
  email: string;
  /** @deprecated Usar roles[] en su lugar */
  role?: string;
  department?: string;
  avatar?: string;
  userType?: string;
  displayName?: string;
  isActive?: boolean;
  azureObjectId?: string;
  /** URLs de menús asignados */
  permissions?: string[];
  lastLogin?: string;
  /** Lista de roles del usuario */
  roles?: string[];
  /** Menús completos asignados al usuario */
  menuItems?: MenuItem[];
}

// ─── Requests / Responses ─────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: TokenPair;
  user?: UserSession;
}

export interface AzureAuthConfig {
  clientId: string;
  authority: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthState {
  redirectUrl?: string;
  provider: "azure";
  nonce: string;
}

// ─── Enums ─────────────────────────────────────────────────────────────────────

export enum LoginType {
  LOCAL = "local",
  AZURE_AD = "azure_ad",
  GOOGLE = "google",
}

export enum LoginStatus {
  SUCCESS = "success",
  FAILED = "failed",
  LOCKED = "locked",
  EXPIRED = "expired",
}

export enum UserType {
  ADMIN = "admin",
  USER = "user",
  MANAGER = "manager",
  GUEST = "guest",
}

// ─── Utilidades TypeScript ─────────────────────────────────────────────────────

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export type Require<T, K extends keyof T> = T & Required<Pick<T, K>>;
