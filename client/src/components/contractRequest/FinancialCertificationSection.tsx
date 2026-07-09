// src/components/contractRequest/FinancialCertificationSection.tsx
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Banknote, Loader2 } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { parseApiError } from "@/lib/error-handling";
import { FinancialCertificationAPI } from "@/lib/api";
import { useCertStatusTypes, useDirectoryParams } from "@/hooks/certification-finance/hook";
import {
  ReusableDocumentManager, type ReusableDocumentManagerHandle,
} from "@/components/ReusableDocumentManager";
import {
  FinancialCertificationFieldsForm, type FinancialCertificationFieldsState,
} from "@/components/certification-finance/FinancialCertificationFieldsForm";
import {
  FINANCE_CERTIFICATION_DIRECTORY_CODE, FINANCE_CERTIFICATION_ENTITY_TYPE,
} from "@/features/constants";

function todayDateOnlyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toEcuadorMidnightISO(dateOnly: string): string {
  return `${dateOnly}T00:00:00-05:00`;
}

function emptyForm(): FinancialCertificationFieldsState {
  return { certCode: "", certNumber: "", budget: "", certBudgetDate: todayDateOnlyLocal(), rmuHour: 0, rmuCon: 0 };
}

type Props = {
  requestId: number;
  readOnly?: boolean;
  createdBy: number;
};

export function FinancialCertificationSection({ requestId, readOnly = false, createdBy }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FinancialCertificationFieldsState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const docManagerRef = useRef<ReusableDocumentManagerHandle | null>(null);

  const { data: dirResp } = useDirectoryParams(FINANCE_CERTIFICATION_DIRECTORY_CODE);
  const dirParam = dirResp?.status === "success" ? dirResp.data : undefined;
  const accept = dirParam?.extension ? `.${String(dirParam.extension).replace(/^\./, "").toLowerCase()}` : ".pdf";
  const maxSizeMB = Number(dirParam?.maxSizeMb ?? 25);
  const relativePath = dirParam?.relativePath?.trim() || "/financial-certifications/";

  const { data: certStatusTypesResp } = useCertStatusTypes();
  const statusById = useMemo(() => {
    const map = new Map<number, string>();
    if (certStatusTypesResp?.status === "success") {
      for (const rt of certStatusTypesResp.data ?? []) {
        const id: number | undefined = (rt as any).typeId ?? (rt as any).typeID;
        if (id != null) map.set(id, (rt as any).name);
      }
    }
    return map;
  }, [certStatusTypesResp]);

  const pendingRevisionStatusId = useMemo(() => {
    if (certStatusTypesResp?.status !== "success") return null;
    const found = (certStatusTypesResp.data ?? []).find(
      (rt: any) => (rt.name ?? "").toUpperCase() === "PENDIENTE_REVISION"
    );
    return found ? Number((found as any).typeId ?? (found as any).typeID) : null;
  }, [certStatusTypesResp]);

  const listQ = useQuery({
    queryKey: ["financialCertifications", "byRequest", requestId],
    queryFn: () => FinancialCertificationAPI.paged({ requestId, pageSize: 50 }),
    enabled: !!requestId,
  });

  const items: any[] = useMemo(() => {
    if (listQ.data?.status !== "success") return [];
    const data: any = listQ.data.data;
    return (data?.items ?? data ?? []).map((c: any) => ({
      ...c,
      statusName: c.statusName ?? statusById.get(c.status) ?? null,
    }));
  }, [listQ.data, statusById]);

  const close = () => {
    setDialogOpen(false);
    setForm(emptyForm());
    setIsSaving(false);
    docManagerRef.current?.clearSelected();
  };

  const handleSave = async () => {
    if (!form.certCode?.trim() || !form.certNumber?.trim() || !form.budget?.trim() || !form.certBudgetDate?.trim()) {
      toast({ title: "⚠️ Datos incompletos", description: "Completa Código, Número, Presupuesto y Fecha.", variant: "destructive" });
      return;
    }
    if (pendingRevisionStatusId == null) {
      toast({ title: "⚠️ Error de configuración", description: "No se pudo cargar el estado inicial. Recarga la página.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const resp: any = await FinancialCertificationAPI.create({
        requestId,
        certCode: form.certCode!.trim(),
        certNumber: form.certNumber!.trim(),
        budget: form.budget!.trim(),
        certBudgetDate: toEcuadorMidnightISO(form.certBudgetDate!),
        rmuHour: form.rmuHour ?? 0,
        rmuCon: form.rmuCon ?? 0,
        createdAt: new Date().toISOString(),
        createdBy,
        status: pendingRevisionStatusId,
      });

      if (resp?.status !== "success") {
        toast({ title: "❌ Error", description: resp?.error?.message ?? "No se pudo crear la certificación.", variant: "destructive" });
        setIsSaving(false);
        return;
      }

      const createdId = resp.data?.certificationId ?? resp.data?.CertificationId ?? resp.data?.id;
      const selectedCount = docManagerRef.current?.getSelectedCount() ?? 0;
      if (createdId && selectedCount > 0) {
        const uploadResult = await docManagerRef.current?.uploadAll(createdId);
        if (!uploadResult || uploadResult.uploaded === 0) {
          try {
            await FinancialCertificationAPI.delete(createdId);
          } catch {
            toast({
              title: "⚠️ Error grave",
              description: `La carga de documentos falló Y la reversión también. La certificación #${createdId} quedó sin documentos.`,
              variant: "destructive",
            });
            close();
            qc.invalidateQueries({ queryKey: ["financialCertifications", "byRequest", requestId] });
            return;
          }
          toast({ title: "❌ Certificación no guardada", description: "La carga de documentos falló. El registro fue revertido.", variant: "destructive" });
          setIsSaving(false);
          return;
        }
      }

      toast({ title: "✅ Certificación registrada", description: `Creada con ID #${createdId}.` });
      qc.invalidateQueries({ queryKey: ["financialCertifications", "byRequest", requestId] });
      close();
    } catch (e: unknown) {
      toast({ title: "❌ Error inesperado", description: parseApiError(e).message, variant: "destructive" });
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Banknote className="h-4 w-4" />
          Certificación Financiera
        </CardTitle>
        {!readOnly && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nueva certificación
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {listQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando certificaciones...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay certificaciones financieras registradas para esta solicitud.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <div key={c.certificationId} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <div className="min-w-0">
                  <p className="font-mono font-medium">{c.certCode} · #{c.certNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    Presupuesto: {c.budget ?? "—"} · {c.certBudgetDate ? c.certBudgetDate.slice(0, 10) : "—"}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">{c.statusName ?? `#${c.status}`}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => (o ? setDialogOpen(true) : close())}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Certificación Financiera</DialogTitle>
            <DialogDescription>
              Vinculada automáticamente a la Solicitud #{requestId}.
            </DialogDescription>
          </DialogHeader>

          <FinancialCertificationFieldsForm value={form} onChange={setForm} disabled={isSaving} />

          <div className="mt-4">
            <ReusableDocumentManager
              ref={docManagerRef}
              label="Anexar Documentos"
              directoryCode={FINANCE_CERTIFICATION_DIRECTORY_CODE}
              entityType={FINANCE_CERTIFICATION_ENTITY_TYPE}
              entityId={undefined}
              entityReady={false}
              allowSelectWhenNotReady={true}
              showInternalUploadButton={false}
              relativePath={relativePath}
              accept={accept}
              maxSizeMB={maxSizeMB}
              maxFiles={10}
              disabled={isSaving}
              roles={{ canUpload: true, canPreview: true, canDownload: true, canDelete: true }}
              documentType={{ enabled: true, required: true }}
            />
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={close} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
