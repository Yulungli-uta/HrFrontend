import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

export interface AuthState {
  isAuthenticated: boolean;
  user: string | null;
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
  const { toast } = useToast();

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
    localStorage.removeItem('wsuta-auth');
    localStorage.removeItem('wsuta-last-activity');
  }, []);

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
        description: `Su sesión expirará en ${remainingMinutes} minuto(s). Mueva el mouse para extender la sesión.`,
        variant: "destructive",
      });
    }
  }, [lastActivity, showWarning, logout, toast]);

  useEffect(() => {
    const savedAuth = localStorage.getItem('wsuta-auth');
    const savedActivity = localStorage.getItem('wsuta-last-activity');
    
    if (savedAuth && savedActivity) {
      const now = Date.now();
      const lastActivityTime = parseInt(savedActivity);
      const timeSinceActivity = now - lastActivityTime;
      
      if (timeSinceActivity < INACTIVITY_TIMEOUT) {
        const parsed = JSON.parse(savedAuth);
        setAuthState(parsed);
        setLastActivity(lastActivityTime);
      } else {
        localStorage.removeItem('wsuta-auth');
        localStorage.removeItem('wsuta-last-activity');
      }
    }
  }, []);

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

  const login = (username: string, password: string): boolean => {
    if (username === 'admin' && password === 'admin') {
      const newAuthState = {
        isAuthenticated: true,
        user: username,
      };
      const now = Date.now();
      
      setAuthState(newAuthState);
      setLastActivity(now);
      localStorage.setItem('wsuta-auth', JSON.stringify(newAuthState));
      localStorage.setItem('wsuta-last-activity', now.toString());
      return true;
    }
    return false;
  };

  return {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    login,
    logout,
  };
}