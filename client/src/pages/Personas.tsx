import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, Edit, Trash, Filter, Plus } from "lucide-react";
import { PersonasAPI } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PersonaForm from "@/components/forms/PersonaForm";
import { Link } from "wouter";
import type { Persona } from "@shared/schema";

export default function Personas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: personas = [], isLoading } = useQuery({
    queryKey: ["/api/personas"],
    queryFn: PersonasAPI.list,
  });

  const deleteMutation = useMutation({
    mutationFn: PersonasAPI.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personas"] });
      toast({
        title: "Persona eliminada",
        description: "La persona ha sido eliminada exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la persona.",
        variant: "destructive",
      });
    },
  });

  const filteredPersonas = personas.filter((persona: Persona) => {
    const matchesSearch = 
      persona.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      persona.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      persona.identificacion.includes(searchTerm) ||
      (persona.emailInstitucional && persona.emailInstitucional.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && persona.estado) ||
      (statusFilter === "inactive" && !persona.estado);
    
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id: number) => {
    if (window.confirm("¿Está seguro que desea eliminar esta persona?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Gestión de Personas</h2>
            <p className="text-sm text-muted-foreground mt-1">Administra empleados y sus datos personales</p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-persona">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Persona
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nueva Persona</DialogTitle>
              </DialogHeader>
              <PersonaForm onSuccess={() => setIsModalOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Buscar por nombre, identificación o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-personas"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" data-testid="button-apply-filter">
                <Filter className="mr-2 h-4 w-4" />
                Filtrar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Personas Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center">Cargando personas...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Identificación</TableHead>
                      <TableHead>Nombre Completo</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPersonas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          No se encontraron personas
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPersonas.map((persona: Persona) => (
                        <TableRow key={persona.id} className="hover:bg-accent">
                          <TableCell className="font-medium" data-testid={`text-identificacion-${persona.id}`}>
                            {persona.identificacion}
                          </TableCell>
                          <TableCell data-testid={`text-nombre-${persona.id}`}>
                            {persona.nombres} {persona.apellidos}
                          </TableCell>
                          <TableCell className="text-muted-foreground" data-testid={`text-email-${persona.id}`}>
                            {persona.emailInstitucional || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={persona.estado ? "default" : "secondary"}
                              data-testid={`badge-estado-${persona.id}`}
                            >
                              {persona.estado ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Link href={`/personas/${persona.id}`}>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  data-testid={`button-view-${persona.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                data-testid={`button-edit-${persona.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDelete(persona.id)}
                                data-testid={`button-delete-${persona.id}`}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
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
