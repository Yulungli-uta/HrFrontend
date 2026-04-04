import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DollarSign, User, Calendar, CreditCard, Plus } from "lucide-react";
import type { Payroll } from "@/shared/schema";
import PayrollForm from "@/components/forms/PayrollForm";
import { useState } from "react";
import { NominaAPI, type ApiResponse } from "@/lib/api"; // Importamos desde lib/api

const statusLabels: Record<string, string> = {
  "Pending": "Pendiente",
  "Paid": "Pagado",
  "Reconciled": "Conciliado"
};

const statusColors: Record<string, string> = {
  "Pending": "bg-warning/15 text-warning",
  "Paid": "bg-success/15 text-success",
  "Reconciled": "bg-primary/15 text-primary"
};

export default function PayrollPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Usamos el servicio específico de nómina
  const { data: apiResponse, isLoading, error } = useQuery<ApiResponse<Payroll[]>>({
    queryKey: ['/api/v1/rh/payroll'],
    queryFn: () => NominaAPI.list(), // Usamos el servicio de nómina
  });

  // Extraemos las nóminas del formato de respuesta de la API
  const payrolls = apiResponse?.status === 'success' ? apiResponse.data : [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-6 w-3/4 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-2/3 bg-muted rounded" />
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
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">Error al cargar la nómina. Intente nuevamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Manejar errores de la API (cuando status es 'error')
  if (apiResponse?.status === 'error') {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">Error al cargar la nómina: {apiResponse.error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Nómina</h1>
          <p className="text-muted-foreground mt-2">Administre los pagos y salarios del personal universitario</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="button-add-payroll"
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Procesar Nómina
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogTitle>Procesar Nueva Nómina</DialogTitle>
            <DialogDescription>
              Complete la información para procesar una nueva nómina
            </DialogDescription>
            <PayrollForm 
              onSuccess={() => setIsFormOpen(false)}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {payrolls.map((payroll) => (
          <Card key={payroll.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-success" />
                  <span data-testid={`text-payroll-${payroll.id}`}>
                    Nómina #{payroll.id}
                  </span>
                </div>
                <Badge 
                  className={statusColors[payroll.status] || "bg-muted text-foreground"}
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
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span data-testid={`text-employee-${payroll.id}`}>
                  Empleado: #{payroll.employeeId}
                </span>
              </div>
              
              <div className="bg-success/10 p-3 rounded-lg">
                <div className="flex items-center space-x-2 text-lg font-bold text-success">
                  <DollarSign className="h-5 w-5" />
                  <span data-testid={`text-salary-${payroll.id}`}>
                    ${parseFloat(payroll.baseSalary).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-success mt-1">Salario base</p>
              </div>
              
              {payroll.paymentDate && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span data-testid={`text-payment-date-${payroll.id}`}>
                    Pagado: {new Date(payroll.paymentDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {payroll.bankAccount && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
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

      {payrolls.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <DollarSign className="mx-auto h-12 w-12 text-muted-foreground/70 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay registros de nómina</h3>
            <p className="text-muted-foreground mb-4">Comience procesando la primera nómina</p>
            <Button 
              data-testid="button-add-first-payroll"
              onClick={() => setIsFormOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Procesar Primera Nómina
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}