// src/pages/electronicSignature/ExternalSignPage.tsx
// Pagina PUBLICA (sin sesion) para firmantes externos: acceso via link de un solo uso.
// Registrada fuera del sistema de rutas protegidas normal, ver routes/AppRouter.tsx.
import { useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, CheckCircle2, Download, FileText, Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SignaturePositionPicker, type SignaturePosition } from "@/components/electronicSignature/SignaturePositionPicker";
import { PublicSignatureAPI } from "@/lib/api/services/signaturePublic";
import { getParticipantStatusMeta } from "@/features/electronicSignature/signatureStatus";
import { isMobileDevice } from "@/lib/device";
import { cn } from "@/lib/utils";

function useQueryParam(name: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) ?? "";
}

type FlowStep = "sign" | "open" | "confirm";

function StepIndicator({ current, done }: { current: FlowStep; done: Record<FlowStep, boolean> }) {
  const steps: { key: FlowStep; label: string }[] = [
    { key: "sign", label: "Ubicar tu firma" },
    { key: "open", label: "Abrir FirmaEC" },
    { key: "confirm", label: "Confirmar" },
  ];
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {steps.map((step, i) => {
        const isDone = done[step.key];
        const isCurrent = step.key === current;
        return (
          <li key={step.key} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isDone
                    ? "bg-success text-success-foreground"
                    : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={cn("hidden text-xs font-medium sm:inline", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && <div className={cn("h-px flex-1", isDone ? "bg-success" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}

export default function ExternalSignPage() {
  const [, params] = useRoute("/firma-externa/:participantId");
  const participantId = Number(params?.participantId ?? 0);
  const token = useQueryParam("token");
  const queryClient = useQueryClient();
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerBlob, setPickerBlob] = useState<Blob | null>(null);
  // El enlace se prepara aqui (llamada async al backend) pero el salto a firmaec:// se
  // dispara desde un boton separado, en un toque directo sin esperas — los navegadores
  // moviles bloquean silenciosamente la apertura de esquemas personalizados si ocurre
  // despues de un await (confirmado: fallaba en celular con FirmaEC instalado).
  const [readyLaunchUrl, setReadyLaunchUrl] = useState<string | null>(null);
  // Una vez que el usuario dispara la apertura de FirmaEC, se bloquea la firma en ESTA
  // pestaña de inmediato (sin esperar a que el backend confirme) — el token de un solo
  // uso ya evita una segunda firma real, pero esto evita ademas volver a mostrar el boton
  // durante la ventana de unos segundos antes de que el sondeo periodico confirme el
  // estado final. En un flujo secuencial, dejar la firma "reintentable" en pantalla
  // aunque sea por poco tiempo es exactamente lo que no debe pasar.
  const [hasDispatched, setHasDispatched] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobile = isMobileDevice();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-participant", participantId, token],
    queryFn: () => PublicSignatureAPI.get(participantId, token),
    enabled: Number.isFinite(participantId) && participantId > 0 && !!token,
    retry: false,
    // El hand-off a FirmaEC (window.location.assign a firmaec://...) no navega fuera de
    // esta pagina — en celular, volver de la app de FirmaEC al navegador dispara el
    // refetch por foco; sin refetchInterval tampoco se actualiza solo si el usuario no
    // vuelve a esta pestaña especifica (confirmado: se quedaba en "sin firmar" hasta
    // recargar a mano tras firmar desde el celular).
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const info = data?.status === "success" ? data.data : null;
  const errorMessage =
    isError || data?.status === "error"
      ? data?.status === "error"
        ? data.error.message
        : "No se pudo cargar la información del documento."
      : null;

  // Boton de descarga directa e independiente del visor <embed> de mas abajo — ese visor
  // inline no siempre renderiza en navegadores moviles (a veces se queda en blanco o
  // falla en silencio, confirmado en pruebas reales), dejando al firmante sin forma de
  // ver o guardar el documento que necesita firmar.
  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const response = await fetch(PublicSignatureAPI.documentUrl(participantId, token));
      if (!response.ok) {
        setDownloadError("No se pudo descargar el documento. Intenta de nuevo.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${info?.processNumber || "documento"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("No se pudo descargar el documento. Intenta de nuevo.");
    } finally {
      setDownloading(false);
    }
  };

  const openPositionPicker = async () => {
    setLaunching(true);
    const response = await fetch(PublicSignatureAPI.documentUrl(participantId, token));
    setLaunching(false);
    if (!response.ok) return;
    setPickerBlob(await response.blob());
    setPickerOpen(true);
  };

  const handleConfirmPosition = async (position: SignaturePosition) => {
    setPickerOpen(false);
    setLaunching(true);
    setLaunchError(null);
    const result = await PublicSignatureAPI.startSigning(participantId, token, position);
    setLaunching(false);
    if (result.status === "error") {
      setLaunchError(result.error.message);
      return;
    }
    setReadyLaunchUrl(result.data.launchUrl);
  };

  const openFirmaEcNow = () => {
    if (!readyLaunchUrl) return;
    setHasDispatched(true);
    window.location.assign(readyLaunchUrl);
  };

  const handleUploadSigned = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const result = await PublicSignatureAPI.uploadSigned(participantId, token, file);
    setUploading(false);
    if (result.status === "error") {
      setUploadError(result.error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["public-participant", participantId, token] });
  };

  // Una vez que el sondeo periodico confirma que la firma quedo completada, ya no hay
  // ninguna razon para dejar esta pestaña abierta e interactiva — se intenta cerrarla
  // sola. Los navegadores solo permiten cerrar por script pestañas que ELLOS mismos
  // abrieron; si esta se abrio desde un enlace de correo/SMS, el cierre fallara en
  // silencio (comportamiento esperado del navegador, no un bug) y el mensaje en pantalla
  // le indica al usuario que puede cerrarla el mismo.
  useEffect(() => {
    if (info?.alreadyUsed && info.status.toUpperCase() === "SIGNED") {
      window.close();
    }
  }, [info?.alreadyUsed, info?.status]);

  const currentStep: FlowStep = !readyLaunchUrl ? "sign" : !hasDispatched ? "open" : "confirm";
  const stepDone: Record<FlowStep, boolean> = {
    sign: !!readyLaunchUrl,
    open: hasDispatched,
    confirm: !!info?.alreadyUsed && info.status.toUpperCase() === "SIGNED",
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-4 bg-background p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Firma electrónica</h1>
        <p className="text-sm text-muted-foreground">Enlace de un solo uso — no necesitas iniciar sesión.</p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-[500px] w-full rounded-lg" />
        </div>
      )}

      {!isLoading && errorMessage && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No se puede acceder a este enlace</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {!isLoading && info && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{info.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{info.processNumber}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {info.description && <p className="text-sm">{info.description}</p>}
              <p className="text-sm text-muted-foreground">Solicitado por: {info.creatorEmail}</p>
              <p className="text-sm text-muted-foreground">Firmante: {info.fullName}</p>
              {downloadError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertDescription>{downloadError}</AlertDescription>
                </Alert>
              )}
              <Button variant="outline" size="sm" disabled={downloading} onClick={handleDownload}>
                {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Descargar documento
              </Button>
            </CardContent>
          </Card>

          {info.alreadyUsed ? (
            info.status.toUpperCase() === "SIGNED" ? (
              <Alert className="border-success/40 bg-success/10">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertTitle>Ya firmaste este documento</AlertTitle>
                <AlertDescription>No es necesario volver a firmarlo. Ya puedes cerrar esta pestaña.</AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>Este enlace ya no está disponible para firmar</AlertTitle>
                <AlertDescription>
                  Estado actual: {getParticipantStatusMeta(info.status).label}. Puedes revisar el documento a continuación.
                </AlertDescription>
              </Alert>
            )
          ) : mobile ? (
            // En celular se simplifica a proposito: nada de visor inline (no siempre
            // renderiza) ni del flujo de posicion/lanzar FirmaEC (genera confusion y el
            // aviso automatico de FirmaEC no siempre llega desde la app movil). Solo
            // descargar + subir el resultado, ya cubierto por el boton de descarga de
            // arriba — aqui va unicamente la carga.
            <Card>
              <CardContent className="space-y-3 pt-6">
                <p className="text-sm font-medium">Sube el documento firmado</p>
                <p className="text-xs text-muted-foreground">
                  1. Descarga el documento arriba. 2. Ábrelo y fírmalo con la app de FirmaEC. 3. Usa "Compartir" en FirmaEC para
                  guardar el PDF firmado y súbelo aquí.
                </p>
                {uploadError && (
                  <Alert variant="destructive">
                    <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => handleUploadSigned(e.target.files?.[0])}
                />
                <Button size="lg" className="w-full" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  Subir documento firmado
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <StepIndicator current={currentStep} done={stepDone} />

                  {launchError && (
                    <Alert variant="destructive">
                      <AlertDescription>{launchError}</AlertDescription>
                    </Alert>
                  )}

                  {currentStep === "sign" && (
                    <Button onClick={openPositionPicker} disabled={launching} size="lg" className="w-full">
                      {launching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                      Firmar documento
                    </Button>
                  )}

                  {currentStep === "open" && (
                    <Button onClick={openFirmaEcNow} size="lg" className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      Abrir FirmaEC para firmar
                    </Button>
                  )}

                  {currentStep === "confirm" && (
                    <div className="space-y-3">
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        Esperando confirmación de FirmaEC — esta página se actualiza sola.
                      </p>

                      <div className="rounded-lg border p-3">
                        <p className="text-sm font-medium">¿FirmaEC no avisó que terminaste?</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Si ya firmaste pero esta página no se actualiza, sube directamente el PDF firmado que te entregó
                          FirmaEC.
                        </p>
                        {uploadError && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertDescription>{uploadError}</AlertDescription>
                          </Alert>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={(e) => handleUploadSigned(e.target.files?.[0])}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          disabled={uploading}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                          Subir documento firmado
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="overflow-hidden rounded-lg border">
                <embed
                  src={PublicSignatureAPI.documentUrl(participantId, token)}
                  type="application/pdf"
                  className="h-[600px] w-full"
                />
              </div>
            </>
          )}
        </>
      )}

      <SignaturePositionPicker
        open={pickerOpen}
        documentBlob={pickerBlob}
        onConfirm={handleConfirmPosition}
        onCancel={() => setPickerOpen(false)}
      />
    </main>
  );
}
