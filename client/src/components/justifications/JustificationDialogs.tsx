import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "./StatusBadge";
import type { Justification } from "@/types/justifications";

export function CreateDialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode; }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Justificación</DialogTitle>
          <DialogDescription>Complete el formulario para justificar una marcación faltante o incorrecta.</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function DetailDialog({
  open, onOpenChange, justification, typeName, bossName
}: {
  open: boolean; onOpenChange: (v: boolean) => void; justification: Justification | null;
  typeName: string; bossName: string;
}) {
  if (!justification) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalles de la Justificación</DialogTitle>
          <DialogDescription>Información completa de la solicitud de justificación</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-lg">{typeName}</h3>
              <p className="text-sm text-gray-600">
                Creado el {format(parseISO(justification.createdAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
              </p>
            </div>
            <StatusBadge status={justification.status} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Fecha a justificar</Label>
                <p className="mt-1">
                  {justification.justificationDate
                    ? format(parseISO(justification.justificationDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
                    : "No especificada"}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Horas solicitadas</Label>
                <p className="mt-1">{justification.hoursRequested ?? "No especificado"}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Jefe asignado</Label>
                <p className="mt-1">{bossName}</p>
              </div>
            </div>

            <div className="space-y-4">
              {justification.startDate && (
                <div>
                  <Label className="text-sm font-medium">Hora de inicio</Label>
                  <p className="mt-1">
                    {format(parseISO(justification.startDate), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
              )}

              {justification.endDate && (
                <div>
                  <Label className="text-sm font-medium">Hora de fin</Label>
                  <p className="mt-1">
                    {format(parseISO(justification.endDate), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
              )}

              {justification.approvedAt && (
                <div>
                  <Label className="text-sm font-medium">Fecha de {justification.status === "APPROVED" ? "aprobación" : "rechazo"}</Label>
                  <p className="mt-1">{format(parseISO(justification.approvedAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Motivo detallado</Label>
              <p className="mt-2 p-3 bg-gray-50 rounded-md text-sm">{justification.reason}</p>
            </div>

            {justification.comments && (
              <div>
                <Label className="text-sm font-medium">Comentarios del jefe</Label>
                <p className="mt-2 p-3 bg-blue-50 rounded-md text-sm">{justification.comments}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDialog({
  open, onOpenChange, onConfirm, isDeleting
}: {
  open: boolean; onOpenChange: (v: boolean) => void; onConfirm: () => void; isDeleting: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Está seguro de eliminar esta justificación?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción no se puede deshacer. La justificación será eliminada permanentemente.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onConfirm}>
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
