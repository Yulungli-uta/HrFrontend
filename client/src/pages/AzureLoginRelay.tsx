// src/pages/AzureLoginRelay.tsx
// Pagina intermedia, sin sesion, para el popup de login AzureAD (backend Python).
// login.microsoftonline.com envia Cross-Origin-Opener-Policy: same-origin, lo que
// corta window.opener de forma permanente en cuanto el popup navega ahi — por eso
// el callback (routers/auth.py::azure_callback) ya no manda el resultado con
// window.opener.postMessage, sino que redirige el popup a esta pagina (mismo
// origen que la pestana que lo abrio) para avisar via BroadcastChannel, que no
// depende de la relacion opener/opened. Ver AZURE_LOGIN_BROADCAST_CHANNEL en
// features/auth/constants/sessionConstants.ts y el listener en AuthContext.tsx.
// Registrada fuera del sistema de rutas protegidas normal, ver routes/AppRouter.tsx.
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AZURE_LOGIN_BROADCAST_CHANNEL } from "@/features/auth/constants/sessionConstants";

export default function AzureLoginRelay() {
  useEffect(() => {
    const deliveryCode = new URLSearchParams(window.location.search).get("deliveryCode");
    if (deliveryCode) {
      const channel = new BroadcastChannel(AZURE_LOGIN_BROADCAST_CHANNEL);
      channel.postMessage({ type: "AZURE_LOGIN_DELIVERY", deliveryCode });
      channel.close();
    }
    window.close();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
        <p className="text-gray-600 dark:text-gray-400 text-sm">Completando inicio de sesión…</p>
      </div>
    </div>
  );
}
