import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FileText, User, Calendar, DollarSign } from "lucide-react";
import type { Contract } from "@shared/schema";
import ContractForm from "@/components/forms/ContractForm";
import { useState } from "react";

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
  const { data: contracts, isLoading, error } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
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
            <p className="text-red-600">Error al cargar los contratos. Intente nuevamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
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
              <FileText className="mr-2 h-4 w-4" />
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {contracts?.map((contract) => (
          <Card key={contract.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span data-testid={`text-contract-${contract.id}`}>
                    Contrato #{contract.id}
                  </span>
                </div>
              </CardTitle>
              <CardDescription>
                <Badge 
                  className={contractTypeColors[contract.contractType] || "bg-gray-100 text-gray-800"}
                  data-testid={`text-type-${contract.id}`}
                >
                  {contractTypeLabels[contract.contractType] || contract.contractType}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span data-testid={`text-employee-${contract.id}`}>
                  Empleado: #{contract.employeeId}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span data-testid={`text-start-date-${contract.id}`}>
                  Inicio: {new Date(contract.startDate).toLocaleDateString()}
                </span>
              </div>
              
              {contract.endDate && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span data-testid={`text-end-date-${contract.id}`}>
                    Fin: {new Date(contract.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-sm font-medium text-green-600">
                <DollarSign className="h-4 w-4" />
                <span data-testid={`text-salary-${contract.id}`}>
                  ${parseFloat(contract.baseSalary).toLocaleString()}
                </span>
              </div>

              <div className="pt-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  data-testid={`button-view-contract-${contract.id}`}
                >
                  Ver Detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {contracts && contracts.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay contratos registrados</h3>
            <p className="text-gray-600 mb-4">Comience agregando el primer contrato al sistema</p>
            <Button data-testid="button-add-first-contract">
              <FileText className="mr-2 h-4 w-4" />
              Crear Primer Contrato
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}