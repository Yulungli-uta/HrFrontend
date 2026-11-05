import { useState } from "react";
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { UnsavedChangesDialog } from "@/components/ui/UnsavedChangesDialog";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { usePublicationSyncReadiness, useResearcherProfileMutations } from "@/hooks/usePublicationSync";
import { useToast } from "@/hooks/use-toast";
import { checkOrcid } from "@/lib/orcid";
import { useOrcidEntry } from "@/hooks/useOrcidEntry";
import { OrcidEntryFields } from "@/components/person-detail/publication-sync/OrcidEntryFields";
import { formatDate } from "@/lib/clock";
import { DB_FIELD_LIMITS } from "@/features/dbFieldLimits";

interface ResearcherProfileCardProps {
  personId: number;
  /** Publicaciones sincronizadas de la persona: si hay, cambiar el ORCID exige confirmación. */
  syncedCount: number;
  /** Dentro de una Card propia (pestaña Personal): sin borde ni título duplicados. */
  embedded?: boolean;
}

/**
 * Perfil de investigador dentro de Publicaciones: ORCID y IDs por plataforma (Scopus, etc.). Edita solo la propia
 * persona o un Administrador (lo decide el servidor, que informa `canEdit`); el resto lo ve en solo lectura.
 */
export function ResearcherProfileCard({ personId, syncedCount, embedded = false }: ResearcherProfileCardProps) {
  const { toast } = useToast();
  const readiness = usePublicationSyncReadiness(personId);
  const { addProviderId, removeProviderId } = useResearcherProfileMutations(personId);

  const [orcidOpen, setOrcidOpen] = useState(false);
  const [confirmChange, setConfirmChange] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  const [addProvider, setAddProvider] = useState("");
  const [addValue, setAddValue] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const guard = useUnsavedChangesGuard((open) => {
    setOrcidOpen(open);
    if (!open) {
      entry.reset();
      setChangeError(null);
      setConfirmChange(false);
    }
  });

  const entry = useOrcidEntry({
    personId,
    onSaved: (result) => {
      toast({ title: "ORCID actualizado", description: result.warning ?? undefined });
      guard.close();
    },
  });

  if (readiness.isLoading) return <Skeleton className="mb-3 h-20 w-full" />;
  if (readiness.isError || !readiness.data) return null;

  const data = readiness.data;
  // Plataformas que admiten un ID de autor (obligatorio u opcional); las que usan el ORCID del perfil no.
  const providersWithId = data.providers.filter((p) => !p.usesProfileOrcid && !!p.idLabel);
  const hasOrcid = data.hasOrcid;
  const mustConfirm = hasOrcid && syncedCount > 0;

  const openOrcid = () => {
    entry.reset(data.orcid ?? "");
    setChangeError(null);
    setConfirmChange(false);
    setOrcidOpen(true);
  };

  const saveOrcid = async () => {
    const check = checkOrcid(entry.value);
    if (check.ok && check.orcid === data.orcid) {
      guard.close(); // sin cambios
      return;
    }
    if (check.ok && mustConfirm && !confirmChange) {
      setChangeError("Confirme que entiende el efecto del cambio para continuar.");
      return;
    }
    setChangeError(null);
    await entry.submit();
  };

  const saveProviderId = async () => {
    const provider = providersWithId.find((p) => p.code === addProvider);
    const value = addValue.trim();
    if (!provider) {
      setAddError("Elija la plataforma.");
      return;
    }
    if (!value) {
      setAddError(`Ingrese el ${provider.idLabel ?? "identificador"}.`);
      return;
    }
    if (provider.idPattern && !new RegExp(provider.idPattern).test(value)) {
      setAddError(`El ${provider.idLabel ?? "identificador"} no tiene un formato válido.`);
      return;
    }
    setAddError(null);
    try {
      await addProviderId.mutateAsync({ providerCode: provider.code, externalId: value });
      setAddValue("");
      toast({ title: "Identificador agregado" });
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "No se pudo guardar el identificador.");
    }
  };

  const removeId = async (id: number) => {
    try {
      await removeProviderId.mutateAsync(id);
      toast({ title: "Identificador eliminado" });
    } catch (e) {
      toast({
        title: "No se pudo eliminar",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <div className={embedded ? "space-y-3 text-sm" : "mb-3 space-y-3 rounded-md border p-3 text-sm"}>
      {!embedded && <p className="font-medium">Perfil de investigador</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">ORCID</p>
          {hasOrcid ? (
            <a
              href={`https://orcid.org/${data.orcid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
            >
              {data.orcid} <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <p className="text-muted-foreground">No registrado</p>
          )}
        </div>
        {data.canEdit && (
          <Button size="sm" variant="outline" onClick={openOrcid}>
            <Pencil className="mr-2 h-4 w-4" />
            {hasOrcid ? "Editar ORCID" : "Registrar ORCID"}
          </Button>
        )}
      </div>

      {hasOrcid && providersWithId.length > 0 && (
        <div className="space-y-2">
          {providersWithId.map((p) => (
            <div key={p.code} className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {p.idLabel ?? p.name}{!p.requiresProviderId && " (opcional)"}
              </p>
              {p.ids.length === 0 && <p className="text-muted-foreground">Sin registrar</p>}
              {p.ids.map((id) => (
                <div key={id.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    {p.profileUrlTemplate ? (
                      <a
                        href={p.profileUrlTemplate.replace("{id}", encodeURIComponent(id.externalId))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
                      >
                        {id.externalId} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="font-mono">{id.externalId}</span>
                    )}
                    {id.lastSyncedAt && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        Última sincronización: {formatDate(id.lastSyncedAt, "es-EC", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                  {data.canEdit && (
                    <ActionIconButton
                      icon={Trash2}
                      label="Quitar identificador"
                      tone="destructive"
                      disabled={removeProviderId.isPending}
                      onClick={() => removeId(id.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}

          {data.canEdit && (
            <div className="flex flex-wrap items-end gap-2 pt-1">
              <div className="space-y-1">
                <Label htmlFor="rp-provider" className="text-xs">Plataforma</Label>
                <select
                  id="rp-provider"
                  className="h-10 rounded-md border bg-background px-2 text-sm"
                  value={addProvider}
                  onChange={(e) => setAddProvider(e.target.value)}
                >
                  <option value="">Elegir…</option>
                  {providersWithId.map((p) => (
                    <option key={p.code} value={p.code}>{p.idLabel ?? p.name}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-40 flex-1 space-y-1">
                <Label htmlFor="rp-id" className="text-xs">Identificador</Label>
                <Input
                  id="rp-id"
                  value={addValue}
                  maxLength={DB_FIELD_LIMITS.researcher.providerExternalId}
                  onChange={(e) => setAddValue(e.target.value)}
                />
              </div>
              <Button size="sm" variant="outline" disabled={addProviderId.isPending} onClick={saveProviderId}>
                {addProviderId.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Agregar
              </Button>
            </div>
          )}
          {addError && <p className="text-sm text-destructive">{addError}</p>}
        </div>
      )}

      {!data.canEdit && !hasOrcid && (
        <p className="text-xs text-muted-foreground">Solo la propia persona o un Administrador puede registrar el ORCID.</p>
      )}

      <Dialog open={orcidOpen} onOpenChange={guard.handleOpenChange}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{hasOrcid ? "Editar ORCID" : "Registrar ORCID"}</DialogTitle>
            <DialogDescription>
              El ORCID es único: no puede repetirse en otra persona. Acepta el número o la URL de orcid.org.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <OrcidEntryFields
              id="rp-orcid"
              value={entry.value}
              onChange={(v) => {
                entry.onChange(v);
                guard.setIsFormDirty(v.trim() !== (data.orcid ?? ""));
              }}
              error={entry.error}
              confirmName={entry.confirmName}
              disabled={entry.isPending}
            />
            {mustConfirm && (
              <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={confirmChange}
                  onChange={(e) => setConfirmChange(e.target.checked)}
                />
                <span>
                  Esta persona ya tiene {syncedCount} publicación(es) sincronizada(s). Las ya importadas no cambian, pero
                  las próximas sincronizaciones usarán el nuevo ORCID. Entiendo el cambio.
                </span>
              </label>
            )}
            {changeError && <p className="text-sm text-destructive">{changeError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={entry.isPending} onClick={() => guard.handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveOrcid()} disabled={entry.isPending}>
              {entry.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {entry.submitLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog open={guard.confirmOpen} onClose={guard.closeConfirm} onConfirmExit={guard.confirmExit} />
    </div>
  );
}
