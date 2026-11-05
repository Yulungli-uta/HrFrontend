import { TOTAL_TONE, categoryTone, dedicationTone } from "@/lib/academicColors";
import { dedicationLabel } from "@/lib/academicLabels";
import type { NonTitularRosterSummaryDto, TeacherRosterCountDto } from "@/lib/api";
import { StatCard } from "@/components/teacher-roster/TeacherRosterSummaryCards";
import { contractTypeLabel } from "@/components/teacher-roster/nonTitularLabels";

interface NonTitularRosterSummaryCardsProps {
  summary: NonTitularRosterSummaryDto | undefined;
  isLoading: boolean;
  selectedDedicationId: number | null;
  selectedContractTypeId: number | null;
  /** Hacer clic en una tarjeta aplica el filtro; volver a hacer clic lo quita. */
  onSelectDedication: (typeId: number | null) => void;
  onSelectContractType: (typeId: number | null) => void;
  onClearAll: () => void;
}

const DEDICATION_ORDER = ["TC", "MT", "HORAS"];

const byDedicationOrder = (a: TeacherRosterCountDto, b: TeacherRosterCountDto) => {
  const ia = DEDICATION_ORDER.indexOf(a.name ?? "");
  const ib = DEDICATION_ORDER.indexOf(b.name ?? "");
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
};

// Un solo tono para todos los tipos de contrato: lo que distingue a cada tarjeta es su nombre, no un color propio.
const CONTRACT_TYPE_TONE = categoryTone("TITULAR_AGREGADO");

/** Tarjetas de la pestaña "No titulares". Cada grupo cuenta con los filtros activos menos el suyo (lo calcula el servidor). */
export function NonTitularRosterSummaryCards({
  summary, isLoading, selectedDedicationId, selectedContractTypeId,
  onSelectDedication, onSelectContractType, onClearAll,
}: NonTitularRosterSummaryCardsProps) {
  const dedications = [...(summary?.byDedication ?? [])].sort(byDedicationOrder);
  const contractTypes = summary?.byContractType ?? [];

  return (
    <div className="space-y-3 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total de no titulares"
          value={summary?.total}
          tone={TOTAL_TONE}
          loading={isLoading}
          hint={summary ? `${summary.vigenteCount} vigentes · ${summary.vencidoCount} vencidos` : undefined}
          active={selectedDedicationId == null && selectedContractTypeId == null}
          onClick={onClearAll}
        />
        {contractTypes.map((c) => (
          <StatCard
            key={c.typeId ?? "none"}
            label={c.name ? contractTypeLabel(c.name) : "Sin tipo de contrato"}
            value={c.total}
            tone={CONTRACT_TYPE_TONE}
            loading={isLoading}
            active={c.typeId != null && selectedContractTypeId === c.typeId}
            onClick={() => {
              if (c.typeId != null) onSelectContractType(selectedContractTypeId === c.typeId ? null : c.typeId);
            }}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {dedications.map((d) => (
          <StatCard
            key={d.typeId ?? "none"}
            label={d.name ? dedicationLabel(d.name) : "Sin modalidad"}
            value={d.total}
            tone={dedicationTone(d.name)}
            loading={isLoading}
            active={d.typeId != null && selectedDedicationId === d.typeId}
            hint={d.name ? undefined : "El contrato no tiene modalidad"}
            onClick={() => {
              if (d.typeId != null) onSelectDedication(selectedDedicationId === d.typeId ? null : d.typeId);
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default NonTitularRosterSummaryCards;
