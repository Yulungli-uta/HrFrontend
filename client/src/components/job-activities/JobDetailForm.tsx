// src/components/job-activities/JobDetailForm.tsx

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Link2, RefreshCw, XCircle } from "lucide-react";

import type { Job } from "@/types/Job-activities";
import { OccupationalGroupCombobox } from "./catalogCombos";
import { academicGroupName, parseLadderLevel } from "./academicGroups";
import { findAcademicGroup } from "./academicGroupLookup";
import { JOB_ACTIVITIES_KEYS } from "./queryKeys";
import { useGroupDetails } from "./useCatalogLabels";
import { AcademicLadderAPI, type ApiResponse } from "@/lib/api";
import type { AcademicLadderDto } from "@/lib/api/services/catalogs";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";

// ------------------ TIPOS ------------------

interface JobDetailFormProps {
  job: Job;
  saving: boolean;
  onSave: (data: {
    jobID?: number;
    description: string;
    jobTypeId: number | null;
    groupId: number | null;
    isActive: boolean;
    siiesTipoFuncionarioTypeId: number | null;
    puestoJerarquicoSuperior: boolean;
    referenceSalary: number | null;
    academicLadderId: number | null;
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
  const [siiesTipoFuncionarioTypeId, setSiiesTipoFuncionarioTypeId] = useState<string>(
    job.siiesTipoFuncionarioTypeId ? String(job.siiesTipoFuncionarioTypeId) : ""
  );
  const [puestoJerarquicoSuperior, setPuestoJerarquicoSuperior] = useState<boolean>(
    job.puestoJerarquicoSuperior
  );
  const [referenceSalary, setReferenceSalary] = useState<string>(
    job.referenceSalary != null ? String(job.referenceSalary) : ""
  );
  const [academicLadderId, setAcademicLadderId] = useState<string>(
    job.academicLadderId ? String(job.academicLadderId) : ""
  );

  // ===========================
  // CARGA TIPOS DE CARGO (ref_Types / CONTRACT_TYPE)
  // ===========================

  const {
    data: contractTypes,
    isLoading: loadingContractTypes,
    error: contractTypesError,
  } = useRefTypesByCategory(REF_TYPE_CATEGORIES.CONTRACT_TYPE);

  const activeContractTypes = contractTypes.filter((t) => t.isActive !== false);

  // ===========================
  // CARGA TIPO DE FUNCIONARIO SIIES (ref_Types / SIIES_TIPO_FUNCIONARIO)
  // ===========================

  const {
    data: siiesTipoFuncionarioTypes,
    isLoading: loadingSiiesTipoFuncionario,
    error: siiesTipoFuncionarioError,
  } = useRefTypesByCategory(REF_TYPE_CATEGORIES.SIIES_TIPO_FUNCIONARIO);

  const activeSiiesTipoFuncionarioTypes = siiesTipoFuncionarioTypes.filter(
    (t) => t.isActive !== false
  );

  // ===========================
  // CARGA ESCALAFÓN DOCENTE (tbl_AcademicLadder)
  // ===========================

  const {
    data: academicLadders,
    isLoading: loadingAcademicLadders,
    error: academicLaddersError,
  } = useQuery<AcademicLadderDto[]>({
    queryKey: ["/api/v1/rh/academic-ladder"],
    queryFn: async () => {
      const res = await AcademicLadderAPI.getAll();
      return ensureSuccess(res, "Error al cargar escalafón docente");
    },
  });

  const activeAcademicLadders = (academicLadders ?? []).filter((l) => l.isActive !== false);

  // ===========================
  // GRUPO QUE CORRESPONDE AL ESCALÓN (personal académico titular)
  // El escalón da categoría y nivel; el grupo aporta el grado escalafonario y el RMU. Deben coincidir.
  // ===========================

  const selectedLadder = activeAcademicLadders.find((l) => String(l.ladderId) === academicLadderId);
  const ladderLevel = parseLadderLevel(selectedLadder?.name);
  const groupDetails = useGroupDetails([groupId ? Number(groupId) : null]);
  const currentGroup = groupId ? groupDetails.get(Number(groupId)) : undefined;
  const currentGroupName = currentGroup?.description;
  const { data: uepScaleTypes } = useRefTypesByCategory(REF_TYPE_CATEGORIES.UEP_SCALE_TYPE);
  const currentUepName = currentGroup?.uepScaleTypeId ? uepScaleTypes.find((t) => t.typeId === currentGroup.uepScaleTypeId)?.name : undefined;

  const { data: expectedGroup } = useQuery({
    queryKey: [...JOB_ACTIVITIES_KEYS.labels, "expected-group", ladderLevel?.category, ladderLevel?.level],
    queryFn: () => findAcademicGroup(ladderLevel!),
    enabled: !!ladderLevel,
    staleTime: 10 * 60 * 1000,
  });

  // Aviso solo cuando el grupo elegido ya se conoce (o está vacío) y no es el del escalón.
  const groupDiffers =
    !!ladderLevel && !!expectedGroup && Number(groupId || 0) !== expectedGroup.groupId && (!groupId || !!currentGroupName);

  const [autoLinkedGroup, setAutoLinkedGroup] = useState<string | null>(null);

  /** Al elegir un escalón de titular, el grupo se asigna solo; el usuario puede cambiarlo y el aviso lo señala. */
  const handleLadderChange = async (value: string) => {
    setAcademicLadderId(value);
    setAutoLinkedGroup(null);
    const ladder = activeAcademicLadders.find((l) => String(l.ladderId) === value);
    const level = parseLadderLevel(ladder?.name);
    if (!level) return;
    const group = await findAcademicGroup(level);
    if (group) {
      setGroupId(String(group.groupId));
      setAutoLinkedGroup(group.description);
    }
  };

  // ===========================
  // SINCRONIZAR FORM AL CAMBIAR CARGO
  // ===========================

  useEffect(() => {
    setDescription(job.description ?? "");
    setGroupId(job.groupId ? String(job.groupId) : "");
    setJobTypeId(job.jobTypeId ? String(job.jobTypeId) : "");
    setIsActive(job.isActive);
    setSiiesTipoFuncionarioTypeId(
      job.siiesTipoFuncionarioTypeId ? String(job.siiesTipoFuncionarioTypeId) : ""
    );
    setPuestoJerarquicoSuperior(job.puestoJerarquicoSuperior);
    setReferenceSalary(job.referenceSalary != null ? String(job.referenceSalary) : "");
    setAcademicLadderId(job.academicLadderId ? String(job.academicLadderId) : "");
  }, [
    job.jobID,
    job.description,
    job.groupId,
    job.jobTypeId,
    job.isActive,
    job.siiesTipoFuncionarioTypeId,
    job.puestoJerarquicoSuperior,
    job.referenceSalary,
    job.academicLadderId,
  ]);

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
      siiesTipoFuncionarioTypeId: siiesTipoFuncionarioTypeId
        ? Number(siiesTipoFuncionarioTypeId)
        : null,
      puestoJerarquicoSuperior,
      referenceSalary: referenceSalary ? Number(referenceSalary) : null,
      academicLadderId: academicLadderId ? Number(academicLadderId) : null,
    });
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      {/* DESCRIPCIÓN DEL CARGO */}
      <div>
        <Label className="text-sm font-medium">Descripción del cargo *</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Ej: COORDINADOR DE TALENTO HUMANO"
        />
        <p className="mt-1 text-xs text-muted-foreground">El cargo se guarda en mayúsculas.</p>
      </div>

      {/* GRUPO OCUPACIONAL + TIPO DE CARGO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Grupo ocupacional */}
        <div>
          <Label className="text-sm font-medium">Grupo ocupacional</Label>
          <OccupationalGroupCombobox
            value={groupId ? Number(groupId) : null}
            onChange={(id) => setGroupId(id ? String(id) : "")}
            placeholder="(sin grupo)"
            clearLabel="(sin grupo)"
          />
          {currentUepName && (
            <p className="mt-1 text-xs text-muted-foreground">
              Clasificación adicional (UEP): <strong className="text-foreground">{currentUepName}</strong>
            </p>
          )}
          {autoLinkedGroup && !groupDiffers && (
            <p className="mt-1 flex items-center gap-1 text-xs text-success">
              <Link2 className="h-3 w-3" /> Asignado según el escalón docente.
            </p>
          )}
          {groupDiffers && expectedGroup && ladderLevel && (
            <div
              role="alert"
              className="mt-2 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-foreground"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="space-y-1">
                <p>
                  {groupId
                    ? "El grupo elegido no corresponde al escalón docente."
                    : "Este escalón docente tiene un grupo ocupacional."}{" "}
                  Corresponde: <strong>{academicGroupName(ladderLevel)}</strong>.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => {
                    setGroupId(String(expectedGroup.groupId));
                    setAutoLinkedGroup(expectedGroup.description);
                  }}
                >
                  Usar ese grupo
                </Button>
              </div>
            </div>
          )}
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
            className="border border-input rounded-md px-3 py-2 text-sm w-full bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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

      {/* CLASIFICACIÓN SIIES (reporte Funcionarios / Funcionario Pasaporte) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
        {/* Tipo de funcionario SIIES (ref_Types SIIES_TIPO_FUNCIONARIO) */}
        <div>
          <Label className="text-sm font-medium">Tipo de funcionario (SIIES)</Label>

          {siiesTipoFuncionarioError && (
            <p className="text-xs text-destructive mb-1">
              Error al cargar tipos de funcionario SIIES. Intente refrescar la página.
            </p>
          )}

          <select
            className="border border-input rounded-md px-3 py-2 text-sm w-full bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={siiesTipoFuncionarioTypeId}
            onChange={(e) => setSiiesTipoFuncionarioTypeId(e.target.value)}
            disabled={loadingSiiesTipoFuncionario || !!siiesTipoFuncionarioError}
          >
            {loadingSiiesTipoFuncionario && (
              <option key="loading" value="">
                Cargando tipos de funcionario...
              </option>
            )}

            {!loadingSiiesTipoFuncionario && (
              <>
                <option key="no-type" value="">
                  (sin clasificar)
                </option>
                {activeSiiesTipoFuncionarioTypes.map((t) => (
                  <option key={t.typeId} value={t.typeId}>
                    {t.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* Puesto jerárquico superior */}
        <div className="flex items-center gap-2 pt-6">
          <input
            id={`job-puesto-jerarquico-${job.jobID || "nuevo"}`}
            type="checkbox"
            className="h-4 w-4"
            checked={puestoJerarquicoSuperior}
            onChange={(e) => setPuestoJerarquicoSuperior(e.target.checked)}
          />
          <Label
            htmlFor={`job-puesto-jerarquico-${job.jobID || "nuevo"}`}
            className="text-sm"
          >
            Puesto Jerárquico Superior (SIIES)
          </Label>
        </div>

        {/* Escalafón docente (tbl_AcademicLadder) — solo aplica a cargos docentes (Profesor Titular). Nulo para cargos administrativos. */}
        <div>
          <Label className="text-sm font-medium">Escalafón docente</Label>

          {academicLaddersError && (
            <p className="text-xs text-destructive mb-1">
              Error al cargar escalafón docente. Intente refrescar la página.
            </p>
          )}

          <select
            className="border border-input rounded-md px-3 py-2 text-sm w-full bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={academicLadderId}
            onChange={(e) => void handleLadderChange(e.target.value)}
            disabled={loadingAcademicLadders || !!academicLaddersError}
          >
            {loadingAcademicLadders && (
              <option key="loading" value="">
                Cargando escalafón docente...
              </option>
            )}

            {!loadingAcademicLadders && (
              <>
                <option key="no-ladder" value="">
                  (no aplica / cargo administrativo)
                </option>
                {activeAcademicLadders.map((l) => (
                  <option key={l.ladderId} value={l.ladderId}>
                    {l.code ? `${l.code} – ${l.name}` : l.name}
                  </option>
                ))}
              </>
            )}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            Solo para cargos docentes (Profesor Titular Auxiliar/Agregado/Principal). Dejar en blanco para cargos administrativos.
          </p>
        </div>
      </div>

      {/* SUELDO DE REFERENCIA */}
      <div>
        <Label className="text-sm font-medium">Sueldo de referencia</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={referenceSalary}
          onChange={(e) => setReferenceSalary(e.target.value)}
          placeholder="Ej: 733.00"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Valor de referencia del cargo (no es el sueldo real de ninguna persona en particular).
        </p>
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
        <Button type="submit" disabled={saving || !description.trim()}>
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
    </form>
  );
}
