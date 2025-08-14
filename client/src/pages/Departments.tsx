import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, Building2, Plus } from "lucide-react";
import type { Department } from "@shared/schema";

export default function DepartmentsPage() {
  const { data: departments, isLoading, error } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-6 w-3/4 bg-gray-200 rounded" />
                <div className="h-4 w-1/2 bg-gray-200 rounded" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-full bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Error al cargar los departamentos. Intente nuevamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Departamentos</h1>
          <p className="text-gray-600 mt-2">Administre los departamentos de cada facultad</p>
        </div>
        <Button 
          data-testid="button-add-department"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar Departamento
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {departments?.map((department) => (
          <Card key={department.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-green-600" />
                  <span data-testid={`text-department-name-${department.id}`}>
                    {department.name}
                  </span>
                </div>
                <Badge 
                  variant={department.isActive ? "default" : "secondary"}
                  data-testid={`status-active-${department.id}`}
                >
                  {department.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {department.facultyId ? (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Building2 className="h-4 w-4" />
                  <span data-testid={`text-faculty-${department.id}`}>
                    Facultad: #{department.facultyId}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Building2 className="h-4 w-4" />
                  <span data-testid={`text-no-faculty-${department.id}`}>
                    Sin facultad asignada
                  </span>
                </div>
              )}
              
              <div className="pt-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  data-testid={`button-view-department-${department.id}`}
                >
                  Ver Detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {departments && departments.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay departamentos registrados</h3>
            <p className="text-gray-600 mb-4">Comience agregando el primer departamento al sistema</p>
            <Button data-testid="button-add-first-department">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Primer Departamento
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}