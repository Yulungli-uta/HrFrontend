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
  personnelEmail: string;
  /** @deprecated Usar roles[] en su lugar */
  role?: string;
  department?: string;
  avatar?: string;
  userType?: string;
  displayName?: string;
  isActive?: boolean;
  azureObjectId?: string;
  /** URLs de menús asignados — NO confundir con actionPermissions (son cosas distintas). */
  permissions?: string[];
  lastLogin?: string;
  /** Lista de roles del usuario */
  roles?: string[];
  /** Grupos del Active Directory local */
  adGroups?: string[];
  /** Menús completos asignados al usuario */
  menuItems?: MenuItem[];
  /**
   * Códigos "MODULO.ACCION" (ver features/actionPermissions.ts) efectivos para los roles
   * del usuario. Viene de RepositoryUta (`AuthService.MeAsync` → `ActionPermissions`), mismo
   * cálculo que `GET /api/role-permissions/effective`. Usar SIEMPRE a través de
   * `can()`/`canAny()`/`canAll()` (services/permissions/actionPermissionService.ts), nunca
   * comparando el array directamente — así el bypass de ADMIN.ACCESS y la validación de
   * "¿esto vino cargado?" quedan en un solo lugar.
   */
  actionPermissions?: string[];
  /**
   * Nombres de AccessProfile asignados al usuario (campo `profiles` tal cual lo serializa
   * `/api/auth/me`). Informativo únicamente — la autorización real ya quedó expandida a roles
   * concretos al momento de asignar el perfil, esto no se usa para calcular permisos (ver
   * AuthService.MeAsync en RepositoryUta).
   */
  profiles?: string[];
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
