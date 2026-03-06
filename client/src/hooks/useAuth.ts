// hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { authService, tokenService, UserSession, TokenPair } from '@/services/auth';
import { analyzeToken } from '@/services/auth/debugUtils';
import { parseApiError } from '@/lib/error-handling';

export interface AuthState {
  isAuthenticated: boolean;
  user: UserSession | null;
}

// 15 minutos de inactividad (configurable mediante variable de entorno)
const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
const WARNING_TIME = 2 * 60 * 1000; // Advertir 2 minutos antes

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  });
  
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const updateActivity = useCallback(() => {
    const now = Date.now();
    setLastActivity(now);
    setShowWarning(false);
    
    if (authState.isAuthenticated) {
      localStorage.setItem('wsuta-last-activity', now.toString());
    }
  }, [authState.isAuthenticated]);

  const logout = useCallback(() => {
    setAuthState({
      isAuthenticated: false,
      user: null,
    });
    setShowWarning(false);
    tokenService.clearTokens();
    localStorage.removeItem('wsuta-last-activity');
    
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
    
    setLocation('/login');
  }, [setLocation, toast]);

  const checkTimeout = useCallback(() => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivity;
    
    if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
      toast({
        title: "Sesión expirada",
        description: "Su sesión ha expirado por inactividad. Será redirigido al login.",
        variant: "destructive",
      });
      setTimeout(logout, 2000);
      return;
    }
    
    if (timeSinceActivity >= INACTIVITY_TIMEOUT - WARNING_TIME && !showWarning) {
      setShowWarning(true);
      const remainingMinutes = Math.ceil((INACTIVITY_TIMEOUT - timeSinceActivity) / 60000);
      toast({
        title: "Advertencia de sesión",
        description: `Su sesión expirará en ${remainingMinutes} minuto(s). Realice alguna acción para extender la sesión.`,
        variant: "destructive",
      });
    }
  }, [lastActivity, showWarning, logout, toast]);

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.group('🔐 Checking authentication status');
        const accessToken = tokenService.getAccessToken();
        const userSession = tokenService.getUserSession();
        const savedActivity = localStorage.getItem('wsuta-last-activity');

        console.log('📋 Auth check initial state:', {
          hasAccessToken: !!accessToken,
          hasUserSession: !!userSession,
          hasSavedActivity: !!savedActivity
        });

        if (!accessToken) {
          console.log('❌ No access token found');
          setIsLoading(false);
          console.groupEnd();
          return;
        }

        // Analizar el token actual
        console.log('🔍 Analyzing current token:');
        analyzeToken(accessToken);

        // Verificar si el token está expirado
        if (tokenService.isTokenExpired(accessToken)) {
          console.log('⚠️ Token is expired, attempting refresh');
          const refreshToken = tokenService.getRefreshToken();
          
          if (refreshToken) {
            try {
              console.log('🔄 Refreshing token with refresh token:', refreshToken ? `${refreshToken.substring(0, 15)}...` : 'NULL');
              const newTokens = await authService.refreshToken(refreshToken);
              tokenService.setTokens(newTokens);
              
              console.log('✅ Token refreshed successfully');
              analyzeToken(newTokens.accessToken);
              
              // Obtener información actualizada del usuario
              console.log('👤 Getting updated user info');
              const userInfo = await authService.getCurrentUser(newTokens.accessToken);
              tokenService.setUserSession(userInfo);
              
              setAuthState({
                isAuthenticated: true,
                user: userInfo,
              });
              
              if (savedActivity) {
                setLastActivity(parseInt(savedActivity));
              }
            } catch (error) {
              console.error('❌ Error refreshing token:', error);
              logout();
            }
          } else {
            console.log('❌ No refresh token available');
            logout();
          }
        } else if (userSession) {
          console.log('✅ Using existing user session');
          setAuthState({
            isAuthenticated: true,
            user: userSession,
          });
          
          if (savedActivity) {
            setLastActivity(parseInt(savedActivity));
          }
        } else {
          console.log('👤 Getting user info from server');
          // Obtener información del usuario si no está en localStorage
          const userInfo = await authService.getCurrentUser(accessToken);
          tokenService.setUserSession(userInfo);
          setAuthState({
            isAuthenticated: true,
            user: userInfo,
          });
          
          if (savedActivity) {
            setLastActivity(parseInt(savedActivity));
          }
        }
      } catch (error) {
        console.error('❌ Auth check error:', error);
        logout();
      } finally {
        setIsLoading(false);
        console.groupEnd();
      }
    };

    checkAuth();
  }, [logout]);

  useEffect(() => {
    if (authState.isAuthenticated) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      events.forEach(event => {
        document.addEventListener(event, updateActivity, true);
      });

      const interval = setInterval(checkTimeout, 30000); // Verificar cada 30 segundos

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, updateActivity, true);
        });
        clearInterval(interval);
      };
    }
  }, [authState.isAuthenticated, updateActivity, checkTimeout]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.group('🔐 Attempting login');
      setIsLoading(true);
      
      console.log('📧 Login attempt with email:', email);
      const tokens = await authService.loginLocal({ email, password });
      
      console.log('✅ Login successful, tokens received');
      console.log('🔑 Access token:', tokens.accessToken ? `${tokens.accessToken.substring(0, 20)}...` : 'NULL');
      
      // Analizar el token solo si existe
      if (tokens.accessToken) {
        analyzeToken(tokens.accessToken);
      } else {
        console.error('❌ Access token is missing in tokens response');
        throw new Error('No se recibió token de acceso');
      }
      
      console.log('👤 Getting user info');
      const userInfo = await authService.getCurrentUser(tokens.accessToken);
      
      tokenService.setTokens(tokens);
      tokenService.setUserSession(userInfo);
      
      const now = Date.now();
      setAuthState({
        isAuthenticated: true,
        user: userInfo,
      });
      setLastActivity(now);
      localStorage.setItem('wsuta-last-activity', now.toString());
      
      toast({
        title: "Inicio de sesión exitoso",
        description: `Bienvenido ${userInfo.displayName || userInfo.email}`,
      });
      
      console.log('✅ Login process completed successfully');
      return true;
    } catch (error: unknown) {
      console.error('❌ Login error:', error);
      toast({
        title: "Error de autenticación",
        description: parseApiError(error).message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
      console.groupEnd();
    }
  };

  const loginWithOffice365 = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const { url, state } = await authService.getAzureAuthUrl();
      
      // Guardar state para verificación posterior
      sessionStorage.setItem("oauth_state", state);
      
      // Redirigir a Azure AD
      window.location.href = url;
    } catch (error: unknown) {
      toast({
        title: "Error de autenticación",
        description: parseApiError(error).message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    isLoading,
    login,
    loginWithOffice365,
    logout,
  };
} 