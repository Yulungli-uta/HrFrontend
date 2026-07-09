// src/pages/MyCertificatesPage.tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FileBadge, Plus, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TiposReferenciaAPI } from '@/lib/api';
import { REF_TYPE_CATEGORIES } from '@/features/refTypeCategories';
import { EmployeeCertificatesAPI } from '@/lib/api/services/employeeSelfService';
import { parseApiError } from '@/lib/api/utils/error-handling';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CertificateDetailDialog } from '@/components/selfService/CertificateDetailDialog';

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EMITIDO: 'Emitido',
  RECHAZADO: 'Rechazado',
  ANULADO: 'Anulado',
};

function statusTone(status: string): 'success' | 'warning' | 'destructive' | 'muted' {
  if (status === 'EMITIDO') return 'success';
  if (status === 'PENDIENTE') return 'warning';
  if (status === 'RECHAZADO') return 'destructive';
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

export default function MyCertificatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [certificateType, setCertificateType] = useState('LABORAL');
  const [purpose, setPurpose] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: () => EmployeeCertificatesAPI.getMy({ page: 1, pageSize: 20 }),
  });

  const { data: certTypesResp } = useQuery({
    queryKey: ['ref-types', REF_TYPE_CATEGORIES.EMPLOYEE_CERTIFICATE_TYPE],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.EMPLOYEE_CERTIFICATE_TYPE),
    staleTime: 5 * 60_000,
  });
  const certTypeOptions = certTypesResp?.status === 'success' ? certTypesResp.data : [];

  const result = data?.status === 'success' ? data.data : null;
  const items = result?.items ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await EmployeeCertificatesAPI.createMy({ certificateType, purpose: purpose || null });
      if (res.status !== 'success') throw new Error(parseApiError(res.error));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-certificates'] });
      toast({ title: 'Certificado emitido', description: 'Tu certificado laboral está listo para descargar.' });
      setPurpose('');
      setIsCreateOpen(false);
    },
    onError: (err: unknown) => {
      toast({ variant: 'destructive', title: 'No se pudo generar el certificado', description: parseApiError(err) });
    },
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/15 rounded-lg">
              <FileBadge className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            </div>
            Mis Certificados Laborales
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Solicita y descarga tus certificados. Se emiten automáticamente al solicitarlos.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Solicitar certificado
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
                    <th className="p-3 font-medium">Tipo</th>
                    <th className="p-3 font-medium">Motivo</th>
                    <th className="p-3 font-medium">Fecha</th>
                    <th className="p-3 font-medium">Estado</th>
                    <th className="p-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No has solicitado certificados todavía.
                      </td>
                    </tr>
                  ) : (
                    items.map((c) => (
                      <tr key={c.requestId} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3">
                          {certTypeOptions.find((t) => t.name === c.certificateType)?.description ?? c.certificateType}
                        </td>
                        <td className="p-3">{c.purpose || '—'}</td>
                        <td className="p-3">{formatDate(c.createdAt)}</td>
                        <td className="p-3">
                          <StatusBadge label={STATUS_LABEL[c.status] ?? c.status} tone={statusTone(c.status)} />
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="outline" size="sm" onClick={() => setSelectedId(c.requestId)}>
                            Ver
                          </Button>
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

      <Dialog open={isCreateOpen} onOpenChange={(o) => { if (!createMutation.isPending) setIsCreateOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar certificado</DialogTitle>
            <DialogDescription>
              Se genera automáticamente con tus datos registrados en el sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Tipo de certificado</Label>
            <Select value={certificateType} onValueChange={setCertificateType} disabled={createMutation.isPending}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {certTypeOptions.map((t) => (
                  <SelectItem key={t.name} value={t.name}>{t.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purpose">Motivo (opcional)</Label>
            <Textarea
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Ej. Trámite bancario, visa, etc."
              rows={3}
              disabled={createMutation.isPending}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Solicitar y generar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CertificateDetailDialog
        open={selectedId !== null}
        onOpenChange={(o) => !o && setSelectedId(null)}
        requestId={selectedId}
      />
    </div>
  );
}
