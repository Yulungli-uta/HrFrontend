// components/auth/HomeRedirect.tsx
// Redirige UNA sola vez por sesión a la página de inicio elegida por el usuario.
// - Solo actúa cuando la sesión aterrizó en "/" (bandera 'pending' que escribe UserPreferencesProvider).
// - No participa en el login ni en Microsoft Entra ID: se ejecuta cuando la sesión ya está autenticada.
// - Si las preferencias no cargan en 2 s, la ruta ya no existe o el usuario perdió el acceso → muestra "/".
import { useEffect, useState, type ReactNode } from "react";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth";
import {
  DEFAULT_HOME_PATH,
  clearReturnTo,
  peekReturnTo,
  readHomeFlag,
  readHomeRedirect,
  resolveHomePath,
  shouldReapplyHomeRedirect,
  useUserPreferences,
  writeHomeFlag,
  writeHomeRedirect,
  type HomeRouteInfo,
} from "@/features/preferences";

const MAX_WAIT_MS = 2000;

interface HomeRedirectProps {
  /** Rutas de la aplicación (para validar que la guardada existe y es accesible). */
  routes: HomeRouteInfo[];
  /** Contenido normal de "/" (autoservicio). */
  children: ReactNode;
}

export default function HomeRedirect({ routes, children }: HomeRedirectProps) {
  const { user } = useAuth();
  const { preferences, isReady } = useUserPreferences();
  const [timedOut, setTimedOut] = useState(false);
  const [pending] = useState(() => readHomeFlag() === "pending");
  // Enlace directo pedido antes de iniciar sesión: tiene prioridad sobre la página de inicio configurada.
  // Se lee sin borrar aquí (StrictMode ejecuta dos veces los inicializadores) y se borra al decidir.
  const [returnTo] = useState(() => (readHomeFlag() === "pending" ? peekReturnTo() : null));
  // Redirección reciente (p. ej. AuthContext navegó a "/" 300 ms después): se repite hacia el mismo destino.
  const [reapplyTarget] = useState(() => {
    if (readHomeFlag() === "pending") return null;
    const record = readHomeRedirect();
    return shouldReapplyHomeRedirect(record, Date.now()) ? record.target : null;
  });

  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => clearTimeout(t);
  }, [pending]);

  const decided = pending && (!!returnTo || isReady || timedOut);

  useEffect(() => {
    if (decided) {
      writeHomeFlag("done");
      clearReturnTo();
    }
  }, [decided]);

  if (!pending) {
    return reapplyTarget ? <Redirect to={reapplyTarget} replace /> : <>{children}</>;
  }

  if (!decided) {
    return (
      <div className="min-h-[400px] flex items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Cargando…</span>
      </div>
    );
  }

  const target = returnTo ?? (isReady ? resolveHomePath(preferences.homePath, user ?? null, routes) : DEFAULT_HOME_PATH);
  if (target !== DEFAULT_HOME_PATH) {
    writeHomeRedirect(target);
    return <Redirect to={target} replace />;
  }
  return <>{children}</>;
}
