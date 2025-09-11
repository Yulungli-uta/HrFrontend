import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Person } from "@shared/schema";
import PublicationForm from "@/components/forms/PublicationForm";
import FamilyMemberForm from "@/components/forms/FamilyMemberForm";
import WorkExperienceForm from "@/components/forms/WorkExperienceForm";
import TrainingForm from "@/components/forms/TrainingForm";
import BookForm from "@/components/forms/BookForm";
import EmergencyContactForm from "@/components/forms/EmergencyContactForm";
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
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import PersonForm from "@/components/forms/PersonForm";
import { 
  PersonasAPI, 
  PublicacionesAPI, 
  CargasFamiliaresAPI, 
  ExperienciasLaboralesAPI, 
  CapacitacionesAPI, 
  LibrosAPI, 
  ContactosEmergenciaAPI,
  type ApiResponse
} from "@/lib/api";

export default function PersonDetail() {
  const { id } = useParams();
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isPublicationFormOpen, setIsPublicationFormOpen] = useState(false);
  const [editingPublication, setEditingPublication] = useState<any | undefined>();
  const [isFamilyFormOpen, setIsFamilyFormOpen] = useState(false);
  const [editingFamilyMember, setEditingFamilyMember] = useState<any | undefined>();
  const [isWorkExpFormOpen, setIsWorkExpFormOpen] = useState(false);
  const [editingWorkExperience, setEditingWorkExperience] = useState<any | undefined>();
  const [isTrainingFormOpen, setIsTrainingFormOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<any | undefined>();
  const [isBookFormOpen, setIsBookFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any | undefined>();
  const [isEmergencyContactFormOpen, setIsEmergencyContactFormOpen] = useState(false);
  const [editingEmergencyContact, setEditingEmergencyContact] = useState<any | undefined>();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const personId = Number(id);

  // Consulta para obtener la persona
  const { data: personResponse, isLoading } = useQuery<ApiResponse<Person>>({
    queryKey: [`/api/people/${personId}`],
    queryFn: () => PersonasAPI.get(personId),
    enabled: !!personId,
  });

  const person = personResponse?.status === 'success' ? personResponse.data : undefined;

  // Consultas para obtener datos relacionados con la persona
  const { data: publicationsResponse, isLoading: isLoadingPublications } = useQuery<ApiResponse<any[]>>({
    queryKey: [`/api/cv/publications`],
    queryFn: () => PublicacionesAPI.list(),
    select: (response) => {
      if (response.status === 'success') {
        return {
          status: 'success',
          data: response.data.filter((pub: any) => pub.personId === personId)
        };
      }
      return response;
    },
    enabled: !!personId,
  });

  const publications = publicationsResponse?.status === 'success' ? publicationsResponse.data : [];

  const { data: familyMembersResponse, isLoading: isLoadingFamily } = useQuery<ApiResponse<any[]>>({
    queryKey: [`/api/cv/family-burden`],
    queryFn: () => CargasFamiliaresAPI.list(),
    select: (response) => {
      if (response.status === 'success') {
        return {
          status: 'success',
          data: response.data.filter((fam: any) => fam.personId === personId)
        };
      }
      return response;
    },
    enabled: !!personId,
  });

  const familyMembers = familyMembersResponse?.status === 'success' ? familyMembersResponse.data : [];

  const { data: workExperiencesResponse, isLoading: isLoadingWorkExp } = useQuery<ApiResponse<any[]>>({
    queryKey: [`/api/cv/work-experiences`],
    queryFn: () => ExperienciasLaboralesAPI.list(),
    select: (response) => {
      if (response.status === 'success') {
        return {
          status: 'success',
          data: response.data.filter((work: any) => work.personId === personId)
        };
      }
      return response;
    },
    enabled: !!personId,
  });

  const workExperiences = workExperiencesResponse?.status === 'success' ? workExperiencesResponse.data : [];

  const { data: trainingsResponse, isLoading: isLoadingTrainings } = useQuery<ApiResponse<any[]>>({
    queryKey: [`/api/cv/trainings`],
    queryFn: () => CapacitacionesAPI.list(),
    select: (response) => {
      if (response.status === 'success') {
        return {
          status: 'success',
          data: response.data.filter((train: any) => train.personId === personId)
        };
      }
      return response;
    },
    enabled: !!personId,
  });

  const trainings = trainingsResponse?.status === 'success' ? trainingsResponse.data : [];

  const { data: booksResponse, isLoading: isLoadingBooks } = useQuery<ApiResponse<any[]>>({
    queryKey: [`/api/cv/books`],
    queryFn: () => LibrosAPI.list(),
    select: (response) => {
      if (response.status === 'success') {
        return {
          status: 'success',
          data: response.data.filter((book: any) => book.personId === personId)
        };
      }
      return response;
    },
    enabled: !!personId,
  });

  const books = booksResponse?.status === 'success' ? booksResponse.data : [];

  const { data: emergencyContactsResponse, isLoading: isLoadingEmergencyContacts } = useQuery<ApiResponse<any[]>>({
    queryKey: [`/api/cv/emergency-contacts`],
    queryFn: () => ContactosEmergenciaAPI.list(),
    select: (response) => {
      if (response.status === 'success') {
        return {
          status: 'success',
          data: response.data.filter((contact: any) => contact.personId === personId)
        };
      }
      return response;
    },
    enabled: !!personId,
  });

  const emergencyContacts = emergencyContactsResponse?.status === 'success' ? emergencyContactsResponse.data : [];

  // Mutations
  const createPublicationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await PublicacionesAPI.create({
        ...data,
        personId: personId
      });
      
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cv/publications`] });
      setIsPublicationFormOpen(false);
      setEditingPublication(undefined);
      toast({
        title: "Publicación creada",
        description: "La publicación se ha creado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `No se pudo crear la publicación: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updatePublicationMutation = useMutation({
    mutationFn: async ({ id: pubId, data }: { id: number; data: any }) => {
      const response = await PublicacionesAPI.update(pubId, data);
      
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cv/publications`] });
      setIsPublicationFormOpen(false);
      setEditingPublication(undefined);
      toast({
        title: "Publicación actualizada",
        description: "La publicación se ha actualizado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `No se pudo actualizar la publicación: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deletePublicationMutation = useMutation({
    mutationFn: async (pubId: number) => {
      const response = await PublicacionesAPI.remove(pubId);
      
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cv/publications`] });
      toast({
        title: "Publicación eliminada",
        description: "La publicación se ha eliminado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `No se pudo eliminar la publicación: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreatePublication = async (data: any) => {
    createPublicationMutation.mutate(data);
  };

  const handleUpdatePublication = async (data: any) => {
    if (editingPublication) {
      updatePublicationMutation.mutate({ id: editingPublication.publicationId, data });
    }
  };

  const handleEditPublication = (publication: any) => {
    setEditingPublication(publication);
    setIsPublicationFormOpen(true);
  };

  const handleDeletePublication = (pubId: number) => {
    if (confirm("¿Está seguro de que desea eliminar esta publicación?")) {
      deletePublicationMutation.mutate(pubId);
    }
  };

  // Family Member Mutations
  const createFamilyMemberMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await CargasFamiliaresAPI.create({
        ...data,
        personId: personId
      });
      
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cv/family-burden`] });
      setIsFamilyFormOpen(false);
      setEditingFamilyMember(undefined);
      toast({
        title: "Carga familiar creada",
        description: "La carga familiar se ha creado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `No se pudo crear la carga familiar: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateFamilyMember = async (data: any) => {
    createFamilyMemberMutation.mutate(data);
  };

  // Work Experience Mutations
  const createWorkExperienceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await ExperienciasLaboralesAPI.create({
        ...data,
        personId: personId
      });
      
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cv/work-experiences`] });
      setIsWorkExpFormOpen(false);
      setEditingWorkExperience(undefined);
      toast({
        title: "Experiencia laboral creada",
        description: "La experiencia laboral se ha creado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `No se pudo crear la experiencia laboral: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateWorkExperience = async (data: any) => {
    createWorkExperienceMutation.mutate(data);
  };

  // Training Mutations
  const createTrainingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await CapacitacionesAPI.create({
        ...data,
        personId: personId
      });
      
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cv/trainings`] });
      setIsTrainingFormOpen(false);
      setEditingTraining(undefined);
      toast({
        title: "Capacitación creada",
        description: "La capacitación se ha creado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `No se pudo crear la capacitación: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateTraining = async (data: any) => {
    createTrainingMutation.mutate(data);
  };

  // Book Mutations
  const createBookMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await LibrosAPI.create({
        ...data,
        personId: personId
      });
      
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cv/books`] });
      setIsBookFormOpen(false);
      setEditingBook(undefined);
      toast({
        title: "Libro agregado",
        description: "El libro se ha agregado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `No se pudo agregar el libro: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateBook = async (data: any) => {
    createBookMutation.mutate(data);
  };

  // Emergency Contact Mutations
  const createEmergencyContactMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await ContactosEmergenciaAPI.create({
        ...data,
        personId: personId
      });
      
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cv/emergency-contacts`] });
      setIsEmergencyContactFormOpen(false);
      setEditingEmergencyContact(undefined);
      toast({
        title: "Contacto de emergencia agregado",
        description: "El contacto de emergencia se ha agregado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `No se pudo agregar el contacto de emergencia: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateEmergencyContact = async (data: any) => {
    createEmergencyContactMutation.mutate(data);
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
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="publication-dialog-description">
                      <DialogHeader>
                        <DialogTitle>
                          {editingPublication ? "Editar Publicación" : "Nueva Publicación"}
                        </DialogTitle>
                        <DialogDescription id="publication-dialog-description">
                          {editingPublication ? "Modifica los datos de la publicación científica" : "Agrega una nueva publicación científica al perfil"}
                        </DialogDescription>
                      </DialogHeader>
                      <PublicationForm
                        personId={personId}
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
                        key={publication.publicationId} 
                        className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                        data-testid={`publication-item-${publication.publicationId}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-2" data-testid={`publication-title-${publication.publicationId}`}>
                              {publication.title}
                            </h4>
                            {publication.journalName && (
                              <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">Revista:</span> {publication.journalName}
                              </p>
                            )}
                            {publication.publicationTypeId && (
                              <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">Tipo:</span> {publication.publicationTypeId}
                              </p>
                            )}
                            {publication.publicationDate && (
                              <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">Fecha:</span> {new Date(publication.publicationDate).toLocaleDateString('es-EC')}
                              </p>
                            )}
                            {publication.issn_Isbn && (
                              <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">ISSN/ISBN:</span> {publication.issn_Isbn}
                              </p>
                            )}
                            {publication.location && (
                              <p className="text-sm text-gray-700 mt-2">{publication.location}</p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditPublication(publication)}
                              data-testid={`button-edit-publication-${publication.publicationId}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeletePublication(publication.publicationId)}
                              disabled={deletePublicationMutation.isPending}
                              data-testid={`button-delete-publication-${publication.publicationId}`}
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
                  <Dialog open={isFamilyFormOpen} onOpenChange={setIsFamilyFormOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="bg-uta-blue hover:bg-uta-blue/90"
                        onClick={() => {
                          setEditingFamilyMember(undefined);
                          setIsFamilyFormOpen(true);
                        }}
                        data-testid="button-add-family-member"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="family-dialog-description">
                      <DialogHeader>
                        <DialogTitle>
                          {editingFamilyMember ? "Editar Carga Familiar" : "Nueva Carga Familiar"}
                        </DialogTitle>
                        <DialogDescription id="family-dialog-description">
                          {editingFamilyMember ? "Modifica la información del miembro familiar" : "Registra un nuevo dependiente o familiar"}
                        </DialogDescription>
                      </DialogHeader>
                      <FamilyMemberForm
                        personId={personId}
                        familyMember={editingFamilyMember}
                        onSubmit={handleCreateFamilyMember}
                        onCancel={() => {
                          setIsFamilyFormOpen(false);
                          setEditingFamilyMember(undefined);
                        }}
                        isLoading={createFamilyMemberMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingFamily ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : familyMembers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No hay cargas familiares registradas</p>
                    <p className="text-sm">Agrega información sobre dependientes familiares</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {familyMembers.map((member) => (
                      <div 
                        key={member.burdenId} 
                        className="p-3 border border-gray-200 rounded-lg"
                        data-testid={`family-member-item-${member.burdenId}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {member.firstName} {member.lastName}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {member.identificationTypeId} • CI: {member.dependentId}
                            </p>
                            <p className="text-xs text-gray-500">
                              Fecha de nacimiento: {new Date(member.birthDate).toLocaleDateString('es-EC')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  <Dialog open={isWorkExpFormOpen} onOpenChange={setIsWorkExpFormOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="bg-uta-blue hover:bg-uta-blue/90"
                        onClick={() => {
                          setEditingWorkExperience(undefined);
                          setIsWorkExpFormOpen(true);
                        }}
                        data-testid="button-add-work-experience"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="work-dialog-description">
                      <DialogHeader>
                        <DialogTitle>
                          {editingWorkExperience ? "Editar Experiencia Laboral" : "Nueva Experiencia Laboral"}
                        </DialogTitle>
                        <DialogDescription id="work-dialog-description">
                          {editingWorkExperience ? "Modifica la información de la experiencia laboral" : "Registra una nueva experiencia de trabajo"}
                        </DialogDescription>
                      </DialogHeader>
                      <WorkExperienceForm
                        personId={personId}
                        workExperience={editingWorkExperience}
                        onSubmit={handleCreateWorkExperience}
                        onCancel={() => {
                          setIsWorkExpFormOpen(false);
                          setEditingWorkExperience(undefined);
                        }}
                        isLoading={createWorkExperienceMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingWorkExp ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : workExperiences.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Briefcase className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No hay experiencia laboral registrada</p>
                    <p className="text-sm">Agrega experiencias laborales y empleos anteriores</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workExperiences.map((experience) => (
                      <div 
                        key={experience.workExpId} 
                        className="p-3 border border-gray-200 rounded-lg"
                        data-testid={`work-experience-item-${experience.workExpId}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {experience.position}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {experience.company}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(experience.startDate).toLocaleDateString('es-EC')}
                              {experience.isCurrent ? ' - Actual' : experience.endDate ? ` - ${new Date(experience.endDate).toLocaleDateString('es-EC')}` : ''}
                            </p>
                            {experience.institutionAddress && (
                              <p className="text-xs text-gray-600 mt-1">{experience.institutionAddress}</p>
                            )}
                          </div>
                          {experience.isCurrent && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Actual
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  <Dialog open={isTrainingFormOpen} onOpenChange={setIsTrainingFormOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="bg-uta-blue hover:bg-uta-blue/90"
                        onClick={() => {
                          setEditingTraining(undefined);
                          setIsTrainingFormOpen(true);
                        }}
                        data-testid="button-add-training"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="training-dialog-description">
                      <DialogHeader>
                        <DialogTitle>
                          {editingTraining ? "Editar Capacitación" : "Nueva Capacitación"}
                        </DialogTitle>
                        <DialogDescription id="training-dialog-description">
                          {editingTraining ? "Modifica la información de la capacitación" : "Registra un nuevo curso, seminario o capacitación"}
                        </DialogDescription>
                      </DialogHeader>
                      <TrainingForm
                        personId={personId}
                        training={editingTraining}
                        onSubmit={handleCreateTraining}
                        onCancel={() => {
                          setIsTrainingFormOpen(false);
                          setEditingTraining(undefined);
                        }}
                        isLoading={createTrainingMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingTrainings ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : trainings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <GraduationCap className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No hay capacitaciones registradas</p>
                    <p className="text-sm">Agrega cursos, seminarios y capacitaciones</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trainings.map((training) => (
                      <div 
                        key={training.trainingId} 
                        className="p-3 border border-gray-200 rounded-lg"
                        data-testid={`training-item-${training.trainingId}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {training.title}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {training.institution} • {training.eventTypeId}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(training.startDate).toLocaleDateString('es-EC')}
                              {training.endDate && ` - ${new Date(training.endDate).toLocaleDateString('es-EC')}`}
                              {training.hours && ` • ${training.hours} horas`}
                            </p>
                            {training.location && (
                              <p className="text-xs text-gray-600 mt-1">{training.location}</p>
                            )}
                          </div>
                          {training.certifiedBy && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Certificado
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  <Dialog open={isBookFormOpen} onOpenChange={setIsBookFormOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="bg-uta-blue hover:bg-uta-blue/90"
                        onClick={() => {
                          setEditingBook(undefined);
                          setIsBookFormOpen(true);
                        }}
                        data-testid="button-add-book"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="book-dialog-description">
                      <DialogHeader>
                        <DialogTitle>
                          {editingBook ? "Editar Libro" : "Nuevo Libro"}
                        </DialogTitle>
                        <DialogDescription id="book-dialog-description">
                          {editingBook ? "Modifica la información del libro" : "Registra un nuevo libro o capítulo publicado"}
                        </DialogDescription>
                      </DialogHeader>
                      <BookForm
                        personId={personId}
                        book={editingBook}
                        onSubmit={handleCreateBook}
                        onCancel={() => {
                          setIsBookFormOpen(false);
                          setEditingBook(undefined);
                        }}
                        isLoading={createBookMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingBooks ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : books.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No hay libros registrados</p>
                    <p className="text-sm">Agrega libros y capítulos publicados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {books.map((book) => (
                      <div 
                        key={book.bookId} 
                        className="p-3 border border-gray-200 rounded-lg"
                        data-testid={`book-item-${book.bookId}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {book.title}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {book.publisher}
                              {book.isbn && ` • ISBN: ${book.isbn}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {book.publicationDate && new Date(book.publicationDate).toLocaleDateString('es-EC')}
                            </p>
                            {book.peerReviewed && (
                              <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full mt-1">
                                Revisado por pares
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  <Dialog open={isEmergencyContactFormOpen} onOpenChange={setIsEmergencyContactFormOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="bg-uta-blue hover:bg-uta-blue/90"
                        onClick={() => {
                          setEditingEmergencyContact(undefined);
                          setIsEmergencyContactFormOpen(true);
                        }}
                        data-testid="button-add-emergency-contact"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="emergency-contact-dialog-description">
                      <DialogHeader>
                        <DialogTitle>
                          {editingEmergencyContact ? "Editar Contacto de Emergencia" : "Nuevo Contacto de Emergencia"}
                        </DialogTitle>
                        <DialogDescription id="emergency-contact-dialog-description">
                          {editingEmergencyContact ? "Modifica la información del contacto de emergencia" : "Registra un nuevo contacto para emergencias"}
                        </DialogDescription>
                      </DialogHeader>
                      <EmergencyContactForm
                        personId={personId}
                        emergencyContact={editingEmergencyContact}
                        onSubmit={handleCreateEmergencyContact}
                        onCancel={() => {
                          setIsEmergencyContactFormOpen(false);
                          setEditingEmergencyContact(undefined);
                        }}
                        isLoading={createEmergencyContactMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingEmergencyContacts ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : emergencyContacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Phone className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No hay contactos de emergencia registrados</p>
                    <p className="text-sm">Agrega contactos para situaciones de emergencia</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {emergencyContacts.map((contact) => (
                      <div 
                        key={contact.contactId} 
                        className="p-3 border border-gray-200 rounded-lg"
                        data-testid={`emergency-contact-item-${contact.contactId}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {contact.firstName} {contact.lastName}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {contact.relationshipTypeId} • {contact.phone}
                            </p>
                            {contact.mobile && (
                              <p className="text-xs text-gray-500">Móvil: {contact.mobile}</p>
                            )}
                            {contact.address && (
                              <p className="text-xs text-gray-500">{contact.address}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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