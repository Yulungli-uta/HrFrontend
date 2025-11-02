// src/pages/PermissionTypesPage.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Shield, Edit, Trash2, RefreshCw, AlertCircle, Search, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { TiposPermisosAPI } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

// -----------------------------------------------------------------------------
// Formato esperado por backend
// {
//   "typeId": 0,
//   "name": "string",
//   "deductsFromVacation": true,
//   "requiresApproval": true,
//   "maxDays": 0
// }
// -----------------------------------------------------------------------------

// Tipos crudos del backend
type PermissionTypeRaw = {
  typeId?: number;
  name?: string;
  deductsFromVacation?: boolean | number | string;
  requiresApproval?: boolean | number | string;
  maxDays?: number | null;
  createdAt?: string;
};

// Tipos para UI
interface PermissionTypeUI {
  TypeId?: number;
  Name: string;
  DeductsFromVacation: boolean;
  RequiresApproval: boolean;
  MaxDays?: number | null; // null/undefined = ilimitado
  CreatedAt?: string;
}

// Helpers de normalización
const toBool = (v: any) => v === true || v === 'true' || v === 1 || v === '1';

const normalizePermissionType = (raw: PermissionTypeRaw): PermissionTypeUI => ({
  TypeId: raw?.typeId,
  Name: raw?.name ?? '',
  DeductsFromVacation: toBool(raw?.deductsFromVacation ?? false),
  RequiresApproval: toBool(raw?.requiresApproval ?? true),
  MaxDays: raw?.maxDays ?? null,
  CreatedAt: raw?.createdAt,
});

// Mapeo a payload esperado por backend
const toPayload = (ui: PermissionTypeUI): PermissionTypeRaw => ({
  typeId: ui.TypeId,
  name: ui.Name,
  deductsFromVacation: ui.DeductsFromVacation,
  requiresApproval: ui.RequiresApproval,
  maxDays: ui.MaxDays ?? 0, // si no se especifica, enviamos 0 (ilimitado/por convención)
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

  // Estado de formulario
  const [newType, setNewType] = useState<PermissionTypeUI>({
    Name: '',
    DeductsFromVacation: false,
    RequiresApproval: true,
    MaxDays: null,
  });

  // Filtros
  const [filters, setFilters] = useState({
    requiresApproval: 'all',      // all | yes | no
    deductsFromVacation: 'all',   // all | yes | no
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar al inicio
  useEffect(() => {
    loadPermissionTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refiltrar
  useEffect(() => {
    filterTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionTypes, filters, searchTerm]);

  const loadPermissionTypes = async () => {
    try {
      setIsLoading(true);
      const response = await TiposPermisosAPI.list();

      // Soporta {status,data} o arreglo directo
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

    // requiere aprobación
    if (filters.requiresApproval !== 'all') {
      filtered = filtered.filter(t =>
        filters.requiresApproval === 'yes' ? t.RequiresApproval : !t.RequiresApproval
      );
    }

    // descuenta vacaciones
    if (filters.deductsFromVacation !== 'all') {
      filtered = filtered.filter(t =>
        filters.deductsFromVacation === 'yes' ? t.DeductsFromVacation : !t.DeductsFromVacation
      );
    }

    // búsqueda por nombre
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        (t.Name || '').toLowerCase().includes(q)
      );
    }

    setFilteredTypes(filtered);
  };

  // Estadísticas simples
  const stats = {
    total: permissionTypes.length,
    approvalYes: permissionTypes.filter(t => t.RequiresApproval).length,
    deductYes: permissionTypes.filter(t => t.DeductsFromVacation).length,
    unlimited: permissionTypes.filter(t => !t.MaxDays || t.MaxDays === 0).length,
  };

  const resetForm = () => {
    setNewType({
      Name: '',
      DeductsFromVacation: false,
      RequiresApproval: true,
      MaxDays: null,
    });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingType(null);
    resetForm();
  };

  const handleSaveType = async () => {
    if (!newType.Name.trim()) {
      toast({ title: "Error", description: "El nombre es requerido", variant: "destructive" });
      return;
    }

    try {
      const payload = toPayload(newType);

      if (editingType?.TypeId) {
        // update
        const resp = await TiposPermisosAPI.update(editingType.TypeId, payload);
        if ((resp as any)?.status === 'success' || (resp as any)?.ok) {
          toast({ title: "Éxito", description: "Tipo actualizado correctamente" });
        } else {
          throw new Error((resp as any)?.error?.message || 'Error actualizando el tipo');
        }
      } else {
        // create
        const resp = await TiposPermisosAPI.create(payload);
        if ((resp as any)?.status === 'success' || (resp as any)?.ok) {
          toast({ title: "Éxito", description: "Tipo creado correctamente" });
        } else {
          throw new Error((resp as any)?.error?.message || 'Error creando el tipo');
        }
      }

      handleDialogClose();
      await loadPermissionTypes();
    } catch (error: any) {
      console.error('Error saving permission type:', error);
      toast({
        title: "Error",
        description: error?.message || "Error al guardar el tipo de permiso",
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
      const resp = await TiposPermisosAPI.remove(typeToDelete.TypeId);
      if ((resp as any)?.status === 'success' || (resp as any)?.ok) {
        toast({ title: "Éxito", description: "Tipo eliminado correctamente" });
        setIsDeleteDialogOpen(false);
        setTypeToDelete(null);
        await loadPermissionTypes();
      } else {
        throw new Error((resp as any)?.error?.message || 'Error eliminando el tipo');
      }
    } catch (error: any) {
      console.error('Error deleting permission type:', error);
      toast({
        title: "Error",
        description: error?.message || "Error al eliminar el tipo de permiso",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Tipos de Permisos</h1>
          <p className="text-gray-600 mt-2">
            Administre los tipos de permisos disponibles
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Tipo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
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

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={newType.Name}
                    onChange={(e) => setNewType({ ...newType, Name: e.target.value })}
                    placeholder="Nombre del tipo de permiso"
                  />
                </div>

                {/* Días máximos por año */}
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
                        MaxDays: e.target.value === '' ? null : Math.max(0, parseInt(e.target.value || '0', 10)),
                      })
                    }
                    placeholder="0 = ilimitado"
                  />
                </div>
              </div>

              {/* Configuraciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Requiere aprobación */}
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newType.RequiresApproval}
                    onCheckedChange={(checked) => setNewType({ ...newType, RequiresApproval: checked })}
                  />
                  <div>
                    <Label className="cursor-pointer">Requiere aprobación</Label>
                    <p className="text-xs text-gray-500">Necesita autorización del supervisor</p>
                  </div>
                </div>

                {/* Descuenta de vacaciones */}
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newType.DeductsFromVacation}
                    onCheckedChange={(checked) => setNewType({ ...newType, DeductsFromVacation: checked })}
                  />
                  <div>
                    <Label className="cursor-pointer">Descuenta vacaciones</Label>
                    <p className="text-xs text-gray-500">Se resta del saldo de vacaciones</p>
                  </div>
                </div>
              </div>

              {editingType && (
                <div className="bg-blue-50 p-3 rounded-md flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    Estás editando un tipo existente (ID {editingType.TypeId ?? '—'}).
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleDialogClose}>
                Cancelar
              </Button>
              <Button onClick={handleSaveType}>
                {editingType ? 'Actualizar' : 'Crear'} Tipo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Shield className="mr-2 h-5 w-5 text-blue-600" />
              Total Tipos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <p className="text-sm text-gray-500">tipos de permisos</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Shield className="mr-2 h-5 w-5 text-orange-600" />
              Requieren Aprobación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.approvalYes}</div>
            <p className="text-sm text-gray-500">necesitan autorización</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Shield className="mr-2 h-5 w-5 text-purple-600" />
              Descuentan Vacaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.deductYes}</div>
            <p className="text-sm text-gray-500">afectan saldo</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Shield className="mr-2 h-5 w-5 text-green-600" />
              Ilimitados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.unlimited}</div>
            <p className="text-sm text-gray-500">maxDays = 0</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y tabla */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Tipos de Permisos</CardTitle>
              <CardDescription>Lista de todos los tipos registrados</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select
                value={filters.requiresApproval}
                onValueChange={(value) => setFilters({ ...filters, requiresApproval: value })}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Aprobación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="yes">Requiere aprobación</SelectItem>
                  <SelectItem value="no">No requiere</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.deductsFromVacation}
                onValueChange={(value) => setFilters({ ...filters, deductsFromVacation: value })}
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Descuenta vacaciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="yes">Sí descuenta</SelectItem>
                  <SelectItem value="no">No descuenta</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={loadPermissionTypes} title="Refrescar">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredTypes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descuenta Vacaciones</TableHead>
                  <TableHead>Requiere Aprobación</TableHead>
                  <TableHead>Máx. Días/Año</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTypes.map((type) => (
                  <TableRow key={type.TypeId ?? type.Name}>
                    <TableCell className="font-mono text-sm">{type.TypeId ?? '—'}</TableCell>
                    <TableCell className="font-medium">{type.Name}</TableCell>
                    <TableCell>
                      {type.DeductsFromVacation ? (
                        <Badge variant="default" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
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
                      {type.RequiresApproval ? (
                        <Badge variant="default" className="bg-orange-100 text-orange-800 hover:bg-orange-200">
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
                      {type.MaxDays && type.MaxDays > 0 ? (
                        <Badge variant="outline">{type.MaxDays} días</Badge>
                      ) : (
                        <span className="text-gray-500">Ilimitado (0)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditType(type)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteClick(type)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Shield className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg mb-2">No hay tipos de permisos registrados</p>
              <p className="text-sm">Crea un nuevo tipo para verlo aquí</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Eliminar el tipo de permiso "{typeToDelete?.Name}"? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteType}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
