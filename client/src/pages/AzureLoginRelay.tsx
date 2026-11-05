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
//
// El aviso se reenvia hasta que la pestana lo confirme (AZURE_LOGIN_ACK) o venza el margen: antes se
// publicaba una sola vez y la ventana se cerraba al instante, asi que un aviso perdido no se enteraba
// nadie. Si el margen vence, la pestana igualmente recupera el login reclamandolo al servidor.
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AZURE_LOGIN_BROADCAST_CHANNEL } from "@/features/auth/constants/sessionConstants";
import { openAzureLoginChannel } from "@/features/auth/services/azureLoginChannel";

/** Cada cuanto se reenvia el aviso mientras no llegue la confirmacion. */
const RESEND_INTERVAL_MS = 500;
/** Tiempo maximo que la ventana espera la confirmacion antes de cerrarse. */
const MAX_WAIT_MS = 4_000;

export default function AzureLoginRelay() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const deliveryCode = params.get("deliveryCode");
    const loginFailed = params.get("loginFailed") === "1";
    if (!deliveryCode && !loginFailed) {
      window.close();
      return;
    }

    // loginFailed: la pestaña que espera debe dejar de esperar y mostrar el motivo (code + ref genericos).
    const message = loginFailed
      ? {
          type: "AZURE_LOGIN_FAILED",
          code: params.get("code") ?? undefined,
          ref: params.get("ref") ?? undefined,
        }
      : { type: "AZURE_LOGIN_DELIVERY", deliveryCode };

    // Nunca lanza: sin BroadcastChannel usa localStorage (ver azureLoginChannel.ts).
    const channel = openAzureLoginChannel(AZURE_LOGIN_BROADCAST_CHANNEL);
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(resendTimer);
      clearTimeout(maxWaitTimer);
      channel.close();
      window.close();
    };

    channel.subscribe((data) => {
      if (data?.type === "AZURE_LOGIN_ACK") finish();
    });

    channel.post(message);
    const resendTimer = setInterval(() => channel.post(message), RESEND_INTERVAL_MS);
    const maxWaitTimer = setTimeout(finish, MAX_WAIT_MS);

    return () => {
      finished = true;
      clearInterval(resendTimer);
      clearTimeout(maxWaitTimer);
      channel.close();
    };
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
