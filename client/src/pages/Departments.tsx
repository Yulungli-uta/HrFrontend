// src/pages/DepartmentsPage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Card, CardHeader, CardContent, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHead, TableHeader, TableRow, TableCell, TableBody } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Building2, Edit3, ChevronRight, ChevronDown, RefreshCw, Plus } from "lucide-react";

import {
  DepartamentosAPI,
  TiposReferenciaAPI,
  handleApiError,
  type ApiResponse,
} from "@/lib/api";

// ---------------- types ----------------
type Dept = {
  departmentId: number;
  parentId: number | null;
  code?: string | null;
  name: string;
  shortName?: string | null;
  departmentType?: number | string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  children?: Dept[];
};

type RefType = {
  typeId: number;
  category: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string | null;
};

const DEPT_TYPE_CATEGORY = "DEPARTAMENT_TYPE";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState<"all"|"active"|"inactive">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // catálogos
  const [refTypes, setRefTypes] = useState<RefType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Dept | null>(null);
  const [saving, setSaving] = useState(false);
  const [fName, setFName] = useState("");
  const [fCode, setFCode] = useState("");
  const [fShort, setFShort] = useState("");
  const [fType, setFType] = useState<string>(""); // typeId en string
  const [fActive, setFActive] = useState<boolean>(true);
  const [fParent, setFParent] = useState<string>("");

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cCode, setCCode] = useState("");
  const [cShort, setCShort] = useState("");
  const [cType, setCType] = useState<string>(""); // typeId en string
  const [cActive, setCActive] = useState<boolean>(true);
  const [cParent, setCParent] = useState<string>("");

  // ---------------- data load ----------------
  async function load() {
    setLoading(true);
    setError("");
    try {
      const res: ApiResponse<Dept[]> = await DepartamentosAPI.list();
      if (res.status === "success") {
        setDepartments(Array.isArray(res.data) ? res.data : []);
      } else {
        setDepartments([]);
        setError(handleApiError(res.error, "No se pudo cargar departamentos"));
      }
    } catch (e: any) {
      setDepartments([]);
      setError(e?.message || "Error desconocido al cargar");
    } finally {
      setLoading(false);
    }
  }

  async function loadTypes() {
    setLoadingTypes(true);
    try {
      const res: ApiResponse<RefType[]> = await TiposReferenciaAPI.byCategory(DEPT_TYPE_CATEGORY);
      if (res.status === "success") {
        const items = (res.data || []).filter(t => t.isActive).sort((a,b) => a.name.localeCompare(b.name));
        setRefTypes(items);
      } else {
        setRefTypes([]);
      }
    } catch {
      setRefTypes([]);
    } finally {
      setLoadingTypes(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadTypes(); }, []);

  // --------------- helpers ---------------
  function buildTree(list: Dept[]) {
    const map = new Map<number, Dept & { children: Dept[] }>();
    const roots: (Dept & { children: Dept[] })[] = [];
    list.forEach(d => map.set(d.departmentId, { ...d, children: [] }));
    list.forEach(d => {
      const node = map.get(d.departmentId)!;
      if (d.parentId && map.has(d.parentId)) map.get(d.parentId)!.children.push(node);
      else roots.push(node);
    });
    return roots;
  }

  const typeIdToName = useMemo(() => {
    const map = new Map<number, string>();
    refTypes.forEach(t => map.set(t.typeId, t.name));
    return map;
  }, [refTypes]);

  const typeNameToId = useMemo(() => {
    const map = new Map<string, number>();
    refTypes.forEach(t => map.set(t.name, t.typeId));
    return map;
  }, [refTypes]);

  const getDeptTypeName = (t?: number | string | null) => {
    if (t == null) return "";
    if (typeof t === "number") return typeIdToName.get(t) ?? String(t);
    return t; // legacy string
  };

  // --------------- filtros base/vista ---------------
  function matchesFilterBase(d: Dept) {
    if (onlyActive === "active" && !d.isActive) return false;
    if (onlyActive === "inactive" && d.isActive) return false;
    if (search) {
      const hay = `${d.name || ""} ${d.code || ""} ${d.shortName || ""}`;
      if (!hay.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  }

  function matchesFilterAll(d: Dept) {
    if (!matchesFilterBase(d)) return false;
    if (typeFilter !== "all") {
      const wanted = Number(typeFilter);
      const dTypeId =
        typeof d.departmentType === "number"
          ? d.departmentType
          : typeof d.departmentType === "string"
            ? (typeNameToId.get(d.departmentType) ?? NaN)
            : NaN;
      if (dTypeId !== wanted) return false;
    }
    return true;
  }

  const tree = useMemo(() => buildTree(departments), [departments]);
  const flat = departments;
  const total = departments.length;
  const activeCount = departments.filter(d => d.isActive).length;

  // Conteo por tipo sobre los registros filtrados por estado y búsqueda (pero no por typeFilter)
  const countsByType = useMemo(() => {
    const map = new Map<number, number>();
    for (const d of departments) {
      if (!matchesFilterBase(d)) continue;
      let id: number | undefined;
      if (typeof d.departmentType === "number") id = d.departmentType;
      else if (typeof d.departmentType === "string") {
        const found = typeNameToId.get(d.departmentType);
        if (found) id = found;
      }
      if (id != null) map.set(id, (map.get(id) || 0) + 1);
    }
    return map;
  }, [departments, onlyActive, search, typeNameToId]);

  // ------------------- NUEVO: visibilidad basada en búsqueda -------------------
  // Mapa: departmentId -> parentId
  const parentById = useMemo(() => {
    const m = new Map<number, number | null>();
    departments.forEach(d => m.set(d.departmentId, d.parentId ?? null));
    return m;
  }, [departments]);

  function ancestorsOf(id: number) {
    const out: number[] = [];
    let cur = parentById.get(id) ?? null;
    while (cur) {
      out.push(cur);
      cur = parentById.get(cur) ?? null;
    }
    return out;
  }

  // IDs que cumplen TODOS los filtros (estado, texto y tipo)
  const matchIds = useMemo(() => {
    return departments.filter(matchesFilterAll).map(d => d.departmentId);
  }, [departments, onlyActive, search, typeFilter, typeNameToId]);

  // IDs visibles: matches + todos sus ancestros
  const visibleIds = useMemo(() => {
    const set = new Set<number>();
    for (const id of matchIds) {
      set.add(id);
      for (const a of ancestorsOf(id)) set.add(a);
    }
    return set;
  }, [matchIds, parentById]);

  // Auto-expandir ancestros cuando hay texto de búsqueda
  useEffect(() => {
    if (!search.trim()) return;
    setExpanded(prev => {
      const next = { ...prev } as Record<number, boolean>;
      for (const id of matchIds) {
        for (const a of ancestorsOf(id)) next[a] = true;
      }
      return next;
    });
  }, [search, matchIds]);

  // --------------- Edit ---------------
  async function openEdit(d: Dept) {
    if (refTypes.length === 0 && !loadingTypes) await loadTypes();

    setEditTarget(d);
    setFName(d.name || "");
    setFCode(d.code || "");
    setFShort(d.shortName || "");

    // normaliza tipo a typeId string
    let initialType = "";
    if (typeof d.departmentType === "number") initialType = String(d.departmentType);
    else if (typeof d.departmentType === "string") {
      const found = typeNameToId.get(d.departmentType);
      if (found) initialType = String(found);
    }
    setFType(initialType);
    setFActive(!!d.isActive);
    setFParent(d.parentId ? String(d.parentId) : "");
    setEditOpen(true);
  }

  // heredar tipo al cambiar el padre (EDIT)
  function onChangeEditParent(v: string) {
    setFParent(v === "none" ? "" : v);
    const selId = v === "none" ? null : Number(v);
    if (!selId) return;

    const parent = flat.find(x => x.departmentId === selId);
    if (!parent) return;

    let pid: number | undefined;
    if (typeof parent.departmentType === "number") pid = parent.departmentType;
    else if (typeof parent.departmentType === "string") {
      const found = typeNameToId.get(parent.departmentType);
      if (found) pid = found;
    }
    if (pid != null) setFType(String(pid));
  }

  async function saveEdit() {
    if (!editTarget) return;
    setSaving(true);
    setError("");

    const payload: any = {
      name: fName.trim(),
      code: fCode.trim() || null,
      shortName: fShort.trim() || null,
      departmentType: fType === "" ? null : Number(fType),
      isActive: fActive,
      parentId: fParent ? Number(fParent) : null,
    };

    try {
      const res = await DepartamentosAPI.update(editTarget.departmentId, payload);
      if (res.status === "error") {
        setError(handleApiError(res.error, "No se pudo guardar los cambios"));
      } else {
        setEditOpen(false);
        setEditTarget(null);
        await load();
      }
    } catch (e: any) {
      setError(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  // --------------- Create ---------------
  async function openCreate() {
    if (refTypes.length === 0 && !loadingTypes) await loadTypes();

    setCName(""); setCCode(""); setCShort(""); setCType("");
    setCActive(true); setCParent("");
    setCreateOpen(true);
  }

  // heredar tipo al cambiar el padre (CREATE)
  function onChangeCreateParent(v: string) {
    setCParent(v === "none" ? "" : v);
    const selId = v === "none" ? null : Number(v);
    if (!selId) return;

    const parent = flat.find(x => x.departmentId === selId);
    if (!parent) return;

    let pid: number | undefined;
    if (typeof parent.departmentType === "number") pid = parent.departmentType;
    else if (typeof parent.departmentType === "string") {
      const found = typeNameToId.get(parent.departmentType);
      if (found) pid = found;
    }
    if (pid != null) setCType(String(pid));
  }

  async function saveCreate() {
    setSaving(true);
    setError("");
    const payload: any = {
      name: cName.trim(),
      code: cCode.trim() || null,
      shortName: cShort.trim() || null,
      departmentType: cType === "" ? null : Number(cType),
      isActive: cActive,
      parentId: cParent ? Number(cParent) : null,
    };

    try {
      const res = await DepartamentosAPI.create(payload);
      if (res.status === "error") {
        setError(handleApiError(res.error, "No se pudo crear el departamento"));
      } else {
        setCreateOpen(false);
        await load();
      }
    } catch (e: any) {
      setError(e?.message || "Error al crear");
    } finally {
      setSaving(false);
    }
  }

  // --------------- fila ---------------
  function Row({ node, depth = 0 }: { node: Dept & { children?: Dept[] }, depth?: number }) {
    const hasChildren = (node.children?.length || 0) > 0;

    // visibilidad basada en visibleIds
    const isVisible = visibleIds.has(node.departmentId);
    if (!isVisible) return null;

    const childrenToRender = (node.children || []).filter(ch => visibleIds.has(ch.departmentId));

    // Si hay búsqueda, auto-expandir ramas con hijos visibles
    const forcedOpen = !!search.trim() && childrenToRender.length > 0;

    const isOpen = forcedOpen || !!expanded[node.departmentId];

    return (
      <>
        <TableRow>
          <TableCell>
            <div style={{ marginLeft: depth * 18 }} className="flex items-center">
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => setExpanded(p => ({ ...p, [node.departmentId]: !p[node.departmentId] }))}
                  className="mr-1"
                  aria-label={isOpen ? "Contraer" : "Expandir"}
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              )}
              <Building2 className="h-4 w-4 mr-2" />
              <span className="font-medium">{node.name}</span>
            </div>
          </TableCell>
          <TableCell className="hidden sm:table-cell">{node.code || "-"}</TableCell>
          <TableCell className="hidden sm:table-cell">
            {getDeptTypeName(node.departmentType) || "-"}
          </TableCell>
          <TableCell>
            <Badge variant={node.isActive ? "default" : "secondary"}>
              {node.isActive ? "Activo" : "Inactivo"}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <Button type="button" size="sm" variant="outline" onClick={() => openEdit(node)}>
              <Edit3 className="h-4 w-4 mr-1" /> Editar
            </Button>
          </TableCell>
        </TableRow>
        {isOpen && childrenToRender.map(ch => (
          <Row key={ch.departmentId} node={ch} depth={depth + 1} />
        ))}
      </>
    );
  }

  // --------------- render ---------------
  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div>
          <h1 className="text-2xl font-bold">Departamentos</h1>
          <p className="text-gray-600 text-sm">Solo se modifica desde <strong>Editar</strong>. No hay eliminación.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
          <Button type="button" onClick={load} variant="outline">
            <RefreshCw className="h-4 w-4 mr-1" /> Recargar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
        <Card className="py-2 border">
          <CardHeader className="pb-1">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-xl">{total}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-gray-600">
            {activeCount} activos / {total - activeCount} inactivos
          </CardContent>
        </Card>

        <Card className="py-2 border">
          <CardHeader className="pb-1">
            <CardDescription>Filtro estado</CardDescription>
            <CardTitle className="text-sm">
              {onlyActive === "all" ? "Todos" : onlyActive === "active" ? "Sólo activos" : "Sólo inactivos"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="py-2 border">
          <CardHeader className="pb-1">
            <CardDescription>Conteo por tipo (vista actual)</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {refTypes.length === 0 ? (
                <Badge variant="secondary">{loadingTypes ? "Cargando tipos…" : "Sin tipos"}</Badge>
              ) : (
                refTypes.map(t => (
                  <Badge key={t.typeId} variant="outline">
                    {t.name}: {countsByType.get(t.typeId) ?? 0}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-1">
        <Input
          placeholder="Buscar por nombre, código o alias…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-1/3"
        />
        <select
          value={onlyActive}
          onChange={(e) => setOnlyActive(e.target.value as any)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {refTypes.map(t => (
              <SelectItem key={t.typeId} value={String(t.typeId)}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contador de resultados cuando hay búsqueda */}
      {search.trim() && (
        <p className="text-xs text-gray-600 mb-2">{matchIds.length} resultado(s) para “{search}”.</p>
      )}

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-base">Estructura</CardTitle>
          <CardDescription>Jerarquía expandible</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-600 text-sm">Cargando…</p>
          ) : error ? (
            <div className="text-sm">
              <p className="text-red-600 font-medium">No se pudo cargar: {error}</p>
              <p className="text-gray-600 mt-2">
                Verifica que <code>VITE_RH_API_BASE</code> apunte al backend y que
                <code> /api/v1/rh/departments</code> esté publicado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[720px] text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden sm:table-cell">Código</TableHead>
                    <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tree.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-6">
                        Sin registros
                      </TableCell>
                    </TableRow>
                  ) : (
                    tree.map((n) => (
                      <Row key={n.departmentId} node={n} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Editar */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!saving) setEditOpen(o); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar departamento</DialogTitle>
            <DialogDescription>Modifica y guarda los cambios.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="ename">Nombre</Label>
              <Input id="ename" value={fName} onChange={(e) => setFName(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="ecode">Código</Label>
              <Input id="ecode" value={fCode} onChange={(e) => setFCode(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="eshort">Alias / Nombre corto</Label>
              <Input id="eshort" value={fShort} onChange={(e) => setFShort(e.target.value)} />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select
                value={fType || "none"}
                onValueChange={(v) => setFType(v === "none" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder={loadingTypes ? "Cargando tipos…" : "(sin tipo)"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">(sin tipo)</SelectItem>
                  {refTypes.map(t => (
                    <SelectItem key={t.typeId} value={String(t.typeId)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Padre</Label>
              <Select value={fParent || "none"} onValueChange={onChangeEditParent}>
                <SelectTrigger><SelectValue placeholder="(sin padre)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">(sin padre)</SelectItem>
                  {flat
                    .filter(x => !editTarget || x.departmentId !== editTarget.departmentId)
                    .map(x => (
                      <SelectItem key={x.departmentId} value={String(x.departmentId)}>
                        {x.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                id="eactive"
                type="checkbox"
                className="h-4 w-4"
                checked={fActive}
                onChange={(e) => setFActive(e.target.checked)}
              />
              <Label htmlFor="eactive">Activo</Label>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveEdit} disabled={saving || !fName.trim()}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Crear */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!saving) setCreateOpen(o); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Agregar departamento</DialogTitle>
            <DialogDescription>Completa los campos y crea el registro.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="cname">Nombre</Label>
              <Input id="cname" value={cName} onChange={(e) => setCName(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="ccode">Código</Label>
              <Input id="ccode" value={cCode} onChange={(e) => setCCode(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="cshort">Alias / Nombre corto</Label>
              <Input id="cshort" value={cShort} onChange={(e) => setCShort(e.target.value)} />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select
                value={cType || "none"}
                onValueChange={(v) => setCType(v === "none" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder={loadingTypes ? "Cargando tipos…" : "(sin tipo)"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">(sin tipo)</SelectItem>
                  {refTypes.map(t => (
                    <SelectItem key={t.typeId} value={String(t.typeId)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Padre</Label>
              <Select value={cParent || "none"} onValueChange={onChangeCreateParent}>
                <SelectTrigger><SelectValue placeholder="(sin padre)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">(sin padre)</SelectItem>
                  {flat.map(x => (
                    <SelectItem key={x.departmentId} value={String(x.departmentId)}>
                      {x.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                id="cactive"
                type="checkbox"
                className="h-4 w-4"
                checked={cActive}
                onChange={(e) => setCActive(e.target.checked)}
              />
              <Label htmlFor="cactive">Activo</Label>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveCreate} disabled={saving || !cName.trim()}>
              {saving ? "Creando…" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
