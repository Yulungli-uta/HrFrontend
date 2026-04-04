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
import { Download, Pencil, FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { ReusableDocumentManager, type ReusableDocumentManagerHandle } from "@/components/ReusableDocumentManager";
import { useToast } from "@/hooks/use-toast";

import type { DialogMode, FinancialCertification, UIFinancialCertification } from "@/types/certificationFinance";
import type { DirectoryParameter } from "@/types/directoryParameter";

import { useQuery } from "@tanstack/react-query";
import { TiposReferenciaAPI, type ApiResponse } from "@/lib/api";

// ✅ ContractRequest (para requestId + preview + documentos)
import { useContractRequest } from "@/hooks/contractRequest/useContractRequests";
import type { UIContractRequest } from "@/types/contractRequest";
import { parseApiError } from '@/lib/error-handling';
import { 
  CONTRACT_REQUEST_DIRECTORY_CODE,
  CONTRACT_REQUEST_ENTITY_TYPE,
  FINANCE_CERTIFICATION_DIRECTORY_CODE, 
  FINANCE_CERTIFICATION_ENTITY_TYPE
} from "@/features/constants";

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

// 👇 ESTE ES EL "ESTADO" de la certificación (ANULADO/APROBADO), NO el "tipo de archivo"
const CERT_FINANCE_TYPE_CATEGORY = "CERT_FINANCE_TYPE";

function ContractRequestPreviewCard(props: {
  item: UIContractRequest;
  workModalityNameById: Map<number, string>;
  departmentNameById: Map<number, string>;
  onViewDocuments?: () => void;
}) {
  const { item, workModalityNameById, departmentNameById, onViewDocuments } = props;

  const modality = workModalityNameById.get(Number(item.workModalityId)) ?? "—";
  const dept = departmentNameById.get(Number(item.departmentId)) ?? "—";

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm">
            <span className="font-medium">Request ID:</span> #{item.requestId}
          </div>
          <Badge variant={item.statusVariant}>{item.statusText}</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Modalidad:</span> {modality}
          </div>
          <div>
            <span className="text-muted-foreground">Departamento:</span> {dept}
          </div>
          <div>
            <span className="text-muted-foreground">Personas:</span> {item.numberOfPeopleToHire}
          </div>
          <div>
            <span className="text-muted-foreground">Horas:</span> {item.numberHour}
          </div>
        </div>

        {item.observation ? (
          <div className="text-sm">
            <span className="text-muted-foreground">Observación:</span> {item.observation}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Sin observación.</div>
        )}

        {onViewDocuments && (
          <div className="pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onViewDocuments}
              className="w-full"
            >
              <FileText className="h-4 w-4 mr-2" />
              Ver documentos anexados
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
  const contractRequestDocsRef = useRef<ReusableDocumentManagerHandle | null>(null);

  const [createdCertificationId, setCreatedCertificationId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ Estado para mostrar/ocultar documentos de CONTRACT_REQUEST
  const [showContractRequestDocs, setShowContractRequestDocs] = useState(false);

  // =========================
  // 1) Estados desde TiposReferenciaAPI (Select "Estado *")
  // =========================
  const {
    data: refTypesResponse,
    isLoading: isLoadingRefTypes,
    error: refTypesError,
  } = useQuery<ApiResponse<any[]>>({
    queryKey: ["refTypes", CERT_FINANCE_TYPE_CATEGORY],
    queryFn: () =>
      TiposReferenciaAPI.byCategory(CERT_FINANCE_TYPE_CATEGORY) as Promise<ApiResponse<any[]>>,
    enabled: open,
  });

  const refTypes = refTypesResponse?.status === "success" ? refTypesResponse.data : [];

  // =========================
  // 2) ContractRequest: lista + mapeos + preview (requestId)
  // =========================
  const cr = useContractRequest(CONTRACT_REQUEST_DIRECTORY_CODE);

  const [requestSearch, setRequestSearch] = useState<string>("");
  const [candidateRequestId, setCandidateRequestId] = useState<number | null>(null);

  const filteredContractRequests = useMemo(() => {
    const q = requestSearch.trim().toLowerCase();
    const list = cr.contracts ?? [];
    if (!q) return list;

    return list.filter((x) => {
      const modality = cr.workModalityNameById.get(Number(x.workModalityId)) ?? "";
      const dept = cr.departmentNameById.get(Number(x.departmentId)) ?? "";
      const statusText = x.statusText ?? "";
      const obs = x.observation ?? "";
      const haystack = `${x.requestId} ${modality} ${dept} ${statusText} ${obs}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [requestSearch, cr.contracts, cr.workModalityNameById, cr.departmentNameById]);

  const candidateContract: UIContractRequest | null = useMemo(() => {
    if (!candidateRequestId) return null;
    return (cr.contracts ?? []).find((x) => Number(x.requestId) === Number(candidateRequestId)) ?? null;
  }, [candidateRequestId, cr.contracts]);

  // =========================
  // 3) Form
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

  const confirmedContract: UIContractRequest | null = useMemo(() => {
    if (!form.requestId) return null;
    return (cr.contracts ?? []).find((x) => Number(x.requestId) === Number(form.requestId)) ?? null;
  }, [form.requestId, cr.contracts]);

  const confirmCandidateRequest = () => {
    if (!candidateContract) return;
    setForm((f) => ({ ...f, requestId: Number(candidateContract.requestId) }));
  };

  const clearConfirmedRequest = () => {
    setForm((f) => ({ ...f, requestId: null }));
    setShowContractRequestDocs(false);
  };

  useEffect(() => {
    if (open) refetchDir();
  }, [open, refetchDir]);

  /**
   * Reset total en CREATE sin selected
   * En VIEW/EDIT cargar selected + certBudgetDate => date-only
   */
  useEffect(() => {
    if (!open) return;

    if (isCreate && !selected) {
      setForm(buildEmptyForm());
      setCreatedCertificationId(null);
      setIsProcessing(false);
      docManagerRef.current?.clearSelected();

      // reset request picker state
      setRequestSearch("");
      setCandidateRequestId(null);
      setShowContractRequestDocs(false);
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

      // set request picker candidate to current selection (si existe)
      setCandidateRequestId(selected.requestId ?? null);

      setCreatedCertificationId(null);
      setIsProcessing(false);
      docManagerRef.current?.clearSelected();
      setShowContractRequestDocs(false);
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
    // ✅ RequestId obligatorio (según tu requerimiento)
    if (!form.requestId) {
      toast({
        title: "⚠️ Solicitud requerida",
        description: "Selecciona un Request ID y confirma la selección antes de guardar.",
        variant: "destructive",
      });
      return false;
    }

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

    setRequestSearch("");
    setCandidateRequestId(null);
    setShowContractRequestDocs(false);
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
    } catch (e: unknown) {
      toast({
        title: "❌ Error inesperado",
        description: parseApiError(e).message,
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

      const resp: any = await updateAsync({ id: entityId, payload });
      if (resp?.status !== "success") return;

      if (pendingDocs > 0) {
        const result = await docManagerRef.current?.uploadAll(entityId);
        await docManagerRef.current?.refresh(entityId);

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

      setMode("view");
    } catch (e: unknown) {
      toast({
        title: "❌ Error inesperado",
        description: parseApiError(e).message,
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
    } catch (e: unknown) {
      toast({
        title: "❌ Error inesperado",
        description: parseApiError(e).message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Función para mostrar documentos del CONTRACT_REQUEST confirmado
  const handleViewContractRequestDocs = () => {
    if (!confirmedContract?.requestId) {
      toast({
        title: "⚠️ Sin solicitud confirmada",
        description: "Primero debes confirmar una solicitud para ver sus documentos.",
        variant: "destructive",
      });
      return;
    }
    setShowContractRequestDocs(true);
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

        {/* =========================
            FORM (incluye RequestId + preview)
           ========================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

          {/* ✅ RequestId + preview (NO afecta al "Tipo de documento" de archivos) */}
          <Card className="col-span-2">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base">Solicitud de Contratación (Request ID)</CardTitle>
                {form.requestId ? (
                  <Badge variant="secondary" className="w-fit">
                    Confirmado: #{form.requestId}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="w-fit">Sin selección</Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="requestSearch">Buscar</Label>
                  <Input
                    id="requestSearch"
                    value={requestSearch}
                    disabled={isView}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    placeholder="Ej: 1234, Departamento, Modalidad, Estado..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Request ID (candidato)</Label>
                  <Select
                    disabled={isView || cr.listQ.isLoading || cr.listQ.isFetching}
                    value={candidateRequestId ? String(candidateRequestId) : ""}
                    onValueChange={(v) => {
                      const id = Number(v);
                      setCandidateRequestId(Number.isFinite(id) ? id : null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={cr.listQ.isLoading ? "Cargando..." : "Selecciona una solicitud"} />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {filteredContractRequests.map((x) => {
                        const modality = cr.workModalityNameById.get(Number(x.workModalityId)) ?? "—";
                        const dept = cr.departmentNameById.get(Number(x.departmentId)) ?? "—";
                        return (
                          <SelectItem key={x.requestId} value={String(x.requestId)}>
                            #{x.requestId} · {dept} · {modality} · {x.statusText}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {cr.listQ.isError && (
                    <p className="text-xs text-destructive">
                      No se pudo cargar la lista de solicitudes.
                    </p>
                  )}
                </div>
              </div>

              {!isView && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" disabled={!candidateContract} onClick={confirmCandidateRequest}>
                    Confirmar selección
                  </Button>
                  <Button type="button" variant="ghost" disabled={!form.requestId} onClick={clearConfirmedRequest}>
                    Limpiar confirmado
                  </Button>
                </div>
              )}

              <div className="h-px bg-border" />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Previsualización (candidato)</p>
                  {candidateContract ? (
                    <ContractRequestPreviewCard
                      item={candidateContract}
                      workModalityNameById={cr.workModalityNameById}
                      departmentNameById={cr.departmentNameById}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Selecciona un Request ID para ver el detalle.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Seleccionado (confirmado)</p>
                  {confirmedContract ? (
                    <ContractRequestPreviewCard
                      item={confirmedContract}
                      workModalityNameById={cr.workModalityNameById}
                      departmentNameById={cr.departmentNameById}
                      onViewDocuments={handleViewContractRequestDocs}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aún no has confirmado una solicitud.
                    </p>
                  )}
                </div>
              </div>

              {/* ✅ Sección de documentos de CONTRACT_REQUEST (solo lectura) */}
              {showContractRequestDocs && confirmedContract && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">
                      Documentos anexados en Request #{confirmedContract.requestId}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowContractRequestDocs(false)}
                    >
                      Ocultar
                    </Button>
                  </div>

                  <ReusableDocumentManager
                    ref={contractRequestDocsRef}
                    label=""
                    directoryCode={CONTRACT_REQUEST_DIRECTORY_CODE}
                    entityType={CONTRACT_REQUEST_ENTITY_TYPE}
                    entityId={confirmedContract.requestId}
                    entityReady={true}
                    allowSelectWhenNotReady={false}
                    showInternalUploadButton={false}
                    relativePath=""
                    accept="*/*"
                    maxSizeMB={20}
                    roles={{
                      canUpload: false,
                      canDelete: false,
                      canDownload: true,
                      canPreview: true,
                    }}
                  />

                  <p className="text-xs text-muted-foreground">
                    Estos documentos pertenecen a la solicitud de contratación. Solo visualización.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

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

          {/* ✅ Estado desde TiposReferenciaAPI (NO es el tipo de archivo) */}
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
              <p className="text-xs text-muted-foreground mt-1">Cargando estados...</p>
            )}
            {refTypesError && (
              <p className="text-xs text-destructive mt-1">Error al cargar estados.</p>
            )}
          </div>
        </div>

        {/* =========================
            CREATE BLOCK: primero upload, luego guardar (como pediste)
           ========================= */}
        {isCreate && (
          <div className="mt-8 space-y-4">
            <ReusableDocumentManager
              ref={docManagerRef}
              label="Anexar Documentos"
              directoryCode={FINANCE_CERTIFICATION_DIRECTORY_CODE}
              entityType={FINANCE_CERTIFICATION_ENTITY_TYPE}
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
              documentType={{ enabled: true, required: true }} // usa DOCUMENT_TYPE interno
            />

            <p className="text-xs text-muted-foreground">
              Selecciona archivos aquí y luego presiona <b>Guardar</b>.
            </p>

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