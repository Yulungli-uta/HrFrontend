// src/pages/People.tsx

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import type { Employee } from "@/shared/schema";
import PersonForm from "@/components/forms/PersonForm";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  User,
  Plus,
  Search,
  Users,
  UserCheck,
  Eye,
  Smartphone,
  Filter,
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
}) => {
  const personId = person.personId;

  return (
    <Card className="mb-4 border-border/60 bg-card/95 shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-foreground">
              {personFullName(person)}
            </h3>
            <p className="text-sm text-muted-foreground">{person.idCard || "Sin cédula"}</p>
          </div>

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
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center text-muted-foreground">
            <User className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">{person.email || "Sin correo"}</span>
          </div>

          <div className="flex items-center text-muted-foreground">
            <Smartphone className="mr-2 h-4 w-4 shrink-0" />
            <span>{person.phone || "No registrado"}</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-4 w-full rounded-full border border-border/60 hover:bg-primary/10 hover:text-primary"
          onClick={() => onView(personId)}
          disabled={!personId}
        >
          <Eye className="mr-2 h-4 w-4" />
          Ver detalle
        </Button>
      </CardContent>
    </Card>
  );
};

export default function People() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonDto | undefined>();
  const [activeFilter, setActiveFilter] =
    useState<"all" | "active" | "inactive">("all");

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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Gestión de Personas
          </h1>
          <p className="mt-2 text-muted-foreground">
            Dashboard de personal y directorio completo
          </p>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button
              className="rounded-full border border-primary/20 bg-primary px-5 text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg dark:border-primary/30"
              data-testid="button-add-person"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Agregar Persona</span>
              <span className="sm:hidden">Agregar</span>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 bg-card/95 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Personal</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalPeople}</div>
            <p className="text-xs text-muted-foreground">Personas registradas</p>
          </CardContent>
        </Card>

        {contractTypes.map((ct) => (
          <Card key={ct.id} className="border-border/60 bg-card/95 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{ct.name}</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary-foreground dark:text-orange-400">
                {stats.byContractTypeId.get(ct.id) ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Empleados activos con este tipo de contrato
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <span>Directorio de Personal</span>

            <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("all")}
                  className="h-9 rounded-full px-4"
                >
                  <Filter className="mr-1 h-4 w-4" />
                  Todos
                </Button>

                <Button
                  variant={activeFilter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("active")}
                  className="h-9 rounded-full px-4"
                >
                  Activos
                </Button>

                <Button
                  variant={activeFilter === "inactive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("inactive")}
                  className="h-9 rounded-full px-4"
                >
                  Inactivos
                </Button>
              </div>

              <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4"  />
                <Input
                  placeholder="Buscar por cédula, nombre o email..."
                  value={currentParams.search ?? ""}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-10 py-2 w-full md:w-64"
                  data-testid="input-search-people"
                />
                {currentParams.search && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {isLoadingPeople && (
            <div className="py-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              <p className="mt-2 text-muted-foreground">Cargando personas...</p>
            </div>
          )}

          {isErrorPeople && (
            <div className="py-8 text-center text-destructive">
              Error al cargar las personas: {errorPeople || "Error desconocido"}
            </div>
          )}

          <div className="block md:hidden">
            {!isLoadingPeople && filteredPeople.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {currentParams.search || activeFilter !== "all"
                  ? "No se encontraron personas con ese criterio"
                  : "No hay personas registradas"}
              </div>
            ) : (
              filteredPeople.map((person, index) => (
                <PersonCard
                  key={person.personId ?? index}
                  person={person}
                  onView={handleViewPerson}
                />
              ))
            )}
          </div>

          <div className="hidden md:block">
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card/70">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold text-muted-foreground">
                        Nombre Completo
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground">
                        Cédula
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground">
                        Email
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground">
                        Teléfono
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground">
                        Estado
                      </TableHead>
                      <TableHead className="text-right font-semibold text-muted-foreground">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {!isLoadingPeople && filteredPeople.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          {currentParams.search || activeFilter !== "all"
                            ? "No se encontraron personas con ese criterio"
                            : "No hay personas registradas"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPeople.map((person, index) => {
                        const personId = person.personId;

                        return (
                          <TableRow
                            key={personId ?? index}
                            data-testid={`person-row-${personId ?? index}`}
                            className="transition-colors hover:bg-muted/50"
                          >
                            <TableCell className="font-medium text-foreground">
                              {personFullName(person)}
                            </TableCell>
                            <TableCell>{person.idCard || "No registrado"}</TableCell>
                            <TableCell className="max-w-[260px] truncate">
                              {person.email || "No registrado"}
                            </TableCell>
                            <TableCell>{person.phone || "No registrado"}</TableCell>
                            <TableCell>
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
                            </TableCell>
                            <TableCell className="text-right">
                              {personId ? (
                                <Link href={`/people/${personId}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 rounded-full border border-border/60 px-3 hover:bg-primary/10 hover:text-primary"
                                    data-testid={`button-view-person-${personId}`}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver detalle
                                  </Button>
                                </Link>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled
                                  className="h-9 rounded-full border border-border/40 px-3 opacity-60"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Sin ID
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="mt-4">
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
        </CardContent>
      </Card>
    </div>
  );
}