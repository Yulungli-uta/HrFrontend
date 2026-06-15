// pages/DepartmentsPage.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card, CardHeader, CardContent,
  CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";

import { DepartamentosAPI, handleApiError } from "@/lib/api";
import {
  useDepartments,
  useReferenceTypes,
  useReferenceScopeTypes,
  useDepartmentVisibility,
} from "@/hooks/departments";
import {
  DepartmentsTable,
  DepartmentModal,
  DepartmentsFilters,
  DepartmentsStats,
} from "@/components/departments";
import type {
  Department, DepartmentFormData, ModalState, ActiveFilter,
} from "@/types/department";
import { buildTree } from "@/utils/departments";
import { parseApiError } from "@/lib/error-handling";

// ── Constantes ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

const INITIAL_FORM_DATA: DepartmentFormData = {
  name: "", code: "", shortName: "",
  type: "", scope: "", isActive: true, parentId: "",
};

// ── Componente ────────────────────────────────────────────────────────────────
export default function DepartmentsPage() {

  // ── Estado de UI ─────────────────────────────────────────────────────────
  const [expanded, setExpanded]     = useState<Record<number, boolean>>({});
  const [search, setSearch]         = useState("");
  const [onlyActive, setOnlyActive] = useState<ActiveFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage]             = useState(1);
  const [error, setError]           = useState("");
  const [saving, setSaving]         = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [modalState, setModalState] = useState<ModalState>({
    open: false, mode: "create", department: null,
  });
  const [formData, setFormData] = useState<DepartmentFormData>(INITIAL_FORM_DATA);

  // ── Datos ─────────────────────────────────────────────────────────────────
  // useDepartments carga TODOS los departamentos con list() para que el árbol
  // funcione correctamente. La paginación se aplica aquí en cliente sobre las
  // raíces visibles tras filtrar.
  const { departments, loading, error: loadError, refetch } = useDepartments();
  const { refTypes, loading: loadingTypes, refetch: refetchTypes } = useReferenceTypes();
  const { scopeTypes } = useReferenceScopeTypes();

  // ── Árbol completo + visibilidad ──────────────────────────────────────────
  // buildTree necesita todos los departamentos cargados para armar la jerarquía.
  const tree = useMemo(() => buildTree(departments), [departments]);

  // visibleIds: IDs de nodos que pasan los filtros + sus ancestros (para mostrar contexto).
  const { visibleIds, matchIds } = useDepartmentVisibility(
    departments, search, onlyActive, typeFilter, refTypes
  );

  // ── Paginación cliente sobre nodos RAÍZ visibles ──────────────────────────
  // Solo paginamos los nodos raíz (sin padre). Los hijos siempre se muestran
  // bajo su padre al expandir, sin importar la página.
  const visibleRoots = useMemo(
    () => tree.filter(node => visibleIds.has(node.departmentId)),
    [tree, visibleIds]
  );

  const totalCount  = visibleRoots.length;
  const totalPages  = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage    = Math.min(page, totalPages);

  const paginatedRoots = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return visibleRoots.slice(start, start + PAGE_SIZE);
  }, [visibleRoots, safePage]);

  const hasNextPage     = safePage < totalPages;
  const hasPreviousPage = safePage > 1;

  // Al cambiar filtros, volver a la página 1
  useEffect(() => { setPage(1); }, [search, onlyActive, typeFilter]);

  // ── Auto-expandir cuando hay búsqueda ────────────────────────────────────
  useEffect(() => {
    if (search.trim()) {
      setExpanded(prev => {
        const next = { ...prev };
        visibleIds.forEach(id => { next[id] = true; });
        return next;
      });
    }
  }, [search, visibleIds]);

  // ── Mapas de nombres ──────────────────────────────────────────────────────
  const typeIdToName = useMemo(() => {
    const m = new Map<number, string>();
    refTypes.forEach(t => m.set(t.typeId, t.name));
    return m;
  }, [refTypes]);

  const getDepartmentTypeName = useCallback(
    (type?: number | string | null) => {
      if (type == null) return "";
      return typeof type === "number" ? (typeIdToName.get(type) ?? String(type)) : type;
    },
    [typeIdToName]
  );

  const scopeIdToName = useMemo(() => {
    const m = new Map<number, string>();
    scopeTypes.forEach(t => m.set(t.typeId, t.name));
    return m;
  }, [scopeTypes]);

  const getDepartmentScopeName = useCallback(
    (scope?: number | null) =>
      scope == null ? "" : (scopeIdToName.get(scope) ?? String(scope)),
    [scopeIdToName]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleToggleExpand = useCallback(
    (id: number) => setExpanded(prev => ({ ...prev, [id]: !prev[id] })),
    []
  );

  const handleOpenCreate = useCallback(async () => {
    if (refTypes.length === 0) await refetchTypes();
    setFormData(INITIAL_FORM_DATA);
    setModalState({ open: true, mode: "create", department: null });
    setError("");
  }, [refTypes.length, refetchTypes]);

  const handleOpenEdit = useCallback(async (department: Department) => {
    if (refTypes.length === 0) await refetchTypes();

    let initialType = "";
    if (typeof department.departmentType === "number") {
      initialType = String(department.departmentType);
    } else if (typeof department.departmentType === "string") {
      const found = refTypes.find(t => t.name === department.departmentType);
      if (found) initialType = String(found.typeId);
    }

    setFormData({
      name:      department.name || "",
      code:      department.code || "",
      shortName: department.shortName || "",
      type:      initialType,
      scope:     department.departmentScope ? String(department.departmentScope) : "",
      isActive:  department.isActive,
      parentId:  department.parentId ? String(department.parentId) : "",
    });
    setModalState({ open: true, mode: "edit", department });
    setError("");
  }, [refTypes, refetchTypes]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const name      = formData.name.trim();
      const code      = formData.code.trim();
      const shortName = formData.shortName.trim();

      if (!name) { setError("El nombre del departamento es obligatorio."); return; }
      if (!code) { setError("El código del departamento es obligatorio.");  return; }

      const payload = {
        name, code, shortName,
        departmentType:  formData.type  ? Number(formData.type)  : null,
        departmentScope: formData.scope ? Number(formData.scope) : null,
        isActive:        formData.isActive,
        parentId:        formData.parentId ? Number(formData.parentId) : null,
      };

      const res = modalState.mode === "create"
        ? await DepartamentosAPI.create(payload)
        : await DepartamentosAPI.update(modalState.department!.departmentId, payload);

      if (res?.status === "error") {
        setError(handleApiError(res.error,
          `No se pudo ${modalState.mode === "create" ? "crear" : "actualizar"} el departamento`));
      } else {
        setModalState({ open: false, mode: "create", department: null });
        await refetch();
      }
    } catch (e: unknown) {
      setError(parseApiError(e).message || "Error inesperado");
    } finally {
      setSaving(false);
    }
  }, [formData, modalState, refetch]);

  // Toggle rápido de estado — PUT con isActive invertido, sin abrir modal
  const handleToggleStatus = useCallback(async (department: Department) => {
    if (togglingId === department.departmentId) return;
    setTogglingId(department.departmentId);
    try {
      await DepartamentosAPI.update(department.departmentId, {
        name:            department.name,
        code:            department.code    || "",
        shortName:       department.shortName || "",
        departmentType:  typeof department.departmentType === "number"
                           ? department.departmentType : null,
        departmentScope: department.departmentScope ?? null,
        isActive:        !department.isActive,
        parentId:        department.parentId ?? null,
      });
      await refetch();
    } catch (e) {
      console.error("[ToggleStatus]", parseApiError(e).message);
    } finally {
      setTogglingId(null);
    }
  }, [togglingId, refetch]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-4 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Departamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestión de estructura organizacional
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleOpenCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /><span>Agregar</span>
          </Button>
          <Button
            type="button" onClick={refetch} variant="outline"
            className="flex items-center gap-2" disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Recargar</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <DepartmentsStats
        departments={departments}
        refTypes={refTypes}
        loadingTypes={loadingTypes}
        onlyActive={onlyActive}
        search={search}
      />

      {/* Filtros */}
      <DepartmentsFilters
        search={search}
        onlyActive={onlyActive}
        typeFilter={typeFilter}
        refTypes={refTypes}
        onSearchChange={setSearch}
        onOnlyActiveChange={setOnlyActive}
        onTypeFilterChange={setTypeFilter}
        visibleCount={matchIds.length}
      />

      {/* Tabla / Cards */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle>Estructura Organizacional</CardTitle>
              <CardDescription>
                Jerarquía de departamentos — página {safePage} de {totalPages}
              </CardDescription>
            </div>
            {departments.length > 0 && (
              <span className="text-xs text-muted-foreground shrink-0">
                {departments.length} departamentos en total
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <DepartmentsTable
            paginatedRoots={paginatedRoots}
            expanded={expanded}
            visibleIds={visibleIds}
            search={search}
            loading={loading}
            error={loadError}
            page={safePage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            onPageChange={setPage}
            onToggleExpand={handleToggleExpand}
            onEdit={handleOpenEdit}
            onToggleStatus={handleToggleStatus}
            onRefetch={refetch}
            getDepartmentTypeName={getDepartmentTypeName}
            getDepartmentScopeName={getDepartmentScopeName}
          />
        </CardContent>
      </Card>

      {/* Modal */}
      <DepartmentModal
        open={modalState.open}
        mode={modalState.mode}
        department={modalState.department}
        loading={saving}
        formData={formData}
        refTypes={refTypes}
        refScopeTypes={scopeTypes}
        onOpenChange={open => setModalState(prev => ({ ...prev, open }))}
        onFormDataChange={setFormData}
        onSave={handleSave}
        error={error}
      />
    </div>
  );
}
