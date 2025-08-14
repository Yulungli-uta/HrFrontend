import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import logoPath from "@assets/LogoUTA.png";

interface LoginPageProps {
  onLogin: (username: string, password: string) => boolean;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simular delay de autenticación
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = onLogin(username, password);
    
    if (success) {
      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido al Sistema UTA",
      });
      setLocation("/");
    } else {
      toast({
        title: "Error de autenticación",
        description: "Usuario o contraseña incorrectos",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

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
          <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Usuario de prueba: <strong>admin</strong></p>
            <p>Contraseña: <strong>admin</strong></p>
            <p className="mt-2 text-xs">
              ⏱️ Sesión automática: 15 minutos de inactividad
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}