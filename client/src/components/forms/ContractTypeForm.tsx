// src/components/forms/ContractTypeForm.tsx
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ContractTypeAPI,
  TiposReferenciaAPI,
  type ApiResponse,
} from "@/lib/api";
import { TemplateSelect } from "@/components/shared/TemplateSelect";
import { useToast } from "@/hooks/use-toast";

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
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";

// Categoría unificada en ref_Types — ya no existe PERSONAL_CONTRACT_TYPE
const PERSONAL_CONTRACT_TYPE_CATEGORY = REF_TYPE_CATEGORIES.CONTRACT_TYPE;
const SIIES_RELACION_IES_CATEGORY = REF_TYPE_CATEGORIES.SIIES_RELACION_IES;

// ---------------- Esquema Zod ----------------

// personalContractTypeId se maneja como STRING en el form (Select)
const contractTypeSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  code: z.string().min(1, "El código es obligatorio"),
  description: z.string().optional(),
  contractText: z.string().optional(),
  isActive: z.boolean().optional(),
  requiresAdUserCreation: z.boolean(),
  requiresAdUserDisable: z.boolean(),
  requiresAdGroupAssignment: z.boolean(),
  defaultTemplateId: z.number().nullable().optional(),
  delegationTemplateId: z.number().nullable().optional(),

  personalContractTypeId: z
    .string({
      required_error: "Debe seleccionar un tipo de contrato personal",
      invalid_type_error: "Debe seleccionar un valor",
    })
    .min(1, "Debe seleccionar un tipo de contrato personal"),

  /** SIIES RELACION_IES homologado — opcional, requerido solo para el reporte SIIES. */
  siiesRelacionIesTypeId: z.string().optional(),
});

export type ContractTypeFormValues = z.infer<typeof contractTypeSchema>;

export interface ContractTypeFormProps {
  mode: "create" | "edit";
  contractId?: number;
  initialValues?: Partial<ContractTypeFormValues>;
  onCancel: () => void;
  onSuccess: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

// DTOs para el backend
interface ContractTypeCreateDTO {
  name: string;
  contractCode: string;
  description?: string;
  contractText?: string;
  status: string;
  personalContractTypeId: number;
  requiresAdUserCreation: boolean;
  requiresAdUserDisable: boolean;
  requiresAdGroupAssignment: boolean;
  defaultTemplateId?: number | null;
  delegationTemplateId?: number | null;
  siiesRelacionIesTypeId?: number | null;
}

interface ContractTypeUpdateDTO {
  name?: string;
  contractCode?: string;
  description?: string;
  contractText?: string;
  status?: string;
  personalContractTypeId?: number;
  requiresAdUserCreation: boolean;
  requiresAdUserDisable: boolean;
  requiresAdGroupAssignment: boolean;
  defaultTemplateId?: number | null;
  delegationTemplateId?: number | null;
  siiesRelacionIesTypeId?: number | null;
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
  onDirtyChange,
}: ContractTypeFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ------- Plantillas vinculadas (solo edición) -------
  // La plantilla predeterminada y la plantilla de delegación viajan como campos normales
  // del formulario (defaultTemplateId, delegationTemplateId), soportados por el backend
  // tanto en creación como en edición. En modo edición, además se consultan los valores
  // ya vinculados para precargarlos en el formulario.
  const qLinkedTemplates = useQuery({
    queryKey: ["contract-type-template", contractId],
    queryFn: () => ContractTypeAPI.getWithTemplate(contractId!),
    enabled: mode === "edit" && !!contractId,
  });
  const linked = qLinkedTemplates.data?.status === "success" ? qLinkedTemplates.data.data : null;

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

  const { data: siiesRelacionIesResponse, isLoading: isLoadingSiiesRelacionIes } =
    useQuery<ApiResponse<any[]>>({
      queryKey: ["refTypes", SIIES_RELACION_IES_CATEGORY],
      queryFn: () =>
        TiposReferenciaAPI.byCategory(
          SIIES_RELACION_IES_CATEGORY
        ) as Promise<ApiResponse<any[]>>,
    });

  const siiesRelacionIesOptions =
    siiesRelacionIesResponse?.status === "success" ? siiesRelacionIesResponse.data : [];

  // ------- Formulario RHF -------
  const form = useForm<ContractTypeFormValues>({
    resolver: zodResolver(contractTypeSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      code: initialValues?.code ?? "",
      description: initialValues?.description ?? "",
      contractText: initialValues?.contractText ?? "",
      isActive: initialValues?.isActive ?? true,
      requiresAdUserCreation: (initialValues as any)?.requiresAdUserCreation ?? false,
      requiresAdUserDisable: (initialValues as any)?.requiresAdUserDisable ?? false,
      requiresAdGroupAssignment: (initialValues as any)?.requiresAdGroupAssignment ?? false,
      personalContractTypeId: initialValues?.personalContractTypeId ?? "",
      defaultTemplateId: initialValues?.defaultTemplateId ?? null,
      delegationTemplateId: initialValues?.delegationTemplateId ?? null,
      siiesRelacionIesTypeId: (initialValues as any)?.siiesRelacionIesTypeId
        ? String((initialValues as any).siiesRelacionIesTypeId)
        : "",
    },
  });

  // Notifica al padre cuando el formulario tiene cambios sin guardar
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const isDirty = form.formState.isDirty;
  useEffect(() => {
    onDirtyChangeRef.current?.(isDirty);
  }, [isDirty]);

  // En modo edición, las plantillas vinculadas se cargan de forma asíncrona
  // (qLinkedTemplates); en cuanto llegan, se sincronizan al formulario.
  useEffect(() => {
    if (mode === "edit" && linked) {
      form.setValue("defaultTemplateId", linked.defaultTemplateId ?? null);
      form.setValue("delegationTemplateId", linked.delegationTemplateId ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, linked]);

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
        requiresAdUserCreation: values.requiresAdUserCreation,
        requiresAdUserDisable: values.requiresAdUserDisable,
        requiresAdGroupAssignment: values.requiresAdGroupAssignment,
        defaultTemplateId: values.defaultTemplateId ?? null,
        delegationTemplateId: values.delegationTemplateId ?? null,
        siiesRelacionIesTypeId: values.siiesRelacionIesTypeId
          ? Number(values.siiesRelacionIesTypeId)
          : null,
      };

      const res = await ContractTypeAPI.create(payload as any);
      return ensureSuccess(res, "Error al crear el tipo de contrato");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/contract-type"] });
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
        requiresAdUserCreation: values.requiresAdUserCreation,
        requiresAdUserDisable: values.requiresAdUserDisable,
        requiresAdGroupAssignment: values.requiresAdGroupAssignment,
        defaultTemplateId: values.defaultTemplateId ?? null,
        delegationTemplateId: values.delegationTemplateId ?? null,
        siiesRelacionIesTypeId: values.siiesRelacionIesTypeId
          ? Number(values.siiesRelacionIesTypeId)
          : null,
      };

      const res = await ContractTypeAPI.update(contractId, payload as any);
      return ensureSuccess(res, "Error al actualizar el tipo de contrato");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/contract-type"] });
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Cargando tipos de contrato...
                    </p>
                  )}
                  {refTypesError && (
                    <p className="text-xs text-destructive mt-1">
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

            {/* Relación con la IES (SIIES) */}
            <FormField
              control={form.control}
              name="siiesRelacionIesTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relación con la IES (SIIES)</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      disabled={isLoadingSiiesRelacionIes}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin homologar" />
                      </SelectTrigger>
                      <SelectContent>
                        {siiesRelacionIesOptions.map((rt: any) => {
                          const id = rt.id ?? rt.refTypeId ?? rt.typeId ?? rt.valueId;
                          const label = rt.name ?? rt.description ?? rt.code ?? `ID ${id}`;
                          return (
                            <SelectItem key={id} value={String(id)}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Homologación requerida por el reporte SIIES Funcionarios (Instructivo CACES).
                    Sin este dato, los contratos de este tipo quedan sin RELACION_IES en el reporte.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Integración Active Directory */}
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-semibold text-foreground">Integración Active Directory</p>
              <p className="text-xs text-muted-foreground">Define qué operaciones en AD local se deben ejecutar al vincular este tipo de contrato.</p>

              <FormField
                control={form.control}
                name="requiresAdUserCreation"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between py-1">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Crear usuario en AD</FormLabel>
                      <FormDescription className="text-xs">Se creará una cuenta en Active Directory local para el empleado.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiresAdUserDisable"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between py-1">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Deshabilitar usuario en AD</FormLabel>
                      <FormDescription className="text-xs">Se deshabilitará la cuenta en AD al finalizar o revocar el contrato.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiresAdGroupAssignment"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between py-1">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Asignar grupos/roles AD</FormLabel>
                      <FormDescription className="text-xs">Se asignarán los grupos de AD correspondientes al empleado.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Plantillas documentales */}
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-semibold text-foreground">Plantillas documentales</p>
              <p className="text-xs text-muted-foreground">
                Define qué plantilla se usa al generar el documento de contrato y, opcionalmente,
                qué plantilla se usa cuando el contrato es por delegación.
              </p>

              {/* Plantilla predeterminada — campo normal del formulario, disponible en create y edit */}
              <FormField
                control={form.control}
                name="defaultTemplateId"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-sm">Plantilla predeterminada</FormLabel>
                    <FormControl>
                      <TemplateSelect
                        templateType="CONTRATO"
                        value={field.value ?? null}
                        onChange={field.onChange}
                        disabled={mode === "edit" && qLinkedTemplates.isLoading}
                        placeholder="Sin plantilla asignada"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Plantilla de delegación — campo normal del formulario, disponible en create y edit */}
              <FormField
                control={form.control}
                name="delegationTemplateId"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-sm">Plantilla de delegación</FormLabel>
                    <FormControl>
                      <TemplateSelect
                        templateType="CONTRATO"
                        value={field.value ?? null}
                        onChange={field.onChange}
                        disabled={mode === "edit" && qLinkedTemplates.isLoading}
                        placeholder="Sin plantilla asignada"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Mensaje de error API */}
            {apiError && (
              <p className="text-sm text-destructive">
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
