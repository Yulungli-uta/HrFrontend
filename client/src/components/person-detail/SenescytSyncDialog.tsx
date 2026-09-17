// client/src/components/person-detail/SenescytSyncDialog.tsx
import { useState } from "react";
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
import { NivelesEducacionAPI, type TituloSyncPreview } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { parseApiError } from "@/lib/error-handling";

type Step = "idle" | "loading" | "preview" | "confirming" | "done" | "error";

interface SenescytSyncDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  personId: number;
}

/**
 * Flujo de 2 pasos aprobado 2026-09-16: previsualizar (consulta DINARDAP y compara, sin
 * persistir nada) → confirmar (recién ahí crea solo los títulos que no existían). Nunca
 * inserta nada de una sola vez al abrir el diálogo.
 */
export function SenescytSyncDialog({ open, onOpenChange, personId }: SenescytSyncDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("idle");
  const [preview, setPreview] = useState<TituloSyncPreview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const loadPreview = async () => {
    setStep("loading");
    setErrorMessage(null);
    try {
      const resp = await NivelesEducacionAPI.previewSenescytSync(personId);
      if (resp.status === "success") {
        setPreview(resp.data);
        setStep("preview");
      } else {
        setErrorMessage(parseApiError(resp.error).message || "No se pudo consultar DINARDAP.");
        setStep("error");
      }
    } catch {
      setErrorMessage("No se pudo consultar DINARDAP. Intente de nuevo más tarde.");
      setStep("error");
    }
  };

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
    if (v) {
      setPreview(null);
      setResultMessage(null);
      setErrorMessage(null);
      void loadPreview();
    } else {
      setStep("idle");
    }
  };

  const handleConfirm = async () => {
    setStep("confirming");
    try {
      const resp = await NivelesEducacionAPI.confirmSenescytSync(personId);
      if (resp.status === "success") {
        const { titulosCreados, titulosOmitidos, requierenRevision } = resp.data;
        setResultMessage(
          `${titulosCreados} título(s) nuevo(s) agregado(s), ${titulosOmitidos} ya existían.` +
            (requierenRevision > 0
              ? ` ${requierenRevision} quedaron marcados para revisión manual (nivel o grado no reconocido).`
              : "")
        );
        setStep("done");
        await queryClient.invalidateQueries({ queryKey: ["educationLevels", String(personId)] });
        toast({ title: "Sincronización completada", description: `${titulosCreados} título(s) nuevo(s).` });
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sincronizar con SENESCYT</DialogTitle>
          <DialogDescription>
            Consulta los títulos reales de esta persona en DINARDAP y agrega solo los que no
            estén registrados todavía — nunca duplica ni modifica los que ya existen.
          </DialogDescription>
        </DialogHeader>

        {step === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Consultando DINARDAP…</p>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-semibold">{preview.totalEncontrados}</p>
                <p className="text-xs text-muted-foreground">Encontrados</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950">
                <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">{preview.totalNuevos}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">Nuevos</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-semibold text-muted-foreground">{preview.totalYaExistentes}</p>
                <p className="text-xs text-muted-foreground">Ya existentes</p>
              </div>
            </div>

            {preview.items.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg border p-2">
                {preview.items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.nombreTitulo}</p>
                      {item.institucion && (
                        <p className="text-xs text-muted-foreground truncate">{item.institucion}</p>
                      )}
                      {item.requiereRevision && (
                        <p className="text-xs text-amber-600 mt-1">⚠ {item.motivoRevision}</p>
                      )}
                    </div>
                    <Badge variant={item.yaExiste ? "outline" : "default"} className="shrink-0 text-xs">
                      {item.yaExiste ? "Ya existe" : "Nuevo"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {preview.totalNuevos === 0 && preview.totalEncontrados === 0 && (
              <div className="flex flex-col items-center gap-2 py-4 text-center text-muted-foreground">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground/60" />
                <p className="text-sm">No hay nada para sincronizar — DINARDAP no tiene ningún título registrado para esta persona.</p>
              </div>
            )}
            {preview.totalNuevos === 0 && preview.totalEncontrados > 0 && (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <p className="text-sm text-muted-foreground">
                  Ya está actualizado — los {preview.totalEncontrados} título(s) que devuelve DINARDAP ya están registrados aquí.
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

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {step === "done" ? "Cerrar" : "Cancelar"}
          </Button>
          {(step === "preview" || step === "confirming") && preview && preview.totalNuevos > 0 && (
            <Button onClick={handleConfirm} disabled={step === "confirming"}>
              {step === "confirming" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {step === "confirming" ? "Guardando…" : `Confirmar y agregar ${preview.totalNuevos} título(s)`}
            </Button>
          )}
          {(step === "error") && (
            <Button onClick={loadPreview}>Reintentar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
