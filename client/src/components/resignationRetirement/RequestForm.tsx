// src/components/resignationRetirement/RequestForm.tsx
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TiposReferenciaAPI } from '@/lib/api';
import { REF_TYPE_CATEGORIES } from '@/features/refTypeCategories';
import { ResignationRetirementAPI } from '@/lib/api/services/resignationRetirement';
import { parseApiError } from '@/lib/api/utils/error-handling';
import type {
  ResignationRetirementDetail,
  ResignationRetirementRequestType,
} from '@/types/resignation-retirement';

type Props = {
  /** Presente = editar una solicitud existente propia; ausente = crear una nueva. */
  existing?: ResignationRetirementDetail;
  onSuccess: () => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
};

const todayIso = () => new Date().toISOString().split('T')[0];

export function RequestForm({ existing, onSuccess, onCancel, onDirtyChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [requestType, setRequestType] = useState<ResignationRetirementRequestType>(
    existing?.requestType ?? 'RESIGNATION'
  );
  const [proposedExitDate, setProposedExitDate] = useState(existing?.proposedExitDate?.split('T')[0] ?? todayIso());
  const [reason, setReason] = useState(existing?.reason ?? '');
  const [additionalNotes, setAdditionalNotes] = useState(existing?.additionalNotes ?? '');

  useEffect(() => {
    const dirty =
      requestType !== (existing?.requestType ?? 'RESIGNATION') ||
      proposedExitDate !== (existing?.proposedExitDate?.split('T')[0] ?? todayIso()) ||
      reason !== (existing?.reason ?? '') ||
      additionalNotes !== (existing?.additionalNotes ?? '');
    onDirtyChange?.(dirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestType, proposedExitDate, reason, additionalNotes]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await ResignationRetirementAPI.createMy({
        requestType,
        proposedExitDate,
        reason: reason || null,
        additionalNotes: additionalNotes || null,
      });
      if (res.status !== 'success') throw new Error(parseApiError(res.error));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-resignation-retirement-requests'] });
      toast({ title: 'Solicitud creada', description: 'Tu solicitud fue registrada como Pendiente.' });
      onDirtyChange?.(false);
      onSuccess();
    },
    onError: (err: unknown) => {
      toast({ variant: 'destructive', title: 'No se pudo crear la solicitud', description: parseApiError(err) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!existing) throw new Error('Solicitud no encontrada.');
      const res = await ResignationRetirementAPI.updateMy(existing.requestId, {
        proposedExitDate,
        reason: reason || null,
        additionalNotes: additionalNotes || null,
        rowVersion: existing.rowVersion,
      });
      if (res.status !== 'success') throw new Error(parseApiError(res.error));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-resignation-retirement-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-resignation-retirement-request', existing?.requestId] });
      toast({ title: 'Solicitud actualizada' });
      onDirtyChange?.(false);
      onSuccess();
    },
    onError: (err: unknown) => {
      toast({ variant: 'destructive', title: 'No se pudo actualizar la solicitud', description: parseApiError(err) });
    },
  });

  const { data: requestTypesResp } = useQuery({
    queryKey: ['ref-types', REF_TYPE_CATEGORIES.RESIGNATION_RETIREMENT_TYPE],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.RESIGNATION_RETIREMENT_TYPE),
    enabled: !existing,
    staleTime: 5 * 60_000,
  });
  const requestTypeOptions = requestTypesResp?.status === 'success' ? requestTypesResp.data : [];

  const { data: employeeInfoResp } = useQuery({
    queryKey: ['resignation-retirement-current-employee-info'],
    queryFn: () => ResignationRetirementAPI.getCurrentEmployeeInfo(),
    enabled: !existing,
    staleTime: 5 * 60_000,
  });
  const employeeInfo = employeeInfoResp?.status === 'success' ? employeeInfoResp.data : null;
  // El backend es quien realmente impide crear la solicitud (CreateAsync la rechaza);
  // esto solo evita el viaje al servidor y muestra el motivo antes de intentarlo.
  const isRetirementBlocked =
    !existing && requestType === 'RETIREMENT' && !!employeeInfo && !employeeInfo.isRetirementEligible;

  const isBusy = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (existing) updateMutation.mutate();
    else createMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!existing && (
        <div className="space-y-2">
          <Label htmlFor="requestType">Tipo de solicitud</Label>
          <Select value={requestType} onValueChange={(v) => setRequestType(v as ResignationRetirementRequestType)}>
            <SelectTrigger id="requestType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {requestTypeOptions.map((t) => (
                <SelectItem key={t.name} value={t.name}>{t.description}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isRetirementBlocked && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/15 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{employeeInfo?.retirementEligibilityNote ?? 'Aún no cumples los requisitos de jubilación.'}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="proposedExitDate">Fecha propuesta de salida</Label>
        <Input
          id="proposedExitDate"
          type="date"
          value={proposedExitDate}
          onChange={(e) => setProposedExitDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Motivo</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo o justificación de la solicitud…"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="additionalNotes">Observaciones adicionales</Label>
        <Textarea
          id="additionalNotes"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isBusy}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isBusy || isRetirementBlocked}>
          {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {existing ? 'Guardar cambios' : 'Crear solicitud'}
        </Button>
      </div>
    </form>
  );
}
