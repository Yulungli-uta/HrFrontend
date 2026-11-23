import * as React from "react"

import { useIsDesktop } from "@/hooks/useIsDesktop"
import { cn } from "@/lib/utils"

export interface ResponsiveDataViewProps<T> {
  items: readonly T[]
  /** Vista de tabla (escritorio). Normalmente un <Table> con las filas de `items`. */
  renderTable: (items: readonly T[]) => React.ReactNode
  /** Vista de tarjeta para pantallas pequeñas: una por elemento. */
  renderCard: (item: T, index: number) => React.ReactNode
  getKey: (item: T, index: number) => React.Key
  /** Contenido cuando no hay elementos (por defecto no muestra nada). */
  empty?: React.ReactNode
  className?: string
}

/**
 * Muestra una tabla en escritorio y una lista de tarjetas en móvil. Evita las tablas apretadas en 360 px.
 * Los reportes anchos no lo usan: allí corresponde el scroll horizontal del componente Table.
 */
export function ResponsiveDataView<T>({ items, renderTable, renderCard, getKey, empty, className }: ResponsiveDataViewProps<T>) {
  const isDesktop = useIsDesktop()
  if (items.length === 0) return <>{empty ?? null}</>
  if (isDesktop) return <div className={className}>{renderTable(items)}</div>
  return (
    <ul className={cn("grid gap-3", className)}>
      {items.map((item, i) => (
        <li key={getKey(item, i)} className="rounded-lg border border-border bg-card p-3 shadow-sm">
          {renderCard(item, i)}
        </li>
      ))}
    </ul>
  )
}
