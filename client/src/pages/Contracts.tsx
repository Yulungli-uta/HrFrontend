// src/pages/Contracts.tsx
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Filter,
  FileText,
  User,
  Building2,
  Calendar,
  X,
  Eye,
  CheckCircle,
  Clock,
  Award,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ContractsRHAPI, TiposReferenciaAPI, FinancialCertificationAPI } from "@/lib/api";
import { usePaged } from "@/hooks/pagination/usePaged";
import { DataPagination } from "@/components/ui/DataPagination";
import type { ContractDto } from "@/types/contract";
import { ContractDialog } from "@/components/contracts/ContractDialog";
import { useContractLookups } from "@/hooks/contracts/useContractLookups";
import { useAuth } from "@/features/auth";

const CURRENT_YEAR = new Date().getFullYear();

export default function ContractsPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "view" | "edit">("create");
  const [selected, setSelected] = useState<ContractDto | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<number>(CURRENT_YEAR);

  // Administrador HR (tiene permiso /people): ve todos los contratos.
  // Empleado regular: ve solo los contratos que él elaboró (filtrado en servidor via JWT).
  const isAdmin = user?.permissions?.some((p) => p === "/people") ?? false;

  const contractsQueryKey = isAdmin
    ? ["contracts-rh", statusFilter, String(yearFilter)]
    : ["my-contracts", statusFilter, String(yearFilter)];

  const {
    items: contracts,
    isLoading,
    isError,
    errorMessage,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPage,
    setPageSize,
    setSearch,
    clearSearch,
    currentParams,
  } = usePaged<ContractDto>({
    queryKey: contractsQueryKey,
    queryFn: (params) =>
      isAdmin
        ? ContractsRHAPI.listPaged({
            ...params,
            sortDirection: "desc",
            statusTypeId: statusFilter !== "all" ? Number(statusFilter) : undefined,
            year: yearFilter > 0 ? yearFilter : undefined,
          })
        : ContractsRHAPI.listMyPaged({
            ...params,
            sortDirection: "desc",
            statusTypeId: statusFilter !== "all" ? Number(statusFilter) : undefined,
            year: yearFilter > 0 ? yearFilter : undefined,
          }),
    initialPageSize: 20,
  });

  const lookups = useContractLookups({ enabled: true });

  const qStatusTypes = useQuery({
    queryKey: ["reftypes", "CONTRACT_STATUS"],
    queryFn: () => TiposReferenciaAPI.byCategory("CONTRACT_STATUS"),
    staleTime: 10 * 60 * 1000,
  });
  const statusTypes =
    qStatusTypes.data?.status === "success" ? qStatusTypes.data.data ?? [] : [];

  const statusLabelById = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of statusTypes) {
      const id = s.typeId ?? s.typeID;
      if (id != null) m.set(Number(id), s.name as string);
    }
    return m;
  }, [statusTypes]);

  // typeId for VIGENTE and in-process statuses (for count queries)
  const vigenteTypeId = useMemo(
    () => statusTypes.find((s: any) => (s.name as string)?.toUpperCase() === "VIGENTE")?.typeId
      ?? statusTypes.find((s: any) => (s.name as string)?.toUpperCase() === "VIGENTE")?.typeID,
    [statusTypes]
  );

  // Count VIGENTE contracts globally
  const qVigenteCount = useQuery({
    queryKey: ["contracts-count", "VIGENTE", yearFilter, vigenteTypeId],
    queryFn: () => ContractsRHAPI.listPaged({
      page: 1, pageSize: 1,
      statusTypeId: Number(vigenteTypeId),
      year: yearFilter > 0 ? yearFilter : undefined,
    }),
    enabled: vigenteTypeId != null,
    staleTime: 60_000,
  });
  const vigenteCount = qVigenteCount.data?.status === "success"
    ? ((qVigenteCount.data.data as any)?.totalCount ?? 0)
    : 0;

  // Count approved financial certifications
  const qApprovedCerts = useQuery({
    queryKey: ["financial-certifications", "approved", "count"],
    queryFn: () => FinancialCertificationAPI.paged({ statusName: "APROBADA", pageSize: 1 }),
    staleTime: 5 * 60 * 1000,
  });
  const approvedCertsCount = qApprovedCerts.data?.status === "success"
    ? ((qApprovedCerts.data.data as any)?.totalCount ?? 0)
    : 0;

  const peopleById = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of lookups.people ?? []) {
      const id = (p as any).personId ?? (p as any).personID;
      if (id != null) {
        const name = `${(p as any).firstName ?? ""} ${(p as any).lastName ?? ""}`.trim();
        m.set(Number(id), name || `ID ${id}`);
      }
    }
    return m;
  }, [lookups.people]);

  const employeesById = useMemo(() => {
    const m = new Map<number, string>();
    for (const e of lookups.employees ?? []) {
      const id = (e as any).employeeID ?? (e as any).employeeId;
      if (id != null) {
        const name = (e as any).fullName
          ?? `${(e as any).firstName ?? ""} ${(e as any).lastName ?? ""}`.trim();
        m.set(Number(id), name || `Empleado ${id}`);
      }
    }
    return m;
  }, [lookups.employees]);

  const typeById = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of lookups.types ?? []) {
      const id = (t as any).contractTypeId ?? (t as any).contractTypeID;
      if (id != null) m.set(Number(id), (t as any).name ?? String(id));
    }
    return m;
  }, [lookups.types]);

  const deptById = useMemo(() => {
    const m = new Map<number, string>();
    for (const d of lookups.depts ?? []) {
      const id = (d as any).departmentId ?? (d as any).departmentID;
      if (id != null) m.set(Number(id), (d as any).name ?? (d as any).code ?? String(id));
    }
    return m;
  }, [lookups.depts]);

  // En-proceso count from current page (BORRADOR, GENERADO, PENDIENTE_FIRMAS, FIRMADO_CARGADO)
  const enProcesoCount = useMemo(() => {
    const inProcess = new Set(["BORRADOR", "GENERADO", "PENDIENTE_FIRMAS", "FIRMADO_CARGADO"]);
    return contracts.filter(c => inProcess.has((statusLabelById.get(c.status) ?? "").toUpperCase())).length;
  }, [contracts, statusLabelById]);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = CURRENT_YEAR; y >= CURRENT_YEAR - 5; y--) years.push(y);
    return years;
  }, []);

  function openCreate() {
    setSelected(null);
    setMode("create");
    setOpen(true);
  }

  function openView(c: ContractDto) {
    navigate(`/contracts/${c.contractID}`);
  }

  function getStatusLabel(status: number): string {
    return statusLabelById.get(status) ?? `Estado ${status}`;
  }

  function getStatusVariant(
    status: number
  ): "default" | "secondary" | "destructive" | "outline" {
    const name = (statusLabelById.get(status) ?? "").toUpperCase();
    switch (name) {
      case "VIGENTE": return "default";
      case "BORRADOR":
      case "GENERADO":
      case "PENDIENTE_FIRMAS":
      case "FIRMADO_CARGADO": return "secondary";
      case "FINALIZADO": return "outline";
      case "ANULADO":
      case "VENCIDO":
      case "RENUNCIA": return "destructive";
      default: return "secondary";
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Cargando contratos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-1">
                  Error al cargar contratos
                </h3>
                <p className="text-sm text-destructive">
                  {errorMessage || "Error desconocido"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Gestión de Contratos
            </h1>
            <p className="text-sm text-muted-foreground">
              Administra contratos, addendums y documentación del personal
            </p>
          </div>

          <Button onClick={openCreate} size="lg" className="w-full md:w-auto">
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Contrato
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Contratos</p>
                  <p className="text-2xl font-bold">{totalCount}</p>
                  <p className="text-xs text-muted-foreground">
                    {yearFilter > 0 ? `Año ${yearFilter}` : "Todos los años"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vigentes</p>
                  <p className="text-2xl font-bold">{vigenteCount}</p>
                  <p className="text-xs text-muted-foreground">Contratos activos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">En proceso</p>
                  <p className="text-2xl font-bold">{enProcesoCount}</p>
                  <p className="text-xs text-muted-foreground">En esta vista</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Award className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cert. aprobadas</p>
                  <p className="text-2xl font-bold">{approvedCertsCount}</p>
                  <p className="text-xs text-muted-foreground">Disponibles para contratar</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                value={currentParams.search ?? ""}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código o descripción..."
                className="pl-10 pr-10"
              />
              {currentParams.search && (
                <X
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
                  onClick={() => clearSearch()}
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); goToPage(1); }}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Todos los estados</option>
                {statusTypes.map((s: any) => {
                  const id = s.typeId ?? s.typeID;
                  return (
                    <option key={id} value={String(id)}>
                      {s.name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <select
                value={yearFilter}
                onChange={(e) => { setYearFilter(Number(e.target.value)); goToPage(1); }}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value={0}>Todos los años</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    ID / Código
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Persona
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Departamento
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Vigencia
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Elaborado por
                  </th>
                  <th className="p-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                      {currentParams.search || statusFilter !== "all"
                        ? "No se encontraron contratos con ese criterio"
                        : "No hay contratos registrados"}
                    </td>
                  </tr>
                ) : (
                  contracts.map((c) => (
                    <tr
                      key={c.contractID}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => openView(c)}
                    >
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="font-medium">#{c.contractID}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.contractCode}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">
                            {peopleById.get(Number(c.personID)) ?? `ID ${c.personID}`}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">
                          {typeById.get(Number(c.contractTypeID)) ?? `ID ${c.contractTypeID}`}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">
                          {deptById.get(Number(c.departmentID)) ?? `ID ${c.departmentID}`}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{String(c.startDate).slice(0, 10)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="text-xs">hasta</span>
                            <span>{String(c.endDate).slice(0, 10)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={getStatusVariant(c.status)}>
                          {getStatusLabel(c.status)}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {c.createdBy != null
                            ? (employeesById.get(Number(c.createdBy)) ?? `#${c.createdBy}`)
                            : "—"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openView(c);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver detalles</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="lg:hidden space-y-3">
        {contracts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              {currentParams.search || statusFilter !== "all"
                ? "No se encontraron contratos con ese criterio"
                : "No hay contratos registrados"}
            </CardContent>
          </Card>
        ) : (
          contracts.map((c) => (
            <Card
              key={c.contractID}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openView(c)}
            >
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg">#{c.contractID}</p>
                      <Badge variant={getStatusVariant(c.status)} className="text-xs">
                        {getStatusLabel(c.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {c.contractCode}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {peopleById.get(Number(c.personID)) ?? `ID ${c.personID}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {typeById.get(Number(c.contractTypeID)) ?? `ID ${c.contractTypeID}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {deptById.get(Number(c.departmentID)) ?? `ID ${c.departmentID}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {String(c.startDate).slice(0, 10)} → {String(c.endDate).slice(0, 10)}
                    </span>
                  </div>
                  {c.createdBy != null && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="text-xs">
                        Elaborado por: {employeesById.get(Number(c.createdBy)) ?? `#${c.createdBy}`}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    openView(c);
                  }}
                >
                  <Eye className="h-4 w-4" />
                  Ver detalles
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <DataPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        hasPreviousPage={hasPreviousPage}
        hasNextPage={hasNextPage}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
        disabled={isLoading}
      />

      <ContractDialog
        open={open}
        onOpenChange={setOpen}
        mode={mode}
        setMode={setMode}
        selected={selected}
      />
    </div>
  );
}
