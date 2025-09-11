import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserCog, Building2, Calendar, Users, UserCheck, UserX, Briefcase, Search, Eye } from "lucide-react";
import EmployeeForm from "@/components/forms/EmployeeForm";
import { useState, useMemo } from "react";
import { VistaEmpleadosAPI, TiposReferenciaAPI } from "@/lib/api"; 

// Interfaz para los empleados de la vista
interface EmployeeView {
  employeeID: number;
  firstName: string;
  lastName: string;
  fullName: string;
  idCard: string;
  email: string;
  phone: string;
  birthDate: string;
  sex: string;
  gender: string | null;
  address: string;
  personIsActive: boolean;
  employeeType: number;
  employeeTypeName: string;
  hireDate: string;
  employeeIsActive: boolean;
  department: string;
  faculty: string;
  immediateBoss: string | null;
  yearsOfService: number;
  maritalStatusTypeID: number | null;
  maritalStatus: string | null;
  ethnicityTypeID: number | null;
  ethnicity: string | null;
  bloodTypeTypeID: number | null;
  bloodType: string | null;
  disabilityPercentage: number | null;
  conadisCard: string | null;
  countryName: string | null;
  provinceName: string | null;
  cantonName: string | null;
}

// Función para extraer el array de empleados
const extractEmployees = (response: any): EmployeeView[] => {
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (response?.results && Array.isArray(response.results)) return response.results;
  return [];
};

// Función para extraer el array de tipos de contrato
const extractContractTypes = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (response?.results && Array.isArray(response.results)) return response.results;
  return [];
};

// Función para mapear tipos de contrato
const mapContractTypes = (contractTypes: any[]): Record<number, string> => {
  const mapping: Record<number, string> = {};
  contractTypes.forEach(type => {
    mapping[type.typeId] = type.name;
  });
  return mapping;
};

// Colores para los badges de tipos de contrato
const contractTypeColors: Record<number, string> = {
  57: "bg-blue-100 text-blue-800 border-blue-200",
  58: "bg-green-100 text-green-800 border-green-200",
  59: "bg-purple-100 text-purple-800 border-purple-200"
};

export default function EmployeesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeView | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  
  // Obtener empleados desde la vista
  const { data: apiResponse, isLoading, error } = useQuery({
    queryKey: ['/api/v1/rh/vw/EmployeeComplete'],
    queryFn: VistaEmpleadosAPI.list,
  });
  
  // Obtener tipos de contrato
  const { data: contractTypesResponse } = useQuery({
    queryKey: ['/api/v1/rh/ref/types/category/CONTRACT_TYPE'],
    queryFn: () => TiposReferenciaAPI.byCategory("CONTRACT_TYPE"),
  });

  // Extraer empleados de la respuesta
  const employees = extractEmployees(apiResponse);
  
  // Extraer tipos de contrato de la respuesta
  const contractTypes = extractContractTypes(contractTypesResponse);
  
  // Mapear tipos de contrato
  const contractTypeMap = mapContractTypes(contractTypes);

  // Filtrar empleados basado en el término de búsqueda
  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return employees;
    
    return employees.filter(employee => 
      employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.idCard.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  // Calcular estadísticas
  const employeeStats = {
    total: employees.length,
    active: employees.filter(emp => emp.employeeIsActive).length,
    inactive: employees.filter(emp => !emp.employeeIsActive).length,
    byContractType: contractTypes.reduce((acc: Record<number, number>, type: any) => {
      const typeId = Number(type.typeId);
      acc[typeId] = employees.filter(emp => 
        emp.employeeType !== null && 
        emp.employeeType !== undefined && 
        Number(emp.employeeType) === typeId
      ).length;
      return acc;
    }, {})
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-5 w-80 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-44 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        {/* Loading para tarjetas de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse border-0 shadow-md">
              <CardHeader className="space-y-2 pb-3">
                <div className="h-5 w-32 bg-gray-200 rounded"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Loading para tabla de empleados */}
        <div className="bg-white rounded-lg shadow-md p-4 animate-pulse">
          <div className="h-10 w-full bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 w-full bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50 shadow-md">
          <CardContent className="pt-6">
            <p className="text-red-600 font-medium">Error al cargar los empleados. Intente nuevamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Empleados</h1>
          <p className="text-gray-600 mt-2">Administre la información laboral del personal universitario</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="button-add-employee"
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <UserCog className="h-5 w-5" />
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

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-blue-800">Total Empleados</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{employeeStats.total}</div>
            <p className="text-xs text-blue-600 mt-1">Total de empleados registrados</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md bg-gradient-to-r from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-green-800">Empleados Activos</CardTitle>
            <UserCheck className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{employeeStats.active}</div>
            <p className="text-xs text-green-600 mt-1">Empleados actualmente activos</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md bg-gradient-to-r from-red-50 to-red-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-red-800">Empleados Inactivos</CardTitle>
            <UserX className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900">{employeeStats.inactive}</div>
            <p className="text-xs text-red-600 mt-1">Empleados actualmente inactivos</p>
          </CardContent>
        </Card>
        
        {/* Tarjeta para el tipo de contrato más común o primera tarjeta especial */}
        {/* {contractTypes.length > 0 && (
          <Card className="border-0 shadow-md bg-gradient-to-r from-purple-50 to-purple-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-purple-800">
                {contractTypes[0]?.name || "Tipo de Contrato"}
              </CardTitle>
              <Briefcase className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">
                {employeeStats.byContractType[contractTypes[0]?.typeId] || 0}
              </div>
              <p className="text-xs text-purple-600 mt-1">Empleados con este tipo de contrato</p>
            </CardContent>
          </Card>
        )} */}
      </div>

      {/* Tarjetas para todos los tipos de contrato */}
      {contractTypes.length > 0 && (
        <>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Distribución por Tipo de Contrato</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {contractTypes.map((contractType: any) => (
              <Card key={contractType.typeId} className="border-0 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium">{contractType.name}</CardTitle>
                  <Briefcase className="h-5 w-5 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {employeeStats.byContractType[contractType.typeId] || 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Empleados con este tipo de contrato</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Barra de búsqueda y controles */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Lista de Empleados</h2>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, cédula o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full md:w-64"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              Tabla
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              Grid
            </Button>
          </div>
        </div>
      </div>

      {/* Tabla de empleados */}
      {viewMode === "table" ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre Completo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cédula
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Empleado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Departamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.employeeID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.fullName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {employee.idCard || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {employee.email || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {employee.employeeTypeName || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {employee.department || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        className={employee.employeeIsActive 
                          ? "bg-green-100 text-green-800 border-green-200" 
                          : "bg-red-100 text-red-800 border-red-200"
                        }
                      >
                        {employee.employeeIsActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEmployee(employee)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver detalle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <UserCog className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? "No se encontraron empleados" : "No hay empleados registrados"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? "Intente con otro término de búsqueda" : "Comience agregando el primer empleado al sistema"}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setIsFormOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  Agregar Primer Empleado
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Vista en grid (opcional) */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((employee) => (
            <Card key={employee.employeeID} className="border-0 shadow-md hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">
                    {employee.fullName}
                  </span>
                  <Badge 
                    variant={employee.employeeIsActive ? "default" : "secondary"}
                    className={employee.employeeIsActive 
                      ? "bg-green-100 text-green-800 border-green-200" 
                      : "bg-red-100 text-red-800 border-red-200"
                    }
                  >
                    {employee.employeeIsActive ? "Activo" : "Inactivo"}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {employee.idCard && (
                    <div className="text-sm">Cédula: {employee.idCard}</div>
                  )}
                  {employee.employeeTypeName && (
                    <div className="text-sm mt-1">Tipo: {employee.employeeTypeName}</div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {employee.email && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span className="truncate">Email: {employee.email}</span>
                  </div>
                )}
                {employee.department && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      Departamento: {employee.department}
                    </span>
                  </div>
                )}
                {employee.faculty && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>Facultad: {employee.faculty}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Ingreso: {new Date(employee.hireDate).toLocaleDateString()}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => setSelectedEmployee(employee)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver detalle
                </Button>
              </CardContent>
            </Card>
          ))}
          
          {filteredEmployees.length === 0 && (
            <Card className="text-center py-12 border-0 shadow-md col-span-full">
              <CardContent>
                <UserCog className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm ? "No se encontraron empleados" : "No hay empleados registrados"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? "Intente con otro término de búsqueda" : "Comience agregando el primer empleado al sistema"}
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => setIsFormOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    Agregar Primer Empleado
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Diálogo para ver detalles del empleado */}
      <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedEmployee && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-blue-100 p-3 rounded-full">
                  <UserCog className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedEmployee.fullName}
                  </h2>
                  <p className="text-gray-600">
                    {selectedEmployee.idCard && `Cédula: ${selectedEmployee.idCard}`}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Información Laboral</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado:</span>
                      <Badge 
                        className={selectedEmployee.employeeIsActive 
                          ? "bg-green-100 text-green-800 border-green-200" 
                          : "bg-red-100 text-red-800 border-red-200"
                        }
                      >
                        {selectedEmployee.employeeIsActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    
                    {selectedEmployee.employeeTypeName && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo de empleado:</span>
                        <span className="font-medium">{selectedEmployee.employeeTypeName}</span>
                      </div>
                    )}
                    
                    {selectedEmployee.department && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Departamento:</span>
                        <span className="font-medium">{selectedEmployee.department}</span>
                      </div>
                    )}
                    
                    {selectedEmployee.faculty && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Facultad:</span>
                        <span className="font-medium">{selectedEmployee.faculty}</span>
                      </div>
                    )}
                    
                    {selectedEmployee.immediateBoss && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Jefe inmediato:</span>
                        <span className="font-medium">{selectedEmployee.immediateBoss}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha de ingreso:</span>
                      <span className="font-medium">{new Date(selectedEmployee.hireDate).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Años de servicio:</span>
                      <span className="font-medium">{selectedEmployee.yearsOfService}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Información Personal</h3>
                  <div className="space-y-3">
                    {selectedEmployee.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{selectedEmployee.email}</span>
                      </div>
                    )}
                    
                    {selectedEmployee.phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Teléfono:</span>
                        <span className="font-medium">{selectedEmployee.phone}</span>
                      </div>
                    )}
                    
                    {selectedEmployee.address && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dirección:</span>
                        <span className="font-medium text-right max-w-xs">{selectedEmployee.address}</span>
                      </div>
                    )}
                    
                    {selectedEmployee.birthDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fecha de nacimiento:</span>
                        <span className="font-medium">{new Date(selectedEmployee.birthDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    {selectedEmployee.sex && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sexo:</span>
                        <span className="font-medium">{selectedEmployee.sex === 'M' ? 'Masculino' : 'Femenino'}</span>
                      </div>
                    )}
                    
                    {selectedEmployee.maritalStatus && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estado civil:</span>
                        <span className="font-medium">{selectedEmployee.maritalStatus}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Información adicional */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Información Adicional</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedEmployee.ethnicity && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Etnia:</span>
                      <span className="font-medium">{selectedEmployee.ethnicity}</span>
                    </div>
                  )}
                  
                  {selectedEmployee.bloodType && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo de sangre:</span>
                      <span className="font-medium">{selectedEmployee.bloodType}</span>
                    </div>
                  )}
                  
                  {selectedEmployee.disabilityPercentage !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Porcentaje de discapacidad:</span>
                      <span className="font-medium">{selectedEmployee.disabilityPercentage}%</span>
                    </div>
                  )}
                  
                  {selectedEmployee.conadisCard && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Carnet CONADIS:</span>
                      <span className="font-medium">{selectedEmployee.conadisCard}</span>
                    </div>
                  )}
                  
                  {selectedEmployee.countryName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">País:</span>
                      <span className="font-medium">{selectedEmployee.countryName}</span>
                    </div>
                  )}
                  
                  {selectedEmployee.provinceName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Provincia:</span>
                      <span className="font-medium">{selectedEmployee.provinceName}</span>
                    </div>
                  )}
                  
                  {selectedEmployee.cantonName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cantón:</span>
                      <span className="font-medium">{selectedEmployee.cantonName}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setSelectedEmployee(null)}>
                  Cerrar
                </Button>
                <Button 
                  onClick={() => {
                    setSelectedEmployee(null);
                    setIsFormOpen(true);
                  }}
                >
                  Editar información
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}