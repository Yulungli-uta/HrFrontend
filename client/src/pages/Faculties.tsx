import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Building2, User, Plus } from "lucide-react";
import type { Faculty } from "@shared/schema";
import FacultyForm from "@/components/forms/FacultyForm";
import { useState } from "react";
import { FacultadesAPI, type ApiResponse } from "@/lib/api"; // Cambiamos la importación

export default function FacultiesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Usamos el servicio específico de facultades
  const { data: apiResponse, isLoading, error } = useQuery<ApiResponse<Faculty[]>>({
    queryKey: ['/api/v1/rh/faculties'], // Cambiamos la queryKey
    queryFn: () => FacultadesAPI.list(), // Usamos el servicio de facultades
  });

  // Extraemos las facultades del formato de respuesta de la API
  const faculties = apiResponse?.status === 'success' ? apiResponse.data : [];

  // El resto del código se mantiene igual...
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
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
            <p className="text-red-600">Error al cargar las facultades. Intente nuevamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Manejar errores de la API (cuando status es 'error')
  if (apiResponse?.status === 'error') {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Error al cargar las facultades: {apiResponse.error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Facultades</h1>
          <p className="text-gray-600 mt-2">Administre las facultades de la Universidad Técnica de Ambato</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="button-add-faculty"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Facultad
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <FacultyForm 
              onSuccess={() => setIsFormOpen(false)}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {faculties.map((faculty) => (
          <Card key={faculty.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <span data-testid={`text-faculty-name-${faculty.id}`}>
                    {faculty.name}
                  </span>
                </div>
                <Badge 
                  variant={faculty.isActive ? "default" : "secondary"}
                  data-testid={`status-active-${faculty.id}`}
                >
                  {faculty.isActive ? "Activa" : "Inactiva"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {faculty.deanEmployeeId ? (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span data-testid={`text-dean-${faculty.id}`}>
                    Decano: Empleado #{faculty.deanEmployeeId}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <User className="h-4 w-4" />
                  <span data-testid={`text-no-dean-${faculty.id}`}>
                    Sin decano asignado
                  </span>
                </div>
              )}
              
              <div className="pt-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  data-testid={`button-view-faculty-${faculty.id}`}
                >
                  Ver Detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {faculties.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay facultades registradas</h3>
            <p className="text-gray-600 mb-4">Comience agregando la primera facultad al sistema</p>
            <Button 
              data-testid="button-add-first-faculty"
              onClick={() => setIsFormOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Primera Facultad
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}