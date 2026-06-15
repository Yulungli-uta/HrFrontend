import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useGuardReadinessCheck } from '@/hooks/guards/useGuards';

interface Props {
  targetDate: string;
}

export function GuardReadinessPanel({ targetDate }: Props) {
  const { data, isLoading, isError, refetch } = useGuardReadinessCheck(targetDate);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Verificando configuración del módulo...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>No se pudo verificar la configuración del módulo.</span>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (data.isReady) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="font-medium mb-2">
          La configuración del módulo de guardias está incompleta. Completa los siguientes pasos antes de generar planificación:
        </div>
        <ul className="space-y-1.5">
          {data.items.map((item) => (
            <li key={item.key} className="flex items-start gap-2 text-sm">
              {item.passed ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              )}
              <div>
                <span className="font-medium">{item.label}</span>
                {item.detail && (
                  <span className="text-muted-foreground ml-1">— {item.detail}</span>
                )}
                {!item.passed && (
                  <Badge variant="destructive" className="ml-2 text-xs">Pendiente</Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
