/**
 * features/auth/context/AuthContext.tsx
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
  ACTIVITY_EVENTS,
} from "../constants/sessionConstants";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { VistaDetallesEmpleadosAPI } from "@/lib/api";
import {
  useNotificationWebSocket,
  WebSocketMessage,
} from "@/hooks/useNotificationWebSocket";
import { PermissionService, CacheService } from "@/services/permissions";
import { parseApiError } from "@/lib/error-handling";
import { registerForceLogoutCallback } from "@/lib/api/core/fetch";

const AUTH_DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";

const logAuth = (...args: unknown[]) => {
  if (AUTH_DEBUG) {
    // eslint-disable-next-line no-console
    console.log("[AUTH]", ...args);
  }
};

const APP_CLIENT_ID = import.meta.env.VITE_APP_CLIENT_ID;

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface EmployeeDetails {
  employeeID: number;
  firstName: string;
  lastName: string;
  idCard: string;
  email: string;
  employeeType: number;
  department: string;
  scheduleID: number;
  faculty: string;
  baseSalary: number;
  hireDate: string;
  fullName: string;
  hasActiveSalary: boolean;
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
    a.firstName === b.firstName &&
    a.lastName === b.lastName &&
    a.department === b.department &&
    a.scheduleID === b.scheduleID &&
    a.faculty === b.faculty &&
    a.hasActiveSalary === b.hasActiveSalary
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
  const [lastActivity, setLastActivity] = useState(Date.now());

  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isConnected, lastMessage } = useNotificationWebSocket(APP_CLIENT_ID);

  // Refs para evitar closures obsoletos en callbacks asíncronos
  const logoutRef = useRef<() => void>(() => {});
  const doLoginStateRef = useRef<
    (u: UserSession, showToast?: boolean) => Promise<void>
  >(async () => {});
  const fetchEmployeeDetailsRef = useRef<(email: string) => Promise<void>>(
    async () => {}
  );

  const processedLoginEventsRef = useRef<Set<string>>(new Set());
  const isProcessingLoginRef = useRef(false);

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
          persistEmployeeDetails(response.data);
          logAuth("FETCH EMPLOYEE DETAILS OK", { email });
        } else {
          console.error(
            "Error al obtener detalles del empleado:",
            response.status === "error" ? response.error : "Sin datos"
          );
        }
      } catch (error) {
        console.error("Error en fetchEmployeeDetails:", error);
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
      setLastActivity(now);
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
        console.error("[AUTH] Error loading permissions/menu:", err);
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
          description: `Bienvenido ${
            userInfo.displayName || userInfo.email || ""
          }`,
        });
      }
    },
    [toast]
  );
  doLoginStateRef.current = doLoginState;

  // ─── Logout ───────────────────────────────────────────────────────────────

  const logout = useCallback(() => {
    setIsLoading(false);
    setIsAuthenticated(false);
    setUser(null);
    setEmployeeDetails(null);
    tokenService.clearTokens();

    try {
      CacheService.clearAll();
    } catch (error) {
      console.error("Error limpiando caché:", error);
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

    setLocation("/login");
    logAuth("LOGOUT completado");
  }, [setLocation, toast]);
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
              setEmployeeDetails((prev) =>
                equalEmployeeDetails(prev, parsed) ? prev : parsed
              );
              logAuth("REFRESH AUTH / SESSION + CACHED DETAILS");
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
      console.error("Error refreshing auth:", error);
      logout();
    }
  }, [logout, doLoginState, fetchEmployeeDetails]);

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
      });

    if (processedLoginEventsRef.current.has(eventKey)) return;
    processedLoginEventsRef.current.add(eventKey);
    if (isProcessingLoginRef.current) return;
    isProcessingLoginRef.current = true;

    (async () => {
      try {
        const { data, pair } = lastMessage as WebSocketMessage;
        if (!pair) return;
        tokenService.setTokens(pair);
        const wsUser: UserSession = {
          id: (data as any).userId,
          email: (data as any).email,
          username: (data as any).username ?? (data as any).email ?? "",
          fullName: (data as any).fullName ?? (data as any).displayName ?? "",
          displayName: (data as any).displayName,
          userType: "AzureAD",
          roles: (data as any).roles ?? [],
        };
        await doLoginStateRef.current(wsUser, true);
        setTimeout(() => setLocation("/"), 300);
        logAuth("LOGIN VIA WEBSOCKET COMPLETADO");
      } catch (e) {
        console.error("WS login handling error:", e);
      } finally {
        isProcessingLoginRef.current = false;
      }
    })();
  }, [lastMessage, setLocation]);

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
                setEmployeeDetails((prev) =>
                  equalEmployeeDetails(prev, parsed) ? prev : parsed
                );
                logAuth("CHECK AUTH / SESSION + CACHED DETAILS");
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
    setLastActivity(now);
    if (isAuthenticated) {
      try {
        localStorage.setItem(LS_LAST_ACTIVITY, now.toString());
      } catch {
        /* ignore */
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    ACTIVITY_EVENTS.forEach((event) =>
      document.addEventListener(event, updateActivity, true)
    );

    const interval = setInterval(() => {
      const now = Date.now();
      const diffMs = now - lastActivity;

      if (diffMs >= INACTIVITY_TIMEOUT) {
        logAuth("AUTO-LOGOUT por inactividad", {
          diffSegundos: Math.round(diffMs / 1000),
        });
        toast({
          title: "Sesión expirada",
          description: "Su sesión ha expirado por inactividad",
          variant: "destructive",
        });
        setLocation("/login");
        logoutRef.current();
        // Fallback de recarga completa para garantizar limpieza total
        if (typeof window !== "undefined") {
          window.location.replace(`${import.meta.env.BASE_URL}login`);
        }
      }
    }, INACTIVITY_CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) =>
        document.removeEventListener(event, updateActivity, true)
      );
      clearInterval(interval);
    };
  }, [isAuthenticated, lastActivity, toast, updateActivity, setLocation]);

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
      console.error("[AUTH] Error en login local:", error);
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
      const { url, state } = await authService.getAzureAuthUrl();
      sessionStorage.setItem("oauth_state", state);
      window.open(url, "office365login", "width=600,height=700,left=200,top=100");
    } catch (error: unknown) {
      console.error("[AUTH] Error en Office 365 login:", error);
      toast({
        title: "Error de autenticación",
        description: parseApiError(error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
