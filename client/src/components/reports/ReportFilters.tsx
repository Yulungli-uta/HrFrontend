/**
 * src/components/reports/ReportFilters.tsx
 *
 * Filtros genéricos de reportes con:
 * - Catálogos dinámicos (Departamentos, Facultades, Empleados, CONTRACT_TYPE)
 * - Combobox buscable (muestra nombre, envía código)
 * - IDs se guardan como number en el filtro (backend-friendly)
 *
 * Requisitos:
 * - Debes tener cmdk instalado (porque "@/components/ui/command" lo usa):
 *   npm i cmdk
 */

import * as React from "react";
import { Filter, Check, ChevronsUpDown } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { cn } from "@/lib/utils";
import type { ReportFilter, ReportType, PageOrientation } from "@/types/reports";
import { REPORT_CONFIGS } from "@/types/reports";

import { DepartamentosAPI, FacultadesAPI, TiposReferenciaAPI, VistaEmpleadosAPI } from "@/lib/api";

/* ---------------------------------- Types --------------------------------- */

type Option = { value: string; label: string };

type LoadState<T> = {
  loading: boolean;
  items: T[];
  error?: string;
};

type Department = { departmentId: number; name: string };
type Faculty = { facultyId: number; name: string };
type EmployeeView = { employeeID: number; fullName: string };
type RefType = { typeId: number; name: string; category?: string };

/* ------------------------------ Small helpers ------------------------------ */

function toNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStr(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function extractArray<T = any>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (res?.status === "success" && Array.isArray(res.data)) return res.data;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  return [];
}

function mapDepartmentOptions(raw: any[]): Option[] {
  return raw
    .map((d) => {
      const id = toNum(d.departmentId ?? d.departmentID ?? d.id);
      const name = toStr(d.name);
      if (id == null || !name) return null;
      return { value: String(id), label: name };
    })
    .filter(Boolean) as Option[];
}

function mapFacultyOptions(raw: any[]): Option[] {
  return raw
    .map((f) => {
      const id = toNum(f.facultyId ?? f.facultyID ?? f.id);
      const name = toStr(f.name);
      if (id == null || !name) return null;
      return { value: String(id), label: name };
    })
    .filter(Boolean) as Option[];
}

function mapEmployeeOptions(raw: any[]): Option[] {
  return raw
    .map((e) => {
      const id = toNum(e.employeeID ?? e.employeeId ?? e.id);
      const fullName = toStr(e.fullName) ?? toStr(`${e.firstName ?? ""} ${e.lastName ?? ""}`.trim());
      if (id == null || !fullName) return null;
      return { value: String(id), label: fullName };
    })
    .filter(Boolean) as Option[];
}

function mapContractTypeOptions(raw: any[]): Option[] {
  return raw
    .map((t) => {
      const id = toNum(t.typeId ?? t.typeID ?? t.id);
      const name = toStr(t.name);
      if (id == null || !name) return null;
      return { value: String(id), label: name };
    })
    .filter(Boolean) as Option[];
}

/* -------------------------- Searchable Combobox ---------------------------- */
/**
 * - Muestra label
 * - Devuelve value (string)
 * - Búsqueda en vivo con CommandInput
 */
function SearchableCombobox(props: {
  value: string; // "all" o id string
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
}) {
  const {
    value,
    onChange,
    options,
    placeholder = "Seleccionar...",
    searchPlaceholder = "Buscar...",
    emptyText = "Sin resultados",
    disabled,
  } = props;

  const [open, setOpen] = React.useState(false);

  const currentLabel = React.useMemo(() => {
    if (value === "all") return "Todos";
    return options.find((o) => o.value === value)?.label ?? placeholder;
  }, [options, placeholder, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">{currentLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandEmpty>{emptyText}</CommandEmpty>

          <CommandGroup>
            <CommandItem
              value="Todos"
              onSelect={() => {
                onChange("all");
                setOpen(false);
              }}
            >
              <Check className={cn("mr-2 h-4 w-4", value === "all" ? "opacity-100" : "opacity-0")} />
              Todos
            </CommandItem>

            {options.map((o) => (
              <CommandItem
                key={o.value}
                value={o.label} // clave: filtra por texto
                onSelect={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                {o.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* --------------------------------- Props ---------------------------------- */

interface ReportFiltersProps {
  reportType: ReportType;
  onFilterChange: (filter: ReportFilter) => void;
  initialFilter?: ReportFilter;
}

/* ------------------------------ Main component ----------------------------- */

export function ReportFilters({ reportType, onFilterChange, initialFilter = {} }: ReportFiltersProps) {
  const reportConfig = REPORT_CONFIGS[reportType];
  const availableFilters = reportConfig.availableFilters;

  // evita problemas si en configs hay aliases (employeeID vs employeeId, etc.)
  const available = React.useMemo(() => new Set((availableFilters as unknown as string[]) ?? []), [availableFilters]);
  const hasFilter = React.useCallback((...keys: string[]) => keys.some((k) => available.has(k)), [available]);

  const [filter, setFilter] = React.useState<ReportFilter>(initialFilter);

  // estados de catálogos
  const [departments, setDepartments] = React.useState<LoadState<Department>>({ loading: false, items: [] });
  const [faculties, setFaculties] = React.useState<LoadState<Faculty>>({ loading: false, items: [] });
  const [employees, setEmployees] = React.useState<LoadState<EmployeeView>>({ loading: false, items: [] });
  const [contractTypes, setContractTypes] = React.useState<LoadState<RefType>>({ loading: false, items: [] });

  const setFilterValue = React.useCallback((key: keyof ReportFilter, value: any) => {
    setFilter((prev) => ({
      ...prev,
      [key]: value === "" || value === "all" ? undefined : value,
    }));
  }, []);

  // notifica cambios
  React.useEffect(() => {
    onFilterChange(filter);
  }, [filter, onFilterChange]);

  // carga catálogos cuando aplique
  React.useEffect(() => {
    let alive = true;

    const loadDepartments = async () => {
      if (!hasFilter("departmentId", "departmentID")) return;
      setDepartments({ loading: true, items: [] });
      try {
        const res = await DepartamentosAPI.list();
        const arr = extractArray(res);
        if (!alive) return;
        setDepartments({ loading: false, items: arr as any[] });
      } catch {
        if (!alive) return;
        setDepartments({ loading: false, items: [], error: "No se pudieron cargar departamentos" });
      }
    };

    const loadFaculties = async () => {
      if (!hasFilter("facultyId", "facultyID")) return;
      setFaculties({ loading: true, items: [] });
      try {
        const res = await FacultadesAPI.list();
        const arr = extractArray(res);
        if (!alive) return;
        setFaculties({ loading: false, items: arr as any[] });
      } catch {
        if (!alive) return;
        setFaculties({ loading: false, items: [], error: "No se pudieron cargar facultades" });
      }
    };

    const loadEmployees = async () => {
      if (!hasFilter("employeeId", "employeeID")) return;
      setEmployees({ loading: true, items: [] });
      try {
        // En tu app, la vista completa devuelve employeeID y fullName (ver EmployeesPage.tsx)
        const res = await VistaEmpleadosAPI.list();
        const arr = extractArray(res);
        if (!alive) return;
        setEmployees({ loading: false, items: arr as any[] });
      } catch {
        if (!alive) return;
        setEmployees({ loading: false, items: [], error: "No se pudieron cargar empleados" });
      }
    };

    const loadContractTypes = async () => {
      if (!hasFilter("employeeType")) return;
      setContractTypes({ loading: true, items: [] });
      try {
        const res = await TiposReferenciaAPI.byCategory("CONTRACT_TYPE");
        const arr = extractArray(res);
        if (!alive) return;
        setContractTypes({ loading: false, items: arr as any[] });
      } catch {
        if (!alive) return;
        setContractTypes({ loading: false, items: [], error: "No se pudo cargar CONTRACT_TYPE" });
      }
    };

    void loadDepartments();
    void loadFaculties();
    void loadEmployees();
    void loadContractTypes();

    return () => {
      alive = false;
    };
  }, [reportType, hasFilter]);

  // opciones ya normalizadas (label visible / value código)
  const departmentOptions = React.useMemo<Option[]>(
    () => mapDepartmentOptions(departments.items as any[]),
    [departments.items]
  );

  const facultyOptions = React.useMemo<Option[]>(
    () => mapFacultyOptions(faculties.items as any[]),
    [faculties.items]
  );

  const employeeOptions = React.useMemo<Option[]>(
    () => mapEmployeeOptions(employees.items as any[]),
    [employees.items]
  );

  const contractTypeOptions = React.useMemo<Option[]>(
    () => mapContractTypeOptions(contractTypes.items as any[]),
    [contractTypes.items]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros de Búsqueda
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Fecha Inicio */}
          {hasFilter("startDate") && (
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={filter.startDate || ""}
                onChange={(e) => setFilterValue("startDate", e.target.value)}
              />
            </div>
          )}

          {/* Fecha Fin */}
          {hasFilter("endDate") && (
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={filter.endDate || ""}
                onChange={(e) => setFilterValue("endDate", e.target.value)}
              />
            </div>
          )}

          {/* Departamento (buscable) */}
          {hasFilter("departmentId", "departmentID") && (
            <div className="space-y-2">
              <Label>Departamento</Label>
              <SearchableCombobox
                value={filter.departmentId != null ? String(filter.departmentId) : "all"}
                onChange={(v) => setFilterValue("departmentId", v === "all" ? undefined : Number(v))}
                options={departmentOptions}
                placeholder="Todos los departamentos"
                searchPlaceholder="Buscar departamento..."
                emptyText={departments.loading ? "Cargando..." : "Sin resultados"}
                disabled={departments.loading}
              />
              {departments.error && <p className="text-xs text-destructive">{departments.error}</p>}
            </div>
          )}

          {/* Facultad (buscable) */}
          {hasFilter("facultyId", "facultyID") && (
            <div className="space-y-2">
              <Label>Facultad</Label>
              <SearchableCombobox
                value={filter.facultyId != null ? String(filter.facultyId) : "all"}
                onChange={(v) => setFilterValue("facultyId", v === "all" ? undefined : Number(v))}
                options={facultyOptions}
                placeholder="Todas las facultades"
                searchPlaceholder="Buscar facultad..."
                emptyText={faculties.loading ? "Cargando..." : "Sin resultados"}
                disabled={faculties.loading}
              />
              {faculties.error && <p className="text-xs text-destructive">{faculties.error}</p>}
            </div>
          )}

          {/* Empleado (buscable, muestra fullName, envía employeeID) */}
          {hasFilter("employeeId", "employeeID") && (
            <div className="space-y-2">
              <Label>Empleado</Label>
              <SearchableCombobox
                value={filter.employeeId != null ? String(filter.employeeId) : "all"}
                onChange={(v) => setFilterValue("employeeId", v === "all" ? undefined : Number(v))}
                options={employeeOptions}
                placeholder="Todos los empleados"
                searchPlaceholder="Buscar empleado..."
                emptyText={employees.loading ? "Cargando..." : "Sin resultados"}
                disabled={employees.loading}
              />
              {employees.error && <p className="text-xs text-destructive">{employees.error}</p>}
            </div>
          )}

          {/* Tipo de Empleado (CONTRACT_TYPE) buscable, envía typeId */}
          {hasFilter("employeeType") && (
            <div className="space-y-2">
              <Label>Tipo de Empleado</Label>
              <SearchableCombobox
                value={filter.employeeType != null ? String(filter.employeeType as any) : "all"}
                onChange={(v) => setFilterValue("employeeType", v === "all" ? undefined : Number(v))}
                options={contractTypeOptions}
                placeholder="Todos los tipos"
                searchPlaceholder="Buscar tipo..."
                emptyText={contractTypes.loading ? "Cargando..." : "Sin resultados"}
                disabled={contractTypes.loading}
              />
              {contractTypes.error && <p className="text-xs text-destructive">{contractTypes.error}</p>}
              <p className="text-xs text-muted-foreground">Fuente: CONTRACT_TYPE</p>
            </div>
          )}

          {/* Estado Activo (select simple) */}
          {hasFilter("isActive") && (
            <div className="space-y-2">
              <Label htmlFor="isActive">Estado</Label>
              <Select
                value={filter.isActive === undefined ? "all" : String(filter.isActive)}
                onValueChange={(value) => {
                  if (value === "all") setFilterValue("isActive", undefined);
                  else setFilterValue("isActive", value === "true");
                }}
              >
                <SelectTrigger id="isActive">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Activos</SelectItem>
                  <SelectItem value="false">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Incluir Inactivos (select simple) */}
          {hasFilter("includeInactive") && (
            <div className="space-y-2">
              <Label htmlFor="includeInactive">Incluir Inactivos</Label>
              <Select
                value={filter.includeInactive === undefined ? "false" : String(filter.includeInactive)}
                onValueChange={(value) => setFilterValue("includeInactive", value === "true")}
              >
                <SelectTrigger id="includeInactive">
                  <SelectValue placeholder="Solo activos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Solo Activos</SelectItem>
                  <SelectItem value="true">Incluir Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Orientación de página PDF (portrait / landscape) */}
          {hasFilter("orientation") && (
            <div className="space-y-2">
              <Label htmlFor="orientation">Orientación del PDF</Label>
              <Select
                value={filter.orientation ?? "landscape"}
                onValueChange={(value) =>
                  setFilterValue("orientation", value as PageOrientation)
                }
              >
                <SelectTrigger id="orientation">
                  <SelectValue placeholder="Seleccionar orientación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscape">
                    ↔️ Horizontal (Landscape)
                  </SelectItem>
                  <SelectItem value="portrait">
                    ↕️ Vertical (Portrait)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Horizontal recomendado para reportes con muchas columnas
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ReportFilters;
