import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Tarjeta de indicador (KPI): tinte suave del tono, franja izquierda de 3 px e icono en círculo.
 * Los colores salen de los tokens (styles/semantic.css), por lo que cambian solos con el tema y el modo oscuro.
 * El color debe significar algo: estado (success, warning, danger, info) o categoría (cat-1…6); primary es el neutro de marca.
 */
const statCardVariants = cva("flex items-center gap-3 rounded-lg border border-l-[3px] p-4 shadow-sm text-left", {
  variants: {
    tone: {
      primary: "border-primary/20 border-l-primary bg-primary/10",
      success: "border-success/20 border-l-success bg-success/10",
      warning: "border-warning/25 border-l-warning bg-warning/10",
      danger: "border-destructive/20 border-l-destructive bg-destructive/10",
      info: "border-info/20 border-l-info bg-info/10",
      "cat-1": "border-cat-1/20 border-l-cat-1 bg-cat-1/10",
      "cat-2": "border-cat-2/20 border-l-cat-2 bg-cat-2/10",
      "cat-3": "border-cat-3/20 border-l-cat-3 bg-cat-3/10",
      "cat-4": "border-cat-4/20 border-l-cat-4 bg-cat-4/10",
      "cat-5": "border-cat-5/20 border-l-cat-5 bg-cat-5/10",
      "cat-6": "border-cat-6/20 border-l-cat-6 bg-cat-6/10",
    },
  },
  defaultVariants: { tone: "primary" },
})

const iconTone: Record<NonNullable<VariantProps<typeof statCardVariants>["tone"]>, string> = {
  primary: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
  info: "bg-info/15 text-info",
  "cat-1": "bg-cat-1/15 text-cat-1",
  "cat-2": "bg-cat-2/15 text-cat-2",
  "cat-3": "bg-cat-3/15 text-cat-3",
  "cat-4": "bg-cat-4/15 text-cat-4",
  "cat-5": "bg-cat-5/15 text-cat-5",
  "cat-6": "bg-cat-6/15 text-cat-6",
}

export interface StatCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">, VariantProps<typeof statCardVariants> {
  label: React.ReactNode
  value: React.ReactNode
  icon?: LucideIcon
  /** Alternativa a `icon` cuando el icono ya viene como elemento React. */
  iconNode?: React.ReactNode
  /** Muestra un indicador de carga en lugar del valor. */
  loading?: boolean
  /** Texto secundario bajo el valor. */
  hint?: React.ReactNode
}

export function StatCard({ label, value, hint, icon: Icon, iconNode, loading, tone, className, onClick, ...props }: StatCardProps) {
  const t = tone ?? "primary"
  const interactive = typeof onClick === "function"
  return (
    <div
      className={cn(statCardVariants({ tone }), interactive && "cursor-pointer transition-colors hover:brightness-[0.97] dark:hover:brightness-110", className)}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>) } } : undefined}
      {...props}
    >
      {Icon || iconNode ? (
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", iconTone[t])}>
          {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : iconNode}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold leading-tight text-foreground">{loading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-muted align-middle" aria-label="Cargando" /> : value}</p>
        {hint ? <p className="mt-0.5 break-words text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}
