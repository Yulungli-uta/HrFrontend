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
import { Download, Pencil, FileText, CheckCircle, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import { FinancialCertificationAPI, TiposReferenciaAPI, type ApiResponse } from "@/lib/api";

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

// Categoría correcta para los estados de la certificación financiera
const FIN_CERT_STATUS_CATEGORY = "FIN_CERT_STATUS";

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

  // approve/reject directo desde el formulario de creación
  approveAsync?: (certificationId: number) => Promise<any>;
  rejectAsync?: (certificationId: number, reason: string) => Promise<any>;

  // download legacy
  onDownloadLegacy: (directoryCode: string, filepath: string, filename: string) => void;

  // approve / reject (solo en vista, certificaciones PENDIENTE_REVISION)
  onApprove?: (certificationId: number) => void;
  onReject?: (certificationId: number, reason: string) => void;
  isApprovePending?: boolean;
  isRejectPending?: boolean;

  // rechazo temporal (permite al solicitante corregir y reenviar)
  onRejectTemporary?: (certificationId: number, reason: string) => void;
  isRejectTemporaryPending?: boolean;

  // reenvío tras corrección (el solicitante reenvía a revisión)
  onResend?: (certificationId: number) => void;
  isResendPending?: boolean;
}) {
  const {
    open, onOpenChange,
    mode, setMode,
    selected, setSelected,
    directoryCode, relativePath, accept, maxSizeMB,
    refetchDir,
    ctxCreatedBy,
    createAsync, updateAsync, isCreatePending, isUpdatePending,
    approveAsync, rejectAsync,
    onDownloadLegacy,
    onApprove, onReject, isApprovePending, isRejectPending,
    onRejectTemporary, isRejectTemporaryPending,
    onResend, isResendPending,
  } = props;

  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectTempReason, setRejectTempReason] = useState("");
  const [showRejectTempInput, setShowRejectTempInput] = useState(false);

  const { toast } = useToast();

  const isCreate = mode === "create";
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const docManagerRef = useRef<ReusableDocumentManagerHandle | null>(null);
  const contractRequestDocsRef = useRef<ReusableDocumentManagerHandle | null>(null);

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
    queryKey: ["refTypes", FIN_CERT_STATUS_CATEGORY],
    queryFn: () =>
      TiposReferenciaAPI.byCategory(FIN_CERT_STATUS_CATEGORY) as Promise<ApiResponse<any[]>>,
    enabled: open,
  });

  const refTypes = refTypesResponse?.status === "success" ? refTypesResponse.data : [];

  // ID del estado PENDIENTE_REVISION — comparar por ID es robusto aunque statusName llegue null
  const pendingRevisionStatusId = useMemo(() => {
    const found = refTypes.find((rt: any) => (rt.name ?? "").toUpperCase() === "PENDIENTE_REVISION");
    if (!found) return null;
    const id = found.id ?? found.refTypeId ?? found.typeId ?? found.valueId;
    return id != null ? Number(id) : null;
  }, [refTypes]);

  const isPendingRevision =
    selected != null &&
    pendingRevisionStatusId != null &&
    Number(selected.status) === pendingRevisionStatusId;

  const pendingCorrectionStatusId = useMemo(() => {
    const found = refTypes.find((rt: any) => (rt.name ?? "").toUpperCase() === "PENDIENTE_CORRECCION");
    if (!found) return null;
    const id = found.id ?? found.refTypeId ?? found.typeId ?? found.valueId;
    return id != null ? Number(id) : null;
  }, [refTypes]);

  const isPendingCorrection =
    selected != null &&
    pendingCorrectionStatusId != null &&
    Number(selected.status) === pendingCorrectionStatusId;

  // =========================
  // 2) ContractRequest: lista + mapeos + preview (requestId)
  // =========================
  const cr = useContractRequest(CONTRACT_REQUEST_DIRECTORY_CODE);

  const [requestSearch, setRequestSearch] = useState<string>("");

  // ID del estado PENDIENTE_CERT_FINANCIERA en solicitudes de contrato
  const pendingCertFinancieraId = useMemo(() => {
    const found = cr.statuses.find(
      (s: any) => (s.name ?? "").toUpperCase() === "PENDIENTE_CERT_FINANCIERA"
    );
    return found ? found.id : null;
  }, [cr.statuses]);

  const filteredContractRequests = useMemo(() => {
    const list = cr.contracts ?? [];
    // solo solicitudes en PENDIENTE_CERT_FINANCIERA
    const pendingOnly =
      pendingCertFinancieraId != null
        ? list.filter((x) => Number(x.status) === pendingCertFinancieraId)
        : list.filter((x) => (x.statusText ?? "").toUpperCase().includes("PENDIENTE_CERT"));

    const q = requestSearch.trim().toLowerCase();
    if (!q) return pendingOnly;

    return pendingOnly.filter((x) => {
      const modality = cr.workModalityNameById.get(Number(x.workModalityId)) ?? "";
      const dept = cr.departmentNameById.get(Number(x.departmentId)) ?? "";
      const obs = x.observation ?? "";
      const haystack = `${x.requestId} ${modality} ${dept} ${obs}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [requestSearch, cr.contracts, cr.workModalityNameById, cr.departmentNameById, pendingCertFinancieraId]);

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
    status: null, // se asigna a PENDIENTE_REVISION desde catálogo
    requestId: null,
  });

  const [form, setForm] = useState<FormState>(buildEmptyForm);

  const confirmedContract: UIContractRequest | null = useMemo(() => {
    if (!form.requestId) return null;
    return (cr.contracts ?? []).find((x) => Number(x.requestId) === Number(form.requestId)) ?? null;
  }, [form.requestId, cr.contracts]);

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
      setIsProcessing(false);
      docManagerRef.current?.clearSelected();
      setRequestSearch("");
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
        status: selected.status ?? null,
      });

      setIsProcessing(false);
      docManagerRef.current?.clearSelected();
      setShowContractRequestDocs(false);
    }
  }, [open, selected, isCreate, ctxCreatedBy]);

  // En CREATE, auto-asignar PENDIENTE_REVISION cuando carga el catálogo
  useEffect(() => {
    if (!isCreate || form.status != null || refTypes.length === 0) return;
    const found = refTypes.find((rt: any) => (rt.name ?? "").toUpperCase() === "PENDIENTE_REVISION");
    if (!found) return;
    const id = found.id ?? found.refTypeId ?? found.typeId ?? found.valueId;
    if (id != null) setForm((f) => ({ ...f, status: Number(id) }));
  }, [refTypes, isCreate, form.status]);

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
    if (isCreate && pendingRevisionStatusId == null) {
      toast({
        title: "⚠️ Error de configuración",
        description: "No se pudo cargar el estado inicial (PENDIENTE_REVISION). Recarga la página.",
        variant: "destructive",
      });
      return false;
    }

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
    if (!isCreate && (form.status === undefined || form.status === null)) {
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
    setIsProcessing(false);
    docManagerRef.current?.clearSelected();
    setForm(buildEmptyForm());
    setRequestSearch("");
    setShowContractRequestDocs(false);
    setRejectReason("");
    setShowRejectInput(false);
    setRejectTempReason("");
    setShowRejectTempInput(false);
  };

  // =========================================
  // CREATE helpers
  // =========================================
  const buildCreatePayload = (): Omit<FinancialCertification, "certificationId"> => ({
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
    status: pendingRevisionStatusId ?? form.status ?? 0,
  });

  const extractCreatedId = (resp: any): number | null =>
    resp?.data?.certificationId ??
    resp?.data?.CertificationId ??
    resp?.data?.id ??
    resp?.data?.Id ??
    null;

  // =========================================
  // Guardar — crea + sube documentos de forma atómica.
  // Si la carga falla se elimina la certificación recién creada.
  // =========================================
  const handleGuardar = async () => {
    if (!validateRequired()) return;
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const resp: any = await createAsync(buildCreatePayload());
      if (resp?.status !== "success") { setIsProcessing(false); return; }

      const createdId = extractCreatedId(resp);
      if (!createdId) {
        toast({ title: "❌ No se obtuvo CertificationId", description: "El backend no devolvió el id creado.", variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      const selectedCount = docManagerRef.current?.getSelectedCount() ?? 0;
      if (selectedCount > 0) {
        const uploadResult = await docManagerRef.current?.uploadAll(createdId);

        if (!uploadResult || uploadResult.uploaded === 0) {
          // Transacción compensatoria: revertir la certificación recién creada
          try {
            await FinancialCertificationAPI.delete(createdId);
          } catch {
            toast({
              title: "⚠️ Error grave",
              description: `La carga de documentos falló Y la reversión también. La certificación #${createdId} quedó sin documentos. Elimínela manualmente.`,
              variant: "destructive",
            });
            setIsProcessing(false);
            close();
            return;
          }
          const errMsg =
            uploadResult?.items?.[0]?.message ??
            uploadResult?.message ??
            "La carga de documentos falló.";
          toast({
            title: "❌ Certificación no guardada",
            description: `${errMsg} El registro fue revertido automáticamente.`,
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
      }

      toast({ title: "✅ Certificación registrada", description: `Creada con ID #${createdId}.` });
      close();
    } catch (e: unknown) {
      toast({ title: "❌ Error inesperado", description: parseApiError(e).message, variant: "destructive" });
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

              {isView && isPendingRevision && (
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
                    Seleccionado: #{form.requestId}
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
                    placeholder="Ej: 1234, Departamento, Modalidad..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Request ID</Label>
                  <Select
                    disabled={isView || cr.listQ.isLoading || cr.listQ.isFetching}
                    value={form.requestId ? String(form.requestId) : ""}
                    onValueChange={(v) => {
                      const id = Number(v);
                      setForm((f) => ({ ...f, requestId: Number.isFinite(id) ? id : null }));
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

              {!isView && form.requestId && (
                <Button type="button" variant="ghost" onClick={clearConfirmedRequest}>
                  Limpiar selección
                </Button>
              )}

              <div className="h-px bg-border" />

              {confirmedContract ? (
                <ContractRequestPreviewCard
                  item={confirmedContract}
                  workModalityNameById={cr.workModalityNameById}
                  departmentNameById={cr.departmentNameById}
                  onViewDocuments={handleViewContractRequestDocs}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Selecciona un Request ID para ver el detalle.
                </p>
              )}

              {/* Documentos de CONTRACT_REQUEST (solo lectura) */}
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

          {/* Estado de la certificación — oculto en CREATE (se asigna PENDIENTE_REVISION automáticamente); en EDIT usa Aprobar/Rechazar */}
          {!isCreate && <div>
            <Label>Estado *</Label>
            <Select
              value={form.status !== undefined && form.status !== null ? String(form.status) : ""}
              onValueChange={(val) => setForm((f) => ({ ...f, status: Number(val) }))}
              disabled={isView || isEdit || isLoadingRefTypes}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingRefTypes ? "Cargando..." : "Seleccione un estado"} />
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

            {isEdit && (
              <p className="text-xs text-muted-foreground mt-1">
                Para cambiar el estado usa las acciones Aprobar / Rechazar.
              </p>
            )}
            {refTypesError && (
              <p className="text-xs text-destructive mt-1">Error al cargar estados.</p>
            )}
          </div>}
        </div>

        {/* =========================
            CREATE BLOCK: un solo botón "Guardar" — atómico
           ========================= */}
        {isCreate && (
          <div className="mt-8 space-y-4">
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
              disabled={isCreatePending || isProcessing}
              roles={{ canUpload: true, canPreview: true, canDownload: true, canDelete: true }}
              documentType={{ enabled: true, required: true }}
            />

            <p className="text-xs text-muted-foreground">
              Los documentos se subirán junto al registro. Si la carga falla, el registro se revierte automáticamente.
            </p>

            <div className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-2">
              <Button
                variant="outline"
                onClick={close}
                disabled={isCreatePending || isProcessing}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGuardar}
                disabled={isCreatePending || isProcessing}
                className="w-full sm:w-auto"
              >
                {isProcessing ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        )}

        {/* VIEW/EDIT docs */}
        {!isCreate && selected && (
          <div className="mt-8 space-y-3">
            <Label className="block">Documentos</Label>

            <ReusableDocumentManager
              ref={docManagerRef}
              label="Documentos"
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
              roles={{
                canUpload: isEdit,
                canDelete: isEdit,
                canPreview: true,
                canDownload: true,
              }}
              documentType={{ enabled: true, required: true }}
            />

            {isEdit && (
              <Button
                variant="outline"
                onClick={handleUploadSelectedExisting}
                disabled={isProcessing}
                className="w-full sm:w-auto"
              >
                {isProcessing ? "Subiendo..." : "Subir seleccionados"}
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              {isView
                ? "Para subir nuevos documentos, presiona Editar."
                : "Selecciona archivos y presiona Subir."}
            </p>
          </div>
        )}

        {/* Panel de Aprobar/Rechazar — solo en vista y cuando está PENDIENTE_REVISION */}
        {isView && selected && isPendingRevision && (onApprove || onReject) && (
          <div className="mt-6 border rounded-lg p-4 space-y-3 bg-muted/30">
            {selected.requestSummary && (
              <div className="text-sm grid grid-cols-3 gap-2 text-center mb-2">
                <div className="bg-background rounded p-2">
                  <p className="text-muted-foreground text-xs">Solicitados</p>
                  <p className="font-bold text-lg">{selected.requestSummary.numberOfPeopleToHire}</p>
                </div>
                <div className="bg-background rounded p-2">
                  <p className="text-muted-foreground text-xs">Contratados</p>
                  <p className="font-bold text-lg">{selected.requestSummary.totalPeopleHired}</p>
                </div>
                <div className="bg-background rounded p-2">
                  <p className="text-muted-foreground text-xs">Pendientes</p>
                  <p className="font-bold text-lg text-primary">{selected.requestSummary.pendingCount}</p>
                </div>
              </div>
            )}

            <p className="text-sm font-medium">Decisión del Financiero</p>

            {showRejectTempInput ? (
              /* Rechazo temporal */
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  El solicitante podrá corregir la solicitud y reenviarla a certificación.
                </p>
                <Textarea
                  placeholder="Motivo del rechazo temporal (requerido)"
                  value={rejectTempReason}
                  onChange={(e) => setRejectTempReason(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-50"
                    disabled={!rejectTempReason.trim() || isRejectTemporaryPending}
                    onClick={() => {
                      if (!selected.certificationId || !rejectTempReason.trim()) return;
                      onRejectTemporary?.(selected.certificationId, rejectTempReason.trim());
                      setShowRejectTempInput(false);
                      setRejectTempReason("");
                      close();
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {isRejectTemporaryPending ? "Enviando..." : "Confirmar rechazo temporal"}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowRejectTempInput(false); setRejectTempReason(""); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : showRejectInput ? (
              /* Rechazo definitivo */
              <div className="space-y-2">
                <p className="text-xs text-destructive font-medium">
                  Rechazo definitivo — la solicitud pasará a CERT_RECHAZADA y no podrá ser reenviada.
                </p>
                <Textarea
                  placeholder="Motivo del rechazo (requerido)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={!rejectReason.trim() || isRejectPending}
                    onClick={() => {
                      if (!selected.certificationId || !rejectReason.trim()) return;
                      onReject?.(selected.certificationId, rejectReason.trim());
                      setShowRejectInput(false);
                      setRejectReason("");
                      close();
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {isRejectPending ? "Rechazando..." : "Confirmar rechazo definitivo"}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowRejectInput(false); setRejectReason(""); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              /* Botones principales */
              <div className="flex flex-wrap gap-2">
                {onApprove && (
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={isApprovePending || isRejectPending || isRejectTemporaryPending}
                    onClick={() => {
                      if (!selected.certificationId) return;
                      onApprove(selected.certificationId);
                      close();
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isApprovePending ? "Aprobando..." : "Aprobar"}
                  </Button>
                )}
                {onRejectTemporary && (
                  <Button
                    variant="outline"
                    className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-50"
                    disabled={isApprovePending || isRejectPending || isRejectTemporaryPending}
                    onClick={() => setShowRejectTempInput(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rechazar temporalmente
                  </Button>
                )}
                {onReject && (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={isApprovePending || isRejectPending || isRejectTemporaryPending}
                    onClick={() => setShowRejectInput(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rechazar
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Panel de Reenviar — solo en vista y cuando está PENDIENTE_CORRECCION */}
        {isView && selected && isPendingCorrection && onResend && (
          <div className="mt-6 border rounded-lg p-4 space-y-3 bg-amber-50/50 border-amber-200">
            <p className="text-sm font-medium text-amber-800">Certificación con corrección pendiente</p>
            <p className="text-xs text-muted-foreground">
              El financiero solicitó correcciones. Una vez corregida la información, reenvía para revisión.
            </p>
            <Button
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
              disabled={isResendPending}
              onClick={() => {
                if (!selected.certificationId) return;
                onResend(selected.certificationId);
                close();
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isResendPending ? "Reenviando..." : "Reenviar a revisión"}
            </Button>
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