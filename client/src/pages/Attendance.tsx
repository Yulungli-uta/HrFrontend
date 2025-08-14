import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, User, Clock, MapPin, Plus } from "lucide-react";
import type { AttendancePunch } from "@shared/schema";

const punchTypeLabels: Record<string, string> = {
  "In": "Entrada",
  "Out": "Salida"
};

const punchTypeColors: Record<string, string> = {
  "In": "bg-green-100 text-green-800",
  "Out": "bg-red-100 text-red-800"
};

export default function AttendancePage() {
  const { data: punches, isLoading, error } = useQuery<AttendancePunch[]>({
    queryKey: ['/api/attendance/punches'],
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
            <p className="text-red-600">Error al cargar los registros de asistencia. Intente nuevamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Control de Asistencia</h1>
          <p className="text-gray-600 mt-2">Monitoree las marcaciones de entrada y salida del personal</p>
        </div>
        <Button 
          data-testid="button-add-punch"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Registrar Marcación
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {punches?.map((punch) => (
          <Card key={punch.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Timer className="h-5 w-5 text-blue-600" />
                  <span data-testid={`text-punch-${punch.id}`}>
                    Marcación #{punch.id}
                  </span>
                </div>
                <Badge 
                  className={punchTypeColors[punch.punchType] || "bg-gray-100 text-gray-800"}
                  data-testid={`type-${punch.id}`}
                >
                  {punchTypeLabels[punch.punchType] || punch.punchType}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span data-testid={`text-employee-${punch.id}`}>
                  Empleado: #{punch.employeeId}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span data-testid={`text-punch-time-${punch.id}`}>
                  {new Date(punch.punchTime).toLocaleString()}
                </span>
              </div>
              
              {punch.deviceId && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="font-medium">Dispositivo:</span>
                  <span data-testid={`text-device-${punch.id}`}>
                    {punch.deviceId}
                  </span>
                </div>
              )}
              
              {(punch.latitude && punch.longitude) && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span data-testid={`text-location-${punch.id}`}>
                    {punch.latitude?.toFixed(6)}, {punch.longitude?.toFixed(6)}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  data-testid={`button-view-punch-${punch.id}`}
                >
                  Ver Detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {punches && punches.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Timer className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay registros de asistencia</h3>
            <p className="text-gray-600 mb-4">Comience registrando la primera marcación</p>
            <Button data-testid="button-add-first-punch">
              <Plus className="mr-2 h-4 w-4" />
              Registrar Primera Marcación
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}