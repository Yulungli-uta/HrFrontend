// hooks/departments/useDepartmentMutation.ts
import { useState, useCallback } from "react";
import { DepartamentosAPI } from "@/lib/api";
import type { Department, DepartmentFormData } from "@/types/department";
import { parseApiError } from '@/lib/error-handling';

export const useDepartmentMutation = (onSuccess: () => void) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const executeMutation = useCallback(async (
    mode: 'create' | 'update',
    formData: DepartmentFormData,
    department?: Department | null
  ) => {
    setSaving(true);
    setError("");

    try {
      // Preparar payload según lo que espera el backend
      const payload: any = {
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        shortName: formData.shortName.trim() || null,
        isActive: formData.isActive,
        parentId: formData.parentId ? Number(formData.parentId) : null,
      };

      // Manejar departmentType según el formato esperado por el backend
      if (formData.type) {
        // Si el backend espera número, convertir a número
        // Si espera string, dejar como está
        payload.departmentType = Number(formData.type) || formData.type;
      } else {
        payload.departmentType = null;
      }

      // Incluir rowVersion para updates si existe
      if (mode === 'update' && department?.rowVersion) {
        payload.rowVersion = department.rowVersion;
      }

      console.log('Payload enviado:', payload); // Para debug

      let res;
      if (mode === 'create') {
        res = await DepartamentosAPI.create(payload);
      } else if (mode === 'update' && department) {
        res = await DepartamentosAPI.update(department.departmentId, payload);
      }

      if (res?.status === "error") {
        // Manejo específico de errores
        if (res.error?.status === 400) {
          setError("Error de validación: " + (res.error.detail || "Verifique los datos ingresados"));
        } else if (res.error?.status === 409) {
          setError("El departamento fue modificado por otro usuario. Los datos se actualizarán automáticamente.");
          setTimeout(() => onSuccess(), 2000);
          return false;
        } else {
          setError(res.error?.detail || res.error?.title || "Error desconocido");
        }
        return false;
      }

      onSuccess();
      return true;
    } catch (e: unknown) {
      console.error('Error en mutación:', e);
      setError(e?.message || `Error al ${mode === 'create' ? 'crear' : 'actualizar'}`);
      return false;
    } finally {
      setSaving(false);
    }
  }, [onSuccess]);

  return { executeMutation, saving, error, setError };
};