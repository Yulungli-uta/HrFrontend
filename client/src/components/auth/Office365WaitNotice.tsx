// components/auth/Office365WaitNotice.tsx
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AzureLoginPhase } from "@/features/auth";

/** Segundos de espera tras los cuales se ofrece ayuda al usuario. */
const LONG_WAIT_SECONDS = 20;

interface Office365WaitNoticeProps {
  phase: Exclude<AzureLoginPhase, "idle">;
  onCancel: () => void;
}

/**
 * Se muestra en lugar del botón de Office 365 mientras el login está en curso. Antes la pantalla de
 * login desaparecía detrás de una carga genérica y el usuario no sabía si debía hacer algo en la
 * ventana de Microsoft, esperar o reintentar.
 */
export default function Office365WaitNotice({ phase, onCancel }: Office365WaitNoticeProps) {
  const [waitedLong, setWaitedLong] = useState(false);

  useEffect(() => {
    if (phase !== "waiting") {
      setWaitedLong(false);
      return;
    }
    const id = setTimeout(() => setWaitedLong(true), LONG_WAIT_SECONDS * 1000);
    return () => clearTimeout(id);
  }, [phase]);

  const completing = phase === "completing";

  return (
    <div className="space-y-3 text-center" role="status" aria-live="polite">
      <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {completing ? "Completando el inicio de sesión…" : "Esperando la confirmación de Microsoft…"}
      </div>
      <p className="text-xs text-muted-foreground">
        {completing
          ? "Ya casi está, estamos preparando tu acceso."
          : "Completa el inicio de sesión en la ventana emergente de Microsoft."}
      </p>
      {!completing && waitedLong && (
        <p className="text-xs text-warning">
          ¿Ya cerraste la ventana de Microsoft o dice que terminó pero aquí no avanza? Pulsa «Cancelar» e inténtalo de
          nuevo.
        </p>
      )}
      {!completing && (
        <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
          Cancelar
        </Button>
      )}
    </div>
  );
}
