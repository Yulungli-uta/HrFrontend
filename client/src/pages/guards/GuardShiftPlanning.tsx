//src/pages/guards/GuardShiftPlanning.tsx
import { useState, Fragment } from 'react';
import {
  Calendar, RefreshCw, Zap, AlertTriangle, CheckCircle2, X,
  MapPin, Users, ChevronDown, ChevronRight, Info, ArrowLeftRight, Building2, UserPlus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  useGuardCalendar, usePlanningMutations,
  useGuardRotationGroups, useGuardLocationsAssignable,
  useScheduleBoard, usePlanningDetail,
} from '@/hooks/guards/useGuards';
import { ShiftReplacementDialog } from '@/components/guards/ShiftReplacementDialog';
import { ManualShiftAssignDialog } from '@/components/guards/ManualShiftAssignDialog';
import { GuardReadinessPanel } from '@/components/guards/GuardReadinessPanel';
import type {
  ScheduleBoardFilterDto, GeneratePreviewRequestDto,
  GeneratePreviewResponseDto,
} from '@/types/guards';

// ─── Constantes de colores y etiquetas ───────────────────────────────────────

const CELL_COLORS: Record<string, string> = {
  PLANNED:   'bg-blue-100 text-blue-800 border-blue-200',
  CONFIRMED: 'bg-green-100 text-green-800 border-green-200',
  REPLACED:  'bg-purple-100 text-purple-800 border-purple-200',
  CANCELLED: 'bg-gray-100 text-gray-400 border-gray-200',
  UNCOVERED: 'bg-red-100 text-red-700 border-red-200',
  COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ABSENT:    'bg-orange-100 text-orange-700 border-orange-200',
};

// Fallback palette cuando un grupo no tiene colorCode definido
const FALLBACK_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#f43f5e',
  '#0ea5e9', '#8b5cf6', '#f97316', '#14b8a6',
];

function hexToGroupStyle(hex: string) {
  // Genera bg claro + texto oscuro + borde a partir del hex del grupo
  return { backgroundColor: hex + '22', color: hex, borderColor: hex + '88' };
}

// Construye mapa groupId → { hex, name } garantizando colores únicos.
// Si dos grupos comparten el mismo colorCode, al segundo se le asigna un fallback.
function buildGroupMeta(rows: import('@/types/guards').ScheduleBoardRowDto[]) {
  const map = new Map<number, { name: string; hex: string }>();
  const usedColors = new Set<string>();
  let fallbackIdx = 0;

  for (const row of rows) {
    for (const cell of row.cells) {
      for (const emp of cell.employees) {
        if (emp.groupId == null || map.has(emp.groupId)) continue;
        let hex = emp.groupColorCode?.trim() ?? '';
        if (!hex || usedColors.has(hex.toLowerCase())) {
          // buscar fallback no usado
          while (usedColors.has(FALLBACK_COLORS[fallbackIdx % FALLBACK_COLORS.length].toLowerCase())) {
            fallbackIdx++;
          }
          hex = FALLBACK_COLORS[fallbackIdx % FALLBACK_COLORS.length];
          fallbackIdx++;
        }
        usedColors.add(hex.toLowerCase());
        map.set(emp.groupId, { name: emp.groupName ?? `Grupo ${emp.groupId}`, hex });
      }
    }
  }
  return map;
}

const SHIFT_ORDER = ['M', 'T', 'N'];
const SHIFT_LABEL: Record<string, string> = { M: 'Mañana', T: 'Tarde', N: 'Noche' };
const SHIFT_HEADER_COLOR: Record<string, string> = {
  M: 'bg-yellow-400 text-yellow-900',
  T: 'bg-orange-400 text-orange-900',
  N: 'bg-slate-600 text-slate-100',
};

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PLANNED:   'default',
  CONFIRMED: 'default',
  REPLACED:  'secondary',
  CANCELLED: 'outline',
  UNCOVERED: 'destructive',
  COMPLETED: 'default',
  ABSENT:    'destructive',
};

const STATUS_LABEL: Record<string, string> = {
  PLANNED:   'Planificado',
  CONFIRMED: 'Confirmado',
  REPLACED:  'Reemplazado',
  CANCELLED: 'Cancelado',
  UNCOVERED: 'Sin cobertura',
  COMPLETED: 'Completado',
  ABSENT:    'Ausente',
};

const SCHEDULE_LABEL: Record<string, string> = {
  M: 'Mañana',
  T: 'Tarde',
  N: 'Noche',
};

// ─── Utilidades ───────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split('T')[0]; }
function addDays(d: string, n: number) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().split('T')[0];
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
}
function fmtDateFull(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-EC', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Utilidades de jerarquía de ubicaciones ──────────────────────────────────

type BoardRow = import('@/types/guards').ScheduleBoardRowDto;

type LocationHierarchyGroup = {
  parentRow: BoardRow | null;     // null = padre virtual (sin guardias propios en el tablero)
  parentId: number;
  parentCode: string | null;
  parentName: string;
  children: BoardRow[];
};

/**
 * Construye grupos jerárquicos a partir de las filas de un turno.
 * Conecta la fila-padre con sus filas-hija en un mismo grupo visual.
 */
function buildLocationHierarchy(rows: BoardRow[]): {
  groups: LocationHierarchyGroup[];
  standaloneRows: BoardRow[];
} {
  // Índice rápido por locationId
  const rowById = new Map<number, BoardRow>();
  for (const r of rows) rowById.set(r.locationId, r);

  // Agrupar hijos por su parentLocationId
  const childrenByParent = new Map<number, BoardRow[]>();
  for (const r of rows) {
    if (r.parentLocationId != null) {
      if (!childrenByParent.has(r.parentLocationId))
        childrenByParent.set(r.parentLocationId, []);
      childrenByParent.get(r.parentLocationId)!.push(r);
    }
  }

  // locationIds que son referenciados como padre por alguna fila
  const referencedParentIds = new Set(childrenByParent.keys());

  // Construir grupos: un grupo por cada padre referenciado
  const groups: LocationHierarchyGroup[] = Array.from(childrenByParent.entries())
    .map(([parentId, children]) => {
      const parentRow = rowById.get(parentId) ?? null;
      return {
        parentRow,
        parentId,
        parentCode: parentRow?.locationCode ?? null,
        parentName: parentRow?.locationName ?? children[0]?.parentLocationName ?? '',
        children: [...children].sort((a, b) => a.locationName.localeCompare(b.locationName)),
      };
    })
    .sort((a, b) => a.parentName.localeCompare(b.parentName));

  // Filas independientes: sin padre Y no referenciadas como padre por nadie
  const standaloneRows = rows
    .filter(r => r.parentLocationId == null && !referencedParentIds.has(r.locationId))
    .sort((a, b) => a.locationName.localeCompare(b.locationName));

  return { groups, standaloneRows };
}

/**
 * Renderiza las celdas de fecha de una fila del tablero.
 */
function BoardCells({
  cells,
  groupMeta,
  onCellClick,
}: {
  cells: import('@/types/guards').ScheduleBoardCellDto[];
  groupMeta: Map<number, { name: string; hex: string }>;
  onCellClick: (planningId: number) => void;
}) {
  return (
    <>
      {cells.map(cell => {
        const isEmpty = cell.employees.length === 0;
        // Badge de estado post-proceso solo cuando el job ya corrió
        const postStatus = (cell.status === 'COMPLETED' || cell.status === 'ABSENT' || cell.status === 'CANCELLED')
          ? cell.status : null;
        return (
          <td
            key={cell.date}
            className={`border px-1 py-1 align-top min-w-[90px] max-w-[130px] ${isEmpty ? 'bg-red-50 dark:bg-transparent' : ''}`}
          >
            {isEmpty ? (
              <span className="text-red-500 dark:text-red-400 font-medium text-[10px]">Sin cobertura</span>
            ) : (
              <div className="flex flex-col gap-0.5">
                {/* Badge de estado post-proceso */}
                {postStatus && (
                  <span className={`self-start px-1 py-0 rounded text-[9px] font-bold border mb-0.5 ${CELL_COLORS[postStatus] ?? ''}`}>
                    {STATUS_LABEL[postStatus] ?? postStatus}
                  </span>
                )}
                {cell.employees.map(emp => {
                  const meta = emp.groupId != null ? groupMeta.get(emp.groupId) : null;
                  return (
                    <button
                      key={emp.planningId}
                      onClick={() => onCellClick(emp.planningId)}
                      className={`w-full text-left px-1.5 py-0.5 rounded border text-[10px] font-medium truncate transition-opacity hover:opacity-75 ${emp.isReplacement ? 'ring-1 ring-purple-400' : ''}`}
                      style={meta ? hexToGroupStyle(meta.hex) : { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#d1d5db' }}
                      title={`${emp.fullName}${emp.groupName ? ` — ${emp.groupName}` : ''} · ${STATUS_LABEL[cell.status] ?? cell.status}`}
                    >
                      {emp.isReplacement && <span className="font-bold mr-0.5" style={{ color: '#7c3aed' }}>R</span>}
                      {emp.fullName.split(' ').slice(0, 2).join(' ')}
                    </button>
                  );
                })}
              </div>
            )}
          </td>
        );
      })}
    </>
  );
}

// ─── Componente: board agrupado por turno → ubicación ────────────────────────

function ShiftBoard({
  board,
  onCellClick,
}: {
  board: import('@/types/guards').ScheduleBoardResponseDto;
  onCellClick: (planningId: number) => void;
}) {
  const groupMeta = buildGroupMeta(board.rows);

  // Agrupa filas por scheduleCode, luego ordena shifts M → T → N
  const byShift = new Map<string, BoardRow[]>();
  for (const row of board.rows) {
    const code = row.scheduleCode || 'X';
    if (!byShift.has(code)) byShift.set(code, []);
    byShift.get(code)!.push(row);
  }

  const shiftCodes = [
    ...SHIFT_ORDER.filter(s => byShift.has(s)),
    ...[...byShift.keys()].filter(s => !SHIFT_ORDER.includes(s)),
  ];

  return (
    <div className="space-y-1">
      {/* Leyenda de grupos */}
      {groupMeta.size > 0 && (
        <div className="flex flex-wrap gap-2 px-3 py-2 border-b text-xs">
          {[...groupMeta.entries()].map(([groupId, { name, hex }]) => (
            <span
              key={groupId}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium text-[11px]"
              style={hexToGroupStyle(hex)}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />
              {name}
            </span>
          ))}
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-purple-700 bg-purple-50 border-purple-300 font-medium text-[11px]">
            <span className="w-2 h-2 rounded-full bg-purple-500" />R Reemplazo
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted/60">
              <th className="border px-3 py-2 text-left sticky left-0 bg-muted z-10 min-w-[180px]">Turno / Ubicación</th>
              {board.dates.map(d => (
                <th key={d} className="border px-1 py-2 text-center min-w-[90px] font-medium whitespace-nowrap">
                  {fmtDate(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shiftCodes.map(shiftCode => {
              const rows = byShift.get(shiftCode)!;
              const headerColor = SHIFT_HEADER_COLOR[shiftCode] ?? 'bg-gray-400 text-gray-100';
              const { groups, standaloneRows } = buildLocationHierarchy(rows);

              return (
                <Fragment key={shiftCode}>
                  {/* Encabezado de turno (Mañana / Tarde / Noche) */}
                  <tr>
                    <td
                      colSpan={board.dates.length + 1}
                      className={`px-3 py-1.5 font-bold text-xs uppercase tracking-wider ${headerColor}`}
                    >
                      {SHIFT_LABEL[shiftCode] ?? shiftCode}
                    </td>
                  </tr>

                  {/* Grupos jerárquicos: fila padre + hijos indentados */}
                  {groups.map(group => (
                    <Fragment key={`grp-${group.parentId}`}>

                      {/* Fila de la ubicación padre (con sus propios guardias) */}
                      {group.parentRow ? (
                        <tr className="hover:bg-muted/20 bg-muted/10">
                          <td className="border px-3 py-2 sticky left-0 bg-muted/10 dark:bg-muted/20 z-10 font-semibold">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                              <span className="truncate max-w-[130px]">
                                {group.parentCode ? `[${group.parentCode}] ` : ''}{group.parentName}
                              </span>
                            </div>
                          </td>
                          <BoardCells cells={group.parentRow.cells} groupMeta={groupMeta} onCellClick={onCellClick} />
                        </tr>
                      ) : (
                        /* Header virtual: padre sin guardias propios en el tablero */
                        <tr>
                          <td
                            colSpan={board.dates.length + 1}
                            className="px-3 py-1.5 bg-muted/20 dark:bg-muted/10 border-l-[3px] border-l-primary/40"
                          >
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/80">
                              <Building2 className="h-3 w-3 shrink-0" />
                              {group.parentCode ? `[${group.parentCode}] ` : ''}{group.parentName}
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Ubicaciones hijas — indentadas con indicador ↳ */}
                      {group.children.map(child => (
                        <tr key={child.rowKey} className="hover:bg-muted/20">
                          <td className="border px-3 py-2 sticky left-0 bg-background z-10 font-medium">
                            <div className="flex items-center gap-1 pl-3">
                              <span className="text-muted-foreground/60 text-[11px] shrink-0 select-none">↳</span>
                              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[110px]">
                                {child.locationCode ? `[${child.locationCode}] ` : ''}{child.locationName}
                              </span>
                            </div>
                          </td>
                          <BoardCells cells={child.cells} groupMeta={groupMeta} onCellClick={onCellClick} />
                        </tr>
                      ))}
                    </Fragment>
                  ))}

                  {/* Filas independientes: sin padre y sin hijos en el tablero */}
                  {standaloneRows.map(row => (
                    <tr key={row.rowKey} className="hover:bg-muted/20">
                      <td className="border px-3 py-2 sticky left-0 bg-background z-10 font-medium">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[130px]">
                            {row.locationCode ? `[${row.locationCode}] ` : ''}{row.locationName}
                          </span>
                        </div>
                      </td>
                      <BoardCells cells={row.cells} groupMeta={groupMeta} onCellClick={onCellClick} />
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Componente: panel de detalle ─────────────────────────────────────────────

function PlanningDetailPanel({ planningId, onClose }: { planningId: number | null; onClose: () => void }) {
  const { data, isLoading } = usePlanningDetail(planningId);
  const detail = data?.status === 'success' ? data.data : null;
  const [showReplacement, setShowReplacement] = useState(false);

  return (
    <>
      <Sheet open={planningId !== null} onOpenChange={open => !open && onClose()}>
        <SheetContent className="w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalle del turno</SheetTitle>
          </SheetHeader>

          {isLoading && <p className="text-sm text-muted-foreground mt-4">Cargando…</p>}

          {detail && (
            <div className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <InfoRow label="Fecha" value={fmtDateFull(detail.workDate)} />
                <InfoRow label="Turno" value={`${detail.scheduleCode ?? ''} — ${detail.scheduleName}`} />
                <InfoRow label="Guardia" value={detail.employeeFullName} />
                <InfoRow label="Estado" value={STATUS_LABEL[detail.status] ?? detail.status} />
                <InfoRow label="Ubicación" value={`${detail.locationCode ? `[${detail.locationCode}] ` : ''}${detail.locationName}`} />
                <InfoRow label="Grupo" value={detail.groupName ?? '—'} />
              </div>

              {detail.patternSequence && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Patrón</p>
                  <div className="flex gap-0.5">
                    {detail.patternSequence.split('').map((ch, i) => (
                      <span
                        key={i}
                        className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded border
                          ${i + 1 === (detail.cycleDay ?? -1) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-muted-foreground/20'}`}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Día del ciclo: {detail.cycleDay ?? '—'}</p>
                </div>
              )}

              {detail.hasActiveReplacement && (
                <div className="rounded border border-purple-200 bg-purple-50 p-2">
                  <p className="text-xs font-semibold text-purple-700">Reemplazante activo</p>
                  <p className="text-xs text-purple-600">{detail.activeReplacementEmployeeName}</p>
                </div>
              )}

              {detail.validations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Validaciones</p>
                  <div className="space-y-1">
                    {detail.validations.map((v, i) => (
                      <div key={i} className={`rounded p-1.5 text-xs border
                        ${v.severity === 'BLOCKING' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
                        <span className="font-medium">[{v.validationType}]</span> {v.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.notes && (
                <InfoRow label="Notas" value={detail.notes} />
              )}

              <div className="flex gap-2 pt-2">
                {detail.status !== 'CANCELLED' && detail.status !== 'REPLACED' && (
                  <Button
                    size="sm" variant="secondary" className="flex-1"
                    onClick={() => setShowReplacement(true)}
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
                    Solicitar reemplazo
                  </Button>
                )}
                <Button size="sm" variant="outline" className="flex-1" onClick={onClose}>Cerrar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ShiftReplacementDialog
        open={showReplacement}
        detail={detail}
        onClose={() => setShowReplacement(false)}
      />
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</p>
      <p className="text-xs">{value}</p>
    </div>
  );
}

// ─── Componente: dialog de generación preview/confirm ────────────────────────

type GenStep = 'form' | 'preview' | 'done';

function GenerateDialog({
  open, onClose,
  groups, locations,
}: {
  open: boolean;
  onClose: () => void;
  groups: { groupId: number; name: string }[];
  locations: { locationId: number; locationCode: string | null; locationName: string }[];
}) {
  const today = todayStr();
  const [step, setStep] = useState<GenStep>('form');
  const [previewData, setPreviewData] = useState<GeneratePreviewResponseDto | null>(null);
  const [form, setForm] = useState<GeneratePreviewRequestDto>({
    startDate: today,
    endDate: addDays(today, 29),
    locationId: undefined,
    groupId: undefined,
    mode: 'ALL_GROUPS',
    includeRestDays: false,
    regenerateMode: 'SKIP_EXISTING',
  });

  const { preview, confirm } = usePlanningMutations(() => { setStep('done'); });

  const isStartDateInvalid = !form.startDate || form.startDate < today;
  const isEndDateInvalid = !form.endDate || (form.startDate && form.endDate < form.startDate);
  const isFormInvalid = isStartDateInvalid || isEndDateInvalid
    || (form.mode === 'BY_GROUP' && !form.groupId)
    || (form.mode === 'BY_LOCATION' && !form.locationId);

  const handlePreview = () => {
    preview.mutate(form, {
      onSuccess: (r) => {
        if (r.status === 'success') { setPreviewData(r.data); setStep('preview'); }
      },
    });
  };

  const handleConfirm = () => {
    confirm.mutate(form);
  };

  const handleClose = () => {
    setStep('form');
    setPreviewData(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generar planificación automática</DialogTitle>
        </DialogHeader>

        {/* Paso 1: formulario */}
        {step === 'form' && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Modo</Label>
                <select
                  className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
                  value={form.mode}
                  onChange={e => {
                    const mode = e.target.value as GeneratePreviewRequestDto['mode'];
                    setForm(f => ({
                      ...f,
                      mode,
                      groupId: mode !== 'BY_GROUP' ? undefined : f.groupId,
                      locationId: mode !== 'BY_LOCATION' ? undefined : f.locationId,
                    }));
                  }}
                >
                  <option value="BY_GROUP">Por grupo</option>
                  <option value="ALL_GROUPS">Todos los grupos</option>
                  <option value="BY_LOCATION">Por ubicación</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Regenerar</Label>
                <select
                  className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
                  value={form.regenerateMode}
                  onChange={e => setForm(f => ({ ...f, regenerateMode: e.target.value as GeneratePreviewRequestDto['regenerateMode'] }))}
                >
                  <option value="SKIP_EXISTING">Omitir existentes</option>
                  <option value="CANCEL_AND_RECREATE">Cancelar y recrear</option>
                </select>
              </div>
            </div>

            {(form.mode === 'BY_GROUP') && (
              <div>
                <Label className="text-xs">Grupo *</Label>
                <select
                  className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
                  value={form.groupId ?? ''}
                  onChange={e => setForm(f => ({ ...f, groupId: Number(e.target.value) || undefined }))}
                >
                  <option value="">Seleccionar grupo…</option>
                  {groups.map(g => <option key={g.groupId} value={g.groupId}>{g.name}</option>)}
                </select>
              </div>
            )}

            {form.mode === 'BY_LOCATION' && (
              <div>
                <Label className="text-xs">Ubicación *</Label>
                <select
                  className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
                  value={form.locationId ?? ''}
                  onChange={e => setForm(f => ({ ...f, locationId: Number(e.target.value) || undefined }))}
                >
                  <option value="">Seleccionar ubicación…</option>
                  {locations.map(l => (
                    <option key={l.locationId} value={l.locationId}>
                      {l.locationCode ? `${l.locationCode} — ` : ''}{l.locationName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Desde *</Label>
                <Input
                  type="date"
                  min={today}
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                />
                {isStartDateInvalid && form.startDate && (
                  <p className="text-[10px] text-destructive mt-1">La fecha no puede ser anterior a hoy.</p>
                )}
              </div>
              <div>
                <Label className="text-xs">Hasta *</Label>
                <Input
                  type="date"
                  min={form.startDate || today}
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                />
                {isEndDateInvalid && form.endDate && (
                  <p className="text-[10px] text-destructive mt-1">No puede ser anterior a la fecha de inicio.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Incluir días libres en vista previa</Label>
              <Switch
                checked={form.includeRestDays}
                onCheckedChange={v => setForm(f => ({ ...f, includeRestDays: v }))}
              />
            </div>
          </div>
        )}

        {/* Paso 2: preview */}
        {step === 'preview' && previewData && (
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <Stat label="A generar" value={previewData.totalToGenerate} color="blue" />
              <Stat label="Omitidos" value={previewData.willSkip} color="yellow" />
              <Stat label="Conflictos" value={previewData.conflicts} color="red" />
            </div>

            {previewData.conflicts > 0 && (
              <div className="space-y-1 text-xs max-h-48 overflow-y-auto border rounded p-2 bg-muted/30">
                <p className="font-semibold text-muted-foreground mb-1">Detalle de conflictos</p>
                {previewData.items.filter(i => i.hasConflict).slice(0, 30).map((item, idx) => (
                  <div key={idx} className="text-red-700">
                    <span className="font-medium">{item.workDate}</span> — {item.employeeFullName}: [{item.conflictType}] {item.conflictMessage}
                  </div>
                ))}
                {previewData.items.filter(i => i.hasConflict).length > 30 && (
                  <p className="text-muted-foreground">…y {previewData.items.filter(i => i.hasConflict).length - 30} más</p>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Se guardarán <strong>{previewData.totalToGenerate}</strong> turnos válidos.
              {previewData.willSkip > 0 && ` Se omitirán ${previewData.willSkip} ya existentes.`}
            </p>
          </div>
        )}

        {/* Paso 3: done */}
        {step === 'done' && (
          <div className="py-4 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <p className="font-medium">Generación confirmada</p>
            <p className="text-sm text-muted-foreground">El cronograma ha sido actualizado.</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {step === 'done' ? 'Cerrar' : 'Cancelar'}
          </Button>
          {step === 'form' && (
            <Button
              onClick={handlePreview}
              disabled={preview.isPending || isFormInvalid}
            >
              {preview.isPending ? 'Calculando…' : 'Vista previa'}
            </Button>
          )}
          {step === 'preview' && (
            <Button
              onClick={handleConfirm}
              disabled={confirm.isPending || previewData?.totalToGenerate === 0}
            >
              {confirm.isPending ? 'Guardando…' : `Confirmar ${previewData?.totalToGenerate ?? 0} turnos`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: 'blue' | 'yellow' | 'red' | 'green' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
  };
  return (
    <div className={`rounded p-2 ${colors[color]}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function GuardShiftPlanningPage() {
  const today = todayStr();

  const [boardFilter, setBoardFilter] = useState<ScheduleBoardFilterDto>({
    startDate: today,
    endDate: addDays(today, 13),
    viewMode: 'BY_LOCATION',
  });

  const [showGenDialog,    setShowGenDialog]    = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [selectedPlanningId, setSelectedPlanningId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('cronograma');

  const { data: boardResp, isLoading: boardLoading, refetch } = useScheduleBoard(boardFilter);
  const { data: calendarResp, isLoading: calLoading } = useGuardCalendar(
    { startDate: boardFilter.startDate, endDate: boardFilter.endDate }, true
  );
  const { data: groupsResp } = useGuardRotationGroups();
  const { data: locationsResp } = useGuardLocationsAssignable();

  const board = boardResp?.status === 'success' ? boardResp.data : null;
  const items = calendarResp?.status === 'success' ? calendarResp.data : [];
  const groups = groupsResp?.status === 'success' ? groupsResp.data : [];
  const locations = locationsResp?.status === 'success' ? locationsResp.data : [];

  const conflicts = items.filter(
    i => i.status === 'CANCELLED' || i.hasPermissionConflict || i.hasVacationConflict || i.hasValidationWarning
  );
  const isLoading = boardLoading || calLoading;

  return (
    <div className="p-6 space-y-4">

      {/* Pre-requisitos de configuración */}
      <GuardReadinessPanel targetDate={boardFilter.startDate} />

      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Planificación de Turnos</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowManualDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Asignar guardia
          </Button>
          <Button size="sm" onClick={() => setShowGenDialog(true)}>
            <Zap className="h-4 w-4 mr-2" />
            Generar turnos
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs">Desde</Label>
              <Input type="date" className="w-36" value={boardFilter.startDate}
                onChange={e => setBoardFilter(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Hasta</Label>
              <Input type="date" className="w-36" value={boardFilter.endDate}
                onChange={e => setBoardFilter(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Ubicación</Label>
              <select
                className="h-9 border rounded-md px-3 text-sm bg-background"
                value={boardFilter.locationId ?? ''}
                onChange={e => setBoardFilter(f => ({ ...f, locationId: Number(e.target.value) || undefined }))}
              >
                <option value="">Todas</option>
                {locations.map(l => <option key={l.locationId} value={l.locationId}>{l.locationName}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Grupo</Label>
              <select
                className="h-9 border rounded-md px-3 text-sm bg-background"
                value={boardFilter.groupId ?? ''}
                onChange={e => setBoardFilter(f => ({ ...f, groupId: Number(e.target.value) || undefined }))}
              >
                <option value="">Todos</option>
                {groups.map(g => <option key={g.groupId} value={g.groupId}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Turno</Label>
              <select
                className="h-9 border rounded-md px-3 text-sm bg-background"
                value={boardFilter.scheduleCode ?? ''}
                onChange={e => setBoardFilter(f => ({ ...f, scheduleCode: e.target.value || undefined }))}
              >
                <option value="">Todos</option>
                <option value="M">Mañana</option>
                <option value="T">Tarde</option>
                <option value="N">Noche</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Estado</Label>
              <select
                className="h-9 border rounded-md px-3 text-sm bg-background"
                value={boardFilter.status ?? ''}
                onChange={e => setBoardFilter(f => ({ ...f, status: e.target.value || undefined }))}
              >
                <option value="">Todos</option>
                <option value="PLANNED">Planificado</option>
                <option value="CONFIRMED">Confirmado</option>
                <option value="REPLACED">Reemplazado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cronograma">
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            Por ubicación
          </TabsTrigger>
          <TabsTrigger value="guardias">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Por guardia
          </TabsTrigger>
          <TabsTrigger value="conflictos">
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
            Conflictos
            {conflicts.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] px-1">{conflicts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Cronograma por turno / ubicación ── */}
        <TabsContent value="cronograma">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                Cronograma por turno y ubicación
                {isLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!board || board.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {isLoading ? 'Cargando cronograma…' : 'No hay planificaciones en el rango seleccionado.'}
                </p>
              ) : (
                <ShiftBoard board={board} onCellClick={setSelectedPlanningId} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Cronograma por guardia ── */}
        <TabsContent value="guardias">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cronograma por guardia</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {calLoading ? 'Cargando…' : 'No hay turnos en el rango seleccionado.'}
                </p>
              ) : (
                <GuardCronograma items={items} onCellClick={setSelectedPlanningId} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Conflictos ── */}
        <TabsContent value="conflictos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registros con conflicto o cancelados</CardTitle>
            </CardHeader>
            <CardContent>
              {conflicts.length === 0 ? (
                <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground text-sm">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Sin conflictos en el rango seleccionado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Guardia</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Turno</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Alertas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conflicts.map(item => (
                      <TableRow
                        key={item.planningId}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => setSelectedPlanningId(item.planningId)}
                      >
                        <TableCell className="font-mono text-xs">{item.workDate}</TableCell>
                        <TableCell className="text-sm">{item.employeeFullName}</TableCell>
                        <TableCell className="text-xs">{item.locationName}</TableCell>
                        <TableCell className="text-xs">{item.scheduleDescription}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE_VARIANT[item.status] ?? 'outline'}>
                            {STATUS_LABEL[item.status] ?? item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {item.hasPermissionConflict && <Badge variant="destructive" className="text-[10px] px-1">Permiso</Badge>}
                            {item.hasVacationConflict && <Badge variant="destructive" className="text-[10px] px-1">Vacación</Badge>}
                            {item.hasValidationWarning && <Badge variant="outline" className="text-[10px] px-1 border-yellow-400 text-yellow-700">Alerta</Badge>}
                            {item.hasReplacement && <Badge variant="secondary" className="text-[10px] px-1">Reemplazo</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog generación */}
      <GenerateDialog
        open={showGenDialog}
        onClose={() => setShowGenDialog(false)}
        groups={groups}
        locations={locations}
      />

      <ManualShiftAssignDialog
        open={showManualDialog}
        onClose={() => setShowManualDialog(false)}
        preselectedDate={boardFilter.startDate}
      />

      {/* Panel de detalle */}
      <PlanningDetailPanel
        planningId={selectedPlanningId}
        onClose={() => setSelectedPlanningId(null)}
      />
    </div>
  );
}

// ─── Subcomponente: cronograma por guardia ────────────────────────────────────

const GUARD_SHIFT_CHIP: Record<string, { label: string; title: string; cls: string }> = {
  M: { label: 'M', title: 'Mañana',  cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  T: { label: 'T', title: 'Tarde',   cls: 'bg-orange-100 text-orange-800 border-orange-300' },
  N: { label: 'N', title: 'Noche',   cls: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
};
const GUARD_LIBRE_CHIP = { label: 'L', title: 'Libre', cls: 'bg-slate-100 text-slate-500 border-slate-200' };

function ShiftChip({ code }: { code: string | null | undefined }) {
  const chip = code ? (GUARD_SHIFT_CHIP[code] ?? { label: code.substring(0, 1), title: code, cls: 'bg-muted text-foreground border-border' }) : GUARD_LIBRE_CHIP;
  return (
    <span
      title={chip.title}
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold border ${chip.cls}`}
    >
      {chip.label}
    </span>
  );
}

function GuardCronograma({
  items,
  onCellClick,
}: {
  items: import('@/types/guards').GuardShiftCalendarItemDto[];
  onCellClick: (planningId: number) => void;
}) {
  const empMap = new Map<number, { name: string; shifts: Map<string, import('@/types/guards').GuardShiftCalendarItemDto> }>();

  for (const item of items) {
    if (!empMap.has(item.employeeId)) {
      empMap.set(item.employeeId, { name: item.employeeFullName, shifts: new Map() });
    }
    empMap.get(item.employeeId)!.shifts.set(item.workDate, item);
  }

  const datesSet: Record<string, true> = {};
  for (const i of items) datesSet[i.workDate] = true;
  const dates = Object.keys(datesSet).sort();

  return (
    <div>
      {/* Leyenda */}
      <div className="flex items-center gap-3 px-3 py-2 border-b text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground/70">Leyenda:</span>
        {Object.entries(GUARD_SHIFT_CHIP).map(([, chip]) => (
          <span key={chip.title} className="flex items-center gap-1">
            <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold border ${chip.cls}`}>{chip.label}</span>
            {chip.title}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold border ${GUARD_LIBRE_CHIP.cls}`}>{GUARD_LIBRE_CHIP.label}</span>
          Libre / sin turno
        </span>
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-muted/60">
            <th className="border px-3 py-2 text-left sticky left-0 bg-muted z-10 min-w-[150px]">Guardia</th>
            {dates.map(d => (
              <th key={d} className="border px-1 py-2 text-center min-w-[44px] font-medium whitespace-nowrap">{fmtDate(d)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from(empMap.entries()).map(([empId, { name, shifts }]) => (
            <tr key={empId} className="hover:bg-muted/20">
              <td className="border px-3 py-1.5 sticky left-0 bg-background z-10 font-medium text-xs truncate max-w-[150px]">
                {name.split(' ').slice(0, 2).join(' ')}
              </td>
              {dates.map(d => {
                const shift = shifts.get(d);
                return (
                  <td
                    key={d}
                    className="border px-1 py-1.5 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => shift && onCellClick(shift.planningId)}
                    title={shift ? `${shift.employeeFullName} — ${shift.scheduleDescription} — ${shift.locationName}` : 'Sin turno'}
                  >
                    <ShiftChip code={shift?.scheduleCode} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
