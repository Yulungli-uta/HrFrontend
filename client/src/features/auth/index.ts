/**
 * features/auth/index.ts
 *
 * Barrel público del dominio de autenticación.
 * Todos los consumidores importan desde "@/features/auth" — un único punto de entrada.
 *
 * OCP: agregar nuevas exportaciones no rompe los consumidores existentes.
 */

// ─── Context y hook oficial ────────────────────────────────────────────────────
export { AuthProvider, useAuth } from "./context/AuthContext";
export type { EmployeeDetails, AuthContextType } from "./context/AuthContext";

// ─── Servicios ─────────────────────────────────────────────────────────────────
export { authService } from "./services/authService";
export { tokenService } from "./services/tokenService";

// ─── Tipos de sesión ───────────────────────────────────────────────────────────
export type {
  TokenPair,
  UserSession,
  LoginRequest,
  RefreshRequest,
  AuthResponse,
  AzureAuthConfig,
  OAuthState,
  MenuItem,
  Optional,
  Require,
} from "./types/authTypes";

export { LoginType, LoginStatus, UserType } from "./types/authTypes";

// ─── Tipos de administración ───────────────────────────────────────────────────
export type {
  User,
  Role,
  UserRole,
  RoleMenuItem,
  CreateUserDto,
  UpdateUserDto,
  CreateRoleDto,
  UpdateRoleDto,
  CreateUserRoleDto,
  UpdateUserRoleDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
  CreateRoleMenuItemDto,
  UpdateRoleMenuItemDto,
  ChangePasswordDto,
  ChangePasswordResponse,
  MenuItemTree,
} from "./types/adminTypes";

// ─── Constantes de sesión ──────────────────────────────────────────────────────
export {
  LS_LAST_ACTIVITY,
  LS_EMPLOYEE_DETAILS,
  INACTIVITY_TIMEOUT,
  INACTIVITY_CHECK_INTERVAL_MS,
  REFRESH_MARGIN_MS,
  ACTIVITY_EVENTS,
} from "./constants/sessionConstants";
export type { ActivityEvent } from "./constants/sessionConstants";
