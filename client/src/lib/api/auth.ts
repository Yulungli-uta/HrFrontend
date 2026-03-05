// src/lib/api/auth.ts
/**
 * APIs relacionadas con autenticación y gestión de usuarios.
 *
 * Objetivos de este archivo:
 * - Mantener compatibilidad con el código ya existente (no romper llamados actuales).
 * - Agregar los endpoints faltantes del Swagger.
 * - Mejorar consistencia: serialización, tipos, y manejo de respuestas heterogéneas.
 * - Evitar errores comunes: body sin JSON.stringify, comas faltantes, imports duplicados, etc.
 */

import { apiFetch } from './client';
import type { ApiResponse, PagedRequest, PagedResult } from './client';

import type {
  User,
  Role,
  UserRole,
  MenuItem,
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
  ChangePasswordDto as ChangePasswordDtoFromTypes,
  ChangePasswordResponse,
} from '@/types/auth';

/* =============================================================================
 * Helpers de request/response
 * ========================================================================== */

/**
 * Helper para construir query strings sin incluir undefined/null.
 * Nota: `URLSearchParams` siempre serializa a string.
 */
function serializeQuery(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    usp.append(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

/** Asegura body JSON correctamente. */
function jsonBody<T>(data: T): { body: string } {
  return { body: JSON.stringify(data) };
}

/* =============================================================================
 * Helpers de normalización y sanity checks (tolerar backends inconsistentes)
 * ========================================================================== */

function toInt(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Valor numérico inválido: ${String(v)}`);
  return n;
}

function toBool(v: unknown, fallback = false): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
}

/**
 * Normaliza un payload a array:
 * - []
 * - {items:[]}
 * - {results:[]}
 * - {data:[]}
 * - diccionario {id: obj}
 */
function coerceToArray<T>(payload: unknown): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  const p: any = payload as any;

  if (Array.isArray(p?.items)) return p.items as T[];
  if (Array.isArray(p?.results)) return p.results as T[];
  if (Array.isArray(p?.data)) return p.data as T[];

  if (typeof p === 'object') {
    const vals = Object.values(p);
    if (vals.length && vals.every(v => typeof v === 'object' && v !== null)) {
      return vals as T[];
    }
  }
  return [];
}

/**
 * Asegura ApiResponse; si ya lo es, lo devuelve; si no, lo envuelve.
 * Esto ayuda cuando el backend devuelve "T" crudo.
 */
function ensureApiResponse<T>(raw: unknown): ApiResponse<T> {
  if (raw && typeof raw === 'object' && 'status' in (raw as any)) {
    return raw as ApiResponse<T>;
  }
  return { status: 'success', data: raw as T } as ApiResponse<T>;
}

/* =============================================================================
 * Tipos de autenticación (Swagger)
 * ========================================================================== */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface ValidateTokenRequest {
  token: string;
  clientId?: string;
}

export interface AppAuthRequest {
  clientId?: string;
  clientSecret?: string;
}

export interface LegacyAuthRequest {
  clientId?: string;
  clientSecret?: string;
  userEmail?: string;
  password?: string;
  includePermissions?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface UserInfo {
  id: string;
  email: string;
  displayName: string;
  userType: string;
  roles: string[];
  permissions: string[];
}

export interface AzureAuthUrlResponse {
  url: string;
}

/* =============================================================================
 * API de Autenticación Principal
 * ========================================================================== */

export const AuthAPI = {
  login: (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> =>
    apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      ...jsonBody(credentials),
    }),

  refresh: (refreshRequest: RefreshRequest): Promise<ApiResponse<LoginResponse>> =>
    apiFetch<LoginResponse>('/api/auth/refresh', {
      method: 'POST',
      ...jsonBody(refreshRequest),
    }),

  getCurrentUser: (): Promise<ApiResponse<UserInfo>> => apiFetch<UserInfo>('/api/auth/me'),

  validateToken: (validateRequest: ValidateTokenRequest): Promise<ApiResponse<unknown>> =>
    apiFetch<unknown>('/api/auth/validate-token', {
      method: 'POST',
      ...jsonBody(validateRequest),
    }),

  /** Nota: este endpoint puede existir en tu backend además de PasswordAPI.change */
  changePassword: (req: { currentPassword: string; newPassword: string }): Promise<ApiResponse<unknown>> =>
    apiFetch<unknown>('/api/auth/change-password', {
      method: 'POST',
      ...jsonBody(req),
    }),

  getAzureAuthUrl: (clientId?: string, browserId?: string): Promise<ApiResponse<AzureAuthUrlResponse>> =>
    apiFetch<AzureAuthUrlResponse>(
      `/api/auth/azure/url${serializeQuery({ clientId, browserId })}`,
      { method: 'GET' },
    ),

  azureCallback: (code: string, state: string): Promise<ApiResponse<LoginResponse>> =>
    apiFetch<LoginResponse>(
      `/api/auth/azure/callback${serializeQuery({ code, state })}`,
      { method: 'GET' },
    ),
} as const;

/* =============================================================================
 * API de Autenticación de Aplicaciones (AppAuth)
 * ========================================================================== */

export const AppAuthAPI = {
  getToken: (authRequest: AppAuthRequest): Promise<ApiResponse<unknown>> =>
    apiFetch<unknown>('/api/app-auth/token', {
      method: 'POST',
      ...jsonBody(authRequest),
    }),

  legacyLogin: (authRequest: LegacyAuthRequest): Promise<ApiResponse<unknown>> =>
    apiFetch<unknown>('/api/app-auth/legacy-login', {
      method: 'POST',
      ...jsonBody(authRequest),
    }),

  validateToken: (data: ValidateTokenRequest): Promise<ApiResponse<unknown>> =>
    apiFetch<unknown>('/api/app-auth/validate-token', {
      method: 'POST',
      ...jsonBody(data),
    }),

  getStats: (clientId: string): Promise<ApiResponse<unknown>> =>
    apiFetch<unknown>(`/api/app-auth/stats/${encodeURIComponent(clientId)}`, { method: 'GET' }),
} as const;

/* =============================================================================
 * API de Gestión de Usuarios (Swagger: /api/users)
 * ========================================================================== */

export const AuthUsersAPI = {
  list: async (page: number = 1, size: number = 100): Promise<ApiResponse<User[]>> => {
    const raw = await apiFetch<User[]>(`/api/users${serializeQuery({ page, size })}`, { method: 'GET' });
    const res = ensureApiResponse<User[]>(raw);
    if (res.status === 'success') res.data = coerceToArray<User>(res.data);
    return res;
  },

  /**
   * Obtiene usuarios paginados, compatible con el hook usePaged.
   * Mapea PagedRequest al formato que ya acepta el endpoint /api/users.
   */
  listPaged: async (params: PagedRequest): Promise<ApiResponse<PagedResult<User>>> => {
    const raw = await apiFetch<PagedResult<User>>(
      `/api/users/paged${serializeQuery({ page: params.page, pageSize: params.pageSize, sortBy: params.sortBy, sortDirection: params.sortDirection })}`,
      { method: 'GET' }
    );
    return ensureApiResponse<PagedResult<User>>(raw);
  },

  get: (id: string): Promise<ApiResponse<User>> =>
    apiFetch<User>(`/api/users/${encodeURIComponent(id)}`, { method: 'GET' }),

  create: (data: CreateUserDto): Promise<ApiResponse<User>> =>
    apiFetch<User>('/api/users', {
      method: 'POST',
      ...jsonBody(data),
    }),

  update: (id: string, data: UpdateUserDto): Promise<ApiResponse<User>> =>
    apiFetch<User>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      ...jsonBody(data),
    }),

  remove: (id: string): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getPermissions: (userId: string): Promise<ApiResponse<unknown>> =>
    apiFetch<unknown>(`/api/users/${encodeURIComponent(userId)}/permissions`, { method: 'GET' }),
} as const;

/* =============================================================================
 * API de Gestión de Roles (Swagger: /api/roles)
 * ========================================================================== */

export const RolesAPI = {
  list: async (page: number = 1, size: number = 100): Promise<ApiResponse<Role[]>> => {
    const raw = await apiFetch<Role[]>(`/api/roles${serializeQuery({ page, size })}`, { method: 'GET' });
    const res = ensureApiResponse<Role[]>(raw);

    if (res.status === 'success') {
      const arr = coerceToArray<Role>(res.data).map((r: any) => ({
        ...r,
        id: typeof r.id === 'string' || typeof r.id === 'number' ? Number(r.id) : r.id,
        isActive: toBool(r.isActive, true),
        isDeleted: toBool(r.isDeleted, false),
      }));
      res.data = arr;
    }

    return res;
  },

  get: (id: number): Promise<ApiResponse<Role>> =>
    apiFetch<Role>(`/api/roles/${toInt(id)}`, { method: 'GET' }),

  create: (data: CreateRoleDto): Promise<ApiResponse<Role>> =>
    apiFetch<Role>('/api/roles', {
      method: 'POST',
      ...jsonBody(data),
    }),

  update: (id: number, data: UpdateRoleDto): Promise<ApiResponse<Role>> =>
    apiFetch<Role>(`/api/roles/${toInt(id)}`, {
      method: 'PUT',
      ...jsonBody(data),
    }),

  delete: (id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/roles/${toInt(id)}`, { method: 'DELETE' }),

  /**
   * Obtiene roles paginados, compatible con el hook usePaged.
   */
  listPaged: async (params: PagedRequest): Promise<ApiResponse<PagedResult<Role>>> => {
    const raw = await apiFetch<PagedResult<Role>>(
      `/api/roles/paged${serializeQuery({ page: params.page, pageSize: params.pageSize, sortBy: params.sortBy, sortDirection: params.sortDirection })}`,
      { method: 'GET' }
    );
    return ensureApiResponse<PagedResult<Role>>(raw);
  },

  // Alias para compatibilidad con UI que invoca remove()
  remove(id: number) {
    return this.delete(id);
  },
} as const;

/* =============================================================================
 * API de Asignación de Roles a Usuarios
 * Swagger: /api/user-roles + /api/user-roles/{userId}/{roleId}/{assignedAt}
 * ========================================================================== */

export const UserRolesAPI = {
  // Swagger: GET /api/user-roles?page&size
  list: async (page: number = 1, size: number = 100): Promise<ApiResponse<UserRole[]>> => {
    const raw = await apiFetch<UserRole[]>(`/api/user-roles${serializeQuery({ page, size })}`, { method: 'GET' });
    const res = ensureApiResponse<UserRole[]>(raw);
    if (res.status === 'success') res.data = coerceToArray<UserRole>(res.data);
    return res;
  },

  // Swagger: POST /api/user-roles
  assign: (data: CreateUserRoleDto): Promise<ApiResponse<UserRole>> =>
    apiFetch<UserRole>('/api/user-roles', {
      method: 'POST',
      ...jsonBody(data),
    }),

  // Swagger: PUT /api/user-roles?id=...
  updateById: (id: number, data: UpdateUserRoleDto): Promise<ApiResponse<UserRole>> =>
    apiFetch<UserRole>(`/api/user-roles${serializeQuery({ id })}`, {
      method: 'PUT',
      ...jsonBody(data),
    }),

  // Swagger: GET /api/user-roles/{userId}/{roleId}/{assignedAt}
  get: (userId: string, roleId: number, assignedAt: string): Promise<ApiResponse<UserRole>> =>
    apiFetch<UserRole>(
      `/api/user-roles/${encodeURIComponent(userId)}/${toInt(roleId)}/${encodeURIComponent(assignedAt)}`,
      { method: 'GET' },
    ),

  // Swagger: DELETE /api/user-roles/{userId}/{roleId}/{assignedAt}
  remove: (userId: string, roleId: number, assignedAt: string): Promise<ApiResponse<void>> =>
    apiFetch<void>(
      `/api/user-roles/${encodeURIComponent(userId)}/${toInt(roleId)}/${encodeURIComponent(assignedAt)}`,
      { method: 'DELETE' },
    ),

  /* -------------------------------------------------------------------------
   * Métodos LEGACY (se conservan para no romper llamadas existentes)
   * ---------------------------------------------------------------------- */

  getByUser: async (userId: string): Promise<ApiResponse<UserRole[]>> => {
    const raw = await apiFetch<UserRole[]>(`/api/user-roles/user/${encodeURIComponent(userId)}`, { method: 'GET' });
    const res = ensureApiResponse<UserRole[]>(raw);
    if (res.status === 'success') res.data = coerceToArray<UserRole>(res.data);
    return res;
  },

  getByRole: async (roleId: number): Promise<ApiResponse<UserRole[]>> => {
    const raw = await apiFetch<UserRole[]>(`/api/user-roles/role/${toInt(roleId)}`, { method: 'GET' });
    const res = ensureApiResponse<UserRole[]>(raw);
    if (res.status === 'success') res.data = coerceToArray<UserRole>(res.data);
    return res;
  },

  // Legacy: PUT /api/user-roles/{userId}/{roleId}
  update: (userId: string, roleId: number, data: UpdateUserRoleDto): Promise<ApiResponse<UserRole>> =>
    apiFetch<UserRole>(`/api/user-roles/${encodeURIComponent(userId)}/${toInt(roleId)}`, {
      method: 'PUT',
      ...jsonBody(data),
    }),

  // Legacy: DELETE /api/user-roles/{userId}/{roleId}
  removeLegacy: (userId: string, roleId: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/user-roles/${encodeURIComponent(userId)}/${toInt(roleId)}`, { method: 'DELETE' }),
} as const;

/* =============================================================================
 * API de Gestión de Items de Menú (Swagger: /api/menu-items)
 * ========================================================================== */

export const MenuItemsAPI = {
  list: async (page: number = 1, size: number = 100): Promise<ApiResponse<MenuItem[]>> => {
    const raw = await apiFetch<MenuItem[]>(`/api/menu-items${serializeQuery({ page, size })}`, { method: 'GET' });
    const res = ensureApiResponse<MenuItem[]>(raw);

    if (res.status === 'success') {
      const arr = coerceToArray<MenuItem>(res.data).map((m: any) => ({
        ...m,
        id: toInt(m.id),
        parentId: m.parentId === null || m.parentId === undefined ? null : toInt(m.parentId),
        order: Number(m.order ?? 0),
        isVisible: toBool(m.isVisible, true),
        isDeleted: toBool(m.isDeleted, false),
      }));
      res.data = arr;
    }

    return res;
  },

  get: (id: number): Promise<ApiResponse<MenuItem>> =>
    apiFetch<MenuItem>(`/api/menu-items/${toInt(id)}`, { method: 'GET' }),

  create: (data: CreateMenuItemDto): Promise<ApiResponse<MenuItem>> =>
    apiFetch<MenuItem>('/api/menu-items', {
      method: 'POST',
      ...jsonBody(data),
    }),

  update: (id: number, data: UpdateMenuItemDto): Promise<ApiResponse<MenuItem>> =>
    apiFetch<MenuItem>(`/api/menu-items/${toInt(id)}`, {
      method: 'PUT',
      ...jsonBody(data),
    }),

  delete: (id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/menu-items/${toInt(id)}`, { method: 'DELETE' }),

  // Alias para compatibilidad con UI que invoca remove()
  remove(id: number) {
    return this.delete(id);
  },
} as const;

/* =============================================================================
 * API de Menú del Usuario (Swagger: /api/menu/user)
 * ========================================================================== */

export const MenuAPI = {
  getUserMenu: (): Promise<ApiResponse<unknown>> => apiFetch<unknown>('/api/menu/user', { method: 'GET' }),
} as const;

/* =============================================================================
 * API de Asignación de Menús a Roles (Swagger: /api/role-menu-items)
 * ========================================================================== */

export const RoleMenuItemsAPI = {
  list: async (page: number = 1, size: number = 100): Promise<ApiResponse<RoleMenuItem[]>> => {
    const raw = await apiFetch<RoleMenuItem[]>(`/api/role-menu-items${serializeQuery({ page, size })}`, { method: 'GET' });
    const res = ensureApiResponse<RoleMenuItem[]>(raw);

    if (res.status === 'success') {
      res.data = coerceToArray<RoleMenuItem>(res.data).map((x: any) => ({
        roleId: toInt(x.roleId),
        menuItemId: toInt(x.menuItemId),
        isVisible: toBool(x.isVisible, true),
      }));
    }

    return res;
  },

  // Swagger: GET /api/role-menu-items/{roleId}/{menuItemId}
  get: (roleId: number, menuItemId: number): Promise<ApiResponse<RoleMenuItem>> =>
    apiFetch<RoleMenuItem>(`/api/role-menu-items/${toInt(roleId)}/${toInt(menuItemId)}`, { method: 'GET' }),

  /** Método principal (Swagger POST /api/role-menu-items). */
  assign: (data: CreateRoleMenuItemDto): Promise<ApiResponse<RoleMenuItem>> =>
    apiFetch<RoleMenuItem>('/api/role-menu-items', {
      method: 'POST',
      ...jsonBody({
        roleId: toInt((data as any).roleId),
        menuItemId: toInt((data as any).menuItemId),
        isVisible: toBool((data as any).isVisible, true),
      }),
    }),

  // Swagger: DELETE /api/role-menu-items/{roleId}/{menuItemId}
  remove: (roleId: number, menuItemId: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/role-menu-items/${toInt(roleId)}/${toInt(menuItemId)}`, { method: 'DELETE' }),

  /* -------------------------------------------------------------------------
   * Métodos LEGACY (se conservan por compatibilidad)
   * ---------------------------------------------------------------------- */

  getByRole: async (roleId: number): Promise<ApiResponse<RoleMenuItem[]>> => {
    const raw = await apiFetch<RoleMenuItem[]>(`/api/role-menu-items/role/${toInt(roleId)}`, { method: 'GET' });
    const res = ensureApiResponse<RoleMenuItem[]>(raw);
    if (res.status === 'success') {
      res.data = coerceToArray<RoleMenuItem>(res.data).map((x: any) => ({
        roleId: toInt(x.roleId),
        menuItemId: toInt(x.menuItemId),
        isVisible: toBool(x.isVisible, true),
      }));
    }
    return res;
  },

  update: (roleId: number, menuItemId: number, data: UpdateRoleMenuItemDto): Promise<ApiResponse<RoleMenuItem>> =>
    apiFetch<RoleMenuItem>(`/api/role-menu-items/${toInt(roleId)}/${toInt(menuItemId)}`, {
      method: 'PUT', // si el backend lo soporta
      ...jsonBody({
        ...data,
        isVisible: toBool((data as any).isVisible, true),
      }),
    }),

  /** Alias para código legado que llama .create() */
  create(data: CreateRoleMenuItemDto) {
    return this.assign(data);
  },
} as const;

/* =============================================================================
 * Cambio de Contraseña (UI)
 * ========================================================================== */

/**
 * IMPORTANTE:
 * En Swagger existen dos "ChangePassword":
 * - Auth/change-password (req con currentPassword/newPassword)
 * - AzureManagement/users/{id}/change-password (dto newPassword/forceChangeNextSignIn)
 * Para evitar colisiones, este DTO local usa otro nombre.
 */
export interface AzureChangePasswordDto {
  newPassword?: string | null;
  forceChangeNextSignIn: boolean;
}

export const PasswordAPI = {
  // Endpoint usado por la UI (compatible con tu tipado existente)
  change: (data: { currentPassword: string; newPassword: string }): Promise<ApiResponse<ChangePasswordResponse>> =>
    apiFetch<ChangePasswordResponse>('/api/auth/change-password', {
      method: 'POST',
      ...jsonBody(data),
    }),
} as const;

/* =============================================================================
 * DTOs adicionales (Swagger) - "ligeros" y opcionales
 * ========================================================================== */

export interface CreateAppParamDto {
  nemonic?: string | null;
  value?: string | null;
  dataType?: string | null;
  category?: string | null;
  description?: string | null;
  isEncrypted?: boolean | null;
  modifiedBy?: string | null;
}
export interface UpdateAppParamDto extends Omit<CreateAppParamDto, 'nemonic'> {}

export interface CreateAuditLogDto {
  userId?: string | null; // uuid
  action?: string | null;
  module?: string | null;
  entityId?: string | null;
  oldValues?: string | null;
  newValues?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}
export interface UpdateAuditLogDto {
  oldValues?: string | null;
  newValues?: string | null;
}

export interface CreateFailedAttemptDto {
  userEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  reason?: string | null;
  windowBucket?: string | null; // date-time
}

export interface CreateLoginHistoryDto {
  userId?: string | null; // uuid
  loginType?: string | null;
  loginStatus?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceInfo?: string | null;
  locationInfo?: string | null;
  sessionId?: string | null; // uuid
}
export interface UpdateLoginHistoryDto {
  loginStatus?: string | null;
  failureReason?: string | null;
}

export interface CreateUserSessionDto {
  userId: string; // uuid
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt: string; // date-time
  isActive?: boolean | null;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  status?: string | null;
}
export interface UpdateUserSessionDto {
  isActive?: boolean | null;
  expiresAt?: string | null;
  status?: string | null;
}

export interface CreateUserActivityLogDto {
  userId: string; // uuid
  sessionId?: string | null; // uuid
  activity?: string | null;
  activityDetails?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  moduleAccessed?: string | null;
  actionPerformed?: string | null;
}
export interface UpdateUserActivityLogDto {
  activityDetails?: string | null;
}

export interface CreateUserEmployeeDto {
  userId: string; // uuid
  employeeEmail?: string | null;
  isActive?: boolean | null;
  syncDate?: string | null; // date-time
  notes?: string | null;
}
export interface UpdateUserEmployeeDto {
  isActive?: boolean | null;
  syncDate?: string | null;
  notes?: string | null;
}

export interface CreateLocalCredentialDto {
  userId: string; // uuid
  passwordHash?: string | null;
  mustChangePassword?: boolean | null;
}
export interface UpdateLocalCredentialDto {
  passwordHash?: string | null;
  mustChangePassword?: boolean | null;
  failedAttempts?: number | null;
  isLocked?: boolean | null;
  passwordExpiresAt?: string | null; // date-time
}

export interface CreatePermissionDto {
  name?: string | null;
  module?: string | null;
  action?: string | null;
  description?: string | null;
  version?: number | null;
}
export interface UpdatePermissionDto {
  description?: string | null;
  isDeleted?: boolean | null;
  version?: number | null;
}

export interface CreateRoleChangeHistoryDto {
  userId: string; // uuid
  roleId: number;
  changeType?: string | null;
  changedBy?: string | null;
  changeReason?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
  effectiveFrom?: string | null; // date-time
  effectiveTo?: string | null; // date-time
  approvalRequired?: boolean | null;
  approvedBy?: string | null;
  approvalDateTime?: string | null; // date-time
}
export interface UpdateRoleChangeHistoryDto {
  changeReason?: string | null;
  newValue?: string | null;
  effectiveTo?: string | null;
  approvalRequired?: boolean | null;
  approvedBy?: string | null;
  approvalDateTime?: string | null;
}

export interface CreatePermissionChangeHistoryDto {
  roleId: number;
  permissionId: number;
  changeType?: string | null;
  changedBy?: string | null;
  changeReason?: string | null;
  affectedUsersCount?: number | null;
}
export interface UpdatePermissionChangeHistoryDto {
  changeReason?: string | null;
  affectedUsersCount?: number | null;
}

export interface CreateSecurityTokenDto {
  userId: string; // uuid
  tokenType?: string | null;
  tokenHash?: string | null;
  expiresAt: string; // date-time
  additionalData?: string | null;
}
export interface UpdateSecurityTokenDto {
  isUsed?: boolean | null;
  expiresAt?: string | null; // date-time
  additionalData?: string | null;
}

export interface CreateAzureUserDto {
  email?: string | null;
  displayName?: string | null;
  givenName?: string | null;
  surname?: string | null;
  password?: string | null;
  forceChangePasswordNextSignIn: boolean;
  mailNickname?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  officeLocation?: string | null;
  mobilePhone?: string | null;
  businessPhones?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  usageLocation?: string | null;
  employeeId?: string | null;
  companyName?: string | null;
  accountEnabled: boolean;
}
export interface UpdateAzureUserDto {
  displayName?: string | null;
  givenName?: string | null;
  surname?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  officeLocation?: string | null;
  mobilePhone?: string | null;
  businessPhones?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  usageLocation?: string | null;
  employeeId?: string | null;
  companyName?: string | null;
  accountEnabled?: boolean | null;
}

export interface CreateAzureGroupDto {
  displayName?: string | null;
  description?: string | null;
  mailNickname?: string | null;
  groupType?: string | null;
  mailEnabled: boolean;
  securityEnabled: boolean;
  owners?: string[] | null;
  members?: string[] | null;
}
export interface UpdateAzureGroupDto {
  displayName?: string | null;
  description?: string | null;
  mailNickname?: string | null;
}

export interface CreateAzureSyncLogDto {
  syncDate?: string | null;
  recordsProcessed?: number | null;
  newUsers?: number | null;
  updatedUsers?: number | null;
  errors?: number | null;
  details?: string | null;
  syncType?: string | null;
}
export interface UpdateAzureSyncLogDto extends Omit<CreateAzureSyncLogDto, 'syncDate'> {}

export interface CreateHRSyncLogDto extends CreateAzureSyncLogDto {}
export interface UpdateHRSyncLogDto extends UpdateAzureSyncLogDto {}

export interface CreateNotificationSubscriptionDto {
  applicationId: string; // uuid
  eventType?: string | null;
  webhookUrl?: string | null;
  secretKey?: string | null;
}
export interface UpdateNotificationSubscriptionDto {
  webhookUrl?: string | null;
  secretKey?: string | null;
  isActive?: boolean | null;
}

/* =============================================================================
 * APIs adicionales (faltantes en tu archivo original, según Swagger)
 * ========================================================================== */

export const AppParamsAPI = {
  list: (page: number = 1, size: number = 100) =>
    apiFetch<unknown>(`/api/app-params${serializeQuery({ page, size })}`, { method: 'GET' }),

  create: (data: CreateAppParamDto) =>
    apiFetch<unknown>('/api/app-params', { method: 'POST', ...jsonBody(data) }),

  get: (id: string) =>
    apiFetch<unknown>(`/api/app-params/${encodeURIComponent(id)}`, { method: 'GET' }),

  update: (id: string, data: UpdateAppParamDto) =>
    apiFetch<unknown>(`/api/app-params/${encodeURIComponent(id)}`, { method: 'PUT', ...jsonBody(data) }),

  remove: (id: string) =>
    apiFetch<unknown>(`/api/app-params/${encodeURIComponent(id)}`, { method: 'DELETE' }),
} as const;

export const AuditLogAPI = {
  list: (page: number = 1, size: number = 100) =>
    apiFetch<unknown>(`/api/audit-log${serializeQuery({ page, size })}`, { method: 'GET' }),

  create: (data: CreateAuditLogDto) =>
    apiFetch<unknown>('/api/audit-log', { method: 'POST', ...jsonBody(data) }),

  get: (id: number) => apiFetch<unknown>(`/api/audit-log/${toInt(id)}`, { method: 'GET' }),

  update: (id: number, data: UpdateAuditLogDto) =>
    apiFetch<unknown>(`/api/audit-log/${toInt(id)}`, { method: 'PUT', ...jsonBody(data) }),
} as const;

export const AzureManagementAPI = {
  createUser: (data: CreateAzureUserDto) =>
    apiFetch<unknown>('/api/azure-management/users', { method: 'POST', ...jsonBody(data) }),

  listUsers: (page: number = 1, pageSize: number = 50, filter?: string) =>
    apiFetch<unknown>(`/api/azure-management/users${serializeQuery({ page, pageSize, filter })}`, { method: 'GET' }),

  getUser: (id: string) =>
    apiFetch<unknown>(`/api/azure-management/users/${encodeURIComponent(id)}`, { method: 'GET' }),

  updateUser: (id: string, data: UpdateAzureUserDto) =>
    apiFetch<unknown>(`/api/azure-management/users/${encodeURIComponent(id)}`, { method: 'PUT', ...jsonBody(data) }),

  deleteUser: (id: string, permanent: boolean = false) =>
    apiFetch<unknown>(`/api/azure-management/users/${encodeURIComponent(id)}${serializeQuery({ permanent })}`, { method: 'DELETE' }),

  getUserByEmail: (email: string) =>
    apiFetch<unknown>(`/api/azure-management/users/by-email/${encodeURIComponent(email)}`, { method: 'GET' }),

  enableUser: (id: string) =>
    apiFetch<unknown>(`/api/azure-management/users/${encodeURIComponent(id)}/enable`, { method: 'POST' }),

  disableUser: (id: string) =>
    apiFetch<unknown>(`/api/azure-management/users/${encodeURIComponent(id)}/disable`, { method: 'POST' }),

  resetPassword: (id: string, forceChange: boolean = true) =>
    apiFetch<unknown>(`/api/azure-management/users/${encodeURIComponent(id)}/reset-password${serializeQuery({ forceChange })}`, { method: 'POST' }),

  changePassword: (id: string, data: AzureChangePasswordDto) =>
    apiFetch<unknown>(`/api/azure-management/users/${encodeURIComponent(id)}/change-password`, { method: 'POST', ...jsonBody(data) }),

  validatePassword: (password: string) =>
    apiFetch<unknown>('/api/azure-management/validate-password', { method: 'POST', ...jsonBody(password) }),

  generatePassword: () =>
    apiFetch<unknown>('/api/azure-management/generate-password', { method: 'GET' }),

  listAzureRoles: () =>
    apiFetch<unknown>('/api/azure-management/azure-roles', { method: 'GET' }),

  getUserAzureRoles: (id: string) =>
    apiFetch<unknown>(`/api/azure-management/users/${encodeURIComponent(id)}/azure-roles`, { method: 'GET' }),

  addUserAzureRole: (userId: string, roleId: string) =>
    apiFetch<unknown>(`/api/azure-management/users/${encodeURIComponent(userId)}/azure-roles/${encodeURIComponent(roleId)}`, { method: 'POST' }),

  removeUserAzureRole: (userId: string, roleId: string) =>
    apiFetch<unknown>(`/api/azure-management/users/${encodeURIComponent(userId)}/azure-roles/${encodeURIComponent(roleId)}`, { method: 'DELETE' }),

  getRoleMembers: (roleId: string) =>
    apiFetch<unknown>(`/api/azure-management/azure-roles/${encodeURIComponent(roleId)}/members`, { method: 'GET' }),

  createGroup: (data: CreateAzureGroupDto) =>
    apiFetch<unknown>('/api/azure-management/groups', { method: 'POST', ...jsonBody(data) }),

  listGroups: (page: number = 1, pageSize: number = 50, filter?: string) =>
    apiFetch<unknown>(`/api/azure-management/groups${serializeQuery({ page, pageSize, filter })}`, { method: 'GET' }),

  getGroup: (id: string) =>
    apiFetch<unknown>(`/api/azure-management/groups/${encodeURIComponent(id)}`, { method: 'GET' }),

  updateGroup: (id: string, data: UpdateAzureGroupDto) =>
    apiFetch<unknown>(`/api/azure-management/groups/${encodeURIComponent(id)}`, { method: 'PUT', ...jsonBody(data) }),

  deleteGroup: (id: string) =>
    apiFetch<unknown>(`/api/azure-management/groups/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  addGroupMember: (groupId: string, userId: string) =>
    apiFetch<unknown>(`/api/azure-management/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`, { method: 'POST' }),

  removeGroupMember: (groupId: string, userId: string) =>
    apiFetch<unknown>(`/api/azure-management/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' }),

  listGroupMembers: (groupId: string) =>
    apiFetch<unknown>(`/api/azure-management/groups/${encodeURIComponent(groupId)}/members`, { method: 'GET' }),

  listUserAzureGroups: (id: string) =>
    apiFetch<unknown>(`/api/azure-management/users/${encodeURIComponent(id)}/azure-groups`, { method: 'GET' }),

  bulkCreateUsers: (data: CreateAzureUserDto[]) =>
    apiFetch<unknown>('/api/azure-management/users/bulk-create', { method: 'POST', ...jsonBody(data) }),

  bulkAddGroupMembers: (groupId: string, userIds: string[]) =>
    apiFetch<unknown>(`/api/azure-management/groups/${encodeURIComponent(groupId)}/members/bulk-add`, { method: 'POST', ...jsonBody(userIds) }),

  syncUser: (id: string) =>
    apiFetch<unknown>(`/api/azure-management/sync/user/${encodeURIComponent(id)}`, { method: 'POST' }),
} as const;

export const AzureSyncLogAPI = {
  list: (page: number = 1, size: number = 100) =>
    apiFetch<unknown>(`/api/azure-sync-log${serializeQuery({ page, size })}`, { method: 'GET' }),

  create: (data: CreateAzureSyncLogDto) =>
    apiFetch<unknown>('/api/azure-sync-log', { method: 'POST', ...jsonBody(data) }),

  get: (id: number) =>
    apiFetch<unknown>(`/api/azure-sync-log/${toInt(id)}`, { method: 'GET' }),

  update: (id: number, data: UpdateAzureSyncLogDto) =>
    apiFetch<unknown>(`/api/azure-sync-log/${toInt(id)}`, { method: 'PUT', ...jsonBody(data) }),
} as const;

export const HRSyncLogAPI = {
  list: (page: number = 1, size: number = 100) =>
    apiFetch<unknown>(`/api/hr-sync-log${serializeQuery({ page, size })}`, { method: 'GET' }),

  create: (data: CreateHRSyncLogDto) =>
    apiFetch<unknown>('/api/hr-sync-log', { method: 'POST', ...jsonBody(data) }),

  get: (id: number) =>
    apiFetch<unknown>(`/api/hr-sync-log/${toInt(id)}`, { method: 'GET' }),

  update: (id: number, data: UpdateHRSyncLogDto) =>
    apiFetch<unknown>(`/api/hr-sync-log/${toInt(id)}`, { method: 'PUT', ...jsonBody(data) }),
} as const;

export const FailedLoginsAPI = {
  list: (page: number = 1, size: number = 100) =>
    apiFetch<unknown>(`/api/failed-logins${serializeQuery({ page, size })}`, { method: 'GET' }),

  create: (data: CreateFailedAttemptDto) =>
    apiFetch<unknown>('/api/failed-logins', { method: 'POST', ...jsonBody(data) }),

  get: (id: number) =>
    apiFetch<unknown>(`/api/failed-logins/${toInt(id)}`, { method: 'GET' }),

  remove: (id: number) =>
    apiFetch<unknown>(`/api/failed-logins/${toInt(id)}`, { method: 'DELETE' }),
} as const;

export const LocalCredentialsAPI = {
  list: (page: number = 1, size: number = 100) =>
    apiFetch<unknown>(`/api/local-credentials${serializeQuery({ page, size })}`, { method: 'GET' }),

  create: (data: CreateLocalCredentialDto) =>
    apiFetch<unknown>('/api/local-credentials', { method: 'POST', ...jsonBody(data) }),

  get: (id: string) =>
    apiFetch<unknown>(`/api/local-credentials/${encodeURIComponent(id)}`, { method: 'GET' }),

  update: (id: string, data: UpdateLocalCredentialDto) =>
    apiFetch<unknown>(`/api/local-credentials/${encodeURIComponent(id)}`, { method: 'PUT', ...jsonBody(data) }),

  remove: (id: string) =>
    apiFetch<unknown>(`/api/local-credentials/${encodeURIComponent(id)}`, { method: 'DELETE' }),
} as const;

export const LoginHistoryAPI = {
  list: (page: number = 1, size: number = 100) =>
    apiFetch<unknown>(`/api/login-history${serializeQuery({ page, size })}`, { method: 'GET' }),

  create: (data: CreateLoginHistoryDto) =>
    apiFetch<unknown>('/api/login-history', { method: 'POST', ...jsonBody(data) }),

  get: (id: number) =>
    apiFetch<unknown>(`/api/login-history/${toInt(id)}`, { method: 'GET' }),

  update: (id: number, data: UpdateLoginHistoryDto) =>
    apiFetch<unknown>(`/api/login-history/${toInt(id)}`, { method: 'PUT', ...jsonBody(data) }),
} as const;

export const NotificationAPI = {
  createSubscription: (data: CreateNotificationSubscriptionDto) =>
    apiFetch<unknown>('/api/notifications/subscriptions', { method: 'POST', ...jsonBody(data) }),

  updateSubscription: (subscriptionId: string, data: UpdateNotificationSubscriptionDto) =>
    apiFetch<unknown>(`/api/notifications/subscriptions/${encodeURIComponent(subscriptionId)}`, { method: 'PUT', ...jsonBody(data) }),

  deleteSubscription: (subscriptionId: string) =>
    apiFetch<unknown>(`/api/notifications/subscriptions/${encodeURIComponent(subscriptionId)}`, { method: 'DELETE' }),

  getSubscriptionsByApplication: (applicationId: string) =>
    apiFetch<unknown>(`/api/notifications/subscriptions/application/${encodeURIComponent(applicationId)}`, { method: 'GET' }),

  getStats: () =>
    apiFetch<unknown>('/api/notifications/stats', { method: 'GET' }),

  getStatsByApplication: (applicationId: string) =>
    apiFetch<unknown>(`/api/notifications/stats/application/${encodeURIComponent(applicationId)}`, { method: 'GET' }),

  processPending: () =>
    apiFetch<unknown>('/api/notifications/process-pending', { method: 'POST' }),

  webhookTest: (body: unknown = {}) =>
    apiFetch<unknown>('/api/notifications/webhook-test', { method: 'POST', ...jsonBody(body) }),
} as const;

export const PermissionChangeHistoryAPI = {
  list: (page: number = 1, size: number = 100) =>
    apiFetch<unknown>(`/api/permission-change-history${serializeQuery({ page, size })}`, { method: 'GET' }),

  create: (data: CreatePermissionChangeHistoryDto) =>
    apiFetch<unknown>('/api/permission-change-history', { method: 'POST', ...jsonBody(data) }),

  get: (id: number) =>
    apiFetch<unknown>(`/api/permission-change-history/${toInt(id)}`, { method: 'GET' }),

  update: (id: number, data: UpdatePermissionChangeHistoryDto) =>
    apiFetch<unknown>(`/api/permission-change-history/${toInt(id)}`, { method: 'PUT', ...jsonBody(data) }),
} as const;

export const PermissionsAPI = {
  list: (page: number = 1, size: number = 100) =>
    apiFetch<unknown>(`/api/permissions${serializeQuery({ page, size })}`, { method: 'GET' }),

  create: (data: CreatePermissionDto) =>
    apiFetch<unknown>('/api/permissions', { method: 'POST', ...jsonBody(data) }),

  get: (id: number) =>
    apiFetch<unknown>(`/api/permissions/${toInt(id)}`, { method: 'GET' }),

  update: (id: number, data: UpdatePermissionDto) =>
    apiFetch<unknown>(`/api/permissions/${toInt(id)}`, { method: 'PUT', ...jsonBody(data) }),

  remove: (id: number) =>
    apiFetch<unknown>(`/api/permissions/${toInt(id)}`, { method: 'DELETE' }),
} as const;

export const RoleChangeHistoryAPI = {
  list: (page: number = 1, size: number = 100) =>
    apiFetch<unknown>(`/api/role-change-history${serializeQuery({ page, size })}`, { method: 'GET' }),

  create: (data: CreateRoleChangeHistoryDto) =>
    apiFetch<unknown>('/api/role-change-history', { method: 'POST', ...jsonBody(data) }),

  get: (id: number) =>
    apiFetch<unknown>(`/api/role-change-history/${toInt(id)}`, { method: 'GET' }),

  update: (id: number, data: UpdateRoleChangeHistoryDto) =>
    apiFetch<unknown>(`/api/role-change-history/${toInt(id)}`, { method: 'PUT', ...jsonBody(data) }),
} as const;

export const SecurityTokensAPI = {
  list: (page: number = 1, size: number = 100) =>
    apiFetch<unknown>(`/api/security-tokens${serializeQuery({ page, size })}`, { method: 'GET' }),

  create: (data: CreateSecurityTokenDto) =>
    apiFetch<unknown>('/api/security-tokens', { method: 'POST', ...jsonBody(data) }),

  get: (id: string) =>
    apiFetch<unknown>(`/api/security-tokens/${encodeURIComponent(id)}`, { method: 'GET' }),

  update: (id: string, data: UpdateSecurityTokenDto) =>
    apiFetch<unknown>(`/api/security-tokens/${encodeURIComponent(id)}`, { method: 'PUT', ...jsonBody(data) }),

  remove: (id: string) =>
    apiFetch<unknown>(`/api/security-tokens/${encodeURIComponent(id)}`, { method: 'DELETE' }),
} as const;

export const SessionsAPI = {
  list: (page: number = 1, size: number = 100) =>
    apiFetch<unknown>(`/api/sessions${serializeQuery({ page, size })}`, { method: 'GET' }),

  create: (data: CreateUserSessionDto) =>
    apiFetch<unknown>('/api/sessions', { method: 'POST', ...jsonBody(data) }),

  get: (id: string) =>
    apiFetch<unknown>(`/api/sessions/${encodeURIComponent(id)}`, { method: 'GET' }),

  update: (id: string, data: UpdateUserSessionDto) =>
    apiFetch<unknown>(`/api/sessions/${encodeURIComponent(id)}`, { method: 'PUT', ...jsonBody(data) }),

  remove: (id: string) =>
    apiFetch<unknown>(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
} as const;

export const UserActivityAPI = {
  list: (page: number = 1, size: number = 100) =>
    apiFetch<unknown>(`/api/user-activity${serializeQuery({ page, size })}`, { method: 'GET' }),

  create: (data: CreateUserActivityLogDto) =>
    apiFetch<unknown>('/api/user-activity', { method: 'POST', ...jsonBody(data) }),

  get: (id: number) =>
    apiFetch<unknown>(`/api/user-activity/${toInt(id)}`, { method: 'GET' }),

  update: (id: number, data: UpdateUserActivityLogDto) =>
    apiFetch<unknown>(`/api/user-activity/${toInt(id)}`, { method: 'PUT', ...jsonBody(data) }),
} as const;

export const UserEmployeesAPI = {
  list: (page: number = 1, size: number = 100) =>
    apiFetch<unknown>(`/api/user-employees${serializeQuery({ page, size })}`, { method: 'GET' }),

  create: (data: CreateUserEmployeeDto) =>
    apiFetch<unknown>('/api/user-employees', { method: 'POST', ...jsonBody(data) }),

  get: (id: number) =>
    apiFetch<unknown>(`/api/user-employees/${toInt(id)}`, { method: 'GET' }),

  update: (id: number, data: UpdateUserEmployeeDto) =>
    apiFetch<unknown>(`/api/user-employees/${toInt(id)}`, { method: 'PUT', ...jsonBody(data) }),

  remove: (id: number) =>
    apiFetch<unknown>(`/api/user-employees/${toInt(id)}`, { method: 'DELETE' }),
} as const;
