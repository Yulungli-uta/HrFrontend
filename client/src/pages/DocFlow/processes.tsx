import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FolderTree,
  ChevronRight,
  ChevronDown,
  FileText,
  Plus,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";

import type {
  ProcessHierarchy,
  DocumentRule,
  InsertProcess,
  InsertDocumentRule,
} from "@/types/docflow/docflow.types";
import {
  insertProcessSchema,
  insertDocumentRuleSchema,
} from "@/types/docflow/docflow.types";
import type { IDocflowService } from "@/services/docflow/docflow-service.interface";
import { useDocflowService } from "@/services/docflow/docflow-service-context";
import { DirectorySelect } from "@/components/docflow/directory-select";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

const NO_PARENT_VALUE = "__none__";

function ProcessDialog({
  open,
  onOpenChange,
  service,
  editingProcess,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: IDocflowService;
  editingProcess: ProcessHierarchy | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>(NO_PARENT_VALUE);
  const [isActive, setIsActive] = useState(true);
  const [departmentId, setDepartmentId] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const macroProcesses = useMemo(() => {
    return service.getProcesses().filter((p) => !p.parentProcessId);
  }, [service]);

  const resetForm = useCallback(() => {
    if (editingProcess) {
      setName(editingProcess.processName);
      setDescription(editingProcess.description || "");
      setParentId(
        editingProcess.parentProcessId
          ? String(editingProcess.parentProcessId)
          : NO_PARENT_VALUE
      );
      setIsActive(editingProcess.isActive ?? true);
      setDepartmentId(
        editingProcess.responsibleDepartmentId
          ? String(editingProcess.responsibleDepartmentId)
          : ""
      );
    } else {
      setName("");
      setDescription("");
      setParentId(NO_PARENT_VALUE);
      setIsActive(true);
      setDepartmentId("");
    }
    setErrors({});
  }, [editingProcess]);

  // ✅ FIX: cuando el modal se abre por prop (setOpen(true)), precargar valores aquí.
  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
  };

  const handleSave = async () => {
    const data: InsertProcess = {
      processName: name.trim(),
      parentProcessId: parentId === NO_PARENT_VALUE ? null : Number(parentId),
      description: description.trim() || undefined,
      isActive,
      responsibleDepartmentId: departmentId ? Number(departmentId) : undefined,
    };

    const result = insertProcessSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      if (editingProcess) {
        await service.updateProcess(editingProcess.processId, data);
        toast({
          title: "Proceso actualizado",
          description: `"${data.processName}" se actualizo correctamente`,
        });
      } else {
        await service.createProcess(data);
        toast({
          title: "Proceso creado",
          description: `"${data.processName}" se creo correctamente`,
        });
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo guardar el proceso",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="text-process-dialog-title">
            {editingProcess ? "Editar Proceso" : "Nuevo Proceso"}
          </DialogTitle>
          <DialogDescription>
            {editingProcess
              ? "Modifica los datos del proceso"
              : "Completa los datos para crear un nuevo proceso"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="process-name">Nombre *</Label>
            <Input
              id="process-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Contabilidad, Facturacion..."
              data-testid="input-process-name"
            />
            {errors.processName && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.processName}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="process-description">Descripcion</Label>
            <Textarea
              id="process-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripcion del proceso..."
              rows={2}
              data-testid="input-process-description"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Proceso Padre</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger data-testid="select-process-parent">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PARENT_VALUE}>
                  Ninguno (Macroproceso)
                </SelectItem>
                {macroProcesses
                  .filter(
                    (p) =>
                      !editingProcess || p.processId !== editingProcess.processId
                  )
                  .map((p) => (
                    <SelectItem key={p.processId} value={String(p.processId)}>
                      {p.processName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Departamento Responsable</Label>
            <DirectorySelect
              directoryType="areas"
              value={departmentId}
              onValueChange={setDepartmentId}
              placeholder="Selecciona un departamento"
              data-testid="select-process-department"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="process-active">Activo</Label>
            <Switch
              id="process-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              data-testid="switch-process-active"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-process"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            data-testid="button-save-process"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {editingProcess ? "Guardar Cambios" : "Crear Proceso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RuleDialog({
  open,
  onOpenChange,
  service,
  processId,
  editingRule,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: IDocflowService;
  processId: number;
  editingRule: DocumentRule | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [docTypeName, setDocTypeName] = useState("");
  const [isMandatory, setIsMandatory] = useState(true);
  const [minFiles, setMinFiles] = useState(1);
  const [maxFiles, setMaxFiles] = useState(5);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    if (editingRule) {
      setDocTypeName(editingRule.docTypeName);
      setIsMandatory(editingRule.isMandatory);
      setMinFiles(editingRule.minFiles);
      setMaxFiles(editingRule.maxFiles);
    } else {
      setDocTypeName("");
      setIsMandatory(true);
      setMinFiles(1);
      setMaxFiles(5);
    }
    setErrors({});
  }, [editingRule]);

  // ✅ FIX: precargar valores al abrir (cuando open viene por prop)
  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
  };

  const handleSave = async () => {
    const data: InsertDocumentRule = {
      processId,
      docTypeName: docTypeName.trim(),
      isMandatory,
      minFiles: isMandatory ? Math.max(1, minFiles || 0) : minFiles || 0,
      maxFiles: Math.max(1, maxFiles || 1),
    };

    const result = insertDocumentRuleSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    if (data.minFiles > data.maxFiles) {
      setErrors({ minFiles: "Minimo no puede ser mayor que maximo" });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      if (editingRule) {
        await service.updateRule(editingRule.ruleId, data);
        toast({
          title: "Regla actualizada",
          description: `"${data.docTypeName}" se actualizo correctamente`,
        });
      } else {
        await service.createRule(data);
        toast({
          title: "Regla creada",
          description: `"${data.docTypeName}" se agrego correctamente`,
        });
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo guardar la regla",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="text-rule-dialog-title">
            {editingRule ? "Editar Regla Documental" : "Nueva Regla Documental"}
          </DialogTitle>
          <DialogDescription>
            {editingRule
              ? "Modifica la configuracion de la regla"
              : "Define un tipo de documento requerido para este proceso"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rule-doctype">Tipo de Documento *</Label>
            <DirectorySelect
              directoryType="document_type"
              value={docTypeName}
              onValueChange={setDocTypeName}
              placeholder="Selecciona un tipo de documento"
              data-testid="select-rule-doctype"
            />
            {errors.docTypeName && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.docTypeName}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="rule-mandatory">Obligatorio</Label>
            <Switch
              id="rule-mandatory"
              checked={isMandatory}
              onCheckedChange={setIsMandatory}
              data-testid="switch-rule-mandatory"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rule-min">Archivos Minimos</Label>
              <Input
                id="rule-min"
                type="number"
                min={0}
                value={minFiles}
                onChange={(e) => setMinFiles(Number(e.target.value))}
                data-testid="input-rule-min"
              />
              {errors.minFiles && (
                <p className="text-xs text-destructive">{errors.minFiles}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rule-max">Archivos Maximos</Label>
              <Input
                id="rule-max"
                type="number"
                min={1}
                value={maxFiles}
                onChange={(e) => setMaxFiles(Number(e.target.value))}
                data-testid="input-rule-max"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-rule"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            data-testid="button-save-rule"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {editingRule ? "Guardar Cambios" : "Crear Regla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RulesSection({
  processId,
  service,
  onRefresh,
}: {
  processId: number;
  service: IDocflowService;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const rules = service.getRulesByProcess(processId);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DocumentRule | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DocumentRule | null>(null);
  const isMobile = useIsMobile();

  const handleEdit = (rule: DocumentRule) => {
    setEditingRule(rule);
    setRuleDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingRule(null);
    setRuleDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await service.deleteRule(deleteConfirm.ruleId, processId);
      toast({
        title: "Regla eliminada",
        description: `"${deleteConfirm.docTypeName}" fue eliminada`,
      });
      onRefresh();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo eliminar la regla",
        variant: "destructive",
      });
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="pl-4 md:pl-8 py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Reglas Documentales
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleAddNew}
              data-testid={`button-add-rule-${processId}`}
            >
              <Plus className="h-3 w-3 mr-1" />
              Agregar
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Agregar regla documental</TooltipContent>
        </Tooltip>
      </div>

      {rules.length === 0 ? (
        <div
          className="text-xs text-muted-foreground py-3 text-center border rounded-md bg-muted/30"
          data-testid={`text-no-rules-${processId}`}
        >
          Sin reglas configuradas. Agrega una regla para definir los documentos
          requeridos.
        </div>
      ) : isMobile ? (
        <div className="flex flex-col gap-2">
          {rules.map((rule) => (
            <div
              key={rule.ruleId}
              className="border rounded-md p-3 bg-card"
              data-testid={`card-rule-${rule.ruleId}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {rule.docTypeName}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {rule.isMandatory ? (
                      <Badge variant="default" className="text-[10px] h-5">
                        Obligatorio
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5">
                        Opcional
                      </Badge>
                    )}
                    <span>
                      {rule.minFiles}-{rule.maxFiles} archivos
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(rule)}
                        data-testid={`button-edit-rule-${rule.ruleId}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Editar regla</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(rule)}
                        data-testid={`button-delete-rule-${rule.ruleId}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Eliminar regla</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Tipo de Documento</TableHead>
                <TableHead className="text-xs text-center w-24">
                  Obligatorio
                </TableHead>
                <TableHead className="text-xs text-center w-16">Min</TableHead>
                <TableHead className="text-xs text-center w-16">Max</TableHead>
                <TableHead className="text-xs text-center w-20">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow
                  key={rule.ruleId}
                  data-testid={`row-rule-${rule.ruleId}`}
                >
                  <TableCell className="text-sm font-medium">
                    {rule.docTypeName}
                  </TableCell>
                  <TableCell className="text-center">
                    {rule.isMandatory ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {rule.minFiles}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {rule.maxFiles}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(rule)}
                            data-testid={`button-edit-rule-${rule.ruleId}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Editar regla</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(rule)}
                            data-testid={`button-delete-rule-${rule.ruleId}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Eliminar regla</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <RuleDialog
        open={ruleDialogOpen}
        onOpenChange={setRuleDialogOpen}
        service={service}
        processId={processId}
        editingRule={editingRule}
        onSaved={onRefresh}
      />

      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(v) => !v && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Regla Documental</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estas seguro de eliminar la regla "{deleteConfirm?.docTypeName}"?
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-rule">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-rule"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProcessNode({
  process,
  level = 0,
  service,
  onEditProcess,
  onRefresh,
}: {
  process: ProcessHierarchy;
  level?: number;
  service: IDocflowService;
  onEditProcess: (p: ProcessHierarchy) => void;
  onRefresh: () => void;
}) {
  const [isOpen, setIsOpen] = useState(level === 0);
  const [showRules, setShowRules] = useState(false);
  const rules = service.getRulesByProcess(process.processId);
  const hasChildren = process.children && process.children.length > 0;
  const isInactive = process.isActive === false;

  return (
    <div data-testid={`process-node-${process.processId}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={`flex items-center gap-2 p-3 rounded-md hover-elevate group ${
            isInactive ? "opacity-50" : ""
          }`}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`button-toggle-process-${process.processId}`}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {isOpen ? "Contraer" : "Expandir"}
                </TooltipContent>
              </Tooltip>
            </CollapsibleTrigger>
          ) : (
            <div className="h-9 w-9 shrink-0" />
          )}

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <FolderTree className="h-4 w-4 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-sm font-medium"
                data-testid={`text-process-name-${process.processId}`}
              >
                {process.processName}
              </span>
              {level === 0 && (
                <Badge variant="secondary" className="text-xs">
                  Macroproceso
                </Badge>
              )}
              {isInactive && (
                <Badge
                  variant="outline"
                  className="text-xs text-muted-foreground"
                >
                  Inactivo
                </Badge>
              )}
              {rules.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  {rules.length} regla{rules.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            {process.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {process.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEditProcess(process)}
                  data-testid={`button-edit-process-${process.processId}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Editar proceso</TooltipContent>
            </Tooltip>

            {(!hasChildren || level > 0) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowRules(!showRules)}
                    data-testid={`button-toggle-rules-${process.processId}`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {showRules ? "Ocultar reglas" : "Ver/Gestionar reglas"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {showRules && (
          <RulesSection
            processId={process.processId}
            service={service}
            onRefresh={onRefresh}
          />
        )}

        {hasChildren && (
          <CollapsibleContent>
            {process.children!.map((child) => (
              <ProcessNode
                key={child.processId}
                process={child}
                level={level + 1}
                service={service}
                onEditProcess={onEditProcess}
                onRefresh={onRefresh}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

export default function Processes() {
  const service = useDocflowService();
  const [refreshKey, setRefreshKey] = useState(0);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [editingProcess, setEditingProcess] =
    useState<ProcessHierarchy | null>(null);

  const processes = useMemo(
    () => service.getProcesses(),
    [service, refreshKey]
  );

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleAddProcess = () => {
    setEditingProcess(null);
    setProcessDialogOpen(true);
  };

  const handleEditProcess = (p: ProcessHierarchy) => {
    setEditingProcess(p);
    setProcessDialogOpen(true);
  };

  const totalProcesses = useMemo(() => {
    let count = 0;
    const walk = (procs: ProcessHierarchy[]) => {
      for (const p of procs) {
        count++;
        if (p.children) walk(p.children);
      }
    };
    walk(processes);
    return count;
  }, [processes]);

  return (
    <div
      className="flex flex-col gap-6 p-4 md:p-6"
      data-testid="page-processes"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            data-testid="text-processes-title"
          >
            Gestion de Procesos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra procesos, subprocesos y sus reglas documentales
          </p>
        </div>
        <Button onClick={handleAddProcess} data-testid="button-add-process">
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Nuevo Proceso</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <FolderTree className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p
                className="text-2xl font-bold"
                data-testid="text-total-processes"
              >
                {totalProcesses}
              </p>
              <p className="text-xs text-muted-foreground">Procesos Totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/10">
              <FolderTree className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-macro-count">
                {processes.length}
              </p>
              <p className="text-xs text-muted-foreground">Macroprocesos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-500/10">
              <FileText className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-sub-count">
                {totalProcesses - processes.length}
              </p>
              <p className="text-xs text-muted-foreground">Subprocesos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-primary" />
            Arbol de Procesos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {processes.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-muted-foreground"
              data-testid="text-no-processes"
            >
              <FolderTree className="h-10 w-10 mb-3" />
              <p className="text-sm font-medium">No hay procesos configurados</p>
              <p className="text-xs mt-1">Crea tu primer proceso para comenzar</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {processes.map((process) => (
                <ProcessNode
                  key={process.processId}
                  process={process}
                  service={service}
                  onEditProcess={handleEditProcess}
                  onRefresh={handleRefresh}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ProcessDialog
        open={processDialogOpen}
        onOpenChange={setProcessDialogOpen}
        service={service}
        editingProcess={editingProcess}
        onSaved={handleRefresh}
      />
    </div>
  );
}