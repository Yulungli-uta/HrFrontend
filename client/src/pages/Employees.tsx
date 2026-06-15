// src/pages/EmployeesPage.tsx
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DataPagination } from "@/components/ui/DataPagination";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  UserCog,
  Building2,
  Calendar,
  Users,
  UserCheck,
  UserX,
  Briefcase,
  Search,
  Eye,
  X,
} from "lucide-react";
import EmployeeForm from "@/components/forms/EmployeeForm";
import { VistaEmpleadosAPI, TiposReferenciaAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePaged } from "@/hooks/pagination/usePaged";

export interface EmployeeView {
  employeeID: number;
  firstName: string;
  lastName: string;
  fullName: string;
  idCard: string;
  email: string;
  phone: string;
  birthDate: string;
  sex: string | number;
  gender: string | null;
  address: string;
  personIsActive: boolean;
  employeeType: number | null;
  employeeTypeName: string | null;
  hireDate: string;
  employeeIsActive: boolean;
  department: string | null;
  faculty: string | null;
  immediateBoss: string | null;
  yearsOfService: number;
  maritalStatusTypeID: number | null;
  maritalStatus: string | null;
  ethnicityTypeID: number | null;
  ethnicity: string | null;
  bloodTypeTypeID: number | null;
  bloodType: string | null;
  disabilityPercentage: number | null;
  conadisCard: string | null;
  countryName: string | null;
  provinceName: string | null;
  cantonName: string | null;
}

interface ApiRefType {
  typeId?: number;
  typeID?: number;
  name: string;
  category: string;
}

function normalizeEmployees(raw: any[]): EmployeeView[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(Boolean)
    .map((e: any) => ({
      employeeID: Number(e.employeeID ?? e.employeeId ?? e.id ?? 0),
      firstName: String(e.firstName ?? ""),
      lastName: String(e.lastName ?? ""),
      fullName: String(
        e.fullName ?? `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim()
      ),
      idCard: String(e.idCard ?? ""),
      email: String(e.email ?? ""),
      phone: String(e.phone ?? ""),
      birthDate: e.birthDate ?? "",
      sex: e.sex ?? "",
      gender: e.gender ?? null,
      address: String(e.address ?? ""),
      personIsActive: Boolean(e.personIsActive ?? true),
      employeeType:
        e.employeeType !== null && e.employeeType !== undefined
          ? Number(e.employeeType)
          : null,
      employeeTypeName: e.employeeTypeName ?? null,
      hireDate: e.hireDate ?? "",
      employeeIsActive: Boolean(e.employeeIsActive ?? true),
      department: e.department ?? null,
      faculty: e.faculty ?? null,
      immediateBoss: e.immediateBoss ?? null,
      yearsOfService: Number(e.yearsOfService ?? 0),
      maritalStatusTypeID: e.maritalStatusTypeID ?? null,
      maritalStatus: e.maritalStatus ?? null,
      ethnicityTypeID: e.ethnicityTypeID ?? null,
      ethnicity: e.ethnicity ?? null,
      bloodTypeTypeID: e.bloodTypeTypeID ?? null,
      bloodType: e.bloodType ?? null,
      disabilityPercentage: e.disabilityPercentage ?? null,
      conadisCard: e.conadisCard ?? null,
      countryName: e.countryName ?? null,
      provinceName: e.provinceName ?? null,
      cantonName: e.cantonName ?? null,
    }))
    .filter((e) => e.employeeID > 0);
}

function normalizeRefTypes(response: any): ApiRefType[] {
  if (response?.status === "success" && Array.isArray(response.data)) {
    return response.data;
  }
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
}

function mapContractTypes(types: ApiRefType[]) {
  const map: Record<number, string> = {};

  types.forEach((t) => {
    const typeId = Number(t.typeId ?? t.typeID);
    if (t?.category === "CONTRACT_TYPE" && !Number.isNaN(typeId)) {
      map[typeId] = t.name;
    }
  });

  return map;
}

function mapRefTypesByCategory(types: ApiRefType[], category: string) {
  const map: Record<number, string> = {};

  types.forEach((t) => {
    const typeId = Number(t.typeId ?? t.typeID);
    if (t?.category === category && !Number.isNaN(typeId)) {
      map[typeId] = t.name;
    }
  });

  return map;
}

function resolveSexName(
  sexValue: string | number | null | undefined,
  sexTypeMap: Record<number, string>
) {
  if (sexValue === null || sexValue === undefined || sexValue === "") {
    return "—";
  }

  const numericValue = Number(sexValue);

  if (!Number.isNaN(numericValue)) {
    return sexTypeMap[numericValue] ?? String(sexValue);
  }

  return String(sexValue);
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString();
}

export default function EmployeesPage() {
  const { toast } = useToast();

  const isMobile = useMediaQuery("(max-width: 639px)");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? "grid" : "table"
  );

  useEffect(() => {
    if (isMobile) setViewMode("grid");
  }, [isMobile]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeView | null>(
    null
  );
  const [editSeed, setEditSeed] = useState<EmployeeView | null>(null);

  const {
    items: rawEmployees,
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
  } = usePaged<any>({
    queryKey: "employees-complete",
    queryFn: (params) => VistaEmpleadosAPI.listPaged(params),
    initialPageSize: 20,
  });

  const employees = useMemo(
    () => normalizeEmployees(rawEmployees ?? []),
    [rawEmployees]
  );

  const { data: refTypesResp } = useQuery({
  queryKey: ["/api/v1/rh/ref/types"],
  queryFn: TiposReferenciaAPI.list,
  refetchOnWindowFocus: false,
  staleTime: 5 * 60_000,
});

const refTypes = useMemo(
  () => normalizeRefTypes(refTypesResp),
  [refTypesResp]
);

const contractTypeMap = useMemo(
  () => mapContractTypes(refTypes),
  [refTypes]
);

const sexTypeMap = useMemo(
  () => mapRefTypesByCategory(refTypes, "SEX_TYPE"),
  [refTypes]
);

const { data: statsResp } = useQuery({
  queryKey: ["employees-complete-stats"],
  queryFn: VistaEmpleadosAPI.stats,
  refetchOnWindowFocus: false,
  staleTime: 5 * 60_000,
});

const statsData = useMemo(() => {
  if (statsResp?.status === "success") {
    return statsResp.data;
  }

  return {
    total: totalCount,
    active: 0,
    inactive: 0,
    byContractType: [] as Array<{ employeeType: number; count: number }>,
  };
}, [statsResp, totalCount]);

const contractStatsMap = useMemo(() => {
  const map: Record<number, number> = {};

  Object.keys(contractTypeMap).forEach((k) => {
    map[Number(k)] = 0;
  });

  statsData.byContractType.forEach((item) => {
    map[item.employeeType] = item.count;
  });

  return map;
}, [statsData.byContractType, contractTypeMap]);

const employeeStats = useMemo(() => {
  const byContractType = contractStatsMap;
  const assigned = Object.values(byContractType).reduce((s, n) => s + n, 0);
  const total = statsData.total ?? totalCount;
  return {
    total,
    active:          statsData.active   ?? 0,
    inactive:        statsData.inactive ?? 0,
    byContractType,
    unassigned:      Math.max(0, total - assigned),
  };
}, [statsData, contractStatsMap, totalCount]);

  const hasSearch = Boolean(currentParams.search?.trim());

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-muted rounded animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-9 w-full sm:w-40 bg-muted rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 bg-muted rounded-full shrink-0" />
                <div className="space-y-2">
                  <div className="h-3.5 w-24 bg-muted rounded" />
                  <div className="h-7 w-14 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-card rounded-lg border border-border animate-pulse">
          <div className="h-10 w-full bg-muted rounded-t-lg" />
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 w-full bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col h-full justify-center">
        <Card className="border-destructive/30 dark:border-red-800/40 bg-destructive/10 shadow-md">
          <CardContent className="pt-6">
            <p className="text-destructive dark:text-destructive/80 font-medium">
              Error al cargar los empleados: {errorMessage || "Error desconocido"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Gestión de Empleados
          </h1>
          <p className="text-muted-foreground mt-2">
            Administre la información laboral del personal universitario
          </p>
        </div>

        <Dialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditSeed(null);
          }}
        >
          <DialogTrigger asChild>
            <Button
              data-testid="button-add-employee"
              className="bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg flex items-center gap-2"
              onClick={() => setEditSeed(null)}
            >
              <UserCog className="h-5 w-5" />
              Agregar Empleado
            </Button>
          </DialogTrigger>

          <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editSeed ? "Editar Empleado" : "Agregar Nuevo Empleado"}
              </DialogTitle>
              <DialogDescription>
                {editSeed
                  ? "Modifique la información del empleado seleccionado"
                  : "Complete los datos del nuevo empleado"}
              </DialogDescription>
            </DialogHeader>

            <EmployeeForm
              key={editSeed ? `edit-${editSeed.employeeID}` : "create"}
              viewSeed={editSeed ?? undefined}
              onSuccess={() => {
                setIsFormOpen(false);
                setEditSeed(null);
                toast({
                  title: "Operación exitosa",
                  description: editSeed
                    ? "Empleado actualizado correctamente"
                    : "Empleado creado correctamente",
                });
              }}
              onCancel={() => {
                setIsFormOpen(false);
                setEditSeed(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-primary p-2 rounded-full shrink-0">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">Total Empleados</p>
              <p className="text-2xl font-bold text-primary">{employeeStats.total}</p>
              <p className="text-xs text-muted-foreground">Total general</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-success/10 border-success/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-success p-2 rounded-full shrink-0">
              <UserCheck className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-success">Activos</p>
              <p className="text-2xl font-bold text-success">{employeeStats.active}</p>
              <p className="text-xs text-muted-foreground">Total general</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-destructive p-2 rounded-full shrink-0">
              <UserX className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-destructive">Inactivos</p>
              <p className="text-2xl font-bold text-destructive">{employeeStats.inactive}</p>
              <p className="text-xs text-muted-foreground">Total general</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {Object.keys(employeeStats.byContractType).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Distribución por régimen laboral
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(employeeStats.byContractType).map(([typeId, count]) => (
              <Card key={typeId} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="bg-muted p-2 rounded-full shrink-0">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {contractTypeMap[Number(typeId)] ?? `Tipo #${typeId}`}
                    </p>
                    <p className="text-2xl font-bold text-foreground">{count}</p>
                    <p className="text-xs text-muted-foreground">empleados</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {employeeStats.unassigned > 0 && (
              <Card className="border-warning/30 bg-warning/10">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="bg-warning p-2 rounded-full shrink-0">
                    <UserX className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-warning">Sin régimen</p>
                    <p className="text-2xl font-bold text-warning">{employeeStats.unassigned}</p>
                    <p className="text-xs text-muted-foreground">empleados</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">Lista de Empleados</h2>
          <div className="flex gap-2 shrink-0">
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
              aria-pressed={viewMode === "table"}
            >
              Tabla
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
            >
              Grid
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre, cédula, email o dependencia..."
            value={currentParams.search ?? ""}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10 w-full"
            aria-label="Buscar empleados"
          />
          {hasSearch && (
            <button
              type="button"
              onClick={() => clearSearch()}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="w-full">
      {viewMode === "table" ? (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Nombre Completo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Cédula
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Tipo de Empleado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Departamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {employees.map((employee) => (
                  <tr key={employee.employeeID} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-foreground">
                        {employee.fullName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground">
                        {employee.idCard || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground">
                        {employee.email || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground">
                        {employee.employeeTypeName ??
                          (employee.employeeType != null
                            ? `#${employee.employeeType}`
                            : "N/A")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground">
                        {employee.department || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={
                          employee.employeeIsActive
                            ? "bg-success/15 text-success"
                            : "bg-destructive/15 text-destructive dark:text-red-300"
                        }
                      >
                        {employee.employeeIsActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEmployee(employee)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver detalle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          {employees.length === 0 && (
            <div className="text-center py-12">
              <UserCog className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {hasSearch
                  ? "No se encontraron empleados"
                  : "No hay empleados registrados"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {hasSearch
                  ? "Intente con otro término de búsqueda"
                  : "Comience agregando el primer empleado al sistema"}
              </p>
              {!hasSearch && (
                <Button
                  onClick={() => {
                    setEditSeed(null);
                    setIsFormOpen(true);
                  }}
                  className="bg-primary hover:bg-primary/90 dark:bg-primary/90 dark:hover:bg-primary/80"
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  Agregar Primer Empleado
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((employee) => (
              <Card
                key={employee.employeeID}
                className="border-0 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold line-clamp-2 leading-snug">{employee.fullName}</span>
                    <Badge
                      className={
                        employee.employeeIsActive
                          ? "bg-success/15 text-success shrink-0 text-xs"
                          : "bg-destructive/15 text-destructive dark:text-red-300 shrink-0 text-xs"
                      }
                    >
                      {employee.employeeIsActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-1 space-y-0.5">
                    {employee.idCard && (
                      <div className="text-xs">CI: {employee.idCard}</div>
                    )}
                    {employee.employeeTypeName && (
                      <div className="text-xs truncate">
                        {employee.employeeTypeName}
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-1.5">
                  {employee.email && (
                    <div className="text-xs text-muted-foreground truncate">
                      {employee.email}
                    </div>
                  )}

                  {employee.department && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{employee.department}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatDate(employee.hireDate)}</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 h-8 text-xs"
                    onClick={() => setSelectedEmployee(employee)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Ver detalle
                  </Button>
                </CardContent>
              </Card>
            ))}

            {employees.length === 0 && (
              <div className="col-span-full text-center py-12">
                <UserCog className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {hasSearch ? "No se encontraron empleados" : "No hay empleados registrados"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {hasSearch
                    ? "Intente con otro término de búsqueda"
                    : "Comience agregando el primer empleado al sistema"}
                </p>
                {!hasSearch && (
                  <Button
                    onClick={() => { setEditSeed(null); setIsFormOpen(true); }}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    Agregar Primer Empleado
                  </Button>
                )}
              </div>
            )}
        </div>
      )}
      </div>

      <div className="border-t border-border/40 pt-2">
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
      </div>

      <Dialog
        open={!!selectedEmployee}
        onOpenChange={(open) => !open && setSelectedEmployee(null)}
      >
        <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Empleado</DialogTitle>
            <DialogDescription>
              Información general y laboral del empleado seleccionado
            </DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-primary/15 dark:bg-blue-900/30 p-3 rounded-full">
                  <UserCog className="h-8 w-8 text-primary dark:text-primary/70" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    {selectedEmployee.fullName}
                  </h2>
                  <p className="text-muted-foreground">
                    {selectedEmployee.idCard
                      ? `Cédula: ${selectedEmployee.idCard}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    Información Laboral
                  </h3>
                  <div className="space-y-3">
                    <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                      <span className="text-muted-foreground shrink-0">Estado:</span>
                      <Badge
                        className={
                          selectedEmployee.employeeIsActive
                            ? "bg-success/15 text-success"
                            : "bg-destructive/15 text-destructive dark:text-red-300"
                        }
                      >
                        {selectedEmployee.employeeIsActive
                          ? "Activo"
                          : "Inactivo"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                      <span className="text-muted-foreground shrink-0">Tipo de empleado:</span>
                      <span className="font-medium text-right">
                        {selectedEmployee.employeeTypeName ??
                          (selectedEmployee.employeeType != null
                            ? `#${selectedEmployee.employeeType}`
                            : "—")}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                      <span className="text-muted-foreground shrink-0">Departamento:</span>
                      <span className="font-medium text-right">
                        {selectedEmployee.department || "—"}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                      <span className="text-muted-foreground shrink-0">Facultad:</span>
                      <span className="font-medium text-right">
                        {selectedEmployee.faculty || "—"}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                      <span className="text-muted-foreground shrink-0">Fecha de ingreso:</span>
                      <span className="font-medium text-right">
                        {formatDate(selectedEmployee.hireDate)}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                      <span className="text-muted-foreground shrink-0">Años de servicio:</span>
                      <span className="font-medium text-right">
                        {selectedEmployee.yearsOfService ?? 0}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                      <span className="text-muted-foreground shrink-0">Jefe inmediato:</span>
                      <span className="font-medium text-right">
                        {selectedEmployee.immediateBoss || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    Información Personal
                  </h3>
                  <div className="space-y-3">
                    <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                      <span className="text-muted-foreground shrink-0">Email:</span>
                      <span className="font-medium text-right break-all min-w-0">
                        {selectedEmployee.email || "—"}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                      <span className="text-muted-foreground shrink-0">Teléfono:</span>
                      <span className="font-medium text-right">
                        {selectedEmployee.phone || "—"}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                      <span className="text-muted-foreground shrink-0">Dirección:</span>
                      <span className="font-medium text-right">
                        {selectedEmployee.address || "—"}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                      <span className="text-muted-foreground shrink-0">Fecha de nacimiento:</span>
                      <span className="font-medium text-right">
                        {formatDate(selectedEmployee.birthDate)}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                      <span className="text-muted-foreground shrink-0">Sexo:</span>
                      <span className="font-medium text-right">
                        {resolveSexName(selectedEmployee.sex, sexTypeMap)}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                      <span className="text-muted-foreground shrink-0">Estado civil:</span>
                      <span className="font-medium text-right">
                        {selectedEmployee.maritalStatus || "—"}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                      <span className="text-muted-foreground shrink-0">Etnia:</span>
                      <span className="font-medium text-right">
                        {selectedEmployee.ethnicity || "—"}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                      <span className="text-muted-foreground shrink-0">Tipo de sangre:</span>
                      <span className="font-medium text-right">
                        {selectedEmployee.bloodType || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setSelectedEmployee(null)}
                >
                  Cerrar
                </Button>

                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const seed = selectedEmployee;
                    setSelectedEmployee(null);
                    setEditSeed({ ...seed });
                    setIsFormOpen(true);
                  }}
                >
                  Editar información
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}