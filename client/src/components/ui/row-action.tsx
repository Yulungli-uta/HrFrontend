import * as React from "react"
import { Pencil, Trash2, Eye, Download, Copy, RefreshCw, History, type LucideIcon } from "lucide-react"

import { ActionIconButton, type ActionIconButtonProps } from "@/components/ui/action-icon-button"

type Tone = NonNullable<ActionIconButtonProps["tone"]>

/**
 * Catálogo ÚNICO de acciones de fila/herramienta que se muestran solo con icono y tooltip.
 * Cambiar aquí el icono, el texto o el color los cambia en todas las pantallas.
 * Aprobar, Rechazar, Guardar, Cancelar, Reintentar y las acciones principales de página se quedan con texto (ver /estilos).
 */
export const ROW_ACTIONS = {
  edit: { icon: Pencil, label: "Editar", tone: "primary" },
  delete: { icon: Trash2, label: "Eliminar", tone: "destructive" },
  view: { icon: Eye, label: "Ver detalle", tone: "muted" },
  download: { icon: Download, label: "Descargar", tone: "default" },
  duplicate: { icon: Copy, label: "Duplicar", tone: "default" },
  refresh: { icon: RefreshCw, label: "Actualizar", tone: "default" },
  history: { icon: History, label: "Ver historial", tone: "muted" },
} as const satisfies Record<string, { icon: LucideIcon; label: string; tone: Tone }>

export type RowActionKey = keyof typeof ROW_ACTIONS

export interface RowActionProps extends Omit<ActionIconButtonProps, "icon" | "label" | "tone"> {
  action: RowActionKey
  /** Texto específico (por ejemplo "Eliminar usuario"); por defecto el del catálogo. */
  label?: string
}

export function RowAction({ action, label, ...props }: RowActionProps) {
  const def = ROW_ACTIONS[action]
  return <ActionIconButton icon={def.icon} label={label ?? def.label} tone={def.tone} {...props} />
}
