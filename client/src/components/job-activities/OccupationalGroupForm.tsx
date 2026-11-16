// src/components/job-activities/OccupationalGroupForm.tsx

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OccupationalGroup } from "@/types/Job-activities";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { ActiveStateField } from "./ActiveStateField";
import { CatalogFormFooter } from "./CatalogFormFooter";
import { DegreeCombobox } from "./catalogCombos";

const NONE = "__none__";

const schema = z.object({
  description: z.string().trim().min(1, "La descripción es obligatoria.").max(200, "Máximo 200 caracteres."),
  degreeId: z.number().nullable().refine((v) => v != null && v > 0, "Seleccione un grado."),
  rmu: z
    .string()
    .trim()
    .refine((v) => v !== "" && Number.isFinite(Number(v)) && Number(v) >= 0, "Ingrese un RMU válido (0 o más).")
    .refine((v) => Number(v) < 100000000, "El RMU es demasiado alto."),
  familyTypeId: z.number().nullable(),
  uepScaleTypeId: z.number().nullable(),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

interface OccupationalGroupFormProps {
  group: OccupationalGroup;
  saving: boolean;
  onSave: (data: {
    groupId?: number;
    description: string;
    degreeId: number;
    rmu: number;
    uepScaleTypeId: number | null;
    familyTypeId: number | null;
    isActive: boolean;
  }) => void;
  onCancel: () => void;
}

/** Alta y edición de un grupo ocupacional: descripción, familia, grado, RMU y clasificación adicional (Escala UEP). */
export function OccupationalGroupForm({ group, saving, onSave, onCancel }: OccupationalGroupFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: group.description ?? "",
      degreeId: group.degreeId > 0 ? group.degreeId : null,
      rmu: group.rmu != null ? String(group.rmu) : "0",
      familyTypeId: group.familyTypeId ?? null,
      uepScaleTypeId: group.uepScaleTypeId ?? null,
      isActive: group.isActive,
    },
  });
  const { errors } = form.formState;
  const [extraOpen, setExtraOpen] = useState(group.uepScaleTypeId != null);

  const families = useRefTypesByCategory(REF_TYPE_CATEGORIES.OCCUPATIONAL_GROUP_FAMILY);
  const uepScales = useRefTypesByCategory(REF_TYPE_CATEGORIES.UEP_SCALE_TYPE);
  // Se ofrecen las activas, más la ya asignada aunque se haya desactivado (para no perderla al guardar).
  const familyOptions = families.data.filter((t) => t.isActive !== false || t.typeId === group.familyTypeId);
  const uepOptions = uepScales.data.filter((t) => t.isActive !== false || t.typeId === group.uepScaleTypeId);

  // Radix Select emite "" al sincronizar su <select> oculto: se ignora para no borrar el valor precargado.
  const toId = (value: string): number | null | undefined => (value === "" ? undefined : value === NONE ? null : Number(value));

  const familyId = form.watch("familyTypeId");
  const uepId = form.watch("uepScaleTypeId");

  return (
    <form
      className="flex min-h-0 flex-1 flex-col gap-4"
      noValidate
      onSubmit={form.handleSubmit((v) =>
        onSave({
          groupId: group.groupId || undefined,
          description: v.description,
          degreeId: v.degreeId ?? 0,
          rmu: Number(v.rmu),
          uepScaleTypeId: v.uepScaleTypeId,
          familyTypeId: v.familyTypeId,
          isActive: v.isActive,
        }),
      )}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-0.5">
        <div className="space-y-1">
          <Label htmlFor="group-description" className="text-sm font-medium">
            Descripción del grupo ocupacional *
          </Label>
          <Input
            id="group-description"
            autoFocus
            maxLength={200}
            placeholder="Ej: Personal Académico Titular - Agregado - Nivel 2"
            aria-invalid={!!errors.description}
            {...form.register("description")}
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>

        <div className="space-y-1">
          <Label className="text-sm font-medium">Familia (opcional)</Label>
          <Select
            value={familyId != null ? String(familyId) : NONE}
            onValueChange={(v) => {
              const id = toId(v);
              if (id !== undefined) form.setValue("familyTypeId", id, { shouldDirty: true });
            }}
            disabled={families.isLoading}
          >
            <SelectTrigger aria-label="Familia del grupo">
              <SelectValue placeholder={families.isLoading ? "Cargando familias..." : "Sin familia"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sin familia (escala LOSEP)</SelectItem>
              {familyOptions.map((t) => (
                <SelectItem key={t.typeId} value={String(t.typeId)}>
                  {t.name}
                  {t.isActive === false ? " (inactiva)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {families.isError ? (
            <p className="text-xs text-destructive">No se pudieron cargar las familias. Refresque la página.</p>
          ) : (
            <p className="text-xs text-muted-foreground">Dentro de una familia cada grado se usa una sola vez.</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Grado asociado *</Label>
            <DegreeCombobox
              value={form.watch("degreeId")}
              onChange={(id) => form.setValue("degreeId", id, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })}
              placeholder="Seleccione un grado"
            />
            {errors.degreeId && <p className="text-xs text-destructive">{errors.degreeId.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="group-rmu" className="text-sm font-medium">
              RMU (USD) *
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">$</span>
              <Input
                id="group-rmu"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="pl-7"
                aria-invalid={!!errors.rmu}
                {...form.register("rmu")}
              />
            </div>
            {errors.rmu && <p className="text-xs text-destructive">{errors.rmu.message}</p>}
          </div>
        </div>

        <Collapsible open={extraOpen} onOpenChange={setExtraOpen}>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground">
              Clasificación adicional (Escala UEP)
              <ChevronDown className={`h-4 w-4 transition-transform ${extraOpen ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pt-2">
            <Select
              value={uepId != null ? String(uepId) : NONE}
              onValueChange={(v) => {
                const id = toId(v);
                if (id !== undefined) form.setValue("uepScaleTypeId", id, { shouldDirty: true });
              }}
              disabled={uepScales.isLoading || uepScales.isError}
            >
              <SelectTrigger aria-label="Escala UEP">
                <SelectValue placeholder={uepScales.isLoading ? "Cargando escala UEP..." : "Sin clasificar"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>(sin clasificar)</SelectItem>
                {uepOptions.map((t) => (
                  <SelectItem key={t.typeId} value={String(t.typeId)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {uepScales.isError ? (
              <p className="text-xs text-destructive">Error al cargar la escala UEP. Refresque la página.</p>
            ) : (
              <p className="text-xs text-muted-foreground">Solo si el grupo también se identifica con la nomenclatura UEP. No reemplaza el RMU ni el grado.</p>
            )}
          </CollapsibleContent>
        </Collapsible>

        <ActiveStateField
          id={`group-active-${group.groupId || "nuevo"}`}
          noun="grupo"
          checked={form.watch("isActive")}
          onChange={(value) => form.setValue("isActive", value, { shouldDirty: true })}
        />
      </div>

      <CatalogFormFooter saving={saving} saveLabel="Guardar grupo" onCancel={onCancel} />
    </form>
  );
}
