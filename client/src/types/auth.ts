// types/auth.ts - Tipos para el sistema de autenticación y gestión de usuarios

/**
 * Usuario del sistema de autenticación
 */
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

/**
 * Rol del sistema
 */
export interface Role {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
  isDeleted: boolean;
}

/**
 * Asignación de rol a usuario
 */
export interface UserRole {
  userId: string;
  roleId: number;
  assignedAt: string;
  expiresAt: string | null;
  assignedBy: string | null;
  reason: string | null;
  isDeleted: boolean;
}

/**
 * Item de menú
 */
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

/**
 * Asignación de menú a rol
 */
export interface RoleMenuItem {
  roleId: number;
  menuItemId: number;
  isVisible: boolean;
}

// ============================================================================
// DTOs para creación y actualización
// ============================================================================

/**
 * DTO para crear usuario
 */
export interface CreateUserDto {
  email: string;
  displayName?: string;
  userType?: string; // "Local" | "AzureAD"
}

/**
 * DTO para actualizar usuario
 */
export interface UpdateUserDto {
  displayName?: string;
  isActive?: boolean;
  azureObjectId?: string;
  userType?: string;
}

/**
 * DTO para crear rol
 */
export interface CreateRoleDto {
  name: string;
  description?: string;
  priority: number;
}

/**
 * DTO para actualizar rol
 */
export interface UpdateRoleDto {
  description?: string;
  isActive?: boolean;
  priority?: number;
}

/**
 * DTO para asignar rol a usuario
 */
export interface CreateUserRoleDto {
  userId: string;
  roleId: number;
  expiresAt?: string;
  assignedBy?: string;
  reason?: string;
}

/**
 * DTO para actualizar asignación de rol
 */
export interface UpdateUserRoleDto {
  expiresAt?: string;
  isDeleted?: boolean;
  reason?: string;
}

/**
 * DTO para crear item de menú
 */
export interface CreateMenuItemDto {
  parentId?: number | null;
  name: string;
  url?: string;
  icon?: string;
  order: number;
  moduleName?: string;
  isVisible?: boolean;
}

/**
 * DTO para actualizar item de menú
 */
export interface UpdateMenuItemDto {
  parentId?: number | null;
  name?: string;
  url?: string;
  icon?: string;
  order?: number;
  moduleName?: string;
  isVisible?: boolean;
}

/**
 * DTO para asignar menú a rol
 */
export interface CreateRoleMenuItemDto {
  roleId: number;
  menuItemId: number;
  isVisible?: boolean;
}

/**
 * DTO para actualizar asignación de menú a rol
 */
export interface UpdateRoleMenuItemDto {
  isVisible?: boolean;
}

/**
 * DTO para cambio de contraseña
 */
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

/**
 * Respuesta de cambio de contraseña
 */
export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// Tipos extendidos para la UI
// ============================================================================

/**
 * Usuario con roles asignados (para vista de tabla)
 */
export interface UserWithRoles extends User {
  roles?: Role[];
}

/**
 * Rol con cantidad de usuarios asignados
 */
export interface RoleWithStats extends Role {
  userCount?: number;
}

/**
 * Item de menú con hijos (para vista de árbol)
 */
export interface MenuItemTree extends MenuItem {
  children?: MenuItemTree[];
}

/**
 * Asignación de rol con información completa
 */
export interface UserRoleWithDetails extends UserRole {
  user?: User;
  role?: Role;
}

/**
 * Asignación de menú con información completa
 */
export interface RoleMenuItemWithDetails extends RoleMenuItem {
  role?: Role;
  menuItem?: MenuItem;
}
