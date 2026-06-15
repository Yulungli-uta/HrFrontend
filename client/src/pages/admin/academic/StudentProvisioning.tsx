import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserX, RefreshCw, AlertCircle, ShieldCheck, Clock, Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DataPagination } from '@/components/ui/DataPagination';
import { useToast } from '@/hooks/use-toast';

import {
  StudentProvisioningAPI,
  StudentProvisioningStatus,
  type StudentProvisioningDto,
} from '@/lib/api/services/academic/studentProvisioning';

// =============================================================================
// Helpers
// =============================================================================

const STATUS_LABEL: Record<number, string> = {
  [StudentProvisioningStatus.Requested]:   'Solicitado',
  [StudentProvisioningStatus.CreatedInAd]: 'Creado en AD Local',
  [StudentProvisioningStatus.AdFailed]:    'Fallo en AD',
  [StudentProvisioningStatus.Disabled]:    'Deshabilitado',
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

function statusBadge(statusId: number): { variant: BadgeVariant; className: string } {
  switch (statusId) {
    case StudentProvisioningStatus.Requested:
      return { variant: 'outline', className: 'text-slate-600 border-slate-400' };
    case StudentProvisioningStatus.CreatedInAd:
      return { variant: 'secondary', className: 'bg-blue-100 text-blue-800 border-blue-300' };
    case StudentProvisioningStatus.AdFailed:
      return { variant: 'destructive', className: '' };
    case StudentProvisioningStatus.Disabled:
      return { variant: 'outline', className: 'text-amber-700 border-amber-400' };
    default:
      return { variant: 'outline', className: '' };
  }
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// =============================================================================
// Componente principal
// =============================================================================

const PAGE_SIZE = 20;

export default function StudentProvisioningPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [confirmDisableId, setConfirmDisableId] = useState<number | null>(null);

  const statusId = statusFilter !== 'all' ? parseInt(statusFilter, 10) : undefined;

  const { data, isFetching } = useQuery({
    queryKey: ['student-provisioning', page, statusId],
    queryFn: async () => {
      const res = await StudentProvisioningAPI.list(page, PAGE_SIZE, statusId);
      if (res.status !== 'success') throw new Error(res.error?.message ?? 'Error al cargar');
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  const disableMut = useMutation({
    mutationFn: (studentId: number) => StudentProvisioningAPI.disable(studentId),
    onSuccess: (res) => {
      if (res.status === 'success' && res.data?.success) {
        toast({ title: 'Cuenta deshabilitada', description: 'Cuenta AD deshabilitada y movida a OU Inactivos.' });
        qc.invalidateQueries({ queryKey: ['student-provisioning'] });
      } else {
        toast({
          title: 'Error al deshabilitar',
          description: res.data?.errorMessage ?? res.error?.message,
          variant: 'destructive',
        });
      }
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const rows = (data?.items ?? []).filter((r: StudentProvisioningDto) =>
    search === '' ||
    r.displayName.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase()),
  );

  const confirmDisableRow = confirmDisableId !== null
    ? rows.find((r: StudentProvisioningDto) => r.studentId === confirmDisableId)
    : null;

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aprovisionamiento de Estudiantes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de cuentas AD Local en OU=ESTUDIANTES — grupo EActivos
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => qc.invalidateQueries({ queryKey: ['student-provisioning'] })}
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value={String(StudentProvisioningStatus.Requested)}>Solicitado</SelectItem>
              <SelectItem value={String(StudentProvisioningStatus.CreatedInAd)}>Creado en AD Local</SelectItem>
              <SelectItem value={String(StudentProvisioningStatus.AdFailed)}>Fallo en AD</SelectItem>
              <SelectItem value={String(StudentProvisioningStatus.Disabled)}>Deshabilitado</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="w-4 h-4" />
            Estudiantes Aprovisionados
            {data && (
              <Badge variant="secondary" className="ml-auto">{data.total} total</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isFetching && rows.length === 0 ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <AlertCircle className="w-6 h-6" />
              No hay registros para los filtros seleccionados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email institucional</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Aprovisionado</TableHead>
                  <TableHead>Deshabilitado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row: StudentProvisioningDto) => {
                  const badge = statusBadge(row.provisioningStatusId);
                  const canDisable = row.provisioningStatusId === StudentProvisioningStatus.CreatedInAd;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.displayName}</div>
                        <div className="text-xs text-muted-foreground">StudentId: {row.studentId}</div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{row.email || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={badge.variant} className={badge.className}>
                          {STATUS_LABEL[row.provisioningStatusId] ?? row.provisioningStatusName ?? String(row.provisioningStatusId)}
                        </Badge>
                        {row.errorMessage && (
                          <p className="text-xs text-destructive mt-1 max-w-xs truncate" title={row.errorMessage}>
                            {row.errorMessage}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(row.provisionedAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(row.disabledAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canDisable ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Deshabilitar cuenta AD"
                              onClick={() => setConfirmDisableId(row.studentId)}
                              disabled={disableMut.isPending}
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Clock className="w-4 h-4 text-muted-foreground" />
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

      {data && data.total > PAGE_SIZE && (
        <DataPagination
          currentPage={page}
          totalPages={Math.ceil(data.total / PAGE_SIZE)}
          onPageChange={setPage}
        />
      )}

      {/* Confirmación deshabilitar */}
      <AlertDialog open={confirmDisableId !== null} onOpenChange={(open) => !open && setConfirmDisableId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deshabilitar cuenta AD</AlertDialogTitle>
            <AlertDialogDescription>
              Se deshabilitará la cuenta de <strong>{confirmDisableRow?.displayName}</strong>
              {confirmDisableRow?.email ? ` (${confirmDisableRow.email})` : ''}.
              La cuenta se moverá a OU=Inactivos,OU=ESTUDIANTES y se retirará del grupo EActivos.
              Esta acción se puede revertir desde Gestión AD Local.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDisableId !== null) {
                  disableMut.mutate(confirmDisableId);
                  setConfirmDisableId(null);
                }
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
