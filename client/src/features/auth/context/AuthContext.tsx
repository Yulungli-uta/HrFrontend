/**
 * features/src/features/auth/context/AuthContext.tsx
 *
 * Fuente oficial de verdad para el estado de autenticación de la aplicación.
 *
 * Responsabilidades (SRP):
 *  - Gestionar el ciclo de vida de la sesión (login, logout, refresh)
 *  - Detectar inactividad y cerrar sesión automáticamente
 *  - Exponer el hook useAuth como único punto de acceso al estado de auth
 *
 * OCP: agregar nuevos métodos al contexto no requiere modificar los consumidores.
 * DIP: depende de interfaces (authService, tokenService) no de implementaciones concretas.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { authService } from "../services/authService";
import { tokenService } from "../services/tokenService";
import { UserSession } from "../types/authTypes";
import {
  LS_LAST_ACTIVITY,
  LS_EMPLOYEE_DETAILS,
  INACTIVITY_TIMEOUT,
  INACTIVITY_CHECK_INTERVAL_MS,
  REFRESH_MARGIN_MS,
  ACTIVITY_EVENTS,
  AZURE_LOGIN_BROADCAST_CHANNEL,
} from "../constants/sessionConstants";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { VistaDetallesEmpleadosAPI } from "@/lib/api";
import {
  useNotificationWebSocket,
  WebSocketMessage,
} from "@/hooks/useNotificationWebSocket";
import { PermissionService, CacheService, PermissionLoadError } from "@/services/permissions";
import type { PermissionLoadReason } from "@/services/permissions";
import {
  SESSION_RESET_REASON,
  buildRecoveryCode,
  canForceRelogin,
  clearReloginNotice,
  markForcedRelogin,
  saveReturnTo,
  setReloginNotice,
} from "../services/sessionRecovery";
import { parseApiError } from "@/lib/error-handling";
import { registerForceLogoutCallback } from "@/lib/api/core/fetch";
import { queryClient } from "@/lib/queryClient";
import { logger } from "@/lib/logger";
import { generateCodeVerifier, computeCodeChallenge } from "../services/pkce";
import {
  AzureExchangeError,
  describeAzureLoginFailure,
  newAttemptReference,
  toAzureLoginFailureCode,
  type AzureLoginFailureCode,
  type AzureLoginFailureInfo,
} from "../services/azureLoginMessages";
import { clearAzureAttempt, loadAzureAttempt, saveAzureAttempt } from "../services/azureLoginAttempt";
import { openAzureLoginChannel } from "../services/azureLoginChannel";

const logAuth = (...args: unknown[]) => logger.auth.debug(String(args[0] ?? ""), ...args.slice(1));

/**
 * Throttle de la escritura de "última actividad" a localStorage: los eventos de
 * actividad (mousemove, scroll) disparan decenas de veces por segundo y escribir
 * en cada uno degrada el rendimiento sin aportar precisión útil.
 */
const ACTIVITY_WRITE_THROTTLE_MS = 15_000;

const APP_CLIENT_ID = import.meta.env.VITE_APP_CLIENT_ID;

/** Espera máxima de la confirmación de Microsoft; el usuario además puede cancelar en cualquier momento. */
const AZURE_LOGIN_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Momentos (desde que se abre el popup) en que la pestaña reclama su login pendiente al servidor por si el
 * aviso de entrega se perdió. Escalonados para no saturar el límite de uso del endpoint.
 */
const AZURE_CLAIM_DELAYS_MS = [4_000, 10_000, 25_000, 45_000, 70_000, 100_000];

/** Margen tras volver a la pestaña antes de dar por perdido el aviso (el usuario puede seguir verificando). */
const AZURE_RETURN_GRACE_MS = 12_000;

/** Una entrega del resultado del login: por SignalR, por BroadcastChannel o por reclamo al servidor. */
interface AzureDelivery {
  /** Identifica la entrega para no procesarla dos veces (el mismo código puede llegar por dos canales). */
  key: string;
  source: "websocket" | "broadcast" | "claim";
  deliveryCode?: string;
  pair?: { accessToken: string; refreshToken: string };
  /** Datos de usuario que trae el aviso de SignalR; sin ellos se consulta /api/auth/me. */
  wsData?: Record<string, unknown>;
}

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface EmployeeDetails {
  employeeID: number;
  firstName: string;
  lastName: string;
  idCard: string;
  email: string;
  personnelEmail: string;
  employeeType: number;
  department: string;
  scheduleID: number;
  faculty: string;
  baseSalary: number;
  hireDate: string;
  fullName: string;
  hasActiveSalary: boolean;
  personId?: number;
}

/** Fase del login con Office 365: esperando la ventana de Microsoft, completando la sesión, o ninguno en curso. */
export type AzureLoginPhase = "idle" | "waiting" | "completing";

export interface AuthContextType {
  isAuthenticated: boolean;
  user: UserSession | null;
  employeeDetails: EmployeeDetails | null;
  isLoading: boolean;
  isWebSocketConnected: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithOffice365: () => Promise<void>;
  /** Fase del login con Office 365 en curso (la pantalla de login se mantiene visible mientras tanto). */
  azureLoginPhase: AzureLoginPhase;
  /** Cancela la espera de Office 365: cierra la ventana emergente y permite intentar de nuevo. */
  cancelOffice365Login: () => void;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

// ─── Carga de permisos con reintento ───────────────────────────────────────────

const PERMISSION_RETRY_DELAY_MS = 1000;

/** Un reintento silencioso: cubre cortes de red breves antes de pedirle algo al usuario. */
async function loadPermissionsWithRetry(userId: string) {
  try {
    return await PermissionService.fetchAllPermissions(userId);
  } catch (firstError) {
    logger.auth.warn("[AUTH] Primer intento de cargar permisos falló, reintentando", firstError);
    await new Promise((resolve) => setTimeout(resolve, PERMISSION_RETRY_DELAY_MS));
    return PermissionService.fetchAllPermissions(userId);
  }
}

/**
 * Una sesión guardada sin permisos ni menús (y sin la marca de "cargado") es una sesión
 * incompleta: hay que volver a cargarla. Una sesión con datos se respeta aunque no tenga la marca.
 */
const needsPermissionReload = (session: UserSession): boolean =>
  session.permissionsLoaded !== true &&
  (!session.permissions?.length || !(session as { menuItems?: unknown[] }).menuItems?.length);

// ─── Contexto ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Utilidades internas ───────────────────────────────────────────────────────

const equalEmployeeDetails = (
  a: EmployeeDetails | null,
  b: EmployeeDetails | null
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.employeeID === b.employeeID &&
    a.email === b.email &&
    a.personnelEmail === b.personnelEmail &&
    a.firstName === b.firstName &&
    a.lastName === b.lastName &&
    a.department === b.department &&
    a.scheduleID === b.scheduleID &&
    a.faculty === b.faculty &&
    a.hasActiveSalary === b.hasActiveSalary &&
    a.personId === b.personId
  );
};

// ─── Provider ──────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [employeeDetails, setEmployeeDetails] =
    useState<EmployeeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // La espera del login con Office 365 NO usa isLoading: ese estado reemplaza toda la pantalla por una
  // carga genérica y el usuario no sabe si debe hacer algo en la ventana de Microsoft.
  const [azureLoginPhase, setAzureLoginPhase] = useState<AzureLoginPhase>("idle");

  // Última actividad como ref (NO state): los eventos de actividad disparan en cada
  // mousemove/scroll y un setState aquí re-renderizaría toda la app continuamente.
  const lastActivityRef = useRef(Date.now());
  const lastActivityWriteRef = useRef(0);

  const { toast } = useToast();
  const [, setLocation] = useLocation();
  // Los avisos de login se consumen por onMessage (uno por uno); lastMessage solo conserva el último.
  const wsMessageHandlerRef = useRef<(msg: WebSocketMessage) => void>(() => { });
  const wsConnectedHandlerRef = useRef<() => void>(() => { });
  const { isConnected, lastMessage, ensureConnected } = useNotificationWebSocket(APP_CLIENT_ID, {
    onMessage: (msg) => wsMessageHandlerRef.current(msg),
    onConnected: () => wsConnectedHandlerRef.current(),
  });
  const ensureConnectedRef = useRef(ensureConnected);
  ensureConnectedRef.current = ensureConnected;
  const isAuthenticatedRef = useRef(false);
  isAuthenticatedRef.current = isAuthenticated;

  // Refs para evitar closures obsoletos en callbacks asíncronos
  const logoutRef = useRef<() => void>(() => { });
  const doLoginStateRef = useRef<
    (u: UserSession, showToast?: boolean) => Promise<void>
  >(async () => { });
  const fetchEmployeeDetailsRef = useRef<(email: string) => Promise<void>>(
    async () => { }
  );

  // Motivo del próximo logout (flujo de recuperación). logout() sigue sin parámetros porque
  // varios componentes lo usan directo como manejador de eventos.
  const logoutReasonRef = useRef<string | null>(null);

  const processedLoginEventsRef = useRef<Set<string>>(new Set());
  const isProcessingLoginRef = useRef(false);

  // PKCE (login Office 365): el codeVerifier se genera al abrir el popup y se consume al canjear el
  // deliveryCode. Vive en memoria y, mientras dura el intento, en sessionStorage de ESTA pestaña
  // (azureLoginAttempt.ts) para poder reclamar el login si el navegador la recarga.
  const azureCodeVerifierRef = useRef<string | null>(null);
  // Referencia corta del intento en curso (para citarla a soporte) y entregas encoladas mientras otra se canjea.
  const azureAttemptRef = useRef<{ reference: string } | null>(null);
  const azureQueuedDeliveriesRef = useRef<AzureDelivery[]>([]);
  const azureClaimInFlightRef = useRef(false);
  const azureClaimTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const azureFocusGraceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const azureReturnHandlerRef = useRef<(() => void) | null>(null);
  const failAzureLoginRef = useRef<(code: AzureLoginFailureCode, reference?: string) => void>(
    () => { }
  );
  const tryClaimAzureDeliveryRef = useRef<(reason: string) => Promise<boolean>>(
    async () => false
  );
  const processAzureDeliveryRef = useRef<(delivery: AzureDelivery) => Promise<void>>(
    async () => { }
  );

  // Seguimiento del intento de login Office 365 en curso: antes el loading se apagaba
  // apenas se abría el popup (no reflejaba la espera real de la MFA), y si el popup
  // fallaba o se cerraba sin completar, el usuario se quedaba en la pantalla de login
  // sin ningún aviso — parecía que "no había pasado nada" (bug reportado: MFA completo
  // en Azure pero sin acceso a la app).
  const azurePopupRef = useRef<Window | null>(null);
  const azureLoginTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // NO se puede sondear popup.closed: una vez que el popup navega a un origen con
  // Cross-Origin-Opener-Policy estricto (login.microsoftonline.com lo tiene), el navegador
  // bloquea leer esa propiedad desde la ventana que lo abrió — y el aislamiento queda
  // permanente para esa ventana aunque después vuelva a nuestro propio dominio. En su lugar
  // se usa que ESTA pestaña recupere el foco (focus / visibilitychange) como señal de que el
  // usuario volvió; ver armAzureLoginWatchers.
  const azureLoginSettledRef = useRef(true); // true = no hay login de Azure en curso

  // ─── Persistencia de detalles del empleado ────────────────────────────────

  const persistEmployeeDetails = useCallback(
    (details: EmployeeDetails) => {
      setEmployeeDetails((prev) =>
        equalEmployeeDetails(prev, details) ? prev : details
      );
      try {
        localStorage.setItem(LS_EMPLOYEE_DETAILS, JSON.stringify(details));
      } catch {
        /* ignore */
      }
    },
    []
  );

  const fetchEmployeeDetails = useCallback(
    async (email: string) => {
      try {
        const response = await VistaDetallesEmpleadosAPI.byEmail(email);
        if (response.status === "success" && response.data) {
          const empDetails = { ...response.data };
          // vw_EmployeeDetails ya trae PersonID (Database/hr/04_views.sql) — ya no hace
          // falta una segunda llamada a EmpleadosAPI.get solo para resolver este valor.
          const rawId = (response.data as any).personID ?? (response.data as any).personId;
          empDetails.personId = rawId != null ? Number(rawId) : undefined;
          if (empDetails.personId == null) {
            // No debería ocurrir con la vista actualizada; se deja el log porque sin él
            // era imposible saber por qué /perfil se quedaba cargando indefinidamente
            // (personId nunca se llenaba y PersonDetail.tsx no reintentaba).
            logger.auth.error(
              "fetchEmployeeDetails: vw_EmployeeDetails no trajo PersonID",
              { employeeID: empDetails.employeeID, data: response.data }
            );
          }
          persistEmployeeDetails(empDetails);
          logAuth("FETCH EMPLOYEE DETAILS OK", { email });
        } else {
          logger.auth.error(
            "Error al obtener detalles del empleado:",
            response.status === "error" ? response.error : "Sin datos"
          );
        }
      } catch (error) {
        logger.auth.error("Error en fetchEmployeeDetails:", error);
      }
    },
    [persistEmployeeDetails]
  );
  fetchEmployeeDetailsRef.current = fetchEmployeeDetails;

  // ─── Recuperación cuando no se pueden cargar los permisos ─────────────────

  const recoverFromPermissionFailure = useCallback(
    (userInfo: UserSession, reason: PermissionLoadReason) => {
      const code = buildRecoveryCode(reason);

      if (canForceRelogin()) {
        // Primera vez: se cierra la sesión (el servidor registra el motivo) y se pide volver a entrar.
        markForcedRelogin();
        saveReturnTo(`${window.location.pathname}${window.location.search}`);
        setReloginNotice({ code });
        logoutReasonRef.current = SESSION_RESET_REASON;
        logoutRef.current();
        return;
      }

      // Freno anti-ciclo: ya se cerró la sesión hace poco. Se deja al usuario dentro, sin guardar
      // nada en el navegador, y ProtectedRoute muestra el código para avisar a DITIC.
      logger.auth.error("[AUTH] Freno anti-ciclo: no se vuelve a cerrar la sesión automáticamente", code);
      setUser({ ...userInfo, permissionsLoaded: false, recoveryCode: code });
    },
    []
  );

  // ─── Aplicar estado de login ──────────────────────────────────────────────

  const doLoginState = useCallback(
    async (userInfo: UserSession, showToast = true) => {
      setIsAuthenticated(true);
      setUser((prev) =>
        prev?.id === userInfo.id && prev?.email === userInfo.email
          ? prev
          : userInfo
      );

      const now = Date.now();
      lastActivityRef.current = now;
      lastActivityWriteRef.current = now;
      try {
        localStorage.setItem(LS_LAST_ACTIVITY, String(now));
      } catch {
        /* ignore */
      }

      try {
        CacheService.clearAll();
        logAuth("Cargando permisos desde /api/menu/user...", {
          userId: userInfo.id,
        });
        const perms = await loadPermissionsWithRetry(userInfo.id);
        const mergedUser: UserSession = {
          ...userInfo,
          roles:
            (perms.roles && perms.roles.length > 0
              ? perms.roles
              : userInfo.roles) ?? [],
          permissions:
            (perms.permissions && perms.permissions.length > 0
              ? perms.permissions
              : userInfo.permissions) ?? [],
          menuItems:
            (perms.menuItems && perms.menuItems.length > 0
              ? perms.menuItems
              : (userInfo as any).menuItems) ?? [],
          permissionsLoaded: true,
        };
        setUser(mergedUser);
        tokenService.setUserSession(mergedUser);
        clearReloginNotice();
        logAuth("Permisos cargados", {
          roles: mergedUser.roles,
          permissions: mergedUser.permissions?.length ?? 0,
          menuItems: mergedUser.menuItems?.length ?? 0,
        });
      } catch (err) {
        const reason: PermissionLoadReason =
          err instanceof PermissionLoadError ? err.reason : "NETWORK";
        logger.auth.error("[AUTH] No se pudieron cargar los permisos/menú:", reason, err);
        recoverFromPermissionFailure(userInfo, reason);
        return;
      }

      // Detalles del empleado en background (no bloquea el login)
      fetchEmployeeDetailsRef.current(userInfo.email);

      if (showToast) {
        toast({
          title: "Inicio de sesión exitoso",
          description: `Bienvenido ${userInfo.displayName || userInfo.email || ""
            }`,
        });
      }
    },
    [toast, recoverFromPermissionFailure]
  );
  doLoginStateRef.current = doLoginState;

  // ─── Logout ───────────────────────────────────────────────────────────────

  const logout = useCallback(() => {
    // Revocación en servidor best-effort ANTES de limpiar los tokens locales
    // (se necesita el refresh token). No bloquea el logout local: si el servidor
    // no responde, la sesión local se limpia igual.
    const logoutReason = logoutReasonRef.current;
    logoutReasonRef.current = null;
    const refreshToken = tokenService.getRefreshToken();
    if (refreshToken) {
      authService.logout(refreshToken, logoutReason ?? undefined).catch((err) => {
        logger.auth.error("Error revocando sesión en servidor durante logout", err);
      });
    }

    setIsLoading(false);
    setIsAuthenticated(false);
    setUser(null);
    setEmployeeDetails(null);
    tokenService.clearTokens();

    // Limpiar estado de deduplicación para que el próximo login Azure funcione
    processedLoginEventsRef.current.clear();
    isProcessingLoginRef.current = false;
    azureQueuedDeliveriesRef.current = [];
    clearAzureAttempt();

    try {
      CacheService.clearAll();
    } catch (error) {
      logger.auth.error("Error limpiando caché de permisos", error);
    }

    // Limpiar el caché en memoria de React Query: con staleTime Infinity, los datos
    // del usuario anterior sobrevivirían al logout y podrían mostrarse a otro usuario
    // que inicie sesión en el mismo navegador.
    try {
      queryClient.clear();
    } catch (error) {
      logger.auth.error("Error limpiando caché de React Query", error);
    }

    try {
      localStorage.removeItem(LS_LAST_ACTIVITY);
      localStorage.removeItem(LS_EMPLOYEE_DETAILS);
    } catch {
      /* ignore */
    }

    if (!logoutReason) {
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
    }

    // No navegar manualmente aquí: AppRouter ya redirige incondicionalmente a
    // /login en cuanto isAuthenticated pasa a false (ver App Router, gate superior).
    // Llamar setLocation("/login") en este punto competía con la regla de AppRouter
    // que rebota /login → / para usuarios autenticados: si ese re-render corría
    // antes de que isAuthenticated terminara de propagarse, la app quedaba en "/"
    // en vez de "/login" (bug reportado: algunas páginas volvían a / al expirar la sesión).
    logAuth("LOGOUT completado");
  }, [toast]);
  logoutRef.current = logout;

  // ─── Registrar callback de logout en fetch.ts ─────────────────────────────
  // Garantiza que cuando fetch.ts detecte un 401 definitivo, el estado React
  // quede limpio antes de redirigir (evita estado sucio en la UI).
  useEffect(() => {
    registerForceLogoutCallback(() => {
      logAuth("FORCE LOGOUT desde fetch.ts (401 definitivo)");
      logoutRef.current();
    });
  }, []);

  // ─── Refresh Auth (para bootstrap de sesión desde componentes externos) ───

  const refreshAuth = useCallback(async () => {
    try {
      const accessToken = tokenService.getAccessToken();
      if (!accessToken) {
        setIsAuthenticated(false);
        setUser(null);
        logAuth("REFRESH AUTH / NO ACCESS TOKEN");
        return;
      }

      if (tokenService.isTokenExpired(accessToken)) {
        const refreshToken = tokenService.getRefreshToken();
        if (refreshToken) {
          const newTokens = await authService.refreshToken(refreshToken);
          tokenService.setTokens(newTokens);
          const userInfo = await authService.getCurrentUser(
            newTokens.accessToken
          );
          await doLoginState(userInfo, false);
          logAuth("REFRESH AUTH / TOKEN RENEWED");
        } else {
          logout();
        }
      } else {
        const userSession = tokenService.getUserSession();
        if (userSession) {
          if (needsPermissionReload(userSession)) {
            logAuth("REFRESH AUTH / sin permisos, recargando...");
            await doLoginState(userSession, false);
          } else {
            setIsAuthenticated(true);
            setUser((prev) =>
              prev?.id === userSession.id ? prev : userSession
            );
            const savedDetailsStr = (() => {
              try {
                return localStorage.getItem(LS_EMPLOYEE_DETAILS);
              } catch {
                return null;
              }
            })();
            if (savedDetailsStr) {
              const parsed = JSON.parse(savedDetailsStr) as EmployeeDetails;
              if (parsed.personId != null) {
                setEmployeeDetails((prev) =>
                  equalEmployeeDetails(prev, parsed) ? prev : parsed
                );
                logAuth("REFRESH AUTH / SESSION + CACHED DETAILS");
              } else {
                // En background (no bloquea isLoading): igual que doLoginState, ningún
                // consumidor de employeeDetails asume que está listo de inmediato.
                fetchEmployeeDetails(userSession.email);
                logAuth("REFRESH AUTH / SESSION + API DETAILS (personId missing)");
              }
            } else {
              fetchEmployeeDetails(userSession.email);
              logAuth("REFRESH AUTH / SESSION + API DETAILS");
            }
          }
        } else {
          const userInfo = await authService.getCurrentUser(accessToken);
          await doLoginState(userInfo, false);
          logAuth("REFRESH AUTH / API USERINFO");
        }
      }
    } catch (error) {
      logger.auth.error("Error refreshing auth:", error);
      logout();
    }
  }, [logout, doLoginState, fetchEmployeeDetails]);

  // ─── WebSocket: ForceLogout → expulsión de sesión por administrador ─────────

  useEffect(() => {
    if (!lastMessage || lastMessage.eventType !== "ForceLogout") return;
    logAuth("FORCE LOGOUT VIA WS — sesión revocada por administrador", { msg: lastMessage });

    toast({
      title: "Sesión cerrada por administrador",
      description: "Su sesión ha sido revocada. Por favor inicie sesión nuevamente.",
      variant: "destructive",
    });

    setTimeout(() => logoutRef.current(), 300);
  }, [lastMessage, toast]);

  // ─── Login Office 365: seguimiento del intento, entrega y reclamo ─────────
  //
  // El resultado del login llega a esta pestaña por UN aviso "de empuje" (SignalR en .NET,
  // BroadcastChannel desde /auth/azure/relay en Python). Si ese aviso no llega (celular que manda la
  // pestaña a segundo plano, conexión en tiempo real caída, pestaña recargada), el servidor ya autenticó
  // pero nadie entra. Por eso, además del aviso, la pestaña RECLAMA su login pendiente al volver al
  // primer plano, al reconectarse y por tiempo (POST /azure/claim): el código reclamado solo se canjea
  // con el codeVerifier que únicamente esta pestaña conoce (PKCE).

  const clearAzureLoginWatchers = useCallback(() => {
    if (azureLoginTimeoutRef.current) {
      clearTimeout(azureLoginTimeoutRef.current);
      azureLoginTimeoutRef.current = null;
    }
    azureClaimTimersRef.current.forEach((timer) => clearTimeout(timer));
    azureClaimTimersRef.current = [];
    if (azureFocusGraceRef.current) {
      clearTimeout(azureFocusGraceRef.current);
      azureFocusGraceRef.current = null;
    }
    if (azureReturnHandlerRef.current) {
      window.removeEventListener("focus", azureReturnHandlerRef.current);
      document.removeEventListener("visibilitychange", azureReturnHandlerRef.current);
      azureReturnHandlerRef.current = null;
    }
    azurePopupRef.current = null;
  }, []);

  // Limpieza defensiva si AuthProvider llegara a desmontarse con un login Office 365 en
  // curso (no ocurre en operación normal, pero evita temporizadores huérfanos).
  useEffect(() => clearAzureLoginWatchers, [clearAzureLoginWatchers]);

  // Cierra el intento de login Office 365 actual: éxito o fracaso. Idempotente (el guard
  // azureLoginSettledRef evita doble aviso si, por ejemplo, el tiempo máximo y el regreso de foco
  // disparan casi al mismo tiempo).
  const finishAzureLoginAttempt = useCallback(
    (success: boolean, failure?: AzureLoginFailureInfo) => {
      if (azureLoginSettledRef.current) return;
      azureLoginSettledRef.current = true;
      clearAzureLoginWatchers();
      setIsLoading(false);
      setAzureLoginPhase("idle");
      if (success) {
        clearAzureAttempt();
        return;
      }

      const info =
        failure ?? describeAzureLoginFailure("UNKNOWN", azureAttemptRef.current?.reference);
      // Si el aviso solo se retrasó (no llegó a tiempo), el intento guardado permite reclamarlo al
      // reconectar o recargar; en cualquier otro fallo el intento ya no sirve.
      if (info.code !== "NOT_DELIVERED" && info.code !== "TIMEOUT") {
        azureCodeVerifierRef.current = null;
        clearAzureAttempt();
      }
      toast({
        title: info.title,
        description: info.description,
        variant: info.neutral ? "default" : "destructive",
      });
    },
    [toast, clearAzureLoginWatchers]
  );

  const failAzureLogin = useCallback(
    (code: AzureLoginFailureCode, reference?: string) => {
      finishAzureLoginAttempt(
        false,
        describeAzureLoginFailure(code, reference ?? azureAttemptRef.current?.reference)
      );
    },
    [finishAzureLoginAttempt]
  );
  failAzureLoginRef.current = failAzureLogin;

  // Cancelación voluntaria del usuario durante la espera: sin aviso de error, solo vuelve al login.
  const cancelOffice365Login = useCallback(() => {
    if (azureLoginSettledRef.current) return;
    azureLoginSettledRef.current = true;
    const popup = azurePopupRef.current;
    clearAzureLoginWatchers();
    try {
      popup?.close();
    } catch {
      /* la ventana puede estar aislada por COOP: no se puede cerrar desde aquí */
    }
    azureCodeVerifierRef.current = null;
    azureQueuedDeliveriesRef.current = [];
    clearAzureAttempt();
    setAzureLoginPhase("idle");
  }, [clearAzureLoginWatchers]);

  // ─── Reclamo del login pendiente ──────────────────────────────────────────

  /** Pregunta al servidor si hay un login pendiente de ESTA pestaña. true = encontró uno y lo está procesando. */
  const tryClaimAzureDelivery = useCallback(async (reason: string): Promise<boolean> => {
    if (azureClaimInFlightRef.current || isAuthenticatedRef.current) return false;
    const verifier = azureCodeVerifierRef.current ?? loadAzureAttempt()?.codeVerifier ?? null;
    if (!verifier) return false;

    azureClaimInFlightRef.current = true;
    try {
      const challenge = await computeCodeChallenge(verifier);
      const deliveryCode = await authService.claimAzureDelivery(challenge);
      if (!deliveryCode) return false;

      const key = `code:${deliveryCode}`;
      if (processedLoginEventsRef.current.has(key)) return false;

      logAuth("CLAIM: login pendiente recuperado", { reason });
      void processAzureDeliveryRef.current({ key, source: "claim", deliveryCode });
      return true;
    } catch (e) {
      logger.auth.error("Error reclamando el login pendiente:", e);
      return false;
    } finally {
      azureClaimInFlightRef.current = false;
    }
  }, []);
  tryClaimAzureDeliveryRef.current = tryClaimAzureDelivery;

  // ─── Procesar una entrega (WebSocket, BroadcastChannel o reclamo) ─────────

  const processAzureDelivery = useCallback(
    async (delivery: AzureDelivery): Promise<void> => {
      if (processedLoginEventsRef.current.has(delivery.key)) return;
      if (isProcessingLoginRef.current) {
        // Hay otro canje en curso: se encola en vez de descartar (lo descartado nunca se reintenta).
        azureQueuedDeliveriesRef.current.push(delivery);
        return;
      }

      processedLoginEventsRef.current.add(delivery.key);
      isProcessingLoginRef.current = true;
      if (!azureLoginSettledRef.current) setAzureLoginPhase("completing");
      logAuth("AZURE DELIVERY", { source: delivery.source });

      let succeeded = false;
      let tokensStored = false;
      try {
        let pair = delivery.pair;

        // PKCE (RFC 7636): el servidor entrega un deliveryCode en vez del par de tokens real. Se canjea
        // con el codeVerifier que nunca salió de esta pestaña (en memoria o, si la pestaña se recargó
        // durante el login, el guardado en sessionStorage).
        if (delivery.deliveryCode) {
          const verifier =
            azureCodeVerifierRef.current ?? loadAzureAttempt()?.codeVerifier ?? null;
          if (!verifier) throw new AzureExchangeError("LOST_STATE");
          pair = await authService.exchangeAzureDeliveryCode(delivery.deliveryCode, verifier);
        }
        if (!pair) throw new AzureExchangeError("EXCHANGE_INVALID");

        tokenService.setTokens(pair);
        tokensStored = true;

        let session: UserSession;
        if (delivery.wsData) {
          const data = delivery.wsData as Record<string, any>;
          const adGroups = tokenService.extractAdGroups(pair.accessToken);
          if (adGroups.length === 0) logAuth("[AUTH-AD] No hay grupos AD en el JWT de notificación");
          session = {
            id: data.userId,
            email: data.email,
            personnelEmail: data.personnelEmail,
            username: data.username ?? data.email ?? "",
            fullName: data.fullName ?? data.displayName ?? "",
            displayName: data.displayName,
            userType: "AzureAD",
            roles: data.roles ?? [],
            adGroups,
          };
        } else {
          // Sin datos de usuario en el aviso (BroadcastChannel/reclamo): se resuelve vía /api/auth/me,
          // igual que el login local y refreshAuth. getCurrentUser ya incluye los grupos AD del JWT.
          session = await authService.getCurrentUser(pair.accessToken);
        }

        await doLoginStateRef.current(session, true);
        azureCodeVerifierRef.current = null;
        clearAzureAttempt();
        finishAzureLoginAttempt(true);
        setTimeout(() => setLocation("/"), 300);
        succeeded = true;
        logAuth("LOGIN OFFICE 365 COMPLETADO", { source: delivery.source });
      } catch (e) {
        logger.auth.error("Azure delivery handling error:", e);
        if (tokensStored) tokenService.clearTokens();

        const code: AzureLoginFailureCode = e instanceof AzureExchangeError ? e.kind : "UNKNOWN";
        if (azureQueuedDeliveriesRef.current.length === 0) {
          // Un código ajeno o vencido (p. ej. de un intento anterior) no debe ocultar el vigente: antes de
          // rendirse se reclama una vez más.
          const recovered =
            code === "EXCHANGE_INVALID" && delivery.source !== "claim"
              ? await tryClaimAzureDeliveryRef.current("exchange-invalid")
              : false;
          if (!recovered) failAzureLogin(code);
        }
      } finally {
        isProcessingLoginRef.current = false;
        if (succeeded) {
          azureQueuedDeliveriesRef.current = [];
        } else {
          const next = azureQueuedDeliveriesRef.current.shift();
          if (next) void processAzureDeliveryRef.current(next);
        }
      }
    },
    [finishAzureLoginAttempt, failAzureLogin, setLocation]
  );
  processAzureDeliveryRef.current = processAzureDelivery;

  // Mensajes de SignalR: se consumen uno por uno (onMessage), no por lastMessage, para que dos mensajes
  // seguidos no se pisen. Se asigna por ref porque el hook se llama antes de definir estos callbacks.
  wsMessageHandlerRef.current = (msg: WebSocketMessage) => {
    if (msg.eventType === "LoginFailed") {
      logAuth("WS LOGIN FAILED EVENT", { code: msg.context?.code });
      // Servidores anteriores no mandan código: equivale a cancelar o pulsar «Atrás» en Microsoft.
      failAzureLogin(toAzureLoginFailureCode(msg.context?.code ?? "CANCELLED"), msg.context?.reference);
      return;
    }
    if (msg.eventType !== "Login") return;
    logAuth("WS LOGIN EVENT");

    const key = msg.deliveryCode
      ? `code:${msg.deliveryCode}`
      : `ws:${msg.eventId ?? JSON.stringify({ u: msg.data?.email, ts: msg.timestamp ?? Date.now() })}`;
    void processAzureDelivery({
      key,
      source: "websocket",
      deliveryCode: msg.deliveryCode,
      pair: msg.pair,
      wsData: msg.data as Record<string, unknown> | undefined,
    });
  };

  // La conexión en tiempo real quedó lista (inicial o tras reconectar): si hay un login pendiente, se reclama.
  wsConnectedHandlerRef.current = () => {
    if (azureLoginSettledRef.current && !loadAzureAttempt()) return;
    void tryClaimAzureDeliveryRef.current("ws-connected");
  };

  // ─── BroadcastChannel: entrega desde /auth/azure/relay (backend Python) ───
  // Aditivo al aviso de SignalR, NO lo reemplaza: login.microsoftonline.com envía
  // Cross-Origin-Opener-Policy: same-origin, que corta window.opener, así que el callback de Python
  // redirige el popup a /auth/azure/relay (mismo origen que esta pestaña) y esa página publica aquí.
  // Cada mensaje se confirma (AZURE_LOGIN_ACK) para que el relay sepa que llegó antes de cerrarse.

  useEffect(() => {
    // Nunca lanza: sin BroadcastChannel cae a localStorage y, sin eso, el reclamo al servidor recupera el login.
    const channel = openAzureLoginChannel(AZURE_LOGIN_BROADCAST_CHANNEL);

    // Solo la pestaña que inició el login (o la que lo retoma tras recargar) reacciona y confirma.
    const hasAzureAttempt = () => !azureLoginSettledRef.current || loadAzureAttempt() !== null;

    const handleAzureDeliveryMessage = (payload: any) => {
      if (!payload || !hasAzureAttempt()) return;

      if (payload.type === "AZURE_LOGIN_FAILED") {
        channel.post({ type: "AZURE_LOGIN_ACK" });
        logAuth("BROADCASTCHANNEL LOGIN FAILED", { code: payload.code });
        failAzureLoginRef.current(
          toAzureLoginFailureCode(payload.code ?? "CANCELLED"),
          typeof payload.ref === "string" ? payload.ref : undefined
        );
        return;
      }
      if (payload.type !== "AZURE_LOGIN_DELIVERY") return;

      channel.post({ type: "AZURE_LOGIN_ACK" });
      logAuth("BROADCASTCHANNEL LOGIN EVENT");
      const key = payload.deliveryCode
        ? `code:${payload.deliveryCode}`
        : `bc:${payload.pair?.accessToken ?? Date.now()}`;
      void processAzureDeliveryRef.current({
        key,
        source: "broadcast",
        deliveryCode: payload.deliveryCode,
        pair: payload.pair,
      });
    };

    const unsubscribe = channel.subscribe(handleAzureDeliveryMessage);
    return () => {
      unsubscribe();
      channel.close();
    };
  }, []);

  // Si el navegador recargó o descartó la pestaña mientras el usuario estaba en Microsoft/Authenticator,
  // el intento sigue guardado: al montar se reclama el login pendiente.
  useEffect(() => {
    if (tokenService.getAccessToken() || !loadAzureAttempt()) return;
    void tryClaimAzureDeliveryRef.current("mount");
  }, []);

  // ─── Vigilancia del intento en curso ──────────────────────────────────────

  const armAzureLoginWatchers = useCallback(
    (popup: Window) => {
      azurePopupRef.current = popup;
      azureLoginSettledRef.current = false;

      // Tiempo máximo: antes de rendirse se reclama una última vez. NO se puede sondear popup.closed
      // (COOP de login.microsoftonline.com lo bloquea de forma permanente para esa ventana).
      azureLoginTimeoutRef.current = setTimeout(async () => {
        azureLoginTimeoutRef.current = null;
        const stalePopup = azurePopupRef.current;
        const recovered = await tryClaimAzureDeliveryRef.current("timeout");
        if (recovered || isProcessingLoginRef.current || azureLoginSettledRef.current) return;
        failAzureLoginRef.current("TIMEOUT");
        try {
          stalePopup?.close();
        } catch {
          /* ignore */
        }
      }, AZURE_LOGIN_TIMEOUT_MS);

      // Reclamos escalonados: cubren el caso en que el aviso se pierde mientras el usuario sigue en la pestaña.
      azureClaimTimersRef.current = AZURE_CLAIM_DELAYS_MS.map((delay) =>
        setTimeout(() => {
          if (azureLoginSettledRef.current || isProcessingLoginRef.current) return;
          void tryClaimAzureDeliveryRef.current(`timer-${delay}`);
        }, delay)
      );

      // Regreso a esta pestaña (cierre del popup, vuelta desde Authenticator, etc.): se reclama de inmediato y,
      // si tras un margen no hay nada ni se está procesando, se avisa. El margen NO se reinicia con cada
      // regreso de foco para no dar por perdido un login que el usuario aún está completando.
      const onReturn = () => {
        if (document.visibilityState === "hidden") return;
        void tryClaimAzureDeliveryRef.current("return");
        if (azureFocusGraceRef.current) return;
        azureFocusGraceRef.current = setTimeout(async () => {
          azureFocusGraceRef.current = null;
          if (azureLoginSettledRef.current || isProcessingLoginRef.current) return;
          const recovered = await tryClaimAzureDeliveryRef.current("return-grace");
          if (recovered || isProcessingLoginRef.current || azureLoginSettledRef.current) return;
          failAzureLoginRef.current("NOT_DELIVERED");
        }, AZURE_RETURN_GRACE_MS);
      };
      azureReturnHandlerRef.current = onReturn;
      window.addEventListener("focus", onReturn);
      document.addEventListener("visibilitychange", onReturn);
    },
    []
  );

  // ─── Chequeo inicial de sesión al montar ──────────────────────────────────

  useEffect(() => {
    let active = true;

    const checkAuth = async () => {
      try {
        const accessToken = tokenService.getAccessToken();
        if (!accessToken) {
          if (active) setIsLoading(false);
          logAuth("CHECK AUTH / NO ACCESS TOKEN");
          return;
        }

        if (isProcessingLoginRef.current) return;

        if (tokenService.isTokenExpired(accessToken)) {
          const refreshToken = tokenService.getRefreshToken();
          if (refreshToken) {
            try {
              const newTokens = await authService.refreshToken(refreshToken);
              tokenService.setTokens(newTokens);
              const userInfo = await authService.getCurrentUser(
                newTokens.accessToken
              );
              await doLoginStateRef.current(userInfo, false);
              logAuth("CHECK AUTH / REFRESH OK");
            } catch {
              logoutRef.current();
            }
          } else {
            logoutRef.current();
          }
        } else {
          const userSession = tokenService.getUserSession();
          if (userSession) {
            if (needsPermissionReload(userSession)) {
              logAuth("CHECK AUTH / sin permisos, recargando...");
              await doLoginStateRef.current(userSession, false);
            } else {
              setIsAuthenticated(true);
              setUser((prev) =>
                prev?.id === userSession.id ? prev : userSession
              );
              const savedDetailsStr = (() => {
                try {
                  return localStorage.getItem(LS_EMPLOYEE_DETAILS);
                } catch {
                  return null;
                }
              })();
              if (savedDetailsStr) {
                const parsed = JSON.parse(savedDetailsStr) as EmployeeDetails;
                if (parsed.personId != null) {
                  setEmployeeDetails((prev) =>
                    equalEmployeeDetails(prev, parsed) ? prev : parsed
                  );
                  logAuth("CHECK AUTH / SESSION + CACHED DETAILS");
                } else {
                  // En background (no bloquea isLoading): igual que doLoginState, ningún
                  // consumidor de employeeDetails asume que está listo de inmediato.
                  fetchEmployeeDetailsRef.current(userSession.email);
                  logAuth("CHECK AUTH / SESSION + API DETAILS (personId missing)");
                }
              } else {
                fetchEmployeeDetailsRef.current(userSession.email);
                logAuth("CHECK AUTH / SESSION + API DETAILS");
              }
            }
          } else {
            const userInfo = await authService.getCurrentUser(accessToken);
            await doLoginStateRef.current(userInfo, false);
            logAuth("CHECK AUTH / API USERINFO");
          }
        }
      } catch {
        logoutRef.current();
      } finally {
        if (active) setIsLoading(false);
      }
    };

    checkAuth();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Inactividad → auto-logout ────────────────────────────────────────────

  const updateActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // Escritura a localStorage con throttle: los eventos de actividad disparan
    // decenas de veces por segundo; persistir cada 15s es más que suficiente.
    if (now - lastActivityWriteRef.current >= ACTIVITY_WRITE_THROTTLE_MS) {
      lastActivityWriteRef.current = now;
      try {
        localStorage.setItem(LS_LAST_ACTIVITY, now.toString());
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Reiniciar el contador al autenticarse para no heredar un timestamp viejo
    lastActivityRef.current = Date.now();

    ACTIVITY_EVENTS.forEach((event) =>
      document.addEventListener(event, updateActivity, true)
    );

    const interval = setInterval(() => {
      const diffMs = Date.now() - lastActivityRef.current;

      if (diffMs >= INACTIVITY_TIMEOUT) {
        logAuth("AUTO-LOGOUT por inactividad", {
          diffSegundos: Math.round(diffMs / 1000),
        });
        toast({
          title: "Sesión expirada",
          description: "Su sesión ha expirado por inactividad",
          variant: "destructive",
        });
        // Única vía de salida: logout() limpia estado, tokens, cachés y redirige
        logoutRef.current();
      }
    }, INACTIVITY_CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) =>
        document.removeEventListener(event, updateActivity, true)
      );
      clearInterval(interval);
    };
  }, [isAuthenticated, toast, updateActivity]);

  // ─── Refresh proactivo del access token ───────────────────────────────────
  // Renueva el token REFRESH_MARGIN_MS antes de que expire, para que el usuario
  // nunca pague la latencia del ciclo 401 → refresh → retry en pleno uso.
  // El retry por 401 de fetch.ts queda como red de seguridad si esto falla.

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    let timerId: number | undefined;

    const scheduleNextRefresh = () => {
      if (cancelled) return;

      const token = tokenService.getAccessToken();
      if (!token) return;

      const expMs = tokenService.getTokenExpirationMs(token);
      if (expMs === null) return;

      // Mínimo 30s para no entrar en bucles agresivos con tokens muy cortos
      const delay = Math.max(expMs - Date.now() - REFRESH_MARGIN_MS, 30_000);

      timerId = window.setTimeout(async () => {
        try {
          // Si otro flujo (retry por 401, otra pestaña) ya renovó, solo reprogramar
          const current = tokenService.getAccessToken();
          if (!current || tokenService.getTokenExpirationMs(current) !== expMs) {
            scheduleNextRefresh();
            return;
          }

          const refreshToken = tokenService.getRefreshToken();
          if (!refreshToken) return;

          const newTokens = await authService.refreshToken(refreshToken);
          tokenService.setTokens(newTokens);
          logAuth("REFRESH PROACTIVO OK");
          scheduleNextRefresh();
        } catch (error) {
          // No reintentar en bucle: el retry por 401 de fetch.ts toma el relevo
          logger.auth.error(
            "Refresh proactivo falló; el retry por 401 continuará la sesión",
            error
          );
        }
      }, delay);
    };

    scheduleNextRefresh();

    return () => {
      cancelled = true;
      if (timerId !== undefined) clearTimeout(timerId);
    };
  }, [isAuthenticated]);

  // ─── Login local ──────────────────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<boolean> => {
    logAuth("login() called", { email });
    try {
      setIsLoading(true);
      const tokens = await authService.loginLocal({ email, password });
      const userInfo = await authService.getCurrentUser(tokens.accessToken);
      tokenService.setTokens(tokens);
      // La sesión se guarda recién en doLoginState, cuando los permisos ya se cargaron: guardarla antes dejaba
      // una sesión incompleta en el navegador si esa carga fallaba.
      await doLoginState(userInfo, true);
      logAuth("LOGIN LOCAL OK");
      return true;
    } catch (error: unknown) {
      logger.auth.error("[AUTH] Error en login local:", error);
      toast({
        title: "Error de autenticación",
        description: parseApiError(error).message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Login Office 365 ─────────────────────────────────────────────────────

  const loginWithOffice365 = async (): Promise<void> => {
    // Un intento nuevo reemplaza al anterior por completo: sin esto los temporizadores y listeners del
    // anterior seguían vivos y podían dar por fallido el intento nuevo.
    const previousPopup = azurePopupRef.current;
    clearAzureLoginWatchers();
    try {
      previousPopup?.close();
    } catch {
      /* ignore */
    }
    azureLoginSettledRef.current = true;
    azureQueuedDeliveriesRef.current = [];

    const reference = newAttemptReference();
    try {
      setAzureLoginPhase("waiting");
      logAuth("Iniciando login Office 365...", { reference });

      // PKCE (RFC 7636): el codeVerifier se genera aquí; solo su hash (codeChallenge) viaja al servidor.
      // Queda en memoria y, mientras dura el intento, en sessionStorage de ESTA pestaña para poder
      // reclamar el login si el navegador la recarga durante la verificación (azureLoginAttempt.ts).
      const codeVerifier = generateCodeVerifier();
      azureCodeVerifierRef.current = codeVerifier;
      azureAttemptRef.current = { reference };
      saveAzureAttempt({ codeVerifier, reference, startedAt: Date.now() });
      const codeChallenge = await computeCodeChallenge(codeVerifier);

      // El "state" de OAuth lo genera y valida RepositoryUta; el frontend no lo consume. La conexión en
      // tiempo real se asegura en paralelo (no retrasa el popup): si no está lista, el reclamo lo cubre.
      const [{ url }] = await Promise.all([
        authService.getAzureAuthUrl(codeChallenge),
        ensureConnectedRef.current(2_000),
      ]);
      const popup = window.open(url, "office365login", "width=600,height=700,left=200,top=100");

      if (!popup) {
        setAzureLoginPhase("idle");
        azureCodeVerifierRef.current = null;
        clearAzureAttempt();
        toast({
          title: "No se pudo abrir la ventana de inicio de sesión",
          description: "El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio e intenta de nuevo.",
          variant: "destructive",
        });
        return;
      }

      // A partir de aquí el login queda "en curso" hasta que finishAzureLoginAttempt() lo cierre.
      armAzureLoginWatchers(popup);
    } catch (error: unknown) {
      logger.auth.error("[AUTH] Error en Office 365 login:", error);
      setAzureLoginPhase("idle");
      azureLoginSettledRef.current = true;
      azureCodeVerifierRef.current = null;
      clearAzureAttempt();
      const info =
        error instanceof AzureExchangeError
          ? describeAzureLoginFailure(error.kind, reference)
          : {
              title: "Error de autenticación",
              description: parseApiError(error).message,
              neutral: false,
            };
      toast({
        title: info.title,
        description: info.description,
        variant: "destructive",
      });
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        employeeDetails,
        isLoading,
        isWebSocketConnected: isConnected,
        login,
        loginWithOffice365,
        azureLoginPhase,
        cancelOffice365Login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook público ──────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};

useAuth.displayName = "useAuth";
