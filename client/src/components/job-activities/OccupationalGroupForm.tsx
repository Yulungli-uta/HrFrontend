// src/components/job-activities/OccupationalGroupForm.tsx

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import type { OccupationalGroup } from "@/types/Job-activities";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { ActiveStateField } from "./ActiveStateField";
import { CatalogFormFooter } from "./CatalogFormFooter";
import { DegreeCombobox } from "./catalogCombos";

const schema = z
  .object({
    // Con grupo, el nombre lo compone el sistema (Grupo + Nivel); sin grupo (Código de Trabajo pendiente) se escribe a mano.
    description: z.string().trim().max(200, "Máximo 200 caracteres."),
    degreeId: z.number().nullable().refine((v) => v != null && v > 0, "Seleccione un grado."),
    level: z
      .string()
      .trim()
      .refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 99), "El nivel es un número entero de 1 a 99."),
    // El RMU es solo referencial y puede quedar vacío (el sueldo real está en el historial salarial).
    rmu: z
      .string()
      .trim()
      .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0), "Ingrese un RMU válido (0 o más) o déjelo vacío.")
      .refine((v) => v === "" || Number(v) < 100000000, "El RMU es demasiado alto."),
    familyTypeId: z.number().nullable(),
    uepScaleTypeId: z.number().nullable(),
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.familyTypeId == null && v.description.length === 0)
      ctx.addIssue({ code: "custom", path: ["description"], message: "Elija el grupo o escriba el nombre de la escala." });
    if (v.familyTypeId == null && v.level !== "")
      ctx.addIssue({ code: "custom", path: ["level"], message: "Para indicar un nivel elija primero el grupo." });
  });
type FormValues = z.infer<typeof schema>;

interface OccupationalGroupFormProps {
  group: OccupationalGroup;
  saving: boolean;
  onSave: (data: {
    groupId?: number;
    description: string;
    degreeId: number;
    rmu: number | null;
    level: number | null;
    uepScaleTypeId: number | null;
    familyTypeId: number | null;
    isActive: boolean;
  }) => void;
  onCancel: () => void;
}

/**
 * Alta y edición de una escala ocupacional: Grupo + Grado + Nivel (opcional), RMU referencial (opcional) y clasificación adicional (Escala UEP).
 * Con grupo, el nombre de la escala lo compone el sistema ("Servidor Público 5") para que no quede texto libre.
 */
export function OccupationalGroupForm({ group, saving, onSave, onCancel }: OccupationalGroupFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: group.description ?? "",
      degreeId: group.degreeId > 0 ? group.degreeId : null,
      level: group.level != null ? String(group.level) : "",
      rmu: group.rmu != null ? String(group.rmu) : "",
      familyTypeId: group.familyTypeId ?? null,
      uepScaleTypeId: group.uepScaleTypeId ?? null,
      isActive: group.isActive,
    },
  });
  const { errors } = form.formState;
  const [extraOpen, setExtraOpen] = useState(group.uepScaleTypeId != null);

  const families = useRefTypesByCategory(REF_TYPE_CATEGORIES.OCCUPATIONAL_GROUP_FAMILY);
  const uepScales = useRefTypesByCategory(REF_TYPE_CATEGORIES.UEP_SCALE_TYPE);
  // Solo se ofrecen registros activos; el ya asignado, aunque esté inactivo, sigue visible en el campo para no perderlo al guardar.
  const familyOptions = families.data.filter((t) => t.isActive !== false).map((t) => ({ value: String(t.typeId), label: t.name }));
  const uepOptions = uepScales.data.filter((t) => t.isActive !== false).map((t) => ({ value: String(t.typeId), label: t.name }));

  const familyId = form.watch("familyTypeId");
  const uepId = form.watch("uepScaleTypeId");

  return (
    <form
      className="flex min-h-0 flex-1 flex-col gap-4"
      noValidate
      onSubmit={form.handleSubmit((v) =>
        onSave({
          groupId: group.groupId || undefined,
          description: v.familyTypeId == null ? v.description : "",
          degreeId: v.degreeId ?? 0,
          rmu: v.rmu === "" ? null : Number(v.rmu),
          level: v.level === "" ? null : Number(v.level),
          uepScaleTypeId: v.uepScaleTypeId,
          familyTypeId: v.familyTypeId,
          isActive: v.isActive,
        }),
      )}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-0.5">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Grupo ocupacional *</Label>
          <SearchableSelect
            value={familyId != null ? String(familyId) : null}
            options={familyOptions}
            placeholder="Sin clasificar (pendiente de RRHH)"
            searchPlaceholder="Escriba para buscar el grupo…"
            emptyText="No hay grupos que coincidan."
            clearLabel="Sin clasificar (pendiente de RRHH)"
            isLoading={families.isLoading}
            ariaLabel="Grupo ocupacional"
            fallbackLabel={families.data.find((t) => t.typeId === familyId)?.name}
            onChange={(v) => form.setValue("familyTypeId", v ? Number(v) : null, { shouldDirty: true })}
          />
          {families.isError ? (
            <p className="text-xs text-destructive">No se pudieron cargar los grupos. Refresque la página.</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Cada grado y cada nivel se usan una sola vez por grupo. Los grupos se crean en la tarjeta &quot;Grupos ocupacionales&quot;.
            </p>
          )}
        </div>

        {familyId == null ? (
          <div className="space-y-1">
            <Label htmlFor="group-description" className="text-sm font-medium">
              Nombre de la escala *
            </Label>
            <Input
              id="group-description"
              maxLength={200}
              placeholder="Ej: Código de Trabajo Nivel 2"
              aria-invalid={!!errors.description}
              {...form.register("description")}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            El nombre lo genera el sistema (grupo + nivel)
            {group.groupId > 0 && group.description ? (
              <>
                : <strong className="text-foreground">{group.description}</strong>
              </>
            ) : (
              "."
            )}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Grado *</Label>
            <DegreeCombobox
              value={form.watch("degreeId")}
              onChange={(id) => form.setValue("degreeId", id, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })}
              placeholder="Seleccione un grado"
              activeOnly
            />
            {errors.degreeId && <p className="text-xs text-destructive">{errors.degreeId.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="group-level" className="text-sm font-medium">
              Nivel
            </Label>
            <Input
              id="group-level"
              type="number"
              min="1"
              max="99"
              step="1"
              inputMode="numeric"
              placeholder="Opcional"
              aria-invalid={!!errors.level}
              {...form.register("level")}
            />
            {errors.level && <p className="text-xs text-destructive">{errors.level.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="group-rmu" className="text-sm font-medium">
              RMU referencial (USD)
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
                placeholder="Opcional"
                aria-invalid={!!errors.rmu}
                {...form.register("rmu")}
              />
            </div>
            {errors.rmu && <p className="text-xs text-destructive">{errors.rmu.message}</p>}
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          El nivel identifica la escala dentro del grupo. El RMU es solo referencial (el sueldo real está en el historial salarial).
        </p>

        <Collapsible open={extraOpen} onOpenChange={setExtraOpen}>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground">
              Clasificación adicional (Escala UEP)
              <ChevronDown className={`h-4 w-4 transition-transform ${extraOpen ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pt-2">
            <SearchableSelect
              value={uepId != null ? String(uepId) : null}
              options={uepOptions}
              placeholder="(sin clasificar)"
              searchPlaceholder="Escriba para buscar la escala UEP…"
              emptyText="No hay escalas UEP que coincidan."
              clearLabel="(sin clasificar)"
              isLoading={uepScales.isLoading}
              disabled={uepScales.isError}
              ariaLabel="Escala UEP"
              fallbackLabel={uepScales.data.find((t) => t.typeId === uepId)?.name}
              onChange={(v) => form.setValue("uepScaleTypeId", v ? Number(v) : null, { shouldDirty: true })}
            />
            {uepScales.isError ? (
              <p className="text-xs text-destructive">Error al cargar la escala UEP. Refresque la página.</p>
            ) : (
              <p className="text-xs text-muted-foreground">Solo si la escala también se identifica con la nomenclatura UEP. No reemplaza el grupo ni el grado.</p>
            )}
          </CollapsibleContent>
        </Collapsible>

        <ActiveStateField
          id={`group-active-${group.groupId || "nuevo"}`}
          noun="escala"
          article="la"
          checked={form.watch("isActive")}
          onChange={(value) => form.setValue("isActive", value, { shouldDirty: true })}
        />
      </div>

      <CatalogFormFooter saving={saving} saveLabel="Guardar escala" onCancel={onCancel} />
    </form>
  );
}
