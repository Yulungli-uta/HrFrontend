// src/components/resignationRetirement/RequestHistoryTimeline.tsx
import { CheckCircle2, Clock, XCircle, Undo2 } from 'lucide-react';
import type { ResignationRetirementStatusHistoryEntry } from '@/types/resignation-retirement';

const ACTION_ICON: Record<string, React.ReactNode> = {
  APPROVED: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  REJECTED: <XCircle className="h-4 w-4 text-destructive" />,
  CANCELLED: <XCircle className="h-4 w-4 text-destructive" />,
  RETURNED: <Undo2 className="h-4 w-4 text-orange-600" />,
};

function ActionIcon({ action }: { action: string }) {
  return (ACTION_ICON[action] ?? <Clock className="h-4 w-4 text-muted-foreground" />) as JSX.Element;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
}

const ACTION_LABEL: Record<string, string> = {
  CREATED: 'Creada',
  UPDATED: 'Actualizada',
  RESUBMITTED: 'Reenviada',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  RETURNED: 'Devuelta para corrección',
  CANCELLED: 'Anulada',
};

export function RequestHistoryTimeline({ entries }: { entries: ResignationRetirementStatusHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin historial de estados.</p>;
  }

  return (
    <ol className="relative border-l border-border ml-3 space-y-6">
      {entries.map((entry) => (
        <li key={entry.historyId} className="ml-6">
          <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background ring-2 ring-border">
            <ActionIcon action={entry.action} />
          </span>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold leading-tight">
              {entry.previousStatus ? (
                <span className="text-muted-foreground font-normal">{entry.previousStatus} → </span>
              ) : null}
              {entry.newStatus}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({ACTION_LABEL[entry.action] ?? entry.action})
              </span>
            </p>
            <p className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
            {entry.observation && (
              <p className="text-xs text-muted-foreground italic">"{entry.observation}"</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
