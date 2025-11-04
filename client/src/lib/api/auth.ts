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

// =============================================================================
// Tipos de autenticación
// =============================================================================

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

// =============================================================================
// API de Autenticación Principal
// =============================================================================

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

// =============================================================================
// API de Autenticación de Aplicaciones
// =============================================================================

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

// =============================================================================
// API de Gestión de Usuarios
// =============================================================================

export const AuthUsersAPI = {
  list: (): Promise<ApiResponse<User[]>> =>
    apiFetch<User[]>('/api/users'),

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

  delete: (id: string): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/users/${id}`, {
      method: 'DELETE'
    })
};

// =============================================================================
// API de Gestión de Roles
// =============================================================================

export const RolesAPI = {
  list: (): Promise<ApiResponse<Role[]>> =>
    apiFetch<Role[]>('/api/roles'),

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
    apiFetch<void>(`/api/roles/${id}`, {
      method: 'DELETE'
    })
};

// =============================================================================
// API de Asignación de Roles a Usuarios
// =============================================================================

export const UserRolesAPI = {
  list: (): Promise<ApiResponse<UserRole[]>> =>
    apiFetch<UserRole[]>('/api/user-roles'),

  getByUser: (userId: string): Promise<ApiResponse<UserRole[]>> =>
    apiFetch<UserRole[]>(`/api/user-roles/user/${userId}`),

  getByRole: (roleId: number): Promise<ApiResponse<UserRole[]>> =>
    apiFetch<UserRole[]>(`/api/user-roles/role/${roleId}`),

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

// =============================================================================
// API de Gestión de Items de Menú
// =============================================================================

export const MenuItemsAPI = {
  list: (): Promise<ApiResponse<MenuItem[]>> =>
    apiFetch<MenuItem[]>('/api/menu-items'),

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
    apiFetch<void>(`/api/menu-items/${id}`, {
      method: 'DELETE'
    })
};

// =============================================================================
// API de Asignación de Menús a Roles
// =============================================================================

export const RoleMenuItemsAPI = {
  list: (): Promise<ApiResponse<RoleMenuItem[]>> =>
    apiFetch<RoleMenuItem[]>('/api/role-menu-items'),

  getByRole: (roleId: number): Promise<ApiResponse<RoleMenuItem[]>> =>
    apiFetch<RoleMenuItem[]>(`/api/role-menu-items/role/${roleId}`),

  assign: (data: CreateRoleMenuItemDto): Promise<ApiResponse<RoleMenuItem>> =>
    apiFetch<RoleMenuItem>('/api/role-menu-items', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (roleId: number, menuItemId: number, data: UpdateRoleMenuItemDto): Promise<ApiResponse<RoleMenuItem>> =>
    apiFetch<RoleMenuItem>(`/api/role-menu-items/${roleId}/${menuItemId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  remove: (roleId: number, menuItemId: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/role-menu-items/${roleId}/${menuItemId}`, {
      method: 'DELETE'
    })
};

// =============================================================================
// API de Cambio de Contraseña
// =============================================================================

export const PasswordAPI = {
  change: (data: ChangePasswordDto): Promise<ApiResponse<ChangePasswordResponse>> =>
    apiFetch<ChangePasswordResponse>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};
