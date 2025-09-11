import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Calendar, Upload, FileText, User, Search } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { JustificacionesMarcacionesAPI, TiposReferenciaAPI, handleApiError, VistaEmpleadosAPI } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Simulación de usuario logueado
const CURRENT_USER_ID = 1;

// Estado de la justificación
const justificationStatus = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada"
};

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200"
};

export default function PunchJustificationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBoss, setSelectedBoss] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Obtener lista de empleados (potenciales jefes)
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await VistaEmpleadosAPI.getAll();
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      return response.data;
    }
  });

  // Filtrar empleados basado en el término de búsqueda
  const filteredEmployees = employees?.filter((employee: any) => 
    employee && 
    `${employee.firstName || ''} ${employee.lastName || ''} ${employee.department || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Obtener tipos de justificación
  const { data: justificationTypes } = useQuery({
    queryKey: ['justificationTypes'],
    queryFn: async () => {
      const response = await TiposReferenciaAPI.byCategory('JUSTIFICATION');
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      return response.data;
    }
  });

  // Obtener razones de justificación
  const { data: justificationReasons } = useQuery({
    queryKey: ['justificationReasons'],
    queryFn: async () => {
      const response = await TiposReferenciaAPI.byCategory('JUSTIFICATION_REASON');
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      return response.data;
    }
  });

  // Obtener justificaciones del usuario actual
  const { data: justifications, isLoading, error } = useQuery({
    queryKey: ['punchJustifications', CURRENT_USER_ID],
    queryFn: async () => {
      const response = await JustificacionesMarcacionesAPI.list();
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      
      // Filtrar solo las justificaciones del usuario actual
      const userJustifications = Array.isArray(response.data) 
        ? response.data.filter(justification => 
            justification.employeeID === CURRENT_USER_ID
          )
        : [];
      
      return userJustifications;
    },
  });

  // Mutación para crear una nueva justificación
  const createJustificationMutation = useMutation({
    mutationFn: async (justificationData: any) => {
      console.log("Enviando datos:", justificationData);
      
      const response = await JustificacionesMarcacionesAPI.create(justificationData);
      if (response.status === 'error') {
        console.error("Error del backend:", response.error);
        throw response.error;
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punchJustifications', CURRENT_USER_ID] });
      setIsDialogOpen(false);
      setSelectedBoss(null);
      
      toast({
        title: "Justificación enviada",
        description: "Su solicitud de justificación ha sido enviada correctamente.",
        action: <CheckCircle className="h-5 w-5 text-green-500" />
      });
    },
    onError: (error: any) => {
      console.error("Error completo:", error);
      const errorMessage = handleApiError(
        error, 
        "Error al enviar la justificación. Por favor, intente nuevamente."
      );
      
      // Mostrar detalles del error si están disponibles
      const details = error.details || error.message;
      
      toast({ 
        title: "Error al enviar justificación", 
        description: details ? `${errorMessage} Detalles: ${details}` : errorMessage,
        variant: "destructive" 
      });
    }
  });

  const handleSubmitJustification = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Validar que se ha seleccionado un jefe
    if (!selectedBoss) {
      toast({
        title: "Error",
        description: "Debe seleccionar un jefe inmediato para enviar la solicitud.",
        variant: "destructive"
      });
      return;
    }

    // Obtener y formatear fechas correctamente
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const justificationDate = formData.get('justificationDate') as string;

    const justificationData = {
      employeeID: CURRENT_USER_ID,
      bossEmployeeID: selectedBoss.employeeId, // Usar el jefe seleccionado
      justificationTypeID: parseInt(formData.get('justificationType') as string),
      reason: formData.get('reason') as string,
      startDateTime: startDate ? new Date(startDate).toISOString() : null,
      endDateTime: endDate ? new Date(endDate).toISOString() : null,
      justificationDate: justificationDate ? new Date(justificationDate).toISOString().split('T')[0] : null,
      hoursRequested: formData.get('hoursRequested') ? parseFloat(formData.get('hoursRequested') as string) : null,
      createdBy: CURRENT_USER_ID
    };

    console.log("Datos a enviar:", justificationData);
    createJustificationMutation.mutate(justificationData);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = "Error al cargar las justificaciones. Intente nuevamente.";
    
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Justificación de Marcaciones</h1>
          <p className="text-gray-600 mt-2">
            Solicite la justificación de marcaciones faltantes o incorrectas
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <FileText className="h-4 w-4" />
              Nueva Justificación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Solicitar Justificación</DialogTitle>
              <DialogDescription>
                Complete el formulario para justificar una marcación faltante o incorrecta.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmitJustification} className="space-y-4 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Seleccionar Jefe Inmediato *</Label>
                  <div className="border rounded-md p-3">
                    {selectedBoss ? (
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <div>
                          <p className="font-medium">{selectedBoss.firstName} {selectedBoss.lastName}</p>
                          <p className="text-sm text-gray-600">{selectedBoss.department}</p>
                          <p className="text-xs text-gray-500">ID: {selectedBoss.employeeId}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBoss(null)}
                        >
                          Cambiar
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="relative mb-3">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                          <Input
                            placeholder="Buscar por nombre o departamento..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {isLoadingEmployees ? (
                            <p className="text-center py-4">Cargando empleados...</p>
                          ) : filteredEmployees && filteredEmployees.length > 0 ? (
                            filteredEmployees.map((employee: any) => (
                              <div
                                key={employee.employeeId}
                                className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
                                onClick={() => setSelectedBoss(employee)}
                              >
                                <div>
                                  <p className="font-medium">{employee.firstName} {employee.lastName}</p>
                                  <p className="text-sm text-gray-600">{employee.department}</p>
                                  <p className="text-xs text-gray-500">ID: {employee.employeeId}</p>
                                </div>
                                <Button variant="ghost" size="sm">
                                  Seleccionar
                                </Button>
                              </div>
                            ))
                          ) : (
                            <p className="text-center py-4">No se encontraron empleados</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="justificationType">Tipo de Justificación *</Label>
                    <Select name="justificationType" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {justificationTypes?.map((type: any) => (
                          <SelectItem key={type.typeId} value={type.typeId.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="justificationReason">Razón *</Label>
                    <Select name="justificationReason" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione la razón" />
                      </SelectTrigger>
                      <SelectContent>
                        {justificationReasons?.map((reason: any) => (
                          <SelectItem key={reason.typeId} value={reason.typeId.toString()}>
                            {reason.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="justificationDate">Fecha a justificar *</Label>
                    <Input
                      id="justificationDate"
                      name="justificationDate"
                      type="date"
                      required
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="hoursRequested">Horas a justificar (opcional)</Label>
                    <Input
                      id="hoursRequested"
                      name="hoursRequested"
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="8"
                      placeholder="Ej: 2.5"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Hora de inicio (opcional)</Label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="datetime-local"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Hora de fin (opcional)</Label>
                    <Input
                      id="endDate"
                      name="endDate"
                      type="datetime-local"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo detallado *</Label>
                  <Textarea
                    id="reason"
                    name="reason"
                    placeholder="Describa detalladamente el motivo de la justificación..."
                    required
                    rows={4}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setSelectedBoss(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createJustificationMutation.isPending || !selectedBoss}
                >
                  {createJustificationMutation.isPending ? "Enviando..." : "Enviar Justificación"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de justificaciones */}
      <Card>
        <CardHeader className="bg-gray-50 py-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Mis Solicitudes de Justificación</CardTitle>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Total: {justifications?.length || 0} solicitudes
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {justifications && justifications.length === 0 ? (
            <div className="text-center p-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay justificaciones registradas
              </h3>
              <p className="text-gray-600">
                Utilice el botón "Nueva Justificación" para crear su primera solicitud
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Fecha</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Razón</th>
                    <th className="px-6 py-3">Horas</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {justifications?.map((justification: any) => (
                    <tr key={justification.punchJustID} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {justification.justificationDate 
                            ? format(new Date(justification.justificationDate), "dd/MM/yyyy")
                            : "-"
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {justificationTypes?.find((t: any) => t.typeId === justification.justificationTypeID)?.name || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs truncate">
                          {justification.reason || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {justification.hoursRequested || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={statusColors[justification.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                          {justificationStatus[justification.status as keyof typeof justificationStatus] || justification.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Button variant="ghost" size="sm">
                          Ver detalles
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}