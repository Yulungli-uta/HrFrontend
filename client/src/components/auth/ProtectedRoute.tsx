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
import { useAuth } from '@/contexts/AuthContext';
import { PermissionService } from '@/services/permissions';
import { Redirect } from 'wouter';
import { Shield, Lock, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPath?: string;          // Ruta requerida (ej: "/admin/users")
  requiredRoles?: string[];        // Roles requeridos (ej: ["Admin", "Manager"])
  requireAllRoles?: boolean;       // Si true, requiere TODOS los roles; si false, requiere AL MENOS UNO
  fallbackPath?: string;           // Ruta de redirección (default: "/")
  showUnauthorized?: boolean;      // Mostrar mensaje de no autorizado (default: true)
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
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }
  
  // Verificar permisos por ruta
  if (requiredPath) {
    // Validar que el usuario tenga permisos cargados
    if (!user?.permissions || user.permissions.length === 0) {
      console.warn('⚠️ Usuario sin permisos cargados, denegando acceso');
      if (showUnauthorized) {
        return <UnauthorizedPage reason="route" requiredPath={requiredPath} noPermissions />;
      }
      return <Redirect to={fallbackPath} />;
    }

    // Validar acceso a la ruta
    if (!PermissionService.hasRouteAccess(user, requiredPath)) {
      console.warn(`⚠️ Acceso denegado a ${requiredPath}`);
      if (import.meta.env.DEV) {
        console.log('Permisos del usuario:', user.permissions);
        console.log('Ruta requerida:', requiredPath);
      }
      if (showUnauthorized) {
        return <UnauthorizedPage reason="route" requiredPath={requiredPath} />;
      }
      return <Redirect to={fallbackPath} />;
    }

    // Log de acceso exitoso (solo en desarrollo)
    if (import.meta.env.DEV) {
      console.log(`✅ Acceso permitido a ${requiredPath}`);
    }
  }
  
  // Verificar permisos por rol
  if (requiredRoles && requiredRoles.length > 0) {
    const hasPermission = requireAllRoles
      ? PermissionService.hasAllRoles(user, requiredRoles)
      : PermissionService.hasAnyRole(user, requiredRoles);
    
    if (!hasPermission) {
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
        <p className="text-gray-600 dark:text-gray-300">Verificando permisos...</p>
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
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        {/* Icono */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 opacity-20 rounded-full blur-xl"></div>
            <div className="relative bg-red-100 dark:bg-red-900/30 p-6 rounded-full">
              <Lock className="w-16 h-16 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Acceso Denegado
        </h1>

        {/* Mensaje */}
        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          {getMessage()}
        </p>

        {/* Información adicional */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200 text-left">
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
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <details className="text-left">
              <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                Debug Info (solo en desarrollo)
              </summary>
              <div className="mt-2 text-xs font-mono bg-gray-100 dark:bg-gray-900 p-3 rounded">
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
