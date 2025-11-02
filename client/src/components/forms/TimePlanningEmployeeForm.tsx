// '@/components/forms/TimePlanningEmployeeForm'
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { TimePlanningEmployeesAPI, TiposReferenciaAPI } from "@/lib/api";
import { RefreshCw, Download, Edit, Play, Trash2, User, Mail, Building } from "lucide-react";

interface TimePlanningEmployee {
  planEmployeeID?: number;
  planID: number;
  employeeID: number;
  assignedHours?: number;
  assignedMinutes?: number;
  actualHours?: number;
  actualMinutes?: number;
  employeeStatusTypeID: number;
  employeeStatusName?: string;
  paymentAmount?: number;
  isEligible: boolean;
  eligibilityReason?: string;
  createdAt: string;
  employeeName?: string;
  department?: string;
  position?: string;
  email?: string;
}

interface RefType {
  typeId: number;
  category: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface TimePlanningEmployeeFormProps {
  planningId: number;
  planningTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function TimePlanningEmployeeForm({ 
  planningId, 
  planningTitle,
  isOpen, 
  onClose 
}: TimePlanningEmployeeFormProps) {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<TimePlanningEmployee[]>([]);
  const [employeeStatusTypes, setEmployeeStatusTypes] = useState<RefType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadEmployees = async () => {
    if (!planningId) return;
    
    try {
      setIsLoading(true);
      console.log('Loading employees for planning ID:', planningId);
      const response = await TimePlanningEmployeesAPI.getByPlan(planningId);
      if (response.status === 'success') {
        setEmployees(response.data || []);
      } else {
        console.error('Error loading planning employees:', response.error);
        setEmployees([]);
        toast({
          title: "Error",
          description: "Error al cargar los empleados de la planificación",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading planning employees:', error);
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployeeStatusTypes = async () => {
    try {
      const response = await TiposReferenciaAPI.byCategory('EMPLOYEE_PLAN_STATUS');
      if (response.status === 'success') {
        setEmployeeStatusTypes(response.data || []);
      }
    } catch (error) {
      console.error('Error loading employee status types:', error);
    }
  };

  useEffect(() => {
    if (isOpen && planningId) {
      loadEmployees();
      loadEmployeeStatusTypes();
    }
  }, [isOpen, planningId]);

  const getEmployeeStatusBadge = (statusTypeID: number) => {
    const status = employeeStatusTypes.find(s => s.typeId === statusTypeID);
    if (!status) return <Badge variant="outline">Desconocido</Badge>;

    const variantMap: { [key: string]: "default" | "secondary" | "destructive" | "outline" | "success" } = {
      'Asignado': 'secondary',
      'En Progreso': 'default',
      'Completado': 'success',
      'Cancelado': 'destructive',
      'Ausente': 'outline',
      'Aprobado': 'success',
      'Rechazado': 'destructive'
    };

    return (
      <Badge variant={variantMap[status.name] || "outline"} className="text-xs">
        {status.name}
      </Badge>
    );
  };

  const formatHours = (hours?: number, minutes?: number) => {
    if (hours !== undefined && hours !== null) {
      return `${hours}h`;
    }
    if (minutes !== undefined && minutes !== null) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
    }
    return '0h';
  };

  const handleUpdateStatus = async (employeeId: number, newStatus: string) => {
    try {
      const statusType = employeeStatusTypes.find(s => s.name === newStatus);
      if (!statusType) {
        toast({
          title: "Error",
          description: "Estado no válido",
          variant: "destructive",
        });
        return;
      }

      // Aquí iría la llamada a la API para actualizar el estado
      toast({
        title: "Éxito",
        description: `Estado actualizado a ${newStatus}`,
      });
      
      // Recargar la lista
      await loadEmployees();
    } catch (error) {
      console.error('Error updating employee status:', error);
      toast({
        title: "Error",
        description: "Error al actualizar el estado",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    toast({
      title: "Exportando",
      description: "Preparando archivo para descarga...",
    });
    // Lógica de exportación aquí
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <User className="h-5 w-5" />
            Empleados - {planningTitle}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Gestión de empleados asignados a esta planificación
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mr-2" />
            <span className="text-sm sm:text-base">Cargando empleados...</span>
          </div>
        ) : employees.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-sm text-gray-500">
                {employees.length} empleado(s) asignado(s)
              </div>
              <Button variant="outline" size="sm" onClick={handleExport} className="text-xs">
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Exportar
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Empleado</TableHead>
                      <TableHead className="hidden sm:table-cell min-w-[120px]">Departamento</TableHead>
                      <TableHead className="hidden md:table-cell min-w-[120px]">Cargo</TableHead>
                      <TableHead className="min-w-[100px]">Estado</TableHead>
                      <TableHead className="min-w-[100px]">Asignado</TableHead>
                      <TableHead className="min-w-[100px]">Real</TableHead>
                      <TableHead className="hidden lg:table-cell min-w-[100px]">Monto</TableHead>
                      <TableHead className="min-w-[100px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.planEmployeeID}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{employee.employeeName}</div>
                            <div className="flex items-center text-xs text-gray-500">
                              <Mail className="h-3 w-3 mr-1" />
                              {employee.email}
                            </div>
                            <div className="flex items-center text-xs text-gray-500 sm:hidden">
                              <Building className="h-3 w-3 mr-1" />
                              {employee.department}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center text-sm">
                            <Building className="h-3 w-3 mr-1 text-gray-400" />
                            {employee.department}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {employee.position || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {getEmployeeStatusBadge(employee.employeeStatusTypeID)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatHours(employee.assignedHours, employee.assignedMinutes)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatHours(employee.actualHours, employee.actualMinutes)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {employee.paymentAmount ? 
                            `$${employee.paymentAmount.toLocaleString()}` : 
                            'N/A'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-xs">
                                  Acciones
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem 
                                  onClick={() => handleUpdateStatus(employee.employeeID, 'En Progreso')}
                                  className="text-xs"
                                >
                                  <Play className="h-3 w-3 mr-2" />
                                  Iniciar Trabajo
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleUpdateStatus(employee.employeeID, 'Completado')}
                                  className="text-xs"
                                >
                                  <Edit className="h-3 w-3 mr-2" />
                                  Completado
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleUpdateStatus(employee.employeeID, 'Cancelado')}
                                  className="text-xs text-red-600"
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Cancelar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <User className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg mb-2">No hay empleados asignados</p>
            <p className="text-sm">Los empleados asignados aparecerán aquí</p>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button onClick={onClose} className="w-full sm:w-auto">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}