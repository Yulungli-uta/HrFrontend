// src/pages/Institutions.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Edit, Trash2, Search, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InstitucionesAPI, PaisesAPI, ProvinciasAPI, CantonesAPI, TiposReferenciaAPI } from "@/lib/api";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { parseApiError } from "@/lib/error-handling";
import { logger } from "@/lib/logger";

interface Institution {
  institutionId?: number;
  name: string;
  institutionTypeId: number;
  countryId: string;
  provinceId: string;
  cantonId: string;
}

const emptyInstitution: Institution = {
  name: "",
  institutionTypeId: 0,
  countryId: "",
  provinceId: "",
  cantonId: "",
};

const responseArray = (res: unknown): any[] => {
  if (Array.isArray((res as any)?.data)) return (res as any).data;
  if ((res as any)?.status === "success") return (res as any).data ?? [];
  return [];
};

export default function InstitutionsPage() {
  const { toast } = useToast();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Institution | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Institution | null>(null);
  const [form, setForm] = useState<Institution>(emptyInstitution);
  const [searchTerm, setSearchTerm] = useState("");

  const [institutionTypes, setInstitutionTypes] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cantons, setCantons] = useState<any[]>([]);

  const load = async () => {
    try {
      setIsLoading(true);
      const res = await InstitucionesAPI.list();
      setInstitutions(res.status === "success" ? (res.data ?? []) : []);
    } catch (error) {
      logger.error("Institutions", "Error cargando instituciones", error);
      toast({ title: "Error", description: "No se pudieron cargar las instituciones", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.INSTITUTION_TYPE).then((r) => {
      if (r.status === "success") setInstitutionTypes((r.data ?? []).filter((t: any) => t.isActive));
    });
    PaisesAPI.list().then((r) => setCountries(r.status === "success" ? (r.data ?? []) : []));
  }, []);

  useEffect(() => {
    if (!form.countryId) {
      setProvinces([]);
      return;
    }
    ProvinciasAPI.getByCountry(form.countryId as any).then((r) => setProvinces(responseArray(r)));
  }, [form.countryId]);

  useEffect(() => {
    if (!form.provinceId) {
      setCantons([]);
      return;
    }
    CantonesAPI.getByProvince(form.provinceId as any).then((r) => setCantons(responseArray(r)));
  }, [form.provinceId]);

  const filtered = useMemo(() => {
    if (!searchTerm) return institutions;
    const q = searchTerm.toLowerCase();
    return institutions.filter((i) => i.name.toLowerCase().includes(q));
  }, [institutions, searchTerm]);

  const typeName = (id: number) => institutionTypes.find((t) => (t.typeID ?? t.typeId) === id)?.name ?? "—";
  const countryName = (id: string) => countries.find((c) => c.countryId === id)?.countryName ?? "—";

  const handleSave = async () => {
    if (!form.name || !form.institutionTypeId || !form.countryId || !form.provinceId || !form.cantonId) {
      toast({ title: "Datos incompletos", description: "Nombre, tipo, país, provincia y cantón son requeridos", variant: "destructive" });
      return;
    }
    try {
      const payload = { ...form };
      const res = editing
        ? await InstitucionesAPI.update(editing.institutionId!, payload)
        : await InstitucionesAPI.create(payload);
      if (res.status !== "success") throw new Error(res.error?.message || "No se pudo guardar la institución");
      toast({ title: "Éxito", description: editing ? "Institución actualizada" : "Institución creada" });
      closeDialog();
      await load();
    } catch (error) {
      logger.error("Institutions", "Error guardando institución", error);
      toast({ title: "Error", description: parseApiError(error).message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!toDelete?.institutionId) return;
    try {
      const res = await InstitucionesAPI.remove(toDelete.institutionId);
      if (res.status !== "success") throw new Error(res.error?.message || "No se pudo eliminar");
      toast({ title: "Éxito", description: "Institución eliminada" });
      setIsDeleteOpen(false);
      setToDelete(null);
      await load();
    } catch (error) {
      logger.error("Institutions", "Error eliminando institución", error);
      toast({ title: "Error", description: parseApiError(error).message, variant: "destructive" });
    }
  };

  const openEdit = (inst: Institution) => {
    setEditing(inst);
    setForm({ ...inst });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditing(null);
    setForm(emptyInstitution);
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
          <h1 className="text-3xl font-bold text-foreground">Instituciones</h1>
          <p className="text-muted-foreground mt-2">
            Catálogo de instituciones (educativas, laborales, etc.) usado por Niveles de Educación y otros módulos de hoja de vida.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(o) => (o ? setIsDialogOpen(true) : closeDialog())}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Institución
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Institución" : "Nueva Institución"}</DialogTitle>
              <DialogDescription>Complete los datos de la institución.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Universidad Técnica de Ambato" />
              </div>

              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.institutionTypeId ? String(form.institutionTypeId) : ""} onValueChange={(v) => setForm({ ...form, institutionTypeId: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                  <SelectContent>
                    {institutionTypes.map((t) => (
                      <SelectItem key={t.typeID ?? t.typeId} value={String(t.typeID ?? t.typeId)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>País *</Label>
                  <Select value={form.countryId} onValueChange={(v) => setForm({ ...form, countryId: v, provinceId: "", cantonId: "" })}>
                    <SelectTrigger><SelectValue placeholder="País" /></SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.countryId} value={c.countryId}>{c.countryName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Provincia *</Label>
                  <Select value={form.provinceId} onValueChange={(v) => setForm({ ...form, provinceId: v, cantonId: "" })} disabled={!form.countryId}>
                    <SelectTrigger><SelectValue placeholder="Provincia" /></SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p.provinceId} value={p.provinceId}>{p.provinceName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cantón *</Label>
                  <Select value={form.cantonId} onValueChange={(v) => setForm({ ...form, cantonId: v })} disabled={!form.provinceId}>
                    <SelectTrigger><SelectValue placeholder="Cantón" /></SelectTrigger>
                    <SelectContent>
                      {cantons.map((c) => (
                        <SelectItem key={c.cantonId} value={c.cantonId}>{c.cantonName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              <CardTitle>Instituciones registradas</CardTitle>
              <CardDescription>{institutions.length} en total</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nombre..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inst) => (
                  <TableRow key={inst.institutionId}>
                    <TableCell className="font-medium">{inst.name}</TableCell>
                    <TableCell><Badge variant="outline">{typeName(inst.institutionTypeId)}</Badge></TableCell>
                    <TableCell>{countryName(inst.countryId)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(inst)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => { setToDelete(inst); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No hay instituciones registradas.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar "{toDelete?.name}"? Esta acción no se puede deshacer.
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
