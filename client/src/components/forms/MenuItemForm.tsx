// src/components/forms/MenuItemForm.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users, LayoutDashboard, Clock, CalendarCheck, DollarSign, Building2,
  FileText, Settings, Calendar, ClipboardList, UserCog, Timer, LogOut,
  Folder, Bell, ShieldCheck, HardHat, ClipboardCheck, FileCheck, FileWarning,
  FileSignature, FileSearch, FileClock, FileSpreadsheet, FilePlus, User,
  Briefcase, BadgeCheck, Handshake, GraduationCap, BookOpen, PenSquare,
  Clipboard, AlarmClock, CalendarDays, CalendarX, CalendarPlus, CalendarSearch,
  CalendarClock, Cog, Info, HelpCircle, MessageSquare, Settings2, Layers,
  ChartLine, Search, MapPin, Shield, UserCheck, Home, Activity, BarChart2,
  List, Lock, Tag, Archive, UserPlus, Mail, Globe, Star, AlertTriangle,
  CheckCircle, Package, Truck, Wrench, Database, Server, Code, Key,
  RefreshCw, Download, Upload, ChevronsUpDown, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MenuItemsAPI } from "@/lib/api";
import type { ApiResponse } from "@/lib/api";
import type { MenuItem } from "@/features/auth";
import { parseApiError } from '@/lib/error-handling';
import { cn } from "@/lib/utils";

// ─── Mapa completo de iconos disponibles ──────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Dashboard: LayoutDashboard, Users, Clock, CalendarCheck, DollarSign,
  Building2, FileText, Settings, Calendar, ClipboardList, UserCog, Timer,
  LogOut, Bell, ShieldCheck, HardHat, ClipboardCheck, FileCheck, FileWarning,
  FileSignature, FileSearch, FileClock, FileSpreadsheet, FilePlus, User,
  Briefcase, BadgeCheck, Handshake, GraduationCap, BookOpen, PenSquare,
  Clipboard, AlarmClock, CalendarDays, CalendarX, CalendarPlus, CalendarSearch,
  CalendarClock, Cog, Info, HelpCircle, MessageSquare, Settings2, Layers,
  ChartLine, Folder, Search, MapPin, Shield, UserCheck, Home, Activity,
  BarChart2, List, Lock, Tag, Archive, UserPlus, Mail, Globe, Star,
  AlertTriangle, CheckCircle, Package, Truck, Wrench, Database, Server,
  Code, Key, RefreshCw, Download, Upload,
};

const ICON_LIST = Object.entries(ICON_MAP).map(([name, Icon]) => ({ name, Icon }));

// ─── Selector de icono ────────────────────────────────────────────────────────

function IconPickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return term ? ICON_LIST.filter(({ name }) => name.toLowerCase().includes(term)) : ICON_LIST;
  }, [search]);

  const CurrentIcon = value ? ICON_MAP[value] : null;

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <>
      {/* Trigger */}
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between font-normal h-10"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2 min-w-0">
          {CurrentIcon
            ? <CurrentIcon className="h-4 w-4 shrink-0 text-primary" />
            : <span className="h-4 w-4 shrink-0 rounded border border-dashed border-muted-foreground/40" />}
          <span className={cn("truncate text-sm", !value && "text-muted-foreground")}>
            {value || "— Sin icono —"}
          </span>
        </span>
        <span className="flex items-center gap-1 shrink-0 ml-2">
          {value && (
            <X
              className="h-3.5 w-3.5 opacity-40 hover:opacity-100"
              onClick={handleClear}
            />
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
        </span>
      </Button>

      {/* Picker dialog */}
      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setSearch(""); }}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Seleccionar icono</DialogTitle>
          </DialogHeader>

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar icono…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-5 gap-1.5 max-h-64 overflow-y-auto pr-1">
            {filtered.map(({ name, Icon }) => (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => handleSelect(name)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all",
                  "hover:bg-accent hover:border-accent-foreground/20",
                  value === name
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-transparent"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate w-full text-center leading-tight text-[10px]">
                  {name}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-5 text-center text-sm text-muted-foreground py-6">
                Sin coincidencias para "{search}".
              </p>
            )}
          </div>

          {/* Pie: icono actualmente seleccionado */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              {value
                ? <>Seleccionado: <strong>{value}</strong></>
                : <span className="italic">Ninguno seleccionado</span>}
            </span>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => { onChange(""); setOpen(false); }}>
                Quitar icono
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function coerceToArray<T = any>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    // @ts-ignore
    if (Array.isArray(payload.items)) return payload.items as T[];
    // @ts-ignore
    if (Array.isArray(payload.results)) return payload.results as T[];
    // @ts-ignore
    if (Array.isArray(payload.data)) return payload.data as T[];
    const values = Object.values(payload);
    if (values.length && values.every((v) => v && typeof v === "object")) return values as T[];
  }
  return [];
}

const PARENT_NONE   = "none";
const MODULE_NONE   = "__mod_none__";
const MODULE_CUSTOM = "__mod_custom__";

// ─── Ruta de ancestros ────────────────────────────────────────────────────────

/** Construye un mapa { id → ruta completa } y { id → nivel } desde lista plana */
function buildAncestorMaps(items: MenuItem[]): {
  pathMap: Map<number, string>;
  levelMap: Map<number, number>;
} {
  const byId = new Map<number, MenuItem>();
  for (const it of items) {
    const id = Number((it as any).id);
    if (Number.isFinite(id)) byId.set(id, it);
  }

  const pathMap  = new Map<number, string>();
  const levelMap = new Map<number, number>();

  const resolve = (id: number, visited = new Set<number>()): { path: string; level: number } => {
    if (pathMap.has(id)) return { path: pathMap.get(id)!, level: levelMap.get(id)! };
    if (visited.has(id)) return { path: String(id), level: 0 }; // ciclo — evitar loop infinito

    visited.add(id);
    const item = byId.get(id);
    if (!item) return { path: `#${id}`, level: 0 };

    const name     = (item.name ?? `#${id}`).trim();
    const parentId = (item as any).parentId;
    const pid      = parentId === null || parentId === undefined ? null : Number(parentId);

    if (pid === null || !Number.isFinite(pid) || !byId.has(pid)) {
      pathMap.set(id, name);
      levelMap.set(id, 0);
      return { path: name, level: 0 };
    }

    const parent = resolve(pid, visited);
    const full   = `${parent.path} › ${name}`;
    const level  = parent.level + 1;
    pathMap.set(id, full);
    levelMap.set(id, level);
    return { path: full, level };
  };

  for (const id of Array.from(byId.keys())) resolve(id);
  return { pathMap, levelMap };
}

const LEVEL_LABEL: Record<number, string> = { 0: "Raíz", 1: "Nivel 1", 2: "Nivel 2", 3: "Nivel 3" };

// ─── Selector de padre con jerarquía ─────────────────────────────────────────

type ParentOption = { id: number; name: string; fullPath: string; level: number };

function ParentPicker({
  value,
  onChange,
  options,
  loading,
}: {
  value: string;           // PARENT_NONE o id string
  onChange: (v: string) => void;
  options: ParentOption[];
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selected = value !== PARENT_NONE
    ? options.find((o) => String(o.id) === value)
    : null;

  const triggerLabel = selected ? selected.name : "-- Sin padre --";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={loading}
        >
          <span className="flex items-center gap-2 min-w-0">
            {selected && (
              <Badge variant="outline" className="shrink-0 text-[10px] py-0 px-1.5">
                {LEVEL_LABEL[selected.level] ?? `Nivel ${selected.level}`}
              </Badge>
            )}
            <span className={cn("truncate text-sm", !selected && "text-muted-foreground")}>
              {loading ? "Cargando..." : triggerLabel}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nombre o ruta…" />
          <CommandEmpty>Sin coincidencias</CommandEmpty>

          <CommandGroup className="max-h-72 overflow-y-auto">
            {/* Opción "Sin padre" */}
            <CommandItem
              value="Sin padre raíz"
              onSelect={() => { onChange(PARENT_NONE); setOpen(false); }}
            >
              <Check className={cn("mr-2 h-4 w-4 shrink-0", value === PARENT_NONE ? "opacity-100" : "opacity-0")} />
              <span className="text-muted-foreground italic text-sm">-- Sin padre (raíz) --</span>
            </CommandItem>

            {options.map((opt) => (
              <CommandItem
                key={opt.id}
                value={opt.fullPath}          // cmdk filtra por este texto
                onSelect={() => { onChange(String(opt.id)); setOpen(false); }}
                className="flex flex-col items-start gap-0.5 py-2"
              >
                <div className="flex items-center gap-2 w-full">
                  <Check className={cn("h-4 w-4 shrink-0", String(opt.id) === value ? "opacity-100" : "opacity-0")} />
                  {/* sangría proporcional al nivel */}
                  <span style={{ paddingLeft: `${opt.level * 14}px` }} className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant={opt.level === 0 ? "default" : "outline"}
                      className="shrink-0 text-[10px] py-0 px-1.5"
                    >
                      {LEVEL_LABEL[opt.level] ?? `Nivel ${opt.level}`}
                    </Badge>
                    <span className="font-medium text-sm truncate">{opt.name}</span>
                  </span>
                </div>
                {/* ruta completa como subtexto, solo si tiene padre */}
                {opt.level > 0 && (
                  <p className="pl-8 text-[11px] text-muted-foreground truncate w-full">
                    {opt.fullPath}
                  </p>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const normalizeParentId = (v: string | number | null | undefined) => {
  if (v === PARENT_NONE || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const safeSelectValue = (value: string, options: Array<{ id: number | string }>) => {
  if (value === PARENT_NONE || !value) return PARENT_NONE;
  const exists = options.some((o) => String(o.id) === String(value));
  return exists ? value : PARENT_NONE;
};

// ─── Formulario principal ─────────────────────────────────────────────────────

type Props = {
  menuItem: MenuItem | null;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function MenuItemForm({ menuItem, onSuccess, onCancel }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: parents = [], isLoading: loadingParents } = useQuery<
    ApiResponse<unknown>,
    Error,
    MenuItem[]
  >({
    queryKey: ["menu-items", "for-parent-dropdown"],
    queryFn: async () => MenuItemsAPI.list(1, 10000),
    select: (res) => {
      if (!res) return [];
      // @ts-ignore
      if ("status" in res && res.status !== "success") return [];
      // @ts-ignore
      return coerceToArray<MenuItem>(res.data);
    },
    staleTime: 30_000,
  });

  const [name,       setName]       = useState(menuItem?.name ?? "");
  const [url,        setUrl]        = useState(menuItem?.url ?? "");
  const [icon,       setIcon]       = useState(menuItem?.icon ?? "");
  const [moduleName, setModuleName] = useState(menuItem?.moduleName ?? "");
  const [moduleMode, setModuleMode] = useState<"select" | "custom">("select");
  const [isVisible,  setIsVisible]  = useState<boolean>(menuItem?.isVisible ?? true);
  const [parentId,   setParentId]   = useState<string>(
    menuItem?.parentId === null || menuItem?.parentId === undefined
      ? PARENT_NONE
      : String(menuItem.parentId)
  );

  const moduleOptions = useMemo(() => {
    const names = parents
      .map((p) => p.moduleName)
      .filter((m): m is string => typeof m === "string" && m.trim() !== "");
    return Array.from(new Set(names)).sort();
  }, [parents]);

  const autoOrder = useMemo(() => {
    const sibParentId = normalizeParentId(parentId);
    const siblings = parents.filter((p) => {
      if (menuItem?.id && Number(p.id) === Number(menuItem.id)) return false;
      const pParentId = p.parentId === null || p.parentId === undefined ? null : Number(p.parentId);
      return pParentId === sibParentId;
    });
    const maxOrder = siblings.length > 0 ? Math.max(...siblings.map((s) => s.order ?? 0)) : -1;
    return maxOrder + 1;
  }, [parents, parentId, menuItem?.id]);

  const moduleModeSetRef = useRef(false);

  useEffect(() => {
    setName(menuItem?.name ?? "");
    setUrl(menuItem?.url ?? "");
    setIcon(menuItem?.icon ?? "");
    setModuleName(menuItem?.moduleName ?? "");
    setIsVisible(menuItem?.isVisible ?? true);
    setParentId(
      menuItem?.parentId === null || menuItem?.parentId === undefined
        ? PARENT_NONE
        : String(menuItem.parentId)
    );
    moduleModeSetRef.current = false;
  }, [menuItem?.id]);

  useEffect(() => {
    if (loadingParents || moduleModeSetRef.current) return;
    moduleModeSetRef.current = true;
    const current = menuItem?.moduleName?.trim() ?? "";
    setModuleMode(current && !moduleOptions.includes(current) ? "custom" : "select");
  }, [loadingParents, moduleOptions.length, menuItem?.id]);

  const parentOptions = useMemo<ParentOption[]>(() => {
    const currentId = menuItem?.id ? Number(menuItem.id) : null;
    const eligible  = parents.filter((p) => (currentId ? Number(p.id) !== currentId : true));

    const { pathMap, levelMap } = buildAncestorMaps(eligible);

    return eligible
      .map((p) => {
        const id = Number((p as any).id);
        return {
          id,
          name:     (p.name ?? "").trim() || `#${id}`,
          fullPath: pathMap.get(id) ?? (p.name ?? `#${id}`),
          level:    levelMap.get(id) ?? 0,
        };
      })
      // Ordenar por ruta completa para que el árbol quede agrupado
      .sort((a, b) => a.fullPath.localeCompare(b.fullPath));
  }, [parents, menuItem?.id]);

  useEffect(() => {
    setParentId((prev) => safeSelectValue(prev, parentOptions));
  }, [parentOptions]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("El nombre es obligatorio.");
      const payload = {
        name: name.trim(),
        url: url.trim() || null,
        icon: icon.trim() || null,
        order: autoOrder,
        moduleName: moduleName.trim() || null,
        isVisible: Boolean(isVisible),
        parentId: normalizeParentId(parentId),
      };
      // @ts-ignore
      return MenuItemsAPI.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      toast({ title: "Item creado", description: "El item de menú se creó correctamente." });
      onSuccess();
    },
    onError: (err: unknown) => {
      toast({ title: "Error", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!menuItem?.id) throw new Error("ID no válido para actualizar.");
      if (!name.trim()) throw new Error("El nombre es obligatorio.");
      const payload = {
        name: name.trim(),
        url: url.trim() || null,
        icon: icon.trim() || null,
        order: menuItem.order ?? 0,
        moduleName: moduleName.trim() || null,
        isVisible: Boolean(isVisible),
        parentId: normalizeParentId(parentId),
      };
      // @ts-ignore
      return MenuItemsAPI.update(Number(menuItem.id), payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      toast({ title: "Item actualizado", description: "El item de menú se actualizó correctamente." });
      onSuccess();
    },
    onError: (err: unknown) => {
      toast({ title: "Error", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (menuItem?.id) updateMutation.mutate();
    else createMutation.mutate();
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card className="border-0 shadow-none">
        <CardContent className="p-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>

            {/* Icono — selector visual */}
            <div className="space-y-2">
              <Label>Icono</Label>
              <IconPickerField value={icon} onChange={setIcon} />
            </div>

            {/* Módulo */}
            <div className="space-y-2">
              <Label>Módulo</Label>
              {moduleMode === "custom" ? (
                <div className="flex gap-2">
                  <Input
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    placeholder="Nombre del módulo"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setModuleMode("select");
                      if (!moduleOptions.includes(moduleName)) setModuleName("");
                    }}
                  >
                    ← Lista
                  </Button>
                </div>
              ) : (
                <Select
                  value={moduleName && moduleOptions.includes(moduleName) ? moduleName : MODULE_NONE}
                  onValueChange={(v) => {
                    if (v === MODULE_CUSTOM) { setModuleMode("custom"); setModuleName(""); }
                    else if (v === MODULE_NONE) setModuleName("");
                    else setModuleName(v);
                  }}
                  disabled={loadingParents}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingParents ? "Cargando..." : "-- Sin módulo --"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MODULE_NONE}>-- Sin módulo --</SelectItem>
                    {moduleOptions.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                    <SelectItem value={MODULE_CUSTOM}>Personalizado...</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Visible */}
            <div className="space-y-2 flex items-center gap-3">
              <Checkbox
                id="isVisible"
                checked={!!isVisible}
                onCheckedChange={(v) => setIsVisible(Boolean(v))}
              />
              <Label htmlFor="isVisible">Visible</Label>
            </div>

            {/* Padre */}
            <div className="space-y-2 md:col-span-2">
              <Label>Padre</Label>
              <ParentPicker
                value={parentId}
                onChange={setParentId}
                options={parentOptions}
                loading={loadingParents}
              />
              {/* Ruta del padre seleccionado como confirmación visual */}
              {parentId !== PARENT_NONE && (() => {
                const sel = parentOptions.find((o) => String(o.id) === parentId);
                return sel ? (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <span className="opacity-60">Ruta:</span>
                    <span className="font-medium">{sel.fullPath}</span>
                  </p>
                ) : null;
              })()}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {menuItem?.id ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
