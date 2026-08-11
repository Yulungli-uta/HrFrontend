// src/pages/PersonnelActionsCorrection.tsx
import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DataPagination } from '@/components/ui/DataPagination';
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';
import { ArrowLeft, Search, ShieldAlert, Loader2, Eye, Pencil } from 'lucide-react';
import { PersonnelActionsAPI } from '@/lib/api/services/contracts';
import { PersonnelActionForm } from '@/components/personnelActions/PersonnelActionForm';
import { ActionDocumentsPanel } from '@/components/personnelActions/ActionDocumentsPanel';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useToast } from '@/hooks/use-toast';
import { parseApiError } from '@/lib/error-handling';
import type {
  CreatePersonnelActionRequest,
  UpdatePersonnelActionRequest,
  PersonnelActionSummary,
  PersonnelActionDetail,
} from '@/types/personnel-actions';

const STATUS_BADGE: Record<string, string> = {
  BORRADOR: 'bg-secondary text-secondary-foreground',
  GENERADO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PENDIENTE_FIRMAS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  FIRMADO_CARGADO: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  FINALIZADO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  VIGENTE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  ANULADO: 'bg-destructive/10 text-destructive',
};
const STATUS_OPTIONS = Object.keys(STATUS_BADGE);

function buildUpdatePayload(data: CreatePersonnelActionRequest): UpdatePersonnelActionRequest {
  return {
    actionNumber: data.actionNumber,
    actionDate: data.actionDate,
    effectiveDate: data.effectiveDate,
    endDate: data.endDate,
    originDepartmentId: data.originDepartmentId,
    originJobId: data.originJobId,
    originBudgetCode: data.originBudgetCode,
    destinationDepartmentId: data.destinationDepartmentId,
    destinationJobId: data.destinationJobId,
    destinationBudgetCode: data.destinationBudgetCode,
    previousRmu: data.previousRmu,
    newRmu: data.newRmu,
    legalBasis: data.legalBasis,
    reason: data.reason,
    observations: data.observations,
    swornDeclaration: data.swornDeclaration,
    institutionalProcess: data.institutionalProcess,
    managementLevel: data.managementLevel,
    dthDirectorId: data.dthDirectorId,
    authorityNominatorId: data.authorityNominatorId,
    elaboratorId: data.elaboratorId,
    reviewerId: data.reviewerId,
    registrarId: data.registrarId,
  };
}

export default function PersonnelActionsCorrection() {
  const { toast } = useToast();

  // ── Filtros (no se consulta nada hasta que el usuario presiona "Buscar") ──
  const [searchInput, setSearchInput] = useState('');
  const [statusInput, setStatusInput] = useState<string>('all');
  const [dateFromInput, setDateFromInput] = useState('');
  const [dateToInput, setDateToInput] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<{
    search?: string; status?: string; startDate?: string; endDate?: string;
  } | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // ── Selección: primero solo lectura, "Editar" revela el formulario ──
  const [selected, setSelected] = useState<PersonnelActionSummary | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'edit'>('summary');

  const [reason, setReason] = useState('');
  const [pendingData, setPendingData] = useState<CreatePersonnelActionRequest | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    setIsFormDirty,
    handleOpenChange: guardedBack,
    confirmOpen: unsavedConfirmOpen,
    confirmExit: confirmUnsavedExit,
    closeConfirm: closeUnsavedConfirm,
  } = useUnsavedChangesGuard((open) => {
    if (!open) {
      setSelected(null);
      setViewMode('summary');
      setReason('');
    }
  });

  const handleSearchClick = () => {
    setPage(1);
    setAppliedFilters({
      search: searchInput.trim() || undefined,
      status: statusInput === 'all' ? undefined : statusInput,
      startDate: dateFromInput || undefined,
      endDate: dateToInput || undefined,
    });
  };

  const searchQuery = useQuery({
    queryKey: ['personnel-actions-correction-search', appliedFilters, page, pageSize],
    queryFn: () => PersonnelActionsAPI.getPaged({ ...appliedFilters, page, pageSize }),
    enabled: !selected && appliedFilters !== null,
  });

  const detailQuery = useQuery({
    queryKey: ['personnel-action-detail-for-correction', selected?.actionId],
    queryFn: () => PersonnelActionsAPI.getById(selected!.actionId),
    enabled: !!selected,
  });

  const result = searchQuery.data?.status === 'success' ? searchQuery.data.data : null;
  const items = result?.items ?? [];
  const actionDetail: PersonnelActionDetail | null =
    detailQuery.data?.status === 'success' ? detailQuery.data.data : null;

  const correctMutation = useMutation({
    mutationFn: () =>
      PersonnelActionsAPI.correct(selected!.actionId, {
        reason: reason.trim(),
        data: buildUpdatePayload(pendingData!),
      }),
    onSuccess: (res) => {
      if (res.status === 'error') {
        toast({ title: '❌ Error', description: parseApiError(res.error).message, variant: 'destructive' });
        return;
      }
      toast({
        title: '✅ Corrección aplicada',
        description: 'La acción fue corregida. Queda registrada en el historial de auditoría.',
      });
      setIsFormDirty(false);
      setConfirmOpen(false);
      setSelected(null);
      setViewMode('summary');
      setReason('');
      setPendingData(null);
    },
    onError: (error: any) => {
      toast({ title: '❌ Error', description: parseApiError(error).message, variant: 'destructive' });
      setConfirmOpen(false);
    },
  });

  const handleFormSubmit = (data: CreatePersonnelActionRequest) => {
    setPendingData(data);
    setConfirmOpen(true);
  };

  const stepLabel = !selected
    ? 'Paso 1 de 3 — Filtra y busca la acción.'
    : viewMode === 'summary'
      ? 'Paso 2 de 3 — Revisa el registro y presiona "Editar" para corregirlo.'
      : 'Paso 3 de 3 — Corrige los campos necesarios e indica el motivo.';

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="space-y-1">
        <Link href="/personnel-actions">
          <Button variant="ghost" size="sm" className="mb-1 -ml-2 text-muted-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Acciones de Personal
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6" /> Corregir Acción de Personal
        </h1>
        <p className="text-sm text-muted-foreground">{stepLabel}</p>
      </div>

      {!selected ? (
        <>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearchClick(); }}
                  placeholder="Cédula, nombre del empleado o número de documento…"
                  className="pl-9"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <Select value={statusInput} onValueChange={setStatusInput}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Fecha desde</Label>
                  <Input type="date" value={dateFromInput} onChange={(e) => setDateFromInput(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Fecha hasta</Label>
                  <Input type="date" value={dateToInput} onChange={(e) => setDateToInput(e.target.value)} min={dateFromInput || undefined} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={handleSearchClick}>
                    <Search className="mr-2 h-4 w-4" /> Buscar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {appliedFilters === null ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completa el buscador o los filtros y presiona "Buscar" para ver resultados.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
                  Resultados {result ? `(${result.totalCount})` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchQuery.isFetching ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2 py-6">
                    <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
                  </p>
                ) : items.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6">Sin resultados.</p>
                ) : (
                  <>
                    <div className="border rounded-md overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Empleado</TableHead>
                            <TableHead className="hidden sm:table-cell">Cédula</TableHead>
                            <TableHead className="hidden md:table-cell">Tipo</TableHead>
                            <TableHead>N° Documento</TableHead>
                            <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="w-10" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow
                              key={item.actionId}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => { setSelected(item); setViewMode('summary'); }}
                            >
                              <TableCell className="font-medium">{item.employeeFullName}</TableCell>
                              <TableCell className="hidden sm:table-cell">{item.employeeIdCard}</TableCell>
                              <TableCell className="hidden md:table-cell">{item.actionTypeName}</TableCell>
                              <TableCell>{item.actionNumber ?? '—'}</TableCell>
                              <TableCell className="hidden sm:table-cell">{item.actionDate?.slice(0, 10)}</TableCell>
                              <TableCell>
                                <Badge className={STATUS_BADGE[item.status] ?? ''}>{item.status}</Badge>
                              </TableCell>
                              <TableCell>
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {result && (
                      <DataPagination
                        page={result.page}
                        totalPages={result.totalPages}
                        totalCount={result.totalCount}
                        pageSize={pageSize}
                        hasPreviousPage={result.page > 1}
                        hasNextPage={result.page < result.totalPages}
                        onPageChange={setPage}
                        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                        disabled={searchQuery.isFetching}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {selected.employeeFullName} — Acción #{selected.actionId}
            </CardTitle>
            <CardDescription>{selected.actionNumber ?? 'Sin número de documento'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {viewMode === 'summary' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Tipo</p>
                    <p className="font-medium">{selected.actionTypeName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Cédula</p>
                    <p className="font-medium">{selected.employeeIdCard}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Fecha</p>
                    <p className="font-medium">{selected.actionDate?.slice(0, 10) ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Estado</p>
                    <Badge className={STATUS_BADGE[selected.status] ?? ''}>{selected.status}</Badge>
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    Volver a la búsqueda
                  </Button>
                  <Button onClick={() => setViewMode('edit')}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    Esta corrección se aplica sin importar el estado de la acción y queda registrada
                    en el historial de auditoría (motivo, usuario, fecha, valores anteriores).
                  </AlertDescription>
                </Alert>

                <div className="space-y-1.5">
                  <Label>Motivo de la corrección <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => { setReason(e.target.value); setIsFormDirty(true); }}
                    placeholder="Ej: el departamento de destino se registró mal en la carga inicial"
                    rows={2}
                  />
                </div>

                {/* Si el documento cargado fue el equivocado: quitarlo aquí no lo borra
                    físicamente (soft-delete, Status=2) — solo deja de listarse. Se sube el
                    correcto aparte, sin tocar el estado/flujo de la acción. */}
                <ActionDocumentsPanel actionId={selected.actionId} />

                {detailQuery.isFetching || !actionDetail ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2 py-6">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando datos de la acción…
                  </p>
                ) : (
                  <PersonnelActionForm
                    defaultValues={actionDetail}
                    isEdit
                    isBusy={correctMutation.isPending || reason.trim().length < 5}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setViewMode('summary')}
                    onDirtyChange={setIsFormDirty}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmas aplicar esta corrección?</AlertDialogTitle>
            <AlertDialogDescription>
              Quedará registrada en el historial de auditoría con motivo, usuario y fecha. Esta
              acción no se puede deshacer desde la pantalla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={correctMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={correctMutation.isPending}
              onClick={(e) => { e.preventDefault(); correctMutation.mutate(); }}
            >
              {correctMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar corrección
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UnsavedChangesDialog
        open={unsavedConfirmOpen}
        onClose={closeUnsavedConfirm}
        onConfirmExit={confirmUnsavedExit}
      />
    </div>
  );
}
