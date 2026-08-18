// src/pages/Parameters.tsx
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Settings2, Edit, Trash2, Search, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ParametersAPI, type ApiResponse, type PagedResult } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { parseApiError } from "@/lib/error-handling";
import { logger } from "@/lib/logger";
import { usePaged } from "@/hooks/pagination/usePaged";
import { DataPagination } from "@/components/ui/DataPagination";

interface Parameter {
  parameterId?: number;
  name: string;
  pvalues: string;
  description: string;
  dataType: string;
  isActive: boolean;
}

const empty: Parameter = { name: "", pvalues: "", description: "", dataType: "NUMERO", isActive: true };

export default function ParametersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Parameter | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Parameter | null>(null);
  const [form, setForm] = useState<Parameter>(empty);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    items: filtered,
    isLoading,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPage,
    setPageSize,
    setSearch,
  } = usePaged<Parameter>({
    queryKey: "parameters-paged",
    queryFn: (params) =>
      ParametersAPI.listPaged(params) as Promise<ApiResponse<PagedResult<Parameter>>>,
    initialPageSize: 20,
  });

  const load = () => queryClient.invalidateQueries({ queryKey: ["parameters-paged"] });

  const handleSave = async () => {
    if (!form.name) {
      toast({ title: "Datos incompletos", description: "El nombre del parámetro es requerido", variant: "destructive" });
      return;
    }
    try {
      const res = editing
        ? await ParametersAPI.update(editing.parameterId!, form)
        : await ParametersAPI.create(form);
      if (res.status !== "success") throw new Error(res.error?.message || "No se pudo guardar el parámetro");
      toast({ title: "Éxito", description: editing ? "Parámetro actualizado" : "Parámetro creado" });
      closeDialog();
      await load();
    } catch (error) {
      logger.error("Parameters", "Error guardando parámetro", error);
      toast({ title: "Error", description: parseApiError(error).message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!toDelete?.parameterId) return;
    try {
      const res = await ParametersAPI.remove(toDelete.parameterId);
      if (res.status !== "success") throw new Error(res.error?.message || "No se pudo eliminar");
      toast({ title: "Éxito", description: "Parámetro eliminado" });
      setIsDeleteOpen(false);
      setToDelete(null);
      await load();
    } catch (error) {
      logger.error("Parameters", "Error eliminando parámetro", error);
      toast({ title: "Error", description: parseApiError(error).message, variant: "destructive" });
    }
  };

  const openEdit = (p: Parameter) => {
    setEditing(p);
    setForm({ ...p });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditing(null);
    setForm(empty);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Parámetros del Sistema</h1>
          <p className="text-muted-foreground mt-2">
            Constantes de negocio usadas por el backend (ej. días de vacaciones por año, tope de acumulación, minutos laborables por día).
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(o) => (o ? setIsDialogOpen(true) : closeDialog())}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Parámetro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Parámetro" : "Nuevo Parámetro"}</DialogTitle>
              <DialogDescription>
                El backend lee estos valores por nombre exacto — cambiarlos afecta cálculos reales del sistema.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {!editing && (
                <div className="bg-warning/10 p-3 rounded-md flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <span className="text-sm text-warning">
                    Usa MAYÚSCULAS_CON_GUION_BAJO para el nombre, igual que los parámetros existentes (ej. VACATION_PER_YEAR_CT).
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
                  placeholder="Ej: VACATION_MAX_ACCUMULATION_PERIODS"
                  disabled={!!editing}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input value={form.pvalues ?? ""} onChange={(e) => setForm({ ...form, pvalues: e.target.value })} placeholder="Ej: 2" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de dato</Label>
                  <Select value={form.dataType ?? "NUMERO"} onValueChange={(v) => setForm({ ...form, dataType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NUMERO">Numérico</SelectItem>
                      <SelectItem value="TEXTO">Texto</SelectItem>
                      <SelectItem value="BOOLEANO">Booleano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={form.description ?? ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Para qué se usa este parámetro y en qué módulo..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
                <Label>Activo (el backend solo lee parámetros activos)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button onClick={handleSave}>{editing ? "Actualizar" : "Crear"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Parámetros registrados</CardTitle>
              <CardDescription>{totalCount} en total</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o descripción..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchTerm(value);
                    // Búsqueda real en el servidor (usePaged.setSearch resetea a página 1 automáticamente).
                    setSearch(value);
                  }}
                />
              </div>
              <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.parameterId}>
                    <TableCell className="font-mono text-sm font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono">{p.pvalues || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{p.dataType || "—"}</Badge></TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{p.description || "Sin descripción"}</TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Activo" : "Inactivo"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => { setToDelete(p); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Settings2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No hay parámetros registrados.</p>
            </div>
          )}

          <DataPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            hasPreviousPage={hasPreviousPage}
            hasNextPage={hasNextPage}
            onPageChange={goToPage}
            onPageSizeChange={setPageSize}
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar el parámetro "{toDelete?.name}"? Si algún proceso del backend lo lee, podría fallar o usar su valor por defecto.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
