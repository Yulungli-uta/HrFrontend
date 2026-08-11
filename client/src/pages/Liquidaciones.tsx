// src/pages/Liquidaciones.tsx
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Inbox } from "lucide-react";

import { TimeBalanceAPI } from "@/lib/api";
import type { PendingVacationSettlement } from "@/lib/api/services/attendance";
import { useToast } from "@/hooks/use-toast";
import { parseApiError } from "@/lib/error-handling";

/**
 * Página independiente del buzón de liquidaciones (antes vivía como pestaña dentro de
 * Ajuste de Saldo de Vacaciones). La liquidación puede originarse por renuncia,
 * jubilación, fin de contrato o renuncia vía acción de personal — el backend ya
 * unifica los 4 orígenes cerrando HR.tbl_EmployeeLaborRegime automáticamente en cada
 * caso, así que esta pantalla solo consume el mismo buzón genérico
 * (GET /timebalances/pending-settlements) y muestra el motivo de cierre resuelto
 * por el servidor (columna "Motivo").
 */
const reasonBadgeVariant = (reason: string): "default" | "secondary" | "destructive" | "outline" => {
  if (reason === "Renuncia" || reason === "Jubilación") return "default";
  if (reason === "Fin de contrato") return "secondary";
  if (reason === "Cierre manual") return "outline";
  return "secondary";
};

export default function LiquidacionesPage() {
  const { toast } = useToast();
  const [target, setTarget] = useState<PendingVacationSettlement | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pending-vacation-settlements"],
    queryFn: () => TimeBalanceAPI.getPendingSettlements(),
  });

  const pending: PendingVacationSettlement[] = data?.status === "success" ? (data.data ?? []) : [];

  const mutation = useMutation({
    mutationFn: () => {
      if (!target) throw new Error("Sin registro seleccionado.");
      return TimeBalanceAPI.settle({
        employeeId: target.employeeId,
        laborRegimeName: target.laborRegimeName,
        reason,
      });
    },
    onSuccess: (res) => {
      if (res.status === "success" && res.data) {
        toast({
          title: "Liquidación procesada",
          description: `Vacaciones: ${res.data.previousVacationBalanceMin} min → 0. Recuperación: ${res.data.previousRecoveryBalanceMin} min → 0.`,
        });
        setTarget(null);
        setReason("");
        void refetch();
      } else {
        toast({ title: "Error al liquidar", description: parseApiError(res).message, variant: "destructive" });
      }
    },
    onError: (err) => {
      toast({ title: "Error al liquidar", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Liquidaciones de Vacaciones</h1>
        <p className="text-muted-foreground">
          Empleados cuyo régimen laboral ya se cerró (renuncia, jubilación, fin de contrato o
          renuncia vía acción de personal) y todavía tienen saldo de vacaciones y/o recuperación
          de horas sin liquidar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liquidaciones pendientes</CardTitle>
          <CardDescription>
            Positivo (se paga/reconoce al empleado) o negativo (deuda pendiente) — ambos casos se liquidan fijando el saldo en 0, vacaciones y recuperación de horas juntas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Cargando…</div>
          ) : pending.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Inbox className="h-8 w-8" />
              Sin liquidaciones pendientes.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Régimen</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Fin del régimen</TableHead>
                    <TableHead className="text-right">Vacaciones (min)</TableHead>
                    <TableHead className="text-right">Recuperación (min)</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((p) => (
                    <TableRow key={`${p.employeeId}-${p.laborRegimeId}`}>
                      <TableCell>{p.employeeName}</TableCell>
                      <TableCell>{p.laborRegimeName}</TableCell>
                      <TableCell>
                        <Badge variant={reasonBadgeVariant(p.triggerReason)}>{p.triggerReason}</Badge>
                      </TableCell>
                      <TableCell>{p.regimeEffectiveTo ?? "—"}</TableCell>
                      <TableCell className={`text-right font-medium ${p.currentBalanceMin < 0 ? "text-destructive" : ""}`}>
                        {p.currentBalanceMin}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${p.currentRecoveryBalanceMin < 0 ? "text-destructive" : ""}`}>
                        {p.currentRecoveryBalanceMin}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => { setTarget(p); setReason(""); }}>
                          Procesar Liquidación
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar liquidación</AlertDialogTitle>
            <AlertDialogDescription>
              {target && (
                <>
                  Se fijará en <b>0</b> tanto el saldo de vacaciones (actualmente <b>{target.currentBalanceMin} min</b>
                  {target.currentBalanceMin < 0 ? ", deuda" : ""}) como el de recuperación de horas (actualmente{" "}
                  <b>{target.currentRecoveryBalanceMin} min</b>
                  {target.currentRecoveryBalanceMin < 0 ? ", deuda" : ""}) de <b>{target.employeeName}</b> ({target.laborRegimeName}).
                  Motivo del cierre: <b>{target.triggerReason}</b>. Esta acción queda registrada con motivo obligatorio.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="mb-1 block">Motivo (obligatorio)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. liquidación por término de contrato, verificado con RRHH." />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={reason.trim().length < 5 || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Procesando..." : "Confirmar liquidación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
