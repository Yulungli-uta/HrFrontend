// src/components/job-activities/clickableRow.ts
import type { KeyboardEvent } from "react";

/** Resalta la fila al pasar el mouse y al enfocarla con teclado (la elegida lleva fondo más fuerte y una barra a la izquierda); usa colores del tema, así que se ve bien en claro y oscuro. */
const ROW_CLASS =
  "cursor-pointer transition-colors hover:bg-primary/15 focus-visible:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary";

/**
 * Propiedades de una fila de listado que se abre al hacer clic o con Enter/Espacio.
 * `selected` marca la fila elegida (p. ej. el cargo seleccionado).
 */
export function clickableRow(onActivate: () => void, selected = false) {
  return {
    className: `${ROW_CLASS}${selected ? " bg-primary/20 shadow-[inset_3px_0_0_0_var(--primary)]" : ""}`,
    tabIndex: 0,
    "aria-selected": selected || undefined,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.target !== e.currentTarget) return; // no robar Enter/Espacio a botones internos
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
  };
}
