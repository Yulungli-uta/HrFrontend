import { useCallback, useRef } from "react";

export interface UseInfiniteScrollSentinelOptions {
  /** Se llama cuando el centinela entra en la zona de precarga. */
  onReach: () => void;
  /** Si es false el observador no actúa (sin más páginas, cargando o en escritorio). */
  enabled: boolean;
  /** Distancia de precarga. Por defecto 0: la página siguiente se pide solo al llegar a la última tarjeta. */
  rootMargin?: string;
}

/**
 * Devuelve una `ref` para un elemento centinela ubicado al final de una lista.
 * Cuando el centinela se acerca al viewport dispara `onReach` (una vez por cada entrada).
 * Funciona con cualquier contenedor con scroll porque observa contra el viewport.
 */
export function useInfiniteScrollSentinel({ onReach, enabled, rootMargin = "0px" }: UseInfiniteScrollSentinelOptions) {
  const onReachRef = useRef(onReach);
  onReachRef.current = onReach;

  const observerRef = useRef<IntersectionObserver | null>(null);

  return useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node || !enabled || typeof IntersectionObserver === "undefined") return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) onReachRef.current();
        },
        { rootMargin }
      );
      observer.observe(node);
      observerRef.current = observer;
    },
    [enabled, rootMargin]
  );
}
