// src/pages/EmployeesPage.tsx
import { useMemo, useState } from "react";
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

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
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
  return {
    total: statsData.total ?? totalCount,
    active: statsData.active ?? 0,
    inactive: statsData.inactive ?? 0,
    byContractType: contractStatsMap,
  };
}, [statsData, contractStatsMap, totalCount]);

  const hasSearch = Boolean(currentParams.search?.trim());

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-80 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-44 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse border-0 shadow-md">
              <CardHeader className="space-y-2 pb-3">
                <div className="h-5 w-32 bg-gray-200 rounded" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 animate-pulse">
          <div className="h-10 w-full bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 w-full bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50 shadow-md">
          <CardContent className="pt-6">
            <p className="text-red-600 font-medium">
              Error al cargar los empleados: {errorMessage || "Error desconocido"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Empleados
          </h1>
          <p className="text-gray-600 mt-2">
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
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2"
              onClick={() => setEditSeed(null)}
            >
              <UserCog className="h-5 w-5" />
              Agregar Empleado
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-blue-800">
              Total Empleados
            </CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {employeeStats.total}
            </div>
            <p className="text-xs text-blue-600 mt-1">Total general</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-r from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-green-800">
              Activos
            </CardTitle>
            <UserCheck className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {employeeStats.active}
            </div>
            <p className="text-xs text-green-600 mt-1">Total general</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-r from-red-50 to-red-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-red-800">
              Inactivos
            </CardTitle>
            <UserX className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900">
              {employeeStats.inactive}
            </div>
            <p className="text-xs text-red-600 mt-1">Total general</p>
          </CardContent>
        </Card>
      </div>

      {Object.keys(employeeStats.byContractType).length > 0 && (
        <>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Distribución por Tipo de Contrato
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {Object.entries(employeeStats.byContractType).map(
              ([typeId, count]) => (
                <Card key={typeId} className="border-0 shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium">
                      {contractTypeMap[Number(typeId)] ?? `Tipo #${typeId}`}
                    </CardTitle>
                    <Briefcase className="h-5 w-5 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{count}</div>
                    <p className="text-xs text-gray-500 mt-1">Empleados con este tipo de contrato</p>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Lista de Empleados
        </h2>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, cédula o email..."
              value={currentParams.search ?? ""}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10 py-2 w-full md:w-64"
              aria-label="Buscar empleados"
            />
            {hasSearch && (
              <button
                type="button"
                onClick={() => clearSearch()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
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
      </div>

      {viewMode === "table" ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nombre Completo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cédula
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo de Empleado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Departamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr key={employee.employeeID} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.fullName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {employee.idCard || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {employee.email || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {employee.employeeTypeName ??
                          (employee.employeeType != null
                            ? `#${employee.employeeType}`
                            : "N/A")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {employee.department || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={
                          employee.employeeIsActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
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
          </div>

          {employees.length === 0 && (
            <div className="text-center py-12">
              <UserCog className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {hasSearch
                  ? "No se encontraron empleados"
                  : "No hay empleados registrados"}
              </h3>
              <p className="text-gray-600 mb-4">
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
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  Agregar Primer Empleado
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {employees.map((employee) => (
            <Card
              key={employee.employeeID}
              className="border-0 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span className="text-lg line-clamp-2">{employee.fullName}</span>
                  <Badge
                    className={
                      employee.employeeIsActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {employee.employeeIsActive ? "Activo" : "Inactivo"}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {employee.idCard && (
                    <div className="text-sm">Cédula: {employee.idCard}</div>
                  )}
                  {employee.employeeTypeName && (
                    <div className="text-sm mt-1">
                      Tipo: {employee.employeeTypeName}
                    </div>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {employee.email && (
                  <div className="text-sm text-gray-600 truncate">
                    Email: {employee.email}
                  </div>
                )}

                {employee.department && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">
                      Departamento: {employee.department}
                    </span>
                  </div>
                )}

                {employee.faculty && (
                  <div className="text-sm text-gray-600">
                    Facultad: {employee.faculty}
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Ingreso: {formatDate(employee.hireDate)}</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => setSelectedEmployee(employee)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver detalle
                </Button>
              </CardContent>
            </Card>
          ))}

          {employees.length === 0 && (
            <Card className="text-center py-12 border-0 shadow-md col-span-full">
              <CardContent>
                <UserCog className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {hasSearch
                    ? "No se encontraron empleados"
                    : "No hay empleados registrados"}
                </h3>
                <p className="text-gray-600 mb-4">
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
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    Agregar Primer Empleado
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="mt-6">
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Empleado</DialogTitle>
            <DialogDescription>
              Información general y laboral del empleado seleccionado
            </DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-blue-100 p-3 rounded-full">
                  <UserCog className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedEmployee.fullName}
                  </h2>
                  <p className="text-gray-600">
                    {selectedEmployee.idCard
                      ? `Cédula: ${selectedEmployee.idCard}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Información Laboral
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado:</span>
                      <Badge
                        className={
                          selectedEmployee.employeeIsActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {selectedEmployee.employeeIsActive
                          ? "Activo"
                          : "Inactivo"}
                      </Badge>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo de empleado:</span>
                      <span className="font-medium">
                        {selectedEmployee.employeeTypeName ??
                          (selectedEmployee.employeeType != null
                            ? `#${selectedEmployee.employeeType}`
                            : "—")}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Departamento:</span>
                      <span className="font-medium">
                        {selectedEmployee.department || "—"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Facultad:</span>
                      <span className="font-medium">
                        {selectedEmployee.faculty || "—"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha de ingreso:</span>
                      <span className="font-medium">
                        {formatDate(selectedEmployee.hireDate)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Años de servicio:</span>
                      <span className="font-medium">
                        {selectedEmployee.yearsOfService ?? 0}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Jefe inmediato:</span>
                      <span className="font-medium">
                        {selectedEmployee.immediateBoss || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Información Personal
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium text-right break-all">
                        {selectedEmployee.email || "—"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Teléfono:</span>
                      <span className="font-medium">
                        {selectedEmployee.phone || "—"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Dirección:</span>
                      <span className="font-medium text-right max-w-xs">
                        {selectedEmployee.address || "—"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha de nacimiento:</span>
                      <span className="font-medium">
                        {formatDate(selectedEmployee.birthDate)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Sexo:</span>
                      <span className="font-medium">
                        {resolveSexName(selectedEmployee.sex, sexTypeMap)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado civil:</span>
                      <span className="font-medium">
                        {selectedEmployee.maritalStatus || "—"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Etnia:</span>
                      <span className="font-medium">
                        {selectedEmployee.ethnicity || "—"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo de sangre:</span>
                      <span className="font-medium">
                        {selectedEmployee.bloodType || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedEmployee(null)}
                >
                  Cerrar
                </Button>

                <Button
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