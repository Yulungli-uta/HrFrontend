// src/components/resignationRetirement/ReviewActionDialog.tsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';
import { DB_FIELD_LIMITS } from '@/features/dbFieldLimits';
import { ResignationRetirementAPI } from '@/lib/api/services/resignationRetirement';
import { parseApiError } from '@/lib/api/utils/error-handling';
import type { ResignationRetirementDetail } from '@/types/resignation-retirement';

export type ReviewActionKind = 'approve' | 'reject' | 'return' | 'cancel';

const ACTION_CONFIG: Record<ReviewActionKind, { title: string; description: string; requireObservation: boolean; confirmLabel: string; destructive?: boolean }> = {
  approve: {
    title: 'Aprobar solicitud',
    description: 'La solicitud pasará a estado Aprobado. Esta acción queda registrada en el historial.',
    requireObservation: false,
    confirmLabel: 'Aprobar',
  },
  reject: {
    title: 'Rechazar solicitud',
    description: 'Indica el motivo del rechazo. El solicitante podrá verlo en el historial.',
    requireObservation: true,
    confirmLabel: 'Rechazar',
    destructive: true,
  },
  return: {
    title: 'Devolver para corrección',
    description: 'Indica qué debe corregir el solicitante. La solicitud volverá a Pendiente al reenviarla.',
    requireObservation: true,
    confirmLabel: 'Devolver',
  },
  cancel: {
    title: 'Anular solicitud',
    description: 'Esta acción anula la solicitud de forma definitiva. Indica el motivo.',
    requireObservation: true,
    confirmLabel: 'Anular',
    destructive: true,
  },
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: ReviewActionKind;
  request: ResignationRetirementDetail;
  onSuccess: () => void;
};

export function ReviewActionDialog({ open, onOpenChange, action, request, onSuccess }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [observation, setObservation] = useState('');
  const config = ACTION_CONFIG[action];

  const {
    setIsFormDirty,
    handleOpenChange: guardedOpenChange,
    confirmOpen: unsavedConfirmOpen,
    confirmExit: confirmUnsavedExit,
    closeConfirm: closeUnsavedConfirm,
  } = useUnsavedChangesGuard((v) => {
    if (!v) setObservation('');
    onOpenChange(v);
  });

  // Documento firmado obligatorio para aprobar (validado también en backend). La carga
  // se restringe a un solo archivo, así que basta con el más reciente de la lista.
  const signedDocument = request.supportingDocuments[0] ?? null;
  const missingSignedDocument = action === 'approve' && !signedDocument;

  const mutation = useMutation({
    mutationFn: async () => {
      const rowVersion = request.rowVersion;
      if (action === 'approve') {
        if (!signedDocument) {
          throw new Error('Debe existir un documento firmado adjunto a la solicitud antes de aprobar.');
        }
        const res = await ResignationRetirementAPI.approve(request.requestId, {
          storedFileId: signedDocument.fileId,
          observation: observation || null,
          rowVersion,
        });
        if (res.status !== 'success') throw new Error(parseApiError(res.error));
        return res.data;
      }
      if (action === 'reject') {
        const res = await ResignationRetirementAPI.reject(request.requestId, { observation, rowVersion });
        if (res.status !== 'success') throw new Error(parseApiError(res.error));
        return res.data;
      }
      if (action === 'return') {
        const res = await ResignationRetirementAPI.return(request.requestId, { observation, rowVersion });
        if (res.status !== 'success') throw new Error(parseApiError(res.error));
        return res.data;
      }
      const res = await ResignationRetirementAPI.cancel(request.requestId, { reason: observation, rowVersion });
      if (res.status !== 'success') throw new Error(parseApiError(res.error));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignation-retirement-requests'] });
      queryClient.invalidateQueries({ queryKey: ['resignation-retirement-request', request.requestId] });
      toast({ title: `Solicitud ${config.confirmLabel.toLowerCase()}da correctamente` });
      setObservation('');
      setIsFormDirty(false);
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast({ variant: 'destructive', title: 'No se pudo completar la acción', description: parseApiError(err) });
    },
  });

  const canSubmit = (!config.requireObservation || observation.trim().length > 0) && !missingSignedDocument;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!mutation.isPending) guardedOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        {missingSignedDocument && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            No se puede aprobar: la solicitud no tiene un documento firmado adjunto. Cierre este diálogo y
            suba el documento firmado antes de aprobar.
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="observation">
            Observación {config.requireObservation && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id="observation"
            value={observation}
            onChange={(e) => { setObservation(e.target.value); setIsFormDirty(e.target.value.trim().length > 0); }}
            rows={4}
            maxLength={DB_FIELD_LIMITS.resignationRetirementStatusHistory.observation}
            placeholder={config.requireObservation ? 'Obligatorio…' : 'Opcional…'}
            disabled={mutation.isPending}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => guardedOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className={config.destructive ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : undefined}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {config.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
      <UnsavedChangesDialog
        open={unsavedConfirmOpen}
        onClose={closeUnsavedConfirm}
        onConfirmExit={confirmUnsavedExit}
      />
    </Dialog>
  );
}
