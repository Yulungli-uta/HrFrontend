import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Tarjeta de registro estándar para listas en móvil (estándar UI_STANDARDS §5.1). */

type AccentTone = "success" | "warning" | "danger" | "info" | "primary" | "muted";

const ACCENT_CLASS: Record<AccentTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  primary: "bg-primary",
  muted: "bg-muted-foreground/40",
};

/** Clases literales (Tailwind no detecta nombres armados) del tinte del avatar por categoría. */
const AVATAR_TONES = [
  "bg-cat-1/15 text-cat-1",
  "bg-cat-2/15 text-cat-2",
  "bg-cat-3/15 text-cat-3",
  "bg-cat-4/15 text-cat-4",
  "bg-cat-5/15 text-cat-5",
  "bg-cat-6/15 text-cat-6",
] as const;

/** Color estable por registro: el mismo identificador siempre produce el mismo tono. */
export function avatarToneFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

/** Convierte "LUIS ALONSO RAMIREZ" en "Luis Alonso Ramirez". */
export function titleCase(text: string): string {
  return text
    .toLocaleLowerCase("es-EC")
    .replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) => space + letter.toLocaleUpperCase("es-EC"));
}

/** Iniciales (máximo 2) a partir de un nombre; cae al identificador si no hay nombre. */
export function initialsOf(name: string | null | undefined, fallback = "?"): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return fallback.slice(0, 2).toUpperCase();
}

export interface RecordAvatarProps {
  /** Texto del que salen las iniciales. */
  name?: string | null;
  /** Identificador estable para escoger el color. */
  seed: string;
  /** Icono en lugar de iniciales (para registros sin persona: parámetros, contratos, etc.). */
  icon?: LucideIcon;
  className?: string;
}

export function RecordAvatar({ name, seed, icon: Icon, className }: RecordAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        avatarToneFor(seed),
        className
      )}
    >
      {Icon ? <Icon className="h-5 w-5" /> : initialsOf(name, seed)}
    </span>
  );
}

export interface RecordMeta {
  icon?: LucideIcon;
  /** Etiqueta corta delante del valor, p. ej. "Vigencia". */
  label?: string;
  value: React.ReactNode;
  /** `warning` o `danger` resaltan el dato (p. ej. "Nunca ha ingresado"). */
  tone?: "default" | "warning" | "danger";
  /** Texto largo mostrado al pasar el cursor / mantener pulsado. */
  title?: string;
}

export interface RecordCardProps {
  /** Avatar o icono principal (normalmente `<RecordAvatar />`). */
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Color de la franja lateral; comunica el estado del registro. */
  tone?: AccentTone;
  /** Atenúa el contenido (registros inactivos). */
  dimmed?: boolean;
  /** Fila de `StatusBadge`. */
  badges?: React.ReactNode;
  /** Datos secundarios, uno por línea. */
  meta?: RecordMeta[];
  /** Contenido libre adicional entre los datos y las acciones. */
  children?: React.ReactNode;
  /** Barra de acciones inferior (iconos con tooltip; la destructiva con `ml-auto`). */
  actions?: React.ReactNode;
  /** Hace toda la tarjeta pulsable (abre el detalle). Las acciones siguen funcionando por separado. */
  onClick?: () => void;
  className?: string;
}

/**
 * Tarjeta de registro estándar: avatar/icono, título, subtítulo, franja de estado, badges, datos secundarios
 * y barra de acciones. Se usa dentro de `ResponsiveDataView` (`renderCard`), que aporta el borde y el fondo.
 */
export function RecordCard({
  leading,
  title,
  subtitle,
  tone = "primary",
  dimmed,
  badges,
  meta,
  children,
  actions,
  onClick,
  className,
}: RecordCardProps) {
  const clickable = typeof onClick === "function";
  return (
    <div className={cn("flex gap-3", className)}>
      <span aria-hidden="true" className={cn("w-1 shrink-0 self-stretch rounded-full", ACCENT_CLASS[tone])} />
      <div className="min-w-0 flex-1">
        <div
          className={cn("flex items-start gap-3", dimmed && "opacity-70", clickable && "cursor-pointer")}
          onClick={onClick}
          role={clickable ? "button" : undefined}
          tabIndex={clickable ? 0 : undefined}
          onKeyDown={
            clickable
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClick?.();
                  }
                }
              : undefined
          }
        >
          {leading}
          <div className="min-w-0 flex-1">
            <p className="break-words font-semibold leading-tight">{title}</p>
            {subtitle ? <p className="break-words text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>

        {badges ? <div className={cn("mt-3 flex flex-wrap items-center gap-2", dimmed && "opacity-70")}>{badges}</div> : null}

        {meta && meta.length > 0 ? (
          <div className={cn("mt-2 space-y-1", dimmed && "opacity-70")}>
            {meta.map((item, index) => {
              const Icon = item.icon;
              return (
                <p
                  key={index}
                  title={item.title}
                  className={cn(
                    "flex items-start gap-1.5 text-xs",
                    item.tone === "warning" && "italic text-warning",
                    item.tone === "danger" && "text-destructive",
                    (!item.tone || item.tone === "default") && "text-muted-foreground"
                  )}
                >
                  {Icon ? <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
                  <span className="min-w-0 break-words">
                    {item.label ? <span className="font-medium">{item.label}: </span> : null}
                    {item.value}
                  </span>
                </p>
              );
            })}
          </div>
        ) : null}

        {children ? <div className="mt-2">{children}</div> : null}

        {actions ? <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border pt-2">{actions}</div> : null}
      </div>
    </div>
  );
}
