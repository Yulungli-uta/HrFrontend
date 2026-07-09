// src/pages/admin/UserAccessScopes.tsx
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldCheck, Plus, Trash2, Loader2, AlertCircle, RefreshCw, Building2, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserAccessScopesAPI } from "@/lib/api";
import type { UserAccessScopeDto, UserAccessScopeHistoryDto } from "@/lib/api/services/userAccessScopes";
import AssignAccessScopeForm from "@/components/forms/AssignAccessScopeForm";
import { DepartmentSelect } from "@/components/departments/DepartmentSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { parseApiError } from "@/lib/error-handling";

function moduleLabel(name?: string | null) {
  if (name === "CONTRACTS") return "Contratos";
  if (name === "PERSONNEL_ACTIONS") return "Acciones de Personal";
  return name ?? "—";
}

function scopeLabel(name?: string | null) {
  if (name === "GLOBAL") return "Global";
  if (name === "DEPARTMENT_TREE") return "Departamento + hijos";
  if (name === "DEPARTMENT_ONLY") return "Solo ese departamento";
  return name ?? "—";
}

export default function UserAccessScopesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserAccessScopeDto | null>(null);
  const [historyEmployeeId, setHistoryEmployeeId] = useState<number | null>(null);
  const [filterDepartmentId, setFilterDepartmentId] = useState<number | null>(null);

  const {
    data: scopesResp,
    isLoading: isLoadingScopes,
    error: scopesError,
    refetch: refetchScopes,
  } = useQuery({
    queryKey: ["user-access-scopes"],
    queryFn: () => UserAccessScopesAPI.list(),
  });

  const scopes: UserAccessScopeDto[] = scopesResp?.status === "success" ? scopesResp.data ?? [] : [];

  const filteredScopes = useMemo(() => {
    if (filterDepartmentId == null) return scopes;
    return scopes.filter((s) => s.departmentId === filterDepartmentId);
  }, [scopes, filterDepartmentId]);

  const historyEmployeeLabel = scopes.find((s) => s.employeeId === historyEmployeeId)?.employeeName
    ?? scopes.find((s) => s.employeeId === historyEmployeeId)?.employeeEmail;

  const { data: historyResp, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["user-access-scope-history", historyEmployeeId],
    queryFn: () => UserAccessScopesAPI.history(historyEmployeeId!),
    enabled: !!historyEmployeeId,
  });
  const history: UserAccessScopeHistoryDto[] = historyResp?.status === "success" ? historyResp.data ?? [] : [];

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await UserAccessScopesAPI.remove(id);
      if (res.status !== "success") throw new Error(res.error?.message || "No se pudo remover el acceso.");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-access-scopes"] });
      toast({ title: "Acceso removido", description: "El alcance fue removido exitosamente." });
      setDeleteTarget(null);
    },
    onError: (error: unknown) => {
      toast({
        title: "Error al remover acceso",
        description: error instanceof Error ? error.message : "No se pudo remover el acceso.",
        variant: "destructive",
      });
    },
  });

  const isLoading = isLoadingScopes;
  const hasError = !!scopesError;

  if (isLoading) return <LoadingSkeleton />;

  if (hasError) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card className="border-destructive/40">
          <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {parseApiError(scopesError).message || "Error al cargar los datos."}
            </p>
            <Button onClick={() => refetchScopes()} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/15 rounded-lg">
              <ShieldCheck className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            </div>
            Alcance de Acceso por Departamento
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Define qué departamentos/facultades puede ver o gestionar cada empleado, por módulo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchScopes()} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
          <Button size="sm" onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Asignar acceso
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex items-center gap-2 w-full sm:max-w-sm">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <DepartmentSelect
                value={filterDepartmentId}
                onChange={(value) => setFilterDepartmentId(value)}
                placeholder="Filtrar por departamento…"
                className="w-full"
              />
            </div>
            {filterDepartmentId != null && (
              <Button variant="ghost" size="sm" onClick={() => setFilterDepartmentId(null)}>
                Limpiar filtro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vista de tarjetas en mobile, tabla en desktop */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {filteredScopes.length === 0 ? (
          <EmptyState />
        ) : (
          filteredScopes.map((s) => (
            <ScopeCard
              key={s.id}
              scope={s}
              onDelete={() => setDeleteTarget(s)}
              onHistory={() => setHistoryEmployeeId(s.employeeId)}
            />
          ))
        )}
      </div>

      <Card className="hidden sm:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="p-3 font-medium">Empleado</th>
                  <th className="p-3 font-medium">Módulo</th>
                  <th className="p-3 font-medium">Alcance</th>
                  <th className="p-3 font-medium">Departamento</th>
                  <th className="p-3 font-medium">Vigencia</th>
                  <th className="p-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredScopes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No hay asignaciones {filterDepartmentId != null ? "para este departamento" : ""}.
                    </td>
                  </tr>
                ) : (
                  filteredScopes.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{s.employeeName ?? s.employeeEmail ?? s.employeeId}</div>
                        {s.employeeName && s.employeeEmail && (
                          <div className="text-xs text-muted-foreground">{s.employeeEmail}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{moduleLabel(s.moduleTypeName)}</Badge>
                      </td>
                      <td className="p-3">{scopeLabel(s.scopeTypeName)}</td>
                      <td className="p-3">{s.departmentName ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="p-3 text-muted-foreground">
                        {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : "Sin expiración"}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => setHistoryEmployeeId(s.employeeId)} className="h-8 px-2">
                            <History className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteTarget(s)}
                            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo: asignar */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && setIsFormOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asignar acceso por departamento</DialogTitle>
            <DialogDescription>
              Define a qué empleado, en qué módulo, y con qué alcance de departamento.
            </DialogDescription>
          </DialogHeader>
          <AssignAccessScopeForm onSuccess={() => setIsFormOpen(false)} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Diálogo: confirmar remoción */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Remover este acceso?</AlertDialogTitle>
            <AlertDialogDescription>
              El empleado perderá la visibilidad sobre ese departamento para este módulo. Esta acción
              queda registrada en el historial y puede revertirse asignando de nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (
            <div className="px-1 text-sm text-muted-foreground">
              Empleado: <span className="font-medium">{deleteTarget.employeeName ?? deleteTarget.employeeEmail}</span>
              {" · "}
              {moduleLabel(deleteTarget.moduleTypeName)}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive hover:bg-red-700 flex items-center gap-2"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {deleteMutation.isPending ? "Removiendo…" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo: historial */}
      <Dialog open={!!historyEmployeeId} onOpenChange={(open) => !open && setHistoryEmployeeId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de accesos</DialogTitle>
            <DialogDescription>{historyEmployeeLabel}</DialogDescription>
          </DialogHeader>
          {isLoadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Sin historial registrado.</p>
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="border rounded-lg p-3 dark:border-border">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        h.changeType === "Assigned" ? "default" : h.changeType === "Removed" ? "destructive" : "secondary"
                      }
                    >
                      {h.changeType === "Assigned" ? "Asignado" : h.changeType === "Removed" ? "Removido" : "Modificado"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(h.changeDateTime).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm mt-2">
                    Por: <span className="font-medium">{h.changedBy}</span>
                  </p>
                  {h.changeReason && <p className="text-sm text-muted-foreground mt-1">{h.changeReason}</p>}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScopeCard({
  scope,
  onDelete,
  onHistory,
}: {
  scope: UserAccessScopeDto;
  onDelete: () => void;
  onHistory: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium truncate">{scope.employeeName ?? scope.employeeEmail ?? scope.employeeId}</p>
          <Badge variant="outline" className="shrink-0">
            {moduleLabel(scope.moduleTypeName)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {scopeLabel(scope.scopeTypeName)}
          {scope.departmentName && ` · ${scope.departmentName}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {scope.expiresAt ? `Expira: ${new Date(scope.expiresAt).toLocaleDateString()}` : "Sin expiración"}
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onHistory} className="h-8 px-2">
            <History className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="text-center py-10">
      <CardContent>
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-3">
          <ShieldCheck className="h-8 w-8 text-muted-foreground/70" />
        </div>
        <p className="text-sm text-muted-foreground">No hay asignaciones registradas.</p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-16 rounded-lg" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-lg" />
      ))}
    </div>
  );
}
