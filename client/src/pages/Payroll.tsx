import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, User, Calendar, CreditCard, Plus } from "lucide-react";
import type { Payroll } from "@shared/schema";

const statusLabels: Record<string, string> = {
  "Pending": "Pendiente",
  "Paid": "Pagado",
  "Reconciled": "Conciliado"
};

const statusColors: Record<string, string> = {
  "Pending": "bg-yellow-100 text-yellow-800",
  "Paid": "bg-green-100 text-green-800",
  "Reconciled": "bg-blue-100 text-blue-800"
};

export default function PayrollPage() {
  const { data: payrolls, isLoading, error } = useQuery<Payroll[]>({
    queryKey: ['/api/payroll'],
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
            <p className="text-red-600">Error al cargar la nómina. Intente nuevamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Nómina</h1>
          <p className="text-gray-600 mt-2">Administre los pagos y salarios del personal universitario</p>
        </div>
        <Button 
          data-testid="button-add-payroll"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Procesar Nómina
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {payrolls?.map((payroll) => (
          <Card key={payroll.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span data-testid={`text-payroll-${payroll.id}`}>
                    Nómina #{payroll.id}
                  </span>
                </div>
                <Badge 
                  className={statusColors[payroll.status] || "bg-gray-100 text-gray-800"}
                  data-testid={`status-${payroll.id}`}
                >
                  {statusLabels[payroll.status] || payroll.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                <span data-testid={`text-period-${payroll.id}`}>
                  Período: {payroll.period}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span data-testid={`text-employee-${payroll.id}`}>
                  Empleado: #{payroll.employeeId}
                </span>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 text-lg font-bold text-green-700">
                  <DollarSign className="h-5 w-5" />
                  <span data-testid={`text-salary-${payroll.id}`}>
                    ${parseFloat(payroll.baseSalary).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-green-600 mt-1">Salario base</p>
              </div>
              
              {payroll.paymentDate && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span data-testid={`text-payment-date-${payroll.id}`}>
                    Pagado: {new Date(payroll.paymentDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {payroll.bankAccount && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <CreditCard className="h-4 w-4" />
                  <span data-testid={`text-bank-account-${payroll.id}`}>
                    Cuenta: {payroll.bankAccount}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  data-testid={`button-view-payroll-${payroll.id}`}
                >
                  Ver Detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {payrolls && payrolls.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay registros de nómina</h3>
            <p className="text-gray-600 mb-4">Comience procesando la primera nómina</p>
            <Button data-testid="button-add-first-payroll">
              <Plus className="mr-2 h-4 w-4" />
              Procesar Primera Nómina
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}