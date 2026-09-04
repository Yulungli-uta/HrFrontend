import { Suspense } from "react";
import { Switch, Route, Redirect, useRoute } from "wouter";
import { useAuth } from "@/features/auth";
import { Loader2 } from "lucide-react";
import ExternalSignPage from "@/pages/electronicSignature/ExternalSignPage";
import AzureLoginRelay from "@/pages/AzureLoginRelay";

// Componentes del layout y autorizaciones
import Layout from "@/components/Layout";
import LoginPage from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DocflowServiceProvider } from "@/services/docflow/docflow-service-context";
import { DirectoryServiceProvider } from "@/services/docflow/directory-service-context";

// Rutas configuradas
import { routes } from "./routes.config";

// Fallbacks de carga
function LoadingFallback() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
        <p className="text-gray-600 dark:text-gray-400 text-sm">Cargando...</p>
      </div>
    </div>
  );
}

function InitialLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300">
          Cargando aplicación...
        </p>
      </div>
    </div>
  );
}

export default function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  // Pagina publica de firmante externo: autorizacion por token en la URL, no por
  // sesion. Debe resolverse ANTES del gate de auth de mas abajo (que redirige todo
  // lo no autenticado a /login), sin pasar por Layout/ProtectedRoute.
  const [isExternalSign] = useRoute("/firma-externa/:participantId");
  // Pagina de relevo del popup de login AzureAD (backend Python): sin sesion,
  // debe resolverse ANTES del gate de auth por la misma razon que /firma-externa.
  const [isAzureLoginRelay] = useRoute("/auth/azure/relay");

  if (isExternalSign) {
    return <ExternalSignPage />;
  }

  if (isAzureLoginRelay) {
    return <AzureLoginRelay />;
  }

  // Mientras AuthContext está comprobando sesión → pantalla de carga inicial
  if (isLoading) {
    return <InitialLoadingScreen />;
  }

  // No autenticado → solo /login; todo lo demás redirige a /login
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<InitialLoadingScreen />}>
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route path="*">
            {() => <Redirect to="/login" />}
          </Route>
        </Switch>
      </Suspense>
    );
  }

  // Autenticado → app completa dentro de Layout
  return (
    <Layout>
      <Suspense fallback={<LoadingFallback />}>
        <Switch>
          {/* Mapeo dinámico de rutas configuradas */}
          {routes.map((route) => {
            const Component = route.component;
            return (
              <Route key={route.path} path={route.path}>
                {(params) => {
                  let content = <Component {...params} />;

                  // Aplicar protección de acceso (ProtectedRoute) si aplica
                  if (route.requiredPath || route.requiredRoles) {
                    content = (
                      <ProtectedRoute
                        requiredPath={route.requiredPath}
                        requiredRoles={route.requiredRoles}
                      >
                        {content}
                      </ProtectedRoute>
                    );
                  }

                  // Aplicar proveedores de servicios de DocFlow si aplica
                  if (route.isDocFlow) {
                    content = (
                      <DocflowServiceProvider>
                        <DirectoryServiceProvider>
                          {content}
                        </DirectoryServiceProvider>
                      </DocflowServiceProvider>
                    );
                  }

                  return content;
                }}
              </Route>
            );
          })}

          {/* Evitar volver al login si ya está autenticado */}
          <Route path="/login">
            {() => <Redirect to="/" />}
          </Route>

          {/* ===== 404 (siempre al final) ===== */}
          <Route path="*" component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}
