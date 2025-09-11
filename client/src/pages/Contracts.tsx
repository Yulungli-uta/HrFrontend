import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FileText, User, Calendar, DollarSign, Search, Plus } from "lucide-react";
import type { Contract } from "@shared/schema";
import ContractForm from "@/components/forms/ContractForm";
import { useState, useMemo } from "react";
import { ContratosAPI, type ApiResponse } from "@/lib/api";

const contractTypeLabels: Record<string, string> = {
  "Indefinido": "Indefinido",
  "Ocasional": "Ocasional",
  "Contrato": "Por Contrato",
  "Servicios": "Servicios Profesionales"
};

const contractTypeColors: Record<string, string> = {
  "Indefinido": "bg-green-100 text-green-800",
  "Ocasional": "bg-yellow-100 text-yellow-800",
  "Contrato": "bg-blue-100 text-blue-800",
  "Servicios": "bg-purple-100 text-purple-800"
};

export default function ContractsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modificar useQuery para usar el servicio de API
  const { data: contractsResponse, isLoading, error } = useQuery<ApiResponse<Contract[]>>({
    queryKey: ['contracts'],
    queryFn: () => ContratosAPI.list()
  });

  // Extraer datos de la respuesta
  const contracts = contractsResponse?.status === 'success' ? contractsResponse.data : [];

  // Filtrar contratos basado en el término de búsqueda
  const filteredContracts = useMemo(() => {
    if (!searchTerm) return contracts;
    
    return contracts.filter(contract => 
      contract.id.toString().includes(searchTerm) ||
      contract.employeeId.toString().includes(searchTerm) ||
      contract.contractType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.baseSalary.toString().includes(searchTerm) ||
      new Date(contract.startDate).toLocaleDateString().includes(searchTerm) ||
      (contract.endDate && new Date(contract.endDate).toLocaleDateString().includes(searchTerm))
    );
  }, [contracts, searchTerm]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></th>
                <th className="p-3 text-left"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></th>
                <th className="p-3 text-left"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></th>
                <th className="p-3 text-left"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></th>
                <th className="p-3 text-left"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></th>
                <th className="p-3 text-left"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-3"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="p-3"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="p-3"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="p-3"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="p-3"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="p-3"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error || contractsResponse?.status === 'error') {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">
              Error al cargar los contratos: {error?.message || contractsResponse?.error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Contratos</h1>
          <p className="text-gray-600 mt-2">Administre los contratos laborales del personal universitario</p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="button-add-contract"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Contrato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <ContractForm 
              onSuccess={() => setIsFormOpen(false)}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar contratos por ID, empleado, tipo o salario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {filteredContracts.length} {filteredContracts.length === 1 ? 'contrato encontrado' : 'contratos encontrados'}
        </p>
      </div>

      {/* Tabla de contratos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Contrato</th>
                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Empleado</th>
                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Inicio</th>
                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Fin</th>
                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salario Base</th>
                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium">
                    #{contract.id}
                  </td>
                  <td className="p-3">
                    <Badge 
                      className={contractTypeColors[contract.contractType] || "bg-gray-100 text-gray-800"}
                      data-testid={`text-type-${contract.id}`}
                    >
                      {contractTypeLabels[contract.contractType] || contract.contractType}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1 text-gray-500" />
                      <span data-testid={`text-employee-${contract.id}`}>
                        #{contract.employeeId}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                      <span data-testid={`text-start-date-${contract.id}`}>
                        {new Date(contract.startDate).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    {contract.endDate ? (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                        <span data-testid={`text-end-date-${contract.id}`}>
                          {new Date(contract.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">No definida</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center font-medium text-green-600">
                      <DollarSign className="h-4 w-4 mr-1" />
                      <span data-testid={`text-salary-${contract.id}`}>
                        ${parseFloat(contract.baseSalary).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      data-testid={`button-view-contract-${contract.id}`}
                    >
                      Ver Detalles
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredContracts.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? "No se encontraron contratos" : "No hay contratos registrados"}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? "Intente con otros términos de búsqueda" 
                : "Comience agregando el primer contrato al sistema"}
            </p>
            {!searchTerm && (
              <Button data-testid="button-add-first-contract">
                <Plus className="mr-2 h-4 w-4" />
                Crear Primer Contrato
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}