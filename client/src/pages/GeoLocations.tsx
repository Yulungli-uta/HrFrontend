// src/pages/GeoLocations.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus, Edit, Trash2, Search, RefreshCw, Globe, MapPin, Landmark,
  ChevronRight, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PaisesAPI, ProvinciasAPI, CantonesAPI } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { parseApiError } from "@/lib/error-handling";
import { logger } from "@/lib/logger";

interface Country { countryId: string; countryName: string; }
interface Province { provinceId: string; countryId: string; provinceName: string; }
interface Canton { cantonId: string; provinceId: string; cantonName: string; }

type Kind = "country" | "province" | "canton";

export default function GeoLocationsPage() {
  const { toast } = useToast();
  const [countries, setCountries] = useState<Country[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cantons, setCantons] = useState<Canton[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);

  const [searchCountry, setSearchCountry] = useState("");
  const [searchProvince, setSearchProvince] = useState("");
  const [searchCanton, setSearchCanton] = useState("");

  const [dialogKind, setDialogKind] = useState<Kind | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: Kind; id: string; label: string } | null>(null);

  const load = async () => {
    try {
      setIsLoading(true);
      const [c, p, ca] = await Promise.all([PaisesAPI.list(), ProvinciasAPI.list(), CantonesAPI.list()]);
      setCountries(c.status === "success" ? c.data ?? [] : []);
      setProvinces(p.status === "success" ? p.data ?? [] : []);
      setCantons(ca.status === "success" ? ca.data ?? [] : []);
    } catch (error) {
      logger.error("GeoLocations", "Error cargando ubicaciones geográficas", error);
      toast({ title: "Error", description: "No se pudieron cargar los datos geográficos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedCountry = countries.find((c) => c.countryId === selectedCountryId) ?? null;
  const selectedProvince = provinces.find((p) => p.provinceId === selectedProvinceId) ?? null;

  const provincesOfSelectedCountry = useMemo(
    () => (selectedCountryId ? provinces.filter((p) => p.countryId === selectedCountryId) : []),
    [provinces, selectedCountryId]
  );
  const cantonsOfSelectedProvince = useMemo(
    () => (selectedProvinceId ? cantons.filter((c) => c.provinceId === selectedProvinceId) : []),
    [cantons, selectedProvinceId]
  );

  const provinceCountOf = (countryId: string) => provinces.filter((p) => p.countryId === countryId).length;
  const cantonCountOf = (provinceId: string) => cantons.filter((c) => c.provinceId === provinceId).length;

  // CountryId/ProvinceId/CantonId son claves string compuestas y NO se autogeneran en el backend
  // (confirmado: sin ValueGeneratedOnAdd en la config EF). Convención real en BD:
  // País = 3 dígitos secuenciales ("001".."219"); Provincia = CountryId + 2 dígitos secuenciales;
  // Cantón = ProvinceId + 2 dígitos secuenciales. Se replica esa convención aquí.
  const nextCountryId = () => {
    const max = countries.reduce((m, c) => Math.max(m, parseInt(c.countryId, 10) || 0), 0);
    return String(max + 1).padStart(3, "0");
  };
  const nextProvinceId = (countryId: string) => {
    const siblings = provinces.filter((p) => p.countryId === countryId);
    const maxSeq = siblings.reduce((m, p) => Math.max(m, parseInt(p.provinceId.slice(3), 10) || 0), 0);
    return `${countryId}${String(maxSeq + 1).padStart(2, "0")}`;
  };
  const nextCantonId = (provinceId: string) => {
    const siblings = cantons.filter((c) => c.provinceId === provinceId);
    const maxSeq = siblings.reduce((m, c) => Math.max(m, parseInt(c.cantonId.slice(provinceId.length), 10) || 0), 0);
    return `${provinceId}${String(maxSeq + 1).padStart(2, "0")}`;
  };

  const filteredCountries = useMemo(
    () => countries.filter((c) => c.countryName.toLowerCase().includes(searchCountry.toLowerCase())),
    [countries, searchCountry]
  );
  const filteredProvinces = useMemo(
    () => provincesOfSelectedCountry.filter((p) => p.provinceName.toLowerCase().includes(searchProvince.toLowerCase())),
    [provincesOfSelectedCountry, searchProvince]
  );
  const filteredCantons = useMemo(
    () => cantonsOfSelectedProvince.filter((c) => c.cantonName.toLowerCase().includes(searchCanton.toLowerCase())),
    [cantonsOfSelectedProvince, searchCanton]
  );

  const selectCountry = (id: string) => {
    setSelectedCountryId(id);
    setSelectedProvinceId(null);
    setSearchProvince("");
    setSearchCanton("");
  };
  const selectProvince = (id: string) => {
    setSelectedProvinceId(id);
    setSearchCanton("");
  };

  const openCreate = (kind: Kind) => {
    setDialogKind(kind);
    setEditingId(null);
    setForm(kind === "province" ? { countryId: selectedCountryId } : kind === "canton" ? { provinceId: selectedProvinceId } : {});
  };

  const openEdit = (kind: Kind, item: any) => {
    setDialogKind(kind);
    if (kind === "country") { setEditingId(item.countryId); setForm({ countryName: item.countryName }); }
    if (kind === "province") { setEditingId(item.provinceId); setForm({ provinceName: item.provinceName, countryId: item.countryId }); }
    if (kind === "canton") { setEditingId(item.cantonId); setForm({ cantonName: item.cantonName, provinceId: item.provinceId }); }
  };

  const closeDialog = () => {
    setDialogKind(null);
    setEditingId(null);
    setForm({});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (dialogKind === "country") {
        if (!form.countryName) throw new Error("El nombre del país es requerido");
        const payload = editingId
          ? { countryName: form.countryName }
          : { countryId: nextCountryId(), countryName: form.countryName };
        const res = editingId ? await PaisesAPI.update(editingId, payload) : await PaisesAPI.create(payload);
        if (res.status !== "success") throw new Error(res.error?.message || "No se pudo guardar el país");
      } else if (dialogKind === "province") {
        if (!form.provinceName || !form.countryId) throw new Error("Nombre y país son requeridos");
        const payload = editingId
          ? { provinceName: form.provinceName, countryId: form.countryId }
          : { provinceId: nextProvinceId(form.countryId), provinceName: form.provinceName, countryId: form.countryId };
        const res = editingId ? await ProvinciasAPI.update(editingId, payload) : await ProvinciasAPI.create(payload);
        if (res.status !== "success") throw new Error(res.error?.message || "No se pudo guardar la provincia");
      } else if (dialogKind === "canton") {
        if (!form.cantonName || !form.provinceId) throw new Error("Nombre y provincia son requeridos");
        const payload = editingId
          ? { cantonName: form.cantonName, provinceId: form.provinceId }
          : { cantonId: nextCantonId(form.provinceId), cantonName: form.cantonName, provinceId: form.provinceId };
        const res = editingId ? await CantonesAPI.update(editingId, payload) : await CantonesAPI.create(payload);
        if (res.status !== "success") throw new Error(res.error?.message || "No se pudo guardar el cantón");
      }
      toast({ title: "Guardado", description: "Los cambios se guardaron correctamente." });
      closeDialog();
      await load();
    } catch (error) {
      logger.error("GeoLocations", "Error guardando", error);
      toast({ title: "Error", description: parseApiError(error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res =
        deleteTarget.kind === "country" ? await PaisesAPI.remove(deleteTarget.id)
        : deleteTarget.kind === "province" ? await ProvinciasAPI.remove(deleteTarget.id)
        : await CantonesAPI.remove(deleteTarget.id);
      if (res.status !== "success") throw new Error(res.error?.message || "No se pudo eliminar");
      toast({ title: "Eliminado", description: "El registro se eliminó correctamente." });
      if (deleteTarget.kind === "country" && deleteTarget.id === selectedCountryId) { setSelectedCountryId(null); setSelectedProvinceId(null); }
      if (deleteTarget.kind === "province" && deleteTarget.id === selectedProvinceId) setSelectedProvinceId(null);
      setDeleteTarget(null);
      await load();
    } catch (error) {
      logger.error("GeoLocations", "Error eliminando", error);
      toast({ title: "Error", description: parseApiError(error).message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ubicaciones Geográficas</h1>
          <p className="text-muted-foreground mt-2">
            Países, provincias y cantones — usados en direcciones, instituciones y hoja de vida.
          </p>
        </div>
        <div className="flex gap-3">
          <StatPill icon={Globe} label="Países" value={countries.length} />
          <StatPill icon={MapPin} label="Provincias" value={provinces.length} />
          <StatPill icon={Landmark} label="Cantones" value={cantons.length} />
          <Button variant="outline" size="icon" onClick={load} title="Refrescar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Breadcrumb de selección */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-h-6">
        <span className={cn("font-medium", selectedCountry && "text-foreground")}>
          {selectedCountry ? selectedCountry.countryName : "Selecciona un país"}
        </span>
        {selectedCountry && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className={cn("font-medium", selectedProvince && "text-foreground")}>
              {selectedProvince ? selectedProvince.provinceName : "Selecciona una provincia"}
            </span>
          </>
        )}
      </div>

      {/* Explorador de 3 columnas */}
      <Card className="overflow-hidden p-0">
        <ResizablePanelGroup direction="horizontal" className="min-h-[560px]">
          <ResizablePanel defaultSize={33} minSize={20}>
            <GeoColumn
              icon={Globe}
              title="Países"
              count={filteredCountries.length}
              searchValue={searchCountry}
              onSearchChange={setSearchCountry}
              onAdd={() => openCreate("country")}
              addLabel="Nuevo país"
            >
              {filteredCountries.length === 0 ? (
                <ColumnEmptyState icon={Globe} text="No hay países registrados." />
              ) : (
                filteredCountries.map((c) => (
                  <GeoRow
                    key={c.countryId}
                    label={c.countryName}
                    sublabel={`${provinceCountOf(c.countryId)} provincia${provinceCountOf(c.countryId) === 1 ? "" : "s"}`}
                    selected={c.countryId === selectedCountryId}
                    onClick={() => selectCountry(c.countryId)}
                    onEdit={() => openEdit("country", c)}
                    onDelete={() => setDeleteTarget({ kind: "country", id: c.countryId, label: c.countryName })}
                    hasChildren
                  />
                ))
              )}
            </GeoColumn>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={33} minSize={20}>
            <GeoColumn
              icon={MapPin}
              title="Provincias"
              count={filteredProvinces.length}
              searchValue={searchProvince}
              onSearchChange={setSearchProvince}
              onAdd={() => openCreate("province")}
              addLabel="Nueva provincia"
              addDisabled={!selectedCountryId}
            >
              {!selectedCountryId ? (
                <ColumnEmptyState icon={MapPin} text="Selecciona un país para ver sus provincias." />
              ) : filteredProvinces.length === 0 ? (
                <ColumnEmptyState icon={MapPin} text="Este país no tiene provincias registradas." />
              ) : (
                filteredProvinces.map((p) => (
                  <GeoRow
                    key={p.provinceId}
                    label={p.provinceName}
                    sublabel={`${cantonCountOf(p.provinceId)} cantón${cantonCountOf(p.provinceId) === 1 ? "" : "es"}`}
                    selected={p.provinceId === selectedProvinceId}
                    onClick={() => selectProvince(p.provinceId)}
                    onEdit={() => openEdit("province", p)}
                    onDelete={() => setDeleteTarget({ kind: "province", id: p.provinceId, label: p.provinceName })}
                    hasChildren
                  />
                ))
              )}
            </GeoColumn>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={34} minSize={20}>
            <GeoColumn
              icon={Landmark}
              title="Cantones"
              count={filteredCantons.length}
              searchValue={searchCanton}
              onSearchChange={setSearchCanton}
              onAdd={() => openCreate("canton")}
              addLabel="Nuevo cantón"
              addDisabled={!selectedProvinceId}
            >
              {!selectedProvinceId ? (
                <ColumnEmptyState icon={Landmark} text="Selecciona una provincia para ver sus cantones." />
              ) : filteredCantons.length === 0 ? (
                <ColumnEmptyState icon={Landmark} text="Esta provincia no tiene cantones registrados." />
              ) : (
                filteredCantons.map((c) => (
                  <GeoRow
                    key={c.cantonId}
                    label={c.cantonName}
                    selected={false}
                    onClick={() => {}}
                    onEdit={() => openEdit("canton", c)}
                    onDelete={() => setDeleteTarget({ kind: "canton", id: c.cantonId, label: c.cantonName })}
                  />
                ))
              )}
            </GeoColumn>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Card>

      {/* Diálogo crear/editar */}
      <Dialog open={dialogKind !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar" : "Nuevo"} {dialogKind === "country" ? "país" : dialogKind === "province" ? "provincia" : "cantón"}
            </DialogTitle>
            <DialogDescription>Complete los datos requeridos.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {dialogKind === "country" && (
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input autoFocus value={form.countryName ?? ""} onChange={(e) => setForm({ ...form, countryName: e.target.value })} placeholder="Ej: ECUADOR" />
              </div>
            )}

            {dialogKind === "province" && (
              <>
                <div className="space-y-2">
                  <Label>País *</Label>
                  <Select value={form.countryId ?? ""} onValueChange={(v) => setForm({ ...form, countryId: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar país" /></SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => <SelectItem key={c.countryId} value={c.countryId}>{c.countryName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input autoFocus value={form.provinceName ?? ""} onChange={(e) => setForm({ ...form, provinceName: e.target.value })} placeholder="Ej: TUNGURAHUA" />
                </div>
              </>
            )}

            {dialogKind === "canton" && (
              <>
                <div className="space-y-2">
                  <Label>Provincia *</Label>
                  <Select value={form.provinceId ?? ""} onValueChange={(v) => setForm({ ...form, provinceId: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => <SelectItem key={p.provinceId} value={p.provinceId}>{p.provinceName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input autoFocus value={form.cantonName ?? ""} onChange={(e) => setForm({ ...form, cantonName: e.target.value })} placeholder="Ej: AMBATO" />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingId ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar "{deleteTarget?.label}"? Si tiene provincias/cantones dependientes, elimínalos primero.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatPill({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
      <Icon className="h-4 w-4 text-primary" />
      <div className="leading-none">
        <div className="text-sm font-bold text-foreground">{value}</div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function GeoColumn({
  icon: Icon,
  title,
  count,
  searchValue,
  onSearchChange,
  onAdd,
  addLabel,
  addDisabled,
  children,
}: {
  icon: any;
  title: string;
  count: number;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onAdd: () => void;
  addLabel: string;
  addDisabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-sm truncate">{title}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">{count}</Badge>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={onAdd}
          disabled={addDisabled}
          title={addLabel}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="border-b px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar..."
            className="h-7 pl-7 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">{children}</div>
      </ScrollArea>
    </div>
  );
}

function GeoRow({
  label,
  sublabel,
  selected,
  onClick,
  onEdit,
  onDelete,
  hasChildren,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  hasChildren?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-center justify-between gap-2 rounded-md px-2.5 py-2 cursor-pointer transition-colors",
        selected ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
      )}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{label}</div>
        {sublabel && <div className="text-[11px] text-muted-foreground">{sublabel}</div>}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-background/80 transition-opacity"
          title="Editar"
        >
          <Edit className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-destructive/10 transition-opacity"
          title="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
        {hasChildren && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 ml-0.5" />}
      </div>
    </div>
  );
}

function ColumnEmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="text-center py-10 text-muted-foreground px-4">
      <Icon className="mx-auto h-8 w-8 mb-3 opacity-40" />
      <p className="text-xs">{text}</p>
    </div>
  );
}
