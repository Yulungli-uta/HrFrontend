// src/components/templateEditor/VersionHistoryDrawer.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { History, Plus, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { parseApiError } from '@/lib/error-handling';
import {
  DocumentTemplatesAPI,
  type TemplateVersionSummaryDto,
  type DocumentTemplateStatus,
} from '@/lib/api/services/documentTemplates';

const STATUS_COLORS: Record<DocumentTemplateStatus, string> = {
  Draft:     'bg-yellow-100 text-yellow-700',
  Published: 'bg-green-100 text-green-700',
  Archived:  'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<DocumentTemplateStatus, string> = {
  Draft:     'Borrador',
  Published: 'Publicada',
  Archived:  'Archivada',
};

interface Props {
  open: boolean;
  templateCode: string;
  templateName: string;
  currentTemplateId?: number;
  onClose: () => void;
  onOpenEditor: (templateId: number) => void;
}

function CreateVersionDialog({
  open,
  sourceTemplateId,
  onClose,
}: {
  open: boolean;
  sourceTemplateId: number;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [version, setVersion] = useState('');

  const mutation = useMutation({
    mutationFn: () => DocumentTemplatesAPI.createVersion(sourceTemplateId, version),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['template-versions'] });
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      const version = res.status === 'success' ? res.data.newVersion : '';
      toast({
        title: 'Versión creada',
        description: `Versión ${version} creada en estado Borrador.`,
      });
      setVersion('');
      onClose();
    },
    onError: (err) => {
      toast({ title: 'Error', description: parseApiError(err).message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nueva versión</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Se creará una copia del contenido actual como nueva versión en estado Borrador.
          </p>
          <div>
            <Label>Número de versión *</Label>
            <Input
              value={version}
              onChange={e => setVersion(e.target.value)}
              placeholder="Ej: 2.0, 1.1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !version.trim()}
          >
            {mutation.isPending ? 'Creando...' : 'Crear versión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VersionHistoryDrawer({
  open,
  templateCode,
  templateName,
  currentTemplateId,
  onClose,
  onOpenEditor,
}: Props) {
  const [createVersionOpen, setCreateVersionOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['template-versions', templateCode],
    queryFn: () => DocumentTemplatesAPI.getVersionsByCode(templateCode),
    enabled: open && !!templateCode,
  });

  const versions = data?.status === 'success' ? data.data : [];

  return (
    <>
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent className="w-[400px] sm:w-[480px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de versiones
            </SheetTitle>
            <p className="text-sm text-muted-foreground">{templateName}</p>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {currentTemplateId && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setCreateVersionOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" /> Nueva versión
              </Button>
            )}

            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
            ) : versions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin versiones.</p>
            ) : (
              <div className="space-y-2">
                {versions.map((v: TemplateVersionSummaryDto) => (
                  <div
                    key={v.templateId}
                    className={`border rounded-lg p-3 flex items-center justify-between gap-2 ${
                      v.templateId === currentTemplateId ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">v{v.version}</span>
                        <Badge className={`text-xs ${STATUS_COLORS[v.status]}`}>
                          {STATUS_LABELS[v.status]}
                        </Badge>
                        {v.templateId === currentTemplateId && (
                          <Badge variant="outline" className="text-xs">Actual</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {v.createdAt
                          ? new Date(v.createdAt).toLocaleDateString('es-EC', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })
                          : '—'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { onClose(); onOpenEditor(v.templateId); }}
                      title="Abrir en editor"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {currentTemplateId && (
        <CreateVersionDialog
          open={createVersionOpen}
          sourceTemplateId={currentTemplateId}
          onClose={() => setCreateVersionOpen(false)}
        />
      )}
    </>
  );
}
