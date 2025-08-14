import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { insertPayrollSchema, type InsertPayroll, type Employee, type Person, type Contract } from "@shared/schema";
import { DollarSign, Save, X, Calculator, Users } from "lucide-react";
import { useState } from "react";

interface PayrollFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function PayrollForm({ onSuccess, onCancel }: PayrollFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const { data: people } = useQuery<Person[]>({
    queryKey: ['/api/people'],
  });

  const { data: contracts } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
  });

  const form = useForm<InsertPayroll>({
    resolver: zodResolver(insertPayrollSchema),
    defaultValues: {
      employeeId: 0,
      period: currentPeriod,
      baseSalary: "",
      status: "Pending",
      paymentDate: null,
      bankAccount: null
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPayroll) => {
      const response = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Error al procesar nómina");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: "Nómina procesada exitosamente" });
      onSuccess?.();
    },
    onError: () => {
      toast({ title: "Error al procesar nómina", variant: "destructive" });
    }
  });

  const bulkProcessMutation = useMutation({
    mutationFn: async (employeeIds: number[]) => {
      const promises = employeeIds.map(async (employeeId) => {
        const contract = contracts?.find(c => c.employeeId === employeeId);
        const data: InsertPayroll = {
          employeeId,
          period: currentPeriod,
          baseSalary: contract?.baseSalary || "0.00",
          status: "Pending",
          paymentDate: null,
          bankAccount: null
        };
        
        const response = await fetch("/api/payroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`Error al procesar nómina del empleado ${employeeId}`);
        return response.json();
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: `Nómina procesada para ${selectedEmployees.length} empleados` });
      setSelectedEmployees([]);
      onSuccess?.();
    },
    onError: () => {
      toast({ title: "Error al procesar nómina masiva", variant: "destructive" });
    }
  });

  const onSubmit = (data: InsertPayroll) => {
    createMutation.mutate(data);
  };

  const handleEmployeeSelection = (employeeId: number, checked: boolean) => {
    if (checked) {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    } else {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    }
  };

  const handleBulkProcess = () => {
    if (selectedEmployees.length > 0) {
      bulkProcessMutation.mutate(selectedEmployees);
    }
  };

  const isLoading = createMutation.isPending || bulkProcessMutation.isPending;

  const calculateTotal = () => {
    return selectedEmployees.reduce((total, employeeId) => {
      const contract = contracts?.find(c => c.employeeId === employeeId);
      return total + parseFloat(contract?.baseSalary || "0");
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Procesamiento Masivo */}
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Procesamiento Masivo de Nómina</span>
          </CardTitle>
          <CardDescription>
            Seleccione empleados para procesar su nómina del período {currentPeriod}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Input
                type="month"
                value={currentPeriod}
                onChange={(e) => {
                  setCurrentPeriod(e.target.value);
                  form.setValue("period", e.target.value);
                }}
                className="w-auto"
                data-testid="input-period"
              />
              
              {selectedEmployees.length > 0 && (
                <div className="flex items-center space-x-4">
                  <Badge variant="outline" className="text-sm">
                    {selectedEmployees.length} empleados seleccionados
                  </Badge>
                  <div className="text-lg font-bold text-green-600">
                    Total: ${calculateTotal().toLocaleString()}
                  </div>
                  <Button 
                    onClick={handleBulkProcess}
                    disabled={isLoading}
                    data-testid="button-bulk-process"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Procesar Seleccionados
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {employees?.map((employee) => {
                const person = people?.find(p => p.id === employee.id);
                const contract = contracts?.find(c => c.employeeId === employee.id);
                const isSelected = selectedEmployees.includes(employee.id);
                
                return (
                  <Card 
                    key={employee.id} 
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleEmployeeSelection(employee.id, !isSelected)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">
                          {person ? `${person.firstName} ${person.lastName}` : `Empleado #${employee.id}`}
                        </h4>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleEmployeeSelection(employee.id, e.target.checked)}
                          className="rounded"
                          data-testid={`checkbox-employee-${employee.id}`}
                        />
                      </div>
                      {contract && (
                        <div className="text-sm text-green-600 font-medium">
                          ${parseFloat(contract.baseSalary).toLocaleString()}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {employee.type}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario Individual */}
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Procesar Nómina Individual</span>
          </CardTitle>
          <CardDescription>
            Complete los datos para procesar la nómina de un empleado específico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empleado *</FormLabel>
                      <Select onValueChange={(value) => {
                        const employeeId = parseInt(value);
                        field.onChange(employeeId);
                        // Auto-llenar salario base del contrato
                        const contract = contracts?.find(c => c.employeeId === employeeId);
                        if (contract) {
                          form.setValue("baseSalary", contract.baseSalary);
                        }
                      }} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-employee">
                            <SelectValue placeholder="Seleccione un empleado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees?.map((employee) => {
                            const person = people?.find(p => p.id === employee.id);
                            return (
                              <SelectItem key={employee.id} value={employee.id.toString()}>
                                {person ? `${person.firstName} ${person.lastName}` : `Empleado #${employee.id}`}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Período *</FormLabel>
                      <FormControl>
                        <Input 
                          type="month"
                          data-testid="input-period-individual"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="baseSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salario Base *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          data-testid="input-baseSalary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Seleccione el estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pending">Pendiente</SelectItem>
                          <SelectItem value="Paid">Pagado</SelectItem>
                          <SelectItem value="Reconciled">Conciliado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Pago</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          data-testid="input-paymentDate"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bankAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuenta Bancaria</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Número de cuenta"
                          data-testid="input-bankAccount"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1"
                  data-testid="button-save-payroll"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Procesando..." : "Procesar Nómina"}
                </Button>
                {onCancel && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onCancel}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}