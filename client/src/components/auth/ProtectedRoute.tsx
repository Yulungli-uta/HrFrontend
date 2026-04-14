// components/auth/ProtectedRoute.tsx
/**
 * Componente de protección de rutas
 * 
 * Características:
 * - Validación de autenticación
 * - Validación de permisos por ruta
 * - Validación de permisos por rol
 * - Redirección automática
 * - Mensajes de no autorizado
 * - Loading states
 */

import { ReactNode } from 'react';
import { useAuth } from '@/features/auth';
import { PermissionService } from '@/services/permissions';
import { Redirect } from 'wouter';
import { Shield, Lock, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPath?: string;          // Ruta requerida (ej: "/admin/users")
  requiredRoles?: string[];       // Roles requeridos (ej: ["Admin", "Manager"])
  requireAllRoles?: boolean;      // Si true, requiere TODOS los roles; si false, requiere AL MENOS UNO
  fallbackPath?: string;          // Ruta de redirección (default: "/")
  showUnauthorized?: boolean;     // Mostrar mensaje de no autorizado (default: true)
}

/**
 * Normaliza rutas para comparar:
 * - pasa a minúsculas
 * - elimina querystring y hash
 * - quita slash final (excepto "/")
 */
function normalizePath(path: string): string {
  if (!path) return '/';
  let p = path.toLowerCase().split(/[?#]/)[0].trim();
  if (p !== '/' && p.endsWith('/')) {
    p = p.slice(0, -1);
  }
  if (!p.startsWith('/')) {
    p = '/' + p;
  }
  return p || '/';
}

/**
 * Verifica acceso a una ruta usando SOLO user.permissions
 */
function hasRouteAccessFromPermissions(
  user: any,
  requiredPath: string
): boolean {
  const perms: string[] = (user?.permissions || []).filter(Boolean);

  const normalizedRequired = normalizePath(requiredPath);
  const normalizedPerms = perms.map(normalizePath);

  // console.group('🔎 [ProtectedRoute] Chequeo de permisos por ruta');
  // console.log('Ruta requerida (raw):', requiredPath);
  // console.log('Ruta requerida (normalizada):', normalizedRequired);
  // console.log('Permisos del usuario (raw):', perms);
  // console.log('Permisos del usuario (normalizados):', normalizedPerms);
  // console.groupEnd();

  // Coincidencia exacta
  // if (normalizedPerms.includes(normalizedRequired)) {
  //   console.log('✅ [ProtectedRoute] Coincidencia EXACTA encontrada en permisos');
  //   return true;
  // }

  // (Opcional) si quieres permitir acceso a subrutas cuando el permiso es padre:
  // Ej: permiso "/admin" y ruta "/admin/users"
  const hasParentPermission = normalizedPerms.some(p =>
    p !== '/' && normalizedRequired.startsWith(p + '/')
  );

  if (hasParentPermission) {
    // console.log('✅ [ProtectedRoute] Coincidencia por PERMISO PADRE encontrada');
    return true;
  }

  // console.warn('❌ [ProtectedRoute] Ningún permiso coincide con la ruta requerida');
  return false;
}

/**
 * Componente de ruta protegida
 */
export function ProtectedRoute({
  children,
  requiredPath,
  requiredRoles,
  requireAllRoles = false,
  fallbackPath = '/',
  showUnauthorized = true,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Mientras carga, mostrar loading
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  // Si no está autenticado, redirigir a login
  if (!isAuthenticated || !user) {
    return <Redirect to="/login" />;
  }
  
  // Verificar permisos por ruta
  if (requiredPath) {
    // console.log(`🔐 [ProtectedRoute] Verificando acceso a la ruta: ${requiredPath}`);

    // Validar que el usuario tenga permisos cargados
    if (!user?.permissions || user.permissions.length === 0) {
      // console.warn('⚠️ Usuario sin permisos cargados, denegando acceso (lista vacía)');
      if (showUnauthorized) {
        return <UnauthorizedPage reason="route" requiredPath={requiredPath} noPermissions />;
      }
      return <Redirect to={fallbackPath} />;
    }

    // 1️⃣ Resultado del PermissionService (para debug)
    let serviceResult = false;
    try {
      serviceResult = PermissionService.hasRouteAccess(user, requiredPath);
    } catch (e) {
      // console.error('❌ Error en PermissionService.hasRouteAccess:', e);
    }

    // 2️⃣ Resultado con nuestro chequeo local usando user.permissions
    const localResult = hasRouteAccessFromPermissions(user, requiredPath);

    // console.group('📊 [ProtectedRoute] Resultado de chequeos de ruta');
    // console.log('requiredPath:', requiredPath);
    // console.log('PermissionService.hasRouteAccess:', serviceResult);
    // console.log('Local hasRouteAccessFromPermissions:', localResult);
    // console.groupEnd();

    const finalResult = serviceResult || localResult;

    if (!finalResult) {
      // console.warn(`⚠️ Acceso denegado a ${requiredPath}`);
      if (import.meta.env.DEV) {
        console.log('Permisos del usuario (raw):', user.permissions);
        console.log('Ruta requerida:', requiredPath);
      }
      if (showUnauthorized) {
      }
      return <Redirect to={fallbackPath} />;
    }

    // Log de acceso exitoso (solo en desarrollo)
    // if (import.meta.env.DEV) {
    //   console.log(`✅ Acceso permitido a ${requiredPath}`);
    // }
  }
  
  // Verificar permisos por rol
  if (requiredRoles && requiredRoles.length > 0) {
    console.log(`🔐 [ProtectedRoute] Verificando roles requeridos: ${requiredRoles.join(', ')}`);

    const hasPermission = requireAllRoles
      ? PermissionService.hasAllRoles(user, requiredRoles)
      : PermissionService.hasAnyRole(user, requiredRoles);
    
    if (!hasPermission) {
      // console.warn(`⚠️ Acceso denegado por roles. Requeridos: ${requiredRoles.join(', ')}`);
      if (import.meta.env.DEV) {
        console.log('Roles del usuario:', user?.roles);
        console.log('Roles requeridos:', requiredRoles);
      }
      if (showUnauthorized) {
        return <UnauthorizedPage reason="role" requiredRoles={requiredRoles} />;
      }
      return <Redirect to={fallbackPath} />;
    }
  }
  
  // Si pasa todas las validaciones, renderizar el componente
  return <>{children}</>;
}

/**
 * Pantalla de carga
 */
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-muted-foreground dark:text-muted-foreground">Verificando permisos...</p>
      </div>
    </div>
  );
}

/**
 * Página de no autorizado
 */
interface UnauthorizedPageProps {
  reason?: 'route' | 'role';
  requiredPath?: string;
  requiredRoles?: string[];
  noPermissions?: boolean;
}

function UnauthorizedPage({ reason, requiredPath, requiredRoles, noPermissions }: UnauthorizedPageProps) {
  const getMessage = () => {
    if (noPermissions) {
      return 'No tienes permisos asignados en el sistema. Contacta con el administrador para que te asigne los permisos necesarios.';
    }
    if (reason === 'route' && requiredPath) {
      return `No tienes permiso para acceder a la ruta: ${requiredPath}`;
    }
    if (reason === 'role' && requiredRoles) {
      return `Esta página requiere uno de los siguientes roles: ${requiredRoles.join(', ')}`;
    }
    return 'No tienes permisos para acceder a esta página.';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full bg-card dark:bg-card rounded-lg shadow-xl p-8 text-center">
        {/* Icono */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-destructive opacity-20 rounded-full blur-xl"></div>
            <div className="relative bg-destructive/15 p-6 rounded-full">
              <Lock className="w-16 h-16 text-destructive dark:text-destructive/80" />
            </div>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-foreground dark:text-white mb-3">
          Acceso Denegado
        </h1>

        {/* Mensaje */}
        <p className="text-muted-foreground dark:text-muted-foreground mb-6 leading-relaxed">
          {getMessage()}
        </p>

        {/* Información adicional */}
        <div className="bg-warning/10 dark:bg-yellow-900/20 border border-warning/30 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-warning dark:text-warning/80 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-warning dark:text-yellow-200 text-left">
              Si crees que deberías tener acceso a esta página, contacta con el administrador del sistema.
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver Atrás
          </Button>
          
          <Button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Ir al Inicio
          </Button>
        </div>

        {/* Debug info (solo en desarrollo) */}
        {import.meta.env.DEV && (
          <div className="mt-6 pt-6 border-t border-border dark:border-gray-700">
            <details className="text-left">
              <summary className="text-sm text-muted-foreground dark:text-muted-foreground/70 cursor-pointer hover:text-foreground dark:hover:text-muted-foreground">
                Debug Info (solo en desarrollo)
              </summary>
              <div className="mt-2 text-xs font-mono bg-muted dark:bg-background p-3 rounded">
                <div><strong>Reason:</strong> {reason}</div>
                {requiredPath && <div><strong>Required Path:</strong> {requiredPath}</div>}
                {requiredRoles && <div><strong>Required Roles:</strong> {requiredRoles.join(', ')}</div>}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Componente para proteger secciones dentro de una página
 */
interface ProtectedSectionProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermission?: string;
  fallback?: ReactNode;
}

export function ProtectedSection({
  children,
  requiredRoles,
  requiredPermission,
  fallback = null,
}: ProtectedSectionProps) {
  const { user } = useAuth();

  // Verificar roles
  if (requiredRoles && !PermissionService.hasAnyRole(user, requiredRoles)) {
    return <>{fallback}</>;
  }

  // Verificar permiso específico
  if (requiredPermission && !PermissionService.hasPermission(user, requiredPermission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
