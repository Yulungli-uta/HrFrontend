import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const buttonVariants = cva(
  "inline-flex max-w-full items-center justify-center gap-2 whitespace-normal text-center sm:whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        success:
          "bg-success text-success-foreground hover:bg-success/90",
        warning:
          "bg-warning text-warning-foreground hover:bg-warning/90",
        outline:
          "border border-input bg-card hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        info: "bg-info text-info-foreground hover:bg-info/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-10 px-4 py-2",
        sm: "min-h-9 rounded-md px-3 [@media(pointer:coarse)]:min-h-10",
        lg: "min-h-11 rounded-md px-8",
        icon: "h-10 w-10",
        iconSm: "h-8 w-8 [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10",
        iconTouch: "h-9 w-9 [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /**
   * Texto del tooltip. Los botones de solo icono (size icon, iconSm, iconTouch) lo toman de `aria-label` o `title`,
   * de modo que TODO botón de icono muestra su descripción. Con `false` se desactiva.
   */
  tooltip?: string | false
  tooltipSide?: "top" | "right" | "bottom" | "left"
}

const ICON_SIZES = new Set(["icon", "iconSm", "iconTouch"])

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, tooltip, tooltipSide = "top", title, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const isIcon = !!size && ICON_SIZES.has(size)
    const label = tooltip === false ? undefined : tooltip ?? (isIcon ? props["aria-label"] ?? title : undefined)
    const button = (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        title={label ? undefined : title}
        {...props}
      />
    )
    if (!label) return button
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side={tooltipSide}>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
