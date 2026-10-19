// pages/Preferences.tsx
// "Mis preferencias": página de inicio, menú, tamaño de texto, apariencia y accesibilidad.
// Los cambios se ven como vista previa; solo se guardan al pulsar "Guardar cambios".
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { useUserPreferences } from "@/features/preferences";
import { routes } from "@/routes/routes.config";
import type { UserPreferences } from "@/types/userPreferences";
import NavigationSection from "@/components/preferences/NavigationSection";
import TextSizeSection from "@/components/preferences/TextSizeSection";
import AppearanceSection from "@/components/preferences/AppearanceSection";
import AccessibilitySection from "@/components/preferences/AccessibilitySection";

function canonical(p: UserPreferences): string {
  return JSON.stringify(
    Object.entries(p)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
  );
}

function sameContent(a: UserPreferences, b: UserPreferences): boolean {
  return canonical(a) === canonical(b);
}

export default function PreferencesPage() {
  const { preferences, isSynced, loadFailed, isSaving, save, reset, preview } = useUserPreferences();
  const { toast } = useToast();
  const [draft, setDraft] = useState<UserPreferences>(preferences);
  const [confirmReset, setConfirmReset] = useState(false);
  const [status, setStatus] = useState("");
  const initializedRef = useRef(false);

  // Carga el borrador cuando el servidor confirma las preferencias (o, si no responde, con la copia local).
  // Así no se parte de una copia vieja que luego pisaría lo guardado desde otro equipo.
  useEffect(() => {
    if ((isSynced || loadFailed) && !initializedRef.current) {
      initializedRef.current = true;
      setDraft(preferences);
    }
  }, [isSynced, loadFailed, preferences]);

  const dirty = useMemo(() => !sameContent(draft, preferences), [draft, preferences]);

  // Vista previa en vivo; al salir de la página sin guardar se descarta.
  useEffect(() => {
    preview(dirty ? draft : null);
  }, [draft, dirty, preview]);
  useEffect(() => () => preview(null), [preview]);

  const change = (patch: Partial<UserPreferences>) =>
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      (Object.keys(next) as (keyof UserPreferences)[]).forEach((k) => {
        if (next[k] === undefined) delete next[k];
      });
      return next;
    });

  const handleSave = async () => {
    const ok = await save(draft);
    const message = ok ? "Preferencias guardadas" : "No se pudo guardar";
    setStatus(message);
    toast({ title: message, variant: ok ? "default" : "destructive" });
  };

  const handleReset = async () => {
    setConfirmReset(false);
    const ok = await reset();
    if (ok) setDraft({});
    const message = ok ? "Valores restablecidos" : "No se pudo restablecer";
    setStatus(message);
    toast({ title: message, variant: ok ? "default" : "destructive" });
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="page-title">
          <SlidersHorizontal className="h-6 w-6" aria-hidden="true" /> Mis preferencias
        </h1>
        <p className="page-subtitle">Cómo se ve y se comporta el sistema</p>
      </div>

      {!isSynced && !loadFailed && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Cargando tus preferencias…
        </div>
      )}
      {loadFailed && (
        <p className="rounded-lg border border-warning/30 bg-warning-subtle p-3 text-sm text-warning" role="alert">
          No se pudieron cargar tus preferencias. Recarga para reintentar.
        </p>
      )}

      <NavigationSection value={draft} routes={routes} onChange={change} />
      <div className="grid gap-6 md:grid-cols-2">
        <TextSizeSection value={draft} onChange={change} />
        <AccessibilitySection value={draft} onChange={change} />
      </div>
      <AppearanceSection value={draft} onChange={change} />

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
        <Button type="button" variant="outline" onClick={() => setConfirmReset(true)} disabled={isSaving || !isSynced}>
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" /> Restablecer
        </Button>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-sm text-muted-foreground">Sin guardar</span>}
          <Button type="button" onClick={handleSave} disabled={!dirty || isSaving || !isSynced}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restablecer tus preferencias?</AlertDialogTitle>
            <AlertDialogDescription>Se borrarán las guardadas y el sistema volverá a su aspecto original.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Restablecer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
