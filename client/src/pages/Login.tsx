import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import logoPath from "@assets/LogoUTA.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { authService, tokenService } from '@/services/auth';
import { useNotificationWebSocket } from '@/hooks/useNotificationWebSocket';

const APP_CLIENT_ID = import.meta.env.VITE_APP_CLIENT_ID;

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("local");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { login, loginWithOffice365, isLoading: authLoading, isAuthenticated, refreshAuth } = useAuth();

  const clientId = APP_CLIENT_ID; 
  const { isConnected } = useNotificationWebSocket(clientId);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        toast({
          title: "Inicio de sesión exitoso",
          description: "Bienvenido al Sistema UTA",
        });
      } else {
        throw new Error("Credenciales inválidas");
      }
    } catch (error) {
      toast({
        title: "Error de autenticación",
        description: error instanceof Error ? error.message : "Ocurrió un error durante el inicio de sesión",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOffice365Login = async () => {
    setIsLoading(true);
    try {
      await loginWithOffice365();
    } catch (error) {
      console.error("Error en Office 365 login:", error);
      toast({
        title: "Error de autenticación",
        description: "Error al iniciar sesión con Office 365",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const savedState = sessionStorage.getItem("oauth_state");

      console.log("OAuth Callback - Code:", code ? "presente" : "ausente");
      console.log("OAuth Callback - State:", state);
      console.log("OAuth Callback - Saved State:", savedState);

      if (code && state && savedState === state) {
        setIsLoading(true);
        try {
          console.log("Procesando callback de Azure...");
          
          // Llamar al endpoint de callback del backend
          const response = await fetch(`http://localhost:5010/api/auth/azure/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          console.log("Respuesta del callback:", result);

          if (result.success && result.data) {
            const tokens = result.data;
            
            // Guardar tokens
            tokenService.setTokens(tokens);
            
            // Obtener información del usuario usando el token
            try {
              const userInfo = await authService.getCurrentUser(tokens.accessToken);
              tokenService.setUserSession(userInfo);
              console.log("Usuario autenticado:", userInfo);
            } catch (userError) {
              console.warn("No se pudo obtener info del usuario, pero el login fue exitoso:", userError);
              // Continuar con el login aunque no se pueda obtener la info del usuario
            }
            
            toast({
              title: "Inicio de sesión exitoso",
              description: "Bienvenido al Sistema UTA con Office 365",
            });
            
            // Limpiar la URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Actualizar el contexto de autenticación si existe la función
            if (refreshAuth) {
              await refreshAuth();
            }
            
            // Navegar a la página principal
            setLocation('/');
            
          } else {
            throw new Error(result.message || "Error en la respuesta del servidor");
          }
          
        } catch (error) {
          console.error("Error en OAuth callback:", error);
          toast({
            title: "Error de autenticación",
            description: error instanceof Error ? error.message : "Ocurrió un error durante la autenticación con Office 365",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
          sessionStorage.removeItem("oauth_state");
        }
      } else if (code && !state) {
        console.error("Callback recibido sin state parameter");
        toast({
          title: "Error de autenticación",
          description: "Parámetros de autenticación inválidos",
          variant: "destructive",
        });
      } else if (code && state && savedState !== state) {
        console.error("State mismatch:", { received: state, saved: savedState });
        toast({
          title: "Error de seguridad",
          description: "Estado de autenticación inválido",
          variant: "destructive",
        });
        sessionStorage.removeItem("oauth_state");
      }
    };

    handleOAuthCallback();
  }, [toast, setLocation, refreshAuth]);

  const loading = isLoading || authLoading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <img 
              src={logoPath} 
              alt="Universidad Técnica de Ambato" 
              className="h-16 w-auto"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              WsUtaSystem
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Sistema de Gestión de Talento Humano
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {/* Indicador de estado de WebSocket */}
          <div className={`mb-4 text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            WebSocket: {isConnected ? 'Conectado' : 'Desconectado'}
          </div>                   
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="local">Local</TabsTrigger>
              <TabsTrigger value="office365">Office 365</TabsTrigger>
            </TabsList>
            
            <TabsContent value="local">
              <form onSubmit={handleLocalLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuario</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Ingrese su usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    data-testid="input-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Ingrese su contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                  disabled={loading}
                  data-testid="button-login"
                >
                  {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="office365">
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                  Autentíquese usando su cuenta institucional de Office 365
                </p>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                  onClick={handleOffice365Login}
                  disabled={loading}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.6666 9.16667H21.6666V12.5H11.6666V9.16667Z" fill="white"/>
                    <path d="M11.6666 14.1667H21.6666V17.5H11.6666V14.1667Z" fill="white"/>
                    <path d="M1.66663 9.16667H9.16663V12.5H1.66663V9.16667Z" fill="white"/>
                    <path d="M1.66663 14.1667H9.16663V17.5H1.66663V14.1667Z" fill="white"/>
                    <path d="M11.6666 4.16667H21.6666V7.5H11.6666V4.16667Z" fill="white"/>
                    <path d="M1.66663 4.16667H9.16663V7.5H1.66663V4.16667Z" fill="white"/>
                  </svg>
                  {loading ? "Conectando con Office 365..." : "Iniciar sesión con Office 365"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
                    
          {/* Elimina o comenta el bloque de información de debug para producción */}
          {/* 
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Usuario de prueba: <strong>admin</strong></p>
            <p>Contraseña: <strong>admin</strong></p>
            <p className="mt-2 text-xs">
              ⏱️ Sesión automática: 15 minutos de inactividad
            </p>
          </div>
          */}
        </CardContent>
      </Card>
    </div>
  );
}