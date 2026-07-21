import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UnsavedChangesDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
  /**
   * Opcional: si se provee, agrega un tercer botón "Guardar" que corre el guardado
   * real del formulario (con su propia validación) antes de salir. Omitirlo mantiene
   * el diálogo tal como estaba (solo "Continuar editando" / "Salir sin guardar").
   */
  onSave?: () => void;
  saveLabel?: string;
  isSaving?: boolean;
}

export function UnsavedChangesDialog({
  open,
  onClose,
  onConfirmExit,
  onSave,
  saveLabel = "Guardar",
  isSaving = false,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Salir sin guardar?</AlertDialogTitle>
          <AlertDialogDescription>
            Tiene cambios sin guardar. {onSave ? "¿Desea guardarlos antes de salir?" : "Si sale ahora, se perderán."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Continuar editando</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            onClick={onConfirmExit}
          >
            Salir sin guardar
          </AlertDialogAction>
          {onSave && (
            <AlertDialogAction onClick={onSave} disabled={isSaving}>
              {isSaving ? "Guardando..." : saveLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
