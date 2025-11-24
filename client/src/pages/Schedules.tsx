// src/pages/SchedulesPage.tsx - VERSIÓN COMPLETA CORREGIDA
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { 
  Clock, 
  Plus, 
  MoreVertical, 
  Smartphone,
  Monitor,
  Calendar,
  Users,
  Settings,
  Edit,
  Trash2
} from "lucide-react";
import type { Schedule } from "@shared/schema";
import ScheduleForm from "@/components/forms/ScheduleForm";
import { HorariosAPI, type ApiResponse } from "@/lib/api";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/use-media-query";

export default function SchedulesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState<Schedule | undefined>(undefined);
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

  const { data: apiResponse, isLoading, error, refetch } = useQuery<ApiResponse<Schedule[]>>({
    queryKey: ["/api/v1/rh/schedules"],
    queryFn: () => HorariosAPI.list(),
  });

  const schedules = apiResponse?.status === "success" ? apiResponse.data : [];

  const openCreate = () => {
    setSelected(undefined);
    setIsFormOpen(true);
  };

  const openEdit = (s: Schedule) => {
    console.log("📝 Abriendo edición para:", s);
    console.log("🆔 ID del schedule:", s.id);   
    console.log("🆔 scheduleId:", s.scheduleId);
    console.log("🆔 id:", (s as any).id);
    
    if (!s.scheduleId) {
      toast({
        title: "❌ Error",
        description: "El horario seleccionado no tiene un ID válido",
        variant: "destructive"
      });
      return;
    }
    
    setSelected(s);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelected(undefined);
  };

  const handleDelete = async (schedule: Schedule) => {
    if (!schedule.id) {
      toast({
        title: "❌ Error",
        description: "No se puede eliminar: ID no válido",
        variant: "destructive"
      });
      return;
    }
    
    if (!confirm(`¿Está seguro de eliminar el horario "${schedule.description}"?`)) {
      return;
    }

    try {
      const result = await HorariosAPI.remove(schedule.id);
      if (result.status === "success") {
        toast({
          title: "✅ Horario eliminado",
          description: "El horario ha sido eliminado correctamente",
        });
        refetch();
      } else {
        throw new Error(result.error.message);
      }
    } catch (error: any) {
      toast({
        title: "❌ Error al eliminar",
        description: error.message || "No se pudo eliminar el horario",
        variant: "destructive",
      });
    }
  };

  // Loading State Responsive
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Grid Skeleton - Responsive */}
        <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : isTablet ? "grid-cols-2" : "grid-cols-3"}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={`skeleton-${i}`} className="animate-pulse">
              <CardHeader className="space-y-2 pb-3">
                <div className="h-5 w-3/4 bg-gray-200 rounded" />
                <div className="h-3 w-1/2 bg-gray-200 rounded" />
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div className="h-3 w-full bg-gray-200 rounded" />
                <div className="h-3 w-2/3 bg-gray-200 rounded" />
                <div className="h-3 w-1/2 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error States
  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 text-center sm:text-left">
              Error al cargar los horarios. Intente nuevamente.
            </p>
            <Button onClick={() => refetch()} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (apiResponse?.status === "error") {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 text-center sm:text-left">
              Error al cargar los horarios: {apiResponse.error.message}
            </p>
            <Button onClick={() => refetch()} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      {/* Header Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Gestión de Horarios
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            Configure y administre los horarios de trabajo del personal
          </p>
        </div>

        {/* Device Indicator */}
        <div className="flex items-center justify-center sm:justify-end gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
            <Monitor className="h-4 w-4" />
            <span>Desktop</span>
          </div>
          <div className="flex sm:hidden items-center gap-2 text-sm text-gray-500">
            <Smartphone className="h-4 w-4" />
            <span>Móvil</span>
          </div>

          {/* Dialog Crear/Editar */}
          <Dialog open={isFormOpen} onOpenChange={(o) => (o ? setIsFormOpen(true) : closeForm())}>
            <DialogTrigger asChild>
              <Button
                data-testid="button-add-schedule"
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                onClick={openCreate}
                size={isMobile ? "default" : "default"}
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Crear Horario</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </DialogTrigger>

            <DialogContent className={`max-h-[90vh] overflow-y-auto ${
              isMobile ? "w-[95vw] max-w-[95vw] p-4" : "max-w-4xl"
            }`}>
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">
                  {selected ? "Editar horario" : "Crear horario"}
                </DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  {selected
                    ? "Modifique los campos necesarios y guarde los cambios."
                    : "Complete los campos para registrar un nuevo horario."}
                </DialogDescription>
              </DialogHeader>

              <ScheduleForm
                schedule={selected}
                onSuccess={closeForm}
                onCancel={closeForm}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards - Solo en desktop/tablet */}
      {!isMobile && schedules.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-blue-500 p-2 rounded-full">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Total Horarios</p>
                <p className="text-2xl font-bold text-blue-700">{schedules.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-green-500 p-2 rounded-full">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-900">Horarios Fijos</p>
                <p className="text-2xl font-bold text-green-700">
                  {schedules.filter(s => !s.isRotating).length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-purple-500 p-2 rounded-full">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-900">Rotativos</p>
                <p className="text-2xl font-bold text-purple-700">
                  {schedules.filter(s => s.isRotating).length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-orange-500 p-2 rounded-full">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">Con Almuerzo</p>
                <p className="text-2xl font-bold text-orange-700">
                  {schedules.filter(s => s.hasLunchBreak).length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contenido Principal - Vista Tabla (Desktop) vs Cards (Mobile) */}
      {schedules.length > 0 ? (
        <>
          {/* Vista Desktop/Tablet - Tabla */}
          {!isMobile ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Listado de horarios
                </CardTitle>
                <CardDescription>
                  Vista tabular con detalles claves - {schedules.length} horarios registrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="min-w-full text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[28rem]">Descripción</TableHead>
                        <TableHead>Horario</TableHead>
                        <TableHead>Horas/día</TableHead>
                        <TableHead className="hidden lg:table-cell">Días laborables</TableHead>
                        <TableHead className="hidden md:table-cell">Almuerzo</TableHead>
                        <TableHead>Rotativo</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedules.map((s, idx) => {
                        const lunch =
                          s.hasLunchBreak && s.lunchStart && s.lunchEnd
                            ? `${s.lunchStart} - ${s.lunchEnd}`
                            : "-";
                        const uniqueKey = s.id || `schedule-${idx}`;
                        return (
                          <TableRow key={uniqueKey} data-testid={`row-schedule-${uniqueKey}`}>
                            <TableCell className="font-medium">
                              <div>
                                <div data-testid={`text-schedule-${uniqueKey}`} className="font-semibold">
                                  {s.description}
                                </div>
                                <div className="text-xs text-gray-500 md:hidden">
                                  {s.workingDays}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell data-testid={`text-hours-${uniqueKey}`}>
                              <Badge variant="outline" className="font-mono text-xs">
                                {s.entryTime} - {s.exitTime}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-required-hours-${uniqueKey}`}>
                              <Badge variant="secondary" className="font-mono">
                                {s.requiredHoursPerDay}h
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell whitespace-pre-wrap">
                              {s.workingDays}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {lunch}
                            </TableCell>
                            <TableCell>
                              {s.isRotating ? (
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                  Rotativo
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                                  Fijo
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="hidden sm:flex"
                                  data-testid={`button-view-schedule-${uniqueKey}`}
                                  onClick={() => openEdit(s)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Editar
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEdit(s)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDelete(s)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Vista Mobile - Cards */
            <div className="space-y-4">
              {schedules.map((s, idx) => {
                const lunch =
                  s.hasLunchBreak && s.lunchStart && s.lunchEnd
                    ? `${s.lunchStart} - ${s.lunchEnd}`
                    : "Sin almuerzo";
                const uniqueKey = s.id || `schedule-${idx}`;
                
                return (
                  <Card key={uniqueKey} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold line-clamp-2">
                            {s.description}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {s.workingDays}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(s)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(s)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {/* Horario */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-500">Horario:</span>
                          <Badge variant="outline" className="font-mono text-xs">
                            {s.entryTime} - {s.exitTime}
                          </Badge>
                        </div>
                        
                        {/* Horas requeridas */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-500">Horas/día:</span>
                          <Badge variant="secondary" className="font-mono">
                            {s.requiredHoursPerDay}h
                          </Badge>
                        </div>
                        
                        {/* Almuerzo */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-500">Almuerzo:</span>
                          <span className="text-sm">{lunch}</span>
                        </div>
                        
                        {/* Tipo */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-500">Tipo:</span>
                          {s.isRotating ? (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              Rotativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                              Fijo
                            </Badge>
                          )}
                        </div>
                        
                        {/* Acciones */}
                        <div className="pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => openEdit(s)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Ver y Editar Detalles
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Estado Vacío */
        <Card className="text-center py-12">
          <CardContent>
            <Clock className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay horarios configurados
            </h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              Comience creando el primer horario de trabajo para su personal
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                data-testid="button-add-first-schedule" 
                onClick={openCreate}
                size={isMobile ? "default" : "default"}
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear Primer Horario
              </Button>
              <Button 
                variant="outline" 
                onClick={() => toast({
                  title: "Guía rápida",
                  description: "Use las plantillas para crear horarios comunes rápidamente",
                })}
              >
                Ver Ayuda
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}