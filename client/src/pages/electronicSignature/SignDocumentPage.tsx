// src/pages/electronicSignature/SignDocumentPage.tsx
import { useRef, useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFirmaEc } from "@/hooks/electronicSignature/useFirmaEc";
import { FirmaEcNotInstalledDialog } from "@/components/electronicSignature/FirmaEcNotInstalledDialog";
import { SignaturePositionPicker, type SignaturePosition } from "@/components/electronicSignature/SignaturePositionPicker";
import { SigningProgress } from "@/components/electronicSignature/SigningProgress";
import { SignatureProcessesAPI } from "@/lib/api";
import { getProcessStatusMeta } from "@/features/electronicSignature/signatureStatus";
import { isMobileDevice } from "@/lib/device";
import { cn } from "@/lib/utils";
import { FIRMA_EC_CERTIFICATE_TYPE, type FirmaEcCertificateType } from "@/types/electronic-signature";

const NOT_ACTIVE_STATUSES = new Set(["COMPLETED", "REJECTED", "CANCELLED", "EXPIRED", "VALIDATIONFAILED"]);

export default function SignDocumentPage() {
  const [, params] = useRoute("/signatures/processes/:id/sign");
  const processId = Number(params?.id ?? 0);
  const f = useFirmaEc();
  const queryClient = useQueryClient();
  const [previewing, setPreviewing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerBlob, setPickerBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobile = isMobileDevice();
  // Sin valor por defecto a propósito: el firmante debe elegir explícitamente uno de los
  // dos — FirmaEC inicializa la sesión en el modo que se le manda y la pestaña que no
  // corresponde queda sin responder (ver useFirmaEc/FirmaEcClient.BuildLaunchUrl).
  const [certificateType, setCertificateType] = useState<FirmaEcCertificateType | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["signature-process-progress", processId],
    queryFn: () => SignatureProcessesAPI.progress(processId),
    enabled: Number.isFinite(processId) && processId > 0,
    // El hand-off a FirmaEC (window.location.assign a firmaec://...) no navega fuera
    // de esta pagina — sin refetch periodico, el boton "Abrir FirmaEC" se queda visible
    // aunque la firma ya se haya completado en segundo plano via el callback.
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const progress = data?.status === "success" ? data.data : null;
  const mySigner = progress?.signers.find((s) => s.participantId === progress.myParticipantId) ?? null;
  const alreadySigned = mySigner?.status?.toUpperCase() === "SIGNED";
  const processInactive = !!progress && NOT_ACTIVE_STATUSES.has(progress.status.toUpperCase());
  const canSign = !!progress && !alreadySigned && !processInactive;

  const fetchCurrentVersionBlob = async (): Promise<Blob | null> => {
    const docsRes = await SignatureProcessesAPI.documents(processId);
    if (docsRes.status === "error") return null;
    const doc = docsRes.data[0];
    const version =
      doc?.versions.find((v) => v.sequenceNumber === progress?.currentDocumentVersion) ??
      doc?.versions[doc.versions.length - 1];
    if (!version) return null;
    const blobRes = await SignatureProcessesAPI.downloadVersion(version.versionId);
    return blobRes.status === "success" ? (blobRes.data as Blob) : null;
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const blob = await fetchCurrentVersionBlob();
      if (blob) window.open(URL.createObjectURL(blob), "_blank");
    } finally {
      setPreviewing(false);
    }
  };

  const openPositionPicker = async () => {
    setPreviewing(true);
    const blob = await fetchCurrentVersionBlob();
    setPreviewing(false);
    if (!blob) return;
    setPickerBlob(blob);
    setPickerOpen(true);
  };

  const handleConfirmPosition = (position: SignaturePosition) => {
    setPickerOpen(false);
    f.launch(processId, position, certificateType);
  };

  const handleUploadSigned = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const result = await SignatureProcessesAPI.uploadSigned(processId, file);
    setUploading(false);
    if (result.status === "error") {
      setUploadError(result.error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["signature-process-progress", processId] });
  };

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <Link href="/signatures/processes">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Procesos de firma
        </Button>
      </Link>

      <h1 className="text-2xl font-bold">Firmar documento</h1>

      {isLoading && <Skeleton className="h-24 w-full rounded-lg" />}

      {!isLoading && alreadySigned && (
        <Alert>
          <AlertDescription>Ya firmaste este documento. No es necesario volver a firmarlo.</AlertDescription>
        </Alert>
      )}

      {!isLoading && !alreadySigned && processInactive && progress && (
        <Alert variant="destructive">
          <AlertDescription>Este proceso ya no está activo ({getProcessStatusMeta(progress.status).label}).</AlertDescription>
        </Alert>
      )}

      {/* El firmante debe elegir explícitamente Archivo o Token antes de poder firmar —
          sin selección no hay valor por defecto que enviar, y FirmaEC necesita saber el
          modo desde el lanzamiento (no se puede cambiar después dentro de la app). */}
      {!isLoading && canSign && f.state === "idle" && (
        <div className="rounded-lg border p-3 space-y-2">
          <Label className="text-sm font-medium">Tipo de certificado *</Label>
          <RadioGroup
            value={certificateType != null ? String(certificateType) : ""}
            onValueChange={(v) => setCertificateType(Number(v) as FirmaEcCertificateType)}
            className="flex flex-row gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem
                value={String(FIRMA_EC_CERTIFICATE_TYPE.ARCHIVO)}
                id="cert-type-archivo"
              />
              <Label htmlFor="cert-type-archivo" className="font-normal cursor-pointer">Archivo (.p12 / .pfx)</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem
                value={String(FIRMA_EC_CERTIFICATE_TYPE.TOKEN)}
                id="cert-type-token"
              />
              <Label htmlFor="cert-type-token" className="font-normal cursor-pointer">Token (dispositivo USB)</Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {!isLoading && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePreview} disabled={previewing}>
            {previewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Ver documento
          </Button>
          {/* Solo en "idle": una vez lanzado (state "launched") no debe reaparecer este
              boton mientras el sondeo periodico todavia no confirma que ya se firmo —
              antes reaparecia con cualquier estado distinto de "ready", permitiendo
              re-lanzar la firma en la ventana de unos segundos antes del refetch.
              Deshabilitado hasta elegir tipo de certificado (ver bloque de arriba). */}
          {canSign && f.state === "idle" && (
            <Button disabled={previewing || !certificateType} onClick={openPositionPicker}>
              Firmar documento
            </Button>
          )}
          {f.state === "launching" && (
            <Button disabled>Preparando firma...</Button>
          )}
          {/* Boton separado y explicito: el salto a firmaec:// debe ocurrir de forma
              sincrona dentro de ESTE toque, sin ningun await previo, o los navegadores
              moviles lo bloquean silenciosamente (confirmado: fallaba en celular). */}
          {f.state === "ready" && (
            <Button onClick={f.openNow}>Abrir FirmaEC para firmar</Button>
          )}
          {f.state === "launched" && (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Firma en proceso...
            </Button>
          )}
        </div>
      )}

      {/* En celular, FirmaEC no avisa solo al terminar (su pantalla final solo ofrece
          Visualizar/Verificar/Compartir/Regresar, sin notificar al sistema de origen) —
          confirmado con pruebas reales. Se ofrece subir el PDF firmado directamente. */}
      {f.state === "launched" && (
        <div className={cn("rounded-lg border p-3", mobile && "border-primary/40 bg-primary/5")}>
          <p className="text-sm font-medium">{mobile ? "¿Ya terminaste de firmar en la app?" : "¿FirmaEC no avisó que terminaste?"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {mobile
              ? 'En celular, FirmaEC no siempre avisa solo cuando terminas. Si en la app ya viste "Documento firmado", usa "Compartir" para guardarlo y súbelo aquí.'
              : "Si ya firmaste pero esta página no se actualiza, sube directamente el PDF firmado que te entregó FirmaEC."}
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
            variant={mobile ? "default" : "outline"}
            size="sm"
            className="mt-2 w-full sm:w-auto"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Subir documento firmado
          </Button>
        </div>
      )}

      {!isLoading && progress && <SigningProgress value={progress} />}

      <SignaturePositionPicker
        open={pickerOpen}
        documentBlob={pickerBlob}
        onConfirm={handleConfirmPosition}
        onCancel={() => setPickerOpen(false)}
      />

      <FirmaEcNotInstalledDialog open={f.state === "unavailable"} onRetry={openPositionPicker} onCancel={f.reset} />
    </main>
  );
}
