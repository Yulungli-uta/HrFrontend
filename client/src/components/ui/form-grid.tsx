import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const formGridVariants = cva("grid gap-4 grid-cols-1", {
  variants: {
    columns: {
      1: "",
      2: "sm:grid-cols-2",
      3: "sm:grid-cols-2 lg:grid-cols-3",
      4: "sm:grid-cols-2 lg:grid-cols-4",
    },
  },
  defaultVariants: { columns: 2 },
})

export interface FormGridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formGridVariants> {}

/** Rejilla de campos de formulario: 1 columna en móvil y hasta 2, 3 o 4 en pantallas mayores. */
export function FormGrid({ className, columns, ...props }: FormGridProps) {
  return <div className={cn(formGridVariants({ columns }), className)} {...props} />
}
