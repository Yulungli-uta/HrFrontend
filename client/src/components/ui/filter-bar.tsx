import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Barra de filtros: una columna en móvil, fila que se envuelve en tablet y escritorio.
 * Cada hijo ocupa todo el ancho en móvil; en escritorio se ajusta a su contenido (`min-w` mediante className del hijo).
 */
export function FilterBar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end [&>*]:min-w-0 max-sm:[&>*]:w-full",
        className
      )}
      {...props}
    />
  )
}
