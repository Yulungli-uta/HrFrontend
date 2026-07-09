// src/pages/admin/DocumentTemplates.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  FileText, Plus, Edit, History, CheckCircle2, Archive,
  RotateCcw, Search, Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { parseApiError } from '@/lib/error-handling';
import {
  DocumentTemplatesAPI,
  type DocumentTemplateSummaryDto,
  type DocumentTemplateStatus,
  type CreateDocumentTemplateRequest,
} from '@/lib/api/services/documentTemplates';
import { VersionHistoryDrawer } from '@/components/templateEditor/VersionHistoryDrawer';

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

function CreateTemplateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [form, setForm] = useState<Partial<CreateDocumentTemplateRequest>>({
    templateCode: '',
    name: '',
    templateType: '',
    version: '1.0',
    layoutType: 'A4Portrait',
    htmlContent: '<div class="document">\n  <!-- Contenido de la plantilla -->\n</div>',
    requiresSignature: false,
    requiresApproval: false,
  });

  const mutation = useMutation({
    mutationFn: (data: CreateDocumentTemplateRequest) => DocumentTemplatesAPI.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast({ title: 'Plantilla creada', description: 'Se creó en estado Borrador.' });
      onClose();
      if (res.status === 'success' && res.data?.id)
        navigate(`/admin/document-templates/${res.data.id}/editor`);
    },
    onError: (err) => {
      toast({ title: 'Error', description: parseApiError(err).message, variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    if (!form.templateCode || !form.name || !form.templateType) {
      toast({ title: 'Faltan campos', description: 'Código, nombre y tipo son requeridos.', variant: 'destructive' });
      return;
    }
    mutation.mutate(form as CreateDocumentTemplateRequest);
  };

  const set = (key: keyof CreateDocumentTemplateRequest, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Plantilla</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Código único *</Label>
            <Input
              value={form.templateCode ?? ''}
              onChange={e => set('templateCode', e.target.value.toUpperCase())}
              placeholder="Ej: CONTRATO_OCASIONAL"
            />
          </div>
          <div>
            <Label>Nombre *</Label>
            <Input
              value={form.name ?? ''}
              onChange={e => set('name', e.target.value)}
              placeholder="Nombre descriptivo"
            />
          </div>
          <div>
            <Label>Tipo *</Label>
            <Input
              value={form.templateType ?? ''}
              onChange={e => set('templateType', e.target.value.toUpperCase())}
              placeholder="Ej: CONTRATO, ACCION_PERSONAL"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Versión</Label>
              <Input
                value={form.version ?? '1.0'}
                onChange={e => set('version', e.target.value)}
              />
            </div>
            <div>
              <Label>Diseño</Label>
              <Select
                value={form.layoutType ?? 'A4Portrait'}
                onValueChange={v => set('layoutType', v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4Portrait">A4 Vertical</SelectItem>
                  <SelectItem value="A4Landscape">A4 Horizontal</SelectItem>
                  <SelectItem value="LetterPortrait">Carta Vertical</SelectItem>
                  <SelectItem value="LetterLandscape">Carta Horizontal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Creando...' : 'Crear y editar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DocumentTemplatesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentTemplateStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [versionDrawer, setVersionDrawer] = useState<{ open: boolean; code: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['document-templates', statusFilter],
    queryFn: () => DocumentTemplatesAPI.getAll({
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  const allTemplates = data?.status === 'success' ? data.data : [];
  const availableTypes = Array.from(new Set(allTemplates.map(t => t.templateType))).sort();

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: DocumentTemplateStatus }) =>
      DocumentTemplatesAPI.setStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast({ title: 'Estado actualizado' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: parseApiError(err).message, variant: 'destructive' });
    },
  });

  const templates = allTemplates.filter(t =>
    (typeFilter === 'all' || t.templateType === typeFilter) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.templateCode.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Plantillas Documentales</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Plantilla
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {availableTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as DocumentTemplateStatus | 'all')}>
          <SelectTrigger className="w-44">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="Draft">Borrador</SelectItem>
            <SelectItem value="Published">Publicada</SelectItem>
            <SelectItem value="Archived">Archivada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Versión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Usado por</TableHead>
                <TableHead>Campos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No se encontraron plantillas.
                  </TableCell>
                </TableRow>
              ) : templates.map((t: DocumentTemplateSummaryDto) => (
                <TableRow key={t.templateId}>
                  <TableCell className="font-mono text-sm">{t.templateCode}</TableCell>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.templateType}</TableCell>
                  <TableCell className="text-sm">{t.version}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[t.status]}>
                      {STATUS_LABELS[t.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {t.isInUse ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className="bg-blue-100 text-blue-700 cursor-default">
                              En uso ({t.usedBy.length})
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-xs">
                              Usada por: {t.usedBy.join(', ')}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Sin uso
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{t.fieldCount}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/admin/document-templates/${t.templateId}/editor`)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setVersionDrawer({ open: true, code: t.templateCode, name: t.name })}
                        title="Historial de versiones"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      {t.status === 'Draft' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600"
                          onClick={() => statusMutation.mutate({ id: t.templateId, status: 'Published' })}
                          title="Publicar"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      {t.status === 'Published' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => statusMutation.mutate({ id: t.templateId, status: 'Draft' })}
                            title="Volver a borrador"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-500"
                            onClick={() => statusMutation.mutate({ id: t.templateId, status: 'Archived' })}
                            title="Archivar"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateTemplateDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {versionDrawer && (
        <VersionHistoryDrawer
          open={versionDrawer.open}
          templateCode={versionDrawer.code}
          templateName={versionDrawer.name}
          onClose={() => setVersionDrawer(null)}
          onOpenEditor={(id) => navigate(`/admin/document-templates/${id}/editor`)}
        />
      )}
    </div>
  );
}
