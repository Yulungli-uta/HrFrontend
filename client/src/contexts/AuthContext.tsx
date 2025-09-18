// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const APP_CLIENT_ID = import.meta.env.VITE_APP_CLIENT_ID;

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Notification WebSocket
  const clientId = APP_CLIENT_ID; 
  const { isConnected, lastMessage } = useNotificationWebSocket(clientId);

  // 15 minutos de inactividad
  const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Función para obtener detalles del empleado
  const fetchEmployeeDetails = async (email: string) => {
    try {
      const response = await VistaDetallesEmpleadosAPI.byEmail(email);
      if (response.status === 'success' && response.data) {
        setEmployeeDetails(response.data);
        localStorage.setItem('wsuta-employee-details', JSON.stringify(response.data));
      } else {
        console.error('Error al obtener detalles del empleado:', response.error);
      }
    } catch (error) {
      console.error('Error en fetchEmployeeDetails:', error);
    }
  };

  const refreshAuth = useCallback(async () => {
    try {
      const accessToken = tokenService.getAccessToken();
      if (!accessToken) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      if (tokenService.isTokenExpired(accessToken)) {
        const refreshToken = tokenService.getRefreshToken();
        if (refreshToken) {
          const newTokens = await authService.refreshToken(refreshToken);
          tokenService.setTokens(newTokens);
          
          const userInfo = await authService.getCurrentUser(newTokens.accessToken);
          tokenService.setUserSession(userInfo);
          
          setIsAuthenticated(true);
          setUser(userInfo);
          await fetchEmployeeDetails(userInfo.email);
        } else {
          logout();
        }
      } else {
        const userSession = tokenService.getUserSession();
        if (userSession) {
          setIsAuthenticated(true);
          setUser(userSession);
          
          const savedDetails = localStorage.getItem('wsuta-employee-details');
          if (savedDetails) {
            setEmployeeDetails(JSON.parse(savedDetails));
          } else {
            await fetchEmployeeDetails(userSession.email);
          }
        } else {
          const userInfo = await authService.getCurrentUser(accessToken);
          tokenService.setUserSession(userInfo);
          setIsAuthenticated(true);
          setUser(userInfo);
          await fetchEmployeeDetails(userInfo.email);
        }
      }
    } catch (error) {
      console.error('Error refreshing auth:', error);
      logout();
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    setEmployeeDetails(null);
    tokenService.clearTokens();
    localStorage.removeItem('wsuta-last-activity');
    localStorage.removeItem('wsuta-employee-details');
    
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
    
    setLocation('/login');
  }, [setLocation, toast]);

  // Efecto para manejar notificaciones WebSocket de login
  useEffect(() => {
    if (lastMessage && lastMessage.eventType === "Login") {
      console.log('Processing login notification from WebSocket', lastMessage);
      
      const { data, pair } = lastMessage;
      
      if (pair) {
        // Guardar tokens
        tokenService.setTokens(pair);
        
        // Actualizar estado de autenticación
        setIsAuthenticated(true);
        setUser({
          id: data.userId,
          email: data.email,
          displayName: data.displayName,
          userType: 'AzureAD'
        });
        
        // Obtener detalles del empleado
        fetchEmployeeDetails(data.email);
        
        toast({
          title: "Inicio de sesión exitoso",
          description: `Bienvenido ${data.displayName}`,
        });
        
        // Redirigir a la página principal
        setLocation('/');
      }
    }
  }, [lastMessage, toast, setLocation]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const accessToken = tokenService.getAccessToken();
        
        if (!accessToken) {
          setIsLoading(false);
          return;
        }

        if (tokenService.isTokenExpired(accessToken)) {
          const refreshToken = tokenService.getRefreshToken();
          
          if (refreshToken) {
            try {
              const newTokens = await authService.refreshToken(refreshToken);
              tokenService.setTokens(newTokens);
              
              const userInfo = await authService.getCurrentUser(newTokens.accessToken);
              tokenService.setUserSession(userInfo);
              
              setIsAuthenticated(true);
              setUser(userInfo);
              
              await fetchEmployeeDetails(userInfo.email);
            } catch (error) {
              logout();
            }
          } else {
            logout();
          }
        } else {
          const userSession = tokenService.getUserSession();
          
          if (userSession) {
            setIsAuthenticated(true);
            setUser(userSession);
            
            const savedDetails = localStorage.getItem('wsuta-employee-details');
            if (savedDetails) {
              setEmployeeDetails(JSON.parse(savedDetails));
            } else {
              await fetchEmployeeDetails(userSession.email);
            }
          } else {
            const userInfo = await authService.getCurrentUser(accessToken);
            tokenService.setUserSession(userInfo);
            setIsAuthenticated(true);
            setUser(userInfo);
            
            await fetchEmployeeDetails(userInfo.email);
          }
        }
      } catch (error) {
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [logout]);

  const updateActivity = useCallback(() => {
    const now = Date.now();
    setLastActivity(now);
    
    if (isAuthenticated) {
      localStorage.setItem('wsuta-last-activity', now.toString());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      events.forEach(event => {
        document.addEventListener(event, updateActivity, true);
      });

      const checkTimeout = () => {
        const now = Date.now();
        const timeSinceActivity = now - lastActivity;
        
        if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
          toast({
            title: "Sesión expirada",
            description: "Su sesión ha expirado por inactividad",
            variant: "destructive",
          });
          logout();
        }
      };

      const interval = setInterval(checkTimeout, 30000);

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, updateActivity, true);
        });
        clearInterval(interval);
      };
    }
  }, [isAuthenticated, lastActivity, toast, logout, updateActivity, INACTIVITY_TIMEOUT]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log("Entro al login local")
      const tokens = await authService.loginLocal({ email, password });
      
      const userInfo = await authService.getCurrentUser(tokens.accessToken);
      
      tokenService.setTokens(tokens);
      tokenService.setUserSession(userInfo);
      
      setIsAuthenticated(true);
      setUser(userInfo);
      setLastActivity(Date.now());
      localStorage.setItem('wsuta-last-activity', Date.now().toString());
      
      await fetchEmployeeDetails(email);
      
      toast({
        title: "Inicio de sesión exitoso",
        description: `Bienvenido ${userInfo.displayName || userInfo.email}`,
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: "Error de autenticación",
        description: error.message || "Credenciales incorrectas",
        variant: "destructive",
      });
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
      // window.location.href = url;
      // Cambiar a popup en lugar de redirect full page
      window.open(url, 'office365login', 'width=600,height=700,left=200,top=100');
    } catch (error: any) {
      toast({
        title: "Error de autenticación",
        description: error.message || "No se pudo iniciar sesión con Office 365",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      employeeDetails,
      isLoading,
      isWebSocketConnected: isConnected,
      login,
      loginWithOffice365,
      logout,
      refreshAuth,
    }}>
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