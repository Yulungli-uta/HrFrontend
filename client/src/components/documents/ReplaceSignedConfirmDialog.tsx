// Aviso previo al reemplazo de un documento firmado ya cargado: el usuario decide si continuar y da el motivo.
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { formatDateTime } from '@/lib/clock';
import type { StoredFileVersion } from '@/types/storedFileVersions';

export const MIN_REPLACE_REASON = 5;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Versión vigente que quedaría inactiva. */
  current: StoredFileVersion | undefined;
  /** Texto del tipo de registro: "la acción" o "el contrato". */
  subject: 'la acción' | 'el contrato';
  onConfirm: (reason: string) => void;
};

export function ReplaceSignedConfirmDialog({ open, onOpenChange, current, subject, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= MIN_REPLACE_REASON;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setReason('');
        onOpenChange(v);
      }}
    >
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />
            Ya existe un documento firmado cargado
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                {current
                  ? `Versión ${current.versionNo}${current.uploadedByName ? `, cargada por ${current.uploadedByName}` : ''} el ${formatDateTime(current.uploadedAt)}`
                  : `Hay un documento firmado registrado para ${subject}.`}
              </p>
              <p>
                Si continúa, el nuevo archivo será la versión vigente y el anterior quedará inactivo en el historial
                (no se borra).
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="replace-signed-reason">Motivo del reemplazo (obligatorio)</Label>
          <Textarea
            id="replace-signed-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Ej.: el escaneo anterior estaba incompleto."
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            disabled={!valid}
            onClick={() => {
              const r = reason.trim();
              setReason('');
              onConfirm(r);
            }}
          >
            Continuar y reemplazar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
