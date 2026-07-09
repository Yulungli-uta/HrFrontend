// src/components/templateEditor/TemplatePreviewPanel.tsx
import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  DocumentTemplatesAPI,
  type PreviewTemplateResponse,
} from '@/lib/api/services/documentTemplates';

interface Props {
  templateId: number;
  htmlContent: string;
  employeeId?: number | null;
  manualOverrides?: Record<string, string>;
}

export function TemplatePreviewPanel({ templateId, htmlContent, employeeId, manualOverrides }: Props) {
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [preview, setPreview] = useState<PreviewTemplateResponse | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      DocumentTemplatesAPI.preview({
        templateId,
        employeeId: employeeId ?? null,
        manualOverrides: manualOverrides ?? null,
      }),
    onSuccess: (res) => {
      if (res.status === 'success') setPreview(res.data);
    },
    onError: () => {
      toast({ title: 'Error al previsualizar', variant: 'destructive' });
    },
  });

  useEffect(() => {
    if (preview && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`<!DOCTYPE html><html><head>
          <meta charset="UTF-8">
          <meta name="color-scheme" content="light only">
          <style>
            /* La vista previa debe verse igual que el documento final (papel blanco),
               sin importar si el editor está en modo oscuro o claro. */
            html, body {
              background: #ffffff !important;
              color: #000000;
              color-scheme: light;
            }
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 11pt; }
            * { box-sizing: border-box; }
          </style>
        </head><body>${preview.htmlContent}</body></html>`);
        doc.close();
      }
    }
  }, [preview]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="h-4 w-4" />
          Vista previa
          {preview?.unresolvedFields && preview.unresolvedFields.length > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {preview.unresolvedFields.length} sin resolver
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${mutation.isPending ? 'animate-spin' : ''}`} />
          {mutation.isPending ? 'Generando...' : 'Actualizar'}
        </Button>
      </div>

      {!preview ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          <div className="text-center space-y-2">
            <Eye className="h-10 w-10 mx-auto opacity-30" />
            <p>Haz clic en "Actualizar" para ver la previsualización</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {preview.unresolvedFields.length > 0 && (
            <div className="px-3 py-2 bg-amber-50 border-b text-xs text-amber-700 space-y-0.5">
              <p className="font-medium">Campos sin resolver:</p>
              {preview.unresolvedFields.map(f => (
                <p key={f.fieldName}>• {f.fieldName}: {f.reason}</p>
              ))}
            </div>
          )}
          <iframe
            ref={iframeRef}
            className="flex-1 w-full border-0 bg-white"
            style={{ colorScheme: 'light' }}
            title="preview"
            sandbox="allow-same-origin"
          />
        </div>
      )}
    </div>
  );
}
