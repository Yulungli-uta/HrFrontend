import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface SessionTimeoutOptions {
  timeout: number; // en milisegundos
  warningTime: number; // en milisegundos antes del timeout para mostrar advertencia
  onTimeout: () => void;
}

export function useSessionTimeout({ timeout, warningTime, onTimeout }: SessionTimeoutOptions) {
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const { toast } = useToast();

  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
  }, []);

  const checkTimeout = useCallback(() => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivity;
    
    if (timeSinceActivity >= timeout) {
      toast({
        title: "Sesión expirada",
        description: "Su sesión ha expirado por inactividad. Será redirigido al login.",
        variant: "destructive",
      });
      setTimeout(onTimeout, 2000);
      return;
    }
    
    if (timeSinceActivity >= timeout - warningTime && !showWarning) {
      setShowWarning(true);
      const remainingMinutes = Math.ceil((timeout - timeSinceActivity) / 60000);
      toast({
        title: "Advertencia de sesión",
        description: `Su sesión expirará en ${remainingMinutes} minuto(s). Mueva el mouse para extender la sesión.`,
        variant: "destructive",
      });
    }
  }, [lastActivity, timeout, warningTime, showWarning, onTimeout, toast]);

  useEffect(() => {
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
  }, [updateActivity, checkTimeout]);

  return {
    lastActivity,
    showWarning,
    updateActivity,
  };
}