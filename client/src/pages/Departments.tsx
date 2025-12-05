// pages/DepartmentsPage.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";

import { DepartamentosAPI, handleApiError } from "@/lib/api";
import {
  useDepartments,
  useReferenceTypes,
  useDepartmentVisibility,
} from "@/hooks/departments";
import {
  DepartmentsTable,
  DepartmentModal,
  DepartmentsFilters,
  DepartmentsStats,
} from "@/components/departments";
import type {
  Department,
  DepartmentFormData,
  ModalState,
  ActiveFilter,
} from "@/types/department";
import { buildTree } from "@/utils/departments";

const INITIAL_FORM_DATA: DepartmentFormData = {
  name: "",
  code: "",
  shortName: "",
  type: "",
  isActive: true,
  parentId: "",
};

export default function DepartmentsPage() {
  // State
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState<ActiveFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [error, setError] = useState("");
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    mode: "create",
    department: null,
  });
  const [formData, setFormData] =
    useState<DepartmentFormData>(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);

  // Data hooks
  const {
    departments,
    loading,
    error: loadError,
    refetch,
  } = useDepartments();
  const {
    refTypes,
    loading: loadingTypes,
    refetch: refetchTypes,
  } = useReferenceTypes();

  // Visibility hook
  const { visibleIds, matchIds } = useDepartmentVisibility(
    departments,
    search,
    onlyActive,
    typeFilter,
    refTypes
  );

  // Computed values
  const tree = useMemo(() => buildTree(departments), [departments]);
  const flatDepartments = departments;

  const typeIdToName = useMemo(() => {
    const map = new Map<number, string>();
    refTypes.forEach((t) => map.set(t.typeId, t.name));
    return map;
  }, [refTypes]);

  const getDepartmentTypeName = useCallback(
    (type?: number | string | null) => {
      if (type == null) return "";
      if (typeof type === "number") return typeIdToName.get(type) ?? String(type);
      return type;
    },
    [typeIdToName]
  );

  // Handlers
  const handleToggleExpand = useCallback((departmentId: number) => {
    setExpanded((prev) => ({ ...prev, [departmentId]: !prev[departmentId] }));
  }, []);

  const handleOpenCreate = useCallback(
    async () => {
      if (refTypes.length === 0) await refetchTypes();
      setFormData(INITIAL_FORM_DATA);
      setModalState({ open: true, mode: "create", department: null });
      setError("");
    },
    [refTypes.length, refetchTypes]
  );

  const handleOpenEdit = useCallback(
    async (department: Department) => {
      if (refTypes.length === 0) await refetchTypes();

      let initialType = "";
      if (typeof department.departmentType === "number") {
        initialType = String(department.departmentType);
      } else if (typeof department.departmentType === "string") {
        const found = refTypes.find((t) => t.name === department.departmentType);
        if (found) initialType = String(found.typeId);
      }

      setFormData({
        name: department.name || "",
        code: department.code || "",
        shortName: department.shortName || "",
        type: initialType,
        isActive: department.isActive,
        parentId: department.parentId ? String(department.parentId) : "",
      });

      setModalState({ open: true, mode: "edit", department });
      setError("");
    },
    [refTypes, refetchTypes]
  );

  const handleSave = useCallback(
    async () => {
      setSaving(true);
      setError("");

      try {
        const name = formData.name.trim();
        const code = formData.code.trim();
        const shortName = formData.shortName.trim();

        // Validación fuerte en frontend para evitar mandar Code vacío
        if (!name) {
          setError("El nombre del departamento es obligatorio.");
          setSaving(false);
          return;
        }
        if (!code) {
          setError("El código del departamento es obligatorio.");
          setSaving(false);
          return;
        }

        const payload = {
          name,
          code,               // 👈 siempre string no vacío
          shortName,          // 👈 string (puede ser "" si tu columna lo permite)
          departmentType: formData.type ? Number(formData.type) : null,
          isActive: formData.isActive,
          parentId: formData.parentId ? Number(formData.parentId) : null,
        };

        console.log("🔹 DepartmentsPage handleSave payload:", payload);

        let res;
        if (modalState.mode === "create") {
          res = await DepartamentosAPI.create(payload);
        } else if (modalState.department) {
          res = await DepartamentosAPI.update(
            modalState.department.departmentId,
            payload
          );
        }

        if (res?.status === "error") {
          setError(
            handleApiError(
              res.error,
              `No se pudo ${
                modalState.mode === "create" ? "crear" : "actualizar"
              } el departamento`
            )
          );
        } else {
          setModalState({ open: false, mode: "create", department: null });
          await refetch();
        }
      } catch (e: any) {
        setError(
          e?.message ||
            `Error al ${
              modalState.mode === "create" ? "crear" : "actualizar"
            }`
        );
      } finally {
        setSaving(false);
      }
    },
    [formData, modalState, refetch]
  );

  // Auto-expandir cuando hay búsqueda
  useEffect(() => {
    if (search.trim()) {
      setExpanded((prev) => {
        const next = { ...prev };
        visibleIds.forEach((id) => {
          next[id] = true;
        });
        return next;
      });
    }
  }, [search, visibleIds]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departamentos</h1>
          <p className="text-gray-600 text-sm mt-1">
            Gestión de estructura organizacional
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar</span>
          </Button>
          <Button
            type="button"
            onClick={refetch}
            variant="outline"
            className="flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            <span>Recargar</span>
          </Button>
        </div>
      </div>

      <DepartmentsStats
        departments={departments}
        refTypes={refTypes}
        loadingTypes={loadingTypes}
        onlyActive={onlyActive}
        search={search}
      />

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

      {/* Departments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Estructura Organizacional</CardTitle>
          <CardDescription>
            Jerarquía de departamentos expandible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DepartmentsTable
            tree={tree}
            expanded={expanded}
            visibleIds={visibleIds}
            search={search}
            loading={loading}
            error={loadError}
            onToggleExpand={handleToggleExpand}
            onEdit={handleOpenEdit}
            onRefetch={refetch}
            getDepartmentTypeName={getDepartmentTypeName}
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
        departments={flatDepartments}
        onOpenChange={(open) =>
          setModalState((prev) => ({ ...prev, open }))
        }
        onFormDataChange={setFormData}
        onSave={handleSave}
        error={error}
      />
    </div>
  );
}
