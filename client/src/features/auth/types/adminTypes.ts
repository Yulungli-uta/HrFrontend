/**
 * features/auth/types/adminTypes.ts
 *
 * Tipos para la administración de usuarios, roles y menús del sistema.
 * Consolida lo que antes estaba en types/auth.ts.
 * SRP: solo tipos de entidades administrativas (CRUD de usuarios/roles/menús).
 */

// ─── Entidades ─────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  azureObjectId: string | null;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  userType: string; // "Local" | "AzureAD"
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
  isDeleted: boolean;
}

export interface UserRole {
  userId: string;
  roleId: number;
  assignedAt: string;
  expiresAt: string | null;
  assignedBy: string | null;
  reason: string | null;
  isDeleted: boolean;
}

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

export interface RoleMenuItem {
  roleId: number;
  menuItemId: number;
  isVisible: boolean;
}

// ─── DTOs de creación ──────────────────────────────────────────────────────────

export interface CreateUserDto {
  email: string;
  displayName?: string;
  userType?: string; // "Local" | "AzureAD"
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  priority: number;
}

export interface CreateUserRoleDto {
  userId: string;
  roleId: number;
  expiresAt?: string;
  assignedBy?: string;
  reason?: string;
}

export interface CreateMenuItemDto {
  parentId?: number | null;
  name: string;
  url?: string;
  icon?: string;
  order: number;
  moduleName?: string;
  isVisible?: boolean;
}

export interface CreateRoleMenuItemDto {
  roleId: number;
  menuItemId: number;
  isVisible?: boolean;
}

// ─── DTOs de actualización ─────────────────────────────────────────────────────

export interface UpdateUserDto {
  displayName?: string;
  isActive?: boolean;
  azureObjectId?: string;
  userType?: string;
}

export interface UpdateRoleDto {
  description?: string;
  isActive?: boolean;
  priority?: number;
}

export interface UpdateUserRoleDto {
  expiresAt?: string;
  isDeleted?: boolean;
  reason?: string;
}

export interface UpdateMenuItemDto {
  parentId?: number | null;
  name?: string;
  url?: string;
  icon?: string;
  order?: number;
  moduleName?: string;
  isVisible?: boolean;
}

export interface UpdateRoleMenuItemDto {
  isVisible?: boolean;
}

// ─── DTOs de contraseña ────────────────────────────────────────────────────────

export interface MenuItemTree extends MenuItem {
  children?: MenuItemTree[];
}

// ─── DTOs de contraseña —————————————————————————————————————————————————————————————————————————————————

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}
