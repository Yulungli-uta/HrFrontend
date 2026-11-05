import { Pencil, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { categoryLabel, dedicationLabel, levelLabel } from "@/lib/academicLabels";
import { categoryTone, levelIndex } from "@/lib/academicColors";
import { formatDate } from "@/lib/clock";
import type { TeacherRosterItemDto } from "@/lib/api";

interface TeacherRosterTableProps {
  items: TeacherRosterItemDto[];
  isLoading: boolean;
  /** Muestra la columna de RMU (el servidor igual solo la entrega con SALARY_HISTORY.READ). */
  showSalary: boolean;
  /** Si se entrega, cada fila ofrece "Actualizar estructura". */
  onEdit?: (item: TeacherRosterItemDto) => void;
}

const APPOINTMENT_LABELS: Record<string, string> = {
  NOMBRAMIENTO: "Nombramiento",
  PROVISIONAL: "Provisional",
  DESIGNACION: "Designación",
};

const money = (v: number): string => v.toLocaleString("es-EC", { style: "currency", currency: "USD" });
const date = (v: string | null): string => (v ? formatDate(v, "es-EC", { day: "2-digit", month: "short", year: "numeric" }) : "—");

function SalaryCell({ item }: { item: TeacherRosterItemDto }) {
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

export function TeacherRosterTable({ items, isLoading, showSalary, onEdit }: TeacherRosterTableProps) {
  const columns = 7 + (showSalary ? 1 : 0) + (onEdit ? 1 : 0);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Docente</TableHead>
            <TableHead className="hidden lg:table-cell">Dependencia</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="hidden sm:table-cell">Dedicación</TableHead>
            <TableHead className="hidden md:table-cell">N° Documento</TableHead>
            {showSalary && <TableHead className="text-right">RMU</TableHead>}
            <TableHead className="hidden md:table-cell">Estado</TableHead>
            <TableHead className="hidden xl:table-cell">Alertas</TableHead>
            {onEdit && <TableHead className="w-14 text-right"><span className="sr-only">Acciones</span></TableHead>}
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
                No hay docentes titulares que coincidan con los filtros.
              </TableCell>
            </TableRow>
          )}

          {items.map((item) => (
            <TableRow key={item.teacherStructureId}>
              <TableCell>
                <div className="font-medium leading-tight">{item.fullName}</div>
                <div className="text-xs text-muted-foreground font-mono">{item.idCard ?? "—"}</div>
                {/* En pantallas chicas las columnas de detalle se ocultan: se resumen bajo el nombre. */}
                <div className="lg:hidden text-xs text-muted-foreground mt-0.5">
                  {item.facultyName ?? item.departmentName ?? "—"}
                </div>
                <div className="sm:hidden text-xs text-muted-foreground">
                  {dedicationLabel(item.dedicationName)}
                  {item.weeklyClassHours != null ? ` · ${item.weeklyClassHours} h` : ""}
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm">
                <div>{item.facultyName ?? item.departmentName ?? "—"}</div>
                {item.facultyName && item.departmentName && item.departmentName !== item.facultyName && (
                  <div className="text-xs text-muted-foreground">{item.departmentName}</div>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {/* Categoría y nivel con color propio: el nivel sube de intensidad (1 → 2 → 3) para distinguirlo de un vistazo. */}
                <Badge className={`${categoryTone(item.categoryName).badge} font-semibold whitespace-nowrap`}>{categoryLabel(item.categoryName)}</Badge>
                <div className="mt-1">
                  <Badge className={`${categoryTone(item.categoryName).levels[levelIndex(item.levelName)]} text-[0.6875rem] px-2 py-0 whitespace-nowrap`}>
                    {levelLabel(item.levelName)}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm">
                <div>{dedicationLabel(item.dedicationName)}</div>
                {item.weeklyClassHours != null && (
                  <div className="text-xs text-muted-foreground">{item.weeklyClassHours} h/semana</div>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm">
                {item.appointmentActionNumber ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-mono text-xs cursor-help whitespace-nowrap">{item.appointmentActionNumber}</span>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      {item.appointmentKind ? (APPOINTMENT_LABELS[item.appointmentKind] ?? item.appointmentKind) : "Acción de personal"}
                      {item.appointmentDate ? ` · ${date(item.appointmentDate)}` : ""}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              {showSalary && (
                <TableCell className="text-right"><SalaryCell item={item} /></TableCell>
              )}
              <TableCell className="hidden md:table-cell">
                <Badge className={item.employeeIsActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>
                  {item.employeeIsActive ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <div className="flex flex-col gap-1 items-start">
                  {item.pendingScaleActionNumber && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="gap-1 text-[0.625rem] border-warning/50 text-warning cursor-help">
                          <ArrowUpRight className="h-3 w-3" />Acción posterior
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        {item.pendingScaleActionType} {item.pendingScaleActionNumber} ({date(item.pendingScaleActionDate)}) es
                        posterior a la estructura docente vigente. Revise si corresponde actualizarla.
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {item.ladderMismatch && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="gap-1 text-[0.625rem] border-warning/50 text-warning cursor-help">
                          <AlertTriangle className="h-3 w-3" />Cargo distinto
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        El escalón asignado al cargo del empleado no coincide con el de su estructura docente.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
              {onEdit && (
                <TableCell className="text-right">
                  {/* Un docente inactivo (renunciado) no tiene estructura que actualizar: solo se consulta. */}
                  {item.employeeIsActive && (
                    // Mismo patrón de acciones por fila que el resto del sistema (ej. Autoridades de Dependencia):
                    // botón ghost de icono, Pencil 3.5, resaltado primario y tooltip.
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                            aria-label={`Actualizar estructura docente de ${item.fullName}`}
                            onClick={() => onEdit(item)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Actualizar
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default TeacherRosterTable;
