// src/components/personnelActions/StatusHistoryTimeline.tsx
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import { PersonnelActionsAPI } from '@/lib/api/services/contracts';
import type { PersonnelActionStatusHistory } from '@/types/personnel-actions';

const STATUS_ICON: Record<string, React.ReactNode> = {
  FINALIZADO: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  ANULADO: <XCircle className="h-4 w-4 text-destructive" />,
};

function StatusIcon({ status }: { status: string }) {
  return (STATUS_ICON[status] ?? <Clock className="h-4 w-4 text-muted-foreground" />) as JSX.Element;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

type Props = { actionId: number };

export function StatusHistoryTimeline({ actionId }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['personnel-action-history', actionId],
    queryFn: () => PersonnelActionsAPI.history(actionId),
    staleTime: 30_000,
  });

  const entries: PersonnelActionStatusHistory[] =
    data?.status === 'success' ? data.data : [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando historial…
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive">Error al cargar el historial.</p>;
  }

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin historial de estados.</p>;
  }

  return (
    <ol className="relative border-l border-border ml-3 space-y-6">
      {entries.map((entry) => (
        <li key={entry.historyId} className="ml-6">
          <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background ring-2 ring-border">
            <StatusIcon status={entry.statusCode} />
          </span>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold leading-tight">
              {entry.fromStatus ? (
                <span className="text-muted-foreground font-normal">{entry.fromStatus} → </span>
              ) : null}
              {entry.statusCode}
            </p>
            <p className="text-xs text-muted-foreground">{formatDate(entry.changedAt)}</p>
            {entry.comment && (
              <p className="text-xs text-muted-foreground italic">"{entry.comment}"</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
