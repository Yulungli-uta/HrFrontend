import { useState } from 'react';
import { MapPin, Plus, RefreshCw, ChevronRight, ChevronDown, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useGuardLocationsTree, useGuardLocationMutations } from '@/hooks/guards/useGuards';
import type { GuardServiceLocationTreeDto, CreateGuardServiceLocationDto, UpdateGuardServiceLocationDto } from '@/types/guards';
import { useQueryClient } from '@tanstack/react-query';
import { GUARD_KEYS } from '@/hooks/guards/useGuards';
import { GuardServiceLocationsAPI } from '@/lib/api/services/guards';

type DialogMode = 'create' | 'edit';

interface LocationFormState {
  locationName: string;
  locationCode: string;
  description: string;
  locationTypeId: number;
  requiresCoverage: boolean;
  isAssignable: boolean;
  isActive: boolean;
  parentLocationId?: number;
}

const DEFAULT_FORM: LocationFormState = {
  locationName: '',
  locationCode: '',
  description: '',
  locationTypeId: 1,
  requiresCoverage: false,
  isAssignable: false,
  isActive: true,
};

function LocationTreeNode({ node, depth = 0 }: { node: GuardServiceLocationTreeDto; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 group
          ${depth > 0 ? 'ml-' + (depth * 4) : ''}`}
        style={{ marginLeft: depth * 16 }}
      >
        <button
          className="w-4 h-4 flex items-center justify-center"
          onClick={() => hasChildren && setExpanded(v => !v)}
        >
          {hasChildren
            ? (expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)
            : <span className="w-3" />
          }
        </button>
        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-medium flex-1">{node.locationName}</span>
        {node.locationCode && (
          <span className="text-xs text-muted-foreground font-mono">{node.locationCode}</span>
        )}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {node.isAssignable && <Badge variant="outline" className="text-xs">Asignable</Badge>}
          {node.requiresCoverage && <Badge variant="secondary" className="text-xs">Cobertura</Badge>}
          {!node.isActive && <Badge variant="destructive" className="text-xs">Inactivo</Badge>}
        </div>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children.map(child => (
            <LocationTreeNode key={child.locationId} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GuardServiceLocationsPage() {
  const { data: resp, isLoading, refetch } = useGuardLocationsTree();
  const { create, update } = useGuardLocationMutations();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>('create');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<LocationFormState>(DEFAULT_FORM);

  const tree = resp?.status === 'success' ? resp.data : [];

  const openCreate = () => {
    setForm(DEFAULT_FORM);
    setMode('create');
    setEditId(null);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.locationName.trim()) return;
    if (mode === 'create') {
      const dto: CreateGuardServiceLocationDto = {
        locationName: form.locationName,
        locationCode: form.locationCode || undefined,
        description: form.description || undefined,
        locationTypeId: form.locationTypeId,
        requiresCoverage: form.requiresCoverage,
        isAssignable: form.isAssignable,
        parentLocationId: form.parentLocationId,
      };
      create.mutate(dto, { onSuccess: (r) => { if (r.status === 'success') setOpen(false); } });
    } else if (editId) {
      const dto: UpdateGuardServiceLocationDto = {
        locationName: form.locationName,
        locationCode: form.locationCode || undefined,
        description: form.description || undefined,
        locationTypeId: form.locationTypeId,
        requiresCoverage: form.requiresCoverage,
        isAssignable: form.isAssignable,
        isActive: form.isActive,
      };
      update.mutate({ id: editId, dto }, { onSuccess: (r) => { if (r.status === 'success') setOpen(false); } });
    }
  };

  const isSaving = create.isPending || update.isPending;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Ubicaciones de Servicio</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva ubicación
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Árbol de ubicaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Cargando ubicaciones…</p>
          ) : tree.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No hay ubicaciones registradas.</p>
          ) : (
            <div className="space-y-1">
              {tree.map(node => (
                <LocationTreeNode key={node.locationId} node={node} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog crear/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Nueva ubicación' : 'Editar ubicación'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={form.locationName}
                onChange={e => setForm(f => ({ ...f, locationName: e.target.value }))}
                placeholder="Ej: Puerta principal"
              />
            </div>
            <div>
              <Label>Código</Label>
              <Input
                value={form.locationCode}
                onChange={e => setForm(f => ({ ...f, locationCode: e.target.value }))}
                placeholder="Ej: GATE-001"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Requiere cobertura</Label>
              <Switch
                checked={form.requiresCoverage}
                onCheckedChange={v => setForm(f => ({ ...f, requiresCoverage: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Asignable a guardias</Label>
              <Switch
                checked={form.isAssignable}
                onCheckedChange={v => setForm(f => ({ ...f, isAssignable: v }))}
              />
            </div>
            {mode === 'edit' && (
              <div className="flex items-center justify-between">
                <Label>Activo</Label>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving || !form.locationName.trim()}>
              {isSaving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
