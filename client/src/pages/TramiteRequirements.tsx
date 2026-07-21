// src/pages/TramiteRequirements.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardCheck, Trash2, RefreshCw, Edit, FolderPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TramiteRequirementsAPI, TiposReferenciaAPI } from "@/lib/api";
import type { AccessibleModuleDto, TramiteRequirementDto } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { parseApiError } from '@/lib/error-handling';
import { logger } from "@/lib/logger";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { RefTypeDescriptionHint } from "@/components/shared/RefTypeDescriptionHint";

type DocumentTypeOption = { typeId: number; name: string };

export default function TramiteRequirementsPage() {
  const { toast } = useToast();

  const [modules, setModules] = useState<AccessibleModuleDto[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [requirements, setRequirements] = useState<TramiteRequirementDto[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeOption[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(true);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TramiteRequirementDto | null>(null);
  const [form, setForm] = useState<{ moduleTypeId: string; documentTypeId: string; specificTypeId: string; isRequired: boolean; isActive: boolean }>({
    moduleTypeId: '',
    documentTypeId: '',
    specificTypeId: '',
    isRequired: false,
    isActive: true,
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TramiteRequirementDto | null>(null);

  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [moduleForm, setModuleForm] = useState<{ name: string; description: string }>({ name: '', description: '' });

  useEffect(() => {
    loadModules();
    loadDocumentTypes();
  }, []);

  useEffect(() => {
    if (selectedModuleId !== null) loadRequirements(selectedModuleId);
  }, [selectedModuleId]);

  async function loadModules() {
    try {
      setIsLoadingModules(true);
      const res = await TramiteRequirementsAPI.getAccessibleModules();
      if (res.status === 'success') {
        const list = res.data ?? [];
        setModules(list);
        if (list.length > 0) setSelectedModuleId(list[0].moduleTypeId);
      } else {
        toast({ title: "Error", description: "No se pudieron cargar los módulos disponibles.", variant: "destructive" });
      }
    } catch (error) {
      logger.error("TramiteRequirements", 'Error loading modules:', error);
      toast({ title: "Error", description: "Error de conexión al cargar los módulos.", variant: "destructive" });
    } finally {
      setIsLoadingModules(false);
    }
  }

  async function reloadModules(selectNewId?: number) {
    try {
      const res = await TramiteRequirementsAPI.getAccessibleModules();
      if (res.status === 'success') {
        setModules(res.data ?? []);
        if (selectNewId != null) setForm((f) => ({ ...f, moduleTypeId: String(selectNewId) }));
      }
    } catch (error) {
      logger.error("TramiteRequirements", 'Error reloading modules:', error);
    }
  }

  async function loadDocumentTypes() {
    try {
      const res = await TiposReferenciaAPI.byCategory('DOCUMENT_TYPE');
      if (res.status === 'success') {
        const list = (res.data ?? []).map((rt: any) => ({ typeId: rt.typeId ?? rt.typeID, name: rt.name }));
        setDocumentTypes(list);
      }
    } catch (error) {
      logger.error("TramiteRequirements", 'Error loading document types:', error);
    }
  }

  async function loadRequirements(moduleTypeId: number) {
    try {
      setIsLoadingRequirements(true);
      const res = await TramiteRequirementsAPI.getByModule(moduleTypeId);
      if (res.status === 'success') {
        setRequirements(res.data ?? []);
      } else {
        setRequirements([]);
        toast({ title: "Error", description: "No se pudieron cargar los requisitos de este módulo.", variant: "destructive" });
      }
    } catch (error) {
      logger.error("TramiteRequirements", 'Error loading requirements:', error);
      setRequirements([]);
      toast({ title: "Error", description: parseApiError(error).message || "Error al cargar los requisitos.", variant: "destructive" });
    } finally {
      setIsLoadingRequirements(false);
    }
  }

  function openCreateDialog() {
    setEditing(null);
    setForm({
      moduleTypeId: selectedModuleId != null ? String(selectedModuleId) : '',
      documentTypeId: '',
      specificTypeId: '',
      isRequired: false,
      isActive: true,
    });
    setIsDialogOpen(true);
  }

  function openEditDialog(item: TramiteRequirementDto) {
    setEditing(item);
    setForm({
      moduleTypeId: String(item.moduleTypeId),
      documentTypeId: String(item.documentTypeId),
      specificTypeId: item.specificTypeId != null ? String(item.specificTypeId) : '',
      isRequired: item.isRequired,
      isActive: item.isActive,
    });
    setIsDialogOpen(true);
  }

  async function handleCreateModule() {
    if (!moduleForm.name.trim()) {
      toast({ title: "Error", description: "El nombre del módulo es obligatorio.", variant: "destructive" });
      return;
    }
    try {
      setIsCreatingModule(true);
      const res = await TiposReferenciaAPI.create({
        typeId: 0,
        category: REF_TYPE_CATEGORIES.ACCESS_MODULE_TYPE,
        name: moduleForm.name.trim().toUpperCase().replace(/\s+/g, '_'),
        description: moduleForm.description.trim() || moduleForm.name.trim(),
        isActive: true,
        createdAt: new Date().toISOString(),
      });
      if (res.status !== 'success') throw new Error(res.error?.message || 'Error al crear el módulo');
      const newId = (res.data as any)?.typeId ?? (res.data as any)?.typeID;
      toast({ title: "Éxito", description: "Módulo creado correctamente." });
      setIsModuleDialogOpen(false);
      setModuleForm({ name: '', description: '' });
      await reloadModules(newId);
    } catch (error) {
      logger.error("TramiteRequirements", 'Error creating module:', error);
      toast({ title: "Error", description: parseApiError(error).message || "Error al crear el módulo.", variant: "destructive" });
    } finally {
      setIsCreatingModule(false);
    }
  }

  async function handleSave() {
    if (selectedModuleId === null) return;

    try {
      if (editing) {
        const res = await TramiteRequirementsAPI.update(editing.requirementId, {
          isRequired: form.isRequired,
          isActive: form.isActive,
        });
        if (res.status !== 'success') throw new Error(res.error?.message || 'Error al actualizar el requisito');
        toast({ title: "Éxito", description: "Requisito actualizado correctamente." });
      } else {
        if (!form.moduleTypeId) {
          toast({ title: "Error", description: "Debe seleccionar un módulo.", variant: "destructive" });
          return;
        }
        if (!form.documentTypeId) {
          toast({ title: "Error", description: "Debe seleccionar un tipo de documento.", variant: "destructive" });
          return;
        }
        const targetModuleId = Number(form.moduleTypeId);
        const res = await TramiteRequirementsAPI.create({
          moduleTypeId: targetModuleId,
          specificTypeId: form.specificTypeId.trim() ? Number(form.specificTypeId) : null,
          documentTypeId: Number(form.documentTypeId),
          isRequired: form.isRequired,
        });
        if (res.status !== 'success') throw new Error(res.error?.message || 'Error al crear el requisito');
        toast({ title: "Éxito", description: "Requisito creado correctamente." });

        setIsDialogOpen(false);
        if (targetModuleId === selectedModuleId) {
          await loadRequirements(selectedModuleId);
        } else {
          setSelectedModuleId(targetModuleId);
        }
        return;
      }

      setIsDialogOpen(false);
      await loadRequirements(selectedModuleId);
    } catch (error) {
      logger.error("TramiteRequirements", 'Error saving requirement:', error);
      toast({ title: "Error", description: parseApiError(error).message || "Error al guardar el requisito.", variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!toDelete || selectedModuleId === null) return;
    try {
      const res = await TramiteRequirementsAPI.remove(toDelete.requirementId);
      if (res.status !== 'success') throw new Error(res.error?.message || 'Error al eliminar el requisito');
      toast({ title: "Éxito", description: "Requisito eliminado correctamente." });
      setIsDeleteDialogOpen(false);
      setToDelete(null);
      await loadRequirements(selectedModuleId);
    } catch (error) {
      logger.error("TramiteRequirements", 'Error deleting requirement:', error);
      toast({ title: "Error", description: parseApiError(error).message || "Error al eliminar el requisito.", variant: "destructive" });
    }
  }

  if (isLoadingModules) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin mb-4" />
            <p>Cargando módulos disponibles...</p>
          </div>
        </div>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <ClipboardCheck className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg mb-2">No hay módulos disponibles para parametrizar</p>
            <p className="text-sm">No se encontraron trámites (Contratos, Acciones de Personal, etc.) en el catálogo de módulos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">Requisitos Documentales por Trámite</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Configure qué documentos son obligatorios por módulo y, opcionalmente, por tipo específico.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Requisito
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Módulo</CardTitle>
              <CardDescription className="text-sm">Configure los requisitos documentales por trámite/módulo.</CardDescription>
            </div>
            <div className="w-full sm:w-64">
              <Select
                value={selectedModuleId != null ? String(selectedModuleId) : undefined}
                onValueChange={(v) => setSelectedModuleId(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione un módulo" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.moduleTypeId} value={String(m.moduleTypeId)}>
                      {m.moduleTypeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <RefTypeDescriptionHint
                description={modules.find((m) => m.moduleTypeId === selectedModuleId)?.moduleTypeDescription}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingRequirements ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requirements.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Documento</TableHead>
                    <TableHead className="hidden sm:table-cell">Alcance</TableHead>
                    <TableHead>Obligatorio</TableHead>
                    <TableHead className="hidden md:table-cell">Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requirements.map((r) => (
                    <TableRow key={r.requirementId}>
                      <TableCell className="font-medium text-sm">
                        {r.documentTypeName ?? `ID ${r.documentTypeId}`}
                        <div className="sm:hidden mt-1">
                          {r.specificTypeId != null ? (
                            <Badge variant="outline" className="text-xs">#{r.specificTypeId}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">General</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {r.specificTypeId != null ? (
                          <Badge variant="outline">Tipo específico #{r.specificTypeId}</Badge>
                        ) : (
                          <Badge variant="outline">General (todo el módulo)</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.isRequired ? "default" : "secondary"}>
                          {r.isRequired ? 'Obligatorio' : 'Opcional'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={r.isActive ? "default" : "secondary"}>
                          {r.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" onClick={() => openEditDialog(r)} className="h-8 w-8 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" onClick={() => { setToDelete(r); setIsDeleteDialogOpen(true); }} className="h-8 w-8 p-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-base mb-2">Sin requisitos configurados para este módulo</p>
              <p className="text-sm">Los documentos serán opcionales hasta que agregues un requisito.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Requisito' : 'Nuevo Requisito'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Modifique la obligatoriedad o el estado del requisito.'
                : 'Defina el documento requerido para el módulo seleccionado.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editing && (
              <>
                <div className="space-y-2">
                  <Label>Módulo *</Label>
                  <div className="flex gap-2">
                    <Select value={form.moduleTypeId} onValueChange={(v) => setForm({ ...form, moduleTypeId: v })}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccione el módulo" />
                      </SelectTrigger>
                      <SelectContent>
                        {modules.map((m) => (
                          <SelectItem key={m.moduleTypeId} value={String(m.moduleTypeId)}>{m.moduleTypeName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" className="shrink-0" onClick={() => setIsModuleDialogOpen(true)} title="Crear nuevo módulo">
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                  </div>
                  <RefTypeDescriptionHint
                    description={modules.find((m) => String(m.moduleTypeId) === form.moduleTypeId)?.moduleTypeDescription}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Documento *</Label>
                  <Select value={form.documentTypeId} onValueChange={(v) => setForm({ ...form, documentTypeId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el tipo de documento" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((dt) => (
                        <SelectItem key={dt.typeId} value={String(dt.typeId)}>{dt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ID de tipo específico (opcional)</Label>
                  <Input
                    type="number"
                    placeholder="Ej. ID del tipo de contrato. Vacío = aplica a todo el módulo"
                    value={form.specificTypeId}
                    onChange={(e) => setForm({ ...form, specificTypeId: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                checked={form.isRequired}
                onCheckedChange={(checked) => setForm({ ...form, isRequired: checked })}
              />
              <Label>Documento obligatorio</Label>
            </div>

            {editing && (
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                />
                <Label>Requisito activo</Label>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="w-full sm:w-auto">
              {editing ? 'Actualizar' : 'Crear Requisito'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Módulo</DialogTitle>
            <DialogDescription>
              Agrega un módulo/trámite al catálogo. Nota: crear el módulo aquí solo lo habilita para
              parametrizar requisitos documentales; para que un flujo real (Contratos, Acciones de Personal, etc.)
              lo valide, ese módulo debe estar conectado en su propio código.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                placeholder="Ej. CONTROL_DOCENTE"
                value={moduleForm.name}
                onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                placeholder="Ej. Control Docente"
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsModuleDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleCreateModule} disabled={isCreatingModule} className="w-full sm:w-auto">
              {isCreatingModule ? 'Creando...' : 'Crear Módulo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar el requisito de "{toDelete?.documentTypeName}"? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="w-full sm:w-auto">
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
