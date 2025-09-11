import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Calendar, Users, Plus } from "lucide-react";
import type { Schedule } from "@shared/schema";
import ScheduleForm from "@/components/forms/ScheduleForm";
import { useState } from "react";
import { HorariosAPI, type ApiResponse } from "@/lib/api"; // Importamos desde lib/api

export default function SchedulesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Usamos el servicio específico de horarios
  const { data: apiResponse, isLoading, error } = useQuery<ApiResponse<Schedule[]>>({
    queryKey: ['/api/v1/rh/schedules'], // Cambiamos la queryKey
    queryFn: () => HorariosAPI.list(), // Usamos el servicio de horarios
  });

  // Extraemos los horarios del formato de respuesta de la API
  const schedules = apiResponse?.status === 'success' ? apiResponse.data : [];

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
            <p className="text-red-600">Error al cargar los horarios. Intente nuevamente.</p>
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
            <p className="text-red-600">Error al cargar los horarios: {apiResponse.error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Horarios</h1>
          <p className="text-gray-600 mt-2">Configure y administre los horarios de trabajo del personal</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="button-add-schedule"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear Horario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <ScheduleForm 
              onSuccess={() => setIsFormOpen(false)}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {schedules.map((schedule) => (
          <Card key={schedule.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span data-testid={`text-schedule-${schedule.id}`}>
                    {schedule.description}
                  </span>
                </div>
                {schedule.isRotating && (
                  <Badge variant="outline" className="text-xs">
                    Rotativo
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Horario:</span>
                <span className="font-medium" data-testid={`text-hours-${schedule.id}`}>
                  {schedule.entryTime} - {schedule.exitTime}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Horas/día:</span>
                <span className="font-medium" data-testid={`text-required-hours-${schedule.id}`}>
                  {schedule.requiredHoursPerDay}h
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span data-testid={`text-working-days-${schedule.id}`}>
                  {schedule.workingDays}
                </span>
              </div>
              
              {schedule.hasLunchBreak && schedule.lunchStart && schedule.lunchEnd && (
                <div className="bg-yellow-50 p-2 rounded text-sm">
                  <span className="text-yellow-700">
                    Almuerzo: {schedule.lunchStart} - {schedule.lunchEnd}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  data-testid={`button-view-schedule-${schedule.id}`}
                >
                  Ver Detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {schedules.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay horarios configurados</h3>
            <p className="text-gray-600 mb-4">Comience creando el primer horario de trabajo</p>
            <Button 
              data-testid="button-add-first-schedule"
              onClick={() => setIsFormOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear Primer Horario
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}