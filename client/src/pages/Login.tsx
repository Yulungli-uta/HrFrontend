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

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("local");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { login, loginWithOffice365, isLoading: authLoading, isAuthenticated } = useAuth();

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
    await loginWithOffice365();
  };

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const savedState = sessionStorage.getItem("oauth_state");

      if (code && state && savedState === state) {
        setIsLoading(true);
        try {
          const tokens = await authService.handleAzureCallback(code, state);
          const userInfo = await authService.getCurrentUser(tokens.accessToken);
          
          tokenService.setTokens(tokens);
          tokenService.setUserSession(userInfo);
          console.log("token: ", tokens);
          toast({
            title: "Inicio de sesión exitoso",
            description: "Bienvenido al Sistema UTA con Office 365",
          });
          
          window.history.replaceState({}, document.title, window.location.pathname);

         // setLocation('/');
          window.location.reload();
        } catch (error) {
          toast({
            title: "Error de autenticación",
            description: "Ocurrió un error durante la autenticación con Office 365",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
          sessionStorage.removeItem("oauth_state");
        }
      }
    };

    handleOAuthCallback();
  }, [toast]);

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