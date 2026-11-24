import { useState } from "react";
import { ChevronDown, ChevronUp, Edit, Tags } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

/** Forma mínima de un tipo de referencia que necesita la tarjeta. */
export interface CategoryCardType {
  TypeID?: number;
  Name: string;
  Description?: string;
  IsActive: boolean;
}

export interface CategoryCardProps {
  /** Clave de la categoría tal como viene del backend, p. ej. ACADEMIC_CATEGORY. */
  category: string;
  types: CategoryCardType[];
  onEdit: (type: CategoryCardType) => void;
}

/** Cuántos tipos se muestran antes de pedir "Ver todos". */
const PREVIEW_COUNT = 5;

/** ACADEMIC_CATEGORY → "Academic Category"; TITULAR_PRINCIPAL → "Titular Principal". */
function humanize(text: string): string {
  return (text || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) => space + letter.toLocaleUpperCase("es-EC"));
}

/**
 * Tarjeta de una categoría de tipos de referencia. Cada tipo muestra una etiqueta legible (la descripción; si no la tiene,
 * el nombre en formato legible) y, debajo, el código real solo cuando aporta información. Así ninguna fila queda en blanco.
 */
export function CategoryCard({ category, types, onEdit }: CategoryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const total = types.length;
  const active = types.filter((t) => t.IsActive).length;
  const inactive = total - active;
  const ratio = total === 0 ? 0 : Math.round((active / total) * 100);
  const visible = expanded ? types : types.slice(0, PREVIEW_COUNT);
  const hidden = total - PREVIEW_COUNT;

  return (
    <Card className="flex flex-col overflow-hidden border-l-[3px] border-l-primary transition-shadow hover:shadow-md">
      <div className="space-y-2 p-4 pb-3">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Tags className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-base font-semibold leading-tight">{humanize(category) || "Sin categoría"}</h3>
            <p className="break-all font-mono text-xs text-muted-foreground">{category || "—"}</p>
          </div>
          <StatusBadge tone="primary" className="shrink-0">
            {total} {total === 1 ? "tipo" : "tipos"}
          </StatusBadge>
        </div>

        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="presentation">
            <div className="h-full rounded-full bg-success" style={{ width: `${ratio}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {active} {active === 1 ? "activo" : "activos"}
            {inactive > 0 ? ` · ${inactive} ${inactive === 1 ? "inactivo" : "inactivos"}` : ""}
          </p>
        </div>
      </div>

      <ul className={cn("flex-1 divide-y divide-border border-t border-border", expanded && "max-h-80 overflow-y-auto")}>
        {visible.map((type) => {
          const label = type.Description?.trim() || humanize(type.Name) || "—";
          // El código solo se muestra aparte cuando la etiqueta es distinta (si no, repetiría lo mismo)
          const showCode = !!type.Description?.trim() && type.Name !== label;
          return (
            <li
              key={type.TypeID ?? `${type.Name}`}
              className={cn("flex items-center gap-2 px-4 py-2", !type.IsActive && "opacity-60")}
            >
              <span
                aria-hidden="true"
                className={cn("h-2 w-2 shrink-0 rounded-full", type.IsActive ? "bg-success" : "bg-muted-foreground/40")}
              />
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium leading-snug">{label}</p>
                {showCode && <p className="break-all font-mono text-xs text-muted-foreground">{type.Name}</p>}
              </div>
              {!type.IsActive && <span className="shrink-0 text-xs text-muted-foreground">Inactivo</span>}
              <ActionIconButton icon={Edit} label={`Editar ${label}`} tone="primary" onClick={() => onEdit(type)} />
            </li>
          );
        })}
      </ul>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1 border-t border-border px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> Ver los {total} tipos (+{hidden})
            </>
          )}
        </button>
      )}
    </Card>
  );
}
