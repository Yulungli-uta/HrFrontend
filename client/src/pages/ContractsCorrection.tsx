// src/pages/ContractsCorrection.tsx
import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { EmployeeCombobox } from '@/components/ui/EmployeeCombobox';
import { DepartmentSelect } from '@/components/departments/DepartmentSelect';
import { JobSelect } from '@/components/ui/JobSelect';
import { FolderOpen, ArrowLeft, Search, ShieldAlert, Loader2, Eye, Pencil, X } from 'lucide-react';
import { ContractsRHAPI, TiposReferenciaAPI } from '@/lib/api';
import { REF_TYPE_CATEGORIES } from '@/features/refTypeCategories';
import { ReusableDocumentManager } from '@/components/ReusableDocumentManager';
import { CONTRACT_DIRECTORY_CODE, CONTRACT_ENTITY_TYPE } from '@/features/constants';
import { usePaged } from '@/hooks/pagination/usePaged';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useToast } from '@/hooks/use-toast';
import { parseApiError } from '@/lib/error-handling';

const STATUS_BADGE: Record<string, string> = {
  BORRADOR: 'bg-secondary text-secondary-foreground',
  GENERADO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PENDIENTE_FIRMAS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  FIRMADO_CARGADO: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  FINALIZADO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  VIGENTE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  VENCIDO: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  ANULADO: 'bg-destructive/10 text-destructive',
};

export default function ContractsCorrection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'edit'>('summary');

  const [reason, setReason] = useState('');
  const [contractCode, setContractCode] = useState('');
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Corrección de estado (independiente de la corrección de datos de arriba) ──
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatusTypeId, setNewStatusTypeId] = useState<string>('');
  const [statusReason, setStatusReason] = useState('');

  // ── Filtros (no se consulta nada hasta presionar "Buscar") ──
  const [searchInput, setSearchInput] = useState('');
  const [statusInput, setStatusInput] = useState<string>('all');
  const [dateFromInput, setDateFromInput] = useState('');
  const [dateToInput, setDateToInput] = useState('');
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [filterDepartmentId, setFilterDepartmentId] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

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
    }
  });

  const {
    items,
    isLoading: isSearching,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPage,
    setPageSize,
    setSearch: setSearchTerm,
  } = usePaged<any>({
    // statusInput/dateFromInput/dateToInput/employeeId viajan en el queryKey (no solo en el
    // queryFn) para que React Query detecte el cambio y vuelva a consultar — usePaged solo
    // observa internamente page/pageSize/sortBy/sortDirection/search, no estos filtros extra.
    queryKey: ['contracts-correction-search', statusInput, dateFromInput, dateToInput, employeeId, filterDepartmentId],
    queryFn: (params) =>
      ContractsRHAPI.listPaged({
        ...params,
        statusTypeId: statusInput === 'all' ? undefined : Number(statusInput),
        startDateFrom: dateFromInput || undefined,
        startDateTo: dateToInput || undefined,
        employeeId: employeeId ?? undefined,
        departmentId: filterDepartmentId ?? undefined,
      }),
    initialPageSize: 20,
    enabled: !selected && hasSearched,
  });

  const handleSearchClick = () => {
    setSearchTerm(searchInput);
    setHasSearched(true);
  };

  const qStatusTypes = useQuery({
    queryKey: ['reftypes', 'CONTRACT_STATUS'],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.CONTRACT_STATUS),
    staleTime: 10 * 60 * 1000,
  });
  const statusTypes: any[] = qStatusTypes.data?.status === 'success' ? qStatusTypes.data.data ?? [] : [];
  const statusNameById = new Map<number, string>(
    statusTypes.map((t: any) => [Number(t.typeId ?? t.typeID), t.name as string])
  );

  const selectContract = (contract: any) => {
    setSelected(contract);
    setViewMode('summary');
    setReason('');
    setContractCode(contract.contractCode ?? '');
    setDepartmentId(contract.departmentID ?? null);
    setJobId(contract.jobID ?? null);
    setStartDate(String(contract.startDate ?? '').slice(0, 10));
    setEndDate(String(contract.endDate ?? '').slice(0, 10));
    setDescription(contract.contractDescription ?? '');
    setIsFormDirty(false);
  };

  const correctMutation = useMutation({
    mutationFn: () =>
      ContractsRHAPI.correct(selected.contractID, {
        reason: reason.trim(),
        data: {
          contractID: selected.contractID,
          certificationID: selected.certificationID ?? null,
          parentID: selected.parentID ?? null,
          contractCode,
          personID: selected.personID,
          contractTypeID: selected.contractTypeID,
          jobID: jobId,
          startDate,
          endDate,
          contractFileName: selected.contractFileName ?? null,
          contractFilepath: selected.contractFilepath ?? null,
          contractDescription: description,
          departmentID: departmentId,
          authorizationDate: selected.authorizationDate ?? null,
          resignationFileName: selected.resignationFileName ?? null,
          resignationFilepath: selected.resignationFilepath ?? null,
          resignationCode: selected.resignationCode ?? null,
          regResignationDate: selected.regResignationDate ?? null,
          resignationDate: selected.resignationDate ?? null,
          cancelReason: selected.cancelReason ?? null,
          cancelFilename: selected.cancelFilename ?? null,
          cancelFilepath: selected.cancelFilepath ?? null,
          cancelCode: selected.cancelCode ?? null,
          registrationDateAnulCon: selected.registrationDateAnulCon ?? null,
          nationality: selected.nationality ?? null,
          visa: selected.visa ?? null,
          consulate: selected.consulate ?? null,
          workOf: selected.workOf ?? null,
          inicialContent: selected.inicialContent ?? null,
          resolucionContent: selected.resolucionContent ?? null,
          relationshipType: selected.relationshipType ?? null,
          relationship: selected.relationship ?? null,
          competition: selected.competition ?? null,
          competitionDate: selected.competitionDate ?? null,
        },
      }),
    onSuccess: (res) => {
      if (res.status === 'error') {
        toast({ title: '❌ Error', description: parseApiError(res.error).message, variant: 'destructive' });
        return;
      }
      toast({
        title: '✅ Corrección aplicada',
        description: 'El contrato fue corregido. Queda registrada en el historial de auditoría.',
      });
      queryClient.invalidateQueries({ queryKey: ['contracts-correction-search'] });
      setIsFormDirty(false);
      setConfirmOpen(false);
      setSelected(null);
      setViewMode('summary');
    },
    onError: (error: any) => {
      toast({ title: '❌ Error', description: parseApiError(error).message, variant: 'destructive' });
      setConfirmOpen(false);
    },
  });

  const correctStatusMutation = useMutation({
    mutationFn: () =>
      ContractsRHAPI.correctStatus(selected.contractID, {
        reason: statusReason.trim(),
        toStatusTypeID: Number(newStatusTypeId),
      }),
    onSuccess: (res) => {
      if (res.status === 'error') {
        toast({ title: '❌ Error', description: parseApiError(res.error).message, variant: 'destructive' });
        return;
      }
      toast({
        title: '✅ Estado corregido',
        description: 'El estado del contrato fue corregido. Queda registrado en el historial.',
      });
      queryClient.invalidateQueries({ queryKey: ['contracts-correction-search'] });
      setStatusDialogOpen(false);
      setNewStatusTypeId('');
      setStatusReason('');
      setSelected(null);
      setViewMode('summary');
    },
    onError: (error: any) => {
      toast({ title: '❌ Error', description: parseApiError(error).message, variant: 'destructive' });
    },
  });

  const canSubmit = reason.trim().length >= 5 && !correctMutation.isPending;

  const stepLabel = !selected
    ? 'Paso 1 de 3 — Filtra y busca el contrato.'
    : viewMode === 'summary'
      ? 'Paso 2 de 3 — Revisa el contrato y presiona "Editar" para corregirlo.'
      : 'Paso 3 de 3 — Corrige los campos necesarios e indica el motivo.';

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="space-y-1">
        <Link href="/contracts">
          <Button variant="ghost" size="sm" className="mb-1 -ml-2 text-muted-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Contratos
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6" /> Corregir Contrato
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
                  placeholder="Código o descripción del contrato…"
                  className="pl-9"
                />
              </div>

              <div className="space-y-1.5 sm:max-w-sm">
                <Label className="text-xs text-muted-foreground">Dependencia / Departamento</Label>
                <DepartmentSelect
                  value={filterDepartmentId}
                  onChange={setFilterDepartmentId}
                  placeholder="Todas"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Empleado</Label>
                  <div className="flex items-center gap-1">
                    <div className="flex-1">
                      <EmployeeCombobox
                        value={employeeId}
                        onSelect={setEmployeeId}
                        placeholder="Buscar por nombre o cédula…"
                      />
                    </div>
                    {employeeId != null && (
                      <Button variant="ghost" size="icon" onClick={() => setEmployeeId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <Select value={statusInput} onValueChange={setStatusInput}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {statusTypes.map((t: any) => {
                        const id = String(t.typeId ?? t.typeID);
                        return <SelectItem key={id} value={id}>{t.name}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Inicio desde</Label>
                  <Input type="date" value={dateFromInput} onChange={(e) => setDateFromInput(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Inicio hasta</Label>
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

          {!hasSearched ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completa el buscador o los filtros y presiona "Buscar" para ver resultados.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
                  Resultados ({totalCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isSearching ? (
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
                            <TableHead>Código</TableHead>
                            <TableHead className="hidden sm:table-cell">Descripción</TableHead>
                            <TableHead className="hidden sm:table-cell">Inicio</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="w-10" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item: any) => (
                            <TableRow
                              key={item.contractID}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => selectContract(item)}
                            >
                              <TableCell className="font-medium">
                                #{item.contractID} {item.contractCode}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell max-w-xs truncate">
                                {item.contractDescription ?? '—'}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                {String(item.startDate ?? '').slice(0, 10)}
                              </TableCell>
                              <TableCell>
                                <Badge className={STATUS_BADGE[statusNameById.get(Number(item.status)) ?? ''] ?? 'bg-secondary text-secondary-foreground'}>
                                  {statusNameById.get(Number(item.status)) ?? item.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {totalPages > 0 && (
                      <DataPagination
                        page={page}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        pageSize={pageSize}
                        hasPreviousPage={hasPreviousPage}
                        hasNextPage={hasNextPage}
                        onPageChange={goToPage}
                        onPageSizeChange={setPageSize}
                        disabled={isSearching}
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
            <CardTitle>Contrato #{selected.contractID}</CardTitle>
            <CardDescription>{selected.contractCode ?? 'Sin código'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {viewMode === 'summary' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Descripción</p>
                    <p className="font-medium">{selected.contractDescription ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Estado</p>
                    <Badge className={STATUS_BADGE[statusNameById.get(Number(selected.status)) ?? ''] ?? ''}>
                      {statusNameById.get(Number(selected.status)) ?? selected.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Fecha inicio</p>
                    <p className="font-medium">{String(selected.startDate ?? '').slice(0, 10) || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Fecha fin</p>
                    <p className="font-medium">{String(selected.endDate ?? '').slice(0, 10) || '—'}</p>
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    Volver a la búsqueda
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setNewStatusTypeId(''); setStatusReason(''); setStatusDialogOpen(true); }}
                  >
                    <ShieldAlert className="mr-2 h-4 w-4" /> Cambiar Estado
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
                    Esta corrección se aplica sin importar el estado del contrato y queda registrada
                    en el historial de auditoría (motivo, usuario, fecha, valores anteriores).
                  </AlertDescription>
                </Alert>

                <div className="space-y-1.5">
                  <Label>Motivo de la corrección <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => { setReason(e.target.value); setIsFormDirty(true); }}
                    placeholder="Ej: el código de contrato se digitó mal en la carga inicial"
                    rows={2}
                  />
                </div>

                {/* Si el documento cargado fue el equivocado: quitarlo aquí no lo borra
                    físicamente (soft-delete, Status=2) — solo deja de listarse. Se sube el
                    correcto aparte, sin tocar el estado/flujo del contrato. El tipo de
                    documento (incluido "Documento Firmado") es solo una etiqueta — este panel
                    usa el endpoint genérico de subida, separado de cualquier transición de
                    estado; elegir ese tipo aquí nunca cambia el estado del contrato. */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Documentos del Contrato
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ReusableDocumentManager
                      label=""
                      directoryCode={CONTRACT_DIRECTORY_CODE}
                      entityType={CONTRACT_ENTITY_TYPE}
                      entityId={selected.contractID}
                      entityReady={selected.contractID > 0}
                      relativePath=""
                      accept="*/*"
                      maxSizeMB={20}
                      maxFiles={20}
                      documentType={{
                        enabled: true,
                        category: REF_TYPE_CATEGORIES.PROCESS_ATTACHMENT_TYPE,
                        label: 'Tipo de documento',
                        required: false,
                      }}
                    />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Código de contrato</Label>
                    <Input
                      value={contractCode}
                      onChange={(e) => { setContractCode(e.target.value); setIsFormDirty(true); }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descripción</Label>
                    <Input
                      value={description}
                      onChange={(e) => { setDescription(e.target.value); setIsFormDirty(true); }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Fecha inicio</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => { setStartDate(e.target.value); setIsFormDirty(true); }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fecha fin</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => { setEndDate(e.target.value); setIsFormDirty(true); }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Departamento</Label>
                  <DepartmentSelect
                    value={departmentId}
                    onChange={(v) => { setDepartmentId(v); setIsFormDirty(true); }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Cargo</Label>
                  <JobSelect
                    value={jobId}
                    onChange={(v) => { setJobId(v); setIsFormDirty(true); }}
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setViewMode('summary')} disabled={correctMutation.isPending}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setConfirmOpen(true)} disabled={!canSubmit}>
                    Aplicar corrección
                  </Button>
                </div>
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

      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar estado</AlertDialogTitle>
            <AlertDialogDescription>
              Corrige el estado del contrato al que realmente corresponde. No dispara ningún
              efecto secundario (reversar cupo de solicitud, anular contrato padre, etc.) — esos
              solo ocurren al avanzar un contrato por el flujo normal. Queda registrado en el
              historial de auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 px-1">
            <div className="space-y-1.5">
              <Label>Estado actual</Label>
              <div>
                <Badge className={STATUS_BADGE[statusNameById.get(Number(selected?.status)) ?? ''] ?? ''}>
                  {statusNameById.get(Number(selected?.status)) ?? selected?.status}
                </Badge>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nuevo estado <span className="text-destructive">*</span></Label>
              <Select value={newStatusTypeId} onValueChange={setNewStatusTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el estado…" />
                </SelectTrigger>
                <SelectContent>
                  {statusTypes
                    .filter((t: any) => Number(t.typeId ?? t.typeID) !== Number(selected?.status))
                    .map((t: any) => {
                      const id = String(t.typeId ?? t.typeID);
                      return <SelectItem key={id} value={id}>{t.name}</SelectItem>;
                    })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Motivo <span className="text-destructive">*</span></Label>
              <Textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Ej: el contrato quedó en GENERADO por error, ya está firmado y vigente"
                rows={2}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={correctStatusMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={correctStatusMutation.isPending || !newStatusTypeId || statusReason.trim().length < 5}
              onClick={(e) => { e.preventDefault(); correctStatusMutation.mutate(); }}
            >
              {correctStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar cambio de estado
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
