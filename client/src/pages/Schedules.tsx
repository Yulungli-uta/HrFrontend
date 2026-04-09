import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePaged } from "@/hooks/pagination/usePaged";
import { parseApiError } from "@/lib/error-handling";

import { HorariosAPI } from "@/lib/api";
import {
  normalizeSchedule,
  type FrontendSchedule,
} from "@/shared/schema";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DataPagination } from "@/components/ui/DataPagination";
import ScheduleForm from "@/components/forms/ScheduleForm";

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
  Trash2,
  Search,
  X,
} from "lucide-react";

export default function SchedulesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState<FrontendSchedule | undefined>(undefined);

  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

  const {
    items: rawSchedules,
    isLoading,
    isError,
    errorMessage,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPage,
    setPageSize,
    setSearch,
    clearSearch,
    currentParams,
  } = usePaged<any>({
    queryKey: "schedules",
    queryFn: (params) => HorariosAPI.listPaged(params),
    initialPageSize: 12,
    initialSortBy: "description",
    initialSortDirection: "asc",
  });

  const schedules = useMemo(
    () => (rawSchedules ?? []).map(normalizeSchedule),
    [rawSchedules]
  );

  const hasSearch = Boolean(currentParams.search?.trim());

  const openCreate = () => {
    setSelected(undefined);
    setIsFormOpen(true);
  };

  const openEdit = (s: FrontendSchedule) => {
    const scheduleId = s.id ?? s.scheduleId;
    if (!scheduleId) {
      toast({
        title: "Error",
        description: "El horario seleccionado no tiene un ID válido",
        variant: "destructive",
      });
      return;
    }

    setSelected(normalizeSchedule(s));
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelected(undefined);
  };

  const handleDelete = async (schedule: FrontendSchedule) => {
    const scheduleId = schedule.id ?? schedule.scheduleId;

    if (!scheduleId) {
      toast({
        title: "Error",
        description: "No se puede eliminar: ID no válido",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`¿Está seguro de eliminar el horario "${schedule.description}"?`)) {
      return;
    }

    try {
      const result = await HorariosAPI.remove(scheduleId);
      if (result.status === "success") {
        toast({
          title: "Horario eliminado",
          description: "El horario ha sido eliminado correctamente",
        });
        goToPage(1);
      } else {
        throw new Error(result.error.message);
      }
    } catch (error: unknown) {
      toast({
        title: "Error al eliminar",
        description: parseApiError(error).message || "No se pudo eliminar el horario",
        variant: "destructive",
      });
    }
  };

  const stats = useMemo(() => {
    return {
      total: totalCount,
      fixed: schedules.filter((s) => !s.isRotating).length,
      rotating: schedules.filter((s) => s.isRotating).length,
      withLunch: schedules.filter((s) => s.hasLunchBreak).length,
      active: schedules.filter((s) => s.isActive).length,
      inactive: schedules.filter((s) => !s.isActive).length,
    };
  }, [schedules, totalCount]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-muted rounded animate-pulse" />
        </div>

        <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : isTablet ? "grid-cols-2" : "grid-cols-3"}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={`skeleton-${i}`} className="animate-pulse">
              <CardHeader className="space-y-2 pb-3">
                <div className="h-5 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-2/3 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive text-center sm:text-left">
              Error al cargar los horarios: {errorMessage || "Error desconocido"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Gestión de Horarios
          </h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Configure y administre los horarios de trabajo del personal
          </p>
        </div>

        <div className="flex items-center justify-center sm:justify-end gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <Monitor className="h-4 w-4" />
            <span>Desktop</span>
          </div>
          <div className="flex sm:hidden items-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4" />
            <span>Móvil</span>
          </div>

          <Dialog open={isFormOpen} onOpenChange={(o) => (o ? setIsFormOpen(true) : closeForm())}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Crear Horario</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </DialogTrigger>

            <DialogContent className={isMobile ? "w-[95vw] max-w-[95vw] p-4 max-h-[90vh] overflow-y-auto" : "max-w-4xl max-h-[90vh] overflow-y-auto"}>
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

              <ScheduleForm schedule={selected} onSuccess={closeForm} onCancel={closeForm} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!isMobile && totalCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-primary p-2 rounded-full">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Total</p>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-success/10 border-success/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-success p-2 rounded-full">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-success">Fijos</p>
                <p className="text-2xl font-bold text-success">{stats.fixed}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/20 border-secondary/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-purple-500 p-2 rounded-full">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-900">Rotativos</p>
                <p className="text-2xl font-bold text-accent-foreground">{stats.rotating}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-warning/10 border-warning/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-orange-500 p-2 rounded-full">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">Con Almuerzo</p>
                <p className="text-2xl font-bold text-secondary-foreground">{stats.withLunch}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-success/10 border-success/30">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-success">Activos</p>
              <p className="text-2xl font-bold text-success">{stats.active}</p>
            </CardContent>
          </Card>

          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-destructive">Inactivos</p>
              <p className="text-2xl font-bold text-destructive">{stats.inactive}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder="Buscar por descripción, días o patrón de rotación..."
              value={currentParams.search ?? ""}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            {hasSearch && (
              <button
                type="button"
                onClick={() => clearSearch()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {schedules.length > 0 ? (
        <>
          {!isMobile ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Listado de horarios
                </CardTitle>
                <CardDescription>
                  Vista tabular con detalles claves - {totalCount} horarios registrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="min-w-full text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[24rem]">Descripción</TableHead>
                        <TableHead>Horario</TableHead>
                        <TableHead>Horas/día</TableHead>
                        <TableHead className="hidden lg:table-cell">Días laborables</TableHead>
                        <TableHead className="hidden md:table-cell">Almuerzo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedules.map((s, idx) => {
                        const lunch =
                          s.hasLunchBreak && s.lunchStart && s.lunchEnd
                            ? `${s.lunchStart} - ${s.lunchEnd}`
                            : "-";

                        const uniqueKey = s.id ?? `schedule-${idx}`;

                        return (
                          <TableRow key={uniqueKey}>
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-semibold">{s.description}</div>
                                <div className="text-xs text-muted-foreground md:hidden">
                                  {s.workingDays}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                {s.entryTime} - {s.exitTime}
                              </Badge>
                            </TableCell>
                            <TableCell>
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
                                <Badge variant="outline" className="bg-accent/50 text-accent-foreground border-secondary/30">
                                  Rotativo
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-background text-muted-foreground">
                                  Fijo
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {s.isActive ? (
                                <Badge className="bg-success/15 text-success">Activo</Badge>
                              ) : (
                                <Badge className="bg-destructive/15 text-destructive">
                                  Inactivo
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="hidden sm:flex"
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
                                      className="text-destructive"
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
            <div className="space-y-4">
              {schedules.map((s, idx) => {
                const lunch =
                  s.hasLunchBreak && s.lunchStart && s.lunchEnd
                    ? `${s.lunchStart} - ${s.lunchEnd}`
                    : "Sin almuerzo";

                const uniqueKey = s.id ?? `schedule-${idx}`;

                return (
                  <Card key={uniqueKey} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold line-clamp-2">
                            {s.description}
                          </CardTitle>
                          <CardDescription className="mt-1">{s.workingDays}</CardDescription>
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
                              className="text-destructive"
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
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">Horario:</span>
                          <Badge variant="outline" className="font-mono text-xs">
                            {s.entryTime} - {s.exitTime}
                          </Badge>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">Horas/día:</span>
                          <Badge variant="secondary" className="font-mono">
                            {s.requiredHoursPerDay}h
                          </Badge>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">Almuerzo:</span>
                          <span className="text-sm">{lunch}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">Tipo:</span>
                          {s.isRotating ? (
                            <Badge variant="outline" className="bg-accent/50 text-accent-foreground border-secondary/30">
                              Rotativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-background text-muted-foreground">
                              Fijo
                            </Badge>
                          )}
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">Estado:</span>
                          {s.isActive ? (
                            <Badge className="bg-success/15 text-success">Activo</Badge>
                          ) : (
                            <Badge className="bg-destructive/15 text-destructive">Inactivo</Badge>
                          )}
                        </div>

                        <div className="pt-2 border-t">
                          <Button variant="outline" size="sm" className="w-full" onClick={() => openEdit(s)}>
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

          <div className="mt-6">
            <DataPagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              hasPreviousPage={hasPreviousPage}
              hasNextPage={hasNextPage}
              onPageChange={goToPage}
              onPageSizeChange={setPageSize}
              disabled={isLoading}
            />
          </div>
        </>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Clock className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {hasSearch ? "No se encontraron horarios" : "No hay horarios configurados"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {hasSearch
                ? "Pruebe con otro término de búsqueda"
                : "Comience creando el primer horario de trabajo para su personal"}
            </p>
            {!hasSearch && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primer Horario
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}