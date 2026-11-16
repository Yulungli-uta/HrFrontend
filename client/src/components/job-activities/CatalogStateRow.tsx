// src/components/job-activities/CatalogStateRow.tsx
import { AlertCircle, Loader2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";

interface Props {
  colSpan: number;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  /** true si no hay filas que mostrar. */
  isEmpty: boolean;
  emptyText: string;
}

/** Fila de estado de las tablas de catálogos: cargando, error del servidor o sin resultados. */
export function CatalogStateRow({ colSpan, isLoading, isError, errorMessage, isEmpty, emptyText }: Props) {
  if (isLoading && isEmpty) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="py-6 text-center text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
          </span>
        </TableCell>
      </TableRow>
    );
  }
  if (isError) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="py-6 text-center text-sm text-destructive">
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {errorMessage ?? "No se pudo cargar el listado."}
          </span>
        </TableCell>
      </TableRow>
    );
  }
  if (isEmpty) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="py-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </TableCell>
      </TableRow>
    );
  }
  return null;
}
