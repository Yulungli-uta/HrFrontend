// src/lib/api/auth.ts
/**
 * APIs relacionadas con autenticación y gestión de usuarios
 */

import { apiFetch } from './client';
import type { ApiResponse } from './client';
import type {
  User, Role, UserRole, MenuItem, RoleMenuItem,
  CreateUserDto, UpdateUserDto,
  CreateRoleDto, UpdateRoleDto,
  CreateUserRoleDto, UpdateUserRoleDto,
  CreateMenuItemDto, UpdateMenuItemDto,
  CreateRoleMenuItemDto, UpdateRoleMenuItemDto,
  ChangePasswordDto, ChangePasswordResponse
} from '@/types/auth';

/* =============================================================================
 * Helpers de normalización y sanity checks
 * ========================================================================== */
function toInt(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Valor numérico inválido: ${v}`);
  return n;
}

function toBool(v: any, fallback = false): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
}

/** Normaliza 'data' a array genérico: [], {items:[]}, {results:[]}, {data:[]}, dict */
function coerceToArray<T>(payload: any): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  if (Array.isArray(payload?.results)) return payload.results as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  // Diccionario {id: obj}
  if (typeof payload === 'object') {
    const vals = Object.values(payload);
    if (vals.length && vals.every(v => typeof v === 'object')) {
      return vals as T[];
    }
  }
  return [];
}

/** Asegura ApiResponse; si ya lo es, lo devuelve; si no, lo envuelve */
function ensureApiResponse<T>(raw: any): ApiResponse<T> {
  if (raw && typeof raw === 'object' && 'status' in raw) {
    return raw as ApiResponse<T>;
  }
  // Backend devolvió T crudo
  return { status: 'success', data: raw as T } as ApiResponse<T>;
}

/* =============================================================================
 * Tipos de autenticación
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
      body: JSON.stringify(credentials)
    }),

  refresh: (refreshRequest: RefreshRequest): Promise<ApiResponse<LoginResponse>> =>
    apiFetch<LoginResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(refreshRequest)
    }),

  getCurrentUser: (): Promise<ApiResponse<UserInfo>> =>
    apiFetch<UserInfo>('/api/auth/me'),

  validateToken: (validateRequest: ValidateTokenRequest): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/auth/validate-token', {
      method: 'POST',
      body: JSON.stringify(validateRequest)
    }),

  getAzureAuthUrl: (clientId?: string): Promise<ApiResponse<AzureAuthUrlResponse>> => {
    const queryParams = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
    return apiFetch<AzureAuthUrlResponse>(`/api/auth/azure/url${queryParams}`);
  },

  azureCallback: (code: string, state: string): Promise<ApiResponse<LoginResponse>> => {
    const queryParams = `?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    return apiFetch<LoginResponse>(`/api/auth/azure/callback${queryParams}`);
  }
};

/* =============================================================================
 * API de Autenticación de Aplicaciones
 * ========================================================================== */

export const AppAuthAPI = {
  getToken: (authRequest: AppAuthRequest): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/app-auth/token', {
      method: 'POST',
      body: JSON.stringify(authRequest)
    }),

  legacyLogin: (authRequest: LegacyAuthRequest): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/app-auth/legacy-login', {
      method: 'POST',
      body: JSON.stringify(authRequest)
    })
};

/* =============================================================================
 * API de Gestión de Usuarios
 * ========================================================================== */

export const AuthUsersAPI = {
  list: async (): Promise<ApiResponse<User[]>> => {
    const raw = await apiFetch<User[]>('/api/users');
    const res = ensureApiResponse<User[]>(raw);
    if (res.status === 'success') {
      res.data = coerceToArray<User>(res.data);
    }
    return res;
  },

  get: (id: string): Promise<ApiResponse<User>> =>
    apiFetch<User>(`/api/users/${id}`),

  create: (data: CreateUserDto): Promise<ApiResponse<User>> =>
    apiFetch<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id: string, data: UpdateUserDto): Promise<ApiResponse<User>> =>
    apiFetch<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  remove: (id: string): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/users/${id}`, {
      method: 'DELETE'
    })
};

/* =============================================================================
 * API de Gestión de Roles
 * ========================================================================== */

export const RolesAPI = {
  list: async (): Promise<ApiResponse<Role[]>> => {
    const raw = await apiFetch<Role[]>('/api/roles');
    const res = ensureApiResponse<Role[]>(raw);
    if (res.status === 'success') {
      const arr = coerceToArray<Role>(res.data).map(r => ({
        ...r,
        id: (typeof (r as any).id === 'string' || typeof (r as any).id === 'number')
          ? Number((r as any).id)
          : (r as any).id,
        isActive: toBool((r as any).isActive, true),
        isDeleted: toBool((r as any).isDeleted, false),
      }));
      res.data = arr;
    }
    return res;
  },

  get: (id: number): Promise<ApiResponse<Role>> =>
    apiFetch<Role>(`/api/roles/${id}`),

  create: (data: CreateRoleDto): Promise<ApiResponse<Role>> =>
    apiFetch<Role>('/api/roles', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id: number, data: UpdateRoleDto): Promise<ApiResponse<Role>> =>
    apiFetch<Role>(`/api/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/roles/${id}`, { method: 'DELETE' }),

  // Alias para compatibilidad con UI que invoca remove()
  remove(id: number) {
    return this.delete(id);
  },
};

/* =============================================================================
 * API de Asignación de Roles a Usuarios
 * ========================================================================== */

export const UserRolesAPI = {
  list: async (): Promise<ApiResponse<UserRole[]>> => {
    const raw = await apiFetch<UserRole[]>('/api/user-roles');
    const res = ensureApiResponse<UserRole[]>(raw);
    if (res.status === 'success') {
      res.data = coerceToArray<UserRole>(res.data);
    }
    return res;
  },

  getByUser: async (userId: string): Promise<ApiResponse<UserRole[]>> => {
    const raw = await apiFetch<UserRole[]>(`/api/user-roles/user/${userId}`);
    const res = ensureApiResponse<UserRole[]>(raw);
    if (res.status === 'success') {
      res.data = coerceToArray<UserRole>(res.data);
    }
    return res;
  },

  getByRole: async (roleId: number): Promise<ApiResponse<UserRole[]>> => {
    const raw = await apiFetch<UserRole[]>(`/api/user-roles/role/${roleId}`);
    const res = ensureApiResponse<UserRole[]>(raw);
    if (res.status === 'success') {
      res.data = coerceToArray<UserRole>(res.data);
    }
    return res;
  },

  assign: (data: CreateUserRoleDto): Promise<ApiResponse<UserRole>> =>
    apiFetch<UserRole>('/api/user-roles', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (userId: string, roleId: number, data: UpdateUserRoleDto): Promise<ApiResponse<UserRole>> =>
    apiFetch<UserRole>(`/api/user-roles/${userId}/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  remove: (userId: string, roleId: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/user-roles/${userId}/${roleId}`, {
      method: 'DELETE'
    })
};

/* =============================================================================
 * API de Gestión de Items de Menú
 * ========================================================================== */

export const MenuItemsAPI = {
  list: async (): Promise<ApiResponse<MenuItem[]>> => {
    const raw = await apiFetch<MenuItem[]>('/api/menu-items');
    const res = ensureApiResponse<MenuItem[]>(raw);
    if (res.status === 'success') {
      const arr = coerceToArray<MenuItem>(res.data).map(m => ({
        ...m,
        id: toInt((m as any).id),
        parentId: (m as any).parentId === null || (m as any).parentId === undefined
          ? null
          : toInt((m as any).parentId),
        order: Number((m as any).order ?? 0),
        isVisible: toBool((m as any).isVisible, true),
        isDeleted: toBool((m as any).isDeleted, false),
      }));
      res.data = arr;
    }
    return res;
  },

  get: (id: number): Promise<ApiResponse<MenuItem>> =>
    apiFetch<MenuItem>(`/api/menu-items/${id}`),

  create: (data: CreateMenuItemDto): Promise<ApiResponse<MenuItem>> =>
    apiFetch<MenuItem>('/api/menu-items', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id: number, data: UpdateMenuItemDto): Promise<ApiResponse<MenuItem>> =>
    apiFetch<MenuItem>(`/api/menu-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/menu-items/${id}`, { method: 'DELETE' }),

  // Alias para compatibilidad con UI que invoca remove()
  remove(id: number) {
    return this.delete(id);
  },
};

/* =============================================================================
 * API de Asignación de Menús a Roles
 * ========================================================================== */

export const RoleMenuItemsAPI = {
  list: async (): Promise<ApiResponse<RoleMenuItem[]>> => {
    const raw = await apiFetch<RoleMenuItem[]>('/api/role-menu-items');
    const res = ensureApiResponse<RoleMenuItem[]>(raw);
    if (res.status === 'success') {
      const arr = coerceToArray<RoleMenuItem>(res.data).map(x => ({
        roleId: toInt((x as any).roleId),
        menuItemId: toInt((x as any).menuItemId),
        isVisible: toBool((x as any).isVisible, true),
      }));
      res.data = arr;
    }
    return res;
  },

  getByRole: async (roleId: number): Promise<ApiResponse<RoleMenuItem[]>> => {
    const raw = await apiFetch<RoleMenuItem[]>(`/api/role-menu-items/role/${roleId}`);
    const res = ensureApiResponse<RoleMenuItem[]>(raw);
    if (res.status === 'success') {
      const arr = coerceToArray<RoleMenuItem>(res.data).map(x => ({
        roleId: toInt((x as any).roleId),
        menuItemId: toInt((x as any).menuItemId),
        isVisible: toBool((x as any).isVisible, true),
      }));
      res.data = arr;
    }
    return res;
  },

  /** Alias oficial que usa la UI moderna */
  assign: (data: CreateRoleMenuItemDto): Promise<ApiResponse<RoleMenuItem>> =>
    apiFetch<RoleMenuItem>('/api/role-menu-items', {
      method: 'POST',
      body: JSON.stringify({
        roleId: toInt((data as any).roleId),
        menuItemId: toInt((data as any).menuItemId),
        isVisible: toBool((data as any).isVisible, true),
      }),
    }),

  update: (roleId: number, menuItemId: number, data: UpdateRoleMenuItemDto): Promise<ApiResponse<RoleMenuItem>> =>
    apiFetch<RoleMenuItem>(`/api/role-menu-items/${toInt(roleId)}/${toInt(menuItemId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        isVisible: toBool((data as any).isVisible, true),
      }),
    }),

  remove: (roleId: number, menuItemId: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/role-menu-items/${toInt(roleId)}/${toInt(menuItemId)}`, {
      method: 'DELETE'
    }),

  /** Alias para código legado que llama .create() */
  create(data: CreateRoleMenuItemDto) {
    return this.assign(data);
  },
};

/* =============================================================================
 * API de Cambio de Contraseña
 * ========================================================================== */

export const PasswordAPI = {
  change: (data: ChangePasswordDto): Promise<ApiResponse<ChangePasswordResponse>> =>
    apiFetch<ChangePasswordResponse>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};
