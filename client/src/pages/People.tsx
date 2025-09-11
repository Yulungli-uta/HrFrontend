import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Person, InsertPerson, Employee } from "@shared/schema";
import  PersonForm  from "@/components/forms/PersonForm";
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
  GraduationCap,
  Building2,
  UserCheck,
  Eye
} from "lucide-react";

import { PersonasAPI, EmpleadosAPI } from "@/lib/api";
import { ApiResponse } from "@/lib/api";

export default function People() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingPerson, setEditingPerson] = useState<Person | undefined>();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener personas con manejo de errores mejorado
  const { 
    data: peopleResponse, 
    isLoading: isLoadingPeople,
    isError: isErrorPeople,
    error: errorPeople
  } = useQuery<ApiResponse<Person[]>>({
    queryKey: ["people"],
    queryFn: () => PersonasAPI.list(),
  });

  const people = useMemo(() => {
    if (peopleResponse?.status === 'success') {
      console.log("Datos de personas:", peopleResponse.data);
      return peopleResponse.data || [];
    }
    return [];
  }, [peopleResponse]);

  // Obtener empleados con manejo de errores mejorado
  const { 
    data: employeesResponse, 
    isLoading: isLoadingEmployees,
    isError: isErrorEmployees,
    error: errorEmployees
  } = useQuery<ApiResponse<Employee[]>>({
    queryKey: ["employees"],
    queryFn: () => EmpleadosAPI.list(),
  });

  const employees = useMemo(() => {
    if (employeesResponse?.status === 'success') {
      return employeesResponse.data || [];
    }
    return [];
  }, [employeesResponse]);

  // Filtrar personas por término de búsqueda
  const filteredPeople = useMemo(() => {
    if (!searchTerm) return people;
    const term = searchTerm.toLowerCase();
    return people.filter(person => 
      person.firstName.toLowerCase().includes(term) ||
      person.lastName.toLowerCase().includes(term) ||
      person.idCard.includes(term) ||
      person.email.toLowerCase().includes(term)
    );
  }, [people, searchTerm]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const employeeTypes = employees.reduce((acc, employee) => {
      acc[employee.type] = (acc[employee.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPeople: people.filter(p => p.isActive).length,
      totalEmployees: employees.filter(e => e.isActive).length,
      teachers: employeeTypes["Teacher_LOSE"] || 0,
      administrative: employeeTypes["Administrative_LOSEP"] || 0,
      contractual: employeeTypes["Employee_CT"] || 0,
      coordinators: employeeTypes["Coordinator"] || 0,
    };
  }, [people, employees]);

  // Mutación para crear persona con el nuevo servicio API
  const createPersonMutation = useMutation({
    mutationFn: async (data: InsertPerson) => {
      const response = await PersonasAPI.create(data);
      if (response.status === 'error') {
        throw new Error(response.error.message || "Error al crear persona");
      }
      return response.data;
    },
    onSuccess: (createdPerson) => {
      // Actualización optimista de la caché
      queryClient.setQueryData(['people'], (old: Person[] | undefined) => 
        old ? [...old, createdPerson] : [createdPerson]
      );
      
      setIsFormOpen(false);
      toast({
        title: "Persona creada",
        description: `${createdPerson.firstName} ${createdPerson.lastName} se ha registrado correctamente.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la persona.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Invalidar query para asegurar datos frescos
      queryClient.invalidateQueries({ queryKey: ["people"] });
    }
  });

  const handleCreatePerson = async (data: InsertPerson) => {
    createPersonMutation.mutate(data);
  };

  // Manejar estados de error
  if (isErrorPeople || isErrorEmployees) {
    const errorMessage = errorPeople?.message || errorEmployees?.message || 
                         "Error al cargar los datos";
    
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Personas</h1>
            <p className="text-gray-600 mt-2">Dashboard de personal y directorio</p>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 font-medium text-lg mb-2">
            Error al cargar los datos
          </div>
          <p className="text-red-500 mb-4">{errorMessage}</p>
          <Button 
            variant="outline"
            onClick={() => {
              queryClient.refetchQueries({ queryKey: ["people"] });
              queryClient.refetchQueries({ queryKey: ["employees"] });
            }}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // Mostrar estado de carga
  if (isLoadingPeople || isLoadingEmployees) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Personas</h1>
            <p className="text-gray-600 mt-2">Dashboard de personal y directorio</p>
          </div>
          <Button className="bg-uta-blue hover:bg-uta-blue/90 opacity-50" disabled>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Persona
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Directorio de Personal</span>
              <div className="relative w-72">
                <div className="absolute left-2 top-2.5 h-4 w-4 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[...Array(6)].map((_, i) => (
                      <TableHead key={i}>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(6)].map((_, j) => (
                        <TableCell key={j}>
                        {/* <TableCell key={`skeleton-cell-${rowIndex}-${cellIndex}`}> */}
                          <div className="h-4 bg-gray-200 rounded"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Personas</h1>
          <p className="text-gray-600 mt-2">Dashboard de personal y directorio completo</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-uta-blue hover:bg-uta-blue/90"
              data-testid="button-add-person"
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Persona
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="add-person-dialog-description">
            <DialogHeader>
              <DialogTitle>Agregar Nueva Persona</DialogTitle>
              <DialogDescription id="add-person-dialog-description">
                Registra una nueva persona en el sistema universitario
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
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Dashboard de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Personal</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-uta-blue">{stats.totalPeople}</div>
            <p className="text-xs text-muted-foreground">
              Personal activo registrado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Docentes</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.teachers}</div>
            <p className="text-xs text-muted-foreground">
              Profesores LOSE
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrativos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.administrative}</div>
            <p className="text-xs text-muted-foreground">
              Personal LOSEP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratados</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.contractual}</div>
            <p className="text-xs text-muted-foreground">
              Personal CT + Coordinadores
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda y Grid de Personal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Directorio de Personal</span>
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cédula, nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                data-testid="input-search-people"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
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
                {filteredPeople.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {searchTerm ? "No se encontraron personas con ese criterio" : "No hay personas registradas"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPeople.map((person) => {
                    // console.log("Person ID:", person.personId);
                    return (
                    <TableRow key={person.id} data-testid={`person-row-${person.personId}`}>
                      <TableCell className="font-medium">
                        {person.firstName} {person.lastName}
                      </TableCell>
                      <TableCell>{person.idCard}</TableCell>
                      <TableCell>{person.email}</TableCell>
                      <TableCell>{person.phone || "No registrado"}</TableCell>
                      <TableCell>
                        <Badge variant={person.isActive ? "default" : "secondary"}>
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
                    );
                  }
                  ))
                }
              </TableBody>
            </Table>
          </div>
          
          {filteredPeople.length > 0 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {filteredPeople.length} de {people.length} personas
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}