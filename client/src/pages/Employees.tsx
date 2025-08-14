import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { UserCog, Building2, Calendar, Users } from "lucide-react";
import type { Employee } from "@shared/schema";
import EmployeeForm from "@/components/forms/EmployeeForm";
import { useState } from "react";

const employeeTypeLabels: Record<string, string> = {
  "Teacher_LOSE": "Docente LOSE",
  "Administrative_LOSEP": "Administrativo LOSEP", 
  "Employee_CT": "Empleado Contrato",
  "Coordinator": "Coordinador"
};

const employeeTypeColors: Record<string, string> = {
  "Teacher_LOSE": "bg-green-100 text-green-800",
  "Administrative_LOSEP": "bg-blue-100 text-blue-800",
  "Employee_CT": "bg-orange-100 text-orange-800", 
  "Coordinator": "bg-purple-100 text-purple-800"
};

export default function EmployeesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { data: employees, isLoading, error } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
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
            <p className="text-red-600">Error al cargar los empleados. Intente nuevamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Empleados</h1>
          <p className="text-gray-600 mt-2">Administre la información laboral del personal universitario</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="button-add-employee"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserCog className="mr-2 h-4 w-4" />
              Agregar Empleado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <EmployeeForm 
              onSuccess={() => setIsFormOpen(false)}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {employees?.map((employee) => (
          <Card key={employee.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span data-testid={`text-employee-${employee.id}`}>
                  Empleado #{employee.id}
                </span>
                <Badge 
                  variant={employee.isActive ? "default" : "secondary"}
                  data-testid={`status-active-${employee.id}`}
                >
                  {employee.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </CardTitle>
              <CardDescription>
                <Badge 
                  className={employeeTypeColors[employee.type] || "bg-gray-100 text-gray-800"}
                  data-testid={`text-type-${employee.id}`}
                >
                  {employeeTypeLabels[employee.type] || employee.type}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {employee.departmentId && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Building2 className="h-4 w-4" />
                  <span data-testid={`text-department-${employee.id}`}>
                    Departamento: {employee.departmentId}
                  </span>
                </div>
              )}
              {employee.immediateBossId && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span data-testid={`text-boss-${employee.id}`}>
                    Jefe: #{employee.immediateBossId}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span data-testid={`text-hire-date-${employee.id}`}>
                  Ingreso: {new Date(employee.hireDate).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {employees && employees.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <UserCog className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay empleados registrados</h3>
            <p className="text-gray-600 mb-4">Comience agregando el primer empleado al sistema</p>
            <Button 
              data-testid="button-add-first-employee"
              onClick={() => setIsFormOpen(true)}
            >
              <UserCog className="mr-2 h-4 w-4" />
              Agregar Primer Empleado
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}