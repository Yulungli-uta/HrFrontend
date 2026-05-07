// src/components/personnelActions/UploadSignedDocumentDialog.tsx
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  ReusableDocumentManager,
  type ReusableDocumentManagerHandle,
} from '@/components/ReusableDocumentManager';
import { useDirectoryParams } from '@/hooks/directoryParams/useDirectoryParams';
import { PersonnelActionsAPI } from '@/lib/api/services/contracts';
import type { DocumentUploadResultDto } from '@/types/documents';
import { PERSONNEL_ACTION_DIRECTORY_CODE, PERSONNEL_ACTION_ENTITY_TYPE } from '@/features/constants';

const DIR_CODE = PERSONNEL_ACTION_DIRECTORY_CODE;
const ENTITY_TYPE = PERSONNEL_ACTION_ENTITY_TYPE;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionId: number;
  onSuccess?: () => void;
};

export function UploadSignedDocumentDialog({ open, onOpenChange, actionId, onSuccess }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const managerRef = useRef<ReusableDocumentManagerHandle>(null);

  const [comment, setComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { directory, params } = useDirectoryParams(DIR_CODE);

  const registerMutation = useMutation({
    mutationFn: (storedFileId: number) =>
      PersonnelActionsAPI.uploadSignedDocument(actionId, {
        storedFileId,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel-action', actionId] });
      queryClient.invalidateQueries({ queryKey: ['personnel-actions'] });
      queryClient.invalidateQueries({ queryKey: ['personnel-action-history', actionId] });
      toast({ title: 'Documento firmado registrado', description: 'La acción pasó a FIRMADO_CARGADO.' });
      setComment('');
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const detail = err instanceof Error ? err.message : 'Error inesperado al registrar el documento.';
      toast({ variant: 'destructive', title: 'Error al registrar', description: detail });
    },
  });

  const isBusy = isUploading || registerMutation.isPending;

  const handleConfirm = async () => {
    if (!managerRef.current) return;

    if (managerRef.current.getSelectedCount() === 0) {
      toast({
        variant: 'destructive',
        title: 'Sin archivo',
        description: 'Selecciona el documento firmado antes de continuar.',
      });
      return;
    }

    setIsUploading(true);
    const result: DocumentUploadResultDto | null = await managerRef.current.uploadAll(actionId);
    setIsUploading(false);

    if (!result || result.uploaded === 0) {
      const detail = result?.items?.[0]?.message ?? result?.message ?? 'Revisa los datos del archivo e intenta de nuevo.';
      toast({ variant: 'destructive', title: 'Error al subir el archivo', description: detail });
      return;
    }

    const storedFileId = result.items[0]?.storedFile?.fileId;
    if (!storedFileId) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se obtuvo el ID del archivo subido.' });
      return;
    }

    registerMutation.mutate(storedFileId);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isBusy) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Cargar Documento Firmado
          </DialogTitle>
          <DialogDescription>
            Sube el documento con las firmas manuales para continuar el trámite.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ReusableDocumentManager
            ref={managerRef}
            directoryCode={directory?.code ?? DIR_CODE}
            entityType={ENTITY_TYPE}
            entityId={actionId}
            relativePath={params.relativePath}
            accept={params.accept || '.pdf'}
            maxSizeMB={params.maxSizeMB}
            maxFiles={1}
            label="Documento firmado"
            showInternalUploadButton={false}
            entityReady={true}
            disabled={isBusy}
          />

          <div className="space-y-2">
            <Label htmlFor="signed-comment">Comentario (opcional)</Label>
            <Textarea
              id="signed-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Observaciones sobre las firmas obtenidas…"
              rows={3}
              disabled={isBusy}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isBusy}>
            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Carga
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
