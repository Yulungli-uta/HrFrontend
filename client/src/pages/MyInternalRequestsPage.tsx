// src/pages/MyInternalRequestsPage.tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { ClipboardList, Plus, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';
import { EmployeeInternalRequestsAPI } from '@/lib/api/services/employeeSelfService';
import { parseApiError } from '@/lib/api/utils/error-handling';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { InternalRequestDetailDialog } from '@/components/selfService/InternalRequestDetailDialog';
import type { EmployeeInternalRequestType } from '@/types/employee-self-service';

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente', EN_REVISION: 'En revisión', DEVUELTO: 'Devuelto',
  APROBADO: 'Aprobado', RECHAZADO: 'Rechazado', ANULADO: 'Anulado', COMPLETADO: 'Completado',
};

const TYPE_LABEL: Record<string, string> = {
  ACTUALIZACION_DATOS: 'Corrección de datos',
  DOCUMENTO: 'Documento',
  INFORMACION: 'Información',
  OTRO: 'Otro',
};

function statusTone(status: string): 'success' | 'warning' | 'destructive' | 'primary' | 'muted' {
  if (['APROBADO', 'COMPLETADO'].includes(status)) return 'success';
  if (['PENDIENTE', 'DEVUELTO'].includes(status)) return 'warning';
  if (status === 'EN_REVISION') return 'primary';
  if (['RECHAZADO', 'ANULADO'].includes(status)) return 'destructive';
  return 'muted';
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function MyInternalRequestsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [requestType, setRequestType] = useState<EmployeeInternalRequestType>('INFORMACION');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const { setIsFormDirty, handleOpenChange, close: closeForm, confirmOpen, confirmExit, closeConfirm } =
    useUnsavedChangesGuard(setIsCreateOpen);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-internal-requests'],
    queryFn: () => EmployeeInternalRequestsAPI.getMy({ page: 1, pageSize: 20 }),
  });

  const result = data?.status === 'success' ? data.data : null;
  const items = result?.items ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await EmployeeInternalRequestsAPI.createMy({ requestType, subject, description: description || null });
      if (res.status !== 'success') throw new Error(parseApiError(res.error));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-internal-requests'] });
      toast({ title: 'Solicitud creada', description: 'Tu solicitud fue registrada como Pendiente.' });
      setSubject(''); setDescription(''); setIsFormDirty(false);
      closeForm();
    },
    onError: (err: unknown) => {
      toast({ variant: 'destructive', title: 'No se pudo crear la solicitud', description: parseApiError(err) });
    },
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/15 rounded-lg">
              <ClipboardList className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            </div>
            Mis Solicitudes Internas
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Corrección de datos, documentos, información u otros trámites administrativos.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva solicitud
        </Button>
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
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3 font-medium">Asunto</th>
                    <th className="p-3 font-medium">Tipo</th>
                    <th className="p-3 font-medium">Fecha</th>
                    <th className="p-3 font-medium">Estado</th>
                    <th className="p-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No tienes solicitudes registradas.
                      </td>
                    </tr>
                  ) : (
                    items.map((r) => (
                      <tr key={r.requestId} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3">{r.subject}</td>
                        <td className="p-3">{TYPE_LABEL[r.requestType] ?? r.requestType}</td>
                        <td className="p-3">{formatDate(r.createdAt)}</td>
                        <td className="p-3">
                          <StatusBadge label={STATUS_LABEL[r.status] ?? r.status} tone={statusTone(r.status)} />
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="outline" size="sm" onClick={() => setSelectedId(r.requestId)}>Ver</Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isCreateOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva solicitud interna</DialogTitle>
            <DialogDescription>
              Para corrección de cédula, nombres, cargo, dependencia o régimen — esos datos no se editan directo,
              requieren revisión de Recursos Humanos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Tipo de solicitud</Label>
              <Select value={requestType} onValueChange={(v) => { setRequestType(v as EmployeeInternalRequestType); setIsFormDirty(true); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTUALIZACION_DATOS">Corrección de datos</SelectItem>
                  <SelectItem value="DOCUMENTO">Documento</SelectItem>
                  <SelectItem value="INFORMACION">Información</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Asunto</Label>
              <Input id="subject" value={subject} onChange={(e) => { setSubject(e.target.value); setIsFormDirty(true); }} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" rows={4} value={description}
                onChange={(e) => { setDescription(e.target.value); setIsFormDirty(true); }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !subject.trim()}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Crear solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog open={confirmOpen} onClose={closeConfirm} onConfirmExit={confirmExit} />

      <InternalRequestDetailDialog
        open={selectedId !== null}
        onOpenChange={(o) => !o && setSelectedId(null)}
        requestId={selectedId}
        onChanged={() => refetch()}
      />
    </div>
  );
}
