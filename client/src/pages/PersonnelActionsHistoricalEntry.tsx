// src/pages/PersonnelActionsHistoricalEntry.tsx
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';
import { ArrowLeft, History, Loader2, ExternalLink, Upload } from 'lucide-react';
import { PersonnelActionsAPI } from '@/lib/api/services/contracts';
import { PersonnelActionForm } from '@/components/personnelActions/PersonnelActionForm';
import { UploadSignedDocumentDialog } from '@/components/personnelActions/UploadSignedDocumentDialog';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useToast } from '@/hooks/use-toast';
import { parseApiError } from '@/lib/error-handling';
import type { CreatePersonnelActionRequest } from '@/types/personnel-actions';

/** Ayer (YYYY-MM-DD) — un registro histórico ya concluyó, nunca es hoy ni futuro. */
function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default function PersonnelActionsHistoricalEntry() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [pendingData, setPendingData] = useState<CreatePersonnelActionRequest | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const maxDate = yesterday();

  const {
    setIsFormDirty,
    handleOpenChange: guardedBack,
    confirmOpen: unsavedConfirmOpen,
    confirmExit: confirmUnsavedExit,
    closeConfirm: closeUnsavedConfirm,
  } = useUnsavedChangesGuard(() => navigate('/personnel-actions'));

  const createMutation = useMutation({
    mutationFn: (data: CreatePersonnelActionRequest) => PersonnelActionsAPI.create(data),
    onSuccess: (res) => {
      if (res.status === 'error') {
        toast({ title: '❌ Error', description: parseApiError(res.error).message, variant: 'destructive' });
        return;
      }
      toast({
        title: '✅ Registro histórico creado',
        description: 'Ya no representa el estado actual del empleado a menos que sea, por fecha, su registro más reciente.',
      });
      setIsFormDirty(false);
      setConfirmOpen(false);
      setLastCreatedId(res.data.actionId);
      setPendingData(null);
      setFormKey((k) => k + 1);
      setUploadOpen(true);
    },
    onError: (error: any) => {
      toast({ title: '❌ Error', description: parseApiError(error).message, variant: 'destructive' });
      setConfirmOpen(false);
    },
  });

  const handleFormSubmit = (data: CreatePersonnelActionRequest) => {
    setPendingData(data);
    setConfirmOpen(true);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="space-y-1">
        <Link href="/personnel-actions">
          <Button variant="ghost" size="sm" className="mb-1 -ml-2 text-muted-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Acciones de Personal
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6" /> Ingresar Histórico
        </h1>
        <p className="text-sm text-muted-foreground">
          Registra un movimiento pasado que nunca se cargó al sistema, con su fecha real.
        </p>
      </div>

      <Alert className="border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
        <History className="h-4 w-4" />
        <AlertDescription>
          Esto es un registro <strong>histórico</strong>: usa la fecha real en que ocurrió, no la de hoy.
          El sistema guarda el registro completo, pero solo actualiza el estado actual del empleado
          (departamento, cargo, sueldo vigente) si esta acción resulta ser, por fecha, la más reciente
          entre todas las suyas — así nunca pisa por accidente algo más nuevo que ya esté vigente.
        </AlertDescription>
      </Alert>

      {lastCreatedId != null && (
        <Alert className="border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>Último registro histórico creado: Acción #{lastCreatedId}.</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Subir documento firmado
              </Button>
              <Link href={`/personnel-actions/${lastCreatedId}`}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" /> Ver acción
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Datos del registro histórico</CardTitle>
          <CardDescription>Mismo formulario que una acción nueva — la diferencia es la fecha.</CardDescription>
        </CardHeader>
        <CardContent>
          <PersonnelActionForm
            key={formKey}
            isBusy={createMutation.isPending}
            onSubmit={handleFormSubmit}
            onCancel={() => guardedBack(false)}
            onDirtyChange={setIsFormDirty}
            maxDate={maxDate}
          />
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmas guardar este registro histórico?</AlertDialogTitle>
            <AlertDialogDescription>
              Se guardará con la fecha indicada. Solo reemplazará el estado actual del empleado si
              es, por fecha, su registro más reciente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={createMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={createMutation.isPending}
              onClick={(e) => { e.preventDefault(); if (pendingData) createMutation.mutate(pendingData); }}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar y guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UnsavedChangesDialog
        open={unsavedConfirmOpen}
        onClose={closeUnsavedConfirm}
        onConfirmExit={confirmUnsavedExit}
      />

      {/* isHistoricalEntry=true; deliberadamente NO se pasan requiresAdUserDisable/
          requiresAdUserCreation/employeeId/onAutoFinalize/onFinalizePreviousAction —
          un histórico no debe disparar ningún efecto de aprovisionamiento/bloqueo AD,
          ni siquiera los que este mismo diálogo dispararía desde el frontend. */}
      {lastCreatedId != null && (
        <UploadSignedDocumentDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          actionId={lastCreatedId}
          isHistoricalEntry
          onSuccess={() => {
            toast({ title: '✅ Documento cargado', description: 'El registro histórico quedó completo.' });
          }}
        />
      )}
    </div>
  );
}
