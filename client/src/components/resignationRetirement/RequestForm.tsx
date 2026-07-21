// src/components/resignationRetirement/RequestForm.tsx
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TiposReferenciaAPI } from '@/lib/api';
import { REF_TYPE_CATEGORIES } from '@/features/refTypeCategories';
import { ResignationRetirementAPI } from '@/lib/api/services/resignationRetirement';
import { parseApiError } from '@/lib/api/utils/error-handling';
import { ReusableDocumentManager, type ReusableDocumentManagerHandle } from '@/components/ReusableDocumentManager';
import { useDirectoryParams } from '@/hooks/directoryParams/useDirectoryParams';
import { RESIGNATION_RETIREMENT_DIRECTORY_CODE, RESIGNATION_RETIREMENT_ENTITY_TYPE } from '@/features/constants';
import type {
  ResignationRetirementDetail,
  ResignationRetirementRequestType,
} from '@/types/resignation-retirement';

type Props = {
  /** Presente = editar una solicitud existente propia; ausente = crear una nueva. */
  existing?: ResignationRetirementDetail;
  onSuccess: () => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
};

const todayIso = () => new Date().toISOString().split('T')[0];

const DIR_CODE = RESIGNATION_RETIREMENT_DIRECTORY_CODE;
const ENTITY_TYPE = RESIGNATION_RETIREMENT_ENTITY_TYPE;

/**
 * Flujo unificado en un solo formulario, sin salir a otra pantalla:
 * 1) Datos de la solicitud → "Generar carta" (crea la solicitud si no existe todavía
 *    y genera el PDF personalizado según el tipo).
 * 2) Descargar, firmar fuera del sistema (paso humano, inevitable), adjuntar el firmado.
 * 3) "Guardar": exige que haya un archivo firmado seleccionado (o ya adjunto) y recién
 *    ahí sube el documento — el documento es obligatorio para completar el guardado.
 */
export function RequestForm({ existing, onSuccess, onCancel, onDirtyChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { directory, params: dirParams } = useDirectoryParams(DIR_CODE);
  const docManagerRef = useRef<ReusableDocumentManagerHandle>(null);

  const [requestType, setRequestType] = useState<ResignationRetirementRequestType>(
    existing?.requestType ?? 'RESIGNATION'
  );
  const [proposedExitDate, setProposedExitDate] = useState(existing?.proposedExitDate?.split('T')[0] ?? todayIso());
  const [reason, setReason] = useState(existing?.reason ?? '');
  const [additionalNotes, setAdditionalNotes] = useState(existing?.additionalNotes ?? '');

  // Solicitud creada EN ESTA SESIÓN (modo creación); en modo edición ya existe desde el inicio.
  const [createdRequestId, setCreatedRequestId] = useState<number | null>(null);
  const [generatedDocumentId, setGeneratedDocumentId] = useState<number | null>(
    existing?.generatedDocumentId ?? null
  );

  const effectiveRequestId = createdRequestId ?? existing?.requestId ?? null;
  const hasExistingSignedDocument = (existing?.supportingDocuments.length ?? 0) > 0;

  const [isGeneratingCarta, setIsGeneratingCarta] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const dirty =
      requestType !== (existing?.requestType ?? 'RESIGNATION') ||
      proposedExitDate !== (existing?.proposedExitDate?.split('T')[0] ?? todayIso()) ||
      reason !== (existing?.reason ?? '') ||
      additionalNotes !== (existing?.additionalNotes ?? '') ||
      createdRequestId !== null;
    onDirtyChange?.(dirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestType, proposedExitDate, reason, additionalNotes, createdRequestId]);

  const { data: requestTypesResp } = useQuery({
    queryKey: ['ref-types', REF_TYPE_CATEGORIES.RESIGNATION_RETIREMENT_TYPE],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.RESIGNATION_RETIREMENT_TYPE),
    enabled: !existing,
    staleTime: 5 * 60_000,
  });
  const requestTypeOptions = requestTypesResp?.status === 'success' ? requestTypesResp.data : [];

  const { data: employeeInfoResp } = useQuery({
    queryKey: ['resignation-retirement-current-employee-info'],
    queryFn: () => ResignationRetirementAPI.getCurrentEmployeeInfo(),
    enabled: !existing,
    staleTime: 5 * 60_000,
  });
  const employeeInfo = employeeInfoResp?.status === 'success' ? employeeInfoResp.data : null;
  // El backend es quien realmente impide crear la solicitud (CreateAsync la rechaza);
  // esto solo evita el viaje al servidor y muestra el motivo antes de intentarlo.
  const isRetirementBlocked =
    !existing && requestType === 'RETIREMENT' && !!employeeInfo && !employeeInfo.isRetirementEligible;

  /** Paso 1 → 2: crea la solicitud si no existe todavía y genera/regenera la carta. */
  const handleGenerateCarta = async () => {
    setIsGeneratingCarta(true);
    try {
      let requestId = effectiveRequestId;

      if (!requestId) {
        const res = await ResignationRetirementAPI.createMy({
          requestType,
          proposedExitDate,
          reason: reason || null,
          additionalNotes: additionalNotes || null,
        });
        if (res.status !== 'success') throw new Error(parseApiError(res.error));
        requestId = res.data.requestId;
        setCreatedRequestId(requestId);
        queryClient.invalidateQueries({ queryKey: ['my-resignation-retirement-requests'] });
      }

      const genRes = await ResignationRetirementAPI.generateMyDocument(requestId);
      if (genRes.status !== 'success') throw new Error(parseApiError(genRes.error));
      setGeneratedDocumentId(genRes.data.generatedDocumentId ?? null);

      toast({
        title: 'Carta generada',
        description: 'Descárgala, imprímela, fírmala y adjunta el documento firmado abajo.',
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'No se pudo generar la carta', description: parseApiError(err) });
    } finally {
      setIsGeneratingCarta(false);
    }
  };

  const handleDownload = async () => {
    if (!effectiveRequestId) return;
    setIsDownloading(true);
    try {
      const res = await ResignationRetirementAPI.downloadMyDocument(effectiveRequestId);
      if (res.status !== 'success') throw new Error(parseApiError(res.error));
      window.open(URL.createObjectURL(res.data), '_blank');
    } catch (err) {
      toast({ variant: 'destructive', title: 'No se pudo descargar el documento', description: parseApiError(err) });
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Guardado final: exige el documento firmado. Si hay un archivo seleccionado (todavía no
   * subido) en el gestor documental, lo sube en este mismo clic — "Guardar" hace, en una sola
   * acción, el guardado del archivo y la confirmación de la solicitud. Si la solicitud ya
   * tenía un documento firmado (edición) y no se seleccionó uno nuevo, no vuelve a exigirlo.
   */
  const handleGuardar = async () => {
    if (!effectiveRequestId) return;

    const selectedCount = docManagerRef.current?.getSelectedCount() ?? 0;

    if (selectedCount === 0 && !hasExistingSignedDocument) {
      toast({
        variant: 'destructive',
        title: 'Falta el documento firmado',
        description: 'Selecciona el PDF firmado en "Documento firmado" antes de guardar.',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (existing) {
        const updRes = await ResignationRetirementAPI.updateMy(existing.requestId, {
          proposedExitDate,
          reason: reason || null,
          additionalNotes: additionalNotes || null,
          rowVersion: existing.rowVersion,
        });
        if (updRes.status !== 'success') throw new Error(parseApiError(updRes.error));
      }

      if (selectedCount > 0) {
        const uploadResult = await docManagerRef.current?.uploadAll(effectiveRequestId);
        if (!uploadResult || uploadResult.failed > 0 || uploadResult.uploaded === 0) {
          throw new Error(uploadResult?.message || 'No se pudo subir el documento firmado.');
        }
      }

      queryClient.invalidateQueries({ queryKey: ['my-resignation-retirement-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-resignation-retirement-request', effectiveRequestId] });
      toast({
        title: existing ? 'Solicitud actualizada' : 'Solicitud guardada',
        description: 'Tu solicitud quedó registrada con el documento firmado.',
      });
      onDirtyChange?.(false);
      onSuccess();
    } catch (err) {
      toast({ variant: 'destructive', title: 'No se pudo guardar', description: parseApiError(err) });
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy = isGeneratingCarta || isDownloading || isSaving;
  const showDocumentSection = !!generatedDocumentId || hasExistingSignedDocument || !!effectiveRequestId;

  return (
    <div className="space-y-4">
      {!existing && (
        <div className="space-y-2">
          <Label htmlFor="requestType">Tipo de solicitud</Label>
          <Select
            value={requestType}
            onValueChange={(v) => setRequestType(v as ResignationRetirementRequestType)}
            disabled={!!effectiveRequestId}
          >
            <SelectTrigger id="requestType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {requestTypeOptions.map((t) => (
                <SelectItem key={t.name} value={t.name}>{t.description}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isRetirementBlocked && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/15 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{employeeInfo?.retirementEligibilityNote ?? 'Aún no cumples los requisitos de jubilación.'}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="proposedExitDate">Fecha propuesta de salida</Label>
        <Input
          id="proposedExitDate"
          type="date"
          value={proposedExitDate}
          onChange={(e) => setProposedExitDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Motivo</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo o justificación de la solicitud…"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="additionalNotes">Observaciones adicionales</Label>
        <Textarea
          id="additionalNotes"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          rows={2}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Carta y documento firmado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleGenerateCarta}
              disabled={isBusy || isRetirementBlocked}
            >
              {isGeneratingCarta ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {generatedDocumentId ? 'Regenerar carta' : 'Generar carta'}
            </Button>
            {generatedDocumentId && (
              <Button type="button" size="sm" variant="outline" onClick={handleDownload} disabled={isBusy}>
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Descargar carta
              </Button>
            )}
          </div>

          {!showDocumentSection && (
            <p className="text-xs text-muted-foreground">
              Genera la carta primero: se personaliza con tus datos y el tipo de solicitud.
            </p>
          )}

          {showDocumentSection && (
            <>
              <p className="text-xs text-muted-foreground">
                Descarga la carta, imprímela, fírmala, escanéala y adjunta aquí el PDF firmado.
              </p>
              <ReusableDocumentManager
                ref={docManagerRef}
                directoryCode={directory?.code ?? DIR_CODE}
                entityType={ENTITY_TYPE}
                entityId={effectiveRequestId ?? undefined}
                relativePath={dirParams.relativePath}
                accept={dirParams.accept || '.pdf'}
                maxSizeMB={dirParams.maxSizeMB}
                maxFiles={1}
                label="Documento firmado"
                entityReady={!!effectiveRequestId}
                showInternalUploadButton={false}
              />
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isBusy}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleGuardar} disabled={isBusy || !effectiveRequestId}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}
