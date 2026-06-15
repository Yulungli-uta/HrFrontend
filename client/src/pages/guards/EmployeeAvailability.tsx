import { useState } from 'react';
import { Ban, RefreshCw, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { EmployeeCombobox } from '@/components/ui/EmployeeCombobox';
import {
  useAvailabilityBlocksPaged, useAvailabilityMutations,
  useGuardRefTypes,
} from '@/hooks/guards/useGuards';
import { DataPagination } from '@/components/ui/DataPagination';
import type {
  EmployeeAvailabilityFilterDto,
  CreateManualAvailabilityBlockDto,
} from '@/types/guards';

const SOURCE_LABEL: Record<string, string> = {
  PERMISSION:   'Permiso',
  VACATION:     'Vacación',
  MANUAL_BLOCK: 'Bloqueo manual',
  SUSPENSION:   'Suspensión',
  TRAINING:     'Capacitación',
  MEDICAL:      'Médico',
  MANUAL:       'Manual',
};

function todayStr() { return new Date().toISOString().split('T')[0]; }
function addDays(d: string, n: number) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().split('T')[0];
}

export default function EmployeeAvailabilityPage() {
  const today = todayStr();

  const [filter, setFilter] = useState<EmployeeAvailabilityFilterDto>({
    startDate: today,
    endDate: addDays(today, 30),
    status: 'ACTIVE',
  });
  const [filterEmployeeId, setFilterEmployeeId] = useState<number | null>(null);
  const updateFilter = (updater: (f: EmployeeAvailabilityFilterDto) => EmployeeAvailabilityFilterDto) => {
    setFilter(updater);
    setPage(1);
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [openManual, setOpenManual] = useState(false);
  const [openSync, setOpenSync] = useState(false);
  const [syncDateRange, setSyncDateRange] = useState({ startDate: today, endDate: addDays(today, 30) });

  const [manualForm, setManualForm] = useState<{
    employeeId: number | null;
    sourceTypeId: number | null;
    startDateTime: string;
    endDateTime: string;
    reason: string;
  }>({
    employeeId: null,
    sourceTypeId: null,
    startDateTime: today + 'T00:00',
    endDateTime: today + 'T23:59',
    reason: '',
  });

  const { data: resp, isLoading } = useAvailabilityBlocksPaged(filter, page, pageSize, true);
  const { data: blockSourceResp } = useGuardRefTypes('GUARD_BLOCK_SOURCE');
  const { createManual, syncPermissions, syncVacations } = useAvailabilityMutations();

  const pagedData = resp?.status === 'success' ? resp.data : null;
  const blocks = pagedData?.items ?? [];
  const blockSourceTypes = blockSourceResp?.status === 'success' ? blockSourceResp.data : [];

  const handleEmployeeFilterChange = (id: number | null) => {
    setFilterEmployeeId(id);
    updateFilter(f => ({ ...f, employeeId: id ?? undefined }));
  };

  const handleManualCreate = () => {
    if (!manualForm.employeeId || !manualForm.sourceTypeId || !manualForm.startDateTime || !manualForm.endDateTime) return;
    const dto: CreateManualAvailabilityBlockDto = {
      employeeId: manualForm.employeeId,
      sourceTypeId: manualForm.sourceTypeId,
      startDateTime: manualForm.startDateTime,
      endDateTime: manualForm.endDateTime,
      reason: manualForm.reason || undefined,
    };
    createManual.mutate(dto, {
      onSuccess: (r) => {
        if (r.status === 'success') {
          setOpenManual(false);
          setManualForm({ employeeId: null, sourceTypeId: null, startDateTime: today + 'T00:00', endDateTime: today + 'T23:59', reason: '' });
        }
      },
    });
  };

  const handleSyncPermissions = () => {
    syncPermissions.mutate(syncDateRange, {
      onSuccess: (r) => { if (r.status === 'success') setOpenSync(false); },
    });
  };

  const handleSyncVacations = () => {
    syncVacations.mutate(syncDateRange, {
      onSuccess: (r) => { if (r.status === 'success') setOpenSync(false); },
    });
  };

  const isSyncing = syncPermissions.isPending || syncVacations.isPending;
  const canCreateManual = !!manualForm.employeeId && !!manualForm.sourceTypeId &&
    !!manualForm.startDateTime && !!manualForm.endDateTime;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Ban className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Disponibilidad de Empleados</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setOpenSync(true)}>
            Sincronizar
          </Button>
          <Button size="sm" onClick={() => setOpenManual(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Bloqueo manual
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-64">
              <Label className="text-xs">Empleado</Label>
              <div className="mt-1">
                <EmployeeCombobox
                  value={filterEmployeeId}
                  onSelect={handleEmployeeFilterChange}
                  placeholder="Todos los empleados"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={filter.startDate ?? ''} onChange={e => updateFilter(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={filter.endDate ?? ''} onChange={e => updateFilter(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Fuente</Label>
              <select
                className="h-9 border rounded-md px-3 text-sm bg-background"
                value={filter.sourceType ?? ''}
                onChange={e => updateFilter(f => ({ ...f, sourceType: e.target.value || undefined }))}
              >
                <option value="">Todas</option>
                <option value="PERMISSION">Permiso</option>
                <option value="VACATION">Vacación</option>
                <option value="MANUAL_BLOCK">Bloqueo manual</option>
                <option value="MEDICAL">Médico</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Estado</Label>
              <select
                className="h-9 border rounded-md px-3 text-sm bg-background"
                value={filter.status ?? ''}
                onChange={e => updateFilter(f => ({ ...f, status: e.target.value || undefined }))}
              >
                <option value="">Todos</option>
                <option value="ACTIVE">Activo</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Bloqueos de disponibilidad
            <span className="ml-2 text-sm font-normal text-muted-foreground">({pagedData?.totalCount ?? 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Cargando bloqueos…</p>
          ) : blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No hay bloqueos en el período seleccionado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocks.map(b => (
                  <TableRow key={b.blockId}>
                    <TableCell>{b.employeeFullName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{SOURCE_LABEL[b.sourceType] ?? b.sourceType}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {new Date(b.startDateTime).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {new Date(b.endDateTime).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={b.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {b.status === 'ACTIVE' ? 'Activo' : 'Cancelado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{b.reason ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {(pagedData?.totalPages ?? 0) > 1 && (
            <DataPagination
              page={pagedData?.page ?? page}
              totalPages={pagedData?.totalPages ?? 0}
              totalCount={pagedData?.totalCount ?? 0}
              pageSize={pagedData?.pageSize ?? pageSize}
              hasPreviousPage={pagedData?.hasPreviousPage ?? false}
              hasNextPage={pagedData?.hasNextPage ?? false}
              onPageChange={(p) => { setPage(p); }}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
              disabled={isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialog: Bloqueo manual */}
      <Dialog open={openManual} onOpenChange={setOpenManual}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear bloqueo manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Empleado *</Label>
              <div className="mt-1">
                <EmployeeCombobox
                  value={manualForm.employeeId}
                  onSelect={id => setManualForm(f => ({ ...f, employeeId: id }))}
                  placeholder="Buscar empleado…"
                />
              </div>
            </div>
            <div>
              <Label>Tipo de bloqueo *</Label>
              <select
                className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
                value={manualForm.sourceTypeId ?? ''}
                onChange={e => setManualForm(f => ({ ...f, sourceTypeId: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">Seleccionar tipo…</option>
                {blockSourceTypes.map(t => (
                  <option key={t.typeId} value={t.typeId}>
                    {SOURCE_LABEL[t.name] ?? t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Inicio *</Label>
              <Input
                type="datetime-local"
                value={manualForm.startDateTime}
                onChange={e => setManualForm(f => ({ ...f, startDateTime: e.target.value }))}
              />
            </div>
            <div>
              <Label>Fin *</Label>
              <Input
                type="datetime-local"
                value={manualForm.endDateTime}
                onChange={e => setManualForm(f => ({ ...f, endDateTime: e.target.value }))}
              />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input
                value={manualForm.reason}
                onChange={e => setManualForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Ej: Suspensión administrativa"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenManual(false)} disabled={createManual.isPending}>Cancelar</Button>
            <Button onClick={handleManualCreate} disabled={createManual.isPending || !canCreateManual}>
              {createManual.isPending
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Creando…</>
                : 'Crear bloqueo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Sincronizar */}
      <Dialog open={openSync} onOpenChange={setOpenSync}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sincronizar bloqueos de disponibilidad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Importa bloqueos desde permisos aprobados y vacaciones activas en el rango indicado.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Desde</Label>
                <Input type="date" value={syncDateRange.startDate} onChange={e => setSyncDateRange(r => ({ ...r, startDate: e.target.value }))} />
              </div>
              <div>
                <Label>Hasta</Label>
                <Input type="date" value={syncDateRange.endDate} onChange={e => setSyncDateRange(r => ({ ...r, endDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setOpenSync(false)} disabled={isSyncing}>Cancelar</Button>
            <Button variant="secondary" onClick={handleSyncPermissions} disabled={isSyncing}>
              {syncPermissions.isPending ? 'Sincronizando…' : 'Sincronizar permisos'}
            </Button>
            <Button onClick={handleSyncVacations} disabled={isSyncing}>
              {syncVacations.isPending ? 'Sincronizando…' : 'Sincronizar vacaciones'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
