import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FolderTree,
  Plus,
  Trash2,
  Save,
  GripVertical,
  Settings2,
  ChevronRight,
  ChevronDown,
  FileStack,
  Layers,
  AlertCircle,
  CheckCircle2,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { useDocflowService } from "@/services/docflow/docflow-service-context";
import type { IDocflowService } from "@/services/docflow/docflow-service.interface";
import type { ProcessHierarchy, DynamicFieldSchema, DynamicFieldType } from "@/types/docflow/docflow.types";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

const FIELD_TYPE_OPTIONS: { value: DynamicFieldType; label: string; icon: typeof Type }[] = [
  { value: "string", label: "Texto", icon: Type },
  { value: "number", label: "Numero", icon: Hash },
  { value: "date", label: "Fecha", icon: Calendar },
  { value: "boolean", label: "Si/No", icon: ToggleLeft },
];

function getFieldTypeLabel(type: DynamicFieldType): string {
  return FIELD_TYPE_OPTIONS.find(o => o.value === type)?.label || type;
}

function getFieldTypeIcon(type: DynamicFieldType) {
  const opt = FIELD_TYPE_OPTIONS.find(o => o.value === type);
  return opt?.icon || Type;
}

function getDefaultValueForType(type: DynamicFieldType): any {
  switch (type) {
    case "string": return "";
    case "number": return 0;
    case "boolean": return false;
    case "date": return "";
    default: return "";
  }
}

function processMatchesSearch(process: ProcessHierarchy, term: string): boolean {
  const lower = term.toLowerCase();
  if (process.processName.toLowerCase().includes(lower)) return true;
  if (process.children?.some((c) => c.processName.toLowerCase().includes(lower))) return true;
  return false;
}

function ProcessSelector({
  processes,
  selectedId,
  onSelect,
  service,
}: {
  processes: ProcessHierarchy[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  service: IDocflowService;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const set = new Set<number>();
    for (const p of processes) {
      if (p.children && p.children.length > 0) {
        set.add(p.processId);
      }
    }
    return set;
  });

  const [searchTerm, setSearchTerm] = useState("");

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredProcesses = useMemo(() => {
    if (!searchTerm.trim()) return processes;
    return processes.filter((p) => processMatchesSearch(p, searchTerm));
  }, [processes, searchTerm]);

  const isSearching = searchTerm.trim().length > 0;

  const filteredChildren = useCallback((parent: ProcessHierarchy) => {
    const children = parent.children;
    if (!children) return [];
    if (!isSearching) return children;
    const lower = searchTerm.toLowerCase();
    if (parent.processName.toLowerCase().includes(lower)) return children;
    return children.filter((c) => c.processName.toLowerCase().includes(lower));
  }, [searchTerm, isSearching]);

  
  return (
    <div className="flex flex-col gap-2" data-testid="dynamic-fields-process-tree">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proceso..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-8 h-9 text-sm"
          data-testid="input-search-process"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid="button-clear-search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filteredProcesses.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No se encontraron procesos</p>
          <p className="text-xs mt-1">Intenta con otro termino de busqueda</p>
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        {filteredProcesses.map((process) => {
          const isExpanded = isSearching || expanded.has(process.processId);
          const hasChildren = process.children && process.children.length > 0;
          const visibleChildren = filteredChildren(process);
          const showChildren = hasChildren && isExpanded && visibleChildren.length > 0;

          return (
            <div key={process.processId}>
              <button
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  selectedId === process.processId && !hasChildren
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "hover:bg-muted/80"
                }`}
                onClick={() => {
                  if (hasChildren) {
                    toggleExpand(process.processId);
                  } else {
                    onSelect(process.processId);
                  }
                }}
                data-testid={`button-df-process-${process.processId}`}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )
                ) : (
                  <div className="w-4" />
                )}
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                  hasChildren ? "bg-primary/10" : "bg-muted"
                }`}>
                  {hasChildren ? (
                    <FolderTree className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${hasChildren ? "font-semibold" : "font-medium"}`}>
                    {process.processName}
                  </span>
                </div>
                {!hasChildren && (
                  (() => {
                    const fields = service.getDynamicFields(process.processId);
                    const count = fields.dynamicFieldMetadata.length;
                    return count > 0 ? (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {count} campo{count !== 1 ? "s" : ""}
                      </Badge>
                    ) : null;
                  })()
                )}
              </button>

              {showChildren && (
                <div className="ml-4 pl-3 border-l border-border">
                  {visibleChildren.map((child) => {
                    const childFields = service.getDynamicFields(child.processId);
                    const fieldCount = childFields.dynamicFieldMetadata.length;

                    return (
                      <button
                        key={child.processId}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                          selectedId === child.processId
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "hover:bg-muted/80"
                        }`}
                        onClick={() => onSelect(child.processId)}
                        data-testid={`button-df-process-${child.processId}`}
                      >
                        <div className="w-4" />
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                          <FileStack className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{child.processName}</span>
                        </div>
                        {fieldCount > 0 && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {fieldCount}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface EditableField extends DynamicFieldSchema {
  _key: string;
  _isNew?: boolean;
}

function FieldEditor({
  processId,
  processName,
  service,
  isMobile,
  onBack,
}: {
  processId: number;
  processName: string;
  service: IDocflowService;
  isMobile: boolean;
  onBack?: () => void;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const [fields, setFields] = useState<EditableField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    service.loadDynamicFields(processId).then((result) => {
      if (cancelled) return;
      setFields(
        result.dynamicFieldMetadata.map((f, i) => ({
          ...f,
          _key: `existing-${i}`,
        }))
      );
      setHasChanges(false);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [processId, service]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  const markChanged = useCallback(() => setHasChanges(true), []);

  const addField = () => {
    setFields(prev => [
      ...prev,
      {
        name: "",
        type: "string" as DynamicFieldType,
        required: false,
        value: undefined,
        _key: `new-${Date.now()}`,
        _isNew: true,
      },
    ]);
    markChanged();
  };

  const removeField = (key: string) => {
    setFields(prev => prev.filter(f => f._key !== key));
    setDeleteConfirm(null);
    markChanged();
  };

  const updateField = (key: string, updates: Partial<EditableField>) => {
    setFields(prev =>
      prev.map(f => {
        if (f._key !== key) return f;
        const updated = { ...f, ...updates };
        if (updates.type && updates.type !== f.type) {
          updated.value = getDefaultValueForType(updates.type);
        }
        return updated;
      })
    );
    markChanged();
  };

  const handleSave = async () => {
  const errors: string[] = [];
  const names = new Set<string>();

  // Validación 1: Verificar que todos los campos tengan nombre
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    
    if (!field.name.trim()) {
      errors.push(`Campo ${i + 1}: El nombre es obligatorio`);
      break;
    }

    // Validación 2: Verificar nombres duplicados
    const normalizedName = field.name.trim().toLowerCase();
    if (names.has(normalizedName)) {
      errors.push(`Campo ${i + 1}: El nombre "${field.name}" está duplicado`);
      break;
    }
    names.add(normalizedName);

    // Validación 3: Validar que el nombre no contenga caracteres no permitidos
    if (/[<>{}|\\^`\[\]"']/.test(field.name)) {
      errors.push(`Campo ${i + 1}: El nombre contiene caracteres no permitidos`);
      break;
    }

    // Validación 4: Validar compatibilidad de value con type
    if (field.value !== undefined && field.value !== "") {
      const validationError = validateFieldValue(field.name, field.type, field.value);
      if (validationError) {
        errors.push(validationError);
        break;
      }
    }
  }

  if (errors.length > 0) {
    toast({
      title: "Error de validación",
      description: errors[0],
      variant: "destructive",
    });
    return;
  }

  setIsSaving(true);
  try {
    const cleanFields: DynamicFieldSchema[] = fields.map(f => ({
      name: f.name.trim(),
      type: f.type,
      required: f.required,
      ...(f.value !== undefined && f.value !== "" ? { value: f.value } : {}),
    }));

    await service.saveDynamicFields(processId, cleanFields);

    setFields(cleanFields.map((f, i) => ({ ...f, _key: `saved-${i}` })));
    setHasChanges(false);

    toast({
      title: "Campos guardados",
      description: `Se guardaron ${cleanFields.length} campo(s) para "${processName}"`,
    });
  } catch (error: any) {
    // Mostrar mensaje de error específico del backend
    const errorMessage = error?.message || "No se pudieron guardar los campos dinámicos";
    toast({
      title: "Error al guardar",
      description: errorMessage,
      variant: "destructive",
    });
  } finally {
    setIsSaving(false);
  }
};

// ✅ NUEVA FUNCIÓN: Validar compatibilidad de value con type
function validateFieldValue(fieldName: string, type: DynamicFieldType, value: any): string | null {
  if (value === null || value === undefined || value === "") {
    return null; // Valores vacíos son válidos
  }

  switch (type) {
    case "string":
      // String acepta cualquier cosa
      return null;

    case "number":
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return `Campo "${fieldName}": El valor debe ser un número válido`;
      }
      return null;

    case "boolean":
      if (typeof value !== "boolean" && value !== "true" && value !== "false") {
        return `Campo "${fieldName}": El valor debe ser true o false`;
      }
      return null;

    case "date":
      const dateValue = new Date(value);
      if (isNaN(dateValue.getTime())) {
        return `Campo "${fieldName}": El valor debe ser una fecha válida (yyyy-MM-dd)`;
      }
      return null;

    default:
      return null;
  }
}

// ✅ FUNCIÓN AUXILIAR: Obtener mensaje de error para un campo
function getFieldErrorMessage(field: EditableField): string | null {
  if (!field.name.trim()) {
    return "El nombre es obligatorio";
  }

  if (/[<>{}|\\^`\[\]"']/.test(field.name)) {
    return "Caracteres no permitidos en el nombre";
  }

  if (field.value !== undefined && field.value !== "") {
    const validationError = validateFieldValue(field.name, field.type, field.value);
    if (validationError) {
      return validationError;
    }
  }

  return null;
}

  const requiredCount = fields.filter(f => f.required).length;
  const optionalCount = fields.length - requiredCount;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {isMobile && onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-to-tree-df">
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Button>
          )}
          <div>
            <h2 className="text-lg font-semibold">{processName}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Cargando esquema...</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Cargando campos dinamicos...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          {isMobile && onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-to-tree-df">
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Button>
          )}
          <div>
            <h2 className="text-lg font-semibold" data-testid="text-selected-process-df">
              {processName}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Esquema de metadatos dinamicos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addField}
            data-testid="button-add-field"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar Campo
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            data-testid="button-save-fields"
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {fields.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Settings2 className="h-3 w-3" />
            {fields.length} campo{fields.length !== 1 ? "s" : ""}
          </span>
          {requiredCount > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertCircle className="h-3 w-3" />
              {requiredCount} obligatorio{requiredCount !== 1 ? "s" : ""}
            </span>
          )}
          {optionalCount > 0 && (
            <span>
              {optionalCount} opcional{optionalCount !== 1 ? "es" : ""}
            </span>
          )}
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
              Sin guardar
            </Badge>
          )}
        </div>
      )}

      {fields.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Settings2 className="h-12 w-12 mb-3" />
            <p className="text-base font-medium">Sin campos dinamicos</p>
            <p className="text-sm mt-1 text-center max-w-sm">
              Este proceso no tiene campos de metadatos definidos.
              Agrega campos para que los expedientes capturen informacion estructurada.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={addField}
              data-testid="button-add-field-empty"
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar primer campo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {fields.map((field, index) => {
            const Icon = getFieldTypeIcon(field.type);
            const isEditing = editingField === field._key || field._isNew;

            return (
              <Card
                key={field._key}
                className={`transition-all ${
                  field._isNew ? "border-primary/40 bg-primary/5" : ""
                }`}
                data-testid={`card-field-${index}`}
              >
                <CardContent className="py-3 px-4">
                  {isEditing ? (
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">Nombre del campo</Label>
                          <Input
                            value={field.name}
                            onChange={(e) => updateField(field._key, { name: e.target.value })}
                            placeholder="ej: numeroFactura"
                            className="h-9"
                            data-testid={`input-field-name-${index}`}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">Tipo de dato</Label>
                          <Select
                            value={field.type}
                            onValueChange={(v) => updateField(field._key, { type: v as DynamicFieldType })}
                          >
                            <SelectTrigger className="h-9" data-testid={`select-field-type-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <div className="flex items-center gap-2">
                                    <opt.icon className="h-3.5 w-3.5" />
                                    {opt.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">Valor por defecto</Label>
                          {field.type === "boolean" ? (
                            <div className="flex items-center gap-2 h-9">
                              <Switch
                                checked={field.value === true}
                                onCheckedChange={(v) => updateField(field._key, { value: v })}
                                data-testid={`switch-field-default-${index}`}
                              />
                              <span className="text-sm">{field.value ? "Si" : "No"}</span>
                            </div>
                          ) : field.type === "date" ? (
                            <Input
                              type="date"
                              value={field.value || ""}
                              onChange={(e) => updateField(field._key, { value: e.target.value })}
                              className="h-9"
                              data-testid={`input-field-default-${index}`}
                            />
                          ) : field.type === "number" ? (
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(e) => updateField(field._key, { value: e.target.value ? Number(e.target.value) : undefined })}
                              placeholder="Sin valor por defecto"
                              className="h-9"
                              data-testid={`input-field-default-${index}`}
                            />
                          ) : (
                            <Input
                              value={field.value ?? ""}
                              onChange={(e) => updateField(field._key, { value: e.target.value || undefined })}
                              placeholder="Sin valor por defecto"
                              className="h-9"
                              data-testid={`input-field-default-${index}`}
                            />
                          )}
                        </div>
                        <div className="flex items-end gap-3 h-full">
                          <div className="flex items-center gap-2 h-9">
                            <Switch
                              checked={field.required}
                              onCheckedChange={(v) => updateField(field._key, { required: v })}
                              data-testid={`switch-field-required-${index}`}
                            />
                            <Label className="text-sm">Obligatorio</Label>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        {!field._isNew && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingField(null)}
                            data-testid={`button-done-editing-${index}`}
                          >
                            Listo
                          </Button>
                        )}
                        {field._isNew && field.name.trim() && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              updateField(field._key, { _isNew: false } as any);
                              setEditingField(null);
                            }}
                            data-testid={`button-confirm-new-${index}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Confirmar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(field._key)}
                          data-testid={`button-delete-field-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      <div className={`flex h-8 w-8 items-center justify-center rounded-md shrink-0 ${
                        field.required
                          ? "bg-red-100 dark:bg-red-900/30"
                          : "bg-muted"
                      }`}>
                        <Icon className={`h-4 w-4 ${
                          field.required
                            ? "text-red-600 dark:text-red-400"
                            : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{field.name}</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                          >
                            {getFieldTypeLabel(field.type)}
                          </Badge>
                          {field.required && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 shrink-0 border-red-300 text-red-700 dark:border-red-700 dark:text-red-400"
                            >
                              Obligatorio
                            </Badge>
                          )}
                        </div>
                        {field.value !== undefined && field.value !== "" && (
                          <span className="text-xs text-muted-foreground">
                            Valor por defecto: {typeof field.value === "boolean" ? (field.value ? "Si" : "No") : String(field.value)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingField(field._key)}
                              data-testid={`button-edit-field-${index}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Editar campo</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm(field._key)}
                              data-testid={`button-delete-field-${index}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Eliminar campo</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar campo</DialogTitle>
            <DialogDescription>
              Esta accion eliminara el campo del esquema. Los expedientes existentes que tengan este campo conservaran sus datos, pero no se solicitara en nuevos expedientes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} data-testid="button-cancel-delete">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && removeField(deleteConfirm)}
              data-testid="button-confirm-delete"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DynamicFields() {
  const service = useDocflowService();
  const processes = service.getProcesses();
  const isMobile = useIsMobile();
  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);

  const selectedProcess = useMemo(() => {
    if (!selectedProcessId) return null;
    return service.getProcessById(selectedProcessId);
  }, [selectedProcessId, service]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" data-testid="page-dynamic-fields">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dynamic-fields-title">
          Campos Dinamicos
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Define los campos de metadatos que se solicitaran al crear expedientes en cada proceso
        </p>
      </div>

      <div className={`grid gap-6 ${isMobile ? "grid-cols-1" : "grid-cols-[280px_1fr]"}`}>
        <Card className={isMobile && selectedProcessId ? "hidden" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              Procesos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ProcessSelector
              processes={processes}
              selectedId={selectedProcessId}
              onSelect={(id) => setSelectedProcessId(id)}
              service={service}
            />
          </CardContent>
        </Card>

        <div>
          {selectedProcess ? (
            <FieldEditor
              key={selectedProcessId}
              processId={selectedProcessId!}
              processName={selectedProcess.processName}
              service={service}
              isMobile={isMobile}
              onBack={() => setSelectedProcessId(null)}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Settings2 className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">
                  Selecciona un proceso
                </p>
                <p className="text-sm mt-1 text-center max-w-sm">
                  Elige un subproceso del arbol para definir los campos
                  de metadatos que se capturaran al crear expedientes
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
