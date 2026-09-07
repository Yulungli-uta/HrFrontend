// src/components/BrowserCompatibilityDialog.tsx
//
// Aviso informativo (no bloqueante) cuando el navegador del usuario está por debajo de
// la versión mínima recomendada, o no se pudo identificar con confianza. Se evalúa una
// sola vez al montar la app y se descarta por el resto de la sesión si el usuario elige
// continuar (sessionStorage — nunca se envía ni se guarda nada del lado del servidor).
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { checkBrowserCompatibility, type BrowserName } from "@/lib/browserCompatibility";

const DISMISS_KEY = "wsuta-browser-compat-dismissed";

const UPDATE_LINKS: Partial<Record<BrowserName, { label: string; url: string }>> = {
  Chrome: { label: "Actualizar Google Chrome", url: "https://www.google.com/chrome/" },
  Edge: { label: "Actualizar Microsoft Edge", url: "https://www.microsoft.com/edge" },
  Firefox: { label: "Actualizar Mozilla Firefox", url: "https://www.mozilla.org/firefox/new/" },
  Safari: { label: "Cómo actualizar Safari (soporte de Apple)", url: "https://support.apple.com/HT204416" },
};

function wasAlreadyDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // Modo privado extremo o sessionStorage deshabilitado: no persiste entre recargas,
    // pero tampoco debe romper la app.
    return false;
  }
}

function markDismissed() {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Sin persistencia disponible — el popup podría reaparecer en la misma sesión si el
    // usuario recarga, pero eso no bloquea nada; se ignora en silencio.
  }
}

export function BrowserCompatibilityDialog() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof checkBrowserCompatibility> | null>(null);

  useEffect(() => {
    if (wasAlreadyDismissed()) return;
    const check = checkBrowserCompatibility();
    if (!check.isSupported) {
      setResult(check);
      setOpen(true);
    }
  }, []);

  const handleContinue = () => {
    markDismissed();
    setOpen(false);
  };

  if (!result) return null;

  const { browser, isKnown, minimumVersionLabel } = result;
  const updateLink = isKnown && browser.name !== "Internet Explorer" ? UPDATE_LINKS[browser.name] : undefined;

  return (
    <Dialog open={open} onOpenChange={v => !v && handleContinue()}>
      <DialogContent className="sm:max-w-md" aria-describedby="browser-compat-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            Navegador no compatible o desactualizado
          </DialogTitle>
          <DialogDescription id="browser-compat-description">
            {isKnown ? (
              <>
                Detectamos <strong>{browser.name} {browser.versionLabel ?? ""}</strong>
                {minimumVersionLabel && <> — la versión mínima recomendada es <strong>{minimumVersionLabel}</strong>.</>}
              </>
            ) : (
              "No pudimos identificar con certeza tu navegador o su versión."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            Algunas funciones del sistema —como el inicio de sesión institucional, la firma
            electrónica, la ubicación, la carga/descarga de documentos o los calendarios—
            podrían no funcionar correctamente con esta versión.
          </p>
          <p>Te recomendamos actualizar a una versión más reciente:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Google Chrome 111 o superior</li>
            <li>Microsoft Edge 111 o superior</li>
            <li>Mozilla Firefox 121 o superior</li>
            <li>Safari (macOS/iOS) 16.4 o superior</li>
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleContinue} className="sm:mr-auto">
            Continuar de todas formas
          </Button>
          {updateLink && (
            <Button asChild>
              <a href={updateLink.url} target="_blank" rel="noopener noreferrer">
                {updateLink.label}
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
