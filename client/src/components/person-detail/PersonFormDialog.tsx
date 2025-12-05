// client/src/components/person-detail/PersonFormDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PersonForm from "@/components/forms/PersonForm";

interface PersonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: any;
  onSuccess: () => void;
}

export function PersonFormDialog({ open, onOpenChange, person, onSuccess }: PersonFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Modificar Información Personal</DialogTitle>
        </DialogHeader>
        <PersonForm 
          person={person}
          onSuccess={onSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}