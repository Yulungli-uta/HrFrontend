// src/pages/People.tsx

import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import type { Person, InsertPerson, Employee } from "@/shared/schema";
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
import type { ApiResponse } from "@/lib/api/client";
import { usePaged } from "@/hooks/pagination/usePaged";
import { DataPagination } from "@/components/ui/DataPagination";

// Tipo que viene de la API
interface ApiRefType {
  typeId: number;
  category: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Tipo normalizado
export interface RefType {
  id: number;
  category: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Categorías que nos interesan para el formulario de Persona
const REF_CATEGORIES = [
  "IDENTITY_TYPE",
  "MARITAL_STATUS",
  "ETHNICITY",
  "BLOOD_TYPE",
  "SPECIAL_NEEDS",
  "GENDER_TYPE",
  "SEX_TYPE",
];

// Componente para mostrar cards en móviles
const PersonCard = ({
  person,
  onView,
}: {
  person: Person;
  onView: (id: number) => void;
}) => (
  <Card className="mb-4">
    <CardContent className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">
            {person.firstName} {person.lastName}
          </h3>
          <p className="text-sm text-muted-foreground">{person.idCard}</p>
        </div>
        <Badge variant={person.isActive ? "default" : "secondary"}>
          {person.isActive ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center">
          <User className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>{person.email}</span>
        </div>
        {person.phone && (
          <div className="flex items-center">
            <Smartphone className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{person.phone}</span>
          </div>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full mt-3"
        onClick={() => onView(person.personId)}
      >
        <Eye className="h-4 w-4 mr-2" />
        Ver Detalle
      </Button>
    </CardContent>
  </Card>
);

export default function People() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | undefined>();
  const [activeFilter, setActiveFilter] =
    useState<"all" | "active" | "inactive">("all");

  const { toast } = useToast();

  // ── Personas paginadas ───────────────────────────────────────────────────
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
  } = usePaged<Person>({
    queryKey: "people",
    queryFn: (params) => PersonasAPI.listPaged(params),
    initialPageSize: 20,
  });

  // ── Empleados (para stats) ───────────────────────────────────────────────
  const {
    data: employeesResponse,
    isLoading: isLoadingEmployees,
  } = useQuery<ApiResponse<Employee[]>>({
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

  // ── RefTypes ──────────────────────────────────────────────────────────────
  const {
    data: refTypesResponse,
    isLoading: isLoadingRefTypes,
    isError: isErrorRefTypes,
  } = useQuery<ApiResponse<ApiRefType[]>>({
    queryKey: ["refTypes"],
    queryFn: () => TiposReferenciaAPI.list(),
  });

  // Agrupar por categoría y normalizar
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

  // Tipos de contrato (CONTRACT_TYPE) para los cards
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

  const { create: createPersonMutation } = useCrudMutation<Person, InsertPerson>({
    queryKey: ["people"],
    createFn: PersonasAPI.create,
    createSuccessMessage: "Persona creada exitosamente",
    createErrorMessage: "Error al crear la persona",
    onSuccess: () => {
      setIsFormOpen(false);
      setEditingPerson(undefined);
    },
  });

  const handleCreatePerson = (data: InsertPerson) => {
    createPersonMutation.mutate(data);
  };

  const handleViewPerson = (id: number) => {
    window.location.href = `/people/${id}`;
  };

  // === STATS ===
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

      if (isNaN(typeId)) {
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
      // Si quieres "Total Personal" como total real del endpoint paginado:
      totalPeople: totalCount,

      // Si prefieres solo empleados activos, usa esta línea en lugar de la de arriba:
      // totalPeople: activeEmployees.length,

      byContractTypeId,
      withoutType,
    };
  }, [employees, contractTypes, totalCount]);

  // Filtro local por estado activo/inactivo
  const filteredPeople = useMemo(() => {
    if (activeFilter === "all") return people;
    return people.filter((p) =>
      activeFilter === "active" ? p.isActive : !p.isActive
    );
  }, [people, activeFilter]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Gestión de Personas
          </h1>
          <p className="text-gray-600 mt-2">
            Dashboard de personal y directorio completo
          </p>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-uta-blue hover:bg-uta-blue/90"
              data-testid="button-add-person"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Agregar Persona</span>
              <span className="sm:hidden">Agregar</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw]">
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
              person={editingPerson}
              onSubmit={handleCreatePerson}
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

      {/* Dashboard de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total personal */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Personal
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-uta-blue">
              {stats.totalPeople}
            </div>
            <p className="text-xs text-muted-foreground">
              Personas registradas
            </p>
          </CardContent>
        </Card>

        {/* Cards dinámicos por tipo de contrato */}
        {contractTypes.map((ct) => (
          <Card key={ct.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {ct.name}
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.byContractTypeId.get(ct.id) ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Empleados activos con este tipo de contrato
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Listado + filtros + búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <span>Directorio de Personal</span>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Filtros de estado */}
              <div className="flex gap-2">
                <Button
                  variant={activeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("all")}
                  className="h-9"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Todos
                </Button>
                <Button
                  variant={activeFilter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("active")}
                  className="h-9"
                >
                  Activos
                </Button>
                <Button
                  variant={activeFilter === "inactive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("inactive")}
                  className="h-9"
                >
                  Inactivos
                </Button>
              </div>

              {/* Búsqueda */}
              <div className="relative flex-1 lg:w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cédula, nombre o email..."
                  value={currentParams.search ?? ""}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-8"
                  data-testid="input-search-people"
                />
                {currentParams.search && (
                  <X
                    className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer"
                    onClick={() => clearSearch()}
                  />
                )}
              </div>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Loading */}
          {isLoadingPeople && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uta-blue mx-auto" />
              <p className="text-muted-foreground mt-2">
                Cargando personas...
              </p>
            </div>
          )}

          {/* Error */}
          {isErrorPeople && (
            <div className="text-center py-8 text-destructive">
              Error al cargar las personas:{" "}
              {errorPeople || "Error desconocido"}
            </div>
          )}

          {/* Vista móvil */}
          <div className="block md:hidden">
            {!isLoadingPeople && filteredPeople.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {currentParams.search || activeFilter !== "all"
                  ? "No se encontraron personas con ese criterio"
                  : "No hay personas registradas"}
              </div>
            ) : (
              filteredPeople.map((person) => (
                <PersonCard
                  key={person.personId}
                  person={person}
                  onView={handleViewPerson}
                />
              ))
            )}
          </div>

          {/* Vista desktop */}
          <div className="hidden md:block">
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre Completo</TableHead>
                      <TableHead>Cédula</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!isLoadingPeople && filteredPeople.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          {currentParams.search || activeFilter !== "all"
                            ? "No se encontraron personas con ese criterio"
                            : "No hay personas registradas"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPeople.map((person) => (
                        <TableRow
                          key={person.personId}
                          data-testid={`person-row-${person.personId}`}
                          className="hover:bg-muted/60 transition-colors"
                        >
                          <TableCell className="font-medium">
                            {person.firstName} {person.lastName}
                          </TableCell>
                          <TableCell>{person.idCard}</TableCell>
                          <TableCell>{person.email}</TableCell>
                          <TableCell>
                            {person.phone || "No registrado"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                person.isActive ? "default" : "secondary"
                              }
                            >
                              {person.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/people/${person.personId}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid={`button-view-person-${person.personId}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalle
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Paginación */}
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
        </CardContent>
      </Card>
    </div>
  );
}