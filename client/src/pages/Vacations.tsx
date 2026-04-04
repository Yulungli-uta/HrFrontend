import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, CalendarDays, Plus } from "lucide-react";
import type { Vacation } from "@/shared/schema";
import { VacacionesAPI, type ApiResponse } from "@/lib/api"; // Cambiamos la importación

const statusLabels: Record<string, string> = {
  "Planned": "Planificadas",
  "InProgress": "En Curso",
  "Completed": "Completadas",
  "Canceled": "Canceladas"
};

const statusColors: Record<string, string> = {
  "Planned": "bg-primary/15 text-primary",
  "InProgress": "bg-warning/15 text-warning",
  "Completed": "bg-success/15 text-success",
  "Canceled": "bg-destructive/15 text-destructive"
};

export default function VacationsPage() {
  // Usamos el servicio específico de vacaciones
  const { data: apiResponse, isLoading, error } = useQuery<ApiResponse<Vacation[]>>({
    queryKey: ['/api/v1/rh/vacations'], // Cambiamos la queryKey
    queryFn: () => VacacionesAPI.list(), // Usamos el servicio de vacaciones
  });

  // Extraemos las vacaciones del formato de respuesta de la API
  const vacations = apiResponse?.status === 'success' ? apiResponse.data : [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-6 w-3/4 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-2/3 bg-muted rounded" />
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
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">Error al cargar las vacaciones. Intente nuevamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Manejar errores de la API (cuando status es 'error')
  if (apiResponse?.status === 'error') {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">Error al cargar las vacaciones: {apiResponse.error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Vacaciones</h1>
          <p className="text-muted-foreground mt-2">Administre las vacaciones del personal universitario</p>
        </div>
        <Button 
          data-testid="button-add-vacation"
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Programar Vacaciones
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {vacations.map((vacation) => (
          <Card key={vacation.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-success" />
                  <span data-testid={`text-vacation-${vacation.id}`}>
                    Vacaciones #{vacation.id}
                  </span>
                </div>
                <Badge 
                  className={statusColors[vacation.status as keyof typeof statusColors] || "bg-muted text-foreground"}
                  data-testid={`status-${vacation.id}`}
                >
                  {statusLabels[vacation.status as keyof typeof statusLabels] || vacation.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span data-testid={`text-employee-${vacation.id}`}>
                  Empleado: #{vacation.employeeId}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span data-testid={`text-start-date-${vacation.id}`}>
                  Desde: {new Date(vacation.startDate as string).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span data-testid={`text-end-date-${vacation.id}`}>
                  Hasta: {new Date(vacation.endDate as string).toLocaleDateString()}
                </span>
              </div>
              
              <div className="bg-background p-3 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-foreground">Días concedidos:</span>
                  <span className="font-bold text-primary" data-testid={`text-days-granted-${vacation.id}`}>
                    {vacation.daysGranted}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Días tomados:</span>
                  <span className="font-bold text-success" data-testid={`text-days-taken-${vacation.id}`}>
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

      {vacations.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground/70 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay vacaciones registradas</h3>
            <p className="text-muted-foreground mb-4">Comience programando las primeras vacaciones</p>
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