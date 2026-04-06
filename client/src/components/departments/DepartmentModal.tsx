// src/components/departments/DepartmentModal.tsx
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RefreshCw, AlertCircle, CheckCircle2, Building2 } from "lucide-react";
import type { Department, ReferenceType, DepartmentFormData } from "@/types/department";

interface DepartmentModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  department?: Department | null;
  loading: boolean;
  formData: DepartmentFormData;
  refTypes: ReferenceType[];
  departments: Department[];
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
  departments,
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

  // Resetear estados cuando se abre/cierra el modal
  useEffect(() => {
    if (!open) {
      setLocalError("");
      setIsSubmitting(false);
    }
  }, [open]);

  const handleParentChange = (value: string) => {
    const newParentId = value === "none" ? "" : value;
    const updatedFormData = { ...formData, parentId: newParentId };
    
    // Heredar tipo del padre seleccionado
    if (newParentId) {
      const parentDept = departments.find(x => x.departmentId === Number(newParentId));
      if (parentDept?.departmentType) {
        let parentTypeId: string = "";
        
        // Convertir departmentType del padre a string para el formulario
        if (typeof parentDept.departmentType === "number") {
          parentTypeId = String(parentDept.departmentType);
        } else if (typeof parentDept.departmentType === "string") {
          // Si es string, buscar el typeId correspondiente en refTypes
          const found = refTypes.find(t => t.name === parentDept.departmentType);
          if (found) {
            parentTypeId = String(found.typeId);
          } else {
            // Si no se encuentra, usar el string directamente
            parentTypeId = parentDept.departmentType;
          }
        }
        
        if (parentTypeId) {
          updatedFormData.type = parentTypeId;
        }
      }
    }
    
    onFormDataChange(updatedFormData);
  };

  const updateField = (field: keyof DepartmentFormData, value: string | boolean) => {
    onFormDataChange({ ...formData, [field]: value });
    // Limpiar error local cuando el usuario empiece a escribir
    if (field === 'name' && localError) {
      setLocalError("");
    }
  };

  const handleSave = async () => {
    // Validación básica
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
    } catch (error) {
      console.error("Error saving department:", error);
      setLocalError("Error al guardar los cambios");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!loading && !isSubmitting) {
      onOpenChange(false);
    }
  };

  const isConcurrencyError = error?.includes("modificado por otro usuario") || 
                            error?.includes("concurrencia") ||
                            error?.includes("409");

  const isValidationError = error?.includes("400") || 
                           error?.includes("validación") ||
                           localError !== "";

  const isValid = formData.name.trim().length >= 2;

  // Preparar departamentos para el selector de padre (excluir el actual en edición y sus hijos)
  const availableParentDepartments = departments.filter(dept => {
    if (mode === 'edit' && department) {
      // Excluir el departamento actual y todos sus hijos
      const isCurrentOrChild = (dept: Department): boolean => {
        if (dept.departmentId === department.departmentId) return true;
        if (dept.children) {
          return dept.children.some(child => isCurrentOrChild(child));
        }
        return false;
      };
      return !isCurrentOrChild(dept);
    }
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Formulario */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nombre - Full width */}
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
            <p className="text-xs text-muted-foreground mt-1">
              Ej: DEP-SIS
            </p>
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
            <p className="text-xs text-muted-foreground mt-1">
              Ej: Sistemas
            </p>
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
            <p className="text-xs text-muted-foreground mt-1">
              Categoría del departamento
            </p>
          </div>

          {/* Padre */}
          <div>
            <Label htmlFor="parent" className="mb-2 block">Departamento Padre</Label>
            <Select 
              value={formData.parentId || "none"} 
              onValueChange={handleParentChange}
              disabled={loading || isSubmitting}
            >
              <SelectTrigger id="parent" className="w-full">
                <SelectValue placeholder="(sin padre)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(sin padre - departamento raíz)</SelectItem>
                {availableParentDepartments.map(dept => (
                  <SelectItem key={dept.departmentId} value={String(dept.departmentId)}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate">{dept.name}</span>
                      {dept.code && (
                        <span className="text-xs text-muted-foreground ml-1">({dept.code})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Jerarquía organizacional
            </p>
          </div>

          {/* Estado Activo */}
          <div className="flex items-center space-x-3 sm:col-span-2 pt-4 pb-2 border-t">
            <input
              id="active"
              type="checkbox"
              className="h-4 w-4 rounded border-border focus:ring-blue-500 text-primary"
              checked={formData.isActive}
              onChange={(e) => updateField('isActive', e.target.checked)}
              disabled={loading || isSubmitting}
            />
            <Label htmlFor="active" className="text-sm font-medium flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${formData.isActive ? 'bg-success' : 'bg-gray-400'}`}></div>
              Departamento Activo
            </Label>
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
                  <div className="mt-2">
                    <p className="text-xs text-warning">
                      Verifique que todos los campos estén completos y en el formato correcto.
                    </p>
                  </div>
                )}

                {isConcurrencyError && (
                  <div className="mt-3 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-xs text-primary">
                      Recargando datos automáticamente...
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Información del Departamento (solo en edición) */}
        {mode === 'edit' && department && (
          <div className="bg-background border border-border rounded-lg p-3">
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">ID:</span> {department.departmentId}
              </div>
              {department.createdAt && (
                <div>
                  <span className="font-medium">Creado:</span> {new Date(department.createdAt).toLocaleDateString()}
                </div>
              )}
              {department.updatedAt && (
                <div className="col-span-2">
                  <span className="font-medium">Última modificación:</span> {new Date(department.updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* Indicador de carga global */}
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