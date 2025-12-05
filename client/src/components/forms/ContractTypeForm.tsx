// src/components/forms/ContractTypeForm.tsx
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ContractTypeAPI,
  TiposReferenciaAPI,
  type ApiResponse,
} from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// ⬅️ Cambia esto por la categoría real de tu tabla reftype
const PERSONAL_CONTRACT_TYPE_CATEGORY = "PERSONAL_CONTRACT_TYPE";

// ---------------- Esquema Zod ----------------

// personalContractTypeId se maneja como STRING en el form (Select)
const contractTypeSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  code: z.string().min(1, "El código es obligatorio"),
  description: z.string().optional(),
  contractText: z.string().optional(),
  isActive: z.boolean().default(true),

  personalContractTypeId: z
    .string({
      required_error: "Debe seleccionar un tipo de contrato personal",
      invalid_type_error: "Debe seleccionar un valor",
    })
    .min(1, "Debe seleccionar un tipo de contrato personal"),
});

export type ContractTypeFormValues = z.infer<typeof contractTypeSchema>;

export interface ContractTypeFormProps {
  mode: "create" | "edit";
  contractId?: number;
  initialValues?: Partial<ContractTypeFormValues>;
  onCancel: () => void;
  onSuccess: () => void;
}

// DTOs para el backend
interface ContractTypeCreateDTO {
  name: string;
  contractCode: string;
  description?: string;
  contractText?: string;
  status: string;
  personalContractTypeId: number;
}

interface ContractTypeUpdateDTO {
  name?: string;
  contractCode?: string;
  description?: string;
  contractText?: string;
  status?: string;
  personalContractTypeId?: number;
}

function ensureSuccess<T>(res: ApiResponse<T>, defaultMessage: string): T {
  if (res.status === "error") {
    throw new Error(res.error.message || defaultMessage);
  }
  return res.data;
}

export function ContractTypeForm({
  mode,
  contractId,
  initialValues,
  onCancel,
  onSuccess,
}: ContractTypeFormProps) {
  const queryClient = useQueryClient();

  // ------- Cargar opciones de reftype para el Select -------
  const {
    data: refTypesResponse,
    isLoading: isLoadingRefTypes,
    error: refTypesError,
  } = useQuery<ApiResponse<any[]>>({
    queryKey: ["refTypes", PERSONAL_CONTRACT_TYPE_CATEGORY],
    queryFn: () =>
      TiposReferenciaAPI.byCategory(
        PERSONAL_CONTRACT_TYPE_CATEGORY
      ) as Promise<ApiResponse<any[]>>,
  });

  const refTypes =
    refTypesResponse?.status === "success" ? refTypesResponse.data : [];

  // ------- Formulario RHF -------
  const form = useForm<ContractTypeFormValues>({
    resolver: zodResolver(contractTypeSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      code: initialValues?.code ?? "",
      description: initialValues?.description ?? "",
      contractText: initialValues?.contractText ?? "",
      isActive: initialValues?.isActive ?? true,
      personalContractTypeId: initialValues?.personalContractTypeId ?? "",
    },
  });

  // ------- Mutaciones -------
  const createMutation = useMutation({
    mutationFn: async (values: ContractTypeFormValues) => {
      const payload: ContractTypeCreateDTO = {
        name: values.name,
        contractCode: values.code,
        description: values.description || "",
        contractText: values.contractText || "",
        status: values.isActive ? "1" : "0",
        personalContractTypeId: Number(values.personalContractTypeId),
      };

      const res = await ContractTypeAPI.create(payload as any);
      return ensureSuccess(res, "Error al crear el tipo de contrato");
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/v1/rh/contract-type"]);
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: ContractTypeFormValues) => {
      if (!contractId) {
        throw new Error("No se proporcionó el ID del contrato para actualizar");
      }

      const payload: ContractTypeUpdateDTO = {
        name: values.name,
        contractCode: values.code,
        description: values.description || "",
        contractText: values.contractText || "",
        status: values.isActive ? "1" : "0",
        personalContractTypeId: Number(values.personalContractTypeId),
      };

      const res = await ContractTypeAPI.update(contractId, payload as any);
      return ensureSuccess(res, "Error al actualizar el tipo de contrato");
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/v1/rh/contract-type"]);
      onSuccess();
    },
  });

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: ContractTypeFormValues) => {
    if (mode === "create") {
      createMutation.mutate(values);
    } else {
      updateMutation.mutate(values);
    }
  };

  const apiError =
    (createMutation.error as Error | undefined)?.message ||
    (updateMutation.error as Error | undefined)?.message ||
    null;

  // ------- Render -------
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del tipo de contrato</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: DOCENTE TIEMPO COMPLETO"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Código */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: DTH" {...field} />
                  </FormControl>
                  <FormDescription>
                    Código corto que identifica el tipo de contrato.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Select personalContractTypeId */}
            <FormField
              control={form.control}
              name="personalContractTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Contrato Personal (reftype)</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      disabled={isLoadingRefTypes}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un tipo de contrato personal" />
                      </SelectTrigger>
                      <SelectContent>
                        {refTypes.map((rt: any) => {
                          const id =
                            rt.id ??
                            rt.refTypeId ??
                            rt.typeId ??
                            rt.valueId;
                          const label =
                            rt.name ??
                            rt.description ??
                            rt.code ??
                            `ID ${id}`;
                          return (
                            <SelectItem key={id} value={String(id)}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  {isLoadingRefTypes && (
                    <p className="text-xs text-gray-500 mt-1">
                      Cargando tipos de contrato...
                    </p>
                  )}
                  {refTypesError && (
                    <p className="text-xs text-red-600 mt-1">
                      Error al cargar tipos de contrato.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Descripción breve del tipo de contrato"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Texto del contrato */}
            <FormField
              control={form.control}
              name="contractText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto del contrato</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      placeholder="Texto legal del contrato..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Este texto se usará como base para generar el documento de
                    contrato.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Activo */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <FormLabel>Activo</FormLabel>
                    <FormDescription>
                      Si está desactivado, no se podrá usar en nuevas
                      contrataciones.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Mensaje de error API */}
            {apiError && (
              <p className="text-sm text-red-600">
                Error al guardar: {apiError}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto"
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Guardando..."
              : mode === "create"
              ? "Crear Tipo de Contrato"
              : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
