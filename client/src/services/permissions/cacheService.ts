// services/permissions/cacheService.ts
/**
 * Servicio de caché seguro para roles y permisos
 * 
 * Características de seguridad:
 * - Encriptación básica de datos en localStorage
 * - Validación de integridad con hash
 * - Expiración automática de caché
 * - Invalidación al logout
 * - Protección contra manipulación
 */

import { UserSession } from '@/services/auth/types';

// Configuración de caché
const CACHE_CONFIG = {
  PREFIX: 'wsuta_secure_',
  PERMISSIONS_KEY: 'permissions_cache',
  ROLES_KEY: 'roles_cache',
  MENU_KEY: 'menu_cache',
  TIMESTAMP_KEY: 'cache_timestamp',
  HASH_KEY: 'cache_hash',
  TTL: 15 * 60 * 1000, // 15 minutos en milisegundos
};

interface CachedData<T> {
  data: T;
  timestamp: number;
  hash: string;
  userId: string;
  tokenHash: string; // Hash del token para validar sesión
}

/**
 * Servicio de caché seguro
 */
export class CacheService {
  /**
   * Genera un hash simple para validación de integridad
   * Nota: Para producción, considerar usar crypto-js o similar
   */
  private static generateHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Encriptación básica (XOR con clave)
   * Nota: Para producción, usar una librería de encriptación real
   */
  private static encrypt(data: string): string {
    const key = 'wsuta_2024_secure_key'; // En producción, usar variable de entorno
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result); // Base64 encode
  }

  /**
   * Desencriptación básica
   */
  private static decrypt(data: string): string {
    try {
      const key = 'wsuta_2024_secure_key';
      const decoded = atob(data);
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch (error) {
      console.error('Error desencriptando datos:', error);
      return '';
    }
  }

  /**
   * Obtiene la clave completa con prefijo
   */
  private static getKey(key: string): string {
    return `${CACHE_CONFIG.PREFIX}${key}`;
  }

  /**
   * Genera hash del token actual
   */
  private static getTokenHash(): string {
    try {
      const token = localStorage.getItem('wsuta_access_token') || '';
      return this.generateHash(token);
    } catch {
      return '';
    }
  }

  /**
   * Guarda datos en caché de forma segura
   */
  static set<T>(key: string, data: T, userId: string): void {
    try {
      const timestamp = Date.now();
      const tokenHash = this.getTokenHash();
      const dataString = JSON.stringify(data);
      const hash = this.generateHash(dataString + userId + timestamp + tokenHash);

      const cachedData: CachedData<T> = {
        data,
        timestamp,
        hash,
        userId,
        tokenHash,
      };

      const encrypted = this.encrypt(JSON.stringify(cachedData));
      localStorage.setItem(this.getKey(key), encrypted);

      // Debug en desarrollo
      if (import.meta.env.DEV) {
        console.log(`✅ Caché guardado: ${key}`, {
          size: encrypted.length,
          timestamp: new Date(timestamp).toISOString(),
        });
      }
    } catch (error) {
      console.error('Error guardando en caché:', error);
      // No lanzar error, solo loguear
    }
  }

  /**
   * Obtiene datos de caché con validación de seguridad
   */
  static get<T>(key: string, userId: string): T | null {
    try {
      const encrypted = localStorage.getItem(this.getKey(key));
      if (!encrypted) {
        return null;
      }

      const decrypted = this.decrypt(encrypted);
      if (!decrypted) {
        console.warn('Caché corrupto, eliminando...');
        this.remove(key);
        return null;
      }

      const cachedData: CachedData<T> = JSON.parse(decrypted);

      // Validar userId
      if (cachedData.userId !== userId) {
        console.warn('Caché de otro usuario, eliminando...');
        this.remove(key);
        return null;
      }

      // Validar token (sesión)
      const currentTokenHash = this.getTokenHash();
      if (cachedData.tokenHash && cachedData.tokenHash !== currentTokenHash) {
        console.warn('Caché de otra sesión, eliminando...');
        this.remove(key);
        return null;
      }

      // Validar expiración
      const now = Date.now();
      const age = now - cachedData.timestamp;
      if (age > CACHE_CONFIG.TTL) {
        if (import.meta.env.DEV) {
          console.log(`⏰ Caché expirado: ${key} (${Math.round(age / 1000)}s)`);
        }
        this.remove(key);
        return null;
      }

      // Validar integridad
      const dataString = JSON.stringify(cachedData.data);
      const expectedHash = this.generateHash(dataString + cachedData.userId + cachedData.timestamp);
      if (cachedData.hash !== expectedHash) {
        console.warn('Caché manipulado, eliminando...');
        this.remove(key);
        return null;
      }

      // Debug en desarrollo
      if (import.meta.env.DEV) {
        console.log(`✅ Caché recuperado: ${key}`, {
          age: `${Math.round(age / 1000)}s`,
          remaining: `${Math.round((CACHE_CONFIG.TTL - age) / 1000)}s`,
        });
      }

      return cachedData.data;
    } catch (error) {
      console.error('Error leyendo caché:', error);
      this.remove(key);
      return null;
    }
  }

  /**
   * Elimina un elemento de caché
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error('Error eliminando caché:', error);
    }
  }

  /**
   * Limpia todo el caché del usuario
   */
  static clearAll(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_CONFIG.PREFIX)) {
          localStorage.removeItem(key);
        }
      });

      if (import.meta.env.DEV) {
        console.log('🗑️ Caché completo eliminado');
      }
    } catch (error) {
      console.error('Error limpiando caché:', error);
    }
  }

  /**
   * Verifica si existe caché válido
   */
  static has(key: string, userId: string): boolean {
    return this.get(key, userId) !== null;
  }

  /**
   * Obtiene el tiempo restante de vida del caché (en segundos)
   */
  static getRemainingTTL(key: string, userId: string): number {
    try {
      const encrypted = localStorage.getItem(this.getKey(key));
      if (!encrypted) return 0;

      const decrypted = this.decrypt(encrypted);
      if (!decrypted) return 0;

      const cachedData: CachedData<any> = JSON.parse(decrypted);
      
      if (cachedData.userId !== userId) return 0;

      const now = Date.now();
      const age = now - cachedData.timestamp;
      const remaining = CACHE_CONFIG.TTL - age;

      return Math.max(0, Math.round(remaining / 1000));
    } catch {
      return 0;
    }
  }
}

/**
 * Servicio específico para permisos
 */
export class PermissionCacheService {
  /**
   * Guarda roles en caché
   */
  static setRoles(roles: string[], userId: string): void {
    CacheService.set(CACHE_CONFIG.ROLES_KEY, roles, userId);
  }

  /**
   * Obtiene roles de caché
   */
  static getRoles(userId: string): string[] | null {
    return CacheService.get<string[]>(CACHE_CONFIG.ROLES_KEY, userId);
  }

  /**
   * Guarda permisos en caché
   */
  static setPermissions(permissions: string[], userId: string): void {
    CacheService.set(CACHE_CONFIG.PERMISSIONS_KEY, permissions, userId);
  }

  /**
   * Obtiene permisos de caché
   */
  static getPermissions(userId: string): string[] | null {
    return CacheService.get<string[]>(CACHE_CONFIG.PERMISSIONS_KEY, userId);
  }

  /**
   * Guarda menús en caché
   */
  static setMenuItems(menuItems: any[], userId: string): void {
    CacheService.set(CACHE_CONFIG.MENU_KEY, menuItems, userId);
  }

  /**
   * Obtiene menús de caché
   */
  static getMenuItems(userId: string): any[] | null {
    return CacheService.get<any[]>(CACHE_CONFIG.MENU_KEY, userId);
  }

  /**
   * Invalida todo el caché de permisos
   */
  static invalidate(): void {
    CacheService.remove(CACHE_CONFIG.ROLES_KEY);
    CacheService.remove(CACHE_CONFIG.PERMISSIONS_KEY);
    CacheService.remove(CACHE_CONFIG.MENU_KEY);
  }

  /**
   * Verifica si hay caché completo válido
   */
  static hasCompleteCache(userId: string): boolean {
    return (
      CacheService.has(CACHE_CONFIG.ROLES_KEY, userId) &&
      CacheService.has(CACHE_CONFIG.PERMISSIONS_KEY, userId) &&
      CacheService.has(CACHE_CONFIG.MENU_KEY, userId)
    );
  }

  /**
   * Obtiene estadísticas del caché
   */
  static getCacheStats(userId: string): {
    hasRoles: boolean;
    hasPermissions: boolean;
    hasMenus: boolean;
    rolesRemainingTTL: number;
    permissionsRemainingTTL: number;
    menusRemainingTTL: number;
  } {
    return {
      hasRoles: CacheService.has(CACHE_CONFIG.ROLES_KEY, userId),
      hasPermissions: CacheService.has(CACHE_CONFIG.PERMISSIONS_KEY, userId),
      hasMenus: CacheService.has(CACHE_CONFIG.MENU_KEY, userId),
      rolesRemainingTTL: CacheService.getRemainingTTL(CACHE_CONFIG.ROLES_KEY, userId),
      permissionsRemainingTTL: CacheService.getRemainingTTL(CACHE_CONFIG.PERMISSIONS_KEY, userId),
      menusRemainingTTL: CacheService.getRemainingTTL(CACHE_CONFIG.MENU_KEY, userId),
    };
  }
}
