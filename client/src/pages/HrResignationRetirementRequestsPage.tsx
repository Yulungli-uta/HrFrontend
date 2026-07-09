// src/pages/HrResignationRetirementRequestsPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardList, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { TiposReferenciaAPI } from '@/lib/api';
import { REF_TYPE_CATEGORIES } from '@/features/refTypeCategories';
import { ResignationRetirementAPI } from '@/lib/api/services/resignationRetirement';
import { parseApiError } from '@/lib/api/utils/error-handling';
import { RequestStatusBadge } from '@/components/resignationRetirement/RequestStatusBadge';
import { HrRequestDetailDialog } from '@/components/resignationRetirement/HrRequestDetailDialog';
import type {
  ResignationRetirementQueryFilter,
  ResignationRetirementRequestType,
  ResignationRetirementStatus,
  ResignationRetirementSummary,
} from '@/types/resignation-retirement';

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

const ALL = '__ALL__';

export default function HrResignationRetirementRequestsPage() {
  const [page, setPage] = useState(1);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [requestType, setRequestType] = useState<ResignationRetirementRequestType | ''>('');
  const [status, setStatus] = useState<ResignationRetirementStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filter: ResignationRetirementQueryFilter = {
    page,
    pageSize: 15,
    requestType: requestType || undefined,
    status: status || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['resignation-retirement-requests', filter],
    queryFn: () => ResignationRetirementAPI.getPaged(filter),
  });

  const { data: requestTypesResp } = useQuery({
    queryKey: ['ref-types', REF_TYPE_CATEGORIES.RESIGNATION_RETIREMENT_TYPE],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.RESIGNATION_RETIREMENT_TYPE),
    staleTime: 5 * 60_000,
  });
  const requestTypeOptions = requestTypesResp?.status === 'success' ? requestTypesResp.data : [];
  const requestTypeLabel: Record<string, string> = Object.fromEntries(
    requestTypeOptions.map((t) => [t.name, t.description])
  );

  const result = data?.status === 'success' ? data.data : null;
  const items: ResignationRetirementSummary[] = result?.items ?? [];

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="p-2 bg-primary/15 rounded-lg">
            <ClipboardList className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
          </div>
          Solicitudes de Renuncia/Jubilación
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Revisión de Recursos Humanos. Restringido a los departamentos permitidos según tu alcance de acceso.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={requestType || ALL}
              onValueChange={(v) => { setPage(1); setRequestType(v === ALL ? '' : (v as ResignationRetirementRequestType)); }}
            >
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {requestTypeOptions.map((t) => (
                  <SelectItem key={t.name} value={t.name}>{t.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select
              value={status || ALL}
              onValueChange={(v) => { setPage(1); setStatus(v === ALL ? '' : (v as ResignationRetirementStatus)); }}
            >
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="EN_REVISION">En revisión</SelectItem>
                <SelectItem value="DEVUELTO">Devuelto</SelectItem>
                <SelectItem value="APROBADO">Aprobado</SelectItem>
                <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                <SelectItem value="ANULADO">Anulado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Desde</Label>
            <Input type="date" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value); }} />
          </div>
          <div className="space-y-1.5">
            <Label>Hasta</Label>
            <Input type="date" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value); }} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="border-destructive/40">
          <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{parseApiError(error)}</p>
            <Button onClick={() => refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3 font-medium">Empleado</th>
                    <th className="p-3 font-medium">Dependencia</th>
                    <th className="p-3 font-medium">Tipo</th>
                    <th className="p-3 font-medium">Fecha propuesta</th>
                    <th className="p-3 font-medium">Estado</th>
                    <th className="p-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No hay solicitudes con estos filtros.
                      </td>
                    </tr>
                  ) : (
                    items.map((r) => (
                      <tr key={r.requestId} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3">
                          <div className="font-medium">{r.employeeFullName}</div>
                          <div className="text-xs text-muted-foreground">{r.employeeIdCard}</div>
                        </td>
                        <td className="p-3">{r.departmentName ?? '—'}</td>
                        <td className="p-3">{requestTypeLabel[r.requestType] ?? r.requestType}</td>
                        <td className="p-3">{formatDate(r.proposedExitDate)}</td>
                        <td className="p-3"><RequestStatusBadge status={r.status} /></td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRequestId(r.requestId)}
                          >
                            Revisar
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {result && result.totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Página {result.page} de {result.totalPages} — {result.totalCount} solicitudes
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= result.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <HrRequestDetailDialog
        open={selectedRequestId !== null}
        onOpenChange={(open) => !open && setSelectedRequestId(null)}
        requestId={selectedRequestId}
        onChanged={() => refetch()}
      />
    </div>
  );
}
