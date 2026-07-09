// src/pages/admin/EmployeeLaborRegimes.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollText, Plus, Loader2, RefreshCw, AlertCircle, XCircle, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmployeeLaborRegimesAPI } from "@/lib/api";
import type { EmployeeLaborRegimeDto } from "@/lib/api/services/employeeLaborRegimes";
import { EmployeeCombobox } from "@/components/ui/EmployeeCombobox";
import { EmployeeLaborRegimeForm } from "@/components/forms/EmployeeLaborRegimeForm";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { UnsavedChangesDialog } from "@/components/ui/UnsavedChangesDialog";
import { parseApiError } from "@/lib/error-handling";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function EmployeeLaborRegimesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [employeeLabel, setEmployeeLabel] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState<EmployeeLaborRegimeDto | null>(null);
  const [closeDate, setCloseDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { setIsFormDirty, handleOpenChange, close: closeForm, confirmOpen, confirmExit, closeConfirm } =
    useUnsavedChangesGuard(setIsFormOpen);

  const {
    data: regimesResp,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["employee-labor-regimes", employeeId],
    queryFn: () => EmployeeLaborRegimesAPI.byEmployee(employeeId!),
    enabled: !!employeeId,
  });

  const regimes: EmployeeLaborRegimeDto[] = regimesResp?.status === "success" ? regimesResp.data ?? [] : [];

  const closeMutation = useMutation({
    mutationFn: async ({ id, effectiveTo }: { id: number; effectiveTo: string }) => {
      const res = await EmployeeLaborRegimesAPI.close(id, { effectiveTo });
      if (res.status !== "success") throw new Error(res.error?.message || "No se pudo cerrar el régimen.");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-labor-regimes", employeeId] });
      toast({ title: "Régimen cerrado", description: "El régimen laboral fue desactivado correctamente." });
      setCloseTarget(null);
    },
    onError: (err: unknown) => {
      toast({
        title: "Error al cerrar régimen",
        description: err instanceof Error ? err.message : "No se pudo cerrar el régimen.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/15 rounded-lg">
              <ScrollText className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            </div>
            Régimen Laboral por Empleado
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Un empleado puede tener más de un régimen activo a la vez (ej. nombramiento LOSEP + contrato LOES).
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <Label className="mb-2 block">Buscar empleado</Label>
          <EmployeeCombobox
            value={employeeId}
            onSelect={setEmployeeId}
            onSelectEmployee={(emp) => setEmployeeLabel(emp.fullName ?? `Empleado #${emp.employeeID}`)}
            placeholder="Busca por nombre, cédula o cargo…"
          />
        </CardContent>
      </Card>

      {employeeId && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Regímenes de {employeeLabel || `empleado #${employeeId}`}
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
              <Button size="sm" onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Agregar régimen
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card className="border-destructive/40">
              <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-muted-foreground">
                  {parseApiError(error).message || "Error al cargar los regímenes."}
                </p>
                <Button onClick={() => refetch()}>Reintentar</Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="hidden sm:block">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="p-3 font-medium">Régimen</th>
                        <th className="p-3 font-medium">Departamento / Cargo</th>
                        <th className="p-3 font-medium">Documento</th>
                        <th className="p-3 font-medium">Vigencia</th>
                        <th className="p-3 font-medium">Estado</th>
                        <th className="p-3 font-medium text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regimes.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            Este empleado no tiene regímenes registrados.
                          </td>
                        </tr>
                      ) : (
                        regimes.map((r) => (
                          <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{r.laborRegimeName ?? r.laborRegimeId}</span>
                                {r.isPrincipal && (
                                  <Badge variant="default" className="flex items-center gap-1 text-xs">
                                    <Star className="h-3 w-3" /> Principal
                                  </Badge>
                                )}
                              </div>
                              {r.isIndefinite && (
                                <span className="text-xs text-muted-foreground">Nombramiento</span>
                              )}
                            </td>
                            <td className="p-3">
                              <div>{r.departmentName ?? <span className="text-muted-foreground">—</span>}</div>
                              {r.jobName && <div className="text-xs text-muted-foreground">{r.jobName}</div>}
                            </td>
                            <td className="p-3">
                              <div>{r.documentNumber ?? <span className="text-muted-foreground">—</span>}</div>
                              <div className="text-xs text-muted-foreground">{r.documentType}</div>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {formatDate(r.effectiveFrom)}
                              {r.effectiveTo ? ` → ${formatDate(r.effectiveTo)}` : ""}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={r.isActive ? "default" : "secondary"}
                                className={r.isActive ? "bg-success/15 text-success border-success/30" : ""}
                              >
                                {r.isActive ? "Activo" : "Cerrado"}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              {r.isActive && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCloseTarget(r)}
                                  className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  Cerrar
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Diálogo: agregar régimen */}
      <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar régimen laboral</DialogTitle>
            <DialogDescription>
              Registra un nuevo régimen activo para este empleado sin afectar los que ya tiene.
            </DialogDescription>
          </DialogHeader>
          {employeeId && (
            <EmployeeLaborRegimeForm
              employeeId={employeeId}
              employeeLabel={employeeLabel || `Empleado #${employeeId}`}
              onSuccess={closeForm}
              onCancel={closeForm}
              onDirtyChange={setIsFormDirty}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo: cerrar régimen */}
      <Dialog open={!!closeTarget} onOpenChange={(open) => !open && setCloseTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cerrar régimen laboral</DialogTitle>
            <DialogDescription>
              {closeTarget?.laborRegimeName ?? "Este régimen"} dejará de estar activo desde la fecha indicada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="closeDate">Fecha de desactivación</Label>
            <Input
              id="closeDate"
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setCloseTarget(null)} disabled={closeMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => closeTarget && closeMutation.mutate({ id: closeTarget.id, effectiveTo: closeDate })}
              disabled={closeMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {closeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Cerrar régimen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog open={confirmOpen} onClose={closeConfirm} onConfirmExit={confirmExit} />
    </div>
  );
}
