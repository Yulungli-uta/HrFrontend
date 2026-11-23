import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Etiqueta de estado con tonos semánticos. Los colores salen de los tokens (styles/semantic.css),
 * por lo que cambian solos con el tema y el modo oscuro. No usar clases de paleta (bg-success/10…).
 */
const statusBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/40 bg-warning/10 text-warning",
        danger: "border-destructive/30 bg-destructive/10 text-destructive",
        info: "border-info/30 bg-info/10 text-info",
        primary: "border-primary/30 bg-primary/10 text-primary",
        neutral: "border-border bg-muted text-muted-foreground",
        "cat-1": "border-cat-1/30 bg-cat-1/10 text-cat-1",
        "cat-2": "border-cat-2/30 bg-cat-2/10 text-cat-2",
        "cat-3": "border-cat-3/30 bg-cat-3/10 text-cat-3",
        "cat-4": "border-cat-4/30 bg-cat-4/10 text-cat-4",
        "cat-5": "border-cat-5/30 bg-cat-5/10 text-cat-5",
        "cat-6": "border-cat-6/30 bg-cat-6/10 text-cat-6",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
)

export type StatusTone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {}

export function StatusBadge({ className, tone, ...props }: StatusBadgeProps) {
  return <span className={cn(statusBadgeVariants({ tone }), className)} {...props} />
}
