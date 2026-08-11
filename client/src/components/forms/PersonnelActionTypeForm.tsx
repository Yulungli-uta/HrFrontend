// src/components/forms/PersonnelActionTypeForm.tsx
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PersonnelActionTypeAPI } from "@/lib/api/services/contracts";
import { TiposReferenciaAPI, type ApiResponse } from "@/lib/api";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { TemplateSelect } from "@/components/shared/TemplateSelect";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const ACTION_CATEGORIES = [
  { value: "MOVEMENT",    label: "Movimiento de personal" },
  { value: "ENTRY",       label: "Ingreso" },
  { value: "ECONOMIC",    label: "Económica / Salarial" },
  { value: "LEAVE",       label: "Licencia / Permiso" },
  { value: "DISCIPLINARY",label: "Disciplinaria / Sanción" },
  { value: "EXIT",        label: "Salida / Baja" },
] as const;

const schema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  code: z.string().min(1, "El código es obligatorio"),
  description: z.string().optional(),
  numberingPrefix: z.string().min(1, "El prefijo de numeración es obligatorio"),
  defaultTemplateId: z.number().nullable().optional(),
  actionCategory: z.string().optional(),
  isActive: z.boolean(),
  requiresAdUserCreation: z.boolean(),
  requiresAdUserDisable: z.boolean(),
  requiresAdGroupAssignment: z.boolean(),
  /** SIIES RELACION_IES homologado — opcional, requerido solo para el reporte SIIES. */
  siiesRelacionIesTypeId: z.string().optional(),
});

export type PersonnelActionTypeFormValues = z.infer<typeof schema>;

export interface PersonnelActionTypeFormProps {
  mode: "create" | "edit";
  actionTypeId?: number;
  initialValues?: Partial<PersonnelActionTypeFormValues>;
  onCancel: () => void;
  onSuccess: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

const QUERY_KEY = "/api/v1/rh/personnel-action-type";

export function PersonnelActionTypeForm({
  mode,
  actionTypeId,
  initialValues,
  onCancel,
  onSuccess,
  onDirtyChange,
}: PersonnelActionTypeFormProps) {
  const queryClient = useQueryClient();

  const { data: siiesRelacionIesResponse, isLoading: isLoadingSiiesRelacionIes } =
    useQuery<ApiResponse<any[]>>({
      queryKey: ["refTypes", REF_TYPE_CATEGORIES.SIIES_RELACION_IES],
      queryFn: () =>
        TiposReferenciaAPI.byCategory(
          REF_TYPE_CATEGORIES.SIIES_RELACION_IES
        ) as Promise<ApiResponse<any[]>>,
    });

  const siiesRelacionIesOptions =
    siiesRelacionIesResponse?.status === "success" ? siiesRelacionIesResponse.data : [];

  const form = useForm<PersonnelActionTypeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name ?? "",
      code: initialValues?.code ?? "",
      description: initialValues?.description ?? "",
      numberingPrefix: initialValues?.numberingPrefix ?? "",
      defaultTemplateId: initialValues?.defaultTemplateId ?? null,
      actionCategory: initialValues?.actionCategory ?? "",
      isActive: initialValues?.isActive ?? true,
      requiresAdUserCreation: initialValues?.requiresAdUserCreation ?? false,
      requiresAdUserDisable: initialValues?.requiresAdUserDisable ?? false,
      requiresAdGroupAssignment: initialValues?.requiresAdGroupAssignment ?? false,
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

  const createMutation = useMutation({
    mutationFn: async (values: PersonnelActionTypeFormValues) => {
      const res = await PersonnelActionTypeAPI.create({
        name: values.name,
        code: values.code,
        description: values.description || undefined,
        numberingPrefix: values.numberingPrefix,
        defaultTemplateId: values.defaultTemplateId ?? null,
        actionCategory: values.actionCategory || undefined,
        isActive: values.isActive,
        requiresAdUserCreation: values.requiresAdUserCreation,
        requiresAdUserDisable: values.requiresAdUserDisable,
        requiresAdGroupAssignment: values.requiresAdGroupAssignment,
        siiesRelacionIesTypeId: values.siiesRelacionIesTypeId
          ? Number(values.siiesRelacionIesTypeId)
          : null,
      } as any);
      if (res.status === "error") throw new Error(res.error.message || "Error al crear");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: PersonnelActionTypeFormValues) => {
      if (!actionTypeId) throw new Error("ID de tipo de acción no proporcionado");
      const res = await PersonnelActionTypeAPI.update(actionTypeId, {
        name: values.name,
        code: values.code,
        description: values.description || undefined,
        numberingPrefix: values.numberingPrefix,
        defaultTemplateId: values.defaultTemplateId ?? null,
        actionCategory: values.actionCategory || undefined,
        isActive: values.isActive,
        requiresAdUserCreation: values.requiresAdUserCreation,
        requiresAdUserDisable: values.requiresAdUserDisable,
        requiresAdGroupAssignment: values.requiresAdGroupAssignment,
        siiesRelacionIesTypeId: values.siiesRelacionIesTypeId
          ? Number(values.siiesRelacionIesTypeId)
          : null,
      } as any);
      if (res.status === "error") throw new Error(res.error.message || "Error al actualizar");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      onSuccess();
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: PersonnelActionTypeFormValues) => {
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
                  <FormLabel>Nombre del tipo de acción</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: CONTRATACIÓN" {...field} />
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
                    <Input placeholder="Ej: CONT" {...field} />
                  </FormControl>
                  <FormDescription>
                    Código corto que identifica el tipo de acción de personal.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categoría */}
            <FormField
              control={form.control}
              name="actionCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría funcional</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione una categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACTION_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Clasifica la acción para filtros en reportes. Las disciplinarias se excluyen del historial laboral del empleado.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Prefijo de numeración */}
            <FormField
              control={form.control}
              name="numberingPrefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prefijo de numeración</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: AP-CONT" {...field} />
                  </FormControl>
                  <FormDescription>
                    Prefijo usado para generar el número de documento (Ej: AP-CONT-2025-001).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Plantilla documental */}
            <FormField
              control={form.control}
              name="defaultTemplateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plantilla documental</FormLabel>
                  <FormControl>
                    <TemplateSelect
                      templateType="ACCION_PERSONAL"
                      value={field.value ?? null}
                      onChange={field.onChange}
                      placeholder="Sin plantilla asignada"
                    />
                  </FormControl>
                  <FormDescription>
                    Solo se muestran las plantillas publicadas (vigentes) de tipo Acción de Personal.
                  </FormDescription>
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
                      placeholder="Descripción breve del tipo de acción de personal"
                      {...field}
                    />
                  </FormControl>
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
                      Si está desactivado, no se podrá usar en nuevas acciones de personal.
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                    disabled={isLoadingSiiesRelacionIes}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin homologar" />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormDescription>
                    Homologación requerida por el reporte SIIES Funcionarios (Instructivo CACES).
                    Sin este dato, las acciones de este tipo quedan sin RELACION_IES en el reporte.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Integración Active Directory */}
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-semibold text-foreground">Integración Active Directory</p>
              <p className="text-xs text-muted-foreground">
                Define qué operaciones en AD local se deben ejecutar al aplicar este tipo de acción de personal.
              </p>

              <FormField
                control={form.control}
                name="requiresAdUserCreation"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between py-1">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Crear usuario en AD</FormLabel>
                      <FormDescription className="text-xs">
                        Se creará una cuenta en Active Directory local para el empleado.
                      </FormDescription>
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
                      <FormDescription className="text-xs">
                        Se deshabilitará la cuenta en AD al aplicar esta acción (p. ej. terminación, jubilación).
                      </FormDescription>
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
                      <FormDescription className="text-xs">
                        Se asignarán los grupos de AD correspondientes al empleado.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {apiError && (
              <p className="text-sm text-destructive">Error al guardar: {apiError}</p>
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
                ? "Crear Tipo de Acción"
                : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
