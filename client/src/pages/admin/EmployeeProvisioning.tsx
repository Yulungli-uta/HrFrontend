import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw, CheckCircle2, KeyRound, Play, AlertCircle,
  ShieldCheck, Clock, Loader2, Copy, Eye, EyeOff, UserX,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';

import {
  ProvisioningAPI,
  PROVISIONING_STATUS_ID,
  type UserProvisioningDto,
  type PasswordResetResult,
  type CompletePendingResult,
} from '@/lib/api';

// =============================================================================
// Helpers de estado
// =============================================================================

const STATUS_LABEL: Record<number, string> = {
  [PROVISIONING_STATUS_ID.Requested]:        'Solicitado',
  [PROVISIONING_STATUS_ID.CreatedInLocalAd]: 'Creado en AD Local',
  [PROVISIONING_STATUS_ID.PendingEntraSync]: 'Pendiente Entra Sync',
  [PROVISIONING_STATUS_ID.SyncedInEntra]:    'Sincronizado en Entra',
  [PROVISIONING_STATUS_ID.LicenseAssigned]:  'Licencia Asignada',
  [PROVISIONING_STATUS_ID.LicenseFailed]:    'Fallo de Licencia',
  [PROVISIONING_STATUS_ID.LocalAdFailed]:    'Fallo en AD Local',
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

function statusBadge(statusId: number): { variant: BadgeVariant; className: string } {
  switch (statusId) {
    case PROVISIONING_STATUS_ID.Requested:
      return { variant: 'outline',    className: 'text-slate-600 border-slate-400' };
    case PROVISIONING_STATUS_ID.CreatedInLocalAd:
      return { variant: 'secondary',  className: 'bg-blue-100 text-blue-800 border-blue-300' };
    case PROVISIONING_STATUS_ID.PendingEntraSync:
      return { variant: 'outline',    className: 'text-amber-700 border-amber-400 bg-amber-50' };
    case PROVISIONING_STATUS_ID.SyncedInEntra:
      return { variant: 'secondary',  className: 'bg-cyan-100 text-cyan-800 border-cyan-300' };
    case PROVISIONING_STATUS_ID.LicenseAssigned:
      return { variant: 'default',    className: 'bg-green-600 text-white hover:bg-green-700' };
    case PROVISIONING_STATUS_ID.LicenseFailed:
    case PROVISIONING_STATUS_ID.LocalAdFailed:
      return { variant: 'destructive', className: '' };
    default:
      return { variant: 'outline',    className: '' };
  }
}

function isFailed(statusId: number): boolean {
  return statusId === PROVISIONING_STATUS_ID.LicenseFailed
      || statusId === PROVISIONING_STATUS_ID.LocalAdFailed;
}

function isPending(statusId: number): boolean {
  return statusId === PROVISIONING_STATUS_ID.PendingEntraSync
      || statusId === PROVISIONING_STATUS_ID.SyncedInEntra
      || statusId === PROVISIONING_STATUS_ID.LicenseFailed;
}

function hasAdAccount(statusId: number): boolean {
  return statusId >= PROVISIONING_STATUS_ID.CreatedInLocalAd
      && statusId !== PROVISIONING_STATUS_ID.LocalAdFailed;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// =============================================================================
// Diálogo de contraseña temporal
// =============================================================================

function PasswordResetDialog({
  result,
  onClose,
}: {
  result: PasswordResetResult;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const { toast } = useToast();

  function copyPassword() {
    navigator.clipboard.writeText(result.newTemporaryPassword);
    toast({ title: 'Contraseña copiada al portapapeles' });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <KeyRound className="w-5 h-5" />
            Contraseña Restablecida
          </DialogTitle>
          <DialogDescription>{result.message}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Empleado</p>
            <p className="font-medium">{result.email}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Contraseña temporal</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded font-mono text-sm tracking-wider">
                {visible ? result.newTemporaryPassword : '●'.repeat(result.newTemporaryPassword.length)}
              </code>
              <Button variant="ghost" size="icon" onClick={() => setVisible((v) => !v)}>
                {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={copyPassword}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
            Entregue estas credenciales al empleado de forma segura. Esta ventana es la única oportunidad de verla.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Componente principal
// =============================================================================

export default function EmployeeProvisioning() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [resetResult, setResetResult]             = useState<PasswordResetResult | null>(null);
  const [completePendingResult, setCompletePendingResult] = useState<CompletePendingResult | null>(null);
  const [confirmRetryId, setConfirmRetryId]       = useState<string | null>(null);
  const [confirmResetId, setConfirmResetId]       = useState<string | null>(null);
  const [confirmDisableId, setConfirmDisableId]   = useState<string | null>(null);

  // ── Lista ──────────────────────────────────────────────────────────────────

  const { data: rawList, isLoading, isError } = useQuery({
    queryKey: ['provisioning', page, pageSize, statusFilter],
    queryFn: () =>
      ProvisioningAPI.list(page, pageSize, statusFilter ? Number(statusFilter) : undefined),
    staleTime: 30_000,
  });

  const items: UserProvisioningDto[] =
    rawList?.status === 'success' ? (rawList.data?.items ?? []) : [];
  const totalCount  = rawList?.status === 'success' ? (rawList.data?.totalCount  ?? 0) : 0;
  const totalPages  = rawList?.status === 'success' ? (rawList.data?.totalPages  ?? 1) : 1;
  const hasPrevPage = rawList?.status === 'success' ? (rawList.data?.hasPreviousPage ?? false) : false;
  const hasNextPage = rawList?.status === 'success' ? (rawList.data?.hasNextPage     ?? false) : false;

  // ── Mutaciones ─────────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: ['provisioning'] });

  const retryMut = useMutation({
    mutationFn: (id: string) => ProvisioningAPI.retry(id),
    onSuccess: (res) => {
      if (res.status === 'error') { toast({ variant: 'destructive', title: res.error.message }); return; }
      toast({ title: `Reintento ejecutado: ${res.data?.provisioningStatusName ?? 'OK'}` });
      invalidate();
    },
  });

  const completeMut = useMutation({
    mutationFn: (id: string) => ProvisioningAPI.complete(id),
    onSuccess: (res) => {
      if (res.status === 'error') { toast({ variant: 'destructive', title: res.error.message }); return; }
      toast({ title: `Estado: ${res.data?.provisioningStatusName ?? 'Actualizado'}` });
      invalidate();
    },
  });

  const completePendingMut = useMutation({
    mutationFn: () => ProvisioningAPI.completePending(),
    onSuccess: (res) => {
      if (res.status === 'error') { toast({ variant: 'destructive', title: res.error.message }); return; }
      setCompletePendingResult(res.data ?? null);
      invalidate();
    },
  });

  const resetMut = useMutation({
    mutationFn: (id: string) => ProvisioningAPI.resetPassword(id),
    onSuccess: (res) => {
      if (res.status === 'error') { toast({ variant: 'destructive', title: res.error.message }); return; }
      if (res.data) setResetResult(res.data);
      invalidate();
    },
  });

  const disableMut = useMutation({
    mutationFn: (id: string) => ProvisioningAPI.disable(id),
    onSuccess: (res) => {
      if (res.status === 'error') { toast({ variant: 'destructive', title: res.error.message }); return; }
      toast({ title: 'Cuenta deshabilitada', description: 'Removida del grupo activo y movida a OU Inactivos.' });
      invalidate();
    },
  });

  const isBusy = retryMut.isPending || completeMut.isPending || resetMut.isPending || disableMut.isPending;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            Aprovisionamiento de Empleados
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión del ciclo AD Local → Entra ID → O365
          </p>
        </div>
        <Button
          onClick={() => completePendingMut.mutate()}
          disabled={completePendingMut.isPending}
          variant="outline"
          className="gap-2"
        >
          {completePendingMut.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Play className="w-4 h-4" />}
          Procesar Pendientes
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(PROVISIONING_STATUS_ID).map(([name, id]) => (
                  <SelectItem key={id} value={String(id)}>
                    {STATUS_LABEL[id] ?? name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground ml-auto">
              {totalCount} registro{totalCount !== 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-40 gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <span>Error al cargar los datos</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              No hay registros de aprovisionamiento
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo / Depto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Provisionado</TableHead>
                  <TableHead>Licencia</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => {
                  const { variant, className: badgeCls } = statusBadge(row.provisioningStatusId);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{row.displayName}</div>
                        <div className="text-xs text-muted-foreground">{row.email}</div>
                        <div className="text-xs text-muted-foreground">HR#{row.hrEmployeeId}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{row.employeeTypeName ?? `Tipo ${row.employeeTypeId}`}</div>
                        {row.departmentName && (
                          <div className="text-xs text-muted-foreground">{row.departmentName}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant} className={`text-xs ${badgeCls}`}>
                          {STATUS_LABEL[row.provisioningStatusId] ?? row.provisioningStatusName ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(row.provisionedAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.licenseSkuId
                          ? <span className="text-green-700 font-medium">{row.licenseSkuId}</span>
                          : formatDate(row.licenseAssignedAt)}
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        {row.errorMessage && (
                          <p
                            className="text-xs text-destructive truncate"
                            title={row.errorMessage}
                          >
                            {row.errorMessage}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {isFailed(row.provisioningStatusId) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1"
                              disabled={isBusy}
                              onClick={() => setConfirmRetryId(row.id)}
                              title="Reintentar"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Reintentar
                            </Button>
                          )}
                          {isPending(row.provisioningStatusId) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1 text-cyan-700 border-cyan-300"
                              disabled={isBusy || completeMut.isPending}
                              onClick={() => completeMut.mutate(row.id)}
                              title="Verificar Entra sync y asignar licencia"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Completar
                            </Button>
                          )}
                          {hasAdAccount(row.provisioningStatusId) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs gap-1"
                              disabled={isBusy}
                              onClick={() => setConfirmResetId(row.id)}
                              title="Restablecer contraseña en AD Local"
                            >
                              <KeyRound className="w-3 h-3" />
                            </Button>
                          )}
                          {hasAdAccount(row.provisioningStatusId) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={isBusy}
                              onClick={() => setConfirmDisableId(row.id)}
                              title="Deshabilitar cuenta AD y mover a OU Inactivos"
                            >
                              <UserX className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalPages > 1 && (
        <DataPagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          hasPreviousPage={hasPrevPage}
          hasNextPage={hasNextPage}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      )}

      {/* Diálogo contraseña temporal */}
      {resetResult && (
        <PasswordResetDialog result={resetResult} onClose={() => setResetResult(null)} />
      )}

      {/* Diálogo resumen complete-pending */}
      {completePendingResult && (
        <Dialog open onOpenChange={(o) => !o && setCompletePendingResult(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-600" />
                Procesamiento Completado
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Procesados</span>
                <span className="font-semibold">{completePendingResult.totalProcessed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Licencias asignadas</span>
                <span className="font-semibold text-green-700">{completePendingResult.licenseAssigned}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aún pendientes</span>
                <span className="font-semibold text-amber-700">{completePendingResult.stillPending}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fallidos</span>
                <span className="font-semibold text-destructive">{completePendingResult.failed}</span>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setCompletePendingResult(null)}>Cerrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmación reintentar */}
      <AlertDialog
        open={!!confirmRetryId}
        onOpenChange={(o) => !o && setConfirmRetryId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reintentar aprovisionamiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se volverá a ejecutar el proceso desde el punto de fallo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmRetryId) retryMut.mutate(confirmRetryId);
                setConfirmRetryId(null);
              }}
            >
              Reintentar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación reset password */}
      <AlertDialog
        open={!!confirmResetId}
        onOpenChange={(o) => !o && setConfirmResetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restablecer contraseña?</AlertDialogTitle>
            <AlertDialogDescription>
              Se generará una nueva contraseña temporal en AD Local. El empleado deberá cambiarla en el próximo inicio de sesión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmResetId) resetMut.mutate(confirmResetId);
                setConfirmResetId(null);
              }}
            >
              Restablecer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación deshabilitar AD */}
      <AlertDialog
        open={!!confirmDisableId}
        onOpenChange={(o) => !o && setConfirmDisableId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-destructive" />
              ¿Deshabilitar cuenta AD?
            </AlertDialogTitle>
            <AlertDialogDescription>
              La cuenta será deshabilitada en Active Directory, se removerá del grupo activo (UActivos / EActivos) y se moverá a la OU de Inactivos. El usuario no se elimina y puede reactivarse si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (confirmDisableId) disableMut.mutate(confirmDisableId);
                setConfirmDisableId(null);
              }}
            >
              Deshabilitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
