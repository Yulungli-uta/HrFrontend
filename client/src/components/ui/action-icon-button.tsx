import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActionTone = "default" | "primary" | "success" | "warning" | "destructive" | "muted";

const toneClassName: Record<ActionTone, string> = {
  default: "text-foreground hover:bg-accent hover:text-accent-foreground",
  primary: "text-primary hover:bg-primary/10 hover:text-primary",
  success: "text-success hover:bg-success/10 hover:text-success",
  warning: "text-warning hover:bg-warning/10 hover:text-warning",
  destructive: "text-destructive hover:bg-destructive/10 hover:text-destructive",
  muted: "text-muted-foreground hover:bg-accent hover:text-foreground",
};

export interface ActionIconButtonProps
  extends Omit<ButtonProps, "children" | "size" | "variant"> {
  icon: LucideIcon;
  label: string;
  tone?: ActionTone;
  iconClassName?: string;
  tooltipSide?: "top" | "right" | "bottom" | "left";
  touch?: boolean;
}

export const ActionIconButton = React.forwardRef<
  HTMLButtonElement,
  ActionIconButtonProps
>(
  (
    {
      icon: Icon,
      label,
      tone = "default",
      className,
      iconClassName,
      tooltipSide = "top",
      touch = false,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    // El tooltip lo muestra Button (un solo lugar para todos los botones de icono).
    return (
      <Button
        ref={ref}
        type={type}
        variant="ghost"
        size={touch ? "iconTouch" : "iconSm"}
        className={cn("shrink-0", toneClassName[tone], className)}
        aria-label={props["aria-label"] ?? label}
        tooltip={disabled ? false : label}
        tooltipSide={tooltipSide}
        disabled={disabled}
        {...props}
      >
        <Icon className={cn("h-4 w-4", iconClassName)} />
        <span className="sr-only">{label}</span>
      </Button>
    )
  }
)

ActionIconButton.displayName = "ActionIconButton";
