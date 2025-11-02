// src/pages/ReferenceTypesPage.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Tag, Edit, Trash2, RefreshCw, AlertCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { TiposReferenciaAPI } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// -----------------------------------------------------------------------------
// Tipos reales del backend (camelCase) y tipos de la UI (PascalCase)
// -----------------------------------------------------------------------------

type ReferenceTypeRaw = {
  typeId?: number;
  category?: string;
  name?: string;
  description?: string | null;
  isActive?: boolean | number | string;
  createdAt?: string | number;
};

interface ReferenceType {
  TypeID?: number;
  Category: string;
  Name: string;
  Description?: string;
  IsActive: boolean;
  CreatedAt?: string;
}

// Helpers de normalización
const toBool = (v: any) => v === true || v === 'true' || v === 1 || v === '1';

const normalizeRefType = (raw: ReferenceTypeRaw): ReferenceType => ({
  TypeID: raw?.typeId,
  Category: raw?.category ?? '',
  Name: raw?.name ?? '',
  Description: (raw?.description ?? undefined) || undefined,
  IsActive: toBool(raw?.isActive ?? true),
  CreatedAt: raw?.createdAt ? String(raw.createdAt) : undefined,
});

const toRaw = (ui: ReferenceType): ReferenceTypeRaw => ({
  typeId: ui.TypeID,
  category: ui.Category,
  name: ui.Name,
  description: ui.Description ?? null,
  isActive: ui.IsActive,
  createdAt: ui.CreatedAt,
});

// “Bonito” para la categoría en UI (sin afectar filtros/API)
const prettyCategory = (cat: string) =>
  (cat || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w|\s\w/g, (m) => m.toUpperCase());

// -----------------------------------------------------------------------------
// Categorías sugeridas (se combinan con las que vienen del backend)
// -----------------------------------------------------------------------------
const COMMON_CATEGORIES = [
  'DocumentType',
  'EmployeeType',
  'ContractType',
  'PermissionType',
  'MaritalStatus',
  'EducationLevel',
  'BloodType',
  'Gender',
  'PaymentMethod',
  'OvertimeType',
  'Status',
  'Priority'
];

export default function ReferenceTypesPage() {
  const { toast } = useToast();
  const { user, employeeDetails } = useAuth();
  const [referenceTypes, setReferenceTypes] = useState<ReferenceType[]>([]);
  const [filteredTypes, setFilteredTypes] = useState<ReferenceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ReferenceType | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<ReferenceType | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Estado para nuevo tipo de referencia
  const [newType, setNewType] = useState<ReferenceType>({
    Category: '',
    Name: '',
    Description: '',
    IsActive: true
  });

  // Modo para categoría (select vs personalizada)
  const [categoryMode, setCategoryMode] = useState<'select' | 'custom'>('select');

  // Filtros
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar tipos de referencia
  useEffect(() => {
    loadReferenceTypes();
  }, []);

  // Filtrar tipos cuando cambian los filtros o la búsqueda
  useEffect(() => {
    filterTypes();
  }, [referenceTypes, filters, searchTerm]);

  const loadReferenceTypes = async () => {
    try {
      setIsLoading(true);
      const response = await TiposReferenciaAPI.list(); // devuelve ReferenceTypeRaw[]

      if (response.status === 'success') {
        const arr = Array.isArray(response.data) ? response.data : [];
        const normalized = arr.map(normalizeRefType);

        setReferenceTypes(normalized);

        // Extraer categorías únicas (de datos normalizados)
        const uniqueCategories = [...new Set(normalized.map(t => t.Category).filter(Boolean))];
        setCategories(uniqueCategories.sort());
      } else {
        console.error('Error loading reference types:', response.error);
        setReferenceTypes([]);
        toast({
          title: "Error",
          description: "Error al cargar los tipos de referencia",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in loadReferenceTypes:', error);
      setReferenceTypes([]);
      toast({
        title: "Error",
        description: "Error de conexión al cargar los tipos de referencia",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterTypes = () => {
    let filtered = [...referenceTypes];

    // Filtrar por categoría
    if (filters.category !== 'all') {
      filtered = filtered.filter(type => type.Category === filters.category);
    }

    // Filtrar por estado
    if (filters.status !== 'all') {
      filtered = filtered.filter(type => {
        if (filters.status === 'active') return type.IsActive;
        if (filters.status === 'inactive') return !type.IsActive;
        return true;
      });
    }

    // Filtrar por búsqueda
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(type =>
        (type.Name || '').toLowerCase().includes(q) ||
        (type.Category || '').toLowerCase().includes(q) ||
        (type.Description || '').toLowerCase().includes(q)
      );
    }

    setFilteredTypes(filtered);
  };

  // Estadísticas
  const getStats = () => {
    const totalTypes = referenceTypes.length;
    const activeTypes = referenceTypes.filter(t => t.IsActive).length;
    const totalCategories = categories.length;
    const inactiveTypes = totalTypes - activeTypes;

    return { totalTypes, activeTypes, totalCategories, inactiveTypes };
  };

  const stats = getStats();

  // Obtener estadísticas por categoría (puede usar referenceTypes o filteredTypes)
  const getCategoryStats = (source: ReferenceType[] = referenceTypes) => {
    const categoryStats: { [key: string]: { total: number; active: number } } = {};
    source.forEach(type => {
      const key = type.Category || 'Sin categoría';
      if (!categoryStats[key]) {
        categoryStats[key] = { total: 0, active: 0 };
      }
      categoryStats[key].total++;
      if (type.IsActive) {
        categoryStats[key].active++;
      }
    });
    return categoryStats;
  };

  // Manejar creación/edición de tipos
  const handleSaveType = async () => {
    if (!newType.Category || !newType.Name) {
      toast({
        title: "Error",
        description: "La categoría y el nombre son requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingType?.TypeID) {
        // Editar tipo existente
        const payload = toRaw(newType);
        const response = await TiposReferenciaAPI.update(editingType.TypeID, payload);
        if (response.status === 'success') {
          toast({
            title: "Éxito",
            description: "Tipo de referencia actualizado correctamente",
          });
        } else {
          throw new Error(response.error?.message || 'Error updating reference type');
        }
      } else {
        // Crear nuevo tipo
        const payload = toRaw(newType);
        const response = await TiposReferenciaAPI.create(payload);
        if (response.status === 'success') {
          toast({
            title: "Éxito",
            description: "Tipo de referencia creado correctamente",
          });
        } else {
          throw new Error(response.error?.message || 'Error creating reference type');
        }
      }

      setIsDialogOpen(false);
      setEditingType(null);
      resetForm();
      await loadReferenceTypes();
    } catch (error: any) {
      console.error('Error saving reference type:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar el tipo de referencia",
        variant: "destructive",
      });
    }
  };

  // Manejar eliminación de tipo
  const handleDeleteType = async () => {
    if (!typeToDelete?.TypeID) return;

    try {
      const response = await TiposReferenciaAPI.remove(typeToDelete.TypeID);
      if (response.status === 'success') {
        toast({
          title: "Éxito",
          description: "Tipo de referencia eliminado correctamente",
        });
        setIsDeleteDialogOpen(false);
        setTypeToDelete(null);
        await loadReferenceTypes();
      } else {
        throw new Error(response.error?.message || 'Error deleting reference type');
      }
    } catch (error: any) {
      console.error('Error deleting reference type:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el tipo de referencia",
        variant: "destructive",
      });
    }
  };

  // Abrir diálogo de edición
  const handleEditType = (type: ReferenceType) => {
    setEditingType(type);
    setNewType({ ...type });
    setCategoryMode('select');
    setIsDialogOpen(true);
  };

  // Abrir diálogo de eliminación
  const handleDeleteClick = (type: ReferenceType) => {
    setTypeToDelete(type);
    setIsDeleteDialogOpen(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setNewType({
      Category: '',
      Name: '',
      Description: '',
      IsActive: true
    });
    setCategoryMode('select');
  };

  // Resetear formulario al cerrar diálogo
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingType(null);
    resetForm();
  };

  // Formatear fecha
  const formatDate = (dateInput?: string | number) => {
    if (dateInput === undefined || dateInput === null || dateInput === '') return 'N/A';
    try {
      const d = typeof dateInput === 'number' ? new Date(dateInput) : new Date(String(dateInput));
      if (isNaN(d.getTime())) return 'Fecha inválida';
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin mb-4" />
            <p>Cargando tipos de referencia...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Tipos de Referencia</h1>
          <p className="text-gray-600 mt-2">
            Administre los tipos de referencia y categorías del sistema de recursos humanos
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
                {editingType ? 'Editar Tipo de Referencia' : 'Crear Nuevo Tipo de Referencia'}
              </DialogTitle>
              <DialogDescription>
                {editingType
                  ? 'Modifique la información del tipo de referencia'
                  : 'Complete la información para crear un nuevo tipo de referencia'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Categoría */}
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={categoryMode === 'select' ? (newType.Category || 'none') : 'custom'}
                    onValueChange={(value) => {
                      if (value === 'custom') {
                        setCategoryMode('custom');
                        setNewType({ ...newType, Category: '' });
                      } else {
                        setCategoryMode('select');
                        setNewType({ ...newType, Category: value === 'none' ? '' : value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seleccionar…</SelectItem>
                      {/* Sugeridas */}
                      {COMMON_CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                      {/* Desde backend */}
                      {categories
                        .filter(cat => !COMMON_CATEGORIES.includes(cat))
                        .map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      <SelectItem value="custom">Personalizada…</SelectItem>
                    </SelectContent>
                  </Select>

                  {categoryMode === 'custom' && (
                    <Input
                      placeholder="Escriba una nueva categoría (se guardará tal cual)"
                      value={newType.Category}
                      onChange={(e) => setNewType({ ...newType, Category: e.target.value })}
                    />
                  )}
                </div>

                {/* Nombre */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={newType.Name}
                    onChange={(e) => setNewType({ ...newType, Name: e.target.value })}
                    placeholder="Nombre del tipo"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={newType.Description || ''}
                  onChange={(e) => setNewType({ ...newType, Description: e.target.value })}
                  placeholder="Descripción del tipo de referencia..."
                  rows={3}
                />
              </div>

              {/* Activo */}
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newType.IsActive}
                  onCheckedChange={(checked) => setNewType({ ...newType, IsActive: checked })}
                />
                <Label htmlFor="isActive">Tipo activo</Label>
              </div>

              {editingType && !newType.IsActive && (
                <div className="bg-yellow-50 p-3 rounded-md flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-600">
                    Desactivar este tipo puede afectar funcionalidades que lo utilicen.
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
              <Tag className="mr-2 h-5 w-5 text-blue-600" />
              Total Tipos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalTypes}</div>
            <p className="text-sm text-gray-500">tipos registrados</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Tag className="mr-2 h-5 w-5 text-green-600" />
              Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeTypes}</div>
            <p className="text-sm text-gray-500">tipos en uso</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Tag className="mr-2 h-5 w-5 text-purple-600" />
              Categorías
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalCategories}</div>
            <p className="text-sm text-gray-500">categorías diferentes</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Tag className="mr-2 h-5 w-5 text-gray-600" />
              Inactivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.inactiveTypes}</div>
            <p className="text-sm text-gray-500">tipos deshabilitados</p>
          </CardContent>
        </Card>
      </div>

      {/* Pestañas para vista por tabla y por categoría */}
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Vista de Tabla</TabsTrigger>
          <TabsTrigger value="categories">Vista por Categorías</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          {/* Filtros y búsqueda */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Tipos de Referencia</CardTitle>
                  <CardDescription>
                    Lista de todos los tipos de referencia registrados en el sistema
                  </CardDescription>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar tipos..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select
                    value={filters.category}
                    onValueChange={(value) => setFilters({ ...filters, category: value })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters({ ...filters, status: value })}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={loadReferenceTypes} title="Refrescar">
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
                      <TableHead>Categoría</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTypes.map((type) => (
                      <TableRow key={type.TypeID ?? `${type.Category}-${type.Name}`}>
                        <TableCell className="font-mono text-sm">{type.TypeID ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{prettyCategory(type.Category) || '—'}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{type.Name || '—'}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {type.Description || 'Sin descripción'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={type.IsActive ? "default" : "secondary"}>
                            {type.IsActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(type.CreatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditType(type)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(type)}
                            >
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
                  <Tag className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg mb-2">No hay tipos de referencia registrados</p>
                  <p className="text-sm">Los tipos aparecerán aquí una vez que se creen</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          {/* Vista agrupada por categorías */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map(category => {
              const categoryTypes = filteredTypes.filter(type => type.Category === category);
              const statsByCat = getCategoryStats(filteredTypes)[category] || { total: 0, active: 0 };

              return (
                <Card key={category} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{prettyCategory(category)}</CardTitle>
                      <Badge variant="outline">{statsByCat.total} tipos</Badge>
                    </div>
                    <CardDescription>
                      {statsByCat.active} activos de {statsByCat.total} total
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {categoryTypes.map(type => (
                        <div key={type.TypeID ?? `${type.Name}-${type.CreatedAt}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{type.Name || '—'}</p>
                            {type.Description && (
                              <p className="text-xs text-gray-500 truncate">{type.Description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={type.IsActive ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {type.IsActive ? 'A' : 'I'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditType(type)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar el tipo "{typeToDelete?.Name}"
              de la categoría "{prettyCategory(typeToDelete?.Category || '')}"? Esta acción no se puede deshacer
              y podría afectar datos relacionados.
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
