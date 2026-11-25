import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/clock";
import type { EmployeePosition } from "@/lib/api";

const TYPE_TONE: Record<string, "primary" | "info" | "warning" | "neutral"> = {
  Principal: "primary",
  "Segundo régimen": "info",
  Autoridad: "warning",
  Temporal: "neutral",
};

/** Texto corto del cargo: nombre sin dedicación y, si la tiene, la dedicación. */
export function positionLabel(position: EmployeePosition): string {
  const job = position.jobBaseName || position.jobName || "Sin cargo";
  return position.dedicationName ? `${job} · ${position.dedicationName}` : job;
}

/** Resumen para la lista: la posición principal y, si hay más, la marca "+N". */
export function EmployeePositionSummary({ positions }: { positions?: EmployeePosition[] }) {
  if (!positions || positions.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
  const main = positions.find((p) => p.positionType === "Principal") ?? positions[0];
  const extra = positions.length - 1;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm text-muted-foreground">{positionLabel(main)}</span>
      {extra > 0 && <StatusBadge tone="info">+{extra} {extra === 1 ? "posición" : "posiciones"}</StatusBadge>}
    </div>
  );
}

/** Detalle de todas las posiciones vigentes del empleado, con su tipo, unidad, régimen y documento. */
export function EmployeePositionsList({ positions, isLoading }: { positions?: EmployeePosition[]; isLoading?: boolean }) {
  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando posiciones…</p>;
  if (!positions || positions.length === 0) return <p className="text-sm text-muted-foreground">Sin posiciones vigentes registradas.</p>;
  return (
    <ul className="space-y-2">
      {positions.map((p, index) => (
        <li key={`${p.positionType}-${p.documentNumber ?? index}`} className="rounded-md border border-border bg-card p-2.5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={TYPE_TONE[p.positionType] ?? "neutral"}>{p.positionType}</StatusBadge>
            {p.laborRegimeName && <span className="text-xs text-muted-foreground">{p.laborRegimeName}</span>}
          </div>
          <p className="mt-1 font-medium break-words">{p.jobBaseName || p.jobName || "Sin cargo registrado"}</p>
          <dl className="mt-1 grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-2">
            <div>Unidad: <span className="text-foreground">{p.departmentName ?? "—"}</span></div>
            {p.dedicationName && <div>Dedicación: <span className="text-foreground">{p.dedicationName}</span></div>}
            {p.modalityName && <div>Modalidad: <span className="text-foreground">{p.modalityName}{p.contractedHours ? ` (${p.contractedHours} h)` : ""}</span></div>}
            {p.documentNumber && <div>Documento: <span className="text-foreground">{p.documentNumber}</span></div>}
            {p.startDate && <div>Desde: <span className="text-foreground">{formatDate(p.startDate)}</span>{p.endDate ? <> hasta <span className="text-foreground">{formatDate(p.endDate)}</span></> : null}</div>}
          </dl>
        </li>
      ))}
    </ul>
  );
}
