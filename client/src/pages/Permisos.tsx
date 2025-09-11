import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarCheck, Plus, Check, X } from "lucide-react";
import { PermisosAPI, VacacionesAPI, PersonasAPI } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PermisoForm from "@/components/forms/PermisoForm";
import type { Permiso, Vacacion } from "@shared/schema";

export default function Permisos() {
  const [activeTab, setActiveTab] = useState<"permisos" | "vacaciones">("permisos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: personas = [] } = useQuery({
    queryKey: ["/api/v1/rh/personas"],
    queryFn: PersonasAPI.list,
  });

  const { data: permisos = [], isLoading: permisosLoading } = useQuery({
    queryKey: ["/api/v1/rh/permisos"],
    queryFn: () => PermisosAPI.list(),
  });

  const { data: vacaciones = [], isLoading: vacacionesLoading } = useQuery({
    queryKey: ["/api/v1/rh/vacaciones"],
    queryFn: () => VacacionesAPI.list(),
  });

  const updatePermisoMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      PermisosAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permisos"] });
      toast({
        title: "Permiso actualizado",
        description: "El estado del permiso ha sido actualizado.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el permiso.",
        variant: "destructive",
      });
    },
  });

  const getPersonaName = (personaId: number) => {
    const persona = personas.find(p => p.id === personaId);
    return persona ? `${persona.nombres} ${persona.apellidos}` : `ID: ${personaId}`;
  };

  const handleApprove = (id: number) => {
    updatePermisoMutation.mutate({ id, data: { estado: "aprobado" } });
  };

  const handleReject = (id: number) => {
    updatePermisoMutation.mutate({ id, data: { estado: "rechazado" } });
  };

  const getBadgeVariant = (estado: string) => {
    switch (estado) {
      case "aprobado": return "default";
      case "rechazado": return "destructive";
      case "pendiente": return "secondary";
      default: return "secondary";
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Permisos & Vacaciones</h2>
            <p className="text-sm text-muted-foreground mt-1">Gestión de solicitudes y estados</p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-permiso">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Solicitud
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Solicitud de Permiso</DialogTitle>
              </DialogHeader>
              <PermisoForm onSuccess={() => setIsModalOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Tab Navigation */}
        <div className="flex space-x-4 border-b border-border">
          <button
            onClick={() => setActiveTab("permisos")}
            className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "permisos"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-permisos"
          >
            Permisos
          </button>
          <button
            onClick={() => setActiveTab("vacaciones")}
            className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "vacaciones"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-vacaciones"
          >
            Vacaciones
          </button>
        </div>

        {/* Permisos Tab */}
        {activeTab === "permisos" && (
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes de Permisos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {permisosLoading ? (
                <div className="p-6 text-center">Cargando permisos...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Persona</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Desde</TableHead>
                        <TableHead>Hasta</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permisos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                            No hay permisos registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        permisos.map((permiso: Permiso) => (
                          <TableRow key={permiso.id} className="hover:bg-accent">
                            <TableCell data-testid={`text-persona-permiso-${permiso.id}`}>
                              {getPersonaName(permiso.personaId)}
                            </TableCell>
                            <TableCell data-testid={`text-tipo-${permiso.id}`}>
                              {permiso.tipo}
                            </TableCell>
                            <TableCell data-testid={`text-desde-${permiso.id}`}>
                              {permiso.fechaDesde}
                            </TableCell>
                            <TableCell data-testid={`text-hasta-${permiso.id}`}>
                              {permiso.fechaHasta}
                            </TableCell>
                            <TableCell className="max-w-xs truncate" data-testid={`text-motivo-${permiso.id}`}>
                              {permiso.motivo}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getBadgeVariant(permiso.estado!)} data-testid={`badge-estado-permiso-${permiso.id}`}>
                                {permiso.estado}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {permiso.estado === "pendiente" && (
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleApprove(permiso.id)}
                                    data-testid={`button-approve-${permiso.id}`}
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleReject(permiso.id)}
                                    data-testid={`button-reject-${permiso.id}`}
                                  >
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Vacaciones Tab */}
        {activeTab === "vacaciones" && (
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes de Vacaciones</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {vacacionesLoading ? (
                <div className="p-6 text-center">Cargando vacaciones...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Persona</TableHead>
                        <TableHead>Desde</TableHead>
                        <TableHead>Hasta</TableHead>
                        <TableHead>Días</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Observaciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vacaciones.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                            No hay vacaciones registradas
                          </TableCell>
                        </TableRow>
                      ) : (
                        vacaciones.map((vacacion: Vacacion) => (
                          <TableRow key={vacacion.id} className="hover:bg-accent">
                            <TableCell data-testid={`text-persona-vacacion-${vacacion.id}`}>
                              {getPersonaName(vacacion.personaId)}
                            </TableCell>
                            <TableCell data-testid={`text-desde-vacacion-${vacacion.id}`}>
                              {vacacion.fechaDesde}
                            </TableCell>
                            <TableCell data-testid={`text-hasta-vacacion-${vacacion.id}`}>
                              {vacacion.fechaHasta}
                            </TableCell>
                            <TableCell data-testid={`text-dias-${vacacion.id}`}>
                              {vacacion.diasSolicitados}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getBadgeVariant(vacacion.estado!)} data-testid={`badge-estado-vacacion-${vacacion.id}`}>
                                {vacacion.estado}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate" data-testid={`text-observaciones-${vacacion.id}`}>
                              {vacacion.observaciones}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
