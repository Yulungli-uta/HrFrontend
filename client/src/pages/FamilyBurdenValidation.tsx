// src/pages/FamilyBurdenValidation.tsx
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ShieldCheck, CheckCircle2, XCircle, Loader2, FileText, Users, Clock, Accessibility, ListChecks } from 'lucide-react';
import { CargasFamiliaresAPI, TiposReferenciaAPI } from '@/lib/api';
import { REF_TYPE_CATEGORIES } from '@/features/refTypeCategories';
import { ReusableDocumentManager } from '@/components/ReusableDocumentManager';
import { FAMILY_MEMBER_DOCUMENT_DIRECTORY_CODE, FAMILY_MEMBER_DOCUMENT_ENTITY_TYPE } from '@/features/constants';
import { useToast } from '@/hooks/use-toast';
import { parseApiError } from '@/lib/error-handling';

interface FamilyBurdenValidationItem {
  burdenId: number;
  personId: number;
  employeeFullName: string;
  employeeIdCard: string;
  dependentId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  disabilityTypeId?: number | null;
  disabilityTypeName?: string | null;
  statusTypeId?: number | null;
  statusName: string;
  createdAt?: string | null;
  approvedAt?: string | null;
  approvedByName?: string | null;
  rejectedAt?: string | null;
  rejectedByName?: string | null;
  rejectionReason?: string | null;
}

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  REGISTRADO: 'secondary',
  APROBADO: 'default',
  RECHAZADO: 'destructive',
};
const STATUS_LABEL: Record<string, string> = {
  REGISTRADO: 'Pendiente',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
};

function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Diálogo de detalle + documentos + acciones ────────────────────────────

function DetailDialog({
  item,
  onClose,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  item: FamilyBurdenValidationItem | null;
  onClose: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number, reason: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  if (!item) return null;
  const age = calculateAge(item.birthDate);
  const canDecide = item.statusName === 'REGISTRADO';

  return (
    <Dialog open={!!item} onOpenChange={(v) => { if (!v) { setRejecting(false); setReason(''); onClose(); } }}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {item.firstName} {item.lastName}
          </DialogTitle>
          <DialogDescription>
            Carga familiar de <strong>{item.employeeFullName}</strong> ({item.employeeIdCard})
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 rounded-md p-3">
          <div>
            <p className="text-xs text-muted-foreground">Identificación</p>
            <p className="font-medium">{item.dependentId}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fecha de nacimiento</p>
            <p className="font-medium">{formatDate(item.birthDate)}{age !== null && ` (${age} años)`}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Discapacidad</p>
            <p className="font-medium">{item.disabilityTypeName ?? 'No'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estado</p>
            <Badge variant={STATUS_BADGE_VARIANT[item.statusName] ?? 'outline'}>
              {STATUS_LABEL[item.statusName] ?? item.statusName}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Registrado</p>
            <p className="font-medium">{formatDate(item.createdAt)}</p>
          </div>
          {item.statusName === 'APROBADO' && (
            <div>
              <p className="text-xs text-muted-foreground">Aprobado</p>
              <p className="font-medium">{formatDate(item.approvedAt)} — {item.approvedByName ?? '—'}</p>
            </div>
          )}
          {item.statusName === 'RECHAZADO' && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Rechazado</p>
              <p className="font-medium">{formatDate(item.rejectedAt)} — {item.rejectedByName ?? '—'}</p>
              {item.rejectionReason && <p className="text-xs text-destructive mt-1">Motivo: {item.rejectionReason}</p>}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" /> Documentos adjuntos
          </Label>
          <ReusableDocumentManager
            directoryCode={FAMILY_MEMBER_DOCUMENT_DIRECTORY_CODE}
            entityType={FAMILY_MEMBER_DOCUMENT_ENTITY_TYPE}
            entityId={item.burdenId}
            entityReady
            disabled
            roles={{ canUpload: false, canDelete: false, canPreview: true }}
          />
        </div>

        {canDecide && !rejecting && (
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => setRejecting(true)}
              disabled={isApproving || isRejecting}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" /> Rechazar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => onApprove(item.burdenId)}
              disabled={isApproving || isRejecting}
            >
              {isApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
              Aprobar
            </Button>
          </DialogFooter>
        )}

        {canDecide && rejecting && (
          <div className="space-y-2">
            <Label className="text-xs">Motivo del rechazo *</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique el motivo del rechazo…"
            />
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setRejecting(false)} disabled={isRejecting}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => onReject(item.burdenId, reason)}
                disabled={isRejecting || !reason.trim()}
              >
                {isRejecting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Confirmar rechazo
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Tarjetas de resumen (dato gerencial) ─────────────────────────────────

interface FamilyBurdenStats {
  totalCount: number;
  registeredCount: number;
  approvedCount: number;
  rejectedCount: number;
  disabilityCount: number;
}

function StatsCards({ stats, isLoading }: { stats: FamilyBurdenStats | null; isLoading: boolean }) {
  const cards = [
    { label: 'Total registros', value: stats?.totalCount, icon: ListChecks, tone: 'text-foreground' },
    { label: 'Pendientes', value: stats?.registeredCount, icon: Clock, tone: 'text-amber-600 dark:text-amber-400' },
    { label: 'Aprobados', value: stats?.approvedCount, icon: CheckCircle2, tone: 'text-green-600 dark:text-green-400' },
    { label: 'Rechazados', value: stats?.rejectedCount, icon: XCircle, tone: 'text-destructive' },
    { label: 'Con discapacidad', value: stats?.disabilityCount, icon: Accessibility, tone: 'text-blue-600 dark:text-blue-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <c.icon className={`h-6 w-6 sm:h-7 sm:w-7 shrink-0 ${c.tone}`} />
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold leading-tight">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : c.value ?? 0}
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Página principal ───────────────────────────────────────────────────────

export default function FamilyBurdenValidationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: statsResp, isLoading: statsLoading } = useQuery({
    queryKey: ['family-burden-stats'],
    queryFn: () => CargasFamiliaresAPI.getStats(),
  });
  const stats: FamilyBurdenStats | null = statsResp?.status === 'success' ? statsResp.data : null;

  const [statusFilter, setStatusFilter] = useState<string>('REGISTRADO');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [selected, setSelected] = useState<FamilyBurdenValidationItem | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const { data: statusTypesResp } = useQuery({
    queryKey: ['reftypes', 'FAMILY_BURDEN_STATUS'],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.FAMILY_BURDEN_STATUS),
    staleTime: 10 * 60 * 1000,
  });
  const statusTypes: any[] = statusTypesResp?.status === 'success' ? statusTypesResp.data ?? [] : [];
  const statusIdByName = new Map<string, number>(
    statusTypes.map((t: any) => [String(t.name), Number(t.typeId ?? t.typeID)])
  );

  const selectedStatusTypeId = statusFilter === 'ALL' ? undefined : statusIdByName.get(statusFilter);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['family-burden-validation', statusFilter, selectedStatusTypeId, page],
    queryFn: () =>
      CargasFamiliaresAPI.getForValidation({
        statusTypeId: selectedStatusTypeId ?? null,
        page,
        pageSize,
      }),
    enabled: statusFilter === 'ALL' || statusTypes.length > 0,
  });

  const result = data?.status === 'success' ? data.data : null;
  const items: FamilyBurdenValidationItem[] = result?.items ?? [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['family-burden-validation'] });
    queryClient.invalidateQueries({ queryKey: ['family-burden-stats'] });
  };

  const handleApprove = async (id: number) => {
    setApprovingId(id);
    try {
      const res = await CargasFamiliaresAPI.approve(id);
      if (res.status === 'error') {
        toast({ title: 'Error', description: parseApiError(res.error).message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Carga familiar aprobada' });
      setSelected(null);
      refresh();
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id: number, reason: string) => {
    setRejectingId(id);
    try {
      const res = await CargasFamiliaresAPI.reject(id, reason.trim());
      if (res.status === 'error') {
        toast({ title: 'Error', description: parseApiError(res.error).message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Carga familiar rechazada' });
      setSelected(null);
      refresh();
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">Validación de Cargas Familiares</h1>
          <p className="text-sm text-muted-foreground">Aprueba o rechaza las cargas familiares registradas</p>
        </div>
      </div>

      <StatsCards stats={stats} isLoading={statsLoading} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Filtro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-1.5">
            <Label className="text-xs text-muted-foreground">Estado</Label>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REGISTRADO">Pendientes de validar</SelectItem>
                <SelectItem value="APROBADO">Aprobados</SelectItem>
                <SelectItem value="RECHAZADO">Rechazados</SelectItem>
                <SelectItem value="ALL">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
            Resultados {result ? `(${result.totalCount})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || isFetching ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">Sin registros con este filtro.</p>
          ) : (
            <>
              {/* ── Móvil: tarjetas ── */}
              <div className="sm:hidden space-y-3">
                {items.map((item) => (
                  <button
                    key={item.burdenId}
                    type="button"
                    onClick={() => setSelected(item)}
                    className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{item.firstName} {item.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.employeeFullName} · {item.employeeIdCard}
                        </p>
                      </div>
                      <Badge variant={STATUS_BADGE_VARIANT[item.statusName] ?? 'outline'} className="shrink-0">
                        {STATUS_LABEL[item.statusName] ?? item.statusName}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>Nac.: {formatDate(item.birthDate)}</span>
                      {item.disabilityTypeName && <span className="text-destructive">Discapacidad</span>}
                    </div>
                  </button>
                ))}
              </div>

              {/* ── Escritorio: tabla ── */}
              <div className="hidden sm:block rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Carga Familiar</TableHead>
                      <TableHead>Nacimiento</TableHead>
                      <TableHead>Discapacidad</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead>Registrado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.burdenId} className="cursor-pointer" onClick={() => setSelected(item)}>
                        <TableCell>
                          <p className="text-sm font-medium">{item.employeeFullName}</p>
                          <p className="text-xs text-muted-foreground">{item.employeeIdCard}</p>
                        </TableCell>
                        <TableCell className="text-sm">{item.firstName} {item.lastName}</TableCell>
                        <TableCell className="text-xs font-mono">{formatDate(item.birthDate)}</TableCell>
                        <TableCell className="text-xs">{item.disabilityTypeName ?? '—'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={STATUS_BADGE_VARIANT[item.statusName] ?? 'outline'}>
                            {STATUS_LABEL[item.statusName] ?? item.statusName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{formatDate(item.createdAt)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {item.statusName === 'REGISTRADO' ? (
                            <Button size="sm" variant="outline" onClick={() => setSelected(item)}>
                              Revisar
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => setSelected(item)}>
                              Ver
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {result && result.totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground mt-3">
                  <span>Página {result.page} de {result.totalPages}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= result.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <DetailDialog
        item={selected}
        onClose={() => setSelected(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        isApproving={approvingId !== null}
        isRejecting={rejectingId !== null}
      />
    </div>
  );
}
