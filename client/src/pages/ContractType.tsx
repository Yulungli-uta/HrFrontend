import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus, Search, Clock, Calendar, DollarSign, BookOpen, Eye } from "lucide-react";
import { useState } from "react";
import { ContratosAPI, type ApiResponse } from "@/lib/api";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Tipo basado en tu JSON
interface ContractType {
  contractTypeId: number;
  personalContractTypeId: number;
  name: string;
  description?: string;
  status: string;
  contractText: string;
  contractCode: string;
}

// Tipo transformado para la UI
interface UIContractType {
  contractTypeId: number;
  name: string;
  code: string;
  description?: string;
  durationDays?: number;
  isRenewable: boolean;
  requiresProbation: boolean;
  probationDays?: number;
  isActive: boolean;
  category?: string;
  maxSalary?: number;
  minSalary?: number;
  legalRequirements?: string;
  // Campos originales
  contractText?: string;
  personalContractTypeId?: number;
  status?: string;
}

export default function ContractTypesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedContractType, setSelectedContractType] = useState<UIContractType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: apiResponse, isLoading, error } = useQuery<ApiResponse<ContractType[]>>({
    queryKey: ['/api/v1/rh/cv/contract-type'],
    queryFn: () => ContratosAPI.list(),
  });

  // Función para determinar la categoría basada en el código
  const getCategoryFromCode = (code: string): string => {
    const categoryMap: { [key: string]: string } = {
      'DTH': 'Docente',
      'Administrativo': 'Administrativo',
      'Adendum': 'Adendum'
    };
    return categoryMap[code] || 'General';
  };

  // Función para determinar si es renovable basado en el tipo de contrato
  const getIsRenewable = (contract: ContractType): boolean => {
    // Basado en tu JSON, los contratos parecen ser renovables según el texto
    return contract.contractText.includes('renovado automáticamente');
  };

  // Función para determinar la duración en días
  const getDurationDays = (contract: ContractType): number => {
    // Ejemplo: calcular duración basada en el tipo
    if (contract.contractCode === 'DTH') return 365; // 1 año para docentes
    if (contract.contractCode === 'Administrativo') return 180; // 6 meses administrativos
    return 365; // Por defecto 1 año
  };

  // Transformar los datos del API al formato que espera la UI
  const contractTypes: UIContractType[] = apiResponse?.status === 'success' 
    ? apiResponse.data.map(contract => ({
        contractTypeId: contract.contractTypeId,
        name: contract.name,
        code: contract.contractCode,
        description: contract.description,
        durationDays: getDurationDays(contract),
        isRenewable: getIsRenewable(contract),
        requiresProbation: contract.contractCode === 'Administrativo', // Solo administrativos requieren prueba
        probationDays: contract.contractCode === 'Administrativo' ? 90 : undefined,
        isActive: contract.status === "1",
        category: getCategoryFromCode(contract.contractCode),
        // Campos de salario (valores ejemplo - ajusta según tu lógica de negocio)
        minSalary: contract.contractCode === 'DTH' ? 1500 : 800,
        maxSalary: contract.contractCode === 'DTH' ? 3000 : 2000,
        legalRequirements: "Cumplir con la Ley Orgánica de Educación Superior y Reglamento Interno",
        // Campos originales
        contractText: contract.contractText,
        personalContractTypeId: contract.personalContractTypeId,
        status: contract.status
      }))
    : [];

  // Filtrar tipos de contrato
  const filteredContractTypes = contractTypes.filter(contractType =>
    contractType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractType.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractType.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractType.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Función para manejar clic en ver detalles
  const handleViewDetails = (contractType: UIContractType) => {
    setSelectedContractType(contractType);
    setIsDetailOpen(true);
  };

  // Estadísticas
  const totalContractTypes = contractTypes.length;
  const activeContractTypes = contractTypes.filter(ct => ct.isActive).length;
  const inactiveContractTypes = contractTypes.filter(ct => !ct.isActive).length;
  const renewableContractTypes = contractTypes.filter(ct => ct.isRenewable).length;
  const probationContractTypes = contractTypes.filter(ct => ct.requiresProbation).length;

  // Calcular duración promedio
  const avgDuration = contractTypes.length > 0 
    ? Math.round(contractTypes.reduce((sum, ct) => sum + (ct.durationDays || 0), 0) / contractTypes.length)
    : 0;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex space-x-4 animate-pulse">
              <div className="h-12 flex-1 bg-gray-200 rounded" />
              <div className="h-12 flex-1 bg-gray-200 rounded" />
              <div className="h-12 flex-1 bg-gray-200 rounded" />
              <div className="h-12 flex-1 bg-gray-200 rounded" />
              <div className="h-12 w-24 bg-gray-200 rounded" />
            </div>
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
            <p className="text-red-600">Error al cargar los tipos de contrato. Intente nuevamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (apiResponse?.status === 'error') {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Error al cargar los tipos de contrato: {apiResponse.error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
            Gestión de Tipos de Contrato
          </h1>
          <p className="text-gray-600 mt-2 text-sm lg:text-base">
            Administre los diferentes tipos de contrato laboral del sistema
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 w-full lg:w-auto"
              data-testid="button-add-contract-type"
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Tipo de Contrato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Formulario de Tipo de Contrato</h3>
              <p className="text-gray-600">Formulario para crear/editar tipos de contrato (pendiente de implementar)</p>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsFormOpen(false)}>
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sección de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
              <span className="flex items-center">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600 mr-2" />
                Total
              </span>
              <Badge variant="secondary" className="bg-blue-200 text-blue-800 text-xs lg:text-sm">
                {totalContractTypes}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-gray-600">
              Tipos registrados
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
              <span className="flex items-center">
                <div className="h-4 w-4 lg:h-5 lg:w-5 bg-green-100 rounded-full flex items-center justify-center mr-2">
                  <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                </div>
                Activos
              </span>
              <Badge variant="secondary" className="bg-green-200 text-green-800 text-xs lg:text-sm">
                {activeContractTypes}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-gray-600">
              {totalContractTypes > 0 ? ((activeContractTypes / totalContractTypes) * 100).toFixed(1) : 0}% del total
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-orange-600 mr-2" />
                Renovables
              </span>
              <Badge variant="secondary" className="bg-orange-200 text-orange-800 text-xs lg:text-sm">
                {renewableContractTypes}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-gray-600">
              {totalContractTypes > 0 ? ((renewableContractTypes / totalContractTypes) * 100).toFixed(1) : 0}% del total
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600 mr-2" />
                Con Período Prueba
              </span>
              <Badge variant="secondary" className="bg-purple-200 text-purple-800 text-xs lg:text-sm">
                {probationContractTypes}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-gray-600">
              Duración avg: {avgDuration} días
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-red-50 to-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
              <span className="flex items-center">
                <BookOpen className="h-4 w-4 lg:h-5 lg:w-5 text-red-600 mr-2" />
                Legales
              </span>
              <Badge variant="secondary" className="bg-red-200 text-red-800 text-xs lg:text-sm">
                {contractTypes.filter(ct => ct.legalRequirements).length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-gray-600">
              Con requisitos legales
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar tipo de contrato por nombre, código, descripción o categoría..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de tipos de contrato */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Tipos de Contrato</CardTitle>
          <CardDescription>
            {filteredContractTypes.length} de {totalContractTypes} tipos mostrados
            {searchTerm && ` - Filtrado por: "${searchTerm}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Tipo de Contrato</TableHead>
                  <TableHead className="min-w-[120px]">Código</TableHead>
                  <TableHead className="min-w-[150px]">Categoría</TableHead>
                  <TableHead className="min-w-[120px]">Duración</TableHead>
                  <TableHead className="min-w-[120px]">Renovable</TableHead>
                  <TableHead className="min-w-[100px]">Estado</TableHead>
                  <TableHead className="text-right min-w-[140px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContractTypes.map((contractType) => (
                  <TableRow key={contractType.contractTypeId} className="group">
                    <TableCell>
                      <div>
                        <div 
                          className="font-medium"
                          data-testid={`text-contract-type-name-${contractType.contractTypeId}`}
                        >
                          {contractType.name}
                        </div>
                        {contractType.description && (
                          <div className="text-sm text-gray-500 truncate max-w-[300px]">
                            {contractType.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell 
                      className="font-mono font-medium" 
                      data-testid={`text-contract-type-code-${contractType.contractTypeId}`}
                    >
                      {contractType.code}
                    </TableCell>
                    <TableCell>
                      {contractType.category ? (
                        <Badge variant="outline" className="bg-gray-50">
                          {contractType.category}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span>
                          {contractType.durationDays 
                            ? `${contractType.durationDays} días` 
                            : "Indefinido"
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={
                          contractType.isRenewable 
                            ? "bg-green-50 text-green-700 border-green-200" 
                            : "bg-gray-50 text-gray-700 border-gray-200"
                        }
                      >
                        {contractType.isRenewable ? "Sí" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={contractType.isActive ? "default" : "secondary"}
                        className={
                          contractType.isActive 
                            ? "bg-green-100 text-green-800 hover:bg-green-100" 
                            : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                        }
                        data-testid={`status-active-${contractType.contractTypeId}`}
                      >
                        {contractType.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(contractType)}
                        data-testid={`button-view-contract-type-${contractType.contractTypeId}`}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Ver Detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredContractTypes.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? "No se encontraron tipos de contrato" : "No hay tipos de contrato registrados"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? "Intente con otros términos de búsqueda" 
                  : "Comience agregando el primer tipo de contrato al sistema"
                }
              </p>
              {!searchTerm && (
                <Button 
                  data-testid="button-add-first-contract-type"
                  onClick={() => setIsFormOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Primer Tipo de Contrato
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de detalles del tipo de contrato */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedContractType && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900">{selectedContractType.name}</h2>
                  <p className="text-gray-600">Detalles del tipo de contrato</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base lg:text-lg">Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Código</label>
                      <p className="font-mono font-medium">{selectedContractType.code}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Categoría</label>
                      <p className="font-medium">{selectedContractType.category || "No especificada"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Descripción</label>
                      <p className="font-medium">{selectedContractType.description || "No especificada"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">ID Original</label>
                      <p className="font-medium">{selectedContractType.contractTypeId}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base lg:text-lg">Características</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Duración</label>
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {selectedContractType.durationDays 
                          ? `${selectedContractType.durationDays} días` 
                          : "Contrato indefinido"
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Renovable</label>
                      <Badge 
                        className={
                          selectedContractType.isRenewable 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {selectedContractType.isRenewable ? "Sí" : "No"}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Período de Prueba</label>
                      <p className="font-medium">
                        {selectedContractType.requiresProbation 
                          ? `${selectedContractType.probationDays || 30} días` 
                          : "No requiere"
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Estado</label>
                      <Badge 
                        className={
                          selectedContractType.isActive 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {selectedContractType.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {(selectedContractType.minSalary || selectedContractType.maxSalary) && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base lg:text-lg flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Rango Salarial
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Salario Mínimo</label>
                          <p className="font-medium">
                            {selectedContractType.minSalary 
                              ? `$${selectedContractType.minSalary.toLocaleString()}` 
                              : "No definido"
                            }
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Salario Máximo</label>
                          <p className="font-medium">
                            {selectedContractType.maxSalary 
                              ? `$${selectedContractType.maxSalary.toLocaleString()}` 
                              : "No definido"
                            }
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedContractType.legalRequirements && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base lg:text-lg flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Requisitos Legales
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700">{selectedContractType.legalRequirements}</p>
                    </CardContent>
                  </Card>
                )}

                {selectedContractType.contractText && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base lg:text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Texto del Contrato
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-60 overflow-y-auto p-3 bg-gray-50 rounded-md">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                          {selectedContractType.contractText.substring(0, 500)}...
                        </pre>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Mostrando primeros 500 caracteres de {selectedContractType.contractText.length} totales
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDetailOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cerrar
                </Button>
                <Button 
                  onClick={() => {
                    setIsDetailOpen(false);
                    // Aquí podrías implementar la edición
                  }}
                  className="w-full sm:w-auto"
                >
                  Editar Tipo de Contrato
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}