import { ArrowUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";

export interface InfiniteListFooterProps {
  /** Registros ya cargados en la lista. */
  loadedCount: number;
  /** Total de registros según el servidor. */
  totalCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** Error al pedir la página siguiente (lo ya cargado se conserva). */
  isError?: boolean;
  onLoadMore: () => void;
  /** Nombre en plural para los textos, p. ej. "usuarios". */
  itemLabel?: string;
}

/** Busca el contenedor con scroll más cercano (la página o un panel interno) y lo lleva al inicio. */
function scrollToTop(from: HTMLElement | null) {
  let node: HTMLElement | null = from?.parentElement ?? null;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      node.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    node = node.parentElement;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Pie de lista para scroll infinito en móvil: precarga automática de la página siguiente, esqueletos de carga,
 * contador "Mostrando X de Y", botón de respaldo "Cargar más", reintento si falla y mensaje de fin de lista.
 * Es genérico: no conoce el tipo de registro ni la pantalla.
 */
export function InfiniteListFooter({
  loadedCount,
  totalCount,
  hasNextPage,
  isFetchingNextPage,
  isError = false,
  onLoadMore,
  itemLabel = "registros",
}: InfiniteListFooterProps) {
  const sentinelRef = useInfiniteScrollSentinel({
    onReach: onLoadMore,
    enabled: hasNextPage && !isFetchingNextPage && !isError,
  });

  const summary = totalCount === 0 ? "Sin registros" : `Mostrando ${loadedCount.toLocaleString()} de ${totalCount.toLocaleString()} ${itemLabel}`;

  return (
    <div className="mt-3 space-y-3">
      {isFetchingNextPage && (
        <div className="grid gap-3" aria-hidden="true">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      )}

      {/* Centinela: al acercarse al viewport dispara la carga de la página siguiente */}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />

      <div className="flex flex-col items-center gap-2 pb-2 text-center">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {summary}
        </p>

        {isError && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-destructive">No se pudo cargar más {itemLabel}.</p>
            <Button variant="outline" size="sm" onClick={onLoadMore}>
              Reintentar
            </Button>
          </div>
        )}

        {!isError && hasNextPage && !isFetchingNextPage && (
          <Button variant="outline" size="sm" onClick={onLoadMore}>
            Cargar más
          </Button>
        )}

        {isFetchingNextPage && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Cargando…
          </p>
        )}

        {!hasNextPage && totalCount > 0 && <p className="text-xs text-muted-foreground">Has visto todos los {itemLabel}.</p>}

        {loadedCount > 40 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={(event) => scrollToTop(event.currentTarget)}
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
            Volver arriba
          </Button>
        )}
      </div>
    </div>
  );
}
