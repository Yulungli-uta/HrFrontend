// src/components/personnelActions/ActionDocumentsPanel.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen } from 'lucide-react';
import { ReusableDocumentManager } from '@/components/ReusableDocumentManager';
import { PERSONNEL_ACTION_DIRECTORY_CODE, PERSONNEL_ACTION_ENTITY_TYPE } from '@/features/constants';

// Panel de documentos adjuntos a la acción de personal — permite anexar y quitar
// (soft-delete, nunca reemplazo físico) archivos del trámite. Compartido entre
// PersonnelActionDetail (vista normal) y PersonnelActionsCorrection (corrección).
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
        />
      </CardContent>
    </Card>
  );
}
