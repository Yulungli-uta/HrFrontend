// services/auth/types.ts

// Interfaces para autenticación
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface UserSession {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role?: string;
  department?: string;
  avatar?: string;
  userType?: string;
  displayName?: string;
  isActive?: boolean;
  azureObjectId?: string;
  permissions?: string[];
  lastLogin?: string;
}

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
  provider: 'azure';
  nonce: string;
}

export interface ApiError {
  code: number;
  message: string;
  details?: any;
  timestamp?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: ApiError;
  message?: string;
  validationErrors?: ValidationError[];
}

// Interfaces para el menú y permisos
export interface MenuItem {
  id: number;
  parentId?: number;
  name: string;
  url: string;
  icon: string;
  order: number;
  moduleName: string;
  isVisible: boolean;
  permissions?: string[];
  children?: MenuItem[];
}

export interface Permission {
  id: number;
  name: string;
  module: string;
  action: string;
  description: string;
  version: number;
}

export interface UserRole {
  userId: string;
  roleId: number;
  roleName?: string;
  assignedAt: string;
  expiresAt?: string;
  assignedBy?: string;
  reason?: string;
}

// Interfaces para historial y auditoría
export interface LoginHistory {
  id: number;
  userId: string;
  loginType: string;
  loginStatus: string;
  ipAddress: string;
  userAgent: string;
  deviceInfo: string;
  locationInfo: string;
  sessionId: string;
  createdAt: string;
  failureReason?: string;
}

export interface FailedLoginAttempt {
  id: number;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  reason: string;
  windowBucket: string;
  createdAt: string;
  attemptCount?: number;
}

// Interfaces para la configuración de la aplicación
export interface AppConfig {
  inactivityTimeout: number;
  warningTime: number;
  sessionRefreshInterval: number;
  maxLoginAttempts: number;
  passwordPolicy: PasswordPolicy;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expirationDays: number;
}

// Tipo para el estado de autenticación
export interface AuthState {
  isAuthenticated: boolean;
  user: UserSession | null;
  isLoading: boolean;
  error: string | null;
}

// Tipo para el contexto de autenticación
export interface AuthContextType {
  isAuthenticated: boolean;
  user: UserSession | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithOffice365: () => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Enums para tipos y estados
export enum LoginType {
  LOCAL = 'local',
  AZURE_AD = 'azure_ad',
  GOOGLE = 'google',
}

export enum LoginStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  LOCKED = 'locked',
  EXPIRED = 'expired',
}

export enum UserType {
  ADMIN = 'admin',
  USER = 'user',
  MANAGER = 'manager',
  GUEST = 'guest',
}

// Utilidades TypeScript
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export type Require<T, K extends keyof T> = T & Required<Pick<T, K>>;