import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { dedicationLabel } from "@/lib/academicLabels";
import { dedicationTone } from "@/lib/academicColors";
import { formatDate } from "@/lib/clock";
import { contractTypeLabel } from "@/components/teacher-roster/nonTitularLabels";
import type { NonTitularRosterItemDto } from "@/lib/api";

interface NonTitularRosterTableProps {
  items: NonTitularRosterItemDto[];
  isLoading: boolean;
  /** Muestra la columna de RMU (el servidor igual solo la entrega con SALARY_HISTORY.READ). */
  showSalary: boolean;
}

const money = (v: number): string => v.toLocaleString("es-EC", { style: "currency", currency: "USD" });
const date = (v: string | null): string => (v ? formatDate(v, "es-EC", { day: "2-digit", month: "short", year: "numeric" }) : "—");

function SalaryCell({ item }: { item: NonTitularRosterItemDto }) {
  if (item.rmu == null) return <span className="text-muted-foreground">—</span>;

  const status = item.rmuNeedsReview
    ? { text: "Revisar", cls: "bg-warning/15 text-warning" }
    : item.rmuInForce
      ? { text: "Vigente", cls: "bg-success/15 text-success" }
      : { text: "Último registrado", cls: "bg-muted text-muted-foreground" };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="tabular-nums font-medium">{money(item.rmu)}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${status.cls} text-[0.625rem] px-1.5 py-0 cursor-help`}>{status.text}</Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          {item.rmuSource ?? "Sin documento de origen"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function NonTitularRosterTable({ items, isLoading, showSalary }: NonTitularRosterTableProps) {
  const columns = 6 + (showSalary ? 1 : 0);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Docente</TableHead>
            <TableHead className="hidden lg:table-cell">Dependencia</TableHead>
            <TableHead className="hidden sm:table-cell">Dedicación</TableHead>
            <TableHead className="hidden md:table-cell">Contrato</TableHead>
            <TableHead className="hidden md:table-cell">Vigencia</TableHead>
            {showSalary && <TableHead className="text-right">RMU</TableHead>}
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && items.length === 0 &&
            [...Array(6)].map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={columns}><Skeleton className="h-9 w-full" /></TableCell>
              </TableRow>
            ))}

          {!isLoading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns} className="text-center text-sm text-muted-foreground py-10">
                No hay docentes no titulares que coincidan con los filtros.
              </TableCell>
            </TableRow>
          )}

          {items.map((item) => (
            <TableRow key={item.employeeId}>
              <TableCell>
                <div className="font-medium leading-tight">{item.fullName}</div>
                <div className="text-xs text-muted-foreground font-mono">{item.idCard ?? "—"}</div>
                {/* En pantallas chicas las columnas de detalle se ocultan: se resumen bajo el nombre. */}
                <div className="lg:hidden text-xs text-muted-foreground mt-0.5">
                  {item.facultyName ?? item.departmentName ?? "—"}
                </div>
                <div className="sm:hidden text-xs text-muted-foreground">
                  {item.dedicationName ? dedicationLabel(item.dedicationName) : "Sin modalidad"}
                  {item.contractedHours != null ? ` · ${item.contractedHours} h` : ""}
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm">
                <div>{item.facultyName ?? item.departmentName ?? "—"}</div>
                {item.facultyName && item.departmentName && item.departmentName !== item.facultyName && (
                  <div className="text-xs text-muted-foreground">{item.departmentName}</div>
                )}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm">
                {item.dedicationName ? (
                  <Badge className={`${dedicationTone(item.dedicationName).badge} font-semibold whitespace-nowrap`}>
                    {dedicationLabel(item.dedicationName)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Sin modalidad</span>
                )}
                {item.contractedHours != null && (
                  <div className="text-xs text-muted-foreground mt-0.5">{item.contractedHours} h/semana</div>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm">
                <div className="font-mono text-xs whitespace-nowrap">{item.contractCode || "—"}</div>
                <div className="text-xs text-muted-foreground">{contractTypeLabel(item.contractTypeName)}</div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm whitespace-nowrap">
                <div>{date(item.contractStartDate)}</div>
                <div className="text-xs text-muted-foreground">hasta {date(item.contractEndDate)}</div>
              </TableCell>
              {showSalary && (
                <TableCell className="text-right"><SalaryCell item={item} /></TableCell>
              )}
              <TableCell>
                <div className="flex flex-col gap-1 items-start">
                  <Badge className={item.contractState === "VIGENTE" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>
                    {item.contractState === "VIGENTE" ? "Vigente" : "Vencido"}
                  </Badge>
                  {!item.employeeIsActive && (
                    <Badge variant="outline" className="text-[0.625rem] border-warning/50 text-warning">Empleado inactivo</Badge>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default NonTitularRosterTable;
