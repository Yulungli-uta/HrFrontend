import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Clock, Plus } from "lucide-react";
import type { Schedule } from "@shared/schema";
import ScheduleForm from "@/components/forms/ScheduleForm";
import { HorariosAPI, type ApiResponse } from "@/lib/api";

export default function SchedulesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState<Schedule | undefined>(undefined); // <- para editar

  const { data: apiResponse, isLoading, error } = useQuery<ApiResponse<Schedule[]>>({
    queryKey: ["/api/v1/rh/schedules"],
    queryFn: () => HorariosAPI.list(),
  });

  const schedules = apiResponse?.status === "success" ? apiResponse.data : [];

  const openCreate = () => {
    setSelected(undefined);
    setIsFormOpen(true);
  };

  const openEdit = (s: Schedule) => {
    setSelected(s);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelected(undefined);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={`skeleton-${i}`} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-6 w-3/4 bg-gray-200 rounded" />
                <div className="h-4 w-1/2 bg-gray-200 rounded" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-2/3 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Error al cargar los horarios. Intente nuevamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (apiResponse?.status === "error") {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Error al cargar los horarios: {apiResponse.error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Horarios</h1>
          <p className="text-gray-600 mt-2">Configure y administre los horarios de trabajo del personal</p>
        </div>

        {/* Dialog Crear/Editar */}
        <Dialog open={isFormOpen} onOpenChange={(o) => (o ? setIsFormOpen(true) : closeForm())}>
          <DialogTrigger asChild>
            <Button
              data-testid="button-add-schedule"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={openCreate}
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear Horario
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selected ? "Editar horario" : "Crear horario"}</DialogTitle>
              <DialogDescription>
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

      {/* Tabla */}
      {schedules.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Listado de horarios</CardTitle>
            <CardDescription>Vista tabular con detalles claves</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[900px] text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[28rem]">Descripción</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Horas/día</TableHead>
                    <TableHead>Días laborables</TableHead>
                    <TableHead>Almuerzo</TableHead>
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
                        <TableCell data-testid={`text-schedule-${uniqueKey}`} className="font-medium">
                          {s.description}
                        </TableCell>
                        <TableCell data-testid={`text-hours-${uniqueKey}`}>
                          {s.entryTime} - {s.exitTime}
                        </TableCell>
                        <TableCell data-testid={`text-required-hours-${uniqueKey}`}>
                          {s.requiredHoursPerDay}h
                        </TableCell>
                        <TableCell className="whitespace-pre-wrap" data-testid={`text-working-days-${uniqueKey}`}>
                          {s.workingDays}
                        </TableCell>
                        <TableCell>{lunch}</TableCell>
                        <TableCell>
                          {s.isRotating ? (
                            <Badge variant="outline" className="text-xs">Rotativo</Badge>
                          ) : (
                            <span className="text-gray-500">Fijo</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto"
                            data-testid={`button-view-schedule-${uniqueKey}`}
                            onClick={() => openEdit(s)} // <- abre en modo edición
                          >
                            Ver detalles
                          </Button>
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
        <Card className="text-center py-12">
          <CardContent>
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay horarios configurados</h3>
            <p className="text-gray-600 mb-4">Comience creando el primer horario de trabajo</p>
            <Button data-testid="button-add-first-schedule" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Primer Horario
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
