// src/components/personnelActions/PersonnelActionActions.tsx
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
  Pen,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  Eye,
} from 'lucide-react';
import { UploadSignedDocumentDialog } from './UploadSignedDocumentDialog';
import { DocumentsAPI } from '@/lib/api';
import type { CommentRequest, CancelPersonnelActionRequest } from '@/types/personnel-actions';
import { PERSONNEL_ACTION_DIRECTORY_CODE, PERSONNEL_ACTION_ENTITY_TYPE } from '@/features/constants';

type Status =
  | 'BORRADOR'
  | 'GENERADO'
  | 'PENDIENTE_FIRMAS'
  | 'FIRMADO_CARGADO'
  | 'VIGENTE'
  | 'FINALIZADO'
  | 'ANULADO';

type Props = {
  actionId: number;
  status: string;
  isBusy: boolean;
  onEdit?: () => void;
  onGenerateDocument: () => void;
  onMarkPending: (payload?: CommentRequest) => void;
  onFinalize: (payload?: CommentRequest) => void;
  onCancel: (payload: CancelPersonnelActionRequest) => void;
  /** ID numérico del archivo firmado (signedDocumentStoredFileId de la acción) */
  signedDocumentStoredFileId?: number | null;
  // Flags del tipo de acción para comportamiento automático al cargar el firmado
  requiresAdUserDisable?: boolean;
  requiresAdUserCreation?: boolean;
  employeeId?: number;
  onAutoFinalize?: () => Promise<void>;
  onFinalizePreviousAction?: () => Promise<void>;
  /** 2026-07-06: si el tipo participa en la cadena de "vigente" — pasa a VIGENTE
   * automáticamente al cargar el firmado, sin botón manual de "Finalizar". */
  reachesVigente?: boolean;
};

type DialogType = 'generate' | 'markPending' | 'finalize' | 'cancel' | 'uploadSigned';

export function PersonnelActionActions({
  actionId,
  status,
  isBusy,
  onEdit,
  onGenerateDocument,
  onMarkPending,
  onFinalize,
  onCancel,
  signedDocumentStoredFileId,
  requiresAdUserDisable = false,
  requiresAdUserCreation = false,
  employeeId,
  onAutoFinalize,
  onFinalizePreviousAction,
  reachesVigente = false,
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
        directoryCode: PERSONNEL_ACTION_DIRECTORY_CODE,
        entityType: PERSONNEL_ACTION_ENTITY_TYPE,
        entityId: String(actionId),
        status: 1,
      });
      const files = res.status === 'success' ? res.data : [];
      const file = files.find(f => f.fileId === signedDocumentStoredFileId)
        ?? files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      if (!file) return;
      const blob = await DocumentsAPI.download(file.fileGuid);
      if (blob.status !== 'success') return;
      window.open(URL.createObjectURL(blob.data), '_blank');
    } finally {
      setIsOpeningSignedDoc(false);
    }
  }

  const s = status as Status;
  // 2026-07-06: VIGENTE también es un estado "cerrado" para efectos de Anular —
  // no tiene sentido anular una acción que representa el estado actual de la
  // persona; para reemplazarla se crea una acción nueva, no se anula esta.
  const isTerminal = s === 'FINALIZADO' || s === 'ANULADO' || s === 'VIGENTE';

  const openDialog = (type: DialogType) => {
    setComment('');
    setCancelReason('');
    setActiveDialog(type);
  };
  const closeDialog = () => setActiveDialog(null);

  const confirmGenerate = () => {
    onGenerateDocument();
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
        {/* BORRADOR: editar */}
        {s === 'BORRADOR' && onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit} disabled={isBusy}>
            <Pen className="mr-2 h-4 w-4" /> Editar
          </Button>
        )}

        {/* BORRADOR: generar documento */}
        {s === 'BORRADOR' && (
          <Button size="sm" onClick={() => openDialog('generate')} disabled={isBusy}>
            <FileText className="mr-2 h-4 w-4" /> Generar Documento
          </Button>
        )}

        {/* GENERADO: editar */}
        {s === 'GENERADO' && onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit} disabled={isBusy}>
            <Pen className="mr-2 h-4 w-4" /> Editar
          </Button>
        )}

        {/* GENERADO: regenerar documento */}
        {s === 'GENERADO' && (
          <Button variant="outline" size="sm" onClick={() => openDialog('generate')} disabled={isBusy}>
            <FileText className="mr-2 h-4 w-4" /> Regenerar Documento
          </Button>
        )}

        {/* GENERADO: marcar pendiente de firmas */}
        {s === 'GENERADO' && (
          <Button size="sm" onClick={() => openDialog('markPending')} disabled={isBusy}>
            <ClipboardCheck className="mr-2 h-4 w-4" /> Marcar Pendiente de Firmas
          </Button>
        )}

        {/* PENDIENTE_FIRMAS: subir firmado */}
        {s === 'PENDIENTE_FIRMAS' && (
          <Button size="sm" onClick={() => openDialog('uploadSigned')} disabled={isBusy}>
            <Upload className="mr-2 h-4 w-4" /> Cargar Documento Firmado
          </Button>
        )}

        {/* FIRMADO_CARGADO / VIGENTE / FINALIZADO: ver documento firmado */}
        {(s === 'FIRMADO_CARGADO' || s === 'VIGENTE' || s === 'FINALIZADO') && signedDocumentStoredFileId && (
          <Button variant="outline" size="sm" onClick={handleViewSignedDocument} disabled={isOpeningSignedDoc}>
            {isOpeningSignedDoc
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Eye className="mr-2 h-4 w-4" />}
            Ver Documento Firmado
          </Button>
        )}

        {/* FIRMADO_CARGADO: finalizar (manual) — solo para tipos que NO llegan a
            VIGENTE automáticamente. Los que sí (reachesVigente=true) ya pasaron
            solos al cargar el documento firmado, sin este paso. */}
        {s === 'FIRMADO_CARGADO' && !reachesVigente && (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => openDialog('finalize')}
            disabled={isBusy}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar
          </Button>
        )}

        {/* VIGENTE: indicador informativo, sin acción — el estado ya representa
            que esta acción es la actual del empleado. */}
        {s === 'VIGENTE' && (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1.5 text-sm font-medium text-green-700 border border-green-200">
            <CheckCircle2 className="h-4 w-4" /> Vigente
          </span>
        )}

        {/* Anular (cualquier estado no terminal) */}
        {!isTerminal && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => openDialog('cancel')}
            disabled={isBusy}
          >
            {isBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Anular
          </Button>
        )}
      </div>

      {/* Dialog — Generar / Regenerar documento */}
      <AlertDialog open={activeDialog === 'generate'} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {s === 'GENERADO' ? 'Regenerar Documento' : 'Generar Documento'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {s === 'GENERADO'
                ? 'Se regenerará el documento con los datos actuales. El documento anterior será reemplazado.'
                : 'Se generará el documento institucional desde la plantilla correspondiente. La acción pasará al estado GENERADO.'}
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
              El documento se enviará para firma manual externa. La acción pasará a <b>PENDIENTE_FIRMAS</b>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 space-y-2">
            <Label>Comentario (opcional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Observaciones…"
              rows={2}
            />
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
              <CheckCircle2 className="h-5 w-5 text-green-600" /> Finalizar Acción
            </AlertDialogTitle>
            <AlertDialogDescription>
              El trámite se cerrará definitivamente. La acción pasará a <b>FINALIZADO</b>.
              Esta operación no se puede revertir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 space-y-2">
            <Label>Comentario (opcional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Observaciones…"
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={confirmFinalize}
            >
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
              <XCircle className="h-5 w-5 text-destructive" /> Anular Acción
            </AlertDialogTitle>
            <AlertDialogDescription>
              La acción quedará sin validez operativa. Esta operación no se puede revertir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 space-y-2">
            <Label>
              Motivo de anulación <span className="text-destructive">*</span>
            </Label>
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
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
      <UploadSignedDocumentDialog
        open={activeDialog === 'uploadSigned'}
        onOpenChange={(v) => { if (!v) closeDialog(); }}
        actionId={actionId}
        requiresAdUserDisable={requiresAdUserDisable}
        requiresAdUserCreation={requiresAdUserCreation}
        employeeId={employeeId}
        onAutoFinalize={onAutoFinalize}
        onFinalizePreviousAction={onFinalizePreviousAction}
        reachesVigente={reachesVigente}
      />
    </>
  );
}
