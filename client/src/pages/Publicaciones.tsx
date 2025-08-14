import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Eye, Edit, Trash, Filter, Plus } from "lucide-react";
import { PublicacionesAPI } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Publicacion, InsertPublicacion } from "@shared/schema";

const publicacionSchema = z.object({
  titulo: z.string().min(1, "El título es requerido"),
  contenido: z.string().min(1, "El contenido es requerido"),
  tipo: z.enum(["noticia", "comunicado", "evento"], {
    required_error: "El tipo es requerido"
  }),
  fechaPublicacion: z.string().min(1, "La fecha de publicación es requerida"),
  autorId: z.number().optional(),
});

type PublicacionFormData = z.infer<typeof publicacionSchema>;

export default function Publicaciones() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPublicacion, setEditingPublicacion] = useState<Publicacion | null>(null);
  const { toast } = useToast();

  const { data: publicaciones = [], isLoading } = useQuery({
    queryKey: ["/api/publicaciones"],
    queryFn: PublicacionesAPI.list,
  });

  const createMutation = useMutation({
    mutationFn: PublicacionesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publicaciones"] });
      toast({
        title: "Publicación creada",
        description: "La publicación ha sido creada exitosamente.",
      });
      setIsModalOpen(false);
      reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la publicación.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertPublicacion> }) =>
      PublicacionesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publicaciones"] });
      toast({
        title: "Publicación actualizada",
        description: "La publicación ha sido actualizada exitosamente.",
      });
      setIsModalOpen(false);
      setEditingPublicacion(null);
      reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la publicación.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: PublicacionesAPI.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publicaciones"] });
      toast({
        title: "Publicación eliminada",
        description: "La publicación ha sido eliminada exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la publicación.",
        variant: "destructive",
      });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PublicacionFormData>({
    resolver: zodResolver(publicacionSchema),
  });

  const filteredPublicaciones = publicaciones.filter((publicacion: Publicacion) => {
    const matchesSearch = 
      publicacion.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      publicacion.contenido.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTipo = tipoFilter === "all" || publicacion.tipo === tipoFilter;
    
    const publicacionYear = new Date(publicacion.fechaPublicacion).getFullYear().toString();
    const matchesYear = yearFilter === "all" || publicacionYear === yearFilter;
    
    return matchesSearch && matchesTipo && matchesYear;
  });

  const uniqueYears = Array.from(
    new Set(publicaciones.map(p => new Date(p.fechaPublicacion).getFullYear()))
  ).sort((a, b) => b - a);

  const handleEdit = (publicacion: Publicacion) => {
    setEditingPublicacion(publicacion);
    setValue("titulo", publicacion.titulo);
    setValue("contenido", publicacion.contenido);
    setValue("tipo", publicacion.tipo as "noticia" | "comunicado" | "evento");
    setValue("fechaPublicacion", publicacion.fechaPublicacion);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("¿Está seguro que desea eliminar esta publicación?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: PublicacionFormData) => {
    if (editingPublicacion) {
      updateMutation.mutate({ id: editingPublicacion.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleNewPublicacion = () => {
    setEditingPublicacion(null);
    reset();
    setIsModalOpen(true);
  };

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case "noticia": return "default";
      case "comunicado": return "secondary";
      case "evento": return "outline";
      default: return "secondary";
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Gestión de Publicaciones</h2>
            <p className="text-sm text-muted-foreground mt-1">Administra noticias, comunicados y eventos</p>
          </div>
          <Button onClick={handleNewPublicacion} data-testid="button-new-publicacion">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Publicación
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Buscar por título o contenido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-publicaciones"
                />
              </div>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger data-testid="select-tipo-filter">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="noticia">Noticia</SelectItem>
                  <SelectItem value="comunicado">Comunicado</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger data-testid="select-year-filter">
                  <SelectValue placeholder="Todos los años" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los años</SelectItem>
                  {uniqueYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" data-testid="button-apply-filter">
                <Filter className="mr-2 h-4 w-4" />
                Filtrar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Publicaciones Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center">Cargando publicaciones...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPublicaciones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          No se encontraron publicaciones
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPublicaciones.map((publicacion: Publicacion) => (
                        <TableRow key={publicacion.id} className="hover:bg-accent">
                          <TableCell className="font-medium max-w-xs truncate" data-testid={`text-titulo-${publicacion.id}`}>
                            {publicacion.titulo}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariant(publicacion.tipo)} data-testid={`badge-tipo-${publicacion.id}`}>
                              {publicacion.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-fecha-${publicacion.id}`}>
                            {new Date(publicacion.fechaPublicacion).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={publicacion.activo ? "default" : "secondary"} data-testid={`badge-estado-${publicacion.id}`}>
                              {publicacion.activo ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                data-testid={`button-view-${publicacion.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEdit(publicacion)}
                                data-testid={`button-edit-${publicacion.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDelete(publicacion.id)}
                                data-testid={`button-delete-${publicacion.id}`}
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

      {/* Modal for New/Edit Publicacion */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPublicacion ? "Editar Publicación" : "Nueva Publicación"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="titulo">
                  Título <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="titulo"
                  {...register("titulo")}
                  placeholder="Título de la publicación"
                  data-testid="input-titulo"
                />
                {errors.titulo && (
                  <p className="text-sm text-destructive mt-1">{errors.titulo.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="tipo">
                  Tipo <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(value) => setValue("tipo", value as "noticia" | "comunicado" | "evento")}
                  defaultValue=""
                >
                  <SelectTrigger data-testid="select-tipo">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="noticia">Noticia</SelectItem>
                    <SelectItem value="comunicado">Comunicado</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tipo && (
                  <p className="text-sm text-destructive mt-1">{errors.tipo.message}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="fechaPublicacion">
                  Fecha de Publicación <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fechaPublicacion"
                  type="date"
                  {...register("fechaPublicacion")}
                  data-testid="input-fecha-publicacion"
                />
                {errors.fechaPublicacion && (
                  <p className="text-sm text-destructive mt-1">{errors.fechaPublicacion.message}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="contenido">
                  Contenido <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="contenido"
                  {...register("contenido")}
                  placeholder="Contenido de la publicación"
                  rows={6}
                  data-testid="textarea-contenido"
                />
                {errors.contenido && (
                  <p className="text-sm text-destructive mt-1">{errors.contenido.message}</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                {editingPublicacion ? "Actualizar" : "Crear"} Publicación
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
