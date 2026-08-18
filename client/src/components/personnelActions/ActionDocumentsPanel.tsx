// src/components/personnelActions/ActionDocumentsPanel.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen } from 'lucide-react';
import { ReusableDocumentManager } from '@/components/ReusableDocumentManager';
import { PERSONNEL_ACTION_DIRECTORY_CODE, PERSONNEL_ACTION_ENTITY_TYPE } from '@/features/constants';
import { REF_TYPE_CATEGORIES } from '@/features/refTypeCategories';

// Panel de documentos adjuntos a la acción de personal — permite anexar y quitar
// (soft-delete, nunca reemplazo físico) archivos del trámite. Compartido entre
// PersonnelActionDetail (vista normal) y PersonnelActionsCorrection (corrección).
//
// El tipo de documento (incluido "Documento Firmado") es solo una etiqueta para
// clasificar el archivo — este panel usa el endpoint genérico de subida de
// documentos, completamente separado de "Subir documento firmado" (que sí
// transiciona el estado a FIRMADO_CARGADO). Elegir aquí el tipo "Documento
// Firmado" NUNCA cambia el estado de la acción; deja el registro exactamente
// como estaba.
export function ActionDocumentsPanel({ actionId }: { actionId: number }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Documentos del Trámite
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ReusableDocumentManager
          label=""
          directoryCode={PERSONNEL_ACTION_DIRECTORY_CODE}
          entityType={PERSONNEL_ACTION_ENTITY_TYPE}
          entityId={actionId}
          entityReady={actionId > 0}
          relativePath=""
          accept="*/*"
          maxSizeMB={20}
          maxFiles={20}
          documentType={{
            enabled: true,
            category: REF_TYPE_CATEGORIES.PROCESS_ATTACHMENT_TYPE,
            label: 'Tipo de documento',
            required: false,
          }}
        />
      </CardContent>
    </Card>
  );
}
