// src/pages/certification-finance/CertificationDialog.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Pencil } from "lucide-react";

import { ReusableDocumentManager, type ReusableDocumentManagerHandle } from "@/components/ReusableDocumentManager";
import { useToast } from "@/hooks/use-toast";

import type { DialogMode, FinancialCertification, UIFinancialCertification } from "@/types/certificationFinance";
import type { DirectoryParameter } from "@/types/directoryParameter";

import { useQuery } from "@tanstack/react-query";
import { TiposReferenciaAPI, type ApiResponse } from "@/lib/api";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

/**
 * Helpers de fecha:
 * - Guardamos en el form como date-only "YYYY-MM-DD" (sin UTC)
 * - Enviamos al backend con offset Ecuador: "YYYY-MM-DDT00:00:00-05:00"
 */
function toDateOnly(input?: string | null): string {
  if (!input) return "";
  return input.length >= 10 ? input.slice(0, 10) : "";
}

function todayDateOnlyLocal(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toEcuadorMidnightISO(dateOnly: string): string {
  return `${dateOnly}T00:00:00-05:00`;
}

type FormState = Partial<Omit<FinancialCertification, "certificationId">> & {
  certBudgetDate?: string; // "YYYY-MM-DD"
};

const CERT_FINANCE_TYPE_CATEGORY = "CERT_FINANCE_TYPE";

export function CertificationDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  mode: DialogMode;
  setMode: (m: DialogMode) => void;

  selected: UIFinancialCertification | null;
  setSelected: (c: UIFinancialCertification | null) => void;

  // directory
  directoryCode: string;
  relativePath: string;
  accept: string;
  maxSizeMB: number;
  dirParam?: DirectoryParameter;
  isDirLoading: boolean;
  isDirError: boolean;
  refetchDir: () => void;

  // user context
  ctxCreatedBy: number;

  // mutations
  createAsync: (payload: Omit<FinancialCertification, "certificationId">) => Promise<any>;
  updateAsync: (args: { id: number; payload: Partial<Omit<FinancialCertification, "certificationId">> }) => Promise<any>;
  isCreatePending: boolean;
  isUpdatePending: boolean;

  // download legacy
  onDownloadLegacy: (directoryCode: string, filepath: string, filename: string) => void;
}) {
  const {
    open, onOpenChange,
    mode, setMode,
    selected, setSelected,
    directoryCode, relativePath, accept, maxSizeMB,
    refetchDir,
    ctxCreatedBy,
    createAsync, updateAsync, isCreatePending, isUpdatePending,
    onDownloadLegacy
  } = props;

  const { toast } = useToast();

  const isCreate = mode === "create";
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const docManagerRef = useRef<ReusableDocumentManagerHandle | null>(null);

  const [createdCertificationId, setCreatedCertificationId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // =========================
  // 1) Cargar estados desde TiposReferenciaAPI (Select)
  // =========================
  const {
    data: refTypesResponse,
    isLoading: isLoadingRefTypes,
    error: refTypesError,
  } = useQuery<ApiResponse<any[]>>({
    queryKey: ["refTypes", CERT_FINANCE_TYPE_CATEGORY],
    queryFn: () =>
      TiposReferenciaAPI.byCategory(CERT_FINANCE_TYPE_CATEGORY) as Promise<ApiResponse<any[]>>,
    enabled: open, // solo consulta cuando el modal abre
  });

  const refTypes = refTypesResponse?.status === "success" ? refTypesResponse.data : [];

  // =========================
  // 2) Form
  // =========================
  const buildEmptyForm = (): FormState => ({
    certCode: "",
    certNumber: "",
    budget: "",
    certBudgetDate: todayDateOnlyLocal(),
    rmuHour: 0,
    rmuCon: 0,
    filename: undefined,
    filepath: undefined,
    createdAt: new Date().toISOString(),
    createdBy: ctxCreatedBy,
    status: 2, // default
    requestId: null,
  });

  const [form, setForm] = useState<FormState>(buildEmptyForm);

  useEffect(() => {
    if (open) refetchDir();
  }, [open, refetchDir]);

  /**
   * FIX: Reset total en CREATE sin selected
   * FIX: En VIEW/EDIT cargar selected + certBudgetDate => date-only
   */
  useEffect(() => {
    if (!open) return;

    if (isCreate && !selected) {
      setForm(buildEmptyForm());
      setCreatedCertificationId(null);
      setIsProcessing(false);
      docManagerRef.current?.clearSelected();
      return;
    }

    if (selected) {
      setForm({
        requestId: selected.requestId ?? null,
        certCode: selected.certCode ?? "",
        certNumber: selected.certNumber ?? "",
        budget: selected.budget ?? "",
        certBudgetDate: selected.certBudgetDate ? toDateOnly(selected.certBudgetDate) : todayDateOnlyLocal(),
        rmuHour: selected.rmuHour ?? 0,
        rmuCon: selected.rmuCon ?? 0,
        filename: selected.filename ?? null,
        filepath: selected.filepath ?? null,
        createdAt: selected.createdAt ?? new Date().toISOString(),
        createdBy: selected.createdBy ?? ctxCreatedBy,
        status: selected.status ?? 2,
      });

      setCreatedCertificationId(null);
      setIsProcessing(false);
      docManagerRef.current?.clearSelected();
    }
  }, [open, selected, isCreate, ctxCreatedBy]);

  const title = useMemo(() => {
    if (isCreate) return "Nueva Certificación Financiera";
    if (isView) return "Detalles de Certificación";
    return "Editar Certificación";
  }, [isCreate, isView]);

  const description = useMemo(() => {
    if (isCreate) return "Completa los campos requeridos y carga los archivos. El Guardar está al final.";
    if (isView) return "Información completa de la certificación seleccionada.";
    return "Modifica los campos y guarda los cambios.";
  }, [isCreate, isView]);

  const validateRequired = () => {
    if (!form.certCode?.trim() || !form.certNumber?.trim() || !form.budget?.trim() || !form.certBudgetDate?.trim()) {
      toast({
        title: "⚠️ Datos incompletos",
        description: "Completa Código, Número, Presupuesto y Fecha antes de continuar.",
        variant: "destructive",
      });
      return false;
    }
    if (form.status === undefined || form.status === null) {
      toast({
        title: "⚠️ Estado requerido",
        description: "Selecciona un estado.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const close = () => {
    onOpenChange(false);
    setMode("create");
    setSelected(null);
    setCreatedCertificationId(null);
    setIsProcessing(false);
    docManagerRef.current?.clearSelected();
    setForm(buildEmptyForm());
  };

  // =========================================
  // CREATE + upload orchestrator
  // =========================================
  const handleCreateAndUpload = async () => {
    if (!validateRequired()) return;
    if (isProcessing) return;

    const selectedCount = docManagerRef.current?.getSelectedCount() ?? 0;
    if (selectedCount === 0) {
      toast({
        title: "⚠️ Sin archivos",
        description: "Selecciona al menos un archivo en el orquestador antes de guardar.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const payload: Omit<FinancialCertification, "certificationId"> = {
        requestId: form.requestId ?? null,
        certCode: form.certCode!.trim(),
        certNumber: form.certNumber!.trim(),
        budget: form.budget!.trim(),
        certBudgetDate: toEcuadorMidnightISO(form.certBudgetDate!),

        rmuHour: form.rmuHour ?? 0,
        rmuCon: form.rmuCon ?? 0,
        filename: null,
        filepath: null,
        createdAt: new Date().toISOString(),
        createdBy: ctxCreatedBy,
        status: Number(form.status ?? 2),
      };

      const resp: any = await createAsync(payload);
      if (resp?.status !== "success") {
        setIsProcessing(false);
        return;
      }

      const createdId: number | undefined =
        resp?.data?.certificationId ??
        resp?.data?.CertificationId ??
        resp?.data?.id ??
        resp?.data?.Id;

      if (!createdId) {
        toast({
          title: "❌ No se obtuvo CertificationId",
          description: "El backend no devolvió el id creado. Revisa el endpoint Create().",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      setCreatedCertificationId(createdId);

      const result = await docManagerRef.current?.uploadAll(createdId);
      await docManagerRef.current?.refresh(createdId);

      if (result?.success) {
        toast({
          title: "✅ Proceso completo",
          description: `Creado #${createdId} y documentos subidos (OK: ${result.uploaded}).`,
        });
        close();
      } else {
        toast({
          title: "⚠️ Registro creado, pero upload falló",
          description: `Se creó #${createdId}. Revisa el resultado del upload.`,
          variant: "destructive",
        });
        setIsProcessing(false);
      }
    } catch (e: any) {
      toast({
        title: "❌ Error inesperado",
        description: e?.message ?? "No se pudo completar el proceso.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  // =========================================
  // UPDATE (edit)
  // =========================================
  const handleSaveEdit = async () => {
  if (!selected?.certificationId) return;
  if (!validateRequired()) return;

  if (isProcessing) return;

  const entityId = selected.certificationId;
  const pendingDocs = docManagerRef.current?.getSelectedCount() ?? 0;

  setIsProcessing(true);

  try {
    const payload: Partial<Omit<FinancialCertification, "certificationId">> = {
      requestId: form.requestId ?? null,
      certCode: form.certCode!.trim(),
      certNumber: form.certNumber!.trim(),
      budget: form.budget!.trim(),
      certBudgetDate: toEcuadorMidnightISO(form.certBudgetDate!),

      rmuHour: form.rmuHour ?? 0,
      rmuCon: form.rmuCon ?? 0,
      status: Number(form.status ?? 2),

      filename: form.filename ?? selected.filename ?? null,
      filepath: form.filepath ?? selected.filepath ?? null,
      createdAt: selected.createdAt,
      createdBy: selected.createdBy,
    };

    // 1) Guardar certificación
    const resp: any = await updateAsync({ id: entityId, payload });
    if (resp?.status !== "success") return;

    // 2) Si hay archivos seleccionados => subir + refrescar
    if (pendingDocs > 0) {
      const result = await docManagerRef.current?.uploadAll(entityId);
      await docManagerRef.current?.refresh(entityId);

      // Si falló el upload, NO cambies a view (para reintentar)
      if (!result?.success) {
        toast({
          title: "⚠️ Certificación actualizada, pero upload falló",
          description: result?.message ?? "Revisa los archivos seleccionados.",
          variant: "destructive",
        });
        return;
      }

      docManagerRef.current?.clearSelected();
    }

    // 3) Final OK
    setMode("view");
  } catch (e: any) {
    toast({
      title: "❌ Error inesperado",
      description: e?.message ?? "No se pudo guardar la edición.",
      variant: "destructive",
    });
  } finally {
    setIsProcessing(false);
  }
};

  // upload for existing entity (view/edit)
  const handleUploadSelectedExisting = async () => {
    const entityId = selected?.certificationId;
    if (!entityId) return;

    const selectedCount = docManagerRef.current?.getSelectedCount() ?? 0;
    if (selectedCount === 0) {
      toast({
        title: "⚠️ Sin archivos",
        description: "Selecciona al menos un archivo antes de subir.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await docManagerRef.current?.uploadAll(entityId);
      await docManagerRef.current?.refresh(entityId);

      if (result?.success) {
        toast({ title: "✅ Documentos subidos", description: `${result.message} (OK: ${result.uploaded})` });
      } else {
        toast({
          title: "⚠️ Upload con errores",
          description: `${result?.message ?? "Revisa los archivos."}`,
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "❌ Error inesperado",
        description: e?.message ?? "No se pudo subir los documentos.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Header actions (view/edit) */}
        {!isCreate && selected && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
            <Badge variant="outline" className="text-xs w-fit">ID: FINCERT:{selected.certificationId}</Badge>

            <div className="flex flex-col sm:flex-row gap-2">
              {selected.filename && selected.filepath && (
                <Button
                  variant="outline"
                  onClick={() => onDownloadLegacy(directoryCode, selected.filepath!, selected.filename!)}
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar (legacy)
                </Button>
              )}

              {isView && (
                <Button onClick={() => setMode("edit")} className="w-full sm:w-auto">
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <Label htmlFor="certCode">Código *</Label>
            <Input
              id="certCode"
              value={form.certCode ?? ""}
              disabled={isView}
              onChange={(e) => setForm((f) => ({ ...f, certCode: e.target.value }))}
              placeholder="Ej: CERT-2025-001"
            />
          </div>

          <div>
            <Label htmlFor="certNumber">Número *</Label>
            <Input
              id="certNumber"
              value={form.certNumber ?? ""}
              disabled={isView}
              onChange={(e) => setForm((f) => ({ ...f, certNumber: e.target.value }))}
              placeholder="Ej: 1100"
            />
          </div>

          <div>
            <Label htmlFor="budget">Presupuesto *</Label>
            <Input
              id="budget"
              value={form.budget ?? ""}
              disabled={isView}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              placeholder="Ej: Cert. 1100 / POA 2025"
            />
          </div>

          <div>
            <Label htmlFor="certBudgetDate">Fecha de Certificación *</Label>
            <Input
              id="certBudgetDate"
              type="date"
              disabled={isView}
              value={form.certBudgetDate ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, certBudgetDate: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="rmuHour">RMU por Hora</Label>
            <Input
              id="rmuHour"
              type="number"
              step="0.01"
              disabled={isView}
              value={form.rmuHour ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, rmuHour: Number(e.target.value) }))}
            />
          </div>

          <div>
            <Label htmlFor="rmuCon">RMU por Contrato</Label>
            <Input
              id="rmuCon"
              type="number"
              step="0.01"
              disabled={isView}
              value={form.rmuCon ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, rmuCon: Number(e.target.value) }))}
            />
          </div>

          <div>
            <Label htmlFor="createdBy">Creado por (ID usuario)</Label>
            <Input id="createdBy" type="number" value={Number(form.createdBy ?? ctxCreatedBy)} disabled />
          </div>

          {/* ✅ Estado desde TiposReferenciaAPI */}
          <div>
            <Label>Estado *</Label>
            <Select
              value={form.status !== undefined && form.status !== null ? String(form.status) : ""}
              onValueChange={(val) => setForm((f) => ({ ...f, status: Number(val) }))}
              disabled={isView || isLoadingRefTypes}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un estado" />
              </SelectTrigger>
              <SelectContent>
                {refTypes.map((rt: any) => {
                  const id = rt.id ?? rt.refTypeId ?? rt.typeId ?? rt.valueId;
                  const label = rt.name ?? rt.description ?? rt.code ?? `ID ${id}`;
                  return (
                    <SelectItem key={id} value={String(id)}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {isLoadingRefTypes && (
              <p className="text-xs text-gray-500 mt-1">Cargando estados...</p>
            )}
            {refTypesError && (
              <p className="text-xs text-red-600 mt-1">Error al cargar estados.</p>
            )}
          </div>
        </div>

        {/* =========================
            CREATE BLOCK: primero upload, luego guardar (como pediste)
           ========================= */}
        {isCreate && (
          <div className="mt-8 space-y-4">
            {/* <div className="flex items-center justify-between">
              <Label className="mb-2 block">🧪 Carga múltiple (Orquestador)</Label>
              <Badge variant="outline" className="text-xs">NO reemplaza al actual</Badge>
            </div> */}

            <ReusableDocumentManager
              ref={docManagerRef}
              label="Anexar Documentos"
              directoryCode={directoryCode}
              entityType="FINCERT"
              entityId={createdCertificationId ?? undefined}
              entityReady={!!createdCertificationId}
              allowSelectWhenNotReady={true}
              showInternalUploadButton={false}
              relativePath={relativePath}
              accept={accept}
              maxSizeMB={maxSizeMB}
              maxFiles={10}
              disabled={isCreatePending || isProcessing}
              roles={{ canUpload: true, canPreview: true, canDownload: true, canDelete: true }}
              documentType={{ enabled: true, required: true }}// category se omite => usa DOCUMENT_TYPE 
                           
            />

            <p className="text-xs text-muted-foreground">
              Selecciona archivos aquí y luego presiona <b>Guardar</b>.
            </p>

            {/* ✅ Botón Guardar al final (DESPUÉS del upload) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2">
              <Badge variant="outline" className="text-xs w-fit">
                entityId: {createdCertificationId ? `FINCERT:${createdCertificationId}` : "PENDING"}
              </Badge>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={close}
                  className="w-full sm:w-auto"
                  disabled={isCreatePending || isProcessing}
                >
                  Cancelar
                </Button>

                <Button
                  onClick={handleCreateAndUpload}
                  disabled={isCreatePending || isProcessing}
                  className="w-full sm:w-auto"
                >
                  {(isCreatePending || isProcessing) ? "Procesando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW/EDIT docs */}
        {!isCreate && selected && (
          <div className="mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <Label className="mb-2 block">Documentos (Orquestador)</Label>

              <Button
                variant="outline"
                onClick={handleUploadSelectedExisting}
                disabled={isView || isProcessing}
                className="w-full sm:w-auto"
                title={isView ? "Cambia a editar para subir" : "Subir archivos seleccionados"}
              >
                {isProcessing ? "Subiendo..." : "Subir seleccionados"}
              </Button>
            </div>

            <ReusableDocumentManager
              ref={docManagerRef}
              label="Documentos (orquestador)"
              directoryCode={directoryCode}
              entityType="FINCERT"
              entityId={selected.certificationId}
              entityReady={true}
              allowSelectWhenNotReady={false}
              showInternalUploadButton={false}
              relativePath={relativePath}
              accept={accept}
              maxSizeMB={maxSizeMB}
              maxFiles={10}
              disabled={isProcessing}
              roles={{ canUpload: true, canPreview: true, canDownload: true, canDelete: true }}
              documentType={{ enabled: true, required: true }}
            />

            <p className="text-xs text-muted-foreground mt-2">
              {isView ? "Para subir nuevos documentos, presiona Editar." : "Selecciona archivos y presiona Subir seleccionados."}
            </p>
          </div>
        )}

        {/* Footer SOLO para Edit/View */}
        {!isCreate && (
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={close} className="w-full sm:w-auto">
              Cerrar
            </Button>

            {isEdit && (
              <Button
                onClick={handleSaveEdit}
                disabled={isUpdatePending || isProcessing}
                className="w-full sm:w-auto"
              >
                {isUpdatePending ? "Guardando..." : "Guardar cambios"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
