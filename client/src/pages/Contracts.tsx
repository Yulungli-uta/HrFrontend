import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, FileText, User, Building2, Calendar } from "lucide-react";

import { ContractsRHAPI, type ApiResponse } from "@/lib/api";
import type { ContractDto } from "@/types/contract";
import { ContractDialog } from "@/components/contracts/ContractDialog";
import { useContractLookups } from "@/hooks/contracts/useContractLookups";
import { getEntityId, getEntityLabel } from "@/utils/options";

export default function ContractsPage() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "view" | "edit">("create");
  const [selected, setSelected] = useState<ContractDto | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const queryKey = ["contracts-rh"] as const;

  const { data, isLoading, error } = useQuery<ApiResponse<ContractDto[]>>({
    queryKey,
    queryFn: () => ContractsRHAPI.list(),
  });

  const lookups = useContractLookups({ enabled: true });

  const contracts = data?.status === "success" ? data.data : [];

  // Mapeos para mostrar etiquetas
  const peopleById = useMemo(() => {
    const m = new Map<number, string>();
    for (const x of lookups.people ?? []) {
      const id = Number(getEntityId(x));
      if (Number.isFinite(id)) m.set(id, getEntityLabel(x));
    }
    return m;
  }, [lookups.people]);

  const typeById = useMemo(() => {
    const m = new Map<number, string>();
    for (const x of lookups.types ?? []) {
      const id = Number(getEntityId(x));
      if (Number.isFinite(id)) m.set(id, getEntityLabel(x));
    }
    return m;
  }, [lookups.types]);

  const deptById = useMemo(() => {
    const m = new Map<number, string>();
    for (const x of lookups.depts ?? []) {
      const id = Number(getEntityId(x));
      if (Number.isFinite(id)) m.set(id, getEntityLabel(x));
    }
    return m;
  }, [lookups.depts]);

  // Estados únicos para el filtro
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(contracts.map((c) => c.status));
    return Array.from(statuses).sort((a, b) => a - b);
  }, [contracts]);

  // Filtrado
  const filtered = useMemo(() => {
    let result = contracts;

    // Filtro por estado
    if (statusFilter !== "all") {
      result = result.filter((c) => String(c.status) === statusFilter);
    }

    // Filtro por búsqueda
    const t = q.trim().toLowerCase();
    if (t) {
      result = result.filter((c) => {
        const personName = (peopleById.get(Number(c.personID)) ?? "").toLowerCase();
        const typeName = (typeById.get(Number(c.contractTypeID)) ?? "").toLowerCase();
        const deptName = (deptById.get(Number(c.departmentID)) ?? "").toLowerCase();

        return (
          String(c.contractID).includes(t) ||
          (c.contractCode || "").toLowerCase().includes(t) ||
          String(c.personID).includes(t) ||
          personName.includes(t) ||
          typeName.includes(t) ||
          deptName.includes(t)
        );
      });
    }

    return result;
  }, [contracts, q, statusFilter, peopleById, typeById, deptById]);

  function openCreate() {
    setSelected(null);
    setMode("create");
    setOpen(true);
  }

  function openView(c: ContractDto) {
    setSelected(c);
    setMode("view");
    setOpen(true);
  }

  // Función para obtener el color del badge según el estado
  function getStatusVariant(status: number): "default" | "secondary" | "destructive" | "outline" {
    // Personaliza según tus estados
    if (status === 1) return "default";
    if (status === 2) return "secondary";
    if (status === 3) return "outline";
    return "destructive";
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Cargando contratos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || data?.status === "error") {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">Error al cargar contratos</h3>
                <p className="text-sm text-red-700">
                  {String((error as any)?.message || data?.error?.detail || data?.error?.title)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Contratos</h1>
            <p className="text-sm text-muted-foreground">
              Administra contratos, addendums y documentación del personal
            </p>
          </div>

          <Button onClick={openCreate} size="lg" className="w-full md:w-auto">
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Contrato
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Contratos</p>
                  <p className="text-2xl font-bold">{contracts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Personas</p>
                  <p className="text-2xl font-bold">{peopleById.size}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Departamentos</p>
                  <p className="text-2xl font-bold">{deptById.size}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Filtrados</p>
                  <p className="text-2xl font-bold">{filtered.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por ID, código, persona, tipo o departamento..."
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Todos los estados</option>
                {uniqueStatuses.map((s) => (
                  <option key={s} value={String(s)}>
                    Estado {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table - Desktop */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    ID / Código
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Persona
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Departamento
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Vigencia
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="p-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                      No se encontraron contratos con los filtros aplicados
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr
                      key={c.contractID}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => openView(c)}
                    >
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="font-medium">#{c.contractID}</p>
                          <p className="text-xs text-muted-foreground">{c.contractCode}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">
                            {peopleById.get(Number(c.personID)) ?? `ID ${c.personID}`}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{typeById.get(Number(c.contractTypeID)) ?? c.contractTypeID}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{deptById.get(Number(c.departmentID)) ?? c.departmentID}</span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{String(c.startDate).slice(0, 10)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="text-xs">hasta</span>
                            <span>{String(c.endDate).slice(0, 10)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={getStatusVariant(c.status)}>Estado {c.status}</Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openView(c);
                          }}
                        >
                          Ver detalles
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cards - Mobile/Tablet */}
      <div className="lg:hidden space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              No se encontraron contratos con los filtros aplicados
            </CardContent>
          </Card>
        ) : (
          filtered.map((c) => (
            <Card
              key={c.contractID}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openView(c)}
            >
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg">#{c.contractID}</p>
                      <Badge variant={getStatusVariant(c.status)} className="text-xs">
                        Estado {c.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{c.contractCode}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {peopleById.get(Number(c.personID)) ?? `ID ${c.personID}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{typeById.get(Number(c.contractTypeID)) ?? c.contractTypeID}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{deptById.get(Number(c.departmentID)) ?? c.departmentID}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {String(c.startDate).slice(0, 10)} → {String(c.endDate).slice(0, 10)}
                    </span>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full" onClick={() => openView(c)}>
                  Ver detalles
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <ContractDialog
        open={open}
        onOpenChange={setOpen}
        mode={mode}
        setMode={setMode}
        selected={selected}
      />
    </div>
  );
}