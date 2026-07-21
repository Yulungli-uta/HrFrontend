import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { History, ArrowRight, ArrowLeft } from "lucide-react";
import { AuditLogAPI } from "@/lib/api";
import type { ApiResponse } from "@/lib/api";
import type { AuditLogEntry } from "@/lib/api/services/security";

interface AuditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Módulo de auditoría exacto (ej. "UserAccessProfiles", "UserRoles"). */
  module: string;
  /** Acota el historial a una entidad puntual (ej. el Id del AccessProfile o del Role). */
  entityId?: string | number;
  /** Acota el historial a un usuario puntual. */
  userId?: string;
}

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  AccessProfileAssigned: { label: "Perfil asignado", variant: "default" },
  AccessProfileUnassigned: { label: "Perfil removido", variant: "destructive" },
  RoleAssigned: { label: "Rol asignado", variant: "default" },
  RoleAssignmentUpdated: { label: "Asignación actualizada", variant: "secondary" },
  RoleUnassigned: { label: "Rol removido", variant: "destructive" },
};

/**
 * Historial de auditoría genérico (reutilizable) sobre auth.tbl_AuditLog,
 * filtrado por módulo/entidad/usuario vía `GET /api/audit-log/by-module/{module}`.
 * No hay paginación real — capado a 100 filas más recientes, suficiente para el
 * volumen esperado de un módulo/entidad puntual.
 */
export function AuditHistoryDialog({ open, onOpenChange, title, module, entityId, userId }: AuditHistoryDialogProps) {
  const { data, isLoading, isError } = useQuery<ApiResponse<AuditLogEntry[]>>({
    queryKey: ["audit-log", module, entityId, userId],
    queryFn: () => AuditLogAPI.getByModule(module, { entityId, userId, limit: 100 }),
    enabled: open,
    refetchOnWindowFocus: false,
  });

  const entries: AuditLogEntry[] = data?.status === "success" ? data.data : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Registro de auditoría — quién hizo qué y cuándo. No se puede editar ni eliminar.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-center text-destructive py-8">Error al cargar el historial. Intente nuevamente.</p>
        ) : entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Sin eventos registrados todavía.</p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const meta = ACTION_LABELS[entry.action] ?? { label: entry.action, variant: "secondary" as const };
              const isAssign = entry.action.toLowerCase().includes("assign") && !entry.action.toLowerCase().includes("un");
              return (
                <div key={entry.id} className="border border-border rounded-md p-3">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant={meta.variant} className="flex items-center gap-1">
                      {isAssign ? <ArrowRight className="h-3 w-3" /> : <ArrowLeft className="h-3 w-3" />}
                      {meta.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {(entry.newValues || entry.oldValues) && (
                    <p className="text-xs text-muted-foreground break-words">
                      {entry.newValues || entry.oldValues}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
