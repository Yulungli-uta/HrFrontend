// client/src/components/person-detail/DeadvSyncDialog.tsx
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { CapacitacionesAPI, type DeadvSyncPreview } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { parseApiError } from "@/lib/error-handling";
import { formatDate } from "@/lib/clock";

type Step = "idle" | "loading" | "preview" | "confirming" | "done" | "error";

interface DeadvSyncDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  personId: number;
}

const STATUS_LABEL: Record<string, string> = {
  Nuevo: "Nuevo",
  Vinculable: "Completa registro existente",
  YaSincronizado: "Ya existe",
};

/**
 * Mismo flujo de 2 pasos que la sincronización con SENESCYT: previsualizar (consulta DEaDV y
 * compara, sin persistir nada) → confirmar (recién ahí crea los faltantes y completa los
 * registros históricos equivalentes). Nunca guarda nada al abrir el diálogo.
 */
export function DeadvSyncDialog({ open, onOpenChange, personId }: DeadvSyncDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("idle");
  const [preview, setPreview] = useState<DeadvSyncPreview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const loadPreview = async () => {
    setStep("loading");
    setErrorMessage(null);
    try {
      const resp = await CapacitacionesAPI.previewDeadvSync(personId);
      if (resp.status !== "success") {
        setErrorMessage(parseApiError(resp.error).message || "No se pudo consultar DEaDV.");
        setStep("error");
      } else if (!resp.data.serviceAvailable) {
        setErrorMessage("DEaDV no respondió en este momento. Intente de nuevo más tarde.");
        setStep("error");
      } else {
        setPreview(resp.data);
        setStep("preview");
      }
    } catch {
      setErrorMessage("No se pudo consultar DEaDV. Intente de nuevo más tarde.");
      setStep("error");
    }
  };

  // Radix no dispara onOpenChange cuando el padre cambia `open`, así que la consulta se
  // lanza al detectar la apertura (no desde el manejador de Radix).
  useEffect(() => {
    if (open) {
      setPreview(null);
      setResultMessage(null);
      setErrorMessage(null);
      void loadPreview();
    } else {
      setStep("idle");
    }
    // loadPreview solo depende de personId; se re-ejecuta al abrir o al cambiar de persona.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, personId]);

  const pending = preview ? preview.totalNew + preview.totalLinkable : 0;

  const handleConfirm = async () => {
    setStep("confirming");
    try {
      const resp = await CapacitacionesAPI.confirmDeadvSync(personId);
      if (resp.status === "success") {
        const { created, linked, skipped } = resp.data;
        setResultMessage(
          `${created} capacitación(es) nueva(s) agregada(s)` +
            (linked > 0 ? `, ${linked} registro(s) existente(s) completado(s) con datos de DEaDV` : "") +
            `, ${skipped} ya estaban sincronizadas.`
        );
        setStep("done");
        await queryClient.invalidateQueries({ queryKey: ["trainings", String(personId)] });
        toast({ title: "Sincronización completada", description: `${created + linked} capacitación(es) actualizadas.` });
      } else {
        setErrorMessage(parseApiError(resp.error).message || "No se pudo confirmar la sincronización.");
        setStep("error");
      }
    } catch {
      setErrorMessage("No se pudo confirmar la sincronización. Intente de nuevo más tarde.");
      setStep("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sincronizar con DEaDV</DialogTitle>
          <DialogDescription>
            Consulta los certificados de capacitación de esta persona en DEaDV y agrega solo los que
            no estén registrados todavía — nunca duplica los que ya existen.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 overflow-y-auto pr-1">
          {step === "loading" && (
            <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Consultando DEaDV…</p>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground break-words">{errorMessage}</p>
            </div>
          )}

          {step === "preview" && preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border p-3">
                  <p className="text-2xl font-semibold">{preview.totalFound}</p>
                  <p className="text-xs text-muted-foreground">Encontrados</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950">
                  <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">{pending}</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">Faltan sincronizar</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-2xl font-semibold text-muted-foreground">{preview.totalAlreadySynced}</p>
                  <p className="text-xs text-muted-foreground">Ya existentes</p>
                </div>
              </div>

              {preview.totalLinkable > 0 && (
                <p className="text-xs text-muted-foreground">
                  {preview.totalLinkable} ya figuran en el sistema sin origen: se completarán con los datos de
                  DEaDV (horas, tipo, modalidad, certificado) en lugar de duplicarse.
                </p>
              )}

              {preview.items.length > 0 && (
                <div className="space-y-2 rounded-lg border p-2">
                  {preview.items.map((item) => (
                    <div key={item.code} className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium break-words">{item.title}</p>
                        <p className="text-xs text-muted-foreground break-words">
                          {formatDate(item.startDate, "es-EC", { year: "numeric", month: "short", day: "numeric" })}
                          {" · "}
                          {item.hours} h · {item.isPedagogical ? "Pedagógica" : "Específica"}
                        </p>
                      </div>
                      <Badge variant={item.status === "YaSincronizado" ? "outline" : "default"} className="shrink-0 text-xs">
                        {STATUS_LABEL[item.status] ?? item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {preview.totalFound === 0 && (
                <div className="flex flex-col items-center gap-2 py-4 text-center text-muted-foreground">
                  <CheckCircle2 className="h-6 w-6 text-muted-foreground/60" />
                  <p className="text-sm">No hay nada para sincronizar — DEaDV no tiene certificados registrados para esta persona.</p>
                </div>
              )}
              {pending === 0 && preview.totalFound > 0 && (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <p className="text-sm text-muted-foreground">
                    Ya está actualizado — los {preview.totalFound} certificado(s) de DEaDV ya están registrados aquí.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <p className="text-sm">{resultMessage}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {step === "done" ? "Cerrar" : "Cancelar"}
          </Button>
          {(step === "preview" || step === "confirming") && preview && pending > 0 && (
            <Button onClick={handleConfirm} disabled={step === "confirming"}>
              {step === "confirming" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {step === "confirming" ? "Guardando…" : `Confirmar y sincronizar ${pending} capacitación(es)`}
            </Button>
          )}
          {step === "error" && <Button onClick={loadPreview}>Reintentar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
