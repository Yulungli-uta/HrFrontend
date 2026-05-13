//src/pages/guards/GuardShiftPlanning.tsx
import { useState } from 'react';
import {
  Calendar, RefreshCw, Zap, AlertTriangle, CheckCircle2, X,
  MapPin, Users, ChevronDown, ChevronRight, Info,
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
import type {
  ScheduleBoardFilterDto, GeneratePreviewRequestDto,
  GeneratePreviewResponseDto, ScheduleBoardCellDto,
} from '@/types/guards';

// ─── Constantes de colores y etiquetas ───────────────────────────────────────

const CELL_COLORS: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-800 border-blue-200',
  CONFIRMED: 'bg-green-100 text-green-800 border-green-200',
  REPLACED: 'bg-purple-100 text-purple-800 border-purple-200',
  CANCELLED: 'bg-gray-100 text-gray-400 border-gray-200',
  UNCOVERED: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PLANNED: 'default',
  CONFIRMED: 'default',
  REPLACED: 'secondary',
  CANCELLED: 'outline',
  UNCOVERED: 'destructive',
};

const STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Planificado',
  CONFIRMED: 'Confirmado',
  REPLACED: 'Reemplazado',
  CANCELLED: 'Cancelado',
  UNCOVERED: 'Sin cobertura',
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

// ─── Componente: celda de cronograma ─────────────────────────────────────────

function BoardCell({ cell, onClick }: { cell: ScheduleBoardCellDto; onClick: (planningId: number) => void }) {
  const isEmpty = cell.employees.length === 0;
  const colorClass = CELL_COLORS[cell.status] ?? CELL_COLORS.PLANNED;

  return (
    <td
      className={`border px-1 py-1 text-xs min-w-[80px] max-w-[120px] align-top cursor-pointer hover:opacity-80 transition-opacity ${colorClass}`}
      onClick={() => cell.planningId && onClick(cell.planningId)}
    >
      {isEmpty ? (
        <span className="text-red-500 font-medium">Sin cobertura</span>
      ) : (
        cell.employees.map(emp => (
          <div key={emp.planningId} className="truncate">
            {emp.isReplacement && <span className="text-purple-600 mr-0.5">R</span>}
            {emp.fullName.split(' ').slice(0, 2).join(' ')}
          </div>
        ))
      )}
    </td>
  );
}

// ─── Componente: panel de detalle ─────────────────────────────────────────────

function PlanningDetailPanel({ planningId, onClose }: { planningId: number | null; onClose: () => void }) {
  const { data, isLoading } = usePlanningDetail(planningId);
  const detail = data?.status === 'success' ? data.data : null;

  return (
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
              <Button size="sm" variant="outline" className="flex-1" onClick={onClose}>Cerrar</Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
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
    mode: 'BY_GROUP',
    includeRestDays: false,
    regenerateMode: 'SKIP_EXISTING',
  });

  const { preview, confirm } = usePlanningMutations(() => { setStep('done'); });

  const handlePreview = () => {
    if (!form.locationId) return;
    preview.mutate(form, {
      onSuccess: (r) => {
        if (r.status === 'success') { setPreviewData(r.data); setStep('preview'); }
      },
    });
  };

  const handleConfirm = () => {
    if (!form.locationId) return;
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
                  onChange={e => setForm(f => ({ ...f, mode: e.target.value as GeneratePreviewRequestDto['mode'] }))}
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

            <div>
              <Label className="text-xs">Ubicación base *</Label>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Desde *</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Hasta *</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
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
              disabled={preview.isPending || !form.locationId || (form.mode === 'BY_GROUP' && !form.groupId)}
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

  const [showGenDialog, setShowGenDialog] = useState(false);
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

  const conflicts = items.filter(i => i.status === 'CANCELLED');
  const isLoading = boardLoading || calLoading;

  return (
    <div className="p-6 space-y-4">

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

        {/* ── Cronograma por ubicación ── */}
        <TabsContent value="cronograma">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Cronograma por ubicación / turno
                {isLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {!board || board.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {isLoading ? 'Cargando cronograma…' : 'No hay planificaciones en el rango seleccionado.'}
                </p>
              ) : (
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="border px-3 py-2 text-left sticky left-0 bg-muted z-10 min-w-[160px]">
                        Ubicación / Turno
                      </th>
                      {board.dates.map(d => (
                        <th key={d} className="border px-1 py-2 text-center min-w-[80px] font-medium">
                          {fmtDate(d)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {board.rows.map(row => (
                      <tr key={row.rowKey}>
                        <td className="border px-3 py-1.5 sticky left-0 bg-background z-10 font-medium">
                          <div className="text-xs font-semibold truncate max-w-[150px]">{row.locationName}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {SCHEDULE_LABEL[row.scheduleCode] ?? row.scheduleName}
                          </div>
                        </td>
                        {row.cells.map(cell => (
                          <BoardCell key={cell.date} cell={cell} onClick={setSelectedPlanningId} />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                        <TableCell>{item.employeeFullName}</TableCell>
                        <TableCell className="text-xs">{item.locationName}</TableCell>
                        <TableCell className="text-xs">{item.scheduleDescription}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE_VARIANT[item.status] ?? 'outline'}>
                            {STATUS_LABEL[item.status] ?? item.status}
                          </Badge>
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

      {/* Panel de detalle */}
      <PlanningDetailPanel
        planningId={selectedPlanningId}
        onClose={() => setSelectedPlanningId(null)}
      />
    </div>
  );
}

// ─── Subcomponente: cronograma por guardia ────────────────────────────────────

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

  const scheduleInitial = (code: string | undefined) => {
    if (!code) return '?';
    if (code === 'M') return 'M';
    if (code === 'T') return 'T';
    if (code === 'N') return 'N';
    return code.substring(0, 1).toUpperCase();
  };

  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="bg-muted/60">
          <th className="border px-3 py-2 text-left sticky left-0 bg-muted z-10 min-w-[150px]">Guardia</th>
          {dates.map(d => (
            <th key={d} className="border px-1 py-2 text-center min-w-[40px] font-medium">{fmtDate(d)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from(empMap.entries()).map(([empId, { name, shifts }]) => (
          <tr key={empId}>
            <td className="border px-3 py-1.5 sticky left-0 bg-background z-10 font-medium text-xs truncate max-w-[150px]">
              {name.split(' ').slice(0, 2).join(' ')}
            </td>
            {dates.map(d => {
              const shift = shifts.get(d);
              return (
                <td
                  key={d}
                  className={`border px-1 py-1 text-center cursor-pointer hover:opacity-80 transition-opacity
                    ${shift ? (CELL_COLORS[shift.status] ?? CELL_COLORS.PLANNED) : 'bg-gray-50 text-gray-400'}`}
                  onClick={() => shift && onCellClick(shift.planningId)}
                >
                  {shift ? (
                    <span className="font-bold">{scheduleInitial(shift.scheduleDescription)}</span>
                  ) : (
                    <span>L</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
