import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { Contract, Employee } from "@/shared/schema";
import { FileText, Save, X, Calendar, DollarSign } from "lucide-react";
import { ContratosAPI, EmpleadosAPI, PersonasAPI, type ApiResponse } from "@/lib/api";
import type { PersonDto } from "@/lib/api/services/employees";

interface ContractFormProps {
  contract?: Contract;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type ContractFormData = {
  employeeId: number;
  contractType: string;
  startDate: string;
  endDate: string | null;
  baseSalary: string;
};

export default function ContractForm({ contract, onSuccess, onCancel }: ContractFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!contract;

  const { data: employeesResponse } = useQuery<ApiResponse<Employee[]>>({
    queryKey: ["/api/v1/rh/employees"],
    queryFn: () => EmpleadosAPI.list(),
  });

  const { data: peopleResponse } = useQuery<ApiResponse<PersonDto[]>>({
    queryKey: ["/api/v1/rh/people"],
    queryFn: () => PersonasAPI.list(),
  });

  const employees = employeesResponse?.status === "success" ? employeesResponse.data : [];
  const people = peopleResponse?.status === "success" ? peopleResponse.data : [];

  const form = useForm<ContractFormData>({
    defaultValues: {
      employeeId: contract?.employeeId ?? 0,
      contractType: contract?.contractType ?? "Indefinido",
      startDate: contract?.startDate ?? "",
      endDate: contract?.endDate ?? null,
      baseSalary: contract?.baseSalary != null ? String(contract.baseSalary) : "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ContractFormData) => {
      const response = await ContratosAPI.create(data as any);
      if (response.status === "error") throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/contracts"] });
      toast({ title: "Contrato creado exitosamente" });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear contrato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ContractFormData) => {
      if (!contract?.id) return;
      const response = await ContratosAPI.update(contract.id, data as any);
      if (response.status === "error") throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/contracts"] });
      toast({ title: "Contrato actualizado exitosamente" });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar contrato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContractFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const contractType = form.watch("contractType");
  const startDate = form.watch("startDate");

  const calculateEndDate = (type: string, start: string) => {
    if (!start) return "";

    const startDateObj = new Date(start);
    let endDateObj: Date;

    switch (type) {
      case "Ocasional":
        endDateObj = new Date(startDateObj);
        endDateObj.setFullYear(endDateObj.getFullYear() + 2);
        break;
      case "Contrato":
        endDateObj = new Date(startDateObj);
        endDateObj.setFullYear(endDateObj.getFullYear() + 1);
        break;
      case "Servicios":
        endDateObj = new Date(startDateObj);
        endDateObj.setMonth(endDateObj.getMonth() + 6);
        break;
      default:
        return "";
    }

    return endDateObj.toISOString().split("T")[0];
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>{isEditing ? "Editar Contrato" : "Crear Nuevo Contrato"}</span>
        </CardTitle>
        <CardDescription>
          {isEditing
            ? "Modifique los términos del contrato"
            : "Complete la información del nuevo contrato laboral"}
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
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value, 10))}
                      value={field.value ? String(field.value) : ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-employee">
                          <SelectValue placeholder="Seleccione un empleado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((employee) => {
                          const person = people.find(
                            (p) => p.personId === employee.id || p.personId === (employee as any).personId
                          );

                          if (!employee?.id) return null;

                          return (
                            <SelectItem key={employee.id} value={employee.id.toString()}>
                              {person
                                ? `${person.firstName} ${person.lastName}`
                                : `Empleado #${employee.id}`}
                              <span className="text-xs text-muted-foreground ml-2">({employee.type})</span>
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
                name="contractType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Contrato *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);

                        if (startDate && value !== "Indefinido") {
                          const endDate = calculateEndDate(value, startDate);
                          form.setValue("endDate", endDate);
                        } else if (value === "Indefinido") {
                          form.setValue("endDate", null);
                        }
                      }}
                      value={field.value ?? "Indefinido"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-contract-type">
                          <SelectValue placeholder="Seleccione el tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Indefinido">Indefinido</SelectItem>
                        <SelectItem value="Ocasional">Ocasional (2 años)</SelectItem>
                        <SelectItem value="Contrato">Por Contrato (1 año)</SelectItem>
                        <SelectItem value="Servicios">Servicios Profesionales (6 meses)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Inicio *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        data-testid="input-startDate"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          if (contractType && contractType !== "Indefinido") {
                            const endDate = calculateEndDate(contractType, e.target.value);
                            form.setValue("endDate", endDate);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Fin</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        data-testid="input-endDate"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        disabled={contractType === "Indefinido"}
                      />
                    </FormControl>
                    <FormMessage />
                    {contractType === "Indefinido" && (
                      <p className="text-xs text-muted-foreground">
                        Los contratos indefinidos no tienen fecha de fin
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="baseSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salario Base *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                      <Input
                        type="number"
                        step="0.01"
                        min="450"
                        placeholder="0.00"
                        className="pl-10"
                        data-testid="input-baseSalary"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Salario mínimo en Ecuador: $450.00
                  </p>
                </FormItem>
              )}
            />

            {startDate && contractType !== "Indefinido" && (
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex items-center space-x-2 text-primary mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Información del Contrato</span>
                </div>
                <div className="text-sm text-primary space-y-1">
                  <p>Duración: {contractType}</p>
                  <p>Inicio: {new Date(startDate).toLocaleDateString()}</p>
                  {form.watch("endDate") && (
                    <p>Fin: {new Date(form.watch("endDate")!).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
                data-testid="button-save-contract"
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Guardando..." : isEditing ? "Actualizar" : "Crear Contrato"}
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
  );
}