// src/pages/PermissionTypesPage.tsx

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Shield,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  Search,
  CheckCircle,
  XCircle,
  Paperclip,
  HeartPulse,
  Power,
  SlidersHorizontal,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth";
import { TiposPermisosAPI } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { parseApiError } from '@/lib/error-handling';

// -----------------------------------------------------------------------------
// Formato esperado por backend
// {
//   "typeId": 0,
//   "name": "string",
//   "deductsFromVacation": true,
//   "requiresApproval": true,
//   "maxDays": 0,
//   "attachedFile": true,
//   "leadTimeHours": 24,
//   "isMedical": false,
//   "isActive": true
// }
// -----------------------------------------------------------------------------

type PermissionTypeRaw = {
  typeId?: number;
  name?: string;
  deductsFromVacation?: boolean | number | string;
  requiresApproval?: boolean | number | string;
  maxDays?: number | null;
  attachedFile?: boolean | number | string;
  leadTimeHours?: number | null;
  isMedical?: boolean | number | string;
  IsMedical?: boolean | number | string;
  isActive?: boolean | number | string;
  IsActive?: boolean | number | string;
  createdAt?: string;
};

interface PermissionTypeUI {
  TypeId?: number;
  Name: string;
  DeductsFromVacation: boolean;
  RequiresApproval: boolean;
  MaxDays?: number | null;
  RequiresDocumentation: boolean;
  LeadTimeHours?: number | null;
  IsMedical: boolean;
  IsActive: boolean;
  CreatedAt?: string;
}

const toBool = (v: any) => v === true || v === 'true' || v === 1 || v === '1';

const toNumberOrNull = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const parsed = Number(v);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizePermissionType = (raw: PermissionTypeRaw): PermissionTypeUI => ({
  TypeId: raw?.typeId,
  Name: raw?.name ?? '',
  DeductsFromVacation: toBool(raw?.deductsFromVacation ?? false),
  RequiresApproval: toBool(raw?.requiresApproval ?? true),
  MaxDays: raw?.maxDays ?? null,
  RequiresDocumentation: toBool(raw?.attachedFile ?? false),
  LeadTimeHours: toNumberOrNull(raw?.leadTimeHours),
  IsMedical: toBool((raw as any)?.isMedical ?? (raw as any)?.IsMedical ?? false),
  IsActive: toBool((raw as any)?.isActive ?? (raw as any)?.IsActive ?? true),
  CreatedAt: raw?.createdAt,
});

const toPayload = (ui: PermissionTypeUI): PermissionTypeRaw => ({
  typeId: ui.TypeId,
  name: ui.Name,
  deductsFromVacation: ui.DeductsFromVacation,
  requiresApproval: ui.RequiresApproval,
  maxDays: ui.MaxDays ?? 0,
  attachedFile: ui.RequiresDocumentation,
  leadTimeHours: ui.LeadTimeHours ?? 0,
  isMedical: ui.IsMedical,
  isActive: ui.IsActive,
});

const getInitialFormState = (): PermissionTypeUI => ({
  Name: '',
  DeductsFromVacation: false,
  RequiresApproval: true,
  MaxDays: null,
  RequiresDocumentation: false,
  LeadTimeHours: null,
  IsMedical: false,
  IsActive: true,
});

export default function PermissionTypesPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [permissionTypes, setPermissionTypes] = useState<PermissionTypeUI[]>([]);
  const [filteredTypes, setFilteredTypes] = useState<PermissionTypeUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<PermissionTypeUI | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<PermissionTypeUI | null>(null);

  const [newType, setNewType] = useState<PermissionTypeUI>(getInitialFormState());

  const [filters, setFilters] = useState({
    requiresApproval: 'all',
    deductsFromVacation: 'all',
    requiresDocumentation: 'all',
    isMedical: 'all',
    isActive: 'all',
  });

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPermissionTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionTypes, filters, searchTerm]);

  const loadPermissionTypes = async () => {
    try {
      setIsLoading(true);
      const response = await TiposPermisosAPI.list();

      const rawArray: PermissionTypeRaw[] = Array.isArray((response as any)?.data)
        ? (response as any).data
        : Array.isArray(response)
          ? (response as any)
          : [];

      const normalized = rawArray.map(normalizePermissionType);
      setPermissionTypes(normalized);
    } catch (error) {
      console.error('Error loading permission types:', error);
      setPermissionTypes([]);
      toast({
        title: "Error",
        description: "Error al cargar los tipos de permisos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterTypes = () => {
    let filtered = [...permissionTypes];

    if (filters.requiresApproval !== 'all') {
      filtered = filtered.filter(t =>
        filters.requiresApproval === 'yes' ? t.RequiresApproval : !t.RequiresApproval
      );
    }

    if (filters.deductsFromVacation !== 'all') {
      filtered = filtered.filter(t =>
        filters.deductsFromVacation === 'yes' ? t.DeductsFromVacation : !t.DeductsFromVacation
      );
    }

    if (filters.requiresDocumentation !== 'all') {
      filtered = filtered.filter(t =>
        filters.requiresDocumentation === 'yes'
          ? t.RequiresDocumentation
          : !t.RequiresDocumentation
      );
    }

    if (filters.isMedical !== 'all') {
      filtered = filtered.filter(t =>
        filters.isMedical === 'yes' ? t.IsMedical : !t.IsMedical
      );
    }

    if (filters.isActive !== 'all') {
      filtered = filtered.filter(t =>
        filters.isActive === 'yes' ? t.IsActive : !t.IsActive
      );
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(t => (t.Name || '').toLowerCase().includes(q));
    }

    setFilteredTypes(filtered);
  };

  const stats = {
    total: permissionTypes.length,
    approvalYes: permissionTypes.filter(t => t.RequiresApproval).length,
    docsYes: permissionTypes.filter(t => t.RequiresDocumentation).length,
    medicalYes: permissionTypes.filter(t => t.IsMedical).length,
    activeYes: permissionTypes.filter(t => t.IsActive).length,
  };

  const resetForm = () => {
    setNewType(getInitialFormState());
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingType(null);
    resetForm();
  };

  const handleCreateNew = () => {
    setEditingType(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSaveType = async () => {
    if (!newType.Name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es requerido",
        variant: "destructive"
      });
      return;
    }

    if ((newType.LeadTimeHours ?? 0) < 0) {
      toast({
        title: "Error",
        description: "El tiempo mínimo de anticipación no puede ser negativo",
        variant: "destructive"
      });
      return;
    }

    try {
      const payload = toPayload(newType);

      if (editingType?.TypeId) {
        const resp = await TiposPermisosAPI.update(editingType.TypeId, payload);
        if ((resp as any)?.status === 'success' || (resp as any)?.ok) {
          toast({ title: "Éxito", description: "Tipo actualizado correctamente" });
        } else {
          throw new Error((resp as any)?.error?.message || 'Error actualizando el tipo');
        }
      } else {
        const resp = await TiposPermisosAPI.create(payload);
        if ((resp as any)?.status === 'success' || (resp as any)?.ok) {
          toast({ title: "Éxito", description: "Tipo creado correctamente" });
        } else {
          throw new Error((resp as any)?.error?.message || 'Error creando el tipo');
        }
      }

      handleDialogClose();
      await loadPermissionTypes();
    } catch (error: unknown) {
      console.error('Error saving permission type:', error);
      toast({
        title: "Error",
        description: parseApiError(error).message,
        variant: "destructive",
      });
    }
  };

  const handleEditType = (type: PermissionTypeUI) => {
    setEditingType(type);
    setNewType({ ...type });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (type: PermissionTypeUI) => {
    setTypeToDelete(type);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteType = async () => {
    if (!typeToDelete?.TypeId) return;

    try {
      const payload = toPayload({
        ...typeToDelete,
        IsActive: false,
      });

      const resp = await TiposPermisosAPI.update(typeToDelete.TypeId, payload);

      if ((resp as any)?.status === 'success' || (resp as any)?.ok) {
        toast({ title: "Éxito", description: "Tipo inactivado correctamente" });
        setIsDeleteDialogOpen(false);
        setTypeToDelete(null);
        await loadPermissionTypes();
      } else {
        throw new Error((resp as any)?.error?.message || 'Error inactivando el tipo');
      }
    } catch (error: unknown) {
      console.error('Error inactivando permission type:', error);
      toast({
        title: "Error",
        description: parseApiError(error).message,
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      requiresApproval: 'all',
      deductsFromVacation: 'all',
      requiresDocumentation: 'all',
      isMedical: 'all',
      isActive: 'all',
    });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      !!searchTerm ||
      filters.requiresApproval !== 'all' ||
      filters.deductsFromVacation !== 'all' ||
      filters.requiresDocumentation !== 'all' ||
      filters.isMedical !== 'all' ||
      filters.isActive !== 'all'
    );
  }, [searchTerm, filters]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin mb-4" />
            <p>Cargando tipos de permisos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestión de Tipos de Permisos</h1>
          <p className="text-muted-foreground mt-2">
            Administre los tipos de permisos disponibles
          </p>
        </div>

        <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto" onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Tipo
        </Button>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
          else setIsDialogOpen(true);
        }}
      >
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Editar Tipo de Permiso' : 'Crear Nuevo Tipo de Permiso'}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? 'Modifique la información del tipo de permiso'
                : 'Complete la información para crear un nuevo tipo de permiso'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={newType.Name}
                  onChange={(e) => setNewType({ ...newType, Name: e.target.value })}
                  placeholder="Nombre del tipo de permiso"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxDays">Máx. días por año</Label>
                <Input
                  id="maxDays"
                  type="number"
                  min="0"
                  value={newType.MaxDays ?? ''}
                  onChange={(e) =>
                    setNewType({
                      ...newType,
                      MaxDays: e.target.value === ''
                        ? null
                        : Math.max(0, parseInt(e.target.value || '0', 10)),
                    })
                  }
                  placeholder="0 = ilimitado"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leadTimeHours">Anticipación mínima (horas)</Label>
                <Input
                  id="leadTimeHours"
                  type="number"
                  min="0"
                  value={newType.LeadTimeHours ?? ''}
                  onChange={(e) =>
                    setNewType({
                      ...newType,
                      LeadTimeHours: e.target.value === ''
                        ? null
                        : Math.max(0, parseInt(e.target.value || '0', 10)),
                    })
                  }
                  placeholder="0 = sin anticipación mínima"
                />
                <p className="text-xs text-muted-foreground">
                  Define cuántas horas antes debe solicitarse este permiso.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3 rounded-lg border p-3">
                <Switch
                  checked={newType.RequiresApproval}
                  onCheckedChange={(checked) => setNewType({ ...newType, RequiresApproval: checked })}
                />
                <div>
                  <Label className="cursor-pointer">Requiere aprobación</Label>
                  <p className="text-xs text-muted-foreground">Necesita autorización del supervisor</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-3">
                <Switch
                  checked={newType.DeductsFromVacation}
                  onCheckedChange={(checked) => setNewType({ ...newType, DeductsFromVacation: checked })}
                />
                <div>
                  <Label className="cursor-pointer">Descuenta vacaciones</Label>
                  <p className="text-xs text-muted-foreground">Se resta del saldo de vacaciones</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-3">
                <Switch
                  checked={newType.RequiresDocumentation}
                  onCheckedChange={(checked) => setNewType({ ...newType, RequiresDocumentation: checked })}
                />
                <div>
                  <Label className="cursor-pointer">Requiere documentación</Label>
                  <p className="text-xs text-muted-foreground">Obliga a subir archivos de soporte</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-3">
                <Switch
                  checked={newType.IsMedical}
                  onCheckedChange={(checked) => setNewType({ ...newType, IsMedical: checked })}
                />
                <div>
                  <Label className="cursor-pointer">Es médico</Label>
                  <p className="text-xs text-muted-foreground">Identifica permisos médicos</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-3 md:col-span-2">
                <Switch
                  checked={newType.IsActive}
                  onCheckedChange={(checked) => setNewType({ ...newType, IsActive: checked })}
                />
                <div>
                  <Label className="cursor-pointer">Activo</Label>
                  <p className="text-xs text-muted-foreground">Controla si el tipo está habilitado para su uso</p>
                </div>
              </div>
            </div>

            {editingType && (
              <div className="bg-primary/10 p-3 rounded-md flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary">
                  Estás editando un tipo existente (ID {editingType.TypeId ?? '—'}).
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={handleDialogClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSaveType} className="w-full sm:w-auto">
              {editingType ? 'Actualizar' : 'Crear'} Tipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center">
              <Shield className="mr-2 h-5 w-5 text-primary" />
              Total Tipos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <p className="text-sm text-muted-foreground">tipos de permisos</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center">
              <Shield className="mr-2 h-5 w-5 text-secondary-foreground" />
              Requieren Aprobación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary-foreground">{stats.approvalYes}</div>
            <p className="text-sm text-muted-foreground">necesitan autorización</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center">
              <Paperclip className="mr-2 h-5 w-5 text-slate-600" />
              Con Documentación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">{stats.docsYes}</div>
            <p className="text-sm text-muted-foreground">requieren adjuntos</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center">
              <HeartPulse className="mr-2 h-5 w-5 text-destructive" />
              Médicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.medicalYes}</div>
            <p className="text-sm text-muted-foreground">tipos médicos</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center">
              <Power className="mr-2 h-5 w-5 text-success" />
              Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.activeYes}</div>
            <p className="text-sm text-muted-foreground">habilitados</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Tipos de Permisos</CardTitle>
                <CardDescription>Lista de todos los tipos registrados</CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="font-normal">
                  {filteredTypes.length} de {permissionTypes.length} registros
                </Badge>

                <Button
                  variant="outline"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="w-full sm:w-auto"
                >
                  Limpiar filtros
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={loadPermissionTypes}
                  title="Refrescar lista"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
              <div className="relative xl:col-span-3">
                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="xl:col-span-2">
                <Select
                  value={filters.requiresApproval}
                  onValueChange={(value) => setFilters({ ...filters, requiresApproval: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aprobación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Aprobación: Todas</SelectItem>
                    <SelectItem value="yes">Con aprobación</SelectItem>
                    <SelectItem value="no">Sin aprobación</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="xl:col-span-2">
                <Select
                  value={filters.deductsFromVacation}
                  onValueChange={(value) => setFilters({ ...filters, deductsFromVacation: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vacaciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Vacaciones: Todas</SelectItem>
                    <SelectItem value="yes">Sí descuenta</SelectItem>
                    <SelectItem value="no">No descuenta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="xl:col-span-2">
                <Select
                  value={filters.requiresDocumentation}
                  onValueChange={(value) => setFilters({ ...filters, requiresDocumentation: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Documentación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Documentación: Todas</SelectItem>
                    <SelectItem value="yes">Requiere documentación</SelectItem>
                    <SelectItem value="no">No requiere</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="xl:col-span-1">
                <Select
                  value={filters.isMedical}
                  onValueChange={(value) => setFilters({ ...filters, isMedical: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Médico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="yes">Médico</SelectItem>
                    <SelectItem value="no">No médico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="xl:col-span-1">
                <Select
                  value={filters.isActive}
                  onValueChange={(value) => setFilters({ ...filters, isActive: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Activo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="yes">Activos</SelectItem>
                    <SelectItem value="no">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="xl:col-span-1 flex items-center justify-start xl:justify-end">
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredTypes.length > 0 ? (
            <>
              {/* Mobile / Tablet cards */}
              <div className="grid grid-cols-1 gap-3 p-4 lg:hidden">
                {filteredTypes.map((type) => (
                  <div key={type.TypeId ?? type.Name} className="rounded-xl border bg-background p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{type.Name}</div>
                        <div className="text-xs text-muted-foreground mt-1">ID: {type.TypeId ?? '—'}</div>
                      </div>

                      <Badge variant={type.IsActive ? "default" : "outline"} className={type.IsActive ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : ""}>
                        {type.IsActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {type.RequiresApproval ? (
                        <Badge variant="default" className="bg-secondary/15 text-secondary-foreground hover:bg-orange-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Aprobación
                        </Badge>
                      ) : (
                        <Badge variant="outline">Sin aprobación</Badge>
                      )}

                      {type.DeductsFromVacation ? (
                        <Badge variant="default" className="bg-accent text-accent-foreground hover:bg-purple-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Vacaciones
                        </Badge>
                      ) : (
                        <Badge variant="outline">No descuenta</Badge>
                      )}

                      {type.RequiresDocumentation ? (
                        <Badge variant="default" className="bg-slate-100 text-slate-800 hover:bg-slate-200">
                          <Paperclip className="h-3 w-3 mr-1" />
                          Documentación
                        </Badge>
                      ) : (
                        <Badge variant="outline">Sin adjuntos</Badge>
                      )}

                      {type.IsMedical ? (
                        <Badge variant="default" className="bg-rose-100 text-rose-800 hover:bg-rose-200">
                          <HeartPulse className="h-3 w-3 mr-1" />
                          Médico
                        </Badge>
                      ) : (
                        <Badge variant="outline">No médico</Badge>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">Lead Time</div>
                        <div className="font-medium">
                          {(type.LeadTimeHours ?? 0) > 0 ? `${type.LeadTimeHours} h` : 'Sin restricción'}
                        </div>
                      </div>

                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">Máx. días/año</div>
                        <div className="font-medium">
                          {type.MaxDays && type.MaxDays > 0 ? `${type.MaxDays} días` : 'Ilimitado'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleEditType(type)}
                        title={type.IsActive ? "Editar tipo de permiso" : "No se puede editar un tipo inactivo"}
                        disabled={!type.IsActive}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>

                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDeleteClick(type)}
                        title={type.IsActive ? "Inactivar tipo de permiso" : "El tipo ya está inactivo"}
                        disabled={!type.IsActive}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Inactivar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Aprobación</TableHead>
                      <TableHead>Vacaciones</TableHead>
                      <TableHead>Documentación</TableHead>
                      <TableHead>Médico</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead>Anticipación</TableHead>
                      <TableHead>Máx. Días/Año</TableHead>
                      <TableHead className="w-[140px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTypes.map((type) => (
                      <TableRow key={type.TypeId ?? type.Name}>
                        <TableCell className="font-mono text-sm">{type.TypeId ?? '—'}</TableCell>
                        <TableCell className="font-medium">{type.Name}</TableCell>

                        <TableCell>
                          {type.RequiresApproval ? (
                            <Badge variant="default" className="bg-secondary/15 text-secondary-foreground hover:bg-orange-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Requerida
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <XCircle className="h-3 w-3 mr-1" />
                              No requerida
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {type.DeductsFromVacation ? (
                            <Badge variant="default" className="bg-accent text-accent-foreground hover:bg-purple-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Sí
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <XCircle className="h-3 w-3 mr-1" />
                              No
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {type.RequiresDocumentation ? (
                            <Badge variant="default" className="bg-slate-100 text-slate-800 hover:bg-slate-200">
                              <Paperclip className="h-3 w-3 mr-1" />
                              Sí
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <XCircle className="h-3 w-3 mr-1" />
                              No
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {type.IsMedical ? (
                            <Badge variant="default" className="bg-rose-100 text-rose-800 hover:bg-rose-200">
                              <HeartPulse className="h-3 w-3 mr-1" />
                              Sí
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <XCircle className="h-3 w-3 mr-1" />
                              No
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {type.IsActive ? (
                            <Badge variant="default" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                              <Power className="h-3 w-3 mr-1" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {(type.LeadTimeHours ?? 0) > 0 ? (
                            <Badge variant="outline">
                              {type.LeadTimeHours} h
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Sin restricción</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {type.MaxDays && type.MaxDays > 0 ? (
                            <Badge variant="outline">{type.MaxDays} días</Badge>
                          ) : (
                            <span className="text-muted-foreground">Ilimitado</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditType(type)}
                              title={type.IsActive ? "Editar tipo de permiso" : "No se puede editar un tipo inactivo"}
                              disabled={!type.IsActive}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(type)}
                              title={type.IsActive ? "Inactivar tipo de permiso" : "El tipo ya está inactivo"}
                              disabled={!type.IsActive}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="text-center py-12 px-4 text-muted-foreground">
              <Shield className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg mb-2">No hay tipos de permisos registrados</p>
              <p className="text-sm">Crea un nuevo tipo para verlo aquí</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Inactivación</DialogTitle>
            <DialogDescription>
              ¿Inactivar el tipo de permiso "{typeToDelete?.Name}"? El registro seguirá existiendo, pero quedará deshabilitado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteType} className="w-full sm:w-auto">
              Inactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}