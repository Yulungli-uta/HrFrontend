// src/components/forms/PersonnelActionTypeForm.tsx
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PersonnelActionTypeAPI } from "@/lib/api/services/contracts";

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
  templateCode: z.string().optional(),
  actionCategory: z.string().optional(),
  isActive: z.boolean(),
  requiresAdUserCreation: z.boolean(),
  requiresAdUserDisable: z.boolean(),
  requiresAdGroupAssignment: z.boolean(),
});

export type PersonnelActionTypeFormValues = z.infer<typeof schema>;

export interface PersonnelActionTypeFormProps {
  mode: "create" | "edit";
  actionTypeId?: number;
  initialValues?: Partial<PersonnelActionTypeFormValues>;
  onCancel: () => void;
  onSuccess: () => void;
}

const QUERY_KEY = "/api/v1/rh/personnel-action-type";

export function PersonnelActionTypeForm({
  mode,
  actionTypeId,
  initialValues,
  onCancel,
  onSuccess,
}: PersonnelActionTypeFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<PersonnelActionTypeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name ?? "",
      code: initialValues?.code ?? "",
      description: initialValues?.description ?? "",
      numberingPrefix: initialValues?.numberingPrefix ?? "",
      templateCode: initialValues?.templateCode ?? "",
      actionCategory: initialValues?.actionCategory ?? "",
      isActive: initialValues?.isActive ?? true,
      requiresAdUserCreation: initialValues?.requiresAdUserCreation ?? false,
      requiresAdUserDisable: initialValues?.requiresAdUserDisable ?? false,
      requiresAdGroupAssignment: initialValues?.requiresAdGroupAssignment ?? false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: PersonnelActionTypeFormValues) => {
      const res = await PersonnelActionTypeAPI.create({
        name: values.name,
        code: values.code,
        description: values.description || undefined,
        numberingPrefix: values.numberingPrefix,
        templateCode: values.templateCode || undefined,
        actionCategory: values.actionCategory || undefined,
        isActive: values.isActive,
        requiresAdUserCreation: values.requiresAdUserCreation,
        requiresAdUserDisable: values.requiresAdUserDisable,
        requiresAdGroupAssignment: values.requiresAdGroupAssignment,
      });
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
        templateCode: values.templateCode || undefined,
        actionCategory: values.actionCategory || undefined,
        isActive: values.isActive,
        requiresAdUserCreation: values.requiresAdUserCreation,
        requiresAdUserDisable: values.requiresAdUserDisable,
        requiresAdGroupAssignment: values.requiresAdGroupAssignment,
      });
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

            {/* Código de plantilla */}
            <FormField
              control={form.control}
              name="templateCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de plantilla</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: TPL-CONTRATACION" {...field} />
                  </FormControl>
                  <FormDescription>
                    Código de la plantilla documental asociada (opcional).
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
