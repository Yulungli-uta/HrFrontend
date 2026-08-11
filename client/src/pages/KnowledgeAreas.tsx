// src/pages/KnowledgeAreas.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Edit, Trash2, Search, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AreaConocimientoAPI } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { parseApiError } from "@/lib/error-handling";
import { logger } from "@/lib/logger";

interface KnowledgeAreaItem {
  id?: number;
  code: string;
  name: string;
  parentId: number | null;
  levels: number;
  isActive: boolean;
}

const empty: KnowledgeAreaItem = { code: "", name: "", parentId: null, levels: 1, isActive: true };

export default function KnowledgeAreasPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<KnowledgeAreaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeAreaItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<KnowledgeAreaItem | null>(null);
  const [form, setForm] = useState<KnowledgeAreaItem>(empty);
  const [searchTerm, setSearchTerm] = useState("");

  // list() trae TODOS los niveles de una vez (mismo método que ya usa PublicationForm.tsx
  // para su selector en cascada) — los hijos se derivan filtrando por parentId en memoria,
  // no hace falta llamar byParentId por cada nodo.
  const load = async () => {
    try {
      setIsLoading(true);
      const res = await AreaConocimientoAPI.list();
      setItems(res.status === "success" ? (res.data ?? []) : []);
    } catch (error) {
      logger.error("KnowledgeAreas", "Error cargando áreas de conocimiento", error);
      toast({ title: "Error", description: "No se pudieron cargar las áreas de conocimiento", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm) return items;
    const q = searchTerm.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
  }, [items, searchTerm]);

  const parentName = (id: number | null) => (id ? items.find((i) => i.id === id)?.name ?? `#${id}` : "— (raíz)");

  // Candidatos a padre: cualquier item de nivel 1 o 2 (no permitir más de 3 niveles).
  const possibleParents = items.filter((i) => i.levels < 3);

  const handleSave = async () => {
    if (!form.code || !form.name) {
      toast({ title: "Datos incompletos", description: "Código y nombre son requeridos", variant: "destructive" });
      return;
    }
    try {
      const levels = form.parentId ? (items.find((i) => i.id === form.parentId)?.levels ?? 1) + 1 : 1;
      const payload = { ...form, levels };
      const res = editing
        ? await AreaConocimientoAPI.update(editing.id!, payload)
        : await AreaConocimientoAPI.create(payload);
      if (res.status !== "success") throw new Error(res.error?.message || "No se pudo guardar el área de conocimiento");
      toast({ title: "Éxito", description: editing ? "Área actualizada" : "Área creada" });
      closeDialog();
      await load();
    } catch (error) {
      logger.error("KnowledgeAreas", "Error guardando área de conocimiento", error);
      toast({ title: "Error", description: parseApiError(error).message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!toDelete?.id) return;
    try {
      const res = await AreaConocimientoAPI.remove(toDelete.id);
      if (res.status !== "success") throw new Error(res.error?.message || "No se pudo eliminar");
      toast({ title: "Éxito", description: "Área de conocimiento eliminada" });
      setIsDeleteOpen(false);
      setToDelete(null);
      await load();
    } catch (error) {
      logger.error("KnowledgeAreas", "Error eliminando área de conocimiento", error);
      toast({ title: "Error", description: parseApiError(error).message, variant: "destructive" });
    }
  };

  const openEdit = (item: KnowledgeAreaItem) => {
    setEditing(item);
    setForm({ ...item });
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
          <h1 className="text-3xl font-bold text-foreground">Áreas de Conocimiento</h1>
          <p className="text-muted-foreground mt-2">
            Catálogo jerárquico (hasta 3 niveles) usado en Publicaciones para clasificar la producción académica.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(o) => (o ? setIsDialogOpen(true) : closeDialog())}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Área
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Área de Conocimiento" : "Nueva Área de Conocimiento"}</DialogTitle>
              <DialogDescription>Deja "Área padre" vacío para crear un área de nivel 1 (raíz).</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Ej: ING" />
                </div>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Ingeniería" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Área padre (opcional)</Label>
                <Select value={form.parentId ? String(form.parentId) : "none"} onValueChange={(v) => setForm({ ...form, parentId: v === "none" ? null : Number(v) })}>
                  <SelectTrigger><SelectValue placeholder="Sin padre (nivel 1)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin padre (nivel 1)</SelectItem>
                    {possibleParents
                      .filter((p) => !editing || p.id !== editing.id)
                      .map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{"—".repeat(p.levels - 1)} {p.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
                <Label>Activa</Label>
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
              <CardTitle>Áreas registradas</CardTitle>
              <CardDescription>{items.length} en total (todos los niveles)</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nombre o código..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Padre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><Badge variant="outline">Nivel {item.levels}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{parentName(item.parentId)}</TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Activa" : "Inactiva"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(item)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => { setToDelete(item); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No hay áreas de conocimiento registradas.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar "{toDelete?.name}"? Si tiene sub-áreas, elimínalas primero.
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
