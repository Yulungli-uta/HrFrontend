// Panel "Documento firmado (final)" de las pantallas de Corrección de acciones y contratos.
// Es el único lugar para cargar/reemplazar el firmado en cualquier estado: crea una versión nueva (la anterior
// queda inactiva con quién, cuándo y motivo) y NO cambia el estado ni dispara efectos del flujo.
// Los anexos (resoluciones, oficios, memos) se gestionan aparte, en su panel de documentos.
import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, FileCheck, Loader2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ActionIconButton } from '@/components/ui/action-icon-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReusableDocumentManager, type ReusableDocumentManagerHandle } from '@/components/ReusableDocumentManager';
import { PdfPreviewModal } from '@/components/reports/PdfPreviewModal';
import { MIN_REPLACE_REASON } from '@/components/documents/ReplaceSignedConfirmDialog';
import { useDirectoryParams } from '@/hooks/directoryParams/useDirectoryParams';
import { useToast } from '@/hooks/use-toast';
import { useSignedFilePreview } from '@/hooks/useSignedFilePreview';
import { signedDocumentVersionsKey, useSignedDocumentVersions, type SignedDocumentKind } from '@/hooks/useSignedDocumentVersions';
import { ContractsRHAPI, PersonnelActionsAPI } from '@/lib/api/services/contracts';
import { DocumentsAPI } from '@/lib/api';
import { formatDateTime } from '@/lib/clock';
import {
  CONTRACT_DIRECTORY_CODE,
  CONTRACT_ENTITY_TYPE,
  PERSONNEL_ACTION_DIRECTORY_CODE,
  PERSONNEL_ACTION_ENTITY_TYPE,
} from '@/features/constants';
import type { DocumentUploadResultDto } from '@/types/documents';

const CONFIG: Record<SignedDocumentKind, { directoryCode: string; entityType: string; subject: string }> = {
  action: { directoryCode: PERSONNEL_ACTION_DIRECTORY_CODE, entityType: PERSONNEL_ACTION_ENTITY_TYPE, subject: 'la acción' },
  contract: { directoryCode: CONTRACT_DIRECTORY_CODE, entityType: CONTRACT_ENTITY_TYPE, subject: 'el contrato' },
};

type Props = {
  kind: SignedDocumentKind;
  /** ActionId o ContractID. */
  id: number;
};

export function SignedDocumentPanel({ kind, id }: Props) {
  const cfg = CONFIG[kind];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const managerRef = useRef<ReusableDocumentManagerHandle>(null);
  const { directory, params } = useDirectoryParams(cfg.directoryCode);

  const versions = useSignedDocumentVersions(kind, id);
  const list = versions.data ?? [];
  const current = list.find((v) => v.isCurrent);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Vista previa de cualquier versión (también las archivadas): se baja por GUID.
  const guidByFileId = useMemo(() => new Map(list.map((v) => [v.storedFileId, v.fileGuid])), [list]);
  const fetchByFileId = useCallback(
    (fileId: number) => DocumentsAPI.download(guidByFileId.get(fileId) ?? ''),
    [guidByFileId]
  );
  const { open: openPreview, close: closePreview, loadingId, preview } = useSignedFilePreview(fetchByFileId);

  const replaceMutation = useMutation({
    mutationFn: async (payload: { storedFileId: number; reason: string | null }) => {
      const api = kind === 'action' ? PersonnelActionsAPI : ContractsRHAPI;
      const res = await api.replaceSignedDocument(id, payload);
      if (res.status === 'error') throw new Error(res.error.message);
    },
  });

  const reasonRequired = !!current;
  const reasonValid = !reasonRequired || reason.trim().length >= MIN_REPLACE_REASON;
  const isBusy = isUploading || replaceMutation.isPending;

  const closeDialog = () => {
    if (isBusy) return;
    setDialogOpen(false);
    setReason('');
  };

  const handleConfirm = async () => {
    if (!managerRef.current) return;
    if (managerRef.current.getSelectedCount() === 0) {
      toast({ variant: 'destructive', title: 'Sin archivo', description: 'Selecciona el documento firmado antes de continuar.' });
      return;
    }
    if (!reasonValid) return;

    setIsUploading(true);
    const result: DocumentUploadResultDto | null = await managerRef.current.uploadAll(id);
    setIsUploading(false);

    const storedFileId = result?.items?.[0]?.storedFile?.fileId;
    if (!result || result.uploaded === 0 || !storedFileId) {
      const detail = result?.items?.[0]?.message ?? result?.message ?? 'Revisa los datos del archivo e intenta de nuevo.';
      toast({ variant: 'destructive', title: 'Error al subir el archivo', description: detail });
      return;
    }

    try {
      await replaceMutation.mutateAsync({ storedFileId, reason: reason.trim() || null });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error al registrar el documento firmado',
        description: e instanceof Error ? e.message : 'Error inesperado.',
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: signedDocumentVersionsKey(kind, id) });
    queryClient.invalidateQueries({ queryKey: ['signed-files'] });
    toast({
      title: current ? 'Documento firmado reemplazado' : 'Documento firmado registrado',
      description: current ? 'La versión anterior quedó inactiva en el historial.' : 'Quedó como versión 1.',
    });
    setDialogOpen(false);
    setReason('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
            <FileCheck className="h-4 w-4" aria-hidden="true" />
            Documento firmado (final)
          </CardTitle>
          <Button size="sm" onClick={() => setDialogOpen(true)} disabled={versions.isLoading}>
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            {current ? 'Reemplazar documento firmado' : 'Cargar documento firmado'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {versions.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Cargando" />
        ) : versions.isError ? (
          <p className="text-sm text-destructive" role="alert">{(versions.error as Error).message}</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay documento firmado cargado para {cfg.subject}. Este panel es solo para el documento final; los
            anexos (resoluciones, oficios, memos) se cargan en el panel de documentos.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {list.map((v) => (
              <li key={v.versionId} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">Versión {v.versionNo}</span>
                    <StatusBadge label={v.isCurrent ? 'Vigente' : 'Anterior'} tone={v.isCurrent ? 'success' : 'muted'} />
                    <span className="truncate text-sm text-muted-foreground">{v.fileName ?? '—'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cargada por {v.uploadedByName ?? '—'} el {formatDateTime(v.uploadedAt)}
                    {v.replacedAt ? ` · reemplazada por ${v.replacedByName ?? '—'} el ${formatDateTime(v.replacedAt)}` : ''}
                  </p>
                  {v.reason && <p className="text-xs">Motivo del reemplazo: {v.reason}</p>}
                </div>
                {loadingId === v.storedFileId ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Abriendo archivo" />
                ) : (
                  <ActionIconButton
                    icon={Eye}
                    label={`Visualizar versión ${v.versionNo}`}
                    touch
                    onClick={() => openPreview(v.storedFileId, `Versión ${v.versionNo}`)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(v) => (v ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" aria-hidden="true" />
              {current ? 'Reemplazar documento firmado' : 'Cargar documento firmado'}
            </DialogTitle>
            <DialogDescription>
              {current
                ? `Ya hay un documento firmado cargado (versión ${current.versionNo}). Si continúa, el nuevo archivo será la versión vigente y el anterior quedará inactivo en el historial. No cambia el estado.`
                : `Sube el PDF firmado de ${cfg.subject}. No cambia el estado.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="min-w-0 [overflow-wrap:anywhere]">
              <ReusableDocumentManager
              ref={managerRef}
              directoryCode={directory?.code ?? cfg.directoryCode}
              entityType={cfg.entityType}
              entityId={id}
              relativePath={params.relativePath}
              documentRole="signed"
              accept={params.accept || '.pdf'}
              maxSizeMB={params.maxSizeMB}
              maxFiles={1}
              label="Documento firmado"
              // El firmado vigente solo se cambia reemplazándolo (versión nueva); eliminarlo se rechaza en el backend.
              roles={{ canUpload: true, canPreview: true, canDownload: true, canDelete: false }}
              showInternalUploadButton={false}
              entityReady={id > 0}
              disabled={isBusy}
            />
            </div>
            {reasonRequired && (
              <div className="space-y-2">
                <Label htmlFor="signed-replace-reason">Motivo del reemplazo (obligatorio)</Label>
                <Textarea
                  id="signed-replace-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                  rows={3}
                  disabled={isBusy}
                  placeholder="Ej.: el escaneo anterior estaba incompleto."
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isBusy}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={isBusy || !reasonValid}>
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {current ? 'Continuar y reemplazar' : 'Confirmar carga'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PdfPreviewModal isOpen={preview !== null} onClose={closePreview} base64Data={preview?.base64 ?? null} reportName={preview?.title ?? ''} />
    </Card>
  );
}
