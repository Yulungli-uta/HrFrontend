// src/pages/admin/TemplateEditor.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save, CheckCircle2, RotateCcw, Archive, History, Download,
  ChevronLeft, Loader2, AlertTriangle, Link2, Code2, Eye, Tag,
  LayoutGrid, HelpCircle, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ResizablePanelGroup, ResizablePanel, ResizableHandle,
} from '@/components/ui/resizable';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { parseApiError } from '@/lib/error-handling';
import {
  DocumentTemplatesAPI,
  type DocumentTemplateDetailDto,
  type DocumentTemplateStatus,
  type UpdateDocumentTemplateRequest,
} from '@/lib/api/services/documentTemplates';
import { ContractTypeAPI, PersonnelActionTypeAPI } from '@/lib/api/services/contracts';
import { HtmlCodeEditor } from '@/components/templateEditor/HtmlCodeEditor';
import { TemplatePreviewPanel } from '@/components/templateEditor/TemplatePreviewPanel';
import { TemplateFieldsPanel } from '@/components/templateEditor/TemplateFieldsPanel';
import { VersionHistoryDrawer } from '@/components/templateEditor/VersionHistoryDrawer';
import { ContractTextImportModal } from '@/components/templateEditor/ContractTextImportModal';

/** Qué paneles del editor están visibles. Todos true por defecto (vista completa). */
interface PanelVisibility {
  editor: boolean;
  preview: boolean;
  tokens: boolean;
}

const DEFAULT_PANEL_VISIBILITY: PanelVisibility = { editor: true, preview: true, tokens: true };

const SCREEN_HELP_TEXT =
  'Esta pantalla permite diseñar y administrar plantillas HTML reutilizables para documentos ' +
  'institucionales. Puedes editar el contenido HTML, revisar la vista previa, validar los tokens ' +
  'disponibles y vincular una versión de plantilla a tipos de documento o procesos específicos.';

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

export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const templateId = Number(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [htmlContent, setHtmlContent] = useState('');
  const [name, setName] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [relinkOpen, setRelinkOpen] = useState(false);
  const [relinkFilter, setRelinkFilter] = useState('');

  // ── Visibilidad de paneles: permite trabajar solo con editor, solo con vista previa,
  // solo con tokens, o cualquier combinación — útil en plantillas grandes donde mostrar
  // los 3 paneles a la vez deja muy poco espacio para cada uno.
  const [panels, setPanels] = useState<PanelVisibility>(DEFAULT_PANEL_VISIBILITY);
  const visiblePanelCount = Number(panels.editor) + Number(panels.preview) + Number(panels.tokens);
  const togglePanel = (key: keyof PanelVisibility) =>
    setPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  const restoreAllPanels = () => setPanels(DEFAULT_PANEL_VISIBILITY);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['document-template', templateId],
    queryFn: () => DocumentTemplatesAPI.getById(templateId),
    enabled: !!templateId,
  });

  const template: DocumentTemplateDetailDto | undefined =
    data?.status === 'success' ? data.data : undefined;

  useEffect(() => {
    if (template) {
      setHtmlContent(template.htmlContent);
      setName(template.name);
      setIsDirty(false);
    }
  }, [template]);

  const handleHtmlChange = useCallback((val: string) => {
    setHtmlContent(val);
    setIsDirty(true);
  }, []);

  const handleNameChange = useCallback((val: string) => {
    setName(val);
    setIsDirty(true);
  }, []);

  const handleImport = useCallback((html: string) => {
    setHtmlContent(prev => prev + '\n' + html);
    setIsDirty(true);
  }, []);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!template) throw new Error('No template');
      const payload: UpdateDocumentTemplateRequest = {
        name,
        description: template.description ?? undefined,
        version: template.version,
        layoutType: template.layoutType,
        status: template.status,
        htmlContent,
        cssStyles: template.cssStyles ?? undefined,
        metaJson: template.metaJson ?? undefined,
        requiresSignature: template.requiresSignature,
        requiresApproval: template.requiresApproval,
      };
      return DocumentTemplatesAPI.update(templateId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-template', templateId] });
      setIsDirty(false);
      toast({ title: 'Guardado correctamente' });
    },
    onError: (err) => {
      toast({ title: 'Error al guardar', description: parseApiError(err).message, variant: 'destructive' });
    },
  });

  const qContractTypes = useQuery({
    queryKey: ['template-contract-types', templateId],
    queryFn: () => DocumentTemplatesAPI.getContractTypesForTemplate(templateId),
    enabled: relinkOpen && !!templateId,
  });
  const contractTypeOptions = qContractTypes.data?.status === 'success' ? qContractTypes.data.data : [];

  const qActionTypes = useQuery({
    queryKey: ['template-action-types', templateId],
    queryFn: () => DocumentTemplatesAPI.getActionTypesForTemplate(templateId),
    enabled: relinkOpen && !!templateId,
  });
  const actionTypeOptions = qActionTypes.data?.status === 'success' ? qActionTypes.data.data : [];

  // Filtro de búsqueda del modal "Usar esta versión" — útil cuando el catálogo de tipos crece.
  const filteredContractTypes = useMemo(() => {
    const q = relinkFilter.trim().toLowerCase();
    if (!q) return contractTypeOptions;
    return contractTypeOptions.filter((ct) => ct.name.toLowerCase().includes(q));
  }, [contractTypeOptions, relinkFilter]);

  const filteredActionTypes = useMemo(() => {
    const q = relinkFilter.trim().toLowerCase();
    if (!q) return actionTypeOptions;
    return actionTypeOptions.filter((at) => at.name.toLowerCase().includes(q));
  }, [actionTypeOptions, relinkFilter]);

  const relinkMutation = useMutation({
    mutationFn: ({ contractTypeId, slot }: { contractTypeId: number; slot: 'default' | 'delegation' }) =>
      slot === 'default'
        ? ContractTypeAPI.setDefaultTemplate(contractTypeId, templateId)
        : ContractTypeAPI.setDelegationTemplate(contractTypeId, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-contract-types', templateId] });
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast({ title: 'Tipo de contrato vinculado a esta versión' });
    },
    onError: (err) => {
      toast({ title: 'Error al vincular', description: parseApiError(err).message, variant: 'destructive' });
    },
  });

  const relinkActionTypeMutation = useMutation({
    mutationFn: (personnelActionTypeId: number) =>
      PersonnelActionTypeAPI.setDefaultTemplate(personnelActionTypeId, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-action-types', templateId] });
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast({ title: 'Tipo de acción de personal vinculado a esta versión' });
    },
    onError: (err) => {
      toast({ title: 'Error al vincular', description: parseApiError(err).message, variant: 'destructive' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: DocumentTemplateStatus) =>
      DocumentTemplatesAPI.setStatus(templateId, status),
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['document-template', templateId] });
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast({ title: `Estado cambiado a ${STATUS_LABELS[status]}` });
    },
    onError: (err) => {
      toast({ title: 'Error', description: parseApiError(err).message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !template) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">No se pudo cargar la plantilla.</p>
        <Button onClick={() => navigate('/admin/document-templates')}>Volver</Button>
      </div>
    );
  }

  const isReadOnly = template.status === 'Archived';

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-background shrink-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate('/admin/document-templates')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              disabled={isReadOnly}
              className="h-7 text-sm font-semibold w-56"
              aria-label="Nombre de la plantilla"
            />
            <span className="text-xs text-muted-foreground font-mono">{template.templateCode}</span>
            <Badge className={`text-xs ${STATUS_COLORS[template.status]}`}>
              v{template.version} · {STATUS_LABELS[template.status]}
            </Badge>
            {isDirty && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                Sin guardar
              </Badge>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Ayuda sobre esta pantalla">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{SCREEN_HELP_TEXT}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Vista: controles para mostrar/ocultar cada panel sin saturar la barra de acciones */}
        <div className="hidden md:flex items-center gap-1 border-r pr-2 mr-1">
          <span className="text-xs text-muted-foreground mr-1">Vista:</span>
          <Button
            size="sm"
            variant={panels.editor ? 'secondary' : 'ghost'}
            className="h-7 px-2 text-xs"
            onClick={() => togglePanel('editor')}
            title={panels.editor ? 'Ocultar editor' : 'Mostrar editor'}
          >
            <Code2 className="h-3.5 w-3.5 mr-1" />
            Editor
          </Button>
          <Button
            size="sm"
            variant={panels.preview ? 'secondary' : 'ghost'}
            className="h-7 px-2 text-xs"
            onClick={() => togglePanel('preview')}
            title={panels.preview ? 'Ocultar vista previa' : 'Mostrar vista previa'}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Vista previa
          </Button>
          <Button
            size="sm"
            variant={panels.tokens ? 'secondary' : 'ghost'}
            className="h-7 px-2 text-xs"
            onClick={() => togglePanel('tokens')}
            title={panels.tokens ? 'Ocultar tokens' : 'Mostrar tokens'}
          >
            <Tag className="h-3.5 w-3.5 mr-1" />
            Tokens
          </Button>
          {visiblePanelCount < 3 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={restoreAllPanels}
              title="Mostrar los 3 paneles otra vez"
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1" />
              Restaurar vista
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setImportModalOpen(true)}
            disabled={isReadOnly}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Importar texto
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setVersionDrawerOpen(true)}
          >
            <History className="h-3.5 w-3.5 mr-1" />
            Versiones
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRelinkOpen(true)}
          >
            <Link2 className="h-3.5 w-3.5 mr-1" />
            Usar esta versión
          </Button>

          {!isReadOnly && (
            <Button
              size="sm"
              onClick={() => setSaveConfirmOpen(true)}
              disabled={saveMutation.isPending || !isDirty || !name.trim()}
            >
              {saveMutation.isPending
                ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                : <Save className="h-3.5 w-3.5 mr-1" />
              }
              Guardar
            </Button>
          )}

          {template.status === 'Draft' && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => statusMutation.mutate('Published')}
              disabled={statusMutation.isPending || isDirty}
              title={isDirty ? 'Guarda los cambios primero' : 'Publicar'}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Publicar
            </Button>
          )}
          {template.status === 'Published' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => statusMutation.mutate('Draft')}
                disabled={statusMutation.isPending}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Borrador
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-gray-500"
                onClick={() => statusMutation.mutate('Archived')}
                disabled={statusMutation.isPending}
              >
                <Archive className="h-3.5 w-3.5 mr-1" />
                Archivar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main layout — paneles dinámicos según lo que el usuario decida mostrar */}
      <div className="flex-1 overflow-hidden">
        {visiblePanelCount === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-muted-foreground p-6">
            <LayoutGrid className="h-10 w-10 opacity-40" />
            <p className="text-sm">Ocultaste todos los paneles. Elige qué quieres ver:</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => togglePanel('editor')}>
                <Code2 className="h-3.5 w-3.5 mr-1" /> Mostrar editor
              </Button>
              <Button size="sm" variant="outline" onClick={() => togglePanel('preview')}>
                <Eye className="h-3.5 w-3.5 mr-1" /> Mostrar vista previa
              </Button>
              <Button size="sm" variant="outline" onClick={() => togglePanel('tokens')}>
                <Tag className="h-3.5 w-3.5 mr-1" /> Mostrar tokens
              </Button>
            </div>
          </div>
        ) : (
          // key fuerza un remount del grupo cuando cambia la combinación de paneles visibles,
          // para que react-resizable-panels recalcule tamaños en vez de arrastrar un layout viejo.
          <ResizablePanelGroup direction="horizontal" key={`${panels.editor}-${panels.preview}-${panels.tokens}`}>
            {panels.editor && (
              <>
                <ResizablePanel defaultSize={100 / visiblePanelCount} minSize={20}>
                  <div className="h-full flex flex-col border-r">
                    <div className="px-3 py-1.5 border-b bg-muted/40 text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span>Editor HTML</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => togglePanel('editor')}
                        title="Ocultar editor"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <HtmlCodeEditor
                        value={htmlContent}
                        onChange={handleHtmlChange}
                        readOnly={isReadOnly}
                      />
                    </div>
                  </div>
                </ResizablePanel>
                {visiblePanelCount > 1 && <ResizableHandle />}
              </>
            )}

            {panels.preview && (
              <>
                <ResizablePanel defaultSize={100 / visiblePanelCount} minSize={18}>
                  <div className="h-full flex flex-col border-r">
                    <div className="px-3 py-1.5 border-b bg-muted/40 text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span>Vista previa</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => togglePanel('preview')}
                        title="Ocultar vista previa"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <TemplatePreviewPanel
                        templateId={templateId}
                        htmlContent={htmlContent}
                      />
                    </div>
                  </div>
                </ResizablePanel>
                {panels.tokens && <ResizableHandle />}
              </>
            )}

            {panels.tokens && (
              <ResizablePanel defaultSize={100 / visiblePanelCount} minSize={16}>
                <div className="h-full flex flex-col">
                  <div className="px-3 py-1.5 border-b bg-muted/40 text-xs font-medium text-muted-foreground flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>Tokens en plantilla</span>
                      {template.fields.length > 0 && (
                        <Badge variant="outline" className="text-xs h-4 px-1">
                          {template.fields.length}
                        </Badge>
                      )}
                    </div>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => togglePanel('tokens')}
                      title="Ocultar tokens"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <TemplateFieldsPanel
                      templateId={templateId}
                      htmlContent={htmlContent}
                      fields={template.fields}
                      readOnly={isReadOnly}
                      onFieldsChanged={() =>
                        queryClient.invalidateQueries({ queryKey: ['document-template', templateId] })
                      }
                    />
                  </div>
                </div>
              </ResizablePanel>
            )}
          </ResizablePanelGroup>
        )}
      </div>

      <VersionHistoryDrawer
        open={versionDrawerOpen}
        templateCode={template.templateCode}
        templateName={template.name}
        currentTemplateId={templateId}
        onClose={() => setVersionDrawerOpen(false)}
        onOpenEditor={(newId) => {
          setVersionDrawerOpen(false);
          navigate(`/admin/document-templates/${newId}/editor`);
        }}
      />

      <ContractTextImportModal
        open={importModalOpen}
        templateId={templateId}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImport}
      />

      <AlertDialog open={saveConfirmOpen} onOpenChange={setSaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Guardar cambios en esta plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Se sobrescribirá el contenido de la versión <strong>{template.version}</strong> ({template.templateCode}).
              Los documentos ya generados con esta plantilla no se ven afectados, ya que conservan
              una copia inmutable (snapshot) de su contenido. Si necesita conservar la versión actual
              intacta, use "Crear versión" desde el historial en vez de guardar aquí.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSaveConfirmOpen(false);
                saveMutation.mutate();
              }}
            >
              Guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={relinkOpen} onOpenChange={(v) => { setRelinkOpen(v); if (!v) setRelinkFilter(''); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-3 shrink-0">
            <DialogTitle>Usar esta versión de plantilla</DialogTitle>
            <DialogDescription>
              Selecciona en qué tipos de documento, trámite o proceso se utilizará la versión{' '}
              <strong>{template.name} (v{template.version})</strong>. Al confirmar, esta versión
              quedará asociada como la plantilla activa para los elementos seleccionados.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={relinkFilter}
                onChange={(e) => setRelinkFilter(e.target.value)}
                placeholder="Buscar tipo de contrato o de acción de personal..."
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tipos de contrato
              </p>
              <div className="space-y-2">
                {qContractTypes.isLoading ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p>
                ) : filteredContractTypes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {contractTypeOptions.length === 0
                      ? 'No hay tipos de contrato de esta familia de plantilla.'
                      : 'Ningún tipo de contrato coincide con la búsqueda.'}
                  </p>
                ) : (
                  filteredContractTypes.map((ct) => (
                    <div key={ct.contractTypeId} className="flex items-center justify-between gap-2 rounded-md border p-2.5">
                      <div className="text-sm min-w-0 flex-1">
                        <p className="font-medium truncate">{ct.name}</p>
                        <Badge
                          variant="outline"
                          className={`text-xs mt-1 ${ct.isDefault ? 'text-green-600 border-green-400' : 'text-muted-foreground'}`}
                        >
                          {ct.isDefault ? 'Plantilla predeterminada actual' : 'No vinculado'}
                        </Badge>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={relinkMutation.isPending}
                          onClick={() => relinkMutation.mutate({ contractTypeId: ct.contractTypeId, slot: 'default' })}
                          title="Usar esta versión como plantilla predeterminada para este tipo de contrato"
                        >
                          Predeterminada
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={relinkMutation.isPending}
                          onClick={() => relinkMutation.mutate({ contractTypeId: ct.contractTypeId, slot: 'delegation' })}
                          title="Usar esta versión cuando el contrato se firme por delegación"
                        >
                          Delegación
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tipos de acción de personal
              </p>
              <div className="space-y-2">
                {qActionTypes.isLoading ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p>
                ) : filteredActionTypes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {actionTypeOptions.length === 0
                      ? 'No hay tipos de acción de personal activos.'
                      : 'Ningún tipo de acción de personal coincide con la búsqueda.'}
                  </p>
                ) : (
                  filteredActionTypes.map((at) => (
                    <div key={at.personnelActionTypeId} className="flex items-center justify-between gap-2 rounded-md border p-2.5">
                      <div className="text-sm min-w-0 flex-1">
                        <p className="font-medium truncate">{at.name}</p>
                        <Badge
                          variant="outline"
                          className={`text-xs mt-1 ${at.isDefault ? 'text-green-600 border-green-400' : 'text-muted-foreground'}`}
                        >
                          {at.isDefault ? 'Plantilla predeterminada actual' : 'No vinculado'}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={relinkActionTypeMutation.isPending}
                        onClick={() => relinkActionTypeMutation.mutate(at.personnelActionTypeId)}
                      >
                        Vincular
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-3 border-t shrink-0">
            <p className="text-xs text-muted-foreground mr-auto self-center">
              Cada vínculo se aplica de inmediato al presionar su botón.
            </p>
            <Button variant="outline" onClick={() => setRelinkOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
