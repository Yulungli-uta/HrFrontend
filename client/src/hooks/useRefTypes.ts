// client/src/hooks/useRefTypes.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TiposReferenciaAPI } from "@/lib/api";
import type { ApiResponse, RefType } from "@/lib/api";

/**
 * [2026-09-17] HR.ref_Types tiene solo 619 filas en 109 categorías (catálogo chico y casi
 * estático) — antes cada componente pedía su categoría por separado al backend
 * (TiposReferenciaAPI.byCategory), ~91 llamadas dispersas en toda la app. Con esta clave de
 * caché única, React Query trae la tabla completa UNA sola vez (aunque 20 componentes la usen
 * al mismo tiempo) y todos filtran en memoria. Ver [[reftype-categories-convention]] para la
 * convención de categorías en sí — esto es solo la capa de fetching.
 */
export const REF_TYPES_QUERY_KEY = ["refTypes"] as const;

/**
 * Trae el catálogo completo. Úsalo cuando de verdad necesitas todas las categorías a la vez.
 * `enabled` es para diálogos que solo deben consultar mientras están abiertos (igual que ya
 * hacían varios `useQuery(byCategory(...))` sueltos antes de esta migración).
 */
export function useRefTypes(options?: { enabled?: boolean }) {
  return useQuery<ApiResponse<RefType[]>>({
    queryKey: REF_TYPES_QUERY_KEY,
    queryFn: () => TiposReferenciaAPI.list(),
    staleTime: 10 * 60_000,
    enabled: options?.enabled,
  });
}

/**
 * Filtra el catálogo compartido por una categoría — mismo shape de retorno que un
 * `useQuery(byCategory(...))` suelto (`data`/`isLoading`/`isError`), para que migrar un
 * call site sea cambiar una línea, no reescribir el componente. A diferencia del endpoint
 * `byCategory` (que devuelve 404 si la categoría no tiene registros), esto devuelve un array
 * vacío — más correcto: "no hay datos" no es un error.
 */
export function useRefTypesByCategory(category: string | undefined | null, options?: { enabled?: boolean }) {
  const { data, isLoading, isFetching, isError, error, refetch } = useRefTypes(options);

  const items = useMemo<RefType[]>(() => {
    if (!category || data?.status !== "success" || !Array.isArray(data.data)) return [];
    return data.data.filter((t: any) => t.category === category);
  }, [data, category]);

  return {
    data: items,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
}
