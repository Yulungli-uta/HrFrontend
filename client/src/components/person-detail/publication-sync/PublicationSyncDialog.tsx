import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PublicationSyncAPI,
  type PublicationSyncItem,
  type PublicationSyncPreview,
  type PublicationSyncResult,
  type SyncItemStatus,
  type SyncProviderStatus,
  type SyncResolution,
  type SyncResolutionAction,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { parseApiError } from "@/lib/error-handling";
import { formatDate } from "@/lib/clock";
import { useOrcidEntry } from "@/hooks/useOrcidEntry";
import { OrcidEntryFields } from "@/components/person-detail/publication-sync/OrcidEntryFields";
import { DB_FIELD_LIMITS } from "@/features/dbFieldLimits";
import {
  unwrap,
  usePublicationSyncReadiness,
  useResearcherProfileMutations,
} from "@/hooks/usePublicationSync";

type Step = "check" | "orcid" | "providers" | "previewing" | "preview" | "confirming" | "done" | "error";

interface PublicationSyncDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  personId: number;
}

const ITEM_LABEL: Record<SyncItemStatus, string> = {
  NEW: "Nueva",
  EXISTING: "Ya existe",
  COMPLETABLE: "Completa un registro",
  LOCKED: "Aprobada/rechazada",
  AMBIGUOUS: "Posible duplicado",
  ERROR: "Con error",
};

/**
 * Sincronización de publicaciones: ORCID → proveedores → vista previa → confirmación.
 * La vista previa no guarda nada; lo que se importa queda "En revisión" hasta que la Dirección de Investigación lo apruebe.
 */
export function PublicationSyncDialog({ open, onOpenChange, personId }: PublicationSyncDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const readiness = usePublicationSyncReadiness(personId, { enabled: open });
  const { addProviderId, removeProviderId } = useResearcherProfileMutations(personId);

  const [step, setStep] = useState<Step>("check");
  const [idInputs, setIdInputs] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [providerCode, setProviderCode] = useState<string | null>(null);
  const [preview, setPreview] = useState<PublicationSyncPreview | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, SyncResolutionAction>>({});
  const [linkTargets, setLinkTargets] = useState<Record<string, number>>({});
  const [result, setResult] = useState<PublicationSyncResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const data = readiness.data;

  const entry = useOrcidEntry({
    personId,
    onSaved: (saved) => {
      if (saved.warning) toast({ title: "ORCID guardado", description: saved.warning });
      setStep("providers");
    },
  });

  // Reinicia al abrir; el paso inicial depende de lo que informe el servidor.
  useEffect(() => {
    if (!open) return;
    setStep("check");
    entry.reset();
    setIdInputs({});
    setFormError(null);
    setProviderCode(null);
    setPreview(null);
    setResolutions({});
    setLinkTargets({});
    setResult(null);
    setErrorMessage(null);
  }, [open, personId]);

  useEffect(() => {
    if (!open || step !== "check" || readiness.isFetching) return;
    if (readiness.isError || !data) return;
    setStep(data.hasOrcid ? "providers" : "orcid");
  }, [open, step, readiness.isFetching, readiness.isError, data]);

  const providers = useMemo(() => data?.providers ?? [], [data]);

  const saveProviderId = async (provider: SyncProviderStatus) => {
    const value = (idInputs[provider.code] ?? "").trim();
    if (!value) {
      setFormError(`Ingrese el ${provider.idLabel ?? "identificador"} de ${provider.name}.`);
      return;
    }
    if (provider.idPattern && !new RegExp(provider.idPattern).test(value)) {
      setFormError(`El ${provider.idLabel ?? "identificador"} de ${provider.name} no tiene un formato válido.`);
      return;
    }
    setFormError(null);
    try {
      await addProviderId.mutateAsync({ providerCode: provider.code, externalId: value });
      setIdInputs((prev) => ({ ...prev, [provider.code]: "" }));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "No se pudo guardar el identificador.");
    }
  };

  const loadPreview = async (code: string) => {
    setProviderCode(code);
    setStep("previewing");
    setErrorMessage(null);
    try {
      const res = unwrap(await PublicationSyncAPI.preview(personId, code), "No se pudo consultar el proveedor.");
      if (!res.available) {
        setErrorMessage(res.message || "El proveedor no respondió en este momento. Intente más tarde.");
        setStep("error");
        return;
      }
      setPreview(res);
      const initial: Record<string, SyncResolutionAction> = {};
      const targets: Record<string, number> = {};
      res.items
        .filter((i) => i.status === "AMBIGUOUS")
        .forEach((i) => {
          if (i.candidates.length === 1) targets[i.externalId] = i.candidates[0].publicationId;
        });
      setResolutions(initial);
      setLinkTargets(targets);
      setStep("preview");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "No se pudo consultar el proveedor.");
      setStep("error");
    }
  };

  const ambiguous = preview?.items.filter((i) => i.status === "AMBIGUOUS") ?? [];
  const unresolved = ambiguous.filter((i) => {
    const action = resolutions[i.externalId];
    return !action || (action === "LINK" && !linkTargets[i.externalId]);
  });
  const importable = preview ? preview.newCount + preview.completableCount : 0;
  const canConfirm = !!preview && unresolved.length === 0 && (importable > 0 || ambiguous.length > 0);

  const confirm = async () => {
    if (!preview || !providerCode) return;
    setStep("confirming");
    const payload: SyncResolution[] = ambiguous.map((i) => {
      const action = resolutions[i.externalId];
      return {
        externalId: i.externalId,
        action,
        publicationId: action === "LINK" ? linkTargets[i.externalId] : null,
      };
    });
    try {
      const res = await PublicationSyncAPI.confirm(personId, preview.previewToken, providerCode, payload);
      if (res.status !== "success") {
        setErrorMessage(parseApiError(res.error).message || "No se pudo confirmar la sincronización.");
        setStep("error");
        return;
      }
      setResult(res.data);
      setStep("done");
      await queryClient.invalidateQueries({ queryKey: ["publications", String(personId)] });
      await queryClient.invalidateQueries({ queryKey: ["publication-sync", "readiness", personId] });
      toast({ title: "Sincronización completada", description: "Las publicaciones quedaron en revisión." });
    } catch {
      setErrorMessage("No se pudo confirmar la sincronización. Intente de nuevo más tarde.");
      setStep("error");
    }
  };

  const busy = step === "check" || step === "previewing" || step === "confirming";

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sincronizar publicaciones</DialogTitle>
          <DialogDescription>
            Trae las publicaciones de la persona desde plataformas científicas. Nada se guarda hasta que
            confirme, y lo importado queda <strong>en revisión</strong> de la Dirección de Investigación.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4 overflow-y-auto pr-1">
          {(step === "check" || step === "previewing" || step === "confirming") && (
            <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">
                {step === "check" ? "Verificando configuración…" : step === "previewing" ? "Consultando el proveedor…" : "Guardando…"}
              </p>
            </div>
          )}

          {step === "check" && readiness.isError && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground break-words">
                {readiness.error instanceof Error ? readiness.error.message : "No se pudo verificar la configuración."}
              </p>
              <Button size="sm" onClick={() => readiness.refetch()}>Reintentar</Button>
            </div>
          )}

          {step === "orcid" && data && (
            <div className="space-y-3">
              {data.canEdit ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Para sincronizar se necesita el ORCID de la persona. Es único: no puede repetirse en otra persona.
                  </p>
                  <OrcidEntryFields
                    id="sync-orcid"
                    value={entry.value}
                    onChange={entry.onChange}
                    error={entry.error}
                    confirmName={entry.confirmName}
                    disabled={entry.isPending}
                  />
                </>
              ) : (
                <p className="rounded-md border p-3 text-sm text-muted-foreground">
                  Esta persona no tiene configurado su ORCID. Solo ella (o un Administrador) puede registrarlo.
                </p>
              )}
            </div>
          )}

          {step === "providers" && data && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                ORCID: <span className="font-mono">{data.orcid}</span>. Elija la plataforma a sincronizar.
              </p>
              {providers.length === 0 && (
                <p className="text-sm text-muted-foreground">No hay plataformas habilitadas.</p>
              )}
              {providers.map((p) => (
                <div key={p.code} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{p.name}</p>
                    {!p.hasAdapter ? (
                      <Badge variant="outline" className="text-xs">Aún no disponible</Badge>
                    ) : p.missing.includes("NOT_CONFIGURED") ? (
                      <Badge variant="outline" className="text-xs">Sin configurar</Badge>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!p.ready}
                        onClick={() => loadPreview(p.code)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Consultar
                      </Button>
                    )}
                  </div>

                  {p.hasAdapter && !p.ready && (
                    <p className="text-xs text-muted-foreground">
                      {p.missing.includes("NOT_CONFIGURED")
                        ? `Falta cargar la API key de ${p.name} en Parámetros del Sistema.`
                        : p.missing.includes("PROVIDER_ID")
                          ? `Falta el ${p.idLabel ?? "identificador"} de ${p.name}.`
                          : "Esta plataforma no está lista para sincronizar."}
                    </p>
                  )}

                  {!p.usesProfileOrcid && p.idLabel && (
                    <>
                      {p.ids.map((id) => (
                        <div key={id.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="font-mono break-all">{id.externalId}</span>
                          {data.canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Quitar identificador"
                              disabled={removeProviderId.isPending}
                              onClick={() => removeProviderId.mutate(id.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {p.ids.length === 0 && !data.canEdit && p.requiresProviderId && (
                        <p className="text-xs text-muted-foreground">
                          Falta el {p.idLabel ?? "identificador"}; solo la persona o un Administrador puede registrarlo.
                        </p>
                      )}
                      {data.canEdit && (p.allowsMultipleIds || p.ids.length === 0) && (
                        <div className="flex items-end gap-2">
                          <div className="flex-1 space-y-1">
                            <Label htmlFor={`sync-id-${p.code}`} className="text-xs">
                              {p.idLabel ?? "Identificador"}{!p.requiresProviderId && " (opcional)"}
                            </Label>
                            <Input
                              id={`sync-id-${p.code}`}
                              value={idInputs[p.code] ?? ""}
                              maxLength={DB_FIELD_LIMITS.researcher.providerExternalId}
                              onChange={(e) => setIdInputs((prev) => ({ ...prev, [p.code]: e.target.value }))}
                            />
                          </div>
                          <Button size="sm" variant="outline" disabled={addProviderId.isPending} onClick={() => saveProviderId(p)}>
                            Agregar
                          </Button>
                        </div>
                      )}
                      {p.profileUrlTemplate && p.ids[0] && (
                        <a
                          href={p.profileUrlTemplate.replace("{id}", encodeURIComponent(p.ids[0].externalId))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Ver perfil
                        </a>
                      )}
                    </>
                  )}

                  {p.lastSyncedAt && (
                    <p className="text-xs text-muted-foreground">
                      Última sincronización: {formatDate(p.lastSyncedAt, "es-EC", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
              ))}
              {formError && <p className="text-sm text-destructive">{formError}</p>}
            </div>
          )}

          {step === "preview" && preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <Counter value={preview.totalFound} label="Encontradas" />
                <Counter value={preview.newCount} label="Nuevas" tone="ok" />
                <Counter value={preview.completableCount} label="A completar" tone="ok" />
                <Counter value={preview.existingCount + preview.lockedCount} label="Ya existen" />
              </div>
              {preview.isPartial && (
                <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {preview.message || "La consulta fue parcial: puede faltar alguna publicación. Vuelva a sincronizar más tarde."}
                </p>
              )}
              {preview.skippedByType > 0 && (
                <p className="text-xs text-muted-foreground">
                  Se omitieron {preview.skippedByType} publicación(es) por su tipo (libros, cartas, datos, preprints…): no se importan a
                  Publicaciones.
                </p>
              )}
              {preview.items.length > 0 && (
                <div className="space-y-2">
                  {preview.items.map((item) => (
                    <PreviewItem
                      key={item.externalId}
                      item={item}
                      action={resolutions[item.externalId]}
                      linkTarget={linkTargets[item.externalId]}
                      onAction={(a) => setResolutions((prev) => ({ ...prev, [item.externalId]: a }))}
                      onLinkTarget={(id) => setLinkTargets((prev) => ({ ...prev, [item.externalId]: id }))}
                    />
                  ))}
                </div>
              )}
              {preview.totalFound === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">El proveedor no tiene publicaciones para esta persona.</p>
              )}
              {unresolved.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Resuelva los {unresolved.length} posible(s) duplicado(s) para poder confirmar.
                </p>
              )}
            </div>
          )}

          {step === "done" && result && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <p className="text-sm">
                {result.created} publicación(es) nueva(s) y {result.completed} completada(s) quedaron en revisión.
                {result.skipped > 0 && ` ${result.skipped} omitida(s).`}
                {result.locked > 0 && ` ${result.locked} ya aprobada(s)/rechazada(s) no se modificaron.`}
              </p>
              {result.isPartial && (
                <p className="text-xs text-muted-foreground">La consulta fue parcial; vuelva a sincronizar más tarde.</p>
              )}
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground break-words">{errorMessage}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {step === "done" ? "Cerrar" : "Cancelar"}
          </Button>
          {step === "orcid" && data?.canEdit && (
            <Button onClick={() => void entry.submit()} disabled={entry.isPending}>
              {entry.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {entry.confirmName !== null ? "Confirmar y continuar" : "Guardar y continuar"}
            </Button>
          )}
          {step === "orcid" && !data?.canEdit && <Button disabled>Continuar</Button>}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("providers")}>Volver</Button>
              <Button onClick={confirm} disabled={!canConfirm}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Confirmar e importar
              </Button>
            </>
          )}
          {step === "error" && (
            <Button onClick={() => (providerCode ? loadPreview(providerCode) : readiness.refetch())}>Reintentar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Counter({ value, label, tone }: { value: number; label: string; tone?: "ok" }) {
  return (
    <div
      className={
        tone === "ok"
          ? "rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950"
          : "rounded-lg border p-3"
      }
    >
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

interface PreviewItemProps {
  item: PublicationSyncItem;
  action?: SyncResolutionAction;
  linkTarget?: number;
  onAction: (a: SyncResolutionAction) => void;
  onLinkTarget: (publicationId: number) => void;
}

function PreviewItem({ item, action, linkTarget, onAction, onLinkTarget }: PreviewItemProps) {
  return (
    <div className="space-y-2 rounded-md border p-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium break-words">{item.title}</p>
          <p className="text-xs text-muted-foreground break-words">
            {[item.journalName, item.publicationDate ? formatDate(item.publicationDate, "es-EC", { year: "numeric", month: "short" }) : null, item.doi ? `DOI: ${item.doi}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {item.message && <p className="text-xs text-muted-foreground break-words">{item.message}</p>}
        </div>
        <Badge variant={item.status === "NEW" || item.status === "COMPLETABLE" ? "default" : "outline"} className="shrink-0 text-xs">
          {ITEM_LABEL[item.status]}
        </Badge>
      </div>

      {item.status === "AMBIGUOUS" && (
        <div className="space-y-2 rounded-md bg-muted/50 p-2">
          <p className="text-xs">¿Es alguna de estas publicaciones ya registradas?</p>
          {item.candidates.map((c) => (
            <label key={c.publicationId} className="flex items-start gap-2 text-xs">
              <input
                type="radio"
                name={`link-${item.externalId}`}
                checked={action === "LINK" && linkTarget === c.publicationId}
                onChange={() => {
                  onLinkTarget(c.publicationId);
                  onAction("LINK");
                }}
              />
              <span className="break-words">Es esta: {c.title}</span>
            </label>
          ))}
          <label className="flex items-center gap-2 text-xs">
            <input type="radio" name={`link-${item.externalId}`} checked={action === "IMPORT"} onChange={() => onAction("IMPORT")} />
            Es distinta: importar como nueva
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="radio" name={`link-${item.externalId}`} checked={action === "SKIP"} onChange={() => onAction("SKIP")} />
            Omitir
          </label>
        </div>
      )}
    </div>
  );
}
