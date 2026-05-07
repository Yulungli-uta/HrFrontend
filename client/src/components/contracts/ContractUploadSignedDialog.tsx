// src/components/contracts/ContractUploadSignedDialog.tsx
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { ContractsRHAPI } from '@/lib/api/services/contracts';
import type { DocumentUploadResultDto } from '@/types/documents';
import { CONTRACT_DIRECTORY_CODE, CONTRACT_ENTITY_TYPE } from '@/features/constants';

const DIR_CODE = CONTRACT_DIRECTORY_CODE;
const ENTITY_TYPE = CONTRACT_ENTITY_TYPE;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: number;
  onSuccess?: () => void;
};

export function ContractUploadSignedDialog({ open, onOpenChange, contractId, onSuccess }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const managerRef = useRef<ReusableDocumentManagerHandle>(null);

  const [comment, setComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const { directory, params } = useDirectoryParams(DIR_CODE);

  const isBusy = isUploading || isRegistering;

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
    const result: DocumentUploadResultDto | null = await managerRef.current.uploadAll(contractId);
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

    setIsRegistering(true);
    try {
      const resp = await ContractsRHAPI.uploadSignedDocument(contractId, {
        storedFileId,
        comment: comment.trim() || undefined,
      });
      if (resp.status === 'success') {
        queryClient.invalidateQueries({ queryKey: ['contract-detail', contractId] });
        queryClient.invalidateQueries({ queryKey: ['contract-doc-status', contractId] });
        queryClient.invalidateQueries({ queryKey: ['contract-history', contractId] });
        queryClient.invalidateQueries({ queryKey: ['contracts-rh'] });
        toast({ title: 'Documento firmado registrado', description: 'El contrato pasó a FIRMADO_CARGADO.' });
        setComment('');
        onSuccess?.();
        onOpenChange(false);
      } else {
        const regDetail = resp.error?.message ?? 'Error al registrar el documento firmado.';
        toast({ variant: 'destructive', title: 'Error al registrar', description: regDetail });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al registrar el documento.';
      toast({ variant: 'destructive', title: 'Error al registrar', description: msg });
    } finally {
      setIsRegistering(false);
    }
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
            Sube el PDF con las firmas manuales del contrato para registrarlo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ReusableDocumentManager
            ref={managerRef}
            directoryCode={directory?.code ?? DIR_CODE}
            entityType={ENTITY_TYPE}
            entityId={contractId}
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
            <Label htmlFor="contract-signed-comment">Comentario (opcional)</Label>
            <Textarea
              id="contract-signed-comment"
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
