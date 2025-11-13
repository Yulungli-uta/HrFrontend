// src/components/forms/MenuItemForm.tsx
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MenuItemsAPI } from "@/lib/api/auth";
import type { ApiResponse } from "@/lib/api/client";
import type { MenuItem } from "@/types/auth";

type Props = {
  menuItem: MenuItem | null;
  onSuccess: () => void;
  onCancel: () => void;
};

// ---------- Utils de normalización ----------
function coerceToArray<T = any>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    // @ts-ignore
    if (Array.isArray(payload.items)) return payload.items as T[];
    // @ts-ignore
    if (Array.isArray(payload.results)) return payload.results as T[];
    // @ts-ignore
    if (Array.isArray(payload.data)) return payload.data as T[];
    // @ts-ignore
    const values = Object.values(payload);
    if (values.length && values.every((v) => v && typeof v === "object")) return values as T[];
  }
  return [];
}

const PARENT_NONE = "none"; // 👈 Sentinela Radix (no vacío)

const normalizeParentId = (v: string | number | null | undefined) => {
  if (v === PARENT_NONE || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const normalizeOrder = (v: string | number | undefined) => {
  if (v === "" || v === undefined || v === null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Si el valor actual no existe en opciones, mantenemos NONE (placeholder controlado)
const safeSelectValue = (value: string, options: Array<{ id: number | string }>) => {
  if (value === PARENT_NONE || !value) return PARENT_NONE;
  const exists = options.some((o) => String(o.id) === String(value));
  return exists ? value : PARENT_NONE;
};
// --------------------------------------------

export default function MenuItemForm({ menuItem, onSuccess, onCancel }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Cargar opciones de padre
  const { data: parents = [], isLoading: loadingParents } = useQuery<
    ApiResponse<unknown>,
    Error,
    MenuItem[]
  >({
    queryKey: ["menu-items", "for-parent-dropdown"],
    queryFn: async () => MenuItemsAPI.list(),
    select: (res) => {
      if (!res) return [];
      // @ts-ignore
      if ("status" in res && res.status !== "success") return [];
      // @ts-ignore
      return coerceToArray<MenuItem>(res.data);
    },
    staleTime: 30_000,
  });

  // Estado del form (con defaults seguros)
  const [name, setName] = useState(menuItem?.name ?? "");
  const [url, setUrl] = useState(menuItem?.url ?? "");
  const [icon, setIcon] = useState(menuItem?.icon ?? "");
  const [order, setOrder] = useState<string>(
    menuItem?.order !== undefined && menuItem?.order !== null ? String(menuItem.order) : "0"
  );
  const [moduleName, setModuleName] = useState(menuItem?.moduleName ?? "");
  const [isVisible, setIsVisible] = useState<boolean>(menuItem?.isVisible ?? true);

  // parentId en Select (usa sentinela "none", no cadenas vacías)
  const [parentId, setParentId] = useState<string>(
    menuItem?.parentId === null || menuItem?.parentId === undefined ? PARENT_NONE : String(menuItem.parentId)
  );

  // Reset al cambiar item editado
  useEffect(() => {
    setName(menuItem?.name ?? "");
    setUrl(menuItem?.url ?? "");
    setIcon(menuItem?.icon ?? "");
    setOrder(
      menuItem?.order !== undefined && menuItem?.order !== null ? String(menuItem.order) : "0"
    );
    setModuleName(menuItem?.moduleName ?? "");
    setIsVisible(menuItem?.isVisible ?? true);
    setParentId(
      menuItem?.parentId === null || menuItem?.parentId === undefined ? PARENT_NONE : String(menuItem.parentId)
    );
  }, [menuItem?.id]);

  // Opciones para Select (excluye el propio item)
  const parentOptions = useMemo(() => {
    const currentId = menuItem?.id ? Number(menuItem.id) : null;
    const opts = parents.filter((p) => (currentId ? Number(p.id) !== currentId : true));
    return opts
      .map((p) => ({ id: Number(p.id), name: p.name ?? "" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [parents, menuItem?.id]);

  // Asegura que el valor actual exista; si no, queda en NONE (placeholder)
  useEffect(() => {
    setParentId((prev) => safeSelectValue(prev, parentOptions));
  }, [parentOptions]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("El nombre es obligatorio.");
      const payload = {
        name: name.trim(),
        url: url.trim() || null,
        icon: icon.trim() || null,
        order: normalizeOrder(order),
        moduleName: moduleName.trim() || null,
        isVisible: Boolean(isVisible),
        parentId: normalizeParentId(parentId), // 👈 mapear "none" → null
      };
      // @ts-ignore
      return MenuItemsAPI.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      toast({ title: "Item creado", description: "El item de menú se creó correctamente." });
      onSuccess();
    },
    onError: (err: any) => {
      const msg = err?.message || err?.response?.data?.message || "No se pudo crear el item.";
      toast({ title: "Error", description: msg, variant: "destructive" });
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
        order: normalizeOrder(order),
        moduleName: moduleName.trim() || null,
        isVisible: Boolean(isVisible),
        parentId: normalizeParentId(parentId), // 👈 mapear "none" → null
      };
      // @ts-ignore
      return MenuItemsAPI.update(Number(menuItem.id), payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      toast({ title: "Item actualizado", description: "El item de menú se actualizó correctamente." });
      onSuccess();
    },
    onError: (err: any) => {
      const msg = err?.message || err?.response?.data?.message || "No se pudo actualizar el item.";
      toast({ title: "Error", description: msg, variant: "destructive" });
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

            {/* Icono */}
            <div className="space-y-2">
              <Label htmlFor="icon">Icono</Label>
              <Input id="icon" value={icon} onChange={(e) => setIcon(e.target.value)} />
            </div>

            {/* Orden */}
            <div className="space-y-2">
              <Label htmlFor="order">Orden</Label>
              <Input
                id="order"
                type="number"
                inputMode="numeric"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                min={0}
              />
            </div>

            {/* Módulo */}
            <div className="space-y-2">
              <Label htmlFor="moduleName">Módulo</Label>
              <Input id="moduleName" value={moduleName} onChange={(e) => setModuleName(e.target.value)} />
            </div>

            {/* Visible */}
            <div className="space-y-2 flex items-center gap-3">
              <Checkbox id="isVisible" checked={!!isVisible} onCheckedChange={(v) => setIsVisible(Boolean(v))} />
              <Label htmlFor="isVisible">Visible</Label>
            </div>

            {/* Padre (Radix Select sin value vacío) */}
            <div className="space-y-2 md:col-span-2">
              <Label>Padre</Label>
              <Select
                value={parentId}                                  // 👈 usa "none" como no selección
                onValueChange={(v) => setParentId(v)}
                disabled={loadingParents}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingParents ? "Cargando..." : "-- Sin padre --"} />
                </SelectTrigger>
                <SelectContent>
                  {/* Nunca uses value="" en SelectItem */}
                  <SelectItem value={PARENT_NONE}>-- Sin padre --</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={String(p.id)} value={String(p.id)}>
                      {p.name || `#${p.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
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
