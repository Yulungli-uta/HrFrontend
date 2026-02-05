// src/components/contractRequest/AttachmentSection.tsx

import { forwardRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ReusableDocumentManager, type ReusableDocumentManagerHandle } from "@/components/ReusableDocumentManager";

type Props = {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;

  label?: string;

  directoryCode: string;
  entityType: string;

  // cuando existe (detalle): entityId definido + entityReady true
  entityId?: number;
  entityReady: boolean;

  accept: string;
  maxSizeMB: number;
  relativePath: string;

  disabled?: boolean;
  showUploadButton?: boolean; // si quieres subir dentro o fuera
};

export const AttachmentSection = forwardRef<ReusableDocumentManagerHandle, Props>(function AttachmentSection(
  {
    enabled,
    onEnabledChange,
    label = "Documentos",
    directoryCode,
    entityType,
    entityId,
    entityReady,
    accept,
    maxSizeMB,
    relativePath,
    disabled,
    showUploadButton = false,
  },
  ref
) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Checkbox checked={enabled} onCheckedChange={(v) => onEnabledChange(!!v)} />
        <span className="text-sm font-medium">Adjuntar documentos</span>
        <Badge variant="outline" className="text-xs">{directoryCode}</Badge>
      </div>

      {enabled && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{label}</CardTitle>
            <CardDescription className="text-xs">
              {entityReady ? "Asociados a la solicitud" : "Seleccione archivos (se subirán luego de crear la solicitud)."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReusableDocumentManager
              ref={ref}
              label={label}
              directoryCode={directoryCode}
              entityType={entityType}
              entityId={entityId}
              entityReady={entityReady}
              allowSelectWhenNotReady={!entityReady}
              showInternalUploadButton={showUploadButton}
              relativePath={relativePath}
              accept={accept}
              maxSizeMB={maxSizeMB}
              maxFiles={10}
              disabled={disabled}
              roles={{ canUpload: true, canPreview: true, canDownload: true, canDelete: true }}
              documentType={{ enabled: true, required: false }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
});
