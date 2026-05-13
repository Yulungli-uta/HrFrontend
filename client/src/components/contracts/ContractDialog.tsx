// src/components/contracts/ContractDialog.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SearchableSelect,
  type SearchItem,
} from "@/components/contracts/SearchableSelect";
import {
  FileText,
  User,
  Building2,
  Briefcase,
  Workflow,
  Save,
  Edit3,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  FolderOpen,
  History,
  Plus,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Award,
} from "lucide-react";

import {
  ReusableDocumentManager,
  type ReusableDocumentManagerHandle,
} from "@/components/ReusableDocumentManager";

import { PersonSearchCombobox } from "@/components/personnelActions/PersonSearchCombobox";

import {
  FinancialCertificationAPI,
  ContractTypeAPI,
  DepartamentosAPI,
  ContractsRHAPI,
  ContractRequestAPI,
  VwJobWithDegreeAndGroupAPI,
  VistaDetallesEmpleadosAPI,
} from "@/lib/api";
import type { VwJobWithDegreeAndGroup } from "@/lib/api";
import { JobSelect } from "@/components/ui/JobSelect";
import { DepartmentSelect } from "@/components/departments/DepartmentSelect";

import {
  CONTRACT_DIRECTORY_CODE,
  CONTRACT_ENTITY_TYPE,
  FINANCE_CERTIFICATION_DIRECTORY_CODE,
  FINANCE_CERTIFICATION_ENTITY_TYPE,
  CONTRACT_REQUEST_DIRECTORY_CODE,
  CONTRACT_REQUEST_ENTITY_TYPE,
} from "@/features/constants";
import { getEntityId, getEntityLabel } from "@/utils/options";

import { useToast } from "@/hooks/use-toast";
import { parseApiError } from "@/lib/error-handling";
import { useContractWorkflow } from "@/hooks/contracts/useContractWorkflow";
import { useContractDetail } from "@/hooks/contracts/useContractDetail";
import { ContractHistory } from "@/components/contracts/ContractHistory";
import { AddendumList } from "@/components/contracts/AddendumList";
import { StatusChangeDialog } from "@/components/contracts/StatusChangeDialog";
import { ContractActions } from "@/components/contracts/ContractActions";
import { DocumentPreviewPanel } from "@/components/personnelActions/DocumentPreviewPanel";
import {
  RequestPeoplePicker,
  type RequestPersonItem,
} from "@/components/contracts/RequestPeoplePicker";

type DialogMode = "create" | "view" | "edit";

type ContractsCreateDto = {
  certificationID?: number | null;
  parentID?: number | null;
  contractCode: string;
  personID: number;
  contractTypeID: number;
  departmentID: number;
  jobID?: number | null;
  startDate: string;
  endDate: string;
  status: number;
  contractDescription?: string | null;
  authorityNominatorId?: number | null;
  dthDirectorId?: number | null;
};

type ContractsUpdateDto = ContractsCreateDto & {
  contractID: number;
  rowVersion?: string | null;
};

type ContractLike = {
  contractID?: number;
  ContractID?: number;
  id?: number;
  rowVersion?: string | null;
  certificationID?: number | null;
  parentID?: number | null;
  contractCode?: string;
  personID?: number;
  contractTypeID?: number;
  departmentID?: number;
  jobID?: number | null;
  startDate?: string;
  endDate?: string;
  status?: number;
  contractDescription?: string | null;
  authorityNominatorId?: number | null;
  dthDirectorId?: number | null;
};

function getContractId(x?: ContractLike | null): number | undefined {
  const v = x?.contractID ?? x?.ContractID ?? x?.id;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function buildEmptyForm(
  initial?: Partial<ContractsCreateDto>
): ContractsCreateDto {
  return {
    contractCode: "",
    personID: 0,
    contractTypeID: 0,
    departmentID: 0,
    jobID: null,
    certificationID: null,
    parentID: null,
    startDate: "",
    endDate: "",
    status: 0,
    contractDescription: null,
    authorityNominatorId: null,
    dthDirectorId: null,
    ...initial,
  };
}

function buildFormFromSelected(
  selected?: ContractLike | null,
  initial?: Partial<ContractsCreateDto>
): ContractsCreateDto {
  return {
    certificationID: selected?.certificationID ?? null,
    parentID: selected?.parentID ?? null,
    contractCode: selected?.contractCode ?? "",
    personID: selected?.personID ?? 0,
    contractTypeID: selected?.contractTypeID ?? 0,
    departmentID: selected?.departmentID ?? 0,
    jobID: selected?.jobID ?? null,
    startDate: (selected?.startDate ?? "").slice(0, 10),
    endDate: (selected?.endDate ?? "").slice(0, 10),
    status: selected?.status ?? 0,
    contractDescription: selected?.contractDescription ?? null,
    authorityNominatorId: selected?.authorityNominatorId ?? null,
    dthDirectorId: selected?.dthDirectorId ?? null,
    ...initial,
  };
}

function extractNumericId(obj: unknown): number | undefined {
  const raw: any = obj;
  if (raw == null) return undefined;

  if (typeof raw === "number" && Number.isFinite(raw)) return raw;

  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return undefined;

    const n = Number(s);
    if (Number.isFinite(n)) return n;

    const m = s.match(/\d+/);
    if (m) {
      const n2 = Number(m[0]);
      if (Number.isFinite(n2)) return n2;
    }

    return undefined;
  }

  if (typeof raw === "object") {
    const candidates = [
      raw.id,
      raw.value,
      raw.typeID,
      raw.TypeID,

      raw.personId,
      raw.departmentId,
      raw.contractTypeId,
      raw.certificationId,
      raw.parentId,
      raw.jobId,
      raw.contractId,

      raw.personID,
      raw.PersonID,
      raw.departmentID,
      raw.DepartmentID,
      raw.jobID,
      raw.JobID,
      raw.certificationID,
      raw.CertificationID,
      raw.contractTypeID,
      raw.ContractTypeID,
      raw.parentID,
      raw.ParentID,
      raw.contractID,
      raw.ContractID,
    ];

    for (const c of candidates) {
      const n = extractNumericId(c);
      if (typeof n === "number") return n;
    }
  }

  return undefined;
}

function toSearchItems(items: any[]): SearchItem[] {
  const seen = new Set<number>();
  const out: SearchItem[] = [];

  for (const x of items ?? []) {
    const id = extractNumericId(getEntityId(x) ?? x);
    if (!id || !Number.isFinite(id)) continue;
    if (seen.has(id)) continue;

    seen.add(id);
    out.push({
      value: String(id),
      label: String(getEntityLabel(x) ?? id),
    });
  }

  return out;
}


export function ContractDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: DialogMode;
  setMode: (m: DialogMode) => void;
  selected?: ContractLike | null;
  initial?: Partial<ContractsCreateDto>;
}) {
  const { open, onOpenChange, mode, setMode, selected, initial } = props;

  const isCreate = mode === "create";
  const isView = mode === "view";

  const qc = useQueryClient();
  const { toast } = useToast();
  const docManagerRef = useRef<ReusableDocumentManagerHandle>(null);
  const certDocManagerRef = useRef<ReusableDocumentManagerHandle>(null);
  const requestDocManagerRef = useRef<ReusableDocumentManagerHandle>(null);
  const autoSwitchedToEditRef = useRef(false);

  const [form, setForm] = useState<ContractsCreateDto>(() =>
    buildEmptyForm(initial)
  );
  const [activeTab, setActiveTab] = useState<string>("info");
  const [wizardStep, setWizardStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showCertDocs, setShowCertDocs] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [showRequestDocs, setShowRequestDocs] = useState(false);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<number | null>(null);
  const [isReservingCode, setIsReservingCode] = useState(false);

  // persona del detalle de solicitud seleccionada para pre-completar el form
  const [selectedRequestPersonId, setSelectedRequestPersonId] = useState<number | null>(null);
  const [isPersonFromDetail, setIsPersonFromDetail] = useState(false);
  const [selectedPersonLabel, setSelectedPersonLabel] = useState<string | null>(null);

  const selectedId = useMemo(() => getContractId(selected), [selected]);

  useEffect(() => {
    if (!open) {
      autoSwitchedToEditRef.current = false;
      return;
    }

    setForm(
      isCreate
        ? buildEmptyForm(initial)
        : buildFormFromSelected(selected, initial)
    );
    setActiveTab(isCreate ? "info" : "overview");
    setWizardStep(1);
    setValidationErrors([]);
    setShowCertDocs(false);
    setSelectedRequestId(null);
    setShowRequestDocs(false);
    setSelectedRequestPersonId(null);
    setIsPersonFromDetail(false);
    setSelectedPersonLabel(null);
    docManagerRef.current?.clearSelected();
  }, [open, isCreate, selectedId, selected, initial]);

  // Lookups normales
  // Solo carga certificaciones APROBADAS para el selector de creación
  const qCerts = useQuery({
    queryKey: ["financial-certifications", "approved"],
    queryFn: () => FinancialCertificationAPI.paged({ statusName: "APROBADA", pageSize: 200 }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const qTypes = useQuery({
    queryKey: ["contract-types"],
    queryFn: () => ContractTypeAPI.list(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const qDepts = useQuery({
    queryKey: ["departments"],
    queryFn: () => DepartamentosAPI.list(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const qJobs = useQuery({
    queryKey: ['vw-jobs-select', 'all'],
    queryFn: () => VwJobWithDegreeAndGroupAPI.getAll(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const qEmployees = useQuery({
    queryKey: ["employees-details-all"],
    queryFn: () => VistaDetallesEmpleadosAPI.list(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  // paged devuelve { items, page, ... }
  const certs: any[] =
    qCerts.data?.status === "success"
      ? ((qCerts.data.data as any)?.items ?? [])
      : [];
  const types =
    qTypes.data?.status === "success" ? qTypes.data.data ?? [] : [];
  const depts =
    qDepts.data?.status === "success" ? qDepts.data.data ?? [] : [];
  const jobs: VwJobWithDegreeAndGroup[] =
    qJobs.data?.status === "success" ? qJobs.data.data ?? [] : [];

  const entityId = isCreate ? undefined : selectedId;

  const docDetail = useContractDetail(entityId ?? null);
  const docStatusCode = docDetail.docStatus?.documentStatus ?? "BORRADOR";

  const wf = useContractWorkflow({
    enabled: open,
    currentStatusTypeId: form.status,
  });

  const selectedType = useMemo(
    () =>
      types.find(
        (t: any) => extractNumericId(getEntityId(t) ?? t) === form.contractTypeID
      ),
    [types, form.contractTypeID]
  );

  const selectedDept = useMemo(
    () =>
      depts.find(
        (d) => extractNumericId(getEntityId(d) ?? d) === form.departmentID
      ),
    [depts, form.departmentID]
  );

  const selectedJob = useMemo(
    () => jobs.find((j) => j.jobID === (form.jobID ?? undefined)),
    [jobs, form.jobID]
  );

  const employeeItems: SearchItem[] = useMemo(() => {
    const raw = (qEmployees.data as any)?.data ?? qEmployees.data ?? [];
    const arr = Array.isArray(raw) ? raw : raw?.items ?? [];
    return arr
      .map((e: any) => {
        const id = e.employeeID ?? e.EmployeeID ?? e.employeeId;
        if (!id) return null;
        const name = `${e.firstName ?? e.FirstName ?? ""} ${e.lastName ?? e.LastName ?? ""}`.trim();
        const idCard = e.idCard ?? e.IDCard ?? "";
        return {
          value: String(id),
          label: idCard ? `${name} — ${idCard}` : name,
        } as SearchItem;
      })
      .filter(Boolean) as SearchItem[];
  }, [qEmployees.data]);

  const selectedCert = useMemo(
    () =>
      certs.find(
        (c: any) =>
          extractNumericId(getEntityId(c) ?? c) ===
          (form.certificationID ?? undefined)
      ) as any | undefined,
    [certs, form.certificationID]
  );

  // requestId de la solicitud de contrato asociada a la certificación seleccionada
  const certRequestId: number | null = useMemo(() => {
    if (!selectedCert) return null;
    const raw = selectedCert.requestId ?? selectedCert.RequestId ?? selectedCert.requestID ?? null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [selectedCert]);

  // Auto-vincula solicitud cuando la certificación tiene requestId
  useEffect(() => {
    if (!open || !form.certificationID) return;
    if (certRequestId != null && certRequestId > 0) {
      setSelectedRequestId(certRequestId);
      setShowRequestDocs(false);
    }
  }, [open, form.certificationID, certRequestId]);

  const isRootContract = !form.parentID;

  const isCertApproved = useMemo(() => {
    if (!form.certificationID) return true;
    const name = (selectedCert?.statusName ?? selectedCert?.StatusName ?? "").toUpperCase();
    return name === "APROBADA";
  }, [form.certificationID, selectedCert]);

  const isAdendumType = useMemo(() => {
    if (!form.contractTypeID) return false;
    const t = types.find(
      (t: any) => extractNumericId(getEntityId(t) ?? t) === form.contractTypeID
    ) as any;
    const name = (t ? getEntityLabel(t) : "").toLowerCase().trim();
    return name.includes("adendum") || name.includes("addendum");
  }, [types, form.contractTypeID]);

  const qParentContracts = useQuery({
    queryKey: ["contracts-rh", "parents-select"],
    queryFn: () => ContractsRHAPI.listPaged({ page: 1, pageSize: 200 }),
    enabled: open && (isAdendumType || !!form.parentID),
    staleTime: 60_000,
  });


  const qPendingCount = useQuery({
    queryKey: ["contract-request-pending-count", certRequestId],
    queryFn: () => ContractRequestAPI.pendingCount(certRequestId!),
    enabled: open && isRootContract && certRequestId != null && certRequestId > 0,
    staleTime: 30_000,
  });

  const pendingCount: number | null = useMemo(() => {
    if (!isRootContract) return null;
    if (qPendingCount.data?.status === "success") {
      return qPendingCount.data.data.pendingCount ?? null;
    }
    return null;
  }, [isRootContract, qPendingCount.data]);

  // Items enriquecidos para el SearchableSelect de certificaciones
  const certItems = useMemo<SearchItem[]>(() => {
    return certs
      .map((c: any) => {
        const id = extractNumericId(getEntityId(c) ?? c);
        if (!id) return null;
        const code = c.certCode ?? c.CertCode ?? '';
        const num = c.certNumber ?? c.CertNumber ?? '';
        const budget = c.budget ?? c.Budget ?? '';
        const parts = [code, num, budget].filter(Boolean);
        const label = parts.length > 0
          ? parts.join(' — ')
          : `Certificación #${id}`;
        return { value: String(id), label } as SearchItem;
      })
      .filter((x): x is SearchItem => x !== null);
  }, [certs]);


  const parentContractItems = useMemo<SearchItem[]>(() => {
    const raw =
      qParentContracts.data?.status === "success"
        ? ((qParentContracts.data.data as any)?.items ?? [])
        : [];
    return (raw as any[])
      .filter((c) => !c.parentID)
      .map((c) => {
        const id = c.contractID ?? c.ContractID;
        const code = c.contractCode ?? "";
        return {
          value: String(id),
          label: code ? `#${id} — ${code}` : `Contrato #${id}`,
        } as SearchItem;
      })
      .filter((x) => !!x.value && x.value !== "undefined" && x.value !== "0");
  }, [qParentContracts.data]);

  const statusPreview = useMemo(() => {
    const s = wf.statuses.find((x: any) => x.typeID === form.status);
    return s ? s.name : `Estado ${form.status}`;
  }, [wf.statuses, form.status]);

  const borradorStatusId = useMemo(() => {
    const s = wf.statuses.find((x: any) => x.name === "BORRADOR");
    return s?.typeID ?? null;
  }, [wf.statuses]);

  // En create mode, fijar el estado inicial a BORRADOR cuando carguen los ref_types
  useEffect(() => {
    if (!isCreate || !open || !borradorStatusId) return;
    setForm((f) => ({ ...f, status: borradorStatusId }));
  }, [isCreate, open, borradorStatusId]);

  // Auto-switch a modo edición cuando el contrato está en BORRADOR
  useEffect(() => {
    if (!open || isCreate || autoSwitchedToEditRef.current || !borradorStatusId) return;
    if (mode === "view" && form.status === borradorStatusId) {
      autoSwitchedToEditRef.current = true;
      setMode("edit");
    }
  }, [open, isCreate, mode, form.status, borradorStatusId, setMode]);

  function handleSelectRequestPerson(person: RequestPersonItem) {
    setSelectedRequestPersonId(person.requestPersonId);
    setIsPersonFromDetail(person.personId != null);
    setSelectedPersonLabel(person.personFullName ?? null);

    setForm((f) => ({
      ...f,
      ...(person.personId != null ? { personID: person.personId } : {}),
      ...(person.jobId > 0 ? { jobID: person.jobId } : {}),
      ...(person.startDate ? { startDate: person.startDate.slice(0, 10) } : {}),
      ...(person.endDate ? { endDate: person.endDate.slice(0, 10) } : {}),
    }));
  }

  const createMut = useMutation({
    mutationFn: (dto: ContractsCreateDto) => ContractsRHAPI.create(dto),
  });

  const updateMut = useMutation({
    mutationFn: (dto: ContractsUpdateDto) =>
      ContractsRHAPI.update(dto.contractID, dto),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["contracts-rh"] });

      const selCount = docManagerRef.current?.getSelectedCount() ?? 0;
      if (selCount > 0 && entityId) {
        try {
          await docManagerRef.current?.uploadAll(entityId);
        } catch (err) {
          toast({
            title: "⚠️ Contrato guardado",
            description: `Los datos se guardaron pero falló la subida de documentos. ${parseApiError(err).message}`,
            variant: "destructive",
          });
        }
      }

      setMode("view");
    },
    onError: (err: unknown) => {
      toast({
        title: "❌ Error al guardar",
        description: parseApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const changeStatusMut = useMutation({
    mutationFn: (vars: {
      contractId: number;
      newStatusTypeId: number;
      comment: string | null;
    }) =>
      ContractsRHAPI.changeStatus(vars.contractId, {
        toStatusTypeID: vars.newStatusTypeId,
        comment: vars.comment,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["contracts-rh"] });
      await qc.invalidateQueries({
        queryKey: ["contracts", "history", entityId],
      });

      const updatedContract = await ContractsRHAPI.getById(entityId!);
      if (updatedContract.status === "success" && updatedContract.data) {
        setForm(buildFormFromSelected(updatedContract.data));
      }
    },
  });

  function validateForm(): string[] {
    const errors: string[] = [];

    if (!form.contractCode?.trim())
      errors.push("El código del contrato es obligatorio");
    if (!form.personID || form.personID <= 0)
      errors.push("Debe seleccionar una persona");
    if (!form.contractTypeID || form.contractTypeID <= 0)
      errors.push("Debe seleccionar un tipo de contrato");
    if (isAdendumType && !form.parentID)
      errors.push("El adendum requiere seleccionar un contrato padre");
    if (!form.departmentID || form.departmentID <= 0)
      errors.push("Debe seleccionar un departamento");
    if (!form.startDate)
      errors.push("La fecha de inicio es obligatoria");
    if (!form.endDate)
      errors.push("La fecha de fin es obligatoria");

    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (start.getTime() > end.getTime()) {
        errors.push(
          "La fecha de inicio no puede ser posterior a la fecha de fin"
        );
      }
    }

    return errors;
  }

  async function handleSave() {
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setActiveTab("info");
      return;
    }
    setValidationErrors([]);

    if (isCreate) {
      // Reservar el código correlativo en el backend antes de crear
      let finalContractCode = form.contractCode;
      if (form.contractTypeID > 0) {
        setIsReservingCode(true);
        try {
          const numRes = await ContractTypeAPI.getNextNumber(form.contractTypeID);
          if (numRes.status === "success" && numRes.data) {
            const d = numRes.data;
            finalContractCode = d.documentNumber?.trim()
              || (d.prefix
                ? `${d.prefix}-${d.year}-${String(d.sequence).padStart(3, '0')}`
                : `${d.year}-${String(d.sequence).padStart(3, '0')}`);
            setForm((f) => ({ ...f, contractCode: finalContractCode }));
          }
        } catch (e: unknown) {
          toast({ title: "❌ Error al reservar código de contrato", description: parseApiError(e).message, variant: "destructive" });
          setIsReservingCode(false);
          return;
        } finally {
          setIsReservingCode(false);
        }
      }

      let newContractId: number | undefined;
      try {
        const res = await createMut.mutateAsync({ ...form, contractCode: finalContractCode });
        if ((res as any).status !== "success") {
          toast({ title: "❌ Error al crear contrato", description: (res as any).error?.message ?? "Error desconocido.", variant: "destructive" });
          return;
        }
        newContractId = (res as any).data?.contract?.contractID ?? (res as any).data?.contractID;
      } catch (e: unknown) {
        toast({ title: "❌ Error al crear contrato", description: parseApiError(e).message, variant: "destructive" });
        return;
      }

      if (!newContractId) {
        toast({ title: "❌ Error", description: "No se pudo obtener el ID del contrato creado.", variant: "destructive" });
        return;
      }

      // Subida de documentos — transacción compensatoria si falla
      const selCount = docManagerRef.current?.getSelectedCount() ?? 0;
      if (selCount > 0) {
        try {
          await docManagerRef.current?.uploadAll(newContractId);
        } catch (err: unknown) {
          try {
            await ContractsRHAPI.delete(newContractId);
            qc.invalidateQueries({ queryKey: ["contracts-rh"] });
          } catch {
            toast({
              title: "⚠️ Error grave",
              description: `Falló la subida de documentos Y la reversión. El contrato #${newContractId} quedó sin documentos. Elimínelo manualmente.`,
              variant: "destructive",
            });
            onOpenChange(false);
            return;
          }
          toast({
            title: "❌ Contrato no creado",
            description: `No se pudo subir los documentos. El contrato fue revertido. ${parseApiError(err).message}`,
            variant: "destructive",
          });
          return;
        }
      }

      // Vincular con detalle de solicitud (best-effort)
      if (isRootContract && certRequestId && certRequestId > 0) {
        try {
          if (selectedRequestPersonId != null) {
            await ContractRequestAPI.generateContractFromPerson(
              certRequestId, selectedRequestPersonId, { contractId: newContractId }
            );
          } else {
            await ContractRequestAPI.generateContractFromAvailablePerson(certRequestId, {
              personId: form.personID,
              contractId: newContractId,
              jobId: form.jobID ?? null,
            });
          }
          qc.invalidateQueries({ queryKey: ["contract-request-pending-count", certRequestId] });
          qc.invalidateQueries({ queryKey: ["contract-request-pending-people", certRequestId] });
          qc.invalidateQueries({ queryKey: ["contract-request-slots", certRequestId] });
          qc.invalidateQueries({ queryKey: ["/api/v1/rh/cv/contract-request"] });
        } catch (err) {
          console.error("Error al vincular persona con la solicitud:", err);
        }
      }

      qc.invalidateQueries({ queryKey: ["contracts-rh"] });
      toast({ title: "✅ Contrato creado", description: `Contrato #${newContractId} guardado correctamente.` });
      onOpenChange(false);

    } else if (selectedId) {
      const dto: ContractsUpdateDto = {
        ...form,
        contractID: selectedId,
        rowVersion: selected?.rowVersion,
      };
      updateMut.mutate(dto);
    }
  }

  function handleChangeStatus(newStatusTypeId: number) {
    setPendingStatusId(newStatusTypeId);
    setStatusDialogOpen(true);
  }

  async function confirmStatusChange(comment: string | null) {
    if (!entityId || !pendingStatusId) return;

    await changeStatusMut.mutateAsync({
      contractId: entityId,
      newStatusTypeId: pendingStatusId,
      comment,
    });

    setPendingStatusId(null);
  }

  function canProceedStep(step: number): boolean {
    if (step === 1) {
      const base = !!(form.personID && form.contractTypeID && form.departmentID);
      if (isAdendumType && !form.parentID) return false;
      if (!isCertApproved) return false;
      // Bloquear si ya no hay cupos disponibles en la solicitud
      if (isRootContract && pendingCount !== null && pendingCount <= 0) return false;
      return base;
    }
    if (step === 2) {
      return !!(form.contractCode && form.startDate && form.endDate);
    }
    return true;
  }

  const isAddendum = !!form.parentID;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">
            {isCreate
              ? isAddendum
                ? "Nuevo Addendum"
                : "Nuevo Contrato"
              : `Contrato #${selectedId ?? ""}`}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Formulario de gestión de contratos
          </DialogDescription>

          <div className="space-y-2 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">
                  {isCreate
                    ? isAddendum
                      ? "Nuevo Addendum"
                      : "Nuevo Contrato"
                    : `Contrato #${selectedId}`}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isCreate
                    ? "Complete la información del contrato en los pasos siguientes"
                    : isView
                      ? "Consulte los detalles del contrato"
                      : "Edite la información del contrato"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isCreate && (
                  <Badge
                    variant={isView ? "secondary" : "default"}
                    className="text-xs"
                  >
                    {isView ? (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Solo lectura
                      </>
                    ) : (
                      <>
                        <Edit3 className="h-3 w-3 mr-1" />
                        Editando
                      </>
                    )}
                  </Badge>
                )}
                {isAddendum && (
                  <Badge variant="outline" className="text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Addendum
                  </Badge>
                )}
              </div>
            </div>

            {isCreate && (
              <div className="flex items-center gap-2 pt-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${wizardStep > step
                          ? "bg-success text-white"
                          : wizardStep === step
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {wizardStep > step ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          step
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium">
                          {step === 1
                            ? "Datos básicos"
                            : step === 2
                              ? "Fechas y código"
                              : "Documentos"}
                        </div>
                      </div>
                    </div>
                    {step < 3 && <div className="w-12 h-0.5 bg-muted" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {!isCreate ? (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">
                  <Eye className="h-4 w-4 mr-2" />
                  Resumen
                </TabsTrigger>
                <TabsTrigger value="info">
                  <FileText className="h-4 w-4 mr-2" />
                  Información
                </TabsTrigger>
                <TabsTrigger value="documents">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Documentos
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="h-4 w-4 mr-2" />
                  Historial
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Resumen del Contrato</CardTitle>
                    <CardDescription>
                      Vista rápida de la información principal
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/15 rounded-lg">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            Tipo de Contrato
                          </p>
                          <p className="font-medium">
                            {selectedType ? getEntityLabel(selectedType) : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-accent rounded-lg">
                          <Building2 className="h-5 w-5 text-secondary-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            Departamento
                          </p>
                          <p className="font-medium">
                            {selectedDept ? getEntityLabel(selectedDept) : "—"}
                          </p>
                        </div>
                      </div>

                      {selectedJob && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-success/15 rounded-lg">
                            <Briefcase className="h-5 w-5 text-success" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">
                              Cargo
                            </p>
                            <p className="font-medium">
                              {selectedJob.jobDescription ?? `Cargo #${selectedJob.jobID}`}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-secondary/15 rounded-lg">
                          <Clock className="h-5 w-5 text-secondary-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            Código
                          </p>
                          <p className="font-medium font-mono">
                            {form.contractCode || "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-success/15 rounded-lg">
                          <Clock className="h-5 w-5 text-success" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            Fecha de Inicio
                          </p>
                          <p className="font-medium">{form.startDate || "—"}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-destructive/15 rounded-lg">
                          <Clock className="h-5 w-5 text-destructive" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            Fecha de Fin
                          </p>
                          <p className="font-medium">{form.endDate || "—"}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/15 rounded-lg">
                          <Workflow className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            Estado Actual
                          </p>
                          <Badge className="mt-1">{statusPreview}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {form.contractDescription && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Descripción
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {form.contractDescription}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {entityId && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                        <span>Flujo Documental</span>
                        <Badge variant="outline">{docStatusCode}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ContractActions
                        contractId={entityId}
                        status={docStatusCode}
                        isBusy={docDetail.isBusy}
                        onGenerateDocument={docDetail.generateDocument}
                        onMarkPending={docDetail.markPending}
                        onFinalize={docDetail.finalize}
                        onCancel={docDetail.cancelContract}
                        onUploadSuccess={docDetail.invalidate}
                      />
                    </CardContent>
                  </Card>
                )}

                {entityId && (
                  <DocumentPreviewPanel
                    pdfBase64={docDetail.generatedPdfBase64 ?? undefined}
                    fileName={(docDetail.generatedFileName ?? docDetail.docStatus?.fileName) ?? undefined}
                    generatedDocumentId={docDetail.docStatus?.generatedDocumentId}
                    onRegenerate={() => docDetail.generateDocument({ forceRegenerate: true })}
                    isRegenerating={docDetail.isGeneratingDocument}
                  />
                )}

                {entityId && !isView && wf.allowedNextStatuses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Acciones de Flujo
                      </CardTitle>
                      <CardDescription>
                        Transiciones disponibles desde el estado actual
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {wf.allowedNextStatuses.map((s: any) => (
                          <Button
                            key={`next-${s.typeID}`}
                            variant="outline"
                            onClick={() => handleChangeStatus(s.typeID)}
                            disabled={changeStatusMut.isPending}
                          >
                            <Workflow className="h-4 w-4 mr-2" />
                            {s.name}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="info" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Información del Contrato</CardTitle>
                    <CardDescription>
                      {isView
                        ? "Datos completos del contrato"
                        : "Edite los campos necesarios"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Identificación
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contractCode">
                            Código de Contrato *
                          </Label>
                          <Input
                            id="contractCode"
                            value={form.contractCode}
                            readOnly
                            disabled
                            className="bg-muted"
                            placeholder="Generado automáticamente"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="status">Estado</Label>
                          <Select
                            value={form.status > 0 ? String(form.status) : undefined}
                            onValueChange={(v) =>
                              setForm((f) => ({
                                ...f,
                                status: Number(v),
                              }))
                            }
                            disabled={isView || wf.qStatuses.isLoading}
                          >
                            <SelectTrigger id="status">
                              <SelectValue
                                placeholder={
                                  wf.qStatuses.isLoading
                                    ? "Cargando..."
                                    : "Seleccione estado"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {wf.statuses.map((s: any, i: number) => (
                                <SelectItem
                                  key={`status-edit-${s.typeID ?? i}`}
                                  value={String(s.typeID)}
                                >
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="certification">
                            Certificación Financiera
                          </Label>
                          <Select
                            value={
                              form.certificationID
                                ? String(form.certificationID)
                                : ""
                            }
                            onValueChange={(v) =>
                              setForm((f) => ({
                                ...f,
                                certificationID: Number(v),
                              }))
                            }
                            disabled={isView || qCerts.isLoading}
                          >
                            <SelectTrigger id="certification">
                              <SelectValue
                                placeholder={
                                  qCerts.isLoading
                                    ? "Cargando..."
                                    : "Seleccione"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {certs.map((c: any) => {
                                const id = extractNumericId(
                                  getEntityId(c) ?? c
                                );
                                if (!id) return null;

                                return (
                                  <SelectItem key={id} value={String(id)}>
                                    {getEntityLabel(c)}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>

                          {/* Cupo disponible para contratos raíz */}
                          {isRootContract && form.certificationID && certRequestId && (
                            <div className={`text-xs rounded p-2 ${pendingCount === null
                              ? "text-muted-foreground"
                              : pendingCount > 0
                                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : "bg-destructive/10 text-destructive"
                              }`}>
                              {pendingCount === null
                                ? "Consultando cupo..."
                                : pendingCount > 0
                                  ? `Cupo disponible: ${pendingCount} persona(s) pendiente(s)`
                                  : "Sin cupo — no se pueden crear más contratos para esta solicitud"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Detalles del Contrato
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contractType">
                            Tipo de Contrato *
                          </Label>
                          <SearchableSelect
                            value={
                              form.contractTypeID
                                ? String(form.contractTypeID)
                                : null
                            }
                            items={toSearchItems(types)}
                            placeholder="Seleccione tipo"
                            searchPlaceholder="Buscar tipo..."
                            disabled={isView || qTypes.isLoading}
                            onChange={(v) => {
                              const typeId = Number(v) || 0;
                              const t = types.find(
                                (t: any) => extractNumericId(getEntityId(t) ?? t) === typeId
                              ) as any;
                              const typeName = (t ? getEntityLabel(t) : "").toLowerCase();
                              const newIsAdendum =
                                typeName.includes("adendum") || typeName.includes("addendum");
                              setForm((f) => ({
                                ...f,
                                contractTypeID: typeId,
                                parentID: newIsAdendum ? f.parentID : null,
                              }));
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="department">Departamento *</Label>
                          <DepartmentSelect
                            value={form.departmentID || null}
                            onChange={(id) =>
                              setForm((f) => ({ ...f, departmentID: id ?? 0 }))
                            }
                            disabled={isView}
                            placeholder="Seleccione departamento"
                          />
                        </div>

                        {(isAdendumType || !!form.parentID) && (
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="parentContract">Contrato Padre *</Label>
                            {isView ? (
                              <p className="text-sm py-2 font-medium">
                                {form.parentID ? `Contrato #${form.parentID}` : "—"}
                              </p>
                            ) : (
                              <>
                                <SearchableSelect
                                  value={form.parentID ? String(form.parentID) : null}
                                  items={parentContractItems}
                                  placeholder={
                                    qParentContracts.isLoading
                                      ? "Cargando..."
                                      : "Seleccione contrato padre"
                                  }
                                  searchPlaceholder="Buscar por código..."
                                  disabled={qParentContracts.isLoading}
                                  isLoading={qParentContracts.isLoading}
                                  onChange={(v) =>
                                    setForm((f) => ({
                                      ...f,
                                      parentID: Number(v) || null,
                                    }))
                                  }
                                />
                                {isAdendumType && !form.parentID && (
                                  <p className="text-xs text-destructive">
                                    Seleccione el contrato que este adendum modifica.
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="job">Cargo (Opcional)</Label>
                          <JobSelect
                            value={form.jobID ?? null}
                            onChange={(id) => setForm((f) => ({ ...f, jobID: id }))}
                            disabled={isView}
                            placeholder="Seleccione cargo"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Autoridad Nominadora</Label>
                          <SearchableSelect
                            value={form.authorityNominatorId ? String(form.authorityNominatorId) : null}
                            items={employeeItems}
                            placeholder="Seleccione autoridad..."
                            searchPlaceholder="Buscar por nombre o cédula..."
                            isLoading={qEmployees.isLoading}
                            disabled={isView}
                            onChange={(v) => setForm((f) => ({ ...f, authorityNominatorId: Number(v) || null }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Director DTH</Label>
                          <SearchableSelect
                            value={form.dthDirectorId ? String(form.dthDirectorId) : null}
                            items={employeeItems}
                            placeholder="Seleccione director..."
                            searchPlaceholder="Buscar por nombre o cédula..."
                            isLoading={qEmployees.isLoading}
                            disabled={isView}
                            onChange={(v) => setForm((f) => ({ ...f, dthDirectorId: Number(v) || null }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Vigencia
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startDate">Fecha de Inicio *</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={form.startDate}
                            disabled={isView}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                startDate: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="endDate">Fecha de Fin *</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={form.endDate}
                            min={form.startDate || undefined}
                            disabled={isView}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                endDate: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold mb-3">
                        Descripción
                      </h3>
                      <div className="space-y-2">
                        <Textarea
                          id="description"
                          value={form.contractDescription ?? ""}
                          disabled={isView}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              contractDescription: e.target.value,
                            }))
                          }
                          placeholder="Detalles adicionales del contrato..."
                          rows={4}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4 mt-4">
                <ReusableDocumentManager
                  ref={docManagerRef}
                  label="Documentos del Contrato"
                  directoryCode={CONTRACT_DIRECTORY_CODE}
                  entityType={CONTRACT_ENTITY_TYPE}
                  entityId={entityId}
                  entityReady={!!entityId}
                  allowSelectWhenNotReady={true}
                  showInternalUploadButton={true}
                  relativePath=""
                  accept="*/*"
                  maxSizeMB={20}
                  maxFiles={10}
                  disabled={isView}
                  roles={{
                    canUpload: !isView,
                    canPreview: true,
                    canDownload: true,
                    canDelete: !isView,
                  }}
                  documentType={{ enabled: true, required: true }}
                />
              </TabsContent>

              <TabsContent value="history" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ContractHistory
                    contractId={entityId ?? 0}
                    enabled={!!entityId}
                  />
                  <AddendumList
                    contractId={entityId ?? 0}
                    enabled={!!entityId}
                    onCreateAddendum={() => {
                      setMode("create");
                      setForm((f) => ({
                        ...buildEmptyForm(initial),
                        parentID: entityId,
                        contractCode: f.contractCode?.trim()
                          ? `${f.contractCode}-ADD`
                          : "ADD",
                      }));
                    }}
                    onOpenAddendum={(a) => {
                      const addendumId = a.contractID ?? a.ContractID;
                      if (addendumId) {
                        window.location.hash = `#contract-${addendumId}`;
                      }
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-6">
              {wizardStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Paso 1: Datos Básicos</CardTitle>
                    <CardDescription>
                      Seleccione el tipo de contrato, certificación financiera y datos del contratado
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* ── Tipo de Contrato (primero) ── */}
                    <div className="space-y-2">
                      <Label htmlFor="wizard-type">Tipo de Contrato *</Label>
                      <SearchableSelect
                        value={form.contractTypeID ? String(form.contractTypeID) : null}
                        items={toSearchItems(types)}
                        placeholder="Seleccione tipo"
                        searchPlaceholder="Buscar tipo..."
                        disabled={qTypes.isLoading}
                        onChange={(v) => {
                          const typeId = Number(v) || 0;
                          const t = types.find(
                            (t: any) => extractNumericId(getEntityId(t) ?? t) === typeId
                          ) as any;
                          const numberingPrefix = (t?.numberingPrefix ?? '') as string;
                          const year = (t?.numberingYear as number | undefined) ?? new Date().getFullYear();
                          const nextSeq = ((t?.numberingLastSequence as number | undefined) ?? 0) + 1;
                          const previewCode = numberingPrefix
                            ? `${numberingPrefix}-${year}-${String(nextSeq).padStart(3, '0')}`
                            : `${year}-${String(nextSeq).padStart(3, '0')}`;
                          const typeName = (t ? getEntityLabel(t) : "").toLowerCase();
                          const newIsAdendum =
                            typeName.includes("adendum") || typeName.includes("addendum");
                          setForm((f) => ({
                            ...f,
                            contractTypeID: typeId,
                            contractCode: typeId > 0 ? previewCode : f.contractCode,
                            parentID: newIsAdendum ? f.parentID : null,
                            certificationID: newIsAdendum ? f.certificationID : null,
                          }));
                          setShowCertDocs(false);
                        }}
                      />
                    </div>

                    {/* ── Contrato Padre (solo adendum, justo después del tipo) ── */}
                    {isAdendumType && (
                      <div className="space-y-2">
                        <Label htmlFor="wizard-parent">
                          Contrato Padre *
                          <span className="text-xs font-normal text-muted-foreground ml-2">
                            requerido para adendum
                          </span>
                        </Label>
                        <SearchableSelect
                          value={form.parentID ? String(form.parentID) : null}
                          items={parentContractItems}
                          placeholder={
                            qParentContracts.isLoading
                              ? "Cargando contratos..."
                              : "Seleccione contrato padre"
                          }
                          searchPlaceholder="Buscar por código..."
                          disabled={qParentContracts.isLoading}
                          isLoading={qParentContracts.isLoading}
                          onChange={(v) => {
                            const parentId = Number(v) || null;
                            const raw =
                              qParentContracts.data?.status === "success"
                                ? ((qParentContracts.data.data as any)?.items ?? [])
                                : [];
                            const parent = (raw as any[]).find(
                              (c: any) => (c.contractID ?? c.ContractID) === parentId
                            );
                            const parentCertId =
                              parent?.certificationID ?? parent?.CertificationID ?? null;
                            setForm((f) => ({
                              ...f,
                              parentID: parentId,
                              certificationID:
                                parentCertId !== null ? parentCertId : f.certificationID,
                            }));
                            setShowCertDocs(false);
                          }}
                        />
                        {!form.parentID && (
                          <p className="text-xs text-destructive">
                            Seleccione el contrato que este adendum modifica.
                          </p>
                        )}
                      </div>
                    )}

                    {/* ── Certificación Financiera ── */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        Certificación Financiera
                        <span className="font-normal text-muted-foreground">
                          {isAdendumType ? "(del contrato padre)" : "(solo aprobadas)"}
                        </span>
                      </h4>

                      {/* Adendum con padre seleccionado: muestra info de la cert auto-cargada */}
                      {isAdendumType && form.parentID ? (
                        form.certificationID ? (
                          <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            Certificación <span className="font-medium">#{form.certificationID}</span> cargada desde el contrato padre.
                          </p>
                        ) : (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            El contrato padre no tiene certificación financiera vinculada.
                          </p>
                        )
                      ) : (
                        <SearchableSelect
                          value={form.certificationID ? String(form.certificationID) : null}
                          items={certItems}
                          placeholder={
                            qCerts.isLoading ? "Cargando..." : "Seleccione certificación aprobada"
                          }
                          searchPlaceholder="Buscar por código o número..."
                          disabled={qCerts.isLoading}
                          onChange={(v) => {
                            setForm((f) => ({
                              ...f,
                              certificationID: Number(v) || null,
                            }));
                            setShowCertDocs(false);
                          }}
                        />
                      )}

                      {form.certificationID && (
                        <>
                          {!isCertApproved && (
                            <Alert variant="destructive" className="py-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                La certificación no está aprobada. Solo se pueden crear contratos con certificaciones en estado <strong>APROBADA</strong>.
                              </AlertDescription>
                            </Alert>
                          )}

                          {certRequestId ? (
                            <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Solicitud <span className="font-medium">#{certRequestId}</span> vinculada automáticamente.
                            </p>
                          ) : (
                            <Alert className="py-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                Esta certificación no tiene solicitud de contrato vinculada.
                              </AlertDescription>
                            </Alert>
                          )}

                          {isRootContract && certRequestId && (
                            <div className={`text-xs rounded p-2 ${pendingCount === null
                              ? "text-muted-foreground"
                              : pendingCount > 0
                                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : "bg-destructive/10 text-destructive"
                              }`}>
                              {pendingCount === null
                                ? "Consultando cupo..."
                                : pendingCount > 0
                                  ? `Cupo disponible: ${pendingCount} persona(s) pendiente(s)`
                                  : "Sin cupo — no se pueden crear más contratos para esta solicitud"}
                            </div>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setShowCertDocs((v) => !v)}
                          >
                            <FolderOpen className="h-4 w-4 mr-2" />
                            {showCertDocs
                              ? "Ocultar archivos de certificación"
                              : "Ver archivos de certificación"}
                            {showCertDocs
                              ? <ChevronUp className="h-4 w-4 ml-auto" />
                              : <ChevronDown className="h-4 w-4 ml-auto" />}
                          </Button>

                          {showCertDocs && (
                            <ReusableDocumentManager
                              ref={certDocManagerRef}
                              label=""
                              directoryCode={FINANCE_CERTIFICATION_DIRECTORY_CODE}
                              entityType={FINANCE_CERTIFICATION_ENTITY_TYPE}
                              entityId={form.certificationID}
                              entityReady={true}
                              allowSelectWhenNotReady={false}
                              showInternalUploadButton={false}
                              relativePath=""
                              accept="*/*"
                              maxSizeMB={20}
                              maxFiles={50}
                              disabled={true}
                              roles={{
                                canUpload: false,
                                canPreview: true,
                                canDownload: true,
                                canDelete: false,
                              }}
                              documentType={{ enabled: false }}
                            />
                          )}
                        </>
                      )}
                    </div>

                    {/* ── Archivos de Solicitud de Contrato (auto-vinculada desde la cert) ── */}
                    {selectedRequestId && (
                      <div className="border rounded-lg p-4 space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          Solicitud de Contrato
                          <span className="font-medium text-muted-foreground">
                            #{selectedRequestId}
                          </span>
                        </h4>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setShowRequestDocs((v) => !v)}
                        >
                          <FolderOpen className="h-4 w-4 mr-2" />
                          {showRequestDocs
                            ? "Ocultar archivos de solicitud"
                            : "Ver archivos de solicitud"}
                          {showRequestDocs
                            ? <ChevronUp className="h-4 w-4 ml-auto" />
                            : <ChevronDown className="h-4 w-4 ml-auto" />}
                        </Button>

                        {showRequestDocs && (
                          <ReusableDocumentManager
                            ref={requestDocManagerRef}
                            label=""
                            directoryCode={CONTRACT_REQUEST_DIRECTORY_CODE}
                            entityType={CONTRACT_REQUEST_ENTITY_TYPE}
                            entityId={selectedRequestId}
                            entityReady={true}
                            allowSelectWhenNotReady={false}
                            showInternalUploadButton={false}
                            relativePath=""
                            accept="*/*"
                            maxSizeMB={20}
                            maxFiles={50}
                            disabled={true}
                            roles={{
                              canUpload: false,
                              canPreview: true,
                              canDownload: true,
                              canDelete: false,
                            }}
                            documentType={{ enabled: false }}
                          />
                        )}
                      </div>
                    )}

                    {/* ── Personas sugeridas del detalle de solicitud ── */}
                    {isRootContract && certRequestId && certRequestId > 0 && (
                      <RequestPeoplePicker
                        requestId={certRequestId}
                        selectedRequestPersonId={selectedRequestPersonId}
                        onSelect={(person) => {
                          handleSelectRequestPerson(person);
                        }}
                      />
                    )}

                    {/* ── Persona ── */}
                    <div className="space-y-2">
                      <Label htmlFor="wizard-person">
                        Persona *
                        {isPersonFromDetail && (
                          <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-normal">
                            (pre-completada desde el detalle)
                          </span>
                        )}
                      </Label>
                      <PersonSearchCombobox
                        value={form.personID || null}
                        staticLabel={isPersonFromDetail ? (selectedPersonLabel ?? undefined) : undefined}
                        onSelect={(personId) => {
                          setForm((f) => ({ ...f, personID: personId }));
                          setSelectedRequestPersonId(null);
                          setIsPersonFromDetail(false);
                          setSelectedPersonLabel(null);
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="wizard-dept">Departamento *</Label>
                        <DepartmentSelect
                          value={form.departmentID || null}
                          onChange={(id) =>
                            setForm((f) => ({ ...f, departmentID: id ?? 0 }))
                          }
                          placeholder="Seleccione departamento"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="wizard-job">Cargo (Opcional)</Label>
                        <JobSelect
                          value={form.jobID ?? null}
                          onChange={(id) => setForm((f) => ({ ...f, jobID: id }))}
                          placeholder="Seleccione cargo"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Autoridad Nominadora <span className="text-destructive">*</span></Label>
                        <SearchableSelect
                          value={form.authorityNominatorId ? String(form.authorityNominatorId) : null}
                          items={employeeItems}
                          placeholder="Seleccione autoridad..."
                          searchPlaceholder="Buscar por nombre o cédula..."
                          isLoading={qEmployees.isLoading}
                          onChange={(v) => setForm((f) => ({ ...f, authorityNominatorId: Number(v) || null }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Director DTH <span className="text-destructive">*</span></Label>
                        <SearchableSelect
                          value={form.dthDirectorId ? String(form.dthDirectorId) : null}
                          items={employeeItems}
                          placeholder="Seleccione director..."
                          searchPlaceholder="Buscar por nombre o cédula..."
                          isLoading={qEmployees.isLoading}
                          onChange={(v) => setForm((f) => ({ ...f, dthDirectorId: Number(v) || null }))}
                        />
                      </div>
                    </div>

                  </CardContent>
                </Card>
              )}

              {wizardStep === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Paso 2: Fechas y Código</CardTitle>
                    <CardDescription>
                      Defina el código, vigencia y estado del contrato
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="wizard-code">Código del Contrato *</Label>
                      <Input
                        id="wizard-code"
                        value={form.contractCode}
                        readOnly
                        disabled
                        className="bg-muted"
                        placeholder="Seleccione tipo en paso 1"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="wizard-start">
                          Fecha de Inicio *
                        </Label>
                        <Input
                          id="wizard-start"
                          type="date"
                          value={form.startDate}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              startDate: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="wizard-end">Fecha de Fin *</Label>
                        <Input
                          id="wizard-end"
                          type="date"
                          value={form.endDate}
                          min={form.startDate || undefined}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              endDate: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Estado</Label>
                      {isCreate ? (
                        <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted text-sm">
                          <Badge variant="secondary">BORRADOR</Badge>
                          <span className="text-muted-foreground text-xs">asignado automáticamente</span>
                        </div>
                      ) : (
                        <Select
                          value={form.status > 0 ? String(form.status) : undefined}
                          onValueChange={(v) =>
                            setForm((f) => ({
                              ...f,
                              status: Number(v),
                            }))
                          }
                          disabled={wf.qStatuses.isLoading}
                        >
                          <SelectTrigger id="wizard-status">
                            <SelectValue
                              placeholder={
                                wf.qStatuses.isLoading
                                  ? "Cargando..."
                                  : "Seleccione estado"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {wf.statuses.map((s: any, i: number) => (
                              <SelectItem
                                key={`status-wizard-${s.typeID ?? i}`}
                                value={String(s.typeID)}
                              >
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wizard-desc">
                        Descripción (Opcional)
                      </Label>
                      <Textarea
                        id="wizard-desc"
                        value={form.contractDescription ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            contractDescription: e.target.value,
                          }))
                        }
                        placeholder="Detalles adicionales..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {wizardStep === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Paso 3: Documentos (Opcional)</CardTitle>
                    <CardDescription>
                      Puede adjuntar documentos ahora o después de crear el
                      contrato
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ReusableDocumentManager
                      ref={docManagerRef}
                      label="Documentos del Contrato"
                      directoryCode={CONTRACT_DIRECTORY_CODE}
                      entityType={CONTRACT_ENTITY_TYPE}
                      entityId={undefined}
                      entityReady={false}
                      allowSelectWhenNotReady={true}
                      showInternalUploadButton={false}
                      relativePath=""
                      accept="*/*"
                      maxSizeMB={20}
                      maxFiles={10}
                      disabled={false}
                      roles={{
                        canUpload: true,
                        canPreview: true,
                        canDownload: true,
                        canDelete: true,
                      }}
                      documentType={{ enabled: true, required: true }}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4 border-t">
            {isCreate ? (
              <>
                <div className="flex gap-2">
                  {wizardStep > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => setWizardStep((s) => s - 1)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Anterior
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  {wizardStep < 3 ? (
                    <Button
                      onClick={() => setWizardStep((s) => s + 1)}
                      disabled={!canProceedStep(wizardStep)}
                    >
                      Siguiente
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSave}
                      disabled={createMut.isPending || isReservingCode || (isRootContract && pendingCount !== null && pendingCount <= 0)}
                      title={isRootContract && pendingCount === 0 ? "Sin cupo disponible para esta solicitud" : undefined}
                    >
                      {isReservingCode ? (
                        <>Generando código...</>
                      ) : createMut.isPending ? (
                        <>Creando...</>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Crear Contrato
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cerrar
                </Button>

                {!isView && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setMode("view")}
                    >
                      Cancelar edición
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={updateMut.isPending}
                    >
                      {updateMut.isPending ? (
                        <>Guardando...</>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Cambios
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {isView && (
                  <Button onClick={() => setMode("edit")}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <StatusChangeDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        title="Cambiar Estado del Contrato"
        description="Por favor indique el motivo del cambio de estado para auditoría."
        required={true}
        onConfirm={confirmStatusChange}
      />
    </>
  );
}