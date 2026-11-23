import * as React from "react"

import { cn } from "@/lib/utils"

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode
  description?: React.ReactNode
  /** Icono opcional a la izquierda del título. */
  icon?: React.ReactNode
  /** Acciones principales (botones). En móvil pasan debajo del título. */
  actions?: React.ReactNode
}

/**
 * Cabecera estándar de página: título, descripción y acciones.
 * En pantallas pequeñas apila el contenido y las acciones se envuelven; en escritorio van a la derecha.
 */
export function PageHeader({ title, description, icon, actions, className, ...props }: PageHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4", className)}
      {...props}
    >
      <div className="min-w-0 flex-1">
        <h1 className="page-title text-xl sm:text-2xl">
          {icon}
          <span className="min-w-0 break-words">{title}</span>
        </h1>
        {description ? <p className="page-subtitle">{description}</p> : null}
      </div>
      {actions ? <ActionBar className="sm:justify-end">{actions}</ActionBar> : null}
    </div>
  )
}

export interface ActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** En móvil el botón primario ocupa todo el ancho (por defecto true). */
  stackOnMobile?: boolean
}

/**
 * Fila de botones que se envuelve en lugar de deformarse. Con `stackOnMobile`, en pantallas pequeñas
 * cada botón ocupa el ancho disponible para que sean fáciles de tocar.
 */
export function ActionBar({ className, stackOnMobile = true, ...props }: ActionBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        stackOnMobile && "max-sm:[&>button]:flex-1 max-sm:[&>a]:flex-1",
        className
      )}
      {...props}
    />
  )
}
