// src/components/job-activities/JobDetailForm.tsx

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";

import type { Job, OccupationalGroup } from "@/types/Job-activities";
import { TiposReferenciaAPI, type ApiResponse } from "@/lib/api";

// ------------------ TIPOS ------------------

interface JobDetailFormProps {
  job: Job;
  groups: OccupationalGroup[];
  saving: boolean;
  onSave: (data: {
    jobID?: number;
    description: string;
    jobTypeId: number | null;
    groupId: number | null;
    isActive: boolean;
  }) => void;
  inlineMode?: boolean;
  onCancel?: () => void;
}

// Ajustado a la convención típica de C# → JSON (typeId en camelCase)
interface RefType {
  typeId: number;
  category?: string;
  code?: string;
  name: string;
  description: string;
  isActive?: boolean;
}

// Helper para manejar ApiResponse
function ensureSuccess<T>(res: ApiResponse<T>, defaultMessage: string): T {
  if (res.status === "error") {
    throw new Error(res.error.message || defaultMessage);
  }
  return res.data;
}

// ------------------ COMPONENTE ------------------

export function JobDetailForm({
  job,
  groups,
  saving,
  onSave,
  inlineMode = true,
  onCancel,
}: JobDetailFormProps) {
  const [description, setDescription] = useState(job.description ?? "");
  const [groupId, setGroupId] = useState<string>(
    job.groupId ? String(job.groupId) : ""
  );
  const [jobTypeId, setJobTypeId] = useState<string>(
    job.jobTypeId ? String(job.jobTypeId) : ""
  );
  const [isActive, setIsActive] = useState<boolean>(job.isActive);

  // ===========================
  // CARGA TIPOS DE CARGO (ref_Types / CONTRACT_TYPE)
  // ===========================

  const {
    data: contractTypes,
    isLoading: loadingContractTypes,
    error: contractTypesError,
  } = useQuery<RefType[]>({
    queryKey: ["/api/v1/rh/ref/types", "CONTRACT_TYPE"],
    queryFn: async () => {
      const res = await TiposReferenciaAPI.byCategory("CONTRACT_TYPE");
      return ensureSuccess(res, "Error al cargar tipos de cargo");
    },
  });

  const activeContractTypes = (contractTypes ?? []).filter(
    (t) => t.isActive !== false
  );

  // ===========================
  // SINCRONIZAR FORM AL CAMBIAR CARGO
  // ===========================

  useEffect(() => {
    setDescription(job.description ?? "");
    setGroupId(job.groupId ? String(job.groupId) : "");
    setJobTypeId(job.jobTypeId ? String(job.jobTypeId) : "");
    setIsActive(job.isActive);
  }, [job.jobID, job.description, job.groupId, job.jobTypeId, job.isActive]);

  // ===========================
  // SUBMIT
  // ===========================

  const handleSubmit = () => {
    onSave({
      jobID: job.jobID || undefined,
      description: description.trim(),
      jobTypeId: jobTypeId ? Number(jobTypeId) : null,
      groupId: groupId ? Number(groupId) : null,
      isActive,
    });
  };

  return (
    <div className="space-y-4">
      {/* DESCRIPCIÓN DEL CARGO */}
      <div>
        <Label className="text-sm font-medium">Descripción del cargo *</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Ej: COORDINADOR DE TALENTO HUMANO"
        />
      </div>

      {/* GRUPO OCUPACIONAL + TIPO DE CARGO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Grupo ocupacional */}
        <div>
          <Label className="text-sm font-medium">Grupo ocupacional</Label>
          <select
            className="border rounded-md px-3 py-2 text-sm w-full"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option key="no-group" value="">
              (sin grupo)
            </option>
            {groups.map((g) => (
              <option key={g.groupId} value={g.groupId}>
                {g.description} – ${g.rmu.toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de cargo (ref_Types CONTRACT_TYPE) */}
        <div>
          <Label className="text-sm font-medium">Tipo de cargo</Label>

          {contractTypesError && (
            <p className="text-xs text-destructive mb-1">
              Error al cargar tipos de cargo. Intente refrescar la página.
            </p>
          )}

          <select
            className="border rounded-md px-3 py-2 text-sm w-full"
            value={jobTypeId}
            onChange={(e) => setJobTypeId(e.target.value)}
            disabled={loadingContractTypes || !!contractTypesError}
          >
            {loadingContractTypes && (
              <option key="loading" value="">
                Cargando tipos de cargo...
              </option>
            )}

            {!loadingContractTypes && (
              <>
                <option key="no-type" value="">
                  (sin tipo de cargo)
                </option>
                {activeContractTypes.map((t) => (
                  <option key={t.typeId} value={t.typeId}>
                    {t.code ? `${t.code} – ${t.name}` : t.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

      {/* ESTADO ACTIVO */}
      <div className="flex items-center gap-2">
        <input
          id={`job-active-${job.jobID || "nuevo"}`}
          type="checkbox"
          className="h-4 w-4"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <Label
          htmlFor={`job-active-${job.jobID || "nuevo"}`}
          className="text-sm"
        >
          Cargo activo
        </Label>
      </div>

      {/* BOTONES */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
        )}
        <Button type="button" onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Guardar cargo
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
