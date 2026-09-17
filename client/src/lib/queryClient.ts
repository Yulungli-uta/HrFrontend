import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { logger } from "@/lib/logger";

/**
 * queryFn por defecto: falla explícitamente.
 *
 * Antes existía un queryFn por defecto que hacía fetch(queryKey.join("/")) SIN
 * header Authorization: cualquier useQuery sin queryFn explícito generaba una
 * petición no autenticada silenciosa. Ningún consumidor lo usaba (verificado),
 * así que ahora el error es inmediato y descriptivo en lugar de un request
 * fantasma sin token.
 */
const missingQueryFn: QueryFunction = ({ queryKey }) => {
  throw new Error(
    `useQuery sin queryFn explícito (queryKey: ${JSON.stringify(queryKey)}). ` +
      "Define un queryFn que use los servicios de @/lib/api (apiFetch), " +
      "que inyectan el token de autenticación."
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: missingQueryFn,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // No reintentar errores de cliente (4xx) excepto 429.
        // [2026-09-17] El parseo anterior (`error.message.split(":")[0]`) asumía que el
        // mensaje empezaba con el status ("404: ..."), pero el formato real usado en la
        // app es "HTTP 404: ..." (ver permissionService.ts) — parseInt("HTTP 404") da NaN,
        // así que la condición nunca se cumplía y SIEMPRE se reintentaba, incluso en 4xx.
        // Se busca el primer número de 3 dígitos en el mensaje en vez de asumir su posición.
        if (error instanceof Error) {
          const match = error.message.match(/\b(\d{3})\b/);
          const status = match ? parseInt(match[1], 10) : NaN;
          if (status >= 400 && status < 500 && status !== 429) {
            return false;
          }
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
      onError: (error) => {
        logger.error("MUTATION", "Error en mutación", error);
      },
    },
  },
});
