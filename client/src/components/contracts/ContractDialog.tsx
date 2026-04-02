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
} from "lucide-react";

import {
  ReusableDocumentManager,
  type ReusableDocumentManagerHandle,
} from "@/components/ReusableDocumentManager";

import {
  FinancialCertificationAPI,
  ContractTypeAPI,
  DepartamentosAPI,
  CargosAPI,
  PersonasAPI,
  ContractsRHAPI,
} from "@/lib/api";

import { CONTRACT_DIRECTORY_CODE, CONTRACT_ENTITY_TYPE } from "@/features/constants";
import { getEntityId, getEntityLabel } from "@/utils/options";

import { useContractWorkflow } from "@/hooks/contracts/useContractWorkflow";
import { usePaged } from "@/hooks/pagination/usePaged";
import { ContractHistory } from "@/components/contracts/ContractHistory";
import { AddendumList } from "@/components/contracts/AddendumList";
import { StatusChangeDialog } from "@/components/contracts/StatusChangeDialog";

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
};

type Person = {
  personId: number;
  firstName?: string;
  lastName?: string;
  idCard?: string;
  email?: string;
  isActive?: boolean;
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

function buildPersonLabel(p: Person): string {
  const fullName = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  const idCard = p.idCard?.trim();
  const email = p.email?.trim();

  const extra = [idCard, email].filter(Boolean).join(" · ");

  return extra ? `${fullName} — ${extra}` : fullName || `ID ${p.personId}`;
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
  const docManagerRef = useRef<ReusableDocumentManagerHandle>(null);

  const [form, setForm] = useState<ContractsCreateDto>(() =>
    buildEmptyForm(initial)
  );
  const [activeTab, setActiveTab] = useState<string>("info");
  const [wizardStep, setWizardStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<number | null>(null);

  // búsqueda remota personas
  const [personSearchInput, setPersonSearchInput] = useState("");
  const [personSearch, setPersonSearch] = useState("");

  const selectedId = useMemo(() => getContractId(selected), [selected]);

  useEffect(() => {
    if (!open) return;

    setForm(
      isCreate
        ? buildEmptyForm(initial)
        : buildFormFromSelected(selected, initial)
    );
    setActiveTab(isCreate ? "info" : "overview");
    setWizardStep(1);
    setValidationErrors([]);
    setPersonSearchInput("");
    setPersonSearch("");
    docManagerRef.current?.clearSelected();
  }, [open, isCreate, selectedId, selected, initial]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPersonSearch(personSearchInput.trim());
    }, 350);

    return () => window.clearTimeout(t);
  }, [personSearchInput]);

  // Lookups normales
  const qCerts = useQuery({
    queryKey: ["financial-certifications"],
    queryFn: () => FinancialCertificationAPI.list(),
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
    queryKey: ["jobs"],
    queryFn: () => CargosAPI.list(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  // Personas paginadas para CREATE
  const {
    items: pagedPeople,
    isLoading: isLoadingPeoplePaged,
    setSearch: setPeoplePagedSearch,
  } = usePaged<Person>({
    queryKey: "people-contract-select",
    queryFn: (params) => PersonasAPI.listPaged(params),
    initialPageSize: 20,
  });

  useEffect(() => {
    if (!open || !isCreate) return;
    setPeoplePagedSearch(personSearch);
  }, [open, isCreate, personSearch, setPeoplePagedSearch]);

  const certs =
    qCerts.data?.status === "success" ? qCerts.data.data ?? [] : [];
  const types =
    qTypes.data?.status === "success" ? qTypes.data.data ?? [] : [];
  const depts =
    qDepts.data?.status === "success" ? qDepts.data.data ?? [] : [];
  const jobs =
    qJobs.data?.status === "success" ? qJobs.data.data ?? [] : [];

  const entityId = isCreate ? undefined : selectedId;

  const wf = useContractWorkflow({
    enabled: open && !isCreate,
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
    () =>
      jobs.find(
        (j: any) =>
              extractNumericId(getEntityId(j) ?? j) ===
          (form.jobID ?? undefined)
      ),
    [jobs, form.jobID]
  );

  const selectedCert = useMemo(
    () =>
      certs.find(
        (c: any) =>
              extractNumericId(getEntityId(c) ?? c) ===
          (form.certificationID ?? undefined)
      ),
    [certs, form.certificationID]
  );

  const personItems = useMemo<SearchItem[]>(() => {
    const items = (pagedPeople ?? []).map((p) => ({
      value: String(p.personId),
      label: buildPersonLabel(p),
    }));

    // si ya hay seleccionado y no vino en esta página, lo mostramos igual
    if (
      form.personID > 0 &&
      !items.some((x) => x.value === String(form.personID))
    ) {
      items.unshift({
        value: String(form.personID),
        label: `Persona seleccionada (ID ${form.personID})`,
      });
    }

    return items;
  }, [pagedPeople, form.personID]);

  const statusPreview = useMemo(() => {
    const s = wf.statuses.find((x: any) => x.typeID === form.status);
    return s ? s.name : `Estado ${form.status}`;
  }, [wf.statuses, form.status]);

  const createMut = useMutation({
    mutationFn: (dto: ContractsCreateDto) => ContractsRHAPI.create(dto),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["contracts-rh"] });

      if ((res as any).status === "success" && (res as any).data?.contractID) {
        const newId = (res as any).data.contractID;

        const selCount = docManagerRef.current?.getSelectedCount() ?? 0;
        if (selCount > 0) {
          try {
            await docManagerRef.current?.uploadAll(newId);
          } catch (err) {
            console.error("Error subiendo documentos:", err);
          }
        }

        // setMode("view");
        qc.setQueryData(["contracts-rh"], (old: any) => {
          if (!old || old.status !== "success") return old;
          return { ...old, data: [...old.data, (res as any).data] };
        });
      }
    },
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
          console.error("Error subiendo documentos:", err);
        }
      }

      setMode("view");
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

  function handleSave() {
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setActiveTab("info");
      return;
    }

    setValidationErrors([]);

    if (isCreate) {
      createMut.mutate(form);
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
      return !!(form.personID && form.contractTypeID && form.departmentID);
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
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                          wizardStep > step
                            ? "bg-green-500 text-white"
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
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600" />
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
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Building2 className="h-5 w-5 text-purple-600" />
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
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Briefcase className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">
                              Cargo
                            </p>
                            <p className="font-medium">
                              {getEntityLabel(selectedJob)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Clock className="h-5 w-5 text-orange-600" />
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
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Clock className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            Fecha de Inicio
                          </p>
                          <p className="font-medium">{form.startDate || "—"}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <Clock className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            Fecha de Fin
                          </p>
                          <p className="font-medium">{form.endDate || "—"}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Workflow className="h-5 w-5 text-indigo-600" />
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
                            disabled={isView}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                contractCode: e.target.value,
                              }))
                            }
                            placeholder="Ej: CONT-2024-001"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="status">Estado</Label>
                          <Select
                            value={form.status ? String(form.status) : ""}
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
                              {wf.statuses.map((s: any) => (
                                <SelectItem
                                  key={s.typeID}
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
                            onChange={(v) =>
                              setForm((f) => ({
                                ...f,
                                contractTypeID: Number(v) || 0,
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="department">Departamento *</Label>
                          <SearchableSelect
                            value={
                              form.departmentID
                                ? String(form.departmentID)
                                : null
                            }
                            items={toSearchItems(depts)}
                            placeholder="Seleccione departamento"
                            searchPlaceholder="Buscar departamento..."
                            disabled={isView || qDepts.isLoading}
                            onChange={(v) =>
                              setForm((f) => ({
                                ...f,
                                departmentID: Number(v) || 0,
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="job">Cargo (Opcional)</Label>
                          <SearchableSelect
                            value={form.jobID ? String(form.jobID) : null}
                            items={toSearchItems(jobs)}
                            placeholder="Seleccione cargo"
                            searchPlaceholder="Buscar cargo..."
                            disabled={isView || qJobs.isLoading}
                            onChange={(v) =>
                              setForm((f) => ({
                                ...f,
                                jobID: Number(v) || null,
                              }))
                            }
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
                      Seleccione la persona, tipo de contrato y departamento
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="wizard-person">Persona *</Label>
                      <SearchableSelect
                        value={form.personID ? String(form.personID) : null}
                        items={personItems}
                        placeholder="Seleccione una persona"
                        searchPlaceholder="Buscar por nombre, cédula o email..."
                        emptyText={
                          personSearchInput.trim()
                            ? "No se encontraron personas"
                            : "Escriba para buscar personas"
                        }
                        disabled={false}
                        isLoading={isLoadingPeoplePaged}
                        onSearchChange={setPersonSearchInput}
                        onChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            personID: Number(v) || 0,
                          }))
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="wizard-type">
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
                          disabled={qTypes.isLoading}
                          onChange={(v) =>
                            setForm((f) => ({
                              ...f,
                              contractTypeID: Number(v) || 0,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="wizard-dept">Departamento *</Label>
                        <SearchableSelect
                          value={
                            form.departmentID
                              ? String(form.departmentID)
                              : null
                          }
                          items={toSearchItems(depts)}
                          placeholder="Seleccione departamento"
                          searchPlaceholder="Buscar departamento..."
                          disabled={qDepts.isLoading}
                          onChange={(v) =>
                            setForm((f) => ({
                              ...f,
                              departmentID: Number(v) || 0,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="wizard-job">Cargo (Opcional)</Label>
                        <SearchableSelect
                          value={form.jobID ? String(form.jobID) : null}
                          items={toSearchItems(jobs)}
                          placeholder="Seleccione cargo"
                          searchPlaceholder="Buscar cargo..."
                          disabled={qJobs.isLoading}
                          onChange={(v) =>
                            setForm((f) => ({
                              ...f,
                              jobID: Number(v) || null,
                            }))
                          }
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
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            contractCode: e.target.value,
                          }))
                        }
                        placeholder="Ej: CONT-2024-001"
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
                      <Label htmlFor="wizard-status">Estado Inicial</Label>
                      <Select
                        value={form.status ? String(form.status) : ""}
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
                          {wf.statuses.map((s: any) => (
                            <SelectItem
                              key={s.typeID}
                              value={String(s.typeID)}
                            >
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      disabled={createMut.isPending}
                    >
                      {createMut.isPending ? (
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