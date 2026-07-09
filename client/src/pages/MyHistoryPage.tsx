// src/pages/MyHistoryPage.tsx
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, Loader2, AlertCircle, CalendarDays, Sun, FileBadge, ClipboardList, FileText } from 'lucide-react';
import { EmployeeSelfServiceAPI } from '@/lib/api/services/employeeSelfService';
import { parseApiError } from '@/lib/api/utils/error-handling';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { EmployeeSelfServiceHistoryEntry } from '@/types/employee-self-service';

const SOURCE_ICON: Record<EmployeeSelfServiceHistoryEntry['source'], React.ReactNode> = {
  PERMISSION: <CalendarDays className="h-4 w-4" />,
  VACATION: <Sun className="h-4 w-4" />,
  CERTIFICATE: <FileBadge className="h-4 w-4" />,
  INTERNAL_REQUEST: <ClipboardList className="h-4 w-4" />,
  JUSTIFICATION: <FileText className="h-4 w-4" />,
};

const SOURCE_LABEL: Record<EmployeeSelfServiceHistoryEntry['source'], string> = {
  PERMISSION: 'Permiso',
  VACATION: 'Vacaciones',
  CERTIFICATE: 'Certificado',
  INTERNAL_REQUEST: 'Solicitud interna',
  JUSTIFICATION: 'Justificación',
};

function statusTone(status: string): 'success' | 'warning' | 'destructive' | 'primary' | 'muted' {
  if (['EMITIDO', 'APROBADO', 'COMPLETADO', 'Approved', 'Completed'].includes(status)) return 'success';
  if (['PENDIENTE', 'DEVUELTO', 'Pending', 'Planned'].includes(status)) return 'warning';
  if (status === 'EN_REVISION' || status === 'InProgress') return 'primary';
  if (['RECHAZADO', 'ANULADO', 'Rejected', 'Canceled', 'Cancelled'].includes(status)) return 'destructive';
  return 'muted';
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return dateStr;
  }
}

export default function MyHistoryPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-self-service-history'],
    queryFn: () => EmployeeSelfServiceAPI.getHistory(),
  });

  const entries = data?.status === 'success' ? data.data : [];

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="p-2 bg-primary/15 rounded-lg">
            <History className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
          </div>
          Mi Historial
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Línea de tiempo consolidada de tus permisos, vacaciones, certificados y solicitudes internas.
        </p>
      </div>

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
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Todavía no tienes movimientos registrados.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <ol className="relative border-l border-border ml-3 space-y-6">
              {entries.map((entry, idx) => (
                <li key={`${entry.source}-${entry.sourceId}-${idx}`} className="ml-6">
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background ring-2 ring-border text-muted-foreground">
                    {SOURCE_ICON[entry.source]}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
                      {SOURCE_LABEL[entry.source]}: {entry.title}
                      <StatusBadge label={entry.status} tone={statusTone(entry.status)} />
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                    {entry.description && (
                      <p className="text-xs text-muted-foreground italic">"{entry.description}"</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
