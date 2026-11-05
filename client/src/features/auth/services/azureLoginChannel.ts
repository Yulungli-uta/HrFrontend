// features/auth/services/azureLoginChannel.ts
//
// Canal entre la ventana de relevo del login (/auth/azure/relay) y la pestaña que espera el resultado.
// Usa BroadcastChannel; si el navegador no lo soporta (iOS Safari anterior a 15.4, algunos navegadores
// incrustados) o no deja crearlo, cae a eventos "storage" de localStorage, que también conectan pestañas
// del mismo origen. Si tampoco hay almacenamiento, el canal queda inerte y el login se recupera por el
// reclamo al servidor (AuthContext.tsx). Crear el canal nunca lanza: antes un navegador sin
// BroadcastChannel rompía el componente de autenticación completo.

export interface AzureLoginChannel {
  /** Envía un mensaje a las OTRAS pestañas/ventanas del mismo origen (no a esta instancia). */
  post: (message: unknown) => void;
  /** Escucha los mensajes de otras pestañas; devuelve la función para dejar de escuchar. */
  subscribe: (handler: (data: any) => void) => () => void;
  close: () => void;
}

/** Cuánto tiempo puede quedar un mensaje en localStorage (puede llevar un código de entrega de un solo uso). */
const STORAGE_MESSAGE_TTL_MS = 5_000;

const randomId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function fromBroadcastChannel(name: string): AzureLoginChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  try {
    const channel = new BroadcastChannel(name);
    return {
      post: (message) => {
        try {
          channel.postMessage(message);
        } catch {
          /* canal cerrado */
        }
      },
      subscribe: (handler) => {
        const listener = (event: MessageEvent) => handler(event.data);
        channel.addEventListener("message", listener);
        return () => channel.removeEventListener("message", listener);
      },
      close: () => channel.close(),
    };
  } catch {
    return null;
  }
}

function fromStorage(name: string): AzureLoginChannel {
  const key = `wsuta-channel:${name}`;
  const instanceId = randomId();
  const unsubscribers = new Set<() => void>();

  return {
    post: (message) => {
      try {
        const id = randomId();
        localStorage.setItem(key, JSON.stringify({ id, from: instanceId, data: message }));
        setTimeout(() => {
          try {
            const current = localStorage.getItem(key);
            if (current && (JSON.parse(current) as { id?: string }).id === id) {
              localStorage.removeItem(key);
            }
          } catch {
            /* ignore */
          }
        }, STORAGE_MESSAGE_TTL_MS);
      } catch {
        /* almacenamiento bloqueado: el reclamo al servidor cubre este caso */
      }
    },
    subscribe: (handler) => {
      if (typeof window === "undefined") return () => { };
      const listener = (event: StorageEvent) => {
        if (event.key !== key || !event.newValue) return;
        try {
          const parsed = JSON.parse(event.newValue) as { from?: string; data?: unknown };
          if (parsed.from === instanceId) return;
          handler(parsed.data);
        } catch {
          /* mensaje ajeno o corrupto */
        }
      };
      window.addEventListener("storage", listener);
      const unsubscribe = () => {
        window.removeEventListener("storage", listener);
        unsubscribers.delete(unsubscribe);
      };
      unsubscribers.add(unsubscribe);
      return unsubscribe;
    },
    close: () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    },
  };
}

/** Abre el canal del login: BroadcastChannel si existe, si no localStorage. Nunca lanza. */
export function openAzureLoginChannel(name: string): AzureLoginChannel {
  return fromBroadcastChannel(name) ?? fromStorage(name);
}
