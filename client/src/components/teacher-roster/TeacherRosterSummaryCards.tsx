import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TOTAL_TONE, categoryTone, dedicationTone, levelIndex, type AcademicTone,
} from "@/lib/academicColors";
import { categoryLabel, dedicationLabel, levelLabel } from "@/lib/academicLabels";
import { cn } from "@/lib/utils";
import type { TeacherRosterCountDto, TeacherRosterSummaryDto } from "@/lib/api";

interface TeacherRosterSummaryCardsProps {
  summary: TeacherRosterSummaryDto | undefined;
  isLoading: boolean;
  selectedCategoryId: number | null;
  selectedLevelId: number | null;
  selectedDedicationId: number | null;
  /** Hacer clic en una tarjeta aplica el filtro; volver a hacer clic lo quita. */
  onSelectCategory: (typeId: number | null) => void;
  /** Clic en una etiqueta de nivel: filtra por esa categoría y ese nivel (de nuevo: quita solo el nivel). */
  onSelectLevel: (categoryTypeId: number, levelTypeId: number | null) => void;
  onSelectDedication: (typeId: number | null) => void;
  onClearAll: () => void;
}

// Orden de progresión académica; un nombre desconocido va al final.
const CATEGORY_ORDER = ["TITULAR_AUXILIAR", "TITULAR_AGREGADO", "TITULAR_PRINCIPAL"];
const DEDICATION_ORDER = ["TC", "MT", "HORAS"];

const byOrder = (order: string[]) => (a: TeacherRosterCountDto, b: TeacherRosterCountDto) => {
  const ia = order.indexOf(a.name ?? "");
  const ib = order.indexOf(b.name ?? "");
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
};

export interface StatCardProps {
  label: string;
  value: number | undefined;
  tone: AcademicTone;
  loading: boolean;
  active?: boolean;
  hint?: string;
  onClick: () => void;
  /** Contenido bajo el número (etiquetas de nivel). Va fuera del botón principal para no anidar botones. */
  footer?: ReactNode;
}

export function StatCard({ label, value, tone, loading, active, hint, onClick, footer }: StatCardProps) {
  return (
    <Card
      className={cn(
        "border-l-4 shadow-sm transition-all",
        tone.card,
        active && cn("ring-2 shadow-md", tone.ring),
      )}
    >
      <button
        type="button"
        aria-pressed={!!active}
        onClick={onClick}
        className="w-full text-left px-4 pt-4 pb-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="h-9 w-16 mt-1" />
        ) : (
          <p className={cn("text-4xl font-extrabold tabular-nums leading-tight mt-0.5", tone.value)}>{value ?? 0}</p>
        )}
        {hint && !loading && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </button>
      {footer && <div className="px-4 pb-3 -mt-1">{footer}</div>}
    </Card>
  );
}

export function TeacherRosterSummaryCards({
  summary, isLoading, selectedCategoryId, selectedLevelId, selectedDedicationId,
  onSelectCategory, onSelectLevel, onSelectDedication, onClearAll,
}: TeacherRosterSummaryCardsProps) {
  const categories = [...(summary?.byCategory ?? [])].sort(byOrder(CATEGORY_ORDER));
  const dedications = [...(summary?.byDedication ?? [])].sort(byOrder(DEDICATION_ORDER));

  /** Niveles de una categoría, de menor a mayor (Nivel 1, Nivel 2…). */
  const levelsOf = (categoryTypeId: number | null) =>
    (summary?.byCategoryLevel ?? [])
      .filter((l) => l.parentTypeId === categoryTypeId)
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  return (
    <div className="space-y-3 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total de titulares"
          value={summary?.total}
          tone={TOTAL_TONE}
          loading={isLoading}
          hint={summary ? `${summary.activeCount} activos · ${summary.inactiveCount} inactivos` : undefined}
          active={selectedCategoryId == null && selectedDedicationId == null}
          onClick={onClearAll}
        />
        {categories.map((c) => {
          const tone = categoryTone(c.name);
          return (
            <StatCard
              key={c.typeId ?? "none"}
              label={categoryLabel(c.name)}
              value={c.total}
              tone={tone}
              loading={isLoading}
              active={selectedCategoryId === c.typeId && selectedLevelId == null}
              onClick={() => onSelectCategory(selectedCategoryId === c.typeId && selectedLevelId == null ? null : c.typeId)}
              footer={
                !isLoading && c.typeId != null && (
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Niveles de ${categoryLabel(c.name)}`}>
                    {levelsOf(c.typeId).map((l) => {
                      const selected = selectedCategoryId === c.typeId && selectedLevelId === l.typeId;
                      return (
                        <button
                          key={l.typeId ?? "none"}
                          type="button"
                          aria-pressed={selected}
                          title={`Filtrar ${categoryLabel(c.name)} · ${l.name ? levelLabel(l.name) : "Sin nivel"}`}
                          onClick={() => onSelectLevel(c.typeId!, selected ? null : l.typeId)}
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums transition-shadow",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            tone.levels[levelIndex(l.name)],
                            selected && cn("ring-2", tone.ring),
                          )}
                        >
                          {l.name ? levelLabel(l.name) : "Sin nivel"} · {l.total}
                        </button>
                      );
                    })}
                  </div>
                )
              }
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {dedications.map((d) => (
          <StatCard
            key={d.typeId ?? "none"}
            label={dedicationLabel(d.name)}
            value={d.total}
            tone={dedicationTone(d.name)}
            loading={isLoading}
            active={selectedDedicationId === d.typeId}
            onClick={() => onSelectDedication(selectedDedicationId === d.typeId ? null : d.typeId)}
          />
        ))}
      </div>
    </div>
  );
}

export default TeacherRosterSummaryCards;
