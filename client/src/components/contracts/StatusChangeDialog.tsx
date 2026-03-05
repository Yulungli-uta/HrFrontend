import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, MessageSquare } from "lucide-react";

export function StatusChangeDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  required?: boolean;
  onConfirm: (comment: string | null) => Promise<void> | void;
}) {
  const { open, onOpenChange, title, description, required = true, onConfirm } = props;

  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setComment("");
      setSaving(false);
    }
  }, [open]);

  async function handleConfirm() {
    const v = comment.trim();
    if (required && !v) return;

    try {
      setSaving(true);
      await onConfirm(v ? v : null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error al confirmar:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {title ?? "Confirmar cambio de estado"}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {required && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                El comentario es obligatorio para mantener un registro de auditoría del cambio.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="status-comment">
              Comentario {required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="status-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe el motivo del cambio de estado..."
              rows={4}
              className={required && !comment.trim() ? "border-destructive" : ""}
            />
            {required && !comment.trim() && (
              <p className="text-xs text-destructive">Este campo es obligatorio</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving || (required && !comment.trim())}>
            {saving ? "Procesando..." : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}