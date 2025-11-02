// src/pages/HolidaysPage.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Edit, Trash2, Download, Upload, Filter, Search, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { HolidaysAPI } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Holiday {
  holidayID?: number;
  name: string;
  holidayDate: string;
  isActive: boolean;
  description?: string;
  createdAt?: string;
  createdBy?: number;
}

export default function HolidaysPage() {
  const { toast } = useToast();
  const { user, employeeDetails } = useAuth();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [filteredHolidays, setFilteredHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);

  // Estado para nuevo feriado
  const [newHoliday, setNewHoliday] = useState<Holiday>({
    name: '',
    holidayDate: new Date().toISOString().split('T')[0],
    isActive: true,
    description: ''
  });

  // Filtros
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    status: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar feriados
  useEffect(() => {
    loadHolidays();
  }, []);

  // Filtrar feriados cuando cambian los filtros o la búsqueda
  useEffect(() => {
    filterHolidays();
  }, [holidays, filters, searchTerm]);

  const loadHolidays = async () => {
    try {
      setIsLoading(true);
      const currentYear = new Date().getFullYear();
      const response = await HolidaysAPI.getByYear(currentYear);
      
      if (response.status === 'success') {
        setHolidays(response.data || []);
      } else {
        console.error('Error loading holidays:', response.error);
        setHolidays([]);
        toast({
          title: "Error",
          description: "Error al cargar los días feriados",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in loadHolidays:', error);
      setHolidays([]);
      toast({
        title: "Error",
        description: "Error de conexión al cargar los días feriados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterHolidays = () => {
    let filtered = [...holidays];

    // Filtrar por año
    if (filters.year !== 'all') {
      filtered = filtered.filter(holiday => {
        try {
          const holidayYear = new Date(holiday.holidayDate).getFullYear();
          return holidayYear.toString() === filters.year;
        } catch (error) {
          return false;
        }
      });
    }

    // Filtrar por estado
    if (filters.status !== 'all') {
      filtered = filtered.filter(holiday => {
        if (filters.status === 'active') return holiday.isActive;
        if (filters.status === 'inactive') return !holiday.isActive;
        return true;
      });
    }

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(holiday =>
        holiday.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        holiday.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredHolidays(filtered);
  };

  // Estadísticas
  const getStats = () => {
    const currentYear = new Date().getFullYear();
    const yearHolidays = holidays.filter(holiday => {
      try {
        const holidayYear = new Date(holiday.holidayDate).getFullYear();
        return holidayYear === currentYear;
      } catch (error) {
        return false;
      }
    });

    const totalHolidays = yearHolidays.length;
    const activeHolidays = yearHolidays.filter(h => h.isActive).length;
    const upcomingHolidays = yearHolidays.filter(h => {
      try {
        const holidayDate = new Date(h.holidayDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return holidayDate >= today && h.isActive;
      } catch (error) {
        return false;
      }
    }).length;

    return { totalHolidays, activeHolidays, upcomingHolidays };
  };

  const stats = getStats();

  // Manejar creación/edición de feriados
  const handleSaveHoliday = async () => {
    if (!newHoliday.name || !newHoliday.holidayDate) {
      toast({
        title: "Error",
        description: "El nombre y la fecha son requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingHoliday) {
        // Editar feriado existente
        const response = await HolidaysAPI.update(editingHoliday.holidayID!, newHoliday);
        if (response.status === 'success') {
          toast({
            title: "Éxito",
            description: "Día feriado actualizado correctamente",
          });
        } else {
          throw new Error(response.error?.message || 'Error updating holiday');
        }
      } else {
        // Crear nuevo feriado
        const response = await HolidaysAPI.create(newHoliday);
        if (response.status === 'success') {
          toast({
            title: "Éxito",
            description: "Día feriado creado correctamente",
          });
        } else {
          throw new Error(response.error?.message || 'Error creating holiday');
        }
      }

      setIsDialogOpen(false);
      setEditingHoliday(null);
      setNewHoliday({
        name: '',
        holidayDate: new Date().toISOString().split('T')[0],
        isActive: true,
        description: ''
      });
      await loadHolidays();
    } catch (error: any) {
      console.error('Error saving holiday:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar el día feriado",
        variant: "destructive",
      });
    }
  };

  // Manejar eliminación de feriado
  const handleDeleteHoliday = async () => {
    if (!holidayToDelete?.holidayID) return;

    try {
      const response = await HolidaysAPI.remove(holidayToDelete.holidayID);
      if (response.status === 'success') {
        toast({
          title: "Éxito",
          description: "Día feriado eliminado correctamente",
        });
        setIsDeleteDialogOpen(false);
        setHolidayToDelete(null);
        await loadHolidays();
      } else {
        throw new Error(response.error?.message || 'Error deleting holiday');
      }
    } catch (error: any) {
      console.error('Error deleting holiday:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el día feriado",
        variant: "destructive",
      });
    }
  };

  // Abrir diálogo de edición
  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setNewHoliday({ ...holiday });
    setIsDialogOpen(true);
  };

  // Abrir diálogo de eliminación
  const handleDeleteClick = (holiday: Holiday) => {
    setHolidayToDelete(holiday);
    setIsDeleteDialogOpen(true);
  };

  // Resetear formulario al cerrar diálogo
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingHoliday(null);
    setNewHoliday({
      name: '',
      holidayDate: new Date().toISOString().split('T')[0],
      isActive: true,
      description: ''
    });
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Obtener años disponibles para filtro
  const getAvailableYears = () => {
    const years = new Set<number>();
    holidays.forEach(holiday => {
      try {
        const year = new Date(holiday.holidayDate).getFullYear();
        years.add(year);
      } catch (error) {
        // Ignorar fechas inválidas
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  // Verificar si una fecha es en el pasado
  const isPastDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date < today;
    } catch (error) {
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin mb-4" />
            <p>Cargando días feriados...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Días Feriados</h1>
          <p className="text-gray-600 mt-2">
            Administre los días feriados y festivos de la organización
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Feriado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingHoliday ? 'Editar Día Feriado' : 'Crear Nuevo Día Feriado'}
              </DialogTitle>
              <DialogDescription>
                {editingHoliday 
                  ? 'Modifique la información del día feriado' 
                  : 'Complete la información para crear un nuevo día feriado'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Feriado *</Label>
                  <Input
                    id="name"
                    value={newHoliday.name}
                    onChange={(e) => setNewHoliday({...newHoliday, name: e.target.value})}
                    placeholder="Ej: Navidad, Año Nuevo, etc."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="holidayDate">Fecha *</Label>
                  <Input
                    type="date"
                    id="holidayDate"
                    value={newHoliday.holidayDate}
                    onChange={(e) => setNewHoliday({...newHoliday, holidayDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={newHoliday.description || ''}
                  onChange={(e) => setNewHoliday({...newHoliday, description: e.target.value})}
                  placeholder="Descripción del día feriado..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={newHoliday.isActive}
                  onCheckedChange={(checked) => setNewHoliday({...newHoliday, isActive: checked})}
                />
                <Label htmlFor="isActive">Feriado activo</Label>
              </div>

              {isPastDate(newHoliday.holidayDate) && (
                <div className="bg-yellow-50 p-3 rounded-md flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-600">
                    Esta fecha está en el pasado. Los cambios pueden afectar cálculos históricos.
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleDialogClose}>
                Cancelar
              </Button>
              <Button onClick={handleSaveHoliday}>
                {editingHoliday ? 'Actualizar' : 'Crear'} Feriado
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-blue-600" />
              Total Feriados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalHolidays}</div>
            <p className="text-sm text-gray-500">este año</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-green-600" />
              Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeHolidays}</div>
            <p className="text-sm text-gray-500">feriados vigentes</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-orange-600" />
              Próximos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.upcomingHolidays}</div>
            <p className="text-sm text-gray-500">feriados por venir</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Días Feriados</CardTitle>
              <CardDescription>
                Lista de todos los días feriados registrados en el sistema
              </CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o descripción..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select
                value={filters.year}
                onValueChange={(value) => setFilters({...filters, year: value})}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los años</SelectItem>
                  {getAvailableYears().map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({...filters, status: value})}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={loadHolidays}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredHolidays.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHolidays.map((holiday) => (
                  <TableRow key={holiday.holidayID}>
                    <TableCell className="font-medium">{holiday.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{formatDate(holiday.holidayDate)}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(holiday.holidayDate).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {holiday.description || 'Sin descripción'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={holiday.isActive ? "default" : "secondary"}>
                        {holiday.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditHoliday(holiday)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteClick(holiday)}
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
              <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg mb-2">No hay días feriados registrados</p>
              <p className="text-sm">Los días feriados aparecerán aquí una vez que se creen</p>
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
              ¿Está seguro de que desea eliminar el día feriado "{holidayToDelete?.name}"? 
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteHoliday}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}