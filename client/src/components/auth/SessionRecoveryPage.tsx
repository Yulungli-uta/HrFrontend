// components/auth/SessionRecoveryPage.tsx
import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth";

interface SessionRecoveryPageProps {
  /** Código para comunicar a DITIC (ej. S-RED-1323). */
  code: string;
}

/**
 * Se muestra cuando no se pudo preparar la sesión y el cierre automático ya se aplicó hace poco
 * (freno anti-ciclo). Evita un bucle de cerrar/abrir sesión y da un código para dar seguimiento.
 */
export default function SessionRecoveryPage({ code }: SessionRecoveryPageProps) {
  const { refreshAuth, logout } = useAuth();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await refreshAuth();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] p-8">
      <div className="max-w-md w-full bg-card rounded-lg shadow-xl p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-3">No pudimos iniciar tu sesión</h1>
        <p className="text-muted-foreground mb-4 leading-relaxed">
          Si el problema continúa, avisa a DITIC e indícale este código:
        </p>
        <p className="font-mono text-lg font-semibold text-foreground bg-muted rounded px-3 py-2 mb-6">
          {code}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleRetry} disabled={retrying} className="flex items-center gap-2">
            {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Reintentar
          </Button>
          <Button variant="outline" onClick={() => logout()} disabled={retrying}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
