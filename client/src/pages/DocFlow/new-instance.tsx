import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  FileUp,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  Settings2,
} from "lucide-react";
import { useDocflowService } from "@/services/docflow/docflow-service-context";
import { DirectorySelect } from "@/components/docflow/directory-select";
import type { ProcessHierarchy, DynamicFieldSchema } from "@/types/docflow/docflow.types";

interface FormErrors {
  instanceName?: string;
  process?: string;
  metaFields?: string[];
  schemaFields?: Record<string, string>;
}

function getFirstSubprocess(macro: ProcessHierarchy): ProcessHierarchy | null {
  if (macro.children && macro.children.length > 0) {
    return macro.children[0];
  }
  return null;
}

function getFieldIcon(type: string) {
  switch (type) {
    case "number": return Hash;
    case "date": return Calendar;
    case "boolean": return ToggleLeft;
    default: return Type;
  }
}

export default function NewInstance() {
  const service = useDocflowService();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedMacroProcess, setSelectedMacroProcess] = useState<string>("");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [metaFields, setMetaFields] = useState<{ key: string; value: string }[]>([]);
  const [schemaValues, setSchemaValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instanceName, setInstanceName] = useState<string>("");

  const allProcesses = useMemo(() => service.getProcesses(), [service]);
  const macroProcesses = useMemo(
    () => allProcesses.filter((p) => p.parentProcessId === null),
    [allProcesses]
  );

  const selectedMacro = useMemo(
    () => selectedMacroProcess ? macroProcesses.find((p) => p.processId === parseInt(selectedMacroProcess)) : null,
    [selectedMacroProcess, macroProcesses]
  );

  const firstSubprocess = useMemo(
    () => selectedMacro ? getFirstSubprocess(selectedMacro) : null,
    [selectedMacro]
  );

  const targetProcessId = firstSubprocess ? firstSubprocess.processId : (selectedMacro ? selectedMacro.processId : null);
  const rules = targetProcessId ? service.getRulesByProcess(targetProcessId) : [];

  const [dynamicFieldSchema, setDynamicFieldSchema] = useState<DynamicFieldSchema[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);

  useEffect(() => {
    if (!targetProcessId) {
      setDynamicFieldSchema([]);
      return;
    }
    let cancelled = false;
    setIsLoadingSchema(true);
    service.loadDynamicFields(targetProcessId).then((result) => {
      if (cancelled) return;
      setDynamicFieldSchema(result.dynamicFieldMetadata);
      setIsLoadingSchema(false);
    });
    return () => { cancelled = true; };
  }, [targetProcessId, service]);

  const hasSchema = dynamicFieldSchema.length > 0;

  const handleProcessChange = (value: string) => {
    setSelectedMacroProcess(value);
    setSchemaValues({});
    setMetaFields([]);
    setInstanceName("");
    if (errors.process) setErrors((prev) => ({ ...prev, process: undefined }));
  };

  const initSchemaDefaults = useMemo(() => {
    const defaults: Record<string, any> = {};
    for (const field of dynamicFieldSchema) {
      if (field.value !== undefined && field.value !== "") {
        defaults[field.name] = field.value;
      }
    }
    return defaults;
  }, [dynamicFieldSchema]);

  const effectiveSchemaValues = useMemo(() => {
    return { ...initSchemaDefaults, ...schemaValues };
  }, [initSchemaDefaults, schemaValues]);

  const updateSchemaValue = (name: string, value: any) => {
    setSchemaValues(prev => ({ ...prev, [name]: value }));
    if (errors.schemaFields?.[name]) {
      setErrors(prev => {
        const updated = { ...prev.schemaFields };
        delete updated[name];
        return { ...prev, schemaFields: updated };
      });
    }
  };

  const addMetaField = () => {
    setMetaFields([...metaFields, { key: "", value: "" }]);
  };

  const removeMetaField = (index: number) => {
    setMetaFields(metaFields.filter((_, i) => i !== index));
  };

  const updateMetaField = (index: number, field: "key" | "value", val: string) => {
    const updated = [...metaFields];
    updated[index][field] = val;
    setMetaFields(updated);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!instanceName.trim()) {
      newErrors.instanceName = "El nombre del expediente es obligatorio";
      isValid = false;
    }
    if (!targetProcessId) {
      newErrors.process = "Debes seleccionar un macro proceso para continuar";
      isValid = false;
    }

    if (hasSchema) {
      const schemaFieldErrors: Record<string, string> = {};
      for (const field of dynamicFieldSchema) {
        if (field.required) {
          const val = effectiveSchemaValues[field.name];
          if (val === undefined || val === "" || val === null) {
            schemaFieldErrors[field.name] = "Este campo es obligatorio";
            isValid = false;
          }
        }
      }
      if (Object.keys(schemaFieldErrors).length > 0) {
        newErrors.schemaFields = schemaFieldErrors;
      }
    }

    const metaErrors: string[] = [];
    const usedKeys = new Set<string>();
    metaFields.forEach((f, i) => {
      if (f.key.trim() && usedKeys.has(f.key.trim().toLowerCase())) {
        metaErrors[i] = "Este campo ya fue agregado";
        isValid = false;
      }
      if (f.key.trim()) {
        usedKeys.add(f.key.trim().toLowerCase());
      }
      if (f.key.trim() && !f.value.trim()) {
        metaErrors[i] = "El valor no puede estar vacio";
        isValid = false;
      }
    });
    if (metaErrors.length > 0) {
      newErrors.metaFields = metaErrors;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Formulario incompleto",
        description: "Revisa los campos marcados en rojo",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const metadata: Record<string, any> = {};

      if (hasSchema) {
        for (const field of dynamicFieldSchema) {
          const val = effectiveSchemaValues[field.name];
          if (val !== undefined && val !== "") {
            if (field.type === "number") {
              metadata[field.name] = Number(val);
            } else {
              metadata[field.name] = val;
            }
          }
        }
      }

      metaFields.forEach((f) => {
        if (f.key.trim()) metadata[f.key.trim()] = f.value;
      });

      if (selectedArea) metadata["area"] = selectedArea;
      if (selectedPriority) metadata["prioridad"] = selectedPriority;

      await Promise.resolve(
        service.createInstance({
          processId: targetProcessId!,
          instanceName: instanceName.trim(),
          dynamicMetadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        })
      );

      toast({
        title: "Expediente creado",
        description: `El expediente "${instanceName}" se ha creado exitosamente`,
      });

      setLocation("/DocFlow/expedientes");
    } catch {
      toast({
        title: "Error al crear",
        description: "No se pudo crear el expediente. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" data-testid="page-new-instance">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/DocFlow/expedientes">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-back-new">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Volver a expedientes</TooltipContent>
          </Tooltip>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-new-instance-title">
            Nuevo Expediente
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Crear un nuevo expediente en el flujo documental
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informacion del Expediente</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Campo de Macro Proceso */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="process">Macro Proceso *</Label>
              <select
                id="process"
                value={selectedMacroProcess}
                onChange={(e) => handleProcessChange(e.target.value)}
                className={`flex h-9 w-full rounded-md border px-3 py-1 text-sm bg-background transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  errors.process ? "border-destructive" : "border-input"
                }`}
                data-testid="select-process"
              >
                <option value="">Selecciona un macro proceso</option>
                {macroProcesses.map((p) => (
                  <option key={p.processId} value={String(p.processId)}>
                    {p.processName}
                  </option>
                ))}
              </select>
              {errors.process && (
                <p className="text-xs text-destructive flex items-center gap-1" data-testid="error-process">
                  <AlertCircle className="h-3 w-3" />
                  {errors.process}
                </p>
              )}
              {firstSubprocess && (
                <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-auto-subprocess">
                  <ArrowLeft className="h-3 w-3 rotate-180" />
                  Iniciara automaticamente en: <span className="font-medium text-foreground">{firstSubprocess.processName}</span>
                </p>
              )}
            </div>

            {/* NUEVO: Campo de nombre del expediente */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="instanceName">Nombre del Expediente *</Label>
              <Input
                id="instanceName"
                type="text"
                value={instanceName}
                onChange={(e) => {
                  setInstanceName(e.target.value);
                  if (errors.instanceName) {
                    setErrors((prev) => ({ ...prev, instanceName: undefined }));
                  }
                }}
                placeholder="Ej: Contratación de Juan Pérez"
                className={errors.instanceName ? "border-destructive" : ""}
                data-testid="input-instance-name"
              />
              {errors.instanceName && (
                <p className="text-xs text-destructive flex items-center gap-1" data-testid="error-instance-name">
                  <AlertCircle className="h-3 w-3" />
                  {errors.instanceName}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Area <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
                <DirectorySelect
                  directoryType="areas"
                  value={selectedArea}
                  onValueChange={setSelectedArea}
                  placeholder="Selecciona un area"
                  data-testid="select-area"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Prioridad <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
                <DirectorySelect
                  directoryType="priorities"
                  value={selectedPriority}
                  onValueChange={setSelectedPriority}
                  placeholder="Selecciona prioridad"
                  data-testid="select-priority"
                />
              </div>
            </div>

            {rules.length > 0 && (
              <div className="flex flex-col gap-2 p-3 rounded-md bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground">
                  Documentos requeridos para este proceso:
                </span>
                <div className="flex flex-wrap gap-2">
                  {rules.map((rule) => (
                    <div
                      key={rule.ruleId}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-background border border-border"
                    >
                      <FileUp className="h-3 w-3 text-primary" />
                      <span>{rule.docTypeName}</span>
                      {rule.isMandatory && (
                        <span className="text-destructive">*</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {hasSchema && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                Datos del Expediente
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-xs text-muted-foreground">
                Completa los campos definidos para este tipo de proceso
              </p>
              {dynamicFieldSchema.map((field) => {
                const Icon = getFieldIcon(field.type);
                const error = errors.schemaFields?.[field.name];
                const value = effectiveSchemaValues[field.name];

                return (
                  <div key={field.name} className="flex flex-col gap-1.5">
                    <Label className="flex items-center gap-2 text-sm">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {field.name.replace(/([A-Z])/g, " $1").trim()}
                      {field.required && <span className="text-destructive">*</span>}
                    </Label>
                    {field.type === "boolean" ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={value === true}
                          onCheckedChange={(v) => updateSchemaValue(field.name, v)}
                          data-testid={`switch-schema-${field.name}`}
                        />
                        <span className="text-sm text-muted-foreground">
                          {value === true ? "Si" : "No"}
                        </span>
                      </div>
                    ) : field.type === "date" ? (
                      <Input
                        type="date"
                        value={value || ""}
                        onChange={(e) => updateSchemaValue(field.name, e.target.value)}
                        className={error ? "border-destructive" : ""}
                        data-testid={`input-schema-${field.name}`}
                      />
                    ) : field.type === "number" ? (
                      <Input
                        type="number"
                        value={value ?? ""}
                        onChange={(e) => updateSchemaValue(field.name, e.target.value)}
                        placeholder={`Ingresa ${field.name}`}
                        className={error ? "border-destructive" : ""}
                        data-testid={`input-schema-${field.name}`}
                      />
                    ) : (
                      <Input
                        value={value ?? ""}
                        onChange={(e) => updateSchemaValue(field.name, e.target.value)}
                        placeholder={`Ingresa ${field.name}`}
                        className={error ? "border-destructive" : ""}
                        data-testid={`input-schema-${field.name}`}
                      />
                    )}
                    {error && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">
              {hasSchema ? "Campos Adicionales" : "Metadatos Dinamicos"}
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addMetaField} data-testid="button-add-meta-field">
              <Plus className="h-4 w-4 mr-1" />
              Agregar Campo
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              {hasSchema
                ? "Agrega campos personalizados adicionales que no esten en el esquema"
                : "Agrega campos personalizados para este expediente (ej: Numero de Factura, Proveedor, Monto)"}
            </p>
            {metaFields.length === 0 && !hasSchema && (
              <p className="text-xs text-muted-foreground italic py-2">
                No hay campos adicionales. Haz clic en "Agregar Campo" para anadir metadatos.
              </p>
            )}
            {metaFields.map((field, index) => (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Nombre del campo"
                    value={field.key}
                    onChange={(e) => {
                      updateMetaField(index, "key", e.target.value);
                      if (errors.metaFields?.[index]) {
                        const updated = [...(errors.metaFields || [])];
                        updated[index] = "";
                        setErrors((prev) => ({ ...prev, metaFields: updated }));
                      }
                    }}
                    className={`flex-1 ${errors.metaFields?.[index] ? "border-destructive" : ""}`}
                    data-testid={`input-meta-key-${index}`}
                  />
                  <Input
                    placeholder="Valor"
                    value={field.value}
                    onChange={(e) => {
                      updateMetaField(index, "value", e.target.value);
                      if (errors.metaFields?.[index]) {
                        const updated = [...(errors.metaFields || [])];
                        updated[index] = "";
                        setErrors((prev) => ({ ...prev, metaFields: updated }));
                      }
                    }}
                    className={`flex-1 ${errors.metaFields?.[index] ? "border-destructive" : ""}`}
                    data-testid={`input-meta-value-${index}`}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMetaField(index)}
                        data-testid={`button-remove-meta-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Eliminar campo</TooltipContent>
                  </Tooltip>
                </div>
                {errors.metaFields?.[index] && (
                  <p className="text-xs text-destructive flex items-center gap-1 ml-1" data-testid={`error-meta-${index}`}>
                    <AlertCircle className="h-3 w-3" />
                    {errors.metaFields[index]}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3 flex-wrap">
          <Button
            type="button"
            onClick={handleSubmit}
            className="flex-1 sm:flex-none"
            disabled={isSubmitting}
            data-testid="button-save-instance"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Creando..." : "Crear Expediente"}
          </Button>
          <Link href="/DocFlow/expedientes">
            <Button type="button" variant="outline" data-testid="button-cancel-new">
              Cancelar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}