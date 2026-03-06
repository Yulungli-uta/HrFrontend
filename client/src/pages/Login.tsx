import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
// import logoPath from "../../public/LogoUTA.png";
import logoPath from "@/assets/LogoUTA.png";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { parseApiError } from '@/lib/error-handling';

const DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("local");

  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const {
    login,
    loginWithOffice365,
    isLoading: authLoading,
    isAuthenticated,
    isWebSocketConnected
  } = useAuth();

  const loading = localLoading || authLoading;

  // ✅ Si ya está autenticado, redirigir
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      DEBUG && console.log("✅ Usuario autenticado, redirigiendo a /");
      setLocation("/");
    }
  }, [isAuthenticated, authLoading, setLocation]);

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoading(true);

    try {
      DEBUG && console.log("🔐 Iniciando login local...", { username });
      console.log("[ENV]", {
        MODE: import.meta.env.MODE,
        API: import.meta.env.VITE_API_BASE,
        AUTH: import.meta.env.VITE_AUTH_API_BASE_URL,
        DEBUG: import.meta.env.VITE_DEBUG_AUTH,
      });

      const success = await login(username, password);

      if (!success) {
        // ❌ NO lanzamos Error, solo mostramos un toast (AuthContext ya suele mostrar uno)
        DEBUG && console.warn("[LOGIN] login() devolvió false (credenciales inválidas o error interno)");
        toast({
          title: "No se pudo iniciar sesión",
          description: "Verifique sus credenciales o intente nuevamente.",
          variant: "destructive",
        });
        return;
      }

      DEBUG && console.log("✅ Login local exitoso (login() devolvió true)");
      // La redirección la hace el useEffect cuando isAuthenticated cambie a true

    } catch (error: unknown) {
      console.error("❌ Error inesperado en login local:", error);
      toast({
        title: "Error de autenticación",
        description:
          parseApiError(error).message,
        variant: "destructive"
      });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleOffice365Login = async () => {
    setLocalLoading(true);
    try {
      DEBUG && console.log("🔐 Iniciando login Office 365...");
      await loginWithOffice365();
      // La navegación la hace el flujo WebSocket + AuthContext
    } catch (error) {
      console.error("❌ Error en Office 365 login:", error);
      toast({
        title: "Error de autenticación",
        description: "Error al iniciar sesión con Office 365",
        variant: "destructive"
      });
    } finally {
      setLocalLoading(false);
    }
  };

  // Pantalla de carga si ya está autenticado pero todavía resolviendo cosas
  if (loading && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
              <p className="text-gray-600 dark:text-gray-300">
                Cargando información del usuario...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pantalla de login normal
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
          {/* Estado WebSocket */}
          <div
            className={`mb-4 text-sm text-center ${
              isWebSocketConnected ? "text-green-600" : "text-amber-600"
            }`}
          >
            WebSocket: {isWebSocketConnected ? "✓ Conectado" : "○ Desconectado"}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="local">Local</TabsTrigger>
              <TabsTrigger value="office365">Office 365</TabsTrigger>
            </TabsList>

            {/* LOGIN LOCAL */}
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
                    disabled={loading}
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
                    disabled={loading}
                    data-testid="input-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                  disabled={loading}
                  data-testid="button-login"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    "Iniciar Sesión"
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* LOGIN OFFICE 365 */}
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
                  <svg
                    className="w-5 h-5 mr-2"
                    viewBox="0 0 23 23"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M11.6666 9.16667H21.6666V12.5H11.6666V9.16667Z" fill="white" />
                    <path d="M11.6666 14.1667H21.6666V17.5H11.6666V14.1667Z" fill="white" />
                    <path d="M1.66663 9.16667H9.16663V12.5H1.66663V9.16667Z" fill="white" />
                    <path d="M1.66663 14.1667H9.16663V17.5H1.66663V14.1667Z" fill="white" />
                    <path d="M11.6666 4.16667H21.6666V7.5H11.6666V4.16667Z" fill="white" />
                    <path d="M1.66663 4.16667H9.16663V7.5H1.66663V4.16667Z" fill="white" />
                  </svg>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Conectando con Office 365...
                    </>
                  ) : (
                    "Iniciar sesión con Office 365"
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
