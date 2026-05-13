// src/pages/ContractRequest.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { FileText, Plus, Search, Calendar, Eye, Pencil, X, CheckCircle, Clock, XCircle, AlertTriangle, Users } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth";

import { useContractRequest } from "@/hooks/contractRequest/useContractRequests";

import type { ContractRequestCreate, UIContractRequest } from "@/types/contractRequest";
import { ContractRequestForm } from "@/components/contractRequest/ContractRequestForm";
import { AttachmentSection } from "@/components/contractRequest/AttachmentSection";

import {
  CONTRACT_REQUEST_DIRECTORY_CODE as DIRECTORY_CODE,
  CONTRACT_REQUEST_ENTITY_TYPE as ENTITY_TYPE,
} from "@/features/constants";

import type { ReusableDocumentManagerHandle } from "@/components/ReusableDocumentManager";
import { parseApiError } from '@/lib/error-handling';
import { DataPagination } from "@/components/ui/DataPagination";
import { ContractRequestAPI, FinancialCertificationAPI } from "@/lib/api";
import {
  ContractRequestPersonSection,
  type ContractRequestPersonSectionHandle,
} from "@/components/contractRequest/ContractRequestPersonSection";
import { ContractDialog } from "@/components/contracts/ContractDialog";

const EDITABLE_STATUS = "PENDIENTE_CERT_FINANCIERA";
const CORRECTION_STATUS = "PENDIENTE_CORRECCION";
const HIRING_STATUS = "PENDIENTE_CONTRATACION";

function buildEditForm(c: UIContractRequest, createdBy: number): ContractRequestCreate {
  return {
    workModalityId: c.workModalityId,
    departmentId: c.departmentId,
    numberOfPeopleToHire: c.numberOfPeopleToHire,
    numberHour: c.numberHour,
    startDate: c.startDate ?? null,
    endDate: c.endDate ?? null,
    observation: c.observation ?? "",
    status: c.status ?? null,
    createdBy,
  };
}

export default function ContractRequestPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user, employeeDetails } = useAuth();

  const ctxCreatedBy = Number.isFinite(Number(employeeDetails?.employeeID))
    ? Number(employeeDetails?.employeeID)
    : (Number.isFinite(Number(user?.id)) ? Number(user?.id) : 0);

  const cr = useContractRequest(DIRECTORY_CODE);
  const { contracts, listQ, createMut, updateMut, directoryUi } = cr;

  const accept = directoryUi.accept ?? "*/*";
  const maxSizeMB = directoryUi.maxSizeMB ?? 20;
  const relativePath = directoryUi.relativePath ?? "";

  // UI state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selected, setSelected] = useState<UIContractRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => { setPage(1); }, [searchTerm, statusFilter]);

  // Edición en detalle
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<ContractRequestCreate | null>(null);

  // Create form
  const [form, setForm] = useState<ContractRequestCreate>({
    workModalityId: null,
    departmentId: null,
    numberOfPeopleToHire: 1,
    numberHour: 0,
    startDate: null,
    endDate: null,
    observation: "",
    status: null,
    createdBy: ctxCreatedBy,
  });

  // Estado por defecto "PENDIENTE_CERT_FINANCIERA" al crear
  useEffect(() => {
    if (form.status != null) return;
    const defaultStatus = cr.statuses.find(
      (s) => (s.name ?? "").trim().toUpperCase() === "PENDIENTE_CERT_FINANCIERA"
    );
    if (defaultStatus?.id) {
      setForm((prev) => ({ ...prev, status: defaultStatus.id }));
    }
  }, [cr.statuses, form.status]);

  const [attachEnabled, setAttachEnabled] = useState(false);
  const createDocsRef = useRef<ReusableDocumentManagerHandle | null>(null);
  const detailDocsRef = useRef<ReusableDocumentManagerHandle | null>(null);
  const personSectionRef = useRef<ContractRequestPersonSectionHandle | null>(null);

  const resetForm = () => {
    setForm({
      workModalityId: null,
      departmentId: null,
      numberOfPeopleToHire: 1,
      numberHour: 0,
      startDate: null,
      endDate: null,
      observation: "",
      status: null,
      createdBy: ctxCreatedBy,
    });
    setAttachEnabled(false);
    createDocsRef.current?.clearSelected();
  };

  const filtered = useMemo(() => {
    let list = [...contracts].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    if (statusFilter !== "all") {
      list = list.filter(
        (c) =>
          (c.statusName ?? "").toUpperCase() === statusFilter ||
          (c.statusText ?? "").toUpperCase() === statusFilter
      );
    }

    const q = searchTerm.trim().toLowerCase();
    if (!q) return list;

    return list.filter((c) => {
      const modalityName = c.workModalityId
        ? (cr.workModalityNameById.get(c.workModalityId) ?? "")
        : "";
      const deptName = c.departmentId
        ? (cr.departmentNameById.get(c.departmentId) ?? "")
        : "";

      const hay = [
        `#${c.requestId}`,
        modalityName,
        deptName,
        String(c.numberOfPeopleToHire),
        String(c.numberHour),
        String(c.totalPeopleHired),
        c.statusText,
        c.observation ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [contracts, searchTerm, statusFilter, cr.workModalityNameById, cr.departmentNameById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  // ID del estado que habilita edición
  const editableStatusId = useMemo(
    () => cr.statuses.find((s) => (s.name ?? "").trim().toUpperCase() === EDITABLE_STATUS)?.id ?? null,
    [cr.statuses]
  );

  // ID del estado PENDIENTE_CORRECCION (también editable)
  const correctionStatusId = useMemo(
    () => cr.statuses.find((s) => (s.name ?? "").trim().toUpperCase() === CORRECTION_STATUS)?.id ?? null,
    [cr.statuses]
  );

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of contracts) {
      const name = (c.statusName ?? c.statusText ?? "").toUpperCase();
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return counts;
  }, [contracts]);

  const openDetails = (c: UIContractRequest) => {
    setSelected(c);
    setIsEditing(false);
    setEditForm(null);
    setIsDetailOpen(true);
    setTimeout(() => detailDocsRef.current?.refresh(c.requestId), 0);
  };

  const startEditing = () => {
    if (!selected) return;
    setEditForm(buildEditForm(selected, ctxCreatedBy));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  const handleCreate = async () => {
    if (!ctxCreatedBy || ctxCreatedBy <= 0) {
      toast({ title: "❌ Usuario inválido", description: "No se pudo determinar el solicitante.", variant: "destructive" });
      return;
    }

    if (!form.workModalityId) {
      toast({ title: "❌ Campo requerido", description: "Seleccione la modalidad de trabajo.", variant: "destructive" });
      return;
    }

    if (!form.departmentId) {
      toast({ title: "❌ Campo requerido", description: "Seleccione el departamento.", variant: "destructive" });
      return;
    }

    if (form.status == null) {
      toast({ title: "❌ Error de configuración", description: "No se pudo determinar el estado inicial. Espere a que carguen los catálogos.", variant: "destructive" });
      return;
    }

    const people = Number(form.numberOfPeopleToHire);
    if (!Number.isFinite(people) || people < 1 || !Number.isInteger(people)) {
      toast({ title: "❌ Valor inválido", description: "El número de personas debe ser un entero mayor a 0.", variant: "destructive" });
      return;
    }

    const hours = Number(form.numberHour);
    if (!Number.isFinite(hours) || hours <= 0) {
      toast({ title: "❌ Valor inválido", description: "El número de horas debe ser mayor a 0.", variant: "destructive" });
      return;
    }

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      toast({ title: "❌ Fechas inválidas", description: "La fecha fin del período debe ser mayor o igual a la fecha inicio.", variant: "destructive" });
      return;
    }

    const payload: ContractRequestCreate = {
      ...form,
      createdBy: ctxCreatedBy,
      numberOfPeopleToHire: people,
      numberHour: hours,
      observation: (form.observation ?? "").trim() || undefined,
    };

    try {
      const { id, resp } = await createMut.mutateAsync(payload);

      if (resp.status !== "success") {
        toast({ title: "❌ Error", description: resp.error.message, variant: "destructive" });
        return;
      }

      qc.invalidateQueries({ queryKey: ["/api/v1/rh/cv/contract-request"] });

      const count = createDocsRef.current?.getSelectedCount() ?? 0;
      if (attachEnabled && id && count > 0) {
        const up = await createDocsRef.current?.uploadAll(id);

        if (!up || up.uploaded === 0) {
          // Transacción compensatoria: revertir la solicitud recién creada.
          try {
            await ContractRequestAPI.delete(id);
            qc.invalidateQueries({ queryKey: ["/api/v1/rh/cv/contract-request"] });
          } catch {
            toast({
              title: "⚠️ Error grave",
              description: `Falló la carga de documentos Y la reversión. La solicitud #${id} quedó registrada sin documentos. Elimínela manualmente.`,
              variant: "destructive",
            });
            setIsFormOpen(false);
            resetForm();
            return;
          }

          toast({
            title: "❌ Solicitud no creada",
            description: "La carga de documentos falló. La solicitud fue revertida. Intenta nuevamente.",
            variant: "destructive",
          });
          return;
        }
      }

      // Registrar personas sugeridas — si alguna falla, revertir la solicitud completa
      const personRows = personSectionRef.current?.getLocalRows() ?? [];
      if (id && personRows.length > 0) {
        try {
          await Promise.all(
            personRows.map((row) =>
              ContractRequestAPI.addPerson(id, {
                personId: row.personId ?? null,
                requestPersonTypeId: row.requestPersonType,
                jobId: row.jobId,
                startDate: row.startDate ?? null,
                endDate: row.endDate ?? null,
                weeklyClassHours: row.weeklyClassHours ?? null,
                hourValue: row.hourValue ?? null,
                observation: row.observation ?? null,
                createdBy: ctxCreatedBy,
              })
            )
          );
        } catch (personErr: unknown) {
          // Transacción compensatoria: revertir la solicitud recién creada.
          try {
            await ContractRequestAPI.delete(id);
            qc.invalidateQueries({ queryKey: ["/api/v1/rh/cv/contract-request"] });
          } catch {
            toast({
              title: "⚠️ Error grave",
              description: `Falló el registro de personas Y la reversión. La solicitud #${id} quedó registrada sin personas. Elimínela manualmente.`,
              variant: "destructive",
            });
            setIsFormOpen(false);
            resetForm();
            return;
          }

          toast({
            title: "❌ Solicitud no creada",
            description: `No se pudo registrar a las personas sugeridas. La solicitud fue revertida. ${parseApiError(personErr).message}`,
            variant: "destructive",
          });
          return;
        }
      }

      toast({ title: "✅ Solicitud creada", description: "Se guardó correctamente." });
      setIsFormOpen(false);
      resetForm();
    } catch (e: unknown) {
      toast({ title: "❌ Error", description: parseApiError(e).message, variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!selected || !editForm) return;

    const people = Number(editForm.numberOfPeopleToHire);
    if (!Number.isFinite(people) || people < 1 || !Number.isInteger(people)) {
      toast({ title: "❌ Valor inválido", description: "El número de personas debe ser un entero mayor a 0.", variant: "destructive" });
      return;
    }

    const hours = Number(editForm.numberHour);
    if (!Number.isFinite(hours) || hours <= 0) {
      toast({ title: "❌ Valor inválido", description: "El número de horas debe ser mayor a 0.", variant: "destructive" });
      return;
    }

    if (!editForm.workModalityId) {
      toast({ title: "❌ Campo requerido", description: "Seleccione la modalidad de trabajo.", variant: "destructive" });
      return;
    }

    if (!editForm.departmentId) {
      toast({ title: "❌ Campo requerido", description: "Seleccione el departamento.", variant: "destructive" });
      return;
    }

    try {
      const resp = await updateMut.mutateAsync({ id: selected.requestId, payload: editForm });

      if (resp.status !== "success") {
        toast({ title: "❌ Error", description: (resp as any).error?.message ?? "Error al actualizar.", variant: "destructive" });
        return;
      }

      toast({ title: "✅ Solicitud actualizada", description: "Se guardó correctamente." });
      setIsEditing(false);
      setIsDetailOpen(false);
      setSelected(null);
    } catch (e: unknown) {
      toast({ title: "❌ Error", description: parseApiError(e).message, variant: "destructive" });
    }
  };

  const handleUploadDetail = async () => {
    if (!selected) return;

    const count = detailDocsRef.current?.getSelectedCount() ?? 0;
    if (count <= 0) {
      toast({ title: "Sin archivos", description: "No hay archivos seleccionados para subir." });
      return;
    }

    const up = await detailDocsRef.current?.uploadAll(selected.requestId);
    if (!up || (up as any).status === "error") {
      toast({ title: "❌ Error", description: "No se pudieron subir los documentos.", variant: "destructive" });
      return;
    }

    toast({ title: "✅ Documentos subidos", description: "Se subieron correctamente." });
    await detailDocsRef.current?.refresh(selected.requestId);
  };

  const hiringStatusId = useMemo(
    () => cr.statuses.find((s) => (s.name ?? "").trim().toUpperCase() === HIRING_STATUS)?.id ?? null,
    [cr.statuses]
  );

  const isHiringStatus =
    selected != null &&
    hiringStatusId != null &&
    Number(selected.status) === hiringStatusId;

  // Panel de contratación: cupos y certificación aprobada vinculada
  const qSlots = useQuery({
    queryKey: ["contractRequestSlots", selected?.requestId],
    queryFn: () => ContractRequestAPI.getSlots(selected!.requestId),
    enabled: isDetailOpen && selected != null && isHiringStatus,
    select: (res: any) => (res?.status === "success" ? res.data : null),
  });

  const qLinkedCert = useQuery({
    queryKey: ["linkedCert", selected?.requestId],
    queryFn: () =>
      FinancialCertificationAPI.paged({ requestId: selected!.requestId, statusName: "APROBADA", pageSize: 1 }),
    enabled: isDetailOpen && selected != null && isHiringStatus,
    select: (res: any) => {
      const items: any[] = res?.status === "success" ? (res.data?.items ?? res.data ?? []) : [];
      return items[0] ?? null;
    },
  });

  const linkedCertId = qLinkedCert.data?.certificationId ?? null;

  // Diálogo de nuevo contrato
  const [contractOpen, setContractOpen] = useState(false);
  const [contractMode, setContractMode] = useState<"create" | "view" | "edit">("create");

  if (listQ.isLoading) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <Card>
          <CardContent className="pt-6">Cargando...</CardContent>
        </Card>
      </div>
    );
  }

  if (listQ.error || listQ.data?.status === "error") {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            Error al cargar. {listQ.data?.status === "error" ? listQ.data.error.message : "Intente nuevamente."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const formDisabled = createMut.isPending;
  const canEdit =
    selected != null &&
    (
      (editableStatusId != null && Number(selected.status) === editableStatusId) ||
      (correctionStatusId != null && Number(selected.status) === correctionStatusId)
    );

  const isInCorrectionMode =
    selected != null &&
    correctionStatusId != null &&
    Number(selected.status) === correctionStatusId;

  return (
    <div className="container mx-auto p-4 lg:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            Solicitud de Contrato
          </h1>
          <p className="text-muted-foreground mt-1 text-sm lg:text-base">Gestión de solicitudes</p>
        </div>

        <Dialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 w-full lg:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Solicitud
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Solicitud</DialogTitle>
              <DialogDescription>Campos alineados a HR.tbl_contractRequest.</DialogDescription>
            </DialogHeader>

            <ContractRequestForm
              value={form}
              onChange={setForm}
              workModalities={cr.workModalities}
              statuses={cr.statuses}
              disabled={formDisabled}
              hideStatus={true}
            />

            <div className="mt-6">
              <ContractRequestPersonSection
                ref={personSectionRef}
                requestId={null}
                headerStartDate={form.startDate}
                headerEndDate={form.endDate}
                readOnly={formDisabled}
                createdBy={ctxCreatedBy}
              />
            </div>

            <div className="mt-6">
              <AttachmentSection
                ref={createDocsRef}
                enabled={attachEnabled}
                onEnabledChange={setAttachEnabled}
                label="Documentos de la Solicitud"
                directoryCode={DIRECTORY_CODE}
                entityType={ENTITY_TYPE}
                entityReady={false}
                accept={accept}
                maxSizeMB={maxSizeMB}
                relativePath={relativePath}
                disabled={formDisabled || cr.directoryQ.isLoading}
                showUploadButton={false}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6 justify-end">
              <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={formDisabled}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={formDisabled} className="bg-primary hover:bg-primary/90">
                {formDisabled ? "Guardando..." : "Guardar Solicitud"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status count cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-primary/10 dark:bg-primary/15">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-base flex items-center justify-between">
              <span className="flex items-center">
                <FileText className="h-4 w-4 text-primary mr-2" />
                Total
              </span>
              <Badge variant="secondary" className="bg-blue-200 text-primary text-xs">
                {contracts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Solicitudes registradas</div>
          </CardContent>
        </Card>

        {cr.statuses.filter((s) => (statusCounts.get(s.name.toUpperCase()) ?? 0) > 0).map((s) => {
          const count = statusCounts.get(s.name.toUpperCase()) ?? 0;
          const pct = contracts.length > 0 ? ((count / contracts.length) * 100).toFixed(1) : "0";
          const n = s.name.toUpperCase();
          const cardCls = n.includes("PENDIENTE") ? "bg-warning/10 dark:bg-warning/15"
            : n.includes("APROBAD") || n.includes("COMPLETAD") ? "bg-success/10 dark:bg-success/15"
            : n.includes("RECHAZAD") || n.includes("CANCELAD") ? "bg-destructive/10 dark:bg-destructive/15"
            : "";
          const Icon = n.includes("PENDIENTE") ? Clock
            : n.includes("APROBAD") || n.includes("COMPLETAD") ? CheckCircle
            : n.includes("RECHAZAD") || n.includes("CANCELAD") ? XCircle
            : FileText;
          return (
            <Card key={s.id} className={cardCls}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm lg:text-base flex items-center justify-between gap-1">
                  <span className="flex items-center truncate text-sm">
                    <Icon className="h-4 w-4 mr-2 shrink-0" />
                    <span className="truncate">{s.name}</span>
                  </span>
                  <Badge variant="secondary" className="text-xs shrink-0">{count}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">{pct}% del total</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {cr.statuses.map((s) => (
              <SelectItem key={s.id} value={s.name.toUpperCase()}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID, modalidad, departamento, observación o estado..."
            className="pl-10 pr-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes</CardTitle>
          <CardDescription>{filtered.length} registros</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Personas</TableHead>
                  <TableHead>Contratadas</TableHead>
                  <TableHead>Pendientes</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginated.map((c) => {
                  const modality = c.workModalityId
                    ? (cr.workModalityNameById.get(c.workModalityId) ?? `#${c.workModalityId}`)
                    : "—";

                  const dept = c.departmentId
                    ? (cr.departmentNameById.get(c.departmentId) ?? `#${c.departmentId}`)
                    : "—";

                  return (
                    <TableRow key={c.requestId}>
                      <TableCell className="font-mono">#{c.requestId}</TableCell>
                      <TableCell>{modality}</TableCell>
                      <TableCell>{dept}</TableCell>
                      <TableCell>{c.numberOfPeopleToHire}</TableCell>
                      <TableCell>{c.totalPeopleHired}</TableCell>
                      <TableCell>
                        <span className={c.pendingCount > 0 ? "text-primary font-medium" : "text-muted-foreground"}>
                          {c.pendingCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.statusVariant}>{c.statusText}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openDetails(c)}>
                          <Eye className="h-3 w-3 mr-1" /> Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <div className="text-center py-10 text-sm text-muted-foreground">
                        No hay solicitudes para mostrar.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <DataPagination
            page={page}
            totalPages={totalPages}
            totalCount={filtered.length}
            pageSize={pageSize}
            hasPreviousPage={page > 1}
            hasNextPage={page < totalPages}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            disabled={listQ.isLoading}
          />
        </CardContent>
      </Card>

      {/* Diálogo de detalle */}
      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) {
            setSelected(null);
            setIsEditing(false);
            setEditForm(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle>
                  {selected ? `Solicitud #${selected.requestId}` : "Detalles"}
                </DialogTitle>
                <DialogDescription>Información + documentos</DialogDescription>
              </div>

              {/* Botón Editar — visible solo cuando el estado lo permite */}
              {canEdit && !isEditing && (
                <Button variant="outline" size="sm" onClick={startEditing} className="shrink-0 mt-1">
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
              )}
            </div>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {/* Sección de información: lectura o edición */}
              {isEditing && editForm ? (
                <ContractRequestForm
                  value={editForm}
                  onChange={setEditForm}
                  workModalities={cr.workModalities}
                  statuses={cr.statuses}
                  disabled={updateMut.isPending}
                  hideStatus={true}
                />
              ) : (
                <>
                  {/* Banner de rechazo temporal */}
                  {isInCorrectionMode && selected.pendingCorrectionReason && (
                    <div className="flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/10 p-4">
                      <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-warning">Solicitud pendiente de corrección</p>
                        <p className="text-sm text-muted-foreground mt-1">{selected.pendingCorrectionReason}</p>
                      </div>
                    </div>
                  )}

                  <Card>
                    <CardContent className="pt-6 space-y-2 text-sm">
                      <div><b>ID:</b> #{selected.requestId}</div>
                      <div>
                        <b>Modalidad:</b>{" "}
                        {selected.workModalityId
                          ? (cr.workModalityNameById.get(selected.workModalityId) ?? `#${selected.workModalityId}`)
                          : "—"}
                      </div>
                      <div>
                        <b>Departamento:</b>{" "}
                        {selected.departmentId
                          ? (cr.departmentNameById.get(selected.departmentId) ?? `#${selected.departmentId}`)
                          : "—"}
                      </div>
                      <div><b>Personas a contratar:</b> {selected.numberOfPeopleToHire}</div>
                      <div><b>Horas:</b> {Number(selected.numberHour).toFixed(2)}</div>
                      {selected.startDate && (
                        <div><b>Período:</b> {selected.startDate.slice(0, 10)} → {selected.endDate?.slice(0, 10) ?? "—"}</div>
                      )}
                      <div><b>Observación:</b> {selected.observation ?? "—"}</div>
                      <div>
                        <b>Estado:</b> <Badge variant={selected.statusVariant}>{selected.statusText}</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Personas sugeridas (solo lectura) */}
                  <ContractRequestPersonSection
                    requestId={selected.requestId}
                    headerStartDate={selected.startDate ?? null}
                    headerEndDate={selected.endDate ?? null}
                    readOnly={true}
                    createdBy={ctxCreatedBy}
                  />

                  {/* Panel de contratación — solo en PENDIENTE_CONTRATACION */}
                  {isHiringStatus && (
                    <Card className="border-primary/30 bg-primary/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          Panel de Contratación
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {qSlots.isLoading ? (
                          <p className="text-sm text-muted-foreground">Cargando cupos...</p>
                        ) : qSlots.data ? (
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-background rounded-lg p-3 border">
                              <p className="text-xs text-muted-foreground mb-1">Requeridos</p>
                              <p className="text-2xl font-bold">{qSlots.data.numberOfPeopleToHire ?? selected.numberOfPeopleToHire}</p>
                            </div>
                            <div className="bg-background rounded-lg p-3 border">
                              <p className="text-xs text-muted-foreground mb-1">Contratados</p>
                              <p className="text-2xl font-bold text-green-600">{qSlots.data.totalPeopleHired ?? selected.totalPeopleHired}</p>
                            </div>
                            <div className="bg-background rounded-lg p-3 border">
                              <p className="text-xs text-muted-foreground mb-1">Cupos libres</p>
                              <p className="text-2xl font-bold text-primary">{qSlots.data.availableSlots ?? Math.max(0, (qSlots.data.numberOfPeopleToHire ?? selected.numberOfPeopleToHire) - (qSlots.data.totalPeopleHired ?? selected.totalPeopleHired))}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-background rounded-lg p-3 border">
                              <p className="text-xs text-muted-foreground mb-1">Requeridos</p>
                              <p className="text-2xl font-bold">{selected.numberOfPeopleToHire}</p>
                            </div>
                            <div className="bg-background rounded-lg p-3 border">
                              <p className="text-xs text-muted-foreground mb-1">Contratados</p>
                              <p className="text-2xl font-bold text-green-600">{selected.totalPeopleHired}</p>
                            </div>
                            <div className="bg-background rounded-lg p-3 border">
                              <p className="text-xs text-muted-foreground mb-1">Cupos libres</p>
                              <p className="text-2xl font-bold text-primary">{Math.max(0, selected.numberOfPeopleToHire - selected.totalPeopleHired)}</p>
                            </div>
                          </div>
                        )}

                        <Button
                          className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                          onClick={() => {
                            setContractMode("create");
                            setContractOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Nuevo Contrato
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Botones Guardar / Cancelar edición */}
              {isEditing && (
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={cancelEditing} disabled={updateMut.isPending}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUpdate} disabled={updateMut.isPending} className="bg-primary hover:bg-primary/90">
                    {updateMut.isPending ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
              )}

              {/* Documentos — solo en modo lectura */}
              {!isEditing && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Documentos</CardTitle>
                    <CardDescription className="text-xs">directoryCode: {DIRECTORY_CODE}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <AttachmentSection
                      ref={detailDocsRef}
                      enabled={true}
                      onEnabledChange={() => void 0}
                      label="Documentos"
                      directoryCode={DIRECTORY_CODE}
                      entityType={ENTITY_TYPE}
                      entityId={selected.requestId}
                      entityReady={true}
                      accept={accept}
                      maxSizeMB={maxSizeMB}
                      relativePath={relativePath}
                      disabled={cr.directoryQ.isLoading || !canEdit}
                      showUploadButton={false}
                    />
                    {canEdit ? (
                      <Button variant="outline" onClick={handleUploadDetail} disabled={cr.directoryQ.isLoading}>
                        Subir seleccionados
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Solo lectura — la solicitud no está en estado editable.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de nuevo contrato — abierto desde el panel de contratación */}
      <ContractDialog
        open={contractOpen}
        onOpenChange={setContractOpen}
        mode={contractMode}
        setMode={setContractMode}
        selected={null}
        initial={linkedCertId != null ? { certificationID: linkedCertId } : undefined}
      />
    </div>
  );
}
