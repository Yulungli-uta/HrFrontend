import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, CalendarDays } from "lucide-react";
import type { Vacation } from "@/shared/schema";
import { VacacionesAPI } from "@/lib/api";
import { usePaged } from "@/hooks/pagination/usePaged";
import { DataPagination } from "@/components/ui/DataPagination";

const statusLabels: Record<string, string> = {
  "Planned": "Planificadas",
  "Approved": "Aprobadas",
  "InProgress": "En Curso",
  "Completed": "Completadas",
  "Canceled": "Canceladas"
};

const statusColors: Record<string, string> = {
  "Planned": "bg-primary/15 text-primary",
  "Approved": "bg-success/15 text-success",
  "InProgress": "bg-warning/15 text-warning",
  "Completed": "bg-success/15 text-success",
  "Canceled": "bg-destructive/15 text-destructive"
};

export default function VacationsPage() {
  // Paginado real desde el servidor, ordenado por fecha de registro descendente
  // (más reciente primero) — antes traía TODO sin paginar ni ordenar.
  const {
    items: vacations,
    isLoading,
    isError,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPage,
    setPageSize,
  } = usePaged<Vacation>({
    queryKey: "vacations-paged",
    queryFn: (params) => VacacionesAPI.listPaged(params),
    initialPageSize: 20,
    initialSortBy: "createdAt",
    initialSortDirection: "desc",
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-6 w-3/4 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-2/3 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">Error al cargar las vacaciones. Intente nuevamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Vacaciones</h1>
          <p className="text-muted-foreground mt-2">Administre las vacaciones del personal universitario</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vacations.map((vacation: any) => (
              <Card key={vacation.id ?? vacation.vacationId ?? vacation.VacationID} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-success" />
                      <span>Vacaciones #{vacation.id ?? vacation.vacationId ?? vacation.VacationID}</span>
                    </div>
                    <Badge className={statusColors[vacation.status as keyof typeof statusColors] || "bg-muted text-foreground"}>
                      {statusLabels[vacation.status as keyof typeof statusLabels] || vacation.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Empleado: #{vacation.employeeId}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span>Desde: {new Date(vacation.startDate as string).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span>Hasta: {new Date(vacation.endDate as string).toLocaleDateString()}</span>
                  </div>

                  <div className="bg-background p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-foreground">Días concedidos:</span>
                      <span className="font-bold text-primary">{vacation.daysGranted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">Días tomados:</span>
                      <span className="font-bold text-success">{vacation.daysTaken}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {vacations.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground/70 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No hay vacaciones registradas</h3>
            </div>
          )}

          <DataPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            hasPreviousPage={hasPreviousPage}
            hasNextPage={hasNextPage}
            onPageChange={goToPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
}
