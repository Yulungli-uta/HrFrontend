// src/pages/People.tsx

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import type { Employee } from "@/shared/schema";
import PersonForm from "@/components/forms/PersonForm";
import { useToast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Users,
  UserCheck,
  UserX,
  Eye,
  Smartphone,
  LayoutGrid,
  LayoutList,
  X,
} from "lucide-react";

import {
  PersonasAPI,
  EmpleadosAPI,
  TiposReferenciaAPI,
} from "@/lib/api";
import type { ApiResponse } from "@/lib/api";
import { usePaged } from "@/hooks/pagination/usePaged";
import { DataPagination } from "@/components/ui/DataPagination";

interface ApiRefType {
  typeId: number;
  category: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RefType {
  id: number;
  category: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

type PersonDto = {
  personId: number;
  firstName: string;
  lastName: string;
  identType: number;
  idCard: string;
  email: string;
  phone?: string | null;
  birthDate?: string | null;
  sex?: number | string | null;
  gender?: number | string | null;
  disability?: string | null;
  address?: string | null;
  isActive: boolean;
  maritalStatusTypeId?: number | null;
  militaryCard?: string | null;
  motherName?: string | null;
  fatherName?: string | null;
  countryId?: number | string | null;
  provinceId?: number | string | null;
  cantonId?: number | string | null;
  yearsOfResidence?: number | null;
  ethnicityTypeId?: number | null;
  bloodTypeTypeId?: number | null;
  specialNeedsTypeId?: number | null;
  disabilityPercentage?: number | null;
  conadisCard?: string | null;
};

type PersonCreateDto = {
  firstName: string;
  lastName: string;
  identType: number;
  idCard: string;
  email: string;
  phone?: string | null;
  birthDate?: string | null;
  sex?: number | string | null;
  gender?: number | string | null;
  disability?: string | null;
  address?: string | null;
  isActive?: boolean | null;
  maritalStatusTypeId?: number | null;
  militaryCard?: string | null;
  motherName?: string | null;
  fatherName?: string | null;
  countryId?: number | string | null;
  provinceId?: number | string | null;
  cantonId?: number | string | null;
  yearsOfResidence?: number | null;
  ethnicityTypeId?: number | null;
  bloodTypeTypeId?: number | null;
  specialNeedsTypeId?: number | null;
  disabilityPercentage?: number | null;
  conadisCard?: string | null;
};

type PersonFormValue = Partial<PersonCreateDto> & {
  id?: number | null;
  personId?: number | null;
  identificationTypeId?: number | null;
};

const REF_CATEGORIES = [
  "IDENTITY_TYPE",
  "MARITAL_STATUS",
  "ETHNICITY",
  "BLOOD_TYPE",
  "SPECIAL_NEEDS",
  "GENDER_TYPE",
  "SEX_TYPE",
];

const personFullName = (person: Pick<PersonDto, "firstName" | "lastName">) =>
  [person.firstName, person.lastName].filter(Boolean).join(" ").trim() || "Sin nombre";

const normalizePersonCreatePayload = (data: PersonFormValue): PersonCreateDto => ({
  firstName: data.firstName?.trim() ?? "",
  lastName: data.lastName?.trim() ?? "",
  identType: Number(data.identType ?? data.identificationTypeId ?? 0),
  idCard: data.idCard?.trim() ?? "",
  email: data.email?.trim() ?? "",
  phone: data.phone?.trim() ?? null,
  birthDate: data.birthDate ?? null,
  sex: data.sex ?? null,
  gender: data.gender ?? null,
  disability: data.disability?.trim() ?? null,
  address: data.address?.trim() ?? null,
  isActive: data.isActive ?? true,
  maritalStatusTypeId: data.maritalStatusTypeId ?? null,
  militaryCard: data.militaryCard?.trim() ?? null,
  motherName: data.motherName?.trim() ?? null,
  fatherName: data.fatherName?.trim() ?? null,
  countryId: data.countryId ?? null,
  provinceId: data.provinceId ?? null,
  cantonId: data.cantonId ?? null,
  yearsOfResidence: data.yearsOfResidence ?? null,
  ethnicityTypeId: data.ethnicityTypeId ?? null,
  bloodTypeTypeId: data.bloodTypeTypeId ?? null,
  specialNeedsTypeId: data.specialNeedsTypeId ?? null,
  disabilityPercentage: data.disabilityPercentage ?? null,
  conadisCard: data.conadisCard?.trim() ?? null,
});

const PersonCard = ({
  person,
  onView,
}: {
  person: PersonDto;
  onView: (id: number) => void;
}) => (
  <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200">
    <CardHeader className="p-4 pb-2">
      <CardTitle className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold line-clamp-2 leading-snug">
          {personFullName(person)}
        </span>
        <Badge
          className={
            person.isActive
              ? "bg-success/15 text-success shrink-0 text-xs"
              : "bg-destructive/15 text-destructive shrink-0 text-xs"
          }
        >
          {person.isActive ? "Activo" : "Inactivo"}
        </Badge>
      </CardTitle>
      <CardDescription className="mt-1 space-y-0.5">
        <div className="text-xs">{person.idCard || "Sin cédula"}</div>
      </CardDescription>
    </CardHeader>

    <CardContent className="p-4 pt-0 space-y-1.5">
      {person.email && (
        <div className="text-xs text-muted-foreground truncate">{person.email}</div>
      )}
      {person.phone && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Smartphone className="h-3.5 w-3.5 shrink-0" />
          <span>{person.phone}</span>
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-2 h-8 text-xs"
        onClick={() => onView(person.personId)}
        disabled={!person.personId}
      >
        <Eye className="h-3.5 w-3.5 mr-1" />
        Ver detalle
      </Button>
    </CardContent>
  </Card>
);

export default function People() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonDto | undefined>();
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [viewMode, setViewMode] = useState<"grid" | "table">(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? "grid" : "table"
  );

  useEffect(() => {
    if (isMobile) setViewMode("grid");
  }, [isMobile]);

  useToast();

  const {
    items: people,
    isLoading: isLoadingPeople,
    isError: isErrorPeople,
    errorMessage: errorPeople,
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
  } = usePaged<PersonDto>({
    queryKey: "people",
    queryFn: (params) => PersonasAPI.listPaged(params),
    initialPageSize: 20,
  });

  const { data: employeesResponse } = useQuery<ApiResponse<Employee[]>>({
    queryKey: ["employees"],
    queryFn: () => EmpleadosAPI.list(),
    staleTime: 5 * 60_000,
  });

  const employees = useMemo(() => {
    if (employeesResponse?.status === "success") {
      return employeesResponse.data || [];
    }
    return [];
  }, [employeesResponse]);

  const {
    data: refTypesResponse,
    isLoading: isLoadingRefTypes,
    isError: isErrorRefTypes,
  } = useQuery<ApiResponse<ApiRefType[]>>({
    queryKey: ["refTypes"],
    queryFn: () => TiposReferenciaAPI.list(),
    staleTime: 5 * 60_000,
  });

  const refTypesByCategory = useMemo(() => {
    if (
      refTypesResponse?.status === "success" &&
      Array.isArray(refTypesResponse.data)
    ) {
      return refTypesResponse.data.reduce((acc, ref) => {
        if (REF_CATEGORIES.length && !REF_CATEGORIES.includes(ref.category)) {
          return acc;
        }
        const normalized: RefType = {
          id: ref.typeId,
          category: ref.category,
          name: ref.name,
          description: ref.description ?? undefined,
          isActive: ref.isActive,
          createdAt: ref.createdAt,
          updatedAt: ref.updatedAt,
        };
        if (!acc[ref.category]) {
          acc[ref.category] = [];
        }
        acc[ref.category].push(normalized);
        return acc;
      }, {} as Record<string, RefType[]>);
    }
    return {};
  }, [refTypesResponse]);

  const contractTypes = useMemo<RefType[]>(() => {
    if (
      refTypesResponse?.status === "success" &&
      Array.isArray(refTypesResponse.data)
    ) {
      return refTypesResponse.data
        .filter((ref) => ref.category === "CONTRACT_TYPE")
        .map<RefType>((ref) => ({
          id: ref.typeId,
          category: ref.category,
          name: ref.name,
          description: ref.description ?? undefined,
          isActive: ref.isActive,
          createdAt: ref.createdAt,
          updatedAt: ref.updatedAt,
        }));
    }
    return [];
  }, [refTypesResponse]);

  const { create: createPersonMutation } = useCrudMutation<PersonDto, PersonCreateDto>({
    queryKey: ["people"],
    createFn: PersonasAPI.create,
    createSuccessMessage: "Persona creada exitosamente",
    createErrorMessage: "Error al crear la persona",
    onSuccess: () => {
      setIsFormOpen(false);
      setEditingPerson(undefined);
    },
  });

  const handleCreatePerson = (data: PersonFormValue) => {
    const payload = normalizePersonCreatePayload(data);
    createPersonMutation.mutate(payload);
  };

  const handleViewPerson = (id: number) => {
    window.location.href = `/people/${id}`;
  };

  const stats = useMemo(() => {
    const activeEmployees = employees.filter((emp: any) => emp.isActive);
    const inactiveEmployees = employees.filter((emp: any) => !emp.isActive);

    const byContractTypeId = new Map<number, number>();
    let withoutType = 0;

    activeEmployees.forEach((emp: any) => {
      const employeeTypeId = emp.employeeType;
      if (
        employeeTypeId === null ||
        employeeTypeId === undefined ||
        employeeTypeId === "" ||
        employeeTypeId === 0
      ) {
        withoutType++;
        return;
      }
      const typeId = Number(employeeTypeId);
      if (Number.isNaN(typeId)) {
        withoutType++;
        return;
      }
      const matchedType = contractTypes.find((ct) => ct.id === typeId);
      if (matchedType) {
        const current = byContractTypeId.get(matchedType.id) ?? 0;
        byContractTypeId.set(matchedType.id, current + 1);
      } else {
        withoutType++;
      }
    });

    return {
      totalPeople: totalCount,
      activeEmployees: activeEmployees.length,
      inactiveEmployees: inactiveEmployees.length,
      byContractTypeId,
      withoutType,
    };
  }, [employees, contractTypes, totalCount]);

  const filteredPeople = useMemo(() => {
    if (activeFilter === "all") return people;
    return people.filter((p) =>
      activeFilter === "active" ? p.isActive : !p.isActive
    );
  }, [people, activeFilter]);

  const hasSearch = Boolean(currentParams.search) || activeFilter !== "all";

  return (
    <div className="flex flex-col gap-4">
      {/* Título + botón agregar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Gestión de Personas
          </h1>
          <p className="text-muted-foreground mt-2">
            Dashboard de personal y directorio completo
          </p>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg flex items-center gap-2"
              data-testid="button-add-person"
            >
              <Plus className="h-5 w-5" />
              Agregar Persona
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] w-[95vw] max-w-6xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPerson ? "Editar Persona" : "Agregar Nueva Persona"}
              </DialogTitle>
              <DialogDescription id="add-person-dialog-description">
                {editingPerson
                  ? "Modifica la información de la persona seleccionada"
                  : "Registra una nueva persona en el sistema universitario"}
              </DialogDescription>
            </DialogHeader>

            <PersonForm
              person={editingPerson as any}
              onSubmit={handleCreatePerson as any}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingPerson(undefined);
              }}
              isLoading={createPersonMutation.isPending}
              refTypesByCategory={refTypesByCategory}
              isRefTypesError={isErrorRefTypes}
              isRefTypesLoading={isLoadingRefTypes}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-primary p-2 rounded-full shrink-0">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">Total Personas</p>
              <p className="text-2xl font-bold text-primary">{stats.totalPeople}</p>
              <p className="text-xs text-muted-foreground">Registradas en el sistema</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-success/10 border-success/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-success p-2 rounded-full shrink-0">
              <UserCheck className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-success">Empleados Activos</p>
              <p className="text-2xl font-bold text-success">{stats.activeEmployees}</p>
              <p className="text-xs text-muted-foreground">Con contrato vigente</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-destructive p-2 rounded-full shrink-0">
              <UserX className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-destructive">Empleados Inactivos</p>
              <p className="text-2xl font-bold text-destructive">{stats.inactiveEmployees}</p>
              <p className="text-xs text-muted-foreground">Sin contrato activo</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribución por régimen laboral */}
      {contractTypes.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Distribución por régimen laboral
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {contractTypes.map((ct) => (
              <Card key={ct.id} className="border-border/60 bg-card/95 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="bg-secondary p-2 rounded-full shrink-0">
                    <UserCheck className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground truncate">{ct.name}</p>
                    <p className="text-xl font-bold text-foreground">
                      {stats.byContractTypeId.get(ct.id) ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Activos</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {stats.withoutType > 0 && (
              <Card className="border-border/60 bg-muted/30 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="bg-muted-foreground/20 p-2 rounded-full shrink-0">
                    <UserX className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Sin régimen</p>
                    <p className="text-xl font-bold text-muted-foreground">
                      {stats.withoutType}
                    </p>
                    <p className="text-xs text-muted-foreground">Sin asignación</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Controles: filtros + toggle vista + búsqueda */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-base font-semibold text-foreground">Directorio de Personal</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Button
                variant={activeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("all")}
                className="h-8 rounded-full px-3 text-xs"
              >
                Todos
              </Button>
              <Button
                variant={activeFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("active")}
                className="h-8 rounded-full px-3 text-xs"
              >
                Activos
              </Button>
              <Button
                variant={activeFilter === "inactive" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("inactive")}
                className="h-8 rounded-full px-3 text-xs"
              >
                Inactivos
              </Button>
            </div>
            <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode("table")}
                aria-label="Vista tabla"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode("grid")}
                aria-label="Vista cuadrícula"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por cédula, nombre o email..."
            value={currentParams.search ?? ""}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10 w-full"
            data-testid="input-search-people"
          />
          {currentParams.search && (
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

      {/* Loading / Error */}
      {isLoadingPeople && (
        <div className="py-6 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-2 text-muted-foreground">Cargando personas...</p>
        </div>
      )}

      {isErrorPeople && (
        <div className="py-6 text-center text-destructive">
          Error al cargar las personas: {errorPeople || "Error desconocido"}
        </div>
      )}

      {/* Tabla / Grid */}
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
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!isLoadingPeople && filteredPeople.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      {hasSearch
                        ? "No se encontraron personas con ese criterio"
                        : "No hay personas registradas"}
                    </td>
                  </tr>
                ) : (
                  filteredPeople.map((person, index) => {
                    const personId = person.personId;
                    return (
                      <tr
                        key={personId ?? index}
                        data-testid={`person-row-${personId ?? index}`}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          {personFullName(person)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {person.idCard || "No registrado"}
                        </td>
                        <td className="px-6 py-4 text-sm max-w-[260px] truncate">
                          {person.email || "No registrado"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {person.phone || "No registrado"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Badge
                            variant="outline"
                            className={
                              person.isActive
                                ? "border-emerald-500/30 bg-emerald-500/10 text-success dark:text-emerald-300"
                                : "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300"
                            }
                          >
                            {person.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {personId ? (
                            <Link href={`/people/${personId}`} aria-label="Ver detalle">
                              <ActionIconButton
                                icon={Eye}
                                label="Ver detalle"
                                tone="primary"
                                data-testid={`button-view-person-${personId}`}
                              />
                            </Link>
                          ) : (
                            <ActionIconButton icon={Eye} label="Sin ID" disabled />
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPeople.map((person, index) => (
              <PersonCard
                key={person.personId ?? index}
                person={person}
                onView={handleViewPerson}
              />
            ))}
            {!isLoadingPeople && filteredPeople.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {hasSearch ? "No se encontraron personas" : "No hay personas registradas"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {hasSearch
                    ? "Intente con otro término de búsqueda"
                    : "Comience agregando la primera persona al sistema"}
                </p>
                {!hasSearch && (
                  <Button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Primera Persona
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Paginación */}
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
          disabled={isLoadingPeople}
        />
      </div>
    </div>
  );
}
