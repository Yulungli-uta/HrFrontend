// src/pages/ContractsHistoricalEntry.tsx
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, History } from 'lucide-react';
import { ContractDialog } from '@/components/contracts/ContractDialog';

type DialogMode = 'create' | 'view' | 'edit';

/** Ayer (YYYY-MM-DD) — un contrato histórico ya concluyó, nunca empieza/termina hoy ni futuro. */
function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default function ContractsHistoricalEntry() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<DialogMode>('create');
  const maxDate = yesterday();

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) navigate('/contracts');
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="space-y-1">
        <Link href="/contracts">
          <Button variant="ghost" size="sm" className="mb-1 -ml-2 text-muted-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Contratos
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6" /> Ingresar Histórico
        </h1>
        <p className="text-sm text-muted-foreground">
          Registra un contrato pasado que nunca se cargó al sistema, con su fecha real.
        </p>
      </div>

      <Alert className="border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
        <History className="h-4 w-4" />
        <AlertDescription>
          Esto es un registro <strong>histórico</strong>: usa la fecha real en que ocurrió, no la
          de hoy. Se abre el mismo formulario de creación de contratos de siempre — al guardarlo,
          o si cierras sin guardar, vuelves al listado de Contratos.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          El formulario se abre en una ventana emergente sobre esta pantalla.
        </CardContent>
      </Card>

      <ContractDialog
        open={open}
        onOpenChange={handleOpenChange}
        mode={mode}
        setMode={setMode}
        selected={null}
        maxDate={maxDate}
      />
    </div>
  );
}
