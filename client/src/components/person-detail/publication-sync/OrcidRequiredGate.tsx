import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UnsavedChangesDialog } from "@/components/ui/UnsavedChangesDialog";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useResearcherProfile } from "@/hooks/usePublicationSync";
import { useOrcidEntry } from "@/hooks/useOrcidEntry";
import { useToast } from "@/hooks/use-toast";
import { OrcidEntryFields } from "@/components/person-detail/publication-sync/OrcidEntryFields";

const SESSION_KEY = "orcidGateDismissed";

const wasDismissed = (personId: number): boolean => {
  try {
    return sessionStorage.getItem(`${SESSION_KEY}:${personId}`) === "1";
  } catch {
    return false;
  }
};

const markDismissed = (personId: number) => {
  try {
    sessionStorage.setItem(`${SESSION_KEY}:${personId}`, "1");
  } catch {
    // Sin sessionStorage el aviso simplemente puede volver a mostrarse.
  }
};

interface OrcidRequiredGateProps {
  personId: number;
  /** Solo en el perfil propio: es la persona quien registra su ORCID. */
  isOwnProfile: boolean;
}

/**
 * Pide el ORCID al entrar a Publicaciones del perfil propio: ventana (con "Más tarde") y, si se pospone,
 * un banner permanente. No muestra nada si ya hay ORCID o si se consulta el perfil de otra persona.
 */
export function OrcidRequiredGate({ personId, isOwnProfile }: OrcidRequiredGateProps) {
  const { toast } = useToast();
  const profile = useResearcherProfile(personId, { enabled: isOwnProfile });
  const [open, setOpen] = useState(false);

  const guard = useUnsavedChangesGuard((o) => {
    setOpen(o);
    if (!o) {
      markDismissed(personId);
      entry.reset();
    }
  });

  const entry = useOrcidEntry({
    personId,
    onSaved: (result) => {
      toast({
        title: "ORCID guardado",
        description: result.warning ?? "Ya puede sincronizar sus publicaciones.",
      });
      guard.close();
    },
  });

  const missing = isOwnProfile && profile.isSuccess && !profile.data.orcid && profile.data.canEdit;

  useEffect(() => {
    if (missing && !wasDismissed(personId)) setOpen(true);
  }, [missing, personId]);

  if (!missing) return null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <span className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Registre su ORCID para poder sincronizar sus publicaciones.
        </span>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Registrar ORCID
        </Button>
      </div>

      <Dialog open={open} onOpenChange={guard.handleOpenChange}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Registre su ORCID</DialogTitle>
            <DialogDescription>
              El ORCID es su identificador de investigador y es único: no puede repetirse en otra persona.
              Se usa para traer sus publicaciones desde plataformas científicas.
            </DialogDescription>
          </DialogHeader>
          <OrcidEntryFields
            id="gate-orcid"
            value={entry.value}
            onChange={(v) => {
              entry.onChange(v);
              guard.setIsFormDirty(v.trim() !== "");
            }}
            error={entry.error}
            confirmName={entry.confirmName}
            disabled={entry.isPending}
          />
          <DialogFooter>
            <Button variant="outline" disabled={entry.isPending} onClick={() => guard.handleOpenChange(false)}>
              Más tarde
            </Button>
            <Button onClick={() => void entry.submit()} disabled={entry.isPending}>
              {entry.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {entry.submitLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog open={guard.confirmOpen} onClose={guard.closeConfirm} onConfirmExit={guard.confirmExit} />
    </>
  );
}
