import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, CalendarDays, Plus } from "lucide-react";
import type { Vacation } from "@shared/schema";

const statusLabels: Record<string, string> = {
  "Planned": "Planificadas",
  "InProgress": "En Curso",
  "Completed": "Completadas",
  "Canceled": "Canceladas"
};

const statusColors: Record<string, string> = {
  "Planned": "bg-blue-100 text-blue-800",
  "InProgress": "bg-yellow-100 text-yellow-800",
  "Completed": "bg-green-100 text-green-800",
  "Canceled": "bg-red-100 text-red-800"
};

export default function VacationsPage() {
  const { data: vacations, isLoading, error } = useQuery<Vacation[]>({
    queryKey: ['/api/vacations'],
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
                <div className="h-4 w-2/3 bg-gray-200 rounded" />
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
            <p className="text-red-600">Error al cargar las vacaciones. Intente nuevamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Vacaciones</h1>
          <p className="text-gray-600 mt-2">Administre las vacaciones del personal universitario</p>
        </div>
        <Button 
          data-testid="button-add-vacation"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Programar Vacaciones
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {vacations?.map((vacation) => (
          <Card key={vacation.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <span data-testid={`text-vacation-${vacation.id}`}>
                    Vacaciones #{vacation.id}
                  </span>
                </div>
                <Badge 
                  className={statusColors[vacation.status] || "bg-gray-100 text-gray-800"}
                  data-testid={`status-${vacation.id}`}
                >
                  {statusLabels[vacation.status] || vacation.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span data-testid={`text-employee-${vacation.id}`}>
                  Empleado: #{vacation.employeeId}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CalendarDays className="h-4 w-4" />
                <span data-testid={`text-start-date-${vacation.id}`}>
                  Desde: {new Date(vacation.startDate).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CalendarDays className="h-4 w-4" />
                <span data-testid={`text-end-date-${vacation.id}`}>
                  Hasta: {new Date(vacation.endDate).toLocaleDateString()}
                </span>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Días concedidos:</span>
                  <span className="font-bold text-blue-600" data-testid={`text-days-granted-${vacation.id}`}>
                    {vacation.daysGranted}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Días tomados:</span>
                  <span className="font-bold text-green-600" data-testid={`text-days-taken-${vacation.id}`}>
                    {vacation.daysTaken}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  data-testid={`button-view-vacation-${vacation.id}`}
                >
                  Ver Detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {vacations && vacations.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay vacaciones registradas</h3>
            <p className="text-gray-600 mb-4">Comience programando las primeras vacaciones</p>
            <Button data-testid="button-add-first-vacation">
              <Plus className="mr-2 h-4 w-4" />
              Programar Primeras Vacaciones
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}