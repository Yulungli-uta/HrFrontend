// contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { authService, tokenService, UserSession } from "@/services/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { VistaDetallesEmpleadosAPI } from "@/lib/api";
import {
  useNotificationWebSocket,
  WebSocketMessage,
} from "@/hooks/useNotificationWebSocket";
import { parseApiError } from '@/lib/error-handling';

const AUTH_DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";

const logAuth = (...args: any[]) => {
  if (AUTH_DEBUG) {
    // eslint-disable-next-line no-console
    console.log("[AUTH]", ...args);
  }
};

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

interface AuthContextType {
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const APP_CLIENT_ID = import.meta.env.VITE_APP_CLIENT_ID;

const LS_EMPLOYEE_DETAILS = "wsuta-employee-details";
const LS_LAST_ACTIVITY = "wsuta-last-activity";

interface AuthProviderProps {
  children: ReactNode;
}

const equalEmployeeDetails = (
  a: EmployeeDetails | null,
  b: EmployeeDetails | null
) => {
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [employeeDetails, setEmployeeDetails] =
    useState<EmployeeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const clientId = APP_CLIENT_ID;
  const { isConnected, lastMessage } = useNotificationWebSocket(clientId);

  const processedLoginEventsRef = useRef<Set<string>>(new Set());
  const isProcessingLoginRef = useRef(false);

  // 15 minutos real:
  // const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
  // Para pruebas:
  //const INACTIVITY_TIMEOUT = 30 * 1000;
  const INACTIVITY_TIMEOUT =Number(import.meta.env.VITE_INACTIVITY_TIMEOUT) || 15 * 60 * 1000;

  const [lastActivity, setLastActivity] = useState(Date.now());

  const logoutRef = useRef<() => void>(() => {});
  const doLoginStateRef = useRef<
    (u: UserSession, showToast?: boolean) => Promise<void>
  >(async () => {});
  const fetchEmployeeDetailsRef = useRef<(email: string) => Promise<void>>(
    async () => {}
  );

  // ---------------------------------------------------------------------------
  // Persistencia de detalles del empleado
  // ---------------------------------------------------------------------------
  const persistEmployeeDetails = (details: EmployeeDetails) => {
    setEmployeeDetails((prev) =>
      equalEmployeeDetails(prev, details) ? prev : details
    );
    try {
      localStorage.setItem(LS_EMPLOYEE_DETAILS, JSON.stringify(details));
    } catch {
      /* ignore */
    }
  };

  const fetchEmployeeDetails = useCallback(
    async (email: string) => {
      try {
        const response = await VistaDetallesEmpleadosAPI.byEmail(email);
        if (response.status === "success" && response.data) {
          persistEmployeeDetails(response.data);
          logAuth("FETCH EMPLOYEE DETAILS", {
            isAuthenticated: true,
            user,
            employeeDetails: response.data,
          });
        } else {
          console.error(
            "Error al obtener detalles del empleado:",
            response.error
          );
        }
      } catch (error) {
        console.error("Error en fetchEmployeeDetails:", error);
      }
    },
    [user]
  );
  fetchEmployeeDetailsRef.current = fetchEmployeeDetails;

  // ---------------------------------------------------------------------------
  // APLICAR ESTADO DE LOGIN (No navega, solo actualiza contexto)
  // ---------------------------------------------------------------------------
  const doLoginState = useCallback(
    async (userInfo: UserSession, showToast: boolean = true) => {
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
        const { PermissionService, CacheService } =
          await import("@/services/permissions");

        try {
          CacheService.clearAll();
        } catch (err) {
          console.warn("[AUTH] Error limpiando caché permisos:", err);
        }

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

      // Detalles del empleado en background
      fetchEmployeeDetailsRef.current(userInfo.email);

      if (showToast) {
        toast({
          title: "Inicio de sesión exitoso",
          description: `Bienvenido ${
            userInfo.displayName || userInfo.email || ""
          }`,
        });
      }

      AUTH_DEBUG &&
        console.log("🔐 AUTH DEBUG → LOGIN STATE FINAL", {
          isAuthenticated: true,
          user: userInfo,
          employeeDetails,
        });
    },
    [toast, employeeDetails]
  );
  doLoginStateRef.current = doLoginState;

  // ---------------------------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------------------------
  const logout = useCallback(() => {
    // Para no quedarse en blanco en ningún caso
    setIsLoading(false);

    setIsAuthenticated(false);
    setUser(null);
    setEmployeeDetails(null);
    tokenService.clearTokens();

    // Limpiar caché de permisos
    try {
      import("@/services/permissions").then(({ CacheService }) => {
        CacheService.clearAll();
      });
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

    logAuth("LOGOUT", {
      isAuthenticated: false,
      user: null,
      employeeDetails: null,
    });
  }, [setLocation, toast]);
  logoutRef.current = logout;

  // ---------------------------------------------------------------------------
  // REFRESH AUTH
  // ---------------------------------------------------------------------------
  const refreshAuth = useCallback(async () => {
    try {
      const accessToken = tokenService.getAccessToken();
      if (!accessToken) {
        setIsAuthenticated(false);
        setUser(null);
        logAuth("REFRESH AUTH / NO ACCESS TOKEN", {
          isAuthenticated: false,
          user: null,
          employeeDetails,
        });
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

          logAuth("REFRESH AUTH / TOKEN RENEWED", {
            isAuthenticated: true,
            user: userInfo,
            employeeDetails,
          });
        } else {
          logout();
        }
      } else {
        const userSession = tokenService.getUserSession();
        if (userSession) {
          if (!userSession.permissions || !(userSession as any).menuItems) {
            logAuth(
              "REFRESH AUTH / userSession sin permisos, recargando permisos..."
            );
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
              logAuth("REFRESH AUTH / SESSION + CACHED DETAILS", {
                isAuthenticated: true,
                user: userSession,
                employeeDetails: parsed,
              });
            } else {
              await fetchEmployeeDetails(userSession.email);
              logAuth("REFRESH AUTH / SESSION + API DETAILS", {
                isAuthenticated: true,
                user: userSession,
                employeeDetails,
              });
            }
          }
        } else {
          const userInfo = await authService.getCurrentUser(accessToken);
          await doLoginState(userInfo, false);
          logAuth("REFRESH AUTH / API USERINFO", {
            isAuthenticated: true,
            user: userInfo,
            employeeDetails,
          });
        }
      }
    } catch (error) {
      console.error("Error refreshing auth:", error);
      logout();
    }
  }, [employeeDetails, logout, doLoginState, fetchEmployeeDetails]);

  // ---------------------------------------------------------------------------
  // WebSocket: LoginNotification → completar login AzureAD
  // ---------------------------------------------------------------------------
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

    if (processedLoginEventsRef.current.has(eventKey)) {
      return;
    }
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
          displayName: (data as any).displayName,
          userType: "AzureAD",
          roles: (data as any).roles ?? [],
        };

        await doLoginStateRef.current(wsUser, true);

        setTimeout(() => {
          setLocation("/");
        }, 300);

        logAuth("LOGIN VIA WEBSOCKET COMPLETADO", {
          isAuthenticated: true,
          user: wsUser,
        });
      } catch (e) {
        console.error("WS login handling error:", e);
      } finally {
        isProcessingLoginRef.current = false;
      }
    })();
  }, [lastMessage, setLocation]);

  // ---------------------------------------------------------------------------
  // Chequeo inicial de sesión al montar
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let active = true;

    const checkAuth = async () => {
      try {
        const accessToken = tokenService.getAccessToken();
        if (!accessToken) {
          if (!active) return;
          setIsLoading(false);
          logAuth("CHECK AUTH / NO ACCESS TOKEN", {
            isAuthenticated,
            user,
            employeeDetails,
          });
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
              logAuth("CHECK AUTH / REFRESH OK", {
                isAuthenticated: true,
                user: userInfo,
                employeeDetails,
              });
            } catch (error) {
              logoutRef.current();
            }
          } else {
            logoutRef.current();
          }
        } else {
          const userSession = tokenService.getUserSession();
          if (userSession) {
            if (!userSession.permissions || !(userSession as any).menuItems) {
              logAuth(
                "CHECK AUTH / userSession sin permisos, recargando permisos..."
              );
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
                logAuth("CHECK AUTH / SESSION + CACHED DETAILS", {
                  isAuthenticated: true,
                  user: userSession,
                  employeeDetails: parsed,
                });
              } else {
                await fetchEmployeeDetailsRef.current(userSession.email);
                logAuth("CHECK AUTH / SESSION + API DETAILS", {
                  isAuthenticated: true,
                  user: userSession,
                  employeeDetails,
                });
              }
            }
          } else {
            const userInfo = await authService.getCurrentUser(accessToken);
            await doLoginStateRef.current(userInfo, false);
            logAuth("CHECK AUTH / API USERINFO", {
              isAuthenticated: true,
              user: userInfo,
              employeeDetails,
            });
          }
        }
      } catch (error) {
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

  // ---------------------------------------------------------------------------
  // Inactividad → auto-logout
  // ---------------------------------------------------------------------------
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

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ] as const;

    events.forEach((event) =>
      document.addEventListener(event, updateActivity, true)
    );

    const interval = setInterval(() => {
      const now = Date.now();
      const diffMs = now - lastActivity;
      const diffSegundos = Math.round(diffMs / 1000);

      if (diffMs >= INACTIVITY_TIMEOUT) {
        logAuth("AUTO-LOGOUT por inactividad", {
          lastActivity,
          now,
          diffSegundos,
        });

        toast({
          title: "Sesión expirada",
          description: "Su sesión ha expirado por inactividad",
          variant: "destructive",
        });

        // 1️⃣ Intento de navegación SPA
        setLocation("/login");

        // 2️⃣ Logout para limpiar estado
        logoutRef.current();

        // 3️⃣ Fallback fuerte: recarga completa en /login
        if (typeof window !== "undefined") {
          try {
            // winkdow.location.href = "/login";
            window.location.replace(`${import.meta.env.BASE_URL}login`);
          } catch {
            // último recurso, pero prácticamente nunca llega aquí
          }
        }
      }
    }, 30_000);

    return () => {
      events.forEach((event) =>
        document.removeEventListener(event, updateActivity, true)
      );
      clearInterval(interval);
    };
  }, [
    isAuthenticated,
    lastActivity,
    toast,
    updateActivity,
    setLocation,
    INACTIVITY_TIMEOUT,
  ]);

  // ---------------------------------------------------------------------------
  // LOGIN LOCAL
  // ---------------------------------------------------------------------------
  const login = async (email: string, password: string): Promise<boolean> => {
    logAuth("login() called", { email });
    try {
      setIsLoading(true);
      logAuth("🔐 Iniciando login local...", { username: email });

      const tokens = await authService.loginLocal({ email, password });
      const userInfo = await authService.getCurrentUser(tokens.accessToken);

      tokenService.setTokens(tokens);
      tokenService.setUserSession(userInfo);

      await doLoginState(userInfo, true);

      logAuth("LOGIN LOCAL OK", { user: userInfo });
      return true;
    } catch (error: unknown) {
      console.error("[AUTH] Error en login local:", error);
      toast({
        title: "Error de autenticación",
        description:
          parseApiError(error).message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // LOGIN O365
  // ---------------------------------------------------------------------------
  const loginWithOffice365 = async (): Promise<void> => {
    try {
      setIsLoading(true);
      logAuth("🔐 Iniciando login Office 365...");
      const { url, state } = await authService.getAzureAuthUrl();
      sessionStorage.setItem("oauth_state", state);
      window.open(
        url,
        "office365login",
        "width=600,height=700,left=200,top=100"
      );
    } catch (error: unknown) {
      console.error("❌ Error en Office 365 login:", error);
      toast({
        title: "Error de autenticación",
        description:
          parseApiError(error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};

useAuth.displayName = "useAuth";
