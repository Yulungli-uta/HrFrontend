// src/components/job-activities/OccupationalScaleSelector.tsx
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { OccupationalGroupAPI } from "@/lib/api";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";
import { normalizeOccupationalGroup, type OccupationalGroup } from "@/types/Job-activities";
import { JOB_ACTIVITIES_KEYS } from "./queryKeys";
import { useDegreeNames, useGroupDetails } from "./useCatalogLabels";

const NONE = "__none__";

interface OccupationalScaleSelectorProps {
  /** Escala (tbl_Occupational_Groups.GroupID) del cargo; null si aún no está clasificado. */
  value: number | null;
  onChange: (scaleId: number | null) => void;
  disabled?: boolean;
}

/** Escalas activas de un grupo (catálogo corto: se piden todas de una vez), ordenadas por nivel y por nombre. */
async function fetchScalesOfFamily(familyTypeId: number): Promise<OccupationalGroup[]> {
  const res = await OccupationalGroupAPI.listPaged({ page: 1, pageSize: 200, familyTypeId, isActive: true, sortBy: "description" });
  if (res.status !== "success") throw new Error("No se pudieron cargar las escalas del grupo.");
  return res.data.items
    .map(normalizeOccupationalGroup)
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.description.localeCompare(b.description, "es"));
}

/**
 * Clasificación del cargo en cascada: primero el grupo ocupacional y luego su grado (y nivel). El cargo guarda una sola escala,
 * así que queda en un solo grupo y un solo grado. Muestra el RMU referencial y la clasificación UEP de solo lectura.
 */
export function OccupationalScaleSelector({ value, onChange, disabled }: OccupationalScaleSelectorProps) {
  const families = useRefTypesByCategory(REF_TYPE_CATEGORIES.OCCUPATIONAL_GROUP_FAMILY);
  const uepScales = useRefTypesByCategory(REF_TYPE_CATEGORIES.UEP_SCALE_TYPE);
  const current = useGroupDetails([value]).get(value ?? -1);

  const [familyId, setFamilyId] = useState<number | null>(null);
  // El grupo sigue al de la escala actual (al abrir el cargo o cuando el escalón docente asigna otra escala).
  useEffect(() => {
    if (current) setFamilyId(current.familyTypeId ?? null);
    else if (value == null) setFamilyId(null);
  }, [current, value]);

  const scales = useQuery({
    queryKey: [...JOB_ACTIVITIES_KEYS.labels, "scales-of-family", familyId],
    queryFn: () => fetchScalesOfFamily(familyId as number),
    enabled: familyId != null,
    staleTime: 5 * 60 * 1000,
  });

  // Solo se ofrecen escalas activas; la ya asignada, aunque esté inactiva, se muestra en el campo (no se pierde al guardar).
  const options = scales.data ?? [];
  const degreeNames = useDegreeNames([...options, ...(current ? [current] : [])].map((s) => s.degreeId));

  const familyOptions = useMemo(
    () => families.data.filter((t) => t.isActive !== false).map((t) => ({ value: String(t.typeId), label: t.name })),
    [families.data],
  );
  const selected = options.find((s) => s.groupId === value) ?? (current?.groupId === value ? current : undefined);
  const uepName = selected?.uepScaleTypeId ? uepScales.data.find((t) => t.typeId === selected.uepScaleTypeId)?.name : undefined;

  const scaleLabel = (s: OccupationalGroup) =>
    [degreeNames.get(s.degreeId) ?? "Grado", s.level != null ? `Nivel ${s.level}` : null, s.rmu != null ? `$${s.rmu.toFixed(2)}` : null]
      .filter(Boolean)
      .join(" · ");
  const scaleOptions = useMemo(
    () => options.map((s) => ({ value: String(s.groupId), label: scaleLabel(s) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options, degreeNames],
  );

  return (
    <div className="space-y-2">
      {/* Grupo y grado lado a lado para ocupar menos alto */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Grupo ocupacional</Label>
          <SearchableSelect
            value={familyId != null ? String(familyId) : null}
            options={familyOptions}
            placeholder="(sin clasificar)"
            searchPlaceholder="Escriba para buscar el grupo…"
            emptyText="No hay grupos que coincidan."
            clearLabel="(sin clasificar)"
            isLoading={families.isLoading}
            disabled={disabled}
            ariaLabel="Grupo ocupacional del cargo"
            fallbackLabel={families.data.find((t) => t.typeId === familyId)?.name}
            onChange={(v) => {
              const next = v ? Number(v) : null;
              if (next === familyId) return;
              setFamilyId(next);
              // Al cambiar de grupo la escala anterior ya no corresponde: se elige de nuevo
              onChange(null);
            }}
          />
        </div>

        {familyId != null && (
          <div className="space-y-1">
            <Label className="text-sm font-medium">Grado y nivel</Label>
            <SearchableSelect
              value={value != null ? String(value) : null}
              options={scaleOptions}
              placeholder="Seleccione el grado"
              searchPlaceholder="Escriba el grado o el nivel…"
              emptyText="No hay grados que coincidan."
              isLoading={scales.isLoading}
              disabled={disabled}
              ariaLabel="Grado y nivel del cargo"
              fallbackLabel={current && current.groupId === value ? `${scaleLabel(current)} (inactiva)` : undefined}
              onChange={(v) => {
                if (v) onChange(Number(v));
              }}
            />
          </div>
        )}
      </div>

      {families.isError && <p className="text-xs text-destructive">No se pudieron cargar los grupos. Refresque la página.</p>}
      {scales.isError && <p className="text-xs text-destructive">No se pudieron cargar los grados del grupo. Intente de nuevo.</p>}
      {familyId != null && !scales.isLoading && !scales.isError && options.length === 0 && (
        <p className="text-xs text-muted-foreground">Este grupo todavía no tiene escalas; créelas en Escalas ocupacionales.</p>
      )}

      {selected && (
        <p className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{selected.description}</span>
          {" · "}Grado: {degreeNames.get(selected.degreeId) ?? "—"}
          {" · "}RMU ref.: {selected.rmu != null ? `$${selected.rmu.toFixed(2)}` : "—"}
          {uepName ? ` · UEP: ${uepName}` : ""}
        </p>
      )}
    </div>
  );
}
