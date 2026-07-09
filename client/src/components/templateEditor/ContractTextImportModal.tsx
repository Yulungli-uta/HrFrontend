// src/components/templateEditor/ContractTextImportModal.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, AlertTriangle, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { DocumentTemplatesAPI, type ImportContractTextResponse } from '@/lib/api/services/documentTemplates';

interface Props {
  open: boolean;
  templateId: number;
  onClose: () => void;
  onImport: (html: string) => void;
}

function useContractTypesForTemplate(templateId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['template-contract-types', templateId],
    queryFn: () => DocumentTemplatesAPI.getContractTypesForTemplate(templateId),
    staleTime: 60_000,
    enabled,
  });
}

export function ContractTextImportModal({ open, templateId, onClose, onImport }: Props) {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string>('');
  const [result, setResult] = useState<ImportContractTextResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    data: contractTypesData,
    isLoading: loadingContractTypes,
    isError: contractTypesError,
  } = useContractTypesForTemplate(templateId, open);
  const contractTypes =
    contractTypesData?.status === 'success' ? contractTypesData.data : [];

  const handleLoad = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const res = await DocumentTemplatesAPI.importContractText(Number(selectedId));
      if (res.status === 'success') setResult(res.data);
    } catch {
      toast({ title: 'Error al cargar el texto', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.rawText) return;
    navigator.clipboard.writeText(result.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportAsHtml = () => {
    if (!result?.rawText) return;
    const escaped = result.rawText
      .split('\n')
      .map(line => `<p>${line}</p>`)
      .join('\n');
    onImport(escaped);
    onClose();
    toast({ title: 'Texto importado', description: 'El texto se insertó al final del editor HTML.' });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Importar texto base
          </DialogTitle>
          <DialogDescription>
            Selecciona una fuente de texto base para insertarla en la plantilla actual. Esta
            opción permite reutilizar contenido previamente definido para documentos, acciones
            de personal, contratos u otros procesos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Label>Fuente de texto</Label>
            <Select
              value={selectedId}
              onValueChange={setSelectedId}
              disabled={loadingContractTypes || contractTypes.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingContractTypes
                      ? 'Cargando fuentes de texto...'
                      : 'Selecciona una fuente...'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {contractTypes.map((ct) => (
                  <SelectItem key={ct.contractTypeId} value={String(ct.contractTypeId)}>
                    {ct.name}{ct.isDefault ? ' · Predeterminado' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleLoad} disabled={!selectedId || loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            {loading ? 'Cargando...' : 'Importar texto'}
          </Button>
        </div>

        {!loadingContractTypes && contractTypesError && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            No se pudieron cargar las fuentes de texto de esta plantilla.
          </div>
        )}

        {!loadingContractTypes && !contractTypesError && contractTypes.length === 0 && (
          <div className="text-sm text-muted-foreground bg-muted/40 border rounded-md p-2">
            Esta plantilla no tiene fuentes de texto asociadas todavía. Por ahora, las fuentes
            disponibles provienen de tipos de contrato con texto legado (ContractText).
          </div>
        )}

        {result && (
          <div className="flex-1 overflow-auto space-y-3 mt-2">
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border rounded-md p-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              El texto importado se insertará al final del editor actual, sin reemplazar el
              contenido existente. Revisa el resultado y ajusta los tokens antes de guardar.
            </div>

            {result.placeholders.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  {result.placeholders.length} placeholders legados detectados
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.placeholders.map(p => (
                    <Badge key={p.placeholder} variant="outline" className="text-xs font-mono text-amber-700 border-amber-400 dark:text-amber-400 dark:border-amber-700">
                      {p.placeholder} ×{p.occurrences}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Reemplaza los {'{N}'} con tokens {'{{CAMPO}}'} en el editor después de importar.
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Texto del contrato</Label>
                <Button size="sm" variant="ghost" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="ml-1 text-xs">{copied ? 'Copiado' : 'Copiar'}</span>
                </Button>
              </div>
              <Textarea
                readOnly
                value={result.rawText}
                className="font-mono text-xs min-h-[200px] resize-none"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          {result && (
            <Button onClick={handleImportAsHtml}>
              Insertar en editor como HTML
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
