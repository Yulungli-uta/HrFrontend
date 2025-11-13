// contexts/AuthContext.tsx (revisado v2: evita bucles de checkAuth y estados idénticos)
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { authService, tokenService, UserSession } from '@/services/auth';
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { VistaDetallesEmpleadosAPI } from '@/lib/api';
import { useNotificationWebSocket, WebSocketMessage } from '@/hooks/useNotificationWebSocket';

export interface EmployeeDetails {
  employeeID: number;
  firstName: string;
  lastName: string;
  idCard: string;
  email: string;
  employeeType: number;
  department: string;
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

// 🔛 Switch de depuración por variable de entorno
const AUTH_DEBUG = import.meta.env.VITE_DEBUG_AUTH === 'true';

const debugAuthContext = (label: string, state: any) => {
  if (!AUTH_DEBUG) return;
  console.group(`🔍 AUTH CONTEXT DEBUG → ${label}`);
  console.log("isAuthenticated:", state.isAuthenticated);
  console.log("user:", state.user);
  console.log("employeeDetails:", state.employeeDetails);
  console.groupEnd();
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const APP_CLIENT_ID = import.meta.env.VITE_APP_CLIENT_ID;

// Claves de storage centralizadas
const LS_EMPLOYEE_DETAILS = 'wsuta-employee-details';
const LS_LAST_ACTIVITY = 'wsuta-last-activity';

interface AuthProviderProps {
  children: ReactNode;
}

// Utilidad ligera para comparar detalles y evitar setState con objetos equivalentes
const equalEmployeeDetails = (a: EmployeeDetails | null, b: EmployeeDetails | null) => {
  if (a === b) return true;
  if (!a || !b) return false;
  // comparar campos clave que cambian raramente
  return (
    a.employeeID === b.employeeID &&
    a.email === b.email &&
    a.firstName === b.firstName &&
    a.lastName === b.lastName &&
    a.department === b.department &&
    a.faculty === b.faculty &&
    a.hasActiveSalary === b.hasActiveSalary
  );
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Notificaciones WebSocket
  const clientId = APP_CLIENT_ID;
  const { isConnected, lastMessage } = useNotificationWebSocket(clientId);

  // Anti-duplicado: recordar eventos de login ya procesados
  const processedLoginEventsRef = useRef<Set<string>>(new Set());
  // Anti-carrera: evita que dos flujos (WS y checkAuth) entren al mismo tiempo
  const isProcessingLoginRef = useRef(false);

  // 15 minutos de inactividad
  const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Refs a funciones para que el efecto de checkAuth no dependa de ellas
  const logoutRef = useRef<() => void>(() => {});
  const doLoginStateRef = useRef<(u: UserSession, showToast?: boolean) => Promise<void>>(async () => {});
  const fetchEmployeeDetailsRef = useRef<(email: string) => Promise<void>>(async () => {});

  const persistEmployeeDetails = (details: EmployeeDetails) => {
    // evitar set si no cambia
    setEmployeeDetails((prev) => (equalEmployeeDetails(prev, details) ? prev : details));
    try {
      localStorage.setItem(LS_EMPLOYEE_DETAILS, JSON.stringify(details));
    } catch {}
  };

  const fetchEmployeeDetails = useCallback(async (email: string) => {
    try {
      const response = await VistaDetallesEmpleadosAPI.byEmail(email);
      if (response.status === 'success' && response.data) {
        persistEmployeeDetails(response.data);
        debugAuthContext("FETCH EMPLOYEE DETAILS", { isAuthenticated: true, user, employeeDetails: response.data });
      } else {
        console.error('Error al obtener detalles del empleado:', response.error);
      }
    } catch (error) {
      console.error('Error en fetchEmployeeDetails:', error);
    }
  }, [user]);
  fetchEmployeeDetailsRef.current = fetchEmployeeDetails;

  const doLoginState = useCallback(async (userInfo: UserSession, showToast: boolean = true) => {
    setIsAuthenticated(true);
    setUser((prev) => (prev?.id === userInfo.id && prev?.email === userInfo.email ? prev : userInfo));

    // cacheo de actividad
    const now = Date.now();
    setLastActivity(now);
    try { localStorage.setItem(LS_LAST_ACTIVITY, String(now)); } catch {}

    await fetchEmployeeDetailsRef.current(userInfo.email);

    if (showToast) {
      toast({ title: "Inicio de sesión exitoso", description: `Bienvenido ${userInfo.displayName || userInfo.email}` });
    }

    debugAuthContext("LOGIN STATE APPLIED", { isAuthenticated: true, user: userInfo, employeeDetails });
  }, [toast, employeeDetails]);
  doLoginStateRef.current = doLoginState;

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    setEmployeeDetails(null);
    tokenService.clearTokens();
    try {
      localStorage.removeItem(LS_LAST_ACTIVITY);
      localStorage.removeItem(LS_EMPLOYEE_DETAILS);
    } catch {}

    toast({ title: "Sesión cerrada", description: "Has cerrado sesión correctamente" });
    setLocation('/login');

    debugAuthContext("LOGOUT", { isAuthenticated: false, user: null, employeeDetails: null });
  }, [setLocation, toast]);
  logoutRef.current = logout;

  const refreshAuth = useCallback(async () => {
    try {
      const accessToken = tokenService.getAccessToken();
      if (!accessToken) {
        setIsAuthenticated(false);
        setUser(null);
        debugAuthContext("REFRESH AUTH / NO ACCESS TOKEN", { isAuthenticated: false, user: null, employeeDetails });
        return;
      }

      if (tokenService.isTokenExpired(accessToken)) {
        const refreshToken = tokenService.getRefreshToken();
        if (refreshToken) {
          const newTokens = await authService.refreshToken(refreshToken);
          tokenService.setTokens(newTokens);

          const userInfo = await authService.getCurrentUser(newTokens.accessToken);
          tokenService.setUserSession(userInfo);
          await doLoginState(userInfo, false);

          debugAuthContext("REFRESH AUTH / TOKEN RENEWED", { isAuthenticated: true, user: userInfo, employeeDetails });
        } else {
          logout();
        }
      } else {
        const userSession = tokenService.getUserSession();
        if (userSession) {
          setIsAuthenticated(true);
          setUser((prev) => (prev?.id === userSession.id ? prev : userSession));

          const savedDetailsStr = (() => { try { return localStorage.getItem(LS_EMPLOYEE_DETAILS); } catch { return null; } })();
          if (savedDetailsStr) {
            const parsed = JSON.parse(savedDetailsStr) as EmployeeDetails;
            setEmployeeDetails((prev) => (equalEmployeeDetails(prev, parsed) ? prev : parsed));
            debugAuthContext("REFRESH AUTH / SESSION + CACHED DETAILS", { isAuthenticated: true, user: userSession, employeeDetails: parsed });
          } else {
            await fetchEmployeeDetails(userSession.email);
            debugAuthContext("REFRESH AUTH / SESSION + API DETAILS", { isAuthenticated: true, user: userSession, employeeDetails });
          }
        } else {
          const userInfo = await authService.getCurrentUser(accessToken);
          tokenService.setUserSession(userInfo);
          await doLoginState(userInfo, false);
          debugAuthContext("REFRESH AUTH / API USERINFO", { isAuthenticated: true, user: userInfo, employeeDetails });
        }
      }
    } catch (error) {
      console.error('Error refreshing auth:', error);
      logout();
    }
  }, [employeeDetails, logout, doLoginState, fetchEmployeeDetails]);

  // ===========================
  // WebSocket: manejar Login UNA SOLA VEZ por evento
  // ===========================
  useEffect(() => {
    if (!lastMessage || lastMessage.eventType !== 'Login') return;

    const eventKey = (lastMessage as any).eventId || (lastMessage as any).id || JSON.stringify({ t: lastMessage.eventType, u: (lastMessage as any)?.data?.email });
    if (processedLoginEventsRef.current.has(eventKey)) return; // ya procesado

    processedLoginEventsRef.current.add(eventKey);
    if (isProcessingLoginRef.current) return; // otro flujo en curso
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
          userType: 'AzureAD'
        };
        await doLoginStateRef.current(wsUser, true);
        debugAuthContext("LOGIN VIA WEBSOCKET", { isAuthenticated: true, user: wsUser, employeeDetails });
        setLocation('/');
      } catch (e) {
        console.error('WS login handling error:', e);
      } finally {
        isProcessingLoginRef.current = false;
      }
    })();
  // deps mínimas para no re-procesar
  }, [lastMessage, setLocation]);

  // ===========================
  // Revisión de sesión al montar (una sola vez)
  // ===========================
  useEffect(() => {
    let active = true;
    const checkAuth = async () => {
      try {
        const accessToken = tokenService.getAccessToken();
        if (!accessToken) {
          if (!active) return;
          setIsLoading(false);
          debugAuthContext("CHECK AUTH / NO ACCESS TOKEN", { isAuthenticated, user, employeeDetails });
          return;
        }

        // Si ya hay un flujo WS en curso, espera a que termine para no duplicar
        if (isProcessingLoginRef.current) return;

        if (tokenService.isTokenExpired(accessToken)) {
          const refreshToken = tokenService.getRefreshToken();
          if (refreshToken) {
            try {
              const newTokens = await authService.refreshToken(refreshToken);
              tokenService.setTokens(newTokens);
              const userInfo = await authService.getCurrentUser(newTokens.accessToken);
              tokenService.setUserSession(userInfo);
              await doLoginStateRef.current(userInfo, false);
              debugAuthContext("CHECK AUTH / REFRESH OK", { isAuthenticated: true, user: userInfo, employeeDetails });
            } catch (error) {
              logoutRef.current();
            }
          } else {
            logoutRef.current();
          }
        } else {
          const userSession = tokenService.getUserSession();
          if (userSession) {
            setIsAuthenticated(true);
            setUser((prev) => (prev?.id === userSession.id ? prev : userSession));

            const savedDetailsStr = (() => { try { return localStorage.getItem(LS_EMPLOYEE_DETAILS); } catch { return null; } })();
            if (savedDetailsStr) {
              const parsed = JSON.parse(savedDetailsStr) as EmployeeDetails;
              setEmployeeDetails((prev) => (equalEmployeeDetails(prev, parsed) ? prev : parsed));
              debugAuthContext("CHECK AUTH / SESSION + CACHED DETAILS", { isAuthenticated: true, user: userSession, employeeDetails: parsed });
            } else {
              await fetchEmployeeDetailsRef.current(userSession.email);
              debugAuthContext("CHECK AUTH / SESSION + API DETAILS", { isAuthenticated: true, user: userSession, employeeDetails });
            }
          } else {
            const userInfo = await authService.getCurrentUser(accessToken);
            tokenService.setUserSession(userInfo);
            await doLoginStateRef.current(userInfo, false);
            debugAuthContext("CHECK AUTH / API USERINFO", { isAuthenticated: true, user: userInfo, employeeDetails });
          }
        }
      } catch (error) {
        logoutRef.current();
      } finally {
        if (active) setIsLoading(false);
      }
    };

    checkAuth();
    return () => { active = false; };
    // ⚠️ Intencionalmente sin dependencias para que no se re-ejecute en cada cambio de estado
  }, []);

  // ===========================
  // Inactividad (cierre de sesión)
  // ===========================
  const updateActivity = useCallback(() => {
    const now = Date.now();
    setLastActivity(now);
    if (isAuthenticated) {
      try { localStorage.setItem(LS_LAST_ACTIVITY, now.toString()); } catch {}
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'] as const;
    events.forEach((event) => document.addEventListener(event, updateActivity, true));

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;
      if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
        toast({ title: "Sesión expirada", description: "Su sesión ha expirado por inactividad", variant: "destructive" });
        logoutRef.current();
      }
    }, 30_000);

    return () => {
      events.forEach((event) => document.removeEventListener(event, updateActivity, true));
      clearInterval(interval);
    };
  }, [isAuthenticated, lastActivity, toast, updateActivity]);

  // ===========================
  // Flujos de login manuales
  // ===========================
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      if (AUTH_DEBUG) console.log("🔐 Entro al login local");

      const tokens = await authService.loginLocal({ email, password });
      const userInfo = await authService.getCurrentUser(tokens.accessToken);

      tokenService.setTokens(tokens);
      tokenService.setUserSession(userInfo);

      await doLoginState(userInfo, true);
      debugAuthContext("LOGIN LOCAL", { isAuthenticated: true, user: userInfo, employeeDetails });
      return true;
    } catch (error: any) {
      toast({ title: "Error de autenticación", description: error?.message || "Credenciales incorrectas", variant: "destructive" });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOffice365 = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const { url, state } = await authService.getAzureAuthUrl();
      sessionStorage.setItem("oauth_state", state);
      // Abrimos popup; el flujo continuará por WebSocket -> no mantengas loading indefinido
      window.open(url, 'office365login', 'width=600,height=700,left=200,top=100');
    } catch (error: any) {
      toast({ title: "Error de autenticación", description: error?.message || "No se pudo iniciar sesión con Office 365", variant: "destructive" });
    } finally {
      // Dejamos que la UI vuelva a interactiva. El estado real llegará vía WebSocket
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
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

useAuth.displayName = 'useAuth';
