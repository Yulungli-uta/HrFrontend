import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Person, Publication } from "@shared/schema";
import PublicationForm from "@/components/forms/PublicationForm";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  FileText, 
  Briefcase, 
  GraduationCap, 
  BookOpen, 
  Users, 
  Phone, 
  Heart, 
  CreditCard,
  ArrowLeft,
  Edit,
  Plus,
  Trash2
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import PersonForm from "@/components/forms/PersonForm";

export default function PersonDetail() {
  const { id } = useParams();
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isPublicationFormOpen, setIsPublicationFormOpen] = useState(false);
  const [editingPublication, setEditingPublication] = useState<Publication | undefined>();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: person, isLoading } = useQuery<Person>({
    queryKey: [`/api/people/${id}`],
    enabled: !!id,
  });

  const { data: publications = [], isLoading: isLoadingPublications } = useQuery<Publication[]>({
    queryKey: [`/api/people/${id}/publications`],
    enabled: !!id,
  });

  // Mutations
  const createPublicationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/publications`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/people/${id}/publications`] });
      setIsPublicationFormOpen(false);
      setEditingPublication(undefined);
      toast({
        title: "Publicación creada",
        description: "La publicación se ha creado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la publicación.",
        variant: "destructive",
      });
    },
  });

  const updatePublicationMutation = useMutation({
    mutationFn: async ({ id: pubId, data }: { id: number; data: any }) => {
      return apiRequest(`/api/publications/${pubId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/people/${id}/publications`] });
      setIsPublicationFormOpen(false);
      setEditingPublication(undefined);
      toast({
        title: "Publicación actualizada",
        description: "La publicación se ha actualizado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la publicación.",
        variant: "destructive",
      });
    },
  });

  const deletePublicationMutation = useMutation({
    mutationFn: async (pubId: number) => {
      return apiRequest(`/api/publications/${pubId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/people/${id}/publications`] });
      toast({
        title: "Publicación eliminada",
        description: "La publicación se ha eliminado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la publicación.",
        variant: "destructive",
      });
    },
  });

  const handleCreatePublication = async (data: any) => {
    createPublicationMutation.mutate(data);
  };

  const handleUpdatePublication = async (data: any) => {
    if (editingPublication) {
      updatePublicationMutation.mutate({ id: editingPublication.id, data });
    }
  };

  const handleEditPublication = (publication: Publication) => {
    setEditingPublication(publication);
    setIsPublicationFormOpen(true);
  };

  const handleDeletePublication = (pubId: number) => {
    if (confirm("¿Está seguro de que desea eliminar esta publicación?")) {
      deletePublicationMutation.mutate(pubId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-96 bg-gray-300 rounded"></div>
              <div className="lg:col-span-2 h-96 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">Persona no encontrada</h2>
            <p className="mt-2 text-gray-600">La persona que buscas no existe o fue eliminada.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {person.firstName} {person.lastName}
                </h1>
                <p className="text-gray-600">CI: {person.idCard}</p>
              </div>
            </div>
            <Button 
              onClick={() => setIsEditFormOpen(true)}
              className="bg-uta-blue hover:bg-uta-blue/90"
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar Información
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información Personal */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Estado</label>
                  <div className="mt-1">
                    <Badge variant={person.isActive ? "default" : "secondary"}>
                      {person.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Correo Electrónico</label>
                  <p className="mt-1 text-gray-900">{person.email}</p>
                </div>

                {person.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Teléfono</label>
                    <p className="mt-1 text-gray-900">{person.phone}</p>
                  </div>
                )}

                {person.birthDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Fecha de Nacimiento</label>
                    <p className="mt-1 text-gray-900">
                      {new Date(person.birthDate).toLocaleDateString('es-EC', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}

                {person.sex && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Sexo</label>
                    <p className="mt-1 text-gray-900">{person.sex}</p>
                  </div>
                )}

                {person.gender && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Género</label>
                    <p className="mt-1 text-gray-900">{person.gender}</p>
                  </div>
                )}

                {person.address && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Dirección</label>
                    <p className="mt-1 text-gray-900">{person.address}</p>
                  </div>
                )}

                {person.disability && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Discapacidad</label>
                    <p className="mt-1 text-gray-900">{person.disability}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Hoja de Vida - Secciones */}
          <div className="lg:col-span-2 space-y-6">
            {/* Publicaciones Científicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Publicaciones Científicas
                  </div>
                  <Dialog open={isPublicationFormOpen} onOpenChange={setIsPublicationFormOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="bg-uta-blue hover:bg-uta-blue/90"
                        onClick={() => {
                          setEditingPublication(undefined);
                          setIsPublicationFormOpen(true);
                        }}
                        data-testid="button-add-publication"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingPublication ? "Editar Publicación" : "Nueva Publicación"}
                        </DialogTitle>
                      </DialogHeader>
                      <PublicationForm
                        personId={parseInt(id!)}
                        publication={editingPublication}
                        onSubmit={editingPublication ? handleUpdatePublication : handleCreatePublication}
                        onCancel={() => {
                          setIsPublicationFormOpen(false);
                          setEditingPublication(undefined);
                        }}
                        isLoading={createPublicationMutation.isPending || updatePublicationMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPublications ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : publications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No hay publicaciones registradas</p>
                    <p className="text-sm">Agrega publicaciones científicas y artículos</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {publications.map((publication) => (
                      <div 
                        key={publication.id} 
                        className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                        data-testid={`publication-item-${publication.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-2" data-testid={`publication-title-${publication.id}`}>
                              {publication.title}
                            </h4>
                            {publication.journal && (
                              <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">Revista:</span> {publication.journal}
                              </p>
                            )}
                            {publication.type && (
                              <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">Tipo:</span> {publication.type}
                              </p>
                            )}
                            {publication.publicationDate && (
                              <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">Fecha:</span> {new Date(publication.publicationDate).toLocaleDateString('es-EC')}
                              </p>
                            )}
                            {publication.doi && (
                              <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">DOI:</span> {publication.doi}
                              </p>
                            )}
                            {publication.description && (
                              <p className="text-sm text-gray-700 mt-2">{publication.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditPublication(publication)}
                              data-testid={`button-edit-publication-${publication.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeletePublication(publication.id)}
                              disabled={deletePublicationMutation.isPending}
                              data-testid={`button-delete-publication-${publication.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cargas Familiares */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Cargas Familiares
                  </div>
                  <Button size="sm" className="bg-uta-blue hover:bg-uta-blue/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No hay cargas familiares registradas</p>
                  <p className="text-sm">Agrega información sobre dependientes familiares</p>
                </div>
              </CardContent>
            </Card>

            {/* Experiencia Laboral */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Briefcase className="mr-2 h-5 w-5" />
                    Experiencia Laboral
                  </div>
                  <Button size="sm" className="bg-uta-blue hover:bg-uta-blue/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Briefcase className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No hay experiencias laborales registradas</p>
                  <p className="text-sm">Agrega el historial de experiencia laboral</p>
                </div>
              </CardContent>
            </Card>

            {/* Capacitaciones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <GraduationCap className="mr-2 h-5 w-5" />
                    Capacitaciones y Cursos
                  </div>
                  <Button size="sm" className="bg-uta-blue hover:bg-uta-blue/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <GraduationCap className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No hay capacitaciones registradas</p>
                  <p className="text-sm">Agrega cursos, seminarios y capacitaciones</p>
                </div>
              </CardContent>
            </Card>

            {/* Libros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BookOpen className="mr-2 h-5 w-5" />
                    Libros Publicados
                  </div>
                  <Button size="sm" className="bg-uta-blue hover:bg-uta-blue/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No hay libros registrados</p>
                  <p className="text-sm">Agrega libros y capítulos publicados</p>
                </div>
              </CardContent>
            </Card>

            {/* Contactos de Emergencia */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Phone className="mr-2 h-5 w-5" />
                    Contactos de Emergencia
                  </div>
                  <Button size="sm" className="bg-uta-blue hover:bg-uta-blue/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Phone className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No hay contactos de emergencia registrados</p>
                  <p className="text-sm">Agrega contactos para situaciones de emergencia</p>
                </div>
              </CardContent>
            </Card>

            {/* Información Médica */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Heart className="mr-2 h-5 w-5" />
                    Información Médica
                  </div>
                  <Button size="sm" className="bg-uta-blue hover:bg-uta-blue/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Heart className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No hay información médica registrada</p>
                  <p className="text-sm">Agrega enfermedades catastróficas e información médica</p>
                </div>
              </CardContent>
            </Card>

            {/* Cuentas Bancarias */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Cuentas Bancarias
                  </div>
                  <Button size="sm" className="bg-uta-blue hover:bg-uta-blue/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No hay cuentas bancarias registradas</p>
                  <p className="text-sm">Agrega información de cuentas bancarias</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Diálogo de Edición */}
        <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogTitle>Modificar Información Personal</DialogTitle>
            <PersonForm 
              person={person}
              onSuccess={() => setIsEditFormOpen(false)}
              onCancel={() => setIsEditFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}