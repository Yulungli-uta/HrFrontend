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
} from "../constants/sessionConstants";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { VistaDetallesEmpleadosAPI, EmpleadosAPI } from "@/lib/api";
import {
  useNotificationWebSocket,
  WebSocketMessage,
} from "@/hooks/useNotificationWebSocket";
import { PermissionService, CacheService } from "@/services/permissions";
import { parseApiError } from "@/lib/error-handling";
import { registerForceLogoutCallback } from "@/lib/api/core/fetch";
import { queryClient } from "@/lib/queryClient";
import { logger } from "@/lib/logger";
import { generateCodeVerifier, computeCodeChallenge } from "../services/pkce";

const logAuth = (...args: unknown[]) => logger.auth.debug(String(args[0] ?? ""), ...args.slice(1));

/**
 * Throttle de la escritura de "última actividad" a localStorage: los eventos de
 * actividad (mousemove, scroll) disparan decenas de veces por segundo y escribir
 * en cada uno degrada el rendimiento sin aportar precisión útil.
 */
const ACTIVITY_WRITE_THROTTLE_MS = 15_000;

const APP_CLIENT_ID = import.meta.env.VITE_APP_CLIENT_ID;

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

export interface AuthContextType {
  isAuthenticated: boolean;
  user: UserSession | null;
  employeeDetails: EmployeeDetails | null;
  isLoading: boolean;
  isWebSocketConnected: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithOffice365: () => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

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

  // Última actividad como ref (NO state): los eventos de actividad disparan en cada
  // mousemove/scroll y un setState aquí re-renderizaría toda la app continuamente.
  const lastActivityRef = useRef(Date.now());
  const lastActivityWriteRef = useRef(0);

  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isConnected, lastMessage } = useNotificationWebSocket(APP_CLIENT_ID);

  // Refs para evitar closures obsoletos en callbacks asíncronos
  const logoutRef = useRef<() => void>(() => { });
  const doLoginStateRef = useRef<
    (u: UserSession, showToast?: boolean) => Promise<void>
  >(async () => { });
  const fetchEmployeeDetailsRef = useRef<(email: string) => Promise<void>>(
    async () => { }
  );

  const processedLoginEventsRef = useRef<Set<string>>(new Set());
  const isProcessingLoginRef = useRef(false);

  // PKCE (login Office 365): el codeVerifier vive SOLO en memoria de esta pestaña,
  // nunca en localStorage/sessionStorage. Se genera al abrir el popup y se consume
  // al recibir el deliveryCode por WebSocket (ver loginWithOffice365 y el efecto WS).
  const azureCodeVerifierRef = useRef<string | null>(null);

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
  // permanente para esa ventana aunque después vuelva a nuestro propio dominio (confirmado:
  // "Cross-Origin-Opener-Policy policy would block the window.closed call" en consola).
  // En su lugar, se usa que ESTA pestaña recupere el foco como señal de que el usuario
  // volvió (típicamente porque cerró el popup) — no toca ninguna propiedad de la ventana
  // emergente, solo escucha el evento "focus" de la propia ventana.
  const azureFocusHandlerRef = useRef<(() => void) | null>(null);
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
          try {
            const empResponse = await EmpleadosAPI.get(empDetails.employeeID);
            if (empResponse.status === "success" && empResponse.data) {
              const rawId = empResponse.data.personID ?? empResponse.data.personId;
              empDetails.personId = rawId != null ? Number(rawId) : undefined;
              if (empDetails.personId == null) {
                logger.auth.error(
                  "fetchEmployeeDetails: la respuesta de EmpleadosAPI.get no trae personID/personId",
                  { employeeID: empDetails.employeeID, data: empResponse.data }
                );
              }
            } else {
              logger.auth.error(
                "fetchEmployeeDetails: EmpleadosAPI.get no devolvió éxito al resolver personId",
                { employeeID: empDetails.employeeID, response: empResponse }
              );
            }
          } catch (personIdError) {
            // No bloquea el flujo principal (el resto del perfil sigue funcionando),
            // pero sin este log era imposible saber por qué /perfil se quedaba cargando
            // indefinidamente (personId nunca se llenaba y PersonDetail.tsx no reintentaba).
            logger.auth.error(
              "fetchEmployeeDetails: error al resolver personId vía EmpleadosAPI.get",
              { employeeID: empDetails.employeeID, error: personIdError }
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
        const perms = await PermissionService.fetchAllPermissions(userInfo.id);
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
        };
        setUser(mergedUser);
        tokenService.setUserSession(mergedUser);
        logAuth("Permisos cargados", {
          roles: mergedUser.roles,
          permissions: mergedUser.permissions?.length ?? 0,
          menuItems: mergedUser.menuItems?.length ?? 0,
        });
      } catch (err) {
        logger.auth.error("[AUTH] Error loading permissions/menu:", err);
        const safeUser: UserSession = {
          ...userInfo,
          roles: userInfo.roles ?? [],
          permissions: userInfo.permissions ?? [],
          menuItems: (userInfo as any).menuItems ?? [],
        };
        setUser(safeUser);
        tokenService.setUserSession(safeUser);
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
    [toast]
  );
  doLoginStateRef.current = doLoginState;

  // ─── Logout ───────────────────────────────────────────────────────────────

  const logout = useCallback(() => {
    // Revocación en servidor best-effort ANTES de limpiar los tokens locales
    // (se necesita el refresh token). No bloquea el logout local: si el servidor
    // no responde, la sesión local se limpia igual.
    const refreshToken = tokenService.getRefreshToken();
    if (refreshToken) {
      authService.logout(refreshToken).catch((err) => {
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

    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });

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
          if (!userSession.permissions || !(userSession as any).menuItems) {
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
                await fetchEmployeeDetails(userSession.email);
                logAuth("REFRESH AUTH / SESSION + API DETAILS (personId missing)");
              }
            } else {
              await fetchEmployeeDetails(userSession.email);
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

  // ─── Login Office 365: seguimiento de la ventana emergente ────────────────

  const clearAzureLoginWatchers = useCallback(() => {
    if (azureLoginTimeoutRef.current) {
      clearTimeout(azureLoginTimeoutRef.current);
      azureLoginTimeoutRef.current = null;
    }
    if (azureFocusHandlerRef.current) {
      window.removeEventListener("focus", azureFocusHandlerRef.current);
      azureFocusHandlerRef.current = null;
    }
    azurePopupRef.current = null;
  }, []);

  // Limpieza defensiva si AuthProvider llegara a desmontarse con un login Office 365 en
  // curso (no ocurre en operación normal, pero evita temporizadores huérfanos).
  useEffect(() => clearAzureLoginWatchers, [clearAzureLoginWatchers]);

  // Cierra el intento de login Office 365 actual: éxito o fracaso. Idempotente (el guard
  // azureLoginSettledRef evita doble toast si, por ejemplo, el timeout y la detección de
  // ventana cerrada disparan casi al mismo tiempo).
  const finishAzureLoginAttempt = useCallback(
    (success: boolean, errorMessage?: string) => {
      if (azureLoginSettledRef.current) return;
      azureLoginSettledRef.current = true;
      clearAzureLoginWatchers();
      setIsLoading(false);
      if (!success) {
        toast({
          title: "No se completó el inicio de sesión",
          description:
            errorMessage ??
            "El inicio de sesión con Office 365 no se completó. Intenta de nuevo.",
          variant: "destructive",
        });
      }
    },
    [toast, clearAzureLoginWatchers]
  );

  // ─── WebSocket: LoginNotification → completar login AzureAD ──────────────

  useEffect(() => {
    if (!lastMessage || lastMessage.eventType !== "Login") return;
    logAuth("WS LOGIN EVENT", { msg: lastMessage });

    const eventKey =
      (lastMessage as any).eventId ||
      (lastMessage as any).id ||
      JSON.stringify({
        t: lastMessage.eventType,
        u: (lastMessage as any)?.data?.email,
        ts: (lastMessage as any)?.timestamp ?? Date.now(),
      });

    if (processedLoginEventsRef.current.has(eventKey)) return;
    processedLoginEventsRef.current.add(eventKey);
    if (isProcessingLoginRef.current) return;
    isProcessingLoginRef.current = true;

    (async () => {
      try {
        const { data, pair: legacyPair, deliveryCode } = lastMessage as WebSocketMessage;

        // PKCE (RFC 7636): si el servidor tiene SecureTokenDelivery activo, el mensaje
        // trae deliveryCode en vez del par de tokens real. Se canjea aquí usando el
        // codeVerifier que nunca salió de esta pestaña.
        let pair = legacyPair;
        if (deliveryCode) {
          const verifier = azureCodeVerifierRef.current;
          if (!verifier) {
            logger.auth.error(
              "WS Login trajo deliveryCode pero no hay codeVerifier en memoria (pestaña recargada durante el login); se aborta"
            );
            finishAzureLoginAttempt(
              false,
              "Se perdió el estado del inicio de sesión (¿recargaste la página?). Intenta de nuevo."
            );
            return;
          }
          try {
            pair = await authService.exchangeAzureDeliveryCode(deliveryCode, verifier);
          } finally {
            // Un solo uso también del lado cliente: no reintentar con el mismo verifier
            azureCodeVerifierRef.current = null;
          }
        }

        if (!pair) {
          finishAzureLoginAttempt(
            false,
            "No se pudo completar el inicio de sesión (el enlace expiró o ya se usó). Intenta de nuevo."
          );
          return;
        }
        tokenService.setTokens(pair);
        const adGroups = tokenService.extractAdGroups(pair.accessToken);
        if (adGroups.length > 0) {
          logger.auth.debug("Grupos AD recibidos vía WS notification:", adGroups.length);
        } else {
          logAuth("[AUTH-AD] No hay grupos AD en el JWT de notificación WS");
        }
        const wsUser: UserSession = {
          id: (data as any).userId,
          email: (data as any).email,
          personnelEmail: (data as any).personnelEmail,
          username: (data as any).username ?? (data as any).email ?? "",
          fullName: (data as any).fullName ?? (data as any).displayName ?? "",
          displayName: (data as any).displayName,
          userType: "AzureAD",
          roles: (data as any).roles ?? [],
          adGroups,
        };
        await doLoginStateRef.current(wsUser, true);
        finishAzureLoginAttempt(true);
        setTimeout(() => setLocation("/"), 300);
        logAuth("LOGIN VIA WEBSOCKET COMPLETADO");
      } catch (e) {
        logger.auth.error("WS login handling error:", e);
        finishAzureLoginAttempt(
          false,
          "Ocurrió un error al completar el inicio de sesión. Intenta de nuevo."
        );
      } finally {
        isProcessingLoginRef.current = false;
      }
    })();
  }, [lastMessage, setLocation, finishAzureLoginAttempt]);

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
            if (!userSession.permissions || !(userSession as any).menuItems) {
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
                  await fetchEmployeeDetailsRef.current(userSession.email);
                  logAuth("CHECK AUTH / SESSION + API DETAILS (personId missing)");
                }
              } else {
                await fetchEmployeeDetailsRef.current(userSession.email);
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
      tokenService.setUserSession(userInfo);
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
    try {
      setIsLoading(true);
      logAuth("Iniciando login Office 365...");

      // PKCE (RFC 7636): el codeVerifier se genera aquí y queda SOLO en memoria de esta
      // pestaña; solo su hash (codeChallenge) se envía al servidor. Se consume al recibir
      // el deliveryCode por WebSocket (ver el efecto "WS: LoginNotification" más abajo).
      const codeVerifier = generateCodeVerifier();
      azureCodeVerifierRef.current = codeVerifier;
      const codeChallenge = await computeCodeChallenge(codeVerifier);

      // El "state" de OAuth lo genera y valida RepositoryUta; el frontend no lo
      // consume (el login se completa vía WebSocket con clientId+browserId).
      const { url } = await authService.getAzureAuthUrl(codeChallenge);
      const popup = window.open(url, "office365login", "width=600,height=700,left=200,top=100");

      if (!popup) {
        setIsLoading(false);
        azureCodeVerifierRef.current = null;
        toast({
          title: "No se pudo abrir la ventana de inicio de sesión",
          description: "El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio e intenta de nuevo.",
          variant: "destructive",
        });
        return;
      }

      // A partir de aquí el login queda "en curso": isLoading se mantiene true hasta que
      // finishAzureLoginAttempt() lo cierre (éxito por WebSocket, timeout, o ventana
      // cerrada sin completar) — antes se apagaba apenas se abría el popup, sin reflejar
      // la espera real de la MFA en Azure.
      azurePopupRef.current = popup;
      azureLoginSettledRef.current = false;

      // B: si no llega ningún resultado (WS caído, deliveryCode perdido, etc.) en 3
      // minutos, se avisa en vez de dejar la pantalla de login esperando en silencio.
      azureLoginTimeoutRef.current = setTimeout(() => {
        finishAzureLoginAttempt(
          false,
          "El inicio de sesión con Office 365 tardó demasiado. Intenta de nuevo."
        );
        try {
          azurePopupRef.current?.close();
        } catch {
          /* ignore */
        }
      }, 3 * 60 * 1000);

      // C: detecta que el usuario volvió a esta pestaña (típicamente porque cerró el popup,
      // manualmente o solo tras la página de error/éxito del callback) sin leer NINGUNA
      // propiedad del popup — ver la nota junto a azureFocusHandlerRef sobre por qué
      // sondear popup.closed no es viable aquí. El servidor envía la notificación WS ANTES
      // de responderle al popup (que recién ahí dispara su propio cierre), pero por las
      // dudas se da un margen de 2s tras recuperar el foco antes de declarar el intento
      // como fallido — evita un toast de error falso si el mensaje WS llega con una
      // fracción de segundo de retraso, o si el usuario solo cambió de pestaña sin cerrar
      // el popup (en ese caso el guard de azureLoginSettledRef ya lo habrá resuelto).
      const onFocus = () => {
        window.removeEventListener("focus", onFocus);
        azureFocusHandlerRef.current = null;
        setTimeout(() => {
          finishAzureLoginAttempt(
            false,
            "No se detectó que el inicio de sesión se haya completado. Si ya cerraste la ventana de Office 365, intenta de nuevo."
          );
        }, 2000);
      };
      azureFocusHandlerRef.current = onFocus;
      window.addEventListener("focus", onFocus);
    } catch (error: unknown) {
      logger.auth.error("[AUTH] Error en Office 365 login:", error);
      setIsLoading(false);
      azureLoginSettledRef.current = true;
      azureCodeVerifierRef.current = null;
      toast({
        title: "Error de autenticación",
        description: parseApiError(error).message,
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
