// src/components/contracts/ContractActions.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  FileText,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  Eye,
} from 'lucide-react';
import { ContractUploadSignedDialog } from './ContractUploadSignedDialog';
import { DocumentsAPI } from '@/lib/api';

type ContractStatus = 'BORRADOR' | 'GENERADO' | 'PENDIENTE_FIRMAS' | 'FIRMADO_CARGADO' | 'VIGENTE' | 'FINALIZADO' | 'ANULADO';
type DialogType = 'generate' | 'markPending' | 'uploadSigned' | 'finalize' | 'cancel';

type Props = {
  contractId: number;
  status: string;
  isBusy: boolean;
  onGenerateDocument: (payload?: { overrides?: Record<string, string>; forceRegenerate?: boolean }) => void;
  onMarkPending: (payload?: { comment?: string | null }) => void;
  onFinalize: (payload?: { comment?: string | null }) => void;
  onCancel: (payload: { reason: string }) => void;
  documentOverrides?: Record<string, string>;
  onUploadSuccess?: () => void;
  /** ID numérico del archivo firmado (signedDocumentStoredFileId del contrato) */
  signedDocumentStoredFileId?: number | null;
};

export function ContractActions({
  contractId,
  status,
  isBusy,
  onGenerateDocument,
  onMarkPending,
  onFinalize,
  onCancel,
  documentOverrides,
  onUploadSuccess,
  signedDocumentStoredFileId,
}: Props) {
  const [activeDialog, setActiveDialog] = useState<DialogType | null>(null);
  const [comment, setComment] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isOpeningSignedDoc, setIsOpeningSignedDoc] = useState(false);

  async function handleViewSignedDocument() {
    if (!signedDocumentStoredFileId) return;
    setIsOpeningSignedDoc(true);
    try {
      const res = await DocumentsAPI.listByEntity({
        directoryCode: 'HRCONTRACT',
        entityType: 'HRCONTRACT',
        entityId: String(contractId),
        status: 1,
      });
      const files = res.status === 'success' ? res.data : [];
      const file = files.find(f => f.fileId === signedDocumentStoredFileId);
      if (!file) {
        const latest = files.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        if (!latest) return;
        const blob = await DocumentsAPI.download(latest.fileGuid);
        if (blob.status !== 'success') return;
        const url = URL.createObjectURL(blob.data);
        window.open(url, '_blank');
        return;
      }
      const blob = await DocumentsAPI.download(file.fileGuid);
      if (blob.status !== 'success') return;
      const url = URL.createObjectURL(blob.data);
      window.open(url, '_blank');
    } finally {
      setIsOpeningSignedDoc(false);
    }
  }

  const s = status as ContractStatus;
  const isTerminal = s === 'FINALIZADO' || s === 'ANULADO';

  const openDialog = (type: DialogType) => {
    setComment('');
    setCancelReason('');
    setActiveDialog(type);
  };
  const closeDialog = () => setActiveDialog(null);

  const confirmGenerate = () => {
    onGenerateDocument({
      overrides: documentOverrides,
      forceRegenerate: s === 'GENERADO',
    });
    closeDialog();
  };

  const confirmMarkPending = () => {
    onMarkPending({ comment: comment.trim() || undefined });
    closeDialog();
  };

  const confirmFinalize = () => {
    onFinalize({ comment: comment.trim() || undefined });
    closeDialog();
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) return;
    onCancel({ reason: cancelReason.trim() });
    closeDialog();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {/* BORRADOR / GENERADO: generar documento */}
        {(s === 'BORRADOR' || s === 'GENERADO') && (
          <Button size="sm" onClick={() => openDialog('generate')} disabled={isBusy}>
            {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {s === 'GENERADO' ? 'Regenerar Documento' : 'Generar Documento'}
          </Button>
        )}

        {/* GENERADO: marcar pendiente de firmas */}
        {s === 'GENERADO' && (
          <Button size="sm" variant="outline" onClick={() => openDialog('markPending')} disabled={isBusy}>
            <ClipboardCheck className="mr-2 h-4 w-4" /> Marcar Pendiente de Firmas
          </Button>
        )}

        {/* PENDIENTE_FIRMAS: cargar firmado */}
        {s === 'PENDIENTE_FIRMAS' && (
          <Button size="sm" onClick={() => openDialog('uploadSigned')} disabled={isBusy}>
            <Upload className="mr-2 h-4 w-4" /> Cargar Documento Firmado
          </Button>
        )}

        {/* FIRMADO_CARGADO / VIGENTE / FINALIZADO: ver documento firmado */}
        {(s === 'FIRMADO_CARGADO' || s === 'VIGENTE' || s === 'FINALIZADO') && signedDocumentStoredFileId && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleViewSignedDocument}
            disabled={isOpeningSignedDoc}
          >
            {isOpeningSignedDoc
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Eye className="mr-2 h-4 w-4" />}
            Ver Documento Firmado
          </Button>
        )}

        {/* FIRMADO_CARGADO: finalizar */}
        {s === 'FIRMADO_CARGADO' && (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => openDialog('finalize')}
            disabled={isBusy}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar
          </Button>
        )}

        {/* Anular (cualquier estado no terminal) */}
        {!isTerminal && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => openDialog('cancel')}
            disabled={isBusy}
          >
            <XCircle className="mr-2 h-4 w-4" /> Anular
          </Button>
        )}
      </div>

      {/* Dialog — Generar / Regenerar */}
      <AlertDialog open={activeDialog === 'generate'} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {s === 'GENERADO' ? 'Regenerar Documento' : 'Generar Documento'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {s === 'GENERADO'
                ? 'Se regenerará el documento con los datos actuales. El anterior será reemplazado.'
                : 'Se generará el documento del contrato desde la plantilla configurada en el tipo de contrato.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGenerate}>
              {s === 'GENERADO' ? 'Regenerar' : 'Generar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog — Marcar pendiente de firmas */}
      <AlertDialog open={activeDialog === 'markPending'} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" /> Marcar Pendiente de Firmas
            </AlertDialogTitle>
            <AlertDialogDescription>
              El contrato pasará al estado <b>PENDIENTE_FIRMAS</b> para firma física.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 space-y-2">
            <Label>Comentario (opcional)</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Observaciones…" rows={2} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkPending}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog — Finalizar */}
      <AlertDialog open={activeDialog === 'finalize'} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" /> Finalizar Contrato
            </AlertDialogTitle>
            <AlertDialogDescription>
              El contrato quedará <b>FINALIZADO</b>. Esta operación no se puede revertir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 space-y-2">
            <Label>Comentario (opcional)</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Observaciones…" rows={2} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-green-600 hover:bg-green-700" onClick={confirmFinalize}>
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog — Anular */}
      <AlertDialog open={activeDialog === 'cancel'} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" /> Anular Contrato
            </AlertDialogTitle>
            <AlertDialogDescription>
              El contrato quedará sin validez operativa. Esta operación no se puede revertir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 space-y-2">
            <Label>Motivo de anulación <span className="text-destructive">*</span></Label>
            <Input
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Indique el motivo…"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={confirmCancel}
              disabled={!cancelReason.trim()}
            >
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog — Cargar firmado (usa ReusableDocumentManager) */}
      <ContractUploadSignedDialog
        open={activeDialog === 'uploadSigned'}
        onOpenChange={(v) => { if (!v) closeDialog(); }}
        contractId={contractId}
        onSuccess={onUploadSuccess}
      />
    </>
  );
}
