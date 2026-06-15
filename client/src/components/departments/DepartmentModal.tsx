import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RefreshCw, AlertCircle, CheckCircle2, Building2 } from "lucide-react";
import type { Department, ReferenceType, DepartmentFormData } from "@/types/department";
import type { VwDepartmentWithType } from "@/lib/api";
import { DepartmentParentSelect } from "./DepartmentParentSelect";

interface DepartmentModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  department?: Department | null;
  loading: boolean;
  formData: DepartmentFormData;
  refTypes: ReferenceType[];
  refScopeTypes: ReferenceType[];
  onOpenChange: (open: boolean) => void;
  onFormDataChange: (data: DepartmentFormData) => void;
  onSave: () => Promise<void>;
  error?: string;
}

export const DepartmentModal = ({
  open,
  mode,
  department,
  loading,
  formData,
  refTypes,
  refScopeTypes,
  onOpenChange,
  onFormDataChange,
  onSave,
  error
}: DepartmentModalProps) => {
  const [localError, setLocalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = mode === 'create' ? 'Agregar departamento' : 'Editar departamento';
  const description = mode === 'create'
    ? 'Complete los datos del nuevo departamento'
    : 'Modifica y guarda los cambios';

  useEffect(() => {
    if (!open) {
      setLocalError("");
      setIsSubmitting(false);
    }
  }, [open]);

  const handleParentChange = (id: number | null, dept: VwDepartmentWithType | null) => {
    const parentIdStr = id ? String(id) : "";
    const updatedFormData = { ...formData, parentId: parentIdStr };

    if (dept?.departmentTypeID) {
      updatedFormData.type = String(dept.departmentTypeID);
    }

    onFormDataChange(updatedFormData);
  };

  const updateField = (field: keyof DepartmentFormData, value: string | boolean) => {
    onFormDataChange({ ...formData, [field]: value });
    if (field === 'name' && localError) setLocalError("");
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setLocalError("El nombre del departamento es requerido");
      return;
    }
    if (formData.name.trim().length < 2) {
      setLocalError("El nombre debe tener al menos 2 caracteres");
      return;
    }
    setLocalError("");
    setIsSubmitting(true);
    try {
      await onSave();
    } catch {
      setLocalError("Error al guardar los cambios");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!loading && !isSubmitting) onOpenChange(false);
  };

  const isConcurrencyError = error?.includes("modificado por otro usuario") ||
    error?.includes("concurrencia") ||
    error?.includes("409");

  const isValidationError = error?.includes("400") ||
    error?.includes("validación") ||
    localError !== "";

  const isValid = formData.name.trim().length >= 2;

  const parentIdNumber = formData.parentId ? Number(formData.parentId) : null;
  const scopeIdNumber = formData.scope ? Number(formData.scope) : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nombre */}
          <div className="sm:col-span-2">
            <Label htmlFor="name" className="flex items-center gap-1 mb-2">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ingrese el nombre del departamento"
              className={`w-full ${!formData.name && localError ? 'border-destructive/40' : ''}`}
              disabled={loading || isSubmitting}
            />
            {!formData.name && (
              <p className="text-xs text-muted-foreground mt-1">
                Ej: Departamento de Ingeniería de Sistemas
              </p>
            )}
          </div>

          {/* Código */}
          <div>
            <Label htmlFor="code" className="mb-2 block">Código</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => updateField('code', e.target.value)}
              placeholder="Código único"
              disabled={loading || isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">Ej: DEP-SIS</p>
          </div>

          {/* Nombre Corto */}
          <div>
            <Label htmlFor="shortName" className="mb-2 block">Alias / Nombre corto</Label>
            <Input
              id="shortName"
              value={formData.shortName}
              onChange={(e) => updateField('shortName', e.target.value)}
              placeholder="Nombre abreviado"
              disabled={loading || isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">Ej: Sistemas</p>
          </div>

          {/* Tipo */}
          <div>
            <Label htmlFor="type" className="mb-2 block">Tipo</Label>
            <Select
              value={formData.type || "none"}
              onValueChange={(v) => updateField('type', v === "none" ? "" : v)}
              disabled={loading || isSubmitting}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder={refTypes.length === 0 ? "Cargando tipos..." : "Seleccionar tipo"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(sin tipo)</SelectItem>
                {refTypes.map(t => (
                  <SelectItem key={t.typeId} value={String(t.typeId)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Categoría del departamento</p>
          </div>

          {/* Ámbito */}
          <div>
            <Label htmlFor="scope" className="mb-2 block">Ámbito</Label>
            <Select
              value={formData.scope || "none"}
              onValueChange={(v) => updateField('scope', v === "none" ? "" : v)}
              disabled={loading || isSubmitting}
            >
              <SelectTrigger id="scope" className="w-full">
                <SelectValue placeholder={refScopeTypes.length === 0 ? "Cargando ámbitos..." : "Seleccionar ámbito"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(sin ámbito)</SelectItem>
                {refScopeTypes.map(t => (
                  <SelectItem key={t.typeId} value={String(t.typeId)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Ámbito organizacional</p>
          </div>

          {/* Departamento Padre */}
          <div className="sm:col-span-2">
            <Label className="mb-2 block">Departamento Padre</Label>
            <DepartmentParentSelect
              value={parentIdNumber}
              onChange={handleParentChange}
              excludeDepartmentId={mode === 'edit' && department ? department.departmentId : undefined}
              disabled={loading || isSubmitting}
              placeholder="(sin padre — departamento raíz)"
              departmentScopeId={scopeIdNumber}
            />
            <p className="text-xs text-muted-foreground mt-1">Jerarquía organizacional</p>
          </div>

          {/* Estado Activo — Switch responsive */}
          <div className="sm:col-span-2 pt-4 pb-2 border-t">
            <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-4 py-3">
              <div>
                <Label htmlFor="active" className="text-sm font-medium cursor-pointer">
                  Departamento activo
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formData.isActive
                    ? "El departamento está habilitado y visible en el sistema"
                    : "El departamento está deshabilitado"}
                </p>
              </div>
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) => updateField('isActive', checked)}
                disabled={loading || isSubmitting}
                aria-label="Activar / desactivar departamento"
              />
            </div>
          </div>
        </div>

        {/* Mensajes de Error */}
        {(localError || error) && (
          <div className={`p-4 rounded-lg border ${
            isConcurrencyError
              ? "bg-primary/10 border-primary/30"
              : isValidationError
              ? "bg-amber-50 border-warning/30"
              : "bg-destructive/10 border-destructive/30"
          }`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`h-5 w-5 mt-0.5 ${
                isConcurrencyError ? "text-primary" :
                isValidationError ? "text-warning" :
                "text-destructive"
              }`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  isConcurrencyError ? "text-primary" :
                  isValidationError ? "text-amber-800" :
                  "text-destructive"
                }`}>
                  {isConcurrencyError ? "Conflicto de simultaneidad" :
                   isValidationError ? "Error de validación" :
                   "Error"}
                </p>
                <p className={`text-sm mt-1 ${
                  isConcurrencyError ? "text-primary" :
                  isValidationError ? "text-warning" :
                  "text-destructive"
                }`}>
                  {localError || error}
                </p>
                {isValidationError && (
                  <p className="text-xs text-warning mt-2">
                    Verifique que todos los campos estén completos y en el formato correcto.
                  </p>
                )}
                {isConcurrencyError && (
                  <div className="mt-3 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-xs text-primary">Recargando datos automáticamente...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sección de información de edición eliminada — el ID y fechas
            no son relevantes para el usuario final que edita un departamento */}

        <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading || isSubmitting}
            className="order-2 sm:order-1 w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || isSubmitting || !isValid}
            className="order-1 sm:order-2 w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            {loading || isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {mode === 'create' ? 'Creando...' : 'Guardando...'}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {mode === 'create' ? 'Crear Departamento' : 'Guardar Cambios'}
              </>
            )}
          </Button>
        </DialogFooter>

        {(loading || isSubmitting) && (
          <div className="absolute inset-0 bg-card bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2 bg-card p-4 rounded-lg shadow-lg border">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium text-foreground">
                {mode === 'create' ? 'Creando departamento...' : 'Guardando cambios...'}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
