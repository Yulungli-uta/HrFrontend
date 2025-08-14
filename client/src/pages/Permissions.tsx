import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { CalendarCheck, User, Calendar, Clock, Plus } from "lucide-react";
import type { Permission } from "@shared/schema";
import PermissionForm from "@/components/forms/PermissionForm";
import { useState } from "react";

const statusLabels: Record<string, string> = {
  "Pending": "Pendiente",
  "Approved": "Aprobado", 
  "Rejected": "Rechazado"
};

const statusColors: Record<string, string> = {
  "Pending": "bg-yellow-100 text-yellow-800",
  "Approved": "bg-green-100 text-green-800",
  "Rejected": "bg-red-100 text-red-800"
};

export default function PermissionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { data: permissions, isLoading, error } = useQuery<Permission[]>({
    queryKey: ['/api/permissions'],
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
            <p className="text-red-600">Error al cargar los permisos. Intente nuevamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Permisos</h1>
          <p className="text-gray-600 mt-2">Administre las solicitudes de permisos del personal</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="button-add-permission"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Solicitar Permiso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <PermissionForm 
              onSuccess={() => setIsFormOpen(false)}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {permissions?.map((permission) => (
          <Card key={permission.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CalendarCheck className="h-5 w-5 text-blue-600" />
                  <span data-testid={`text-permission-${permission.id}`}>
                    Permiso #{permission.id}
                  </span>
                </div>
                <Badge 
                  className={statusColors[permission.status] || "bg-gray-100 text-gray-800"}
                  data-testid={`status-${permission.id}`}
                >
                  {statusLabels[permission.status] || permission.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                <span data-testid={`text-permission-type-${permission.id}`}>
                  Tipo: {permission.permissionTypeId}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span data-testid={`text-employee-${permission.id}`}>
                  Empleado: #{permission.employeeId}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span data-testid={`text-start-date-${permission.id}`}>
                  Desde: {new Date(permission.startDate).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span data-testid={`text-end-date-${permission.id}`}>
                  Hasta: {new Date(permission.endDate).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span data-testid={`text-request-date-${permission.id}`}>
                  Solicitado: {new Date(permission.requestDate).toLocaleDateString()}
                </span>
              </div>

              {permission.justification && (
                <div className="pt-2">
                  <p className="text-sm text-gray-600" data-testid={`text-justification-${permission.id}`}>
                    <strong>Motivo:</strong> {permission.justification}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  data-testid={`button-view-permission-${permission.id}`}
                >
                  Ver Detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {permissions && permissions.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <CalendarCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay permisos registrados</h3>
            <p className="text-gray-600 mb-4">Comience agregando la primera solicitud de permiso</p>
            <Button data-testid="button-add-first-permission">
              <Plus className="mr-2 h-4 w-4" />
              Solicitar Primer Permiso
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}