import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageUp, RotateCcw, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { BrandingAPI, type BrandAssetInfo, type BrandKey } from "@/lib/api";
import logoHorizontalAzul from "@/assets/brand/uta-horizontal-azul.svg";
import logoHorizontalBlanco from "@/assets/brand/uta-horizontal-blanco.svg";
import logoEscudoAzul from "@/assets/brand/uta-escudo-azul.svg";

const MAX_BYTES = 1024 * 1024;

/** Mensaje legible del backend (ProblemDetails: detail) o, si no hay, el de respaldo. */
function errorText(err: unknown, fallback: string): string {
  const e = err as { message?: string; details?: { detail?: string; message?: string } } | undefined;
  const detail = e?.details?.detail ?? e?.details?.message;
  if (typeof detail === "string" && detail) return detail;
  if (e?.message && !/^HTTP Error/.test(e.message)) return e.message;
  return fallback;
}

/** Logo oficial incluido en la aplicación (se usa cuando no hay uno propio) y fondo de la vista previa. */
const DEFAULTS: Record<BrandKey, { src: string; dark: boolean; accept: string; hint: string }> = {
  LOGIN_LOGO_LIGHT: { src: logoHorizontalAzul, dark: false, accept: "image/png,image/jpeg,image/svg+xml", hint: "PNG, JPEG o SVG · máx. 1 MB · fondo claro" },
  LOGIN_LOGO_DARK: { src: logoHorizontalBlanco, dark: true, accept: "image/png,image/jpeg,image/svg+xml", hint: "PNG, JPEG o SVG · máx. 1 MB · se muestra sobre fondo oscuro" },
  REPORT_LOGO: { src: logoEscudoAzul, dark: false, accept: "image/png,image/jpeg", hint: "PNG o JPEG (los PDF no admiten SVG) · máx. 1 MB · cuadrado" },
};

function useCustomPreview(asset: BrandAssetInfo) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let created: string | null = null;
    let cancelled = false;
    if (asset.isCustom) {
      BrandingAPI.fetchPreview(asset.key).then((u) => {
        if (cancelled) { if (u) URL.revokeObjectURL(u); return; }
        created = u;
        setUrl(u);
      });
    } else {
      setUrl(null);
    }
    return () => { cancelled = true; if (created) URL.revokeObjectURL(created); };
  }, [asset.key, asset.isCustom, asset.version]);
  return url;
}

function BrandRow({ asset, onUpload, onRemove, busy }: {
  asset: BrandAssetInfo;
  onUpload: (key: BrandKey, file: File) => void;
  onRemove: (asset: BrandAssetInfo) => void;
  busy: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useCustomPreview(asset);
  const def = DEFAULTS[asset.key];
  const shown = asset.isCustom ? preview : def.src;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center">
      <div className={`flex h-24 w-full shrink-0 items-center justify-center rounded-md border border-border p-3 sm:w-56 ${def.dark ? "bg-[var(--band)]" : "bg-card"}`}>
        {shown ? <img src={shown} alt={asset.label} className="max-h-full max-w-full object-contain" /> : <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium text-foreground">{asset.label}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusBadge tone={asset.isCustom ? "primary" : "neutral"}>{asset.isCustom ? "Logo propio" : "Logo oficial"}</StatusBadge>
          {asset.isCustom && asset.fileName ? <span className="break-all">{asset.fileName}</span> : null}
        </div>
        <p className="text-xs text-muted-foreground">{def.hint}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={def.accept}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onUpload(asset.key, f); }}
        />
        <Button variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          <ImageUp className="h-4 w-4" />
          {asset.isCustom ? "Reemplazar" : "Cargar logo"}
        </Button>
        {asset.isCustom && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onRemove(asset)}>
            <RotateCcw className="h-4 w-4" />
            Usar el oficial
          </Button>
        )}
      </div>
    </div>
  );
}

/** Administración de los logos del sistema (login claro/oscuro y reportes). Se guardan como parámetros BRAND_LOGO_*. */
export default function BrandingCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [toRemove, setToRemove] = useState<BrandAssetInfo | null>(null);

  const { data } = useQuery({
    queryKey: ["branding"],
    queryFn: async () => {
      const res = await BrandingAPI.list();
      if (res.status !== "success") throw new Error(errorText(res.error, "No se pudo cargar la identidad visual."));
      return res.data ?? [];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["branding"] });
    queryClient.invalidateQueries({ queryKey: ["branding-public"] });
  };

  const upload = useMutation({
    mutationFn: async ({ key, file }: { key: BrandKey; file: File }) => {
      const res = await BrandingAPI.upload(key, file);
      if (res.status !== "success") throw new Error(errorText(res.error, "No se pudo guardar el logo."));
    },
    onSuccess: () => { refresh(); toast({ title: "Logo actualizado", description: "El cambio se aplica de inmediato." }); },
    onError: (e: Error) => toast({ title: "No se pudo guardar el logo", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (key: BrandKey) => {
      const res = await BrandingAPI.remove(key);
      if (res.status !== "success") throw new Error(errorText(res.error, "No se pudo restablecer el logo."));
    },
    onSuccess: () => { refresh(); setToRemove(null); toast({ title: "Se usa el logo oficial" }); },
    onError: (e: Error) => toast({ title: "No se pudo restablecer el logo", description: e.message, variant: "destructive" }),
  });

  const handleUpload = (key: BrandKey, file: File) => {
    if (file.size > MAX_BYTES) {
      toast({ title: "Imagen demasiado grande", description: "El logo no puede superar 1 MB. Reduzca su tamaño e inténtelo de nuevo.", variant: "destructive" });
      return;
    }
    upload.mutate({ key, file });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Identidad visual</CardTitle>
        <CardDescription>
          Logos del inicio de sesión y de los reportes PDF. Sin logo propio se usa el escudo oficial de la Universidad.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(data ?? []).map((a) => (
          <BrandRow key={a.key} asset={a} onUpload={handleUpload} onRemove={setToRemove} busy={upload.isPending || remove.isPending} />
        ))}
      </CardContent>

      <AlertDialog open={!!toRemove} onOpenChange={(o) => { if (!o) setToRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Usar el logo oficial?</AlertDialogTitle>
            <AlertDialogDescription>
              Se quitará la imagen cargada para «{toRemove?.label}» y se volverá al escudo oficial. Para recuperar la anterior deberá cargarla de nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toRemove && remove.mutate(toRemove.key)}>Usar el oficial</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
