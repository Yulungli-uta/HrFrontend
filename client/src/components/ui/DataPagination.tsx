import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface DataPaginationProps {
  /** Página actual (base 1). */
  page: number;
  /** Total de páginas. */
  totalPages: number;
  /** Total de registros. */
  totalCount: number;
  /** Registros por página. */
  pageSize: number;
  /** Indica si existe página anterior. */
  hasPreviousPage: boolean;
  /** Indica si existe página siguiente. */
  hasNextPage: boolean;
  /** Callback para ir a una página específica. */
  onPageChange: (page: number) => void;
  /** Callback para cambiar el tamaño de página. */
  onPageSizeChange: (size: number) => void;
  /** Opciones de tamaño de página. Por defecto: [10, 20, 50, 100]. */
  pageSizeOptions?: number[];
  /** Si true, deshabilita todos los controles. */
  disabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Componente de paginación reutilizable para tablas de datos.
 * Se integra con el hook `usePaged` y el servicio `createApiService.listPaged`.
 *
 * Uso:
 * ```tsx
 * <DataPagination
 *   page={page}
 *   totalPages={totalPages}
 *   totalCount={totalCount}
 *   pageSize={pageSize}
 *   hasPreviousPage={hasPreviousPage}
 *   hasNextPage={hasNextPage}
 *   onPageChange={goToPage}
 *   onPageSizeChange={setPageSize}
 * />
 * ```
 */
export function DataPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  hasPreviousPage,
  hasNextPage,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  disabled = false,
}: DataPaginationProps) {
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-2 py-3">
      {/* Información de registros */}
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">
          {totalCount === 0
            ? 'Sin registros'
            : `Mostrando ${from}–${to} de ${totalCount.toLocaleString()} registros`}
        </p>

        {/* Selector de tamaño de página */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Filas por página
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => onPageSizeChange(Number(val))}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Controles de navegación */}
      <div className="flex items-center gap-1">
        {/* Primera página */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(1)}
          disabled={disabled || !hasPreviousPage}
          title="Primera página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Página anterior */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || !hasPreviousPage}
          title="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Indicador de página */}
        <span className="text-sm px-3 min-w-[80px] text-center">
          {totalPages === 0 ? '0 / 0' : `${page} / ${totalPages}`}
        </span>

        {/* Página siguiente */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || !hasNextPage}
          title="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Última página */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || !hasNextPage}
          title="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
