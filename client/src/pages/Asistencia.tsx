import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Plus, Search, Trash } from "lucide-react";
import { MarcacionesAPI, PersonasAPI } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MarcacionForm from "@/components/forms/MarcacionForm";
import type { Marcacion } from "@shared/schema";
import { useAuth } from '@/contexts/AuthContext';

export default function Asistencia() {
  const [personaFilter, setPersonaFilter] = useState<string>("all");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const { employeeDetails, user } = useAuth();

  console.log("detail - employeeID: ",employeeDetails.employeeID);
  console.log("detail - fullname: ",employeeDetails.fullName);
  console.log("detail - email: ",employeeDetails.email);

  const { data: personas = [] } = useQuery({
    queryKey: ["/api/personas"],
    queryFn: PersonasAPI.list,
  });

  const { data: marcaciones = [], isLoading } = useQuery({
    queryKey: ["/api/marcaciones", personaFilter, fechaDesde, fechaHasta],
    queryFn: () => {
      const params: any = {};
      if (personaFilter !== "all") params.personaId = parseInt(personaFilter);
      if (fechaDesde) params.desde = fechaDesde;
      if (fechaHasta) params.hasta = fechaHasta;
      return MarcacionesAPI.list(params);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: MarcacionesAPI.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marcaciones"] });
      toast({
        title: "Marcación eliminada",
        description: "La marcación ha sido eliminada exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la marcación.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    if (window.confirm("¿Está seguro que desea eliminar esta marcación?")) {
      deleteMutation.mutate(id);
    }
  };

  const getPersonaName = (personaId: number) => {
    const persona = personas.find(p => p.id === personaId);
    return persona ? `${persona.nombres} ${persona.apellidos}` : `ID: ${personaId}`;
  };

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case "entrada": return "default";
      case "salida": return "secondary";
      case "descanso_inicio": return "outline";
      case "descanso_fin": return "outline";
      default: return "secondary";
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Control de Asistencia</h2>
            <p className="text-sm text-muted-foreground mt-1">Registro y consulta de marcaciones</p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-marcacion">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Marcación
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Marcación</DialogTitle>
              </DialogHeader>
              <MarcacionForm onSuccess={() => setIsModalOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="persona-filter">Persona</Label>
                <Select value={personaFilter} onValueChange={setPersonaFilter}>
                  <SelectTrigger data-testid="select-persona-filter">
                    <SelectValue placeholder="Todas las personas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las personas</SelectItem>
                    {personas.map((persona) => (
                      <SelectItem key={persona.id} value={persona.id.toString()}>
                        {persona.nombres} {persona.apellidos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="fecha-desde">Fecha Desde</Label>
                <Input
                  id="fecha-desde"
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  data-testid="input-fecha-desde"
                />
              </div>
              <div>
                <Label htmlFor="fecha-hasta">Fecha Hasta</Label>
                <Input
                  id="fecha-hasta"
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  data-testid="input-fecha-hasta"
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full" data-testid="button-search">
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center">Cargando marcaciones...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Persona</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marcaciones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          No se encontraron marcaciones
                        </TableCell>
                      </TableRow>
                    ) : (
                      marcaciones.map((marcacion: Marcacion) => (
                        <TableRow key={marcacion.id} className="hover:bg-accent">
                          <TableCell data-testid={`text-fecha-${marcacion.id}`}>
                            {new Date(marcacion.timestamp).toLocaleDateString()}
                          </TableCell>
                          <TableCell data-testid={`text-persona-${marcacion.id}`}>
                            {getPersonaName(marcacion.personaId)}
                          </TableCell>
                          <TableCell data-testid={`text-hora-${marcacion.id}`}>
                            {new Date(marcacion.timestamp).toLocaleTimeString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariant(marcacion.tipo)} data-testid={`badge-tipo-${marcacion.id}`}>
                              {marcacion.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(marcacion.id)}
                              data-testid={`button-delete-marcacion-${marcacion.id}`}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
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
      </div>
    </>
  );
}
