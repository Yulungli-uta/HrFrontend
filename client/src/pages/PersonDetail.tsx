import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Person } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Plus
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import PersonForm from "@/components/forms/PersonForm";

export default function PersonDetail() {
  const { id } = useParams();
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  const { data: person, isLoading } = useQuery<Person>({
    queryKey: [`/api/people/${id}`],
    enabled: !!id,
  });

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

          {/* Hoja de Vida - Pestañas */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Hoja de Vida</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="publications" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
                    <TabsTrigger value="publications" className="flex items-center">
                      <FileText className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Publicaciones</span>
                    </TabsTrigger>
                    <TabsTrigger value="family" className="flex items-center">
                      <Users className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Cargas Familiares</span>
                    </TabsTrigger>
                    <TabsTrigger value="experience" className="flex items-center">
                      <Briefcase className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Experiencia</span>
                    </TabsTrigger>
                    <TabsTrigger value="training" className="flex items-center">
                      <GraduationCap className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Capacitaciones</span>
                    </TabsTrigger>
                    <TabsTrigger value="books" className="flex items-center">
                      <BookOpen className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Libros</span>
                    </TabsTrigger>
                    <TabsTrigger value="emergency" className="flex items-center">
                      <Phone className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Emergencia</span>
                    </TabsTrigger>
                    <TabsTrigger value="medical" className="flex items-center">
                      <Heart className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Médico</span>
                    </TabsTrigger>
                    <TabsTrigger value="banking" className="flex items-center">
                      <CreditCard className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Bancario</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="publications" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Publicaciones Científicas</h3>
                        <Button size="sm" className="bg-uta-blue hover:bg-uta-blue/90">
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar Publicación
                        </Button>
                      </div>
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="mx-auto h-12 w-12 mb-4" />
                        <p>No hay publicaciones registradas</p>
                        <p className="text-sm">Agrega las publicaciones científicas y artículos</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="family" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Cargas Familiares</h3>
                        <Button size="sm" className="bg-uta-blue hover:bg-uta-blue/90">
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar Carga Familiar
                        </Button>
                      </div>
                      <div className="text-center py-12 text-gray-500">
                        <Users className="mx-auto h-12 w-12 mb-4" />
                        <p>No hay cargas familiares registradas</p>
                        <p className="text-sm">Agrega información sobre dependientes familiares</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="experience" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Experiencia Laboral</h3>
                        <Button size="sm" className="bg-uta-blue hover:bg-uta-blue/90">
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar Experiencia
                        </Button>
                      </div>
                      <div className="text-center py-12 text-gray-500">
                        <Briefcase className="mx-auto h-12 w-12 mb-4" />
                        <p>No hay experiencias laborales registradas</p>
                        <p className="text-sm">Agrega el historial de experiencia laboral</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="training" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Capacitaciones y Cursos</h3>
                        <Button size="sm" className="bg-uta-blue hover:bg-uta-blue/90">
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar Capacitación
                        </Button>
                      </div>
                      <div className="text-center py-12 text-gray-500">
                        <GraduationCap className="mx-auto h-12 w-12 mb-4" />
                        <p>No hay capacitaciones registradas</p>
                        <p className="text-sm">Agrega cursos, seminarios y capacitaciones</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="books" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Libros Publicados</h3>
                        <Button size="sm" className="bg-uta-blue hover:bg-uta-blue/90">
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar Libro
                        </Button>
                      </div>
                      <div className="text-center py-12 text-gray-500">
                        <BookOpen className="mx-auto h-12 w-12 mb-4" />
                        <p>No hay libros registrados</p>
                        <p className="text-sm">Agrega libros y capítulos publicados</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="emergency" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Contactos de Emergencia</h3>
                        <Button size="sm" className="bg-uta-blue hover:bg-uta-blue/90">
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar Contacto
                        </Button>
                      </div>
                      <div className="text-center py-12 text-gray-500">
                        <Phone className="mx-auto h-12 w-12 mb-4" />
                        <p>No hay contactos de emergencia registrados</p>
                        <p className="text-sm">Agrega contactos para situaciones de emergencia</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="medical" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Información Médica</h3>
                        <Button size="sm" className="bg-uta-blue hover:bg-uta-blue/90">
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar Información
                        </Button>
                      </div>
                      <div className="text-center py-12 text-gray-500">
                        <Heart className="mx-auto h-12 w-12 mb-4" />
                        <p>No hay información médica registrada</p>
                        <p className="text-sm">Agrega enfermedades catastróficas e información médica</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="banking" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Cuentas Bancarias</h3>
                        <Button size="sm" className="bg-uta-blue hover:bg-uta-blue/90">
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar Cuenta
                        </Button>
                      </div>
                      <div className="text-center py-12 text-gray-500">
                        <CreditCard className="mx-auto h-12 w-12 mb-4" />
                        <p>No hay cuentas bancarias registradas</p>
                        <p className="text-sm">Agrega información de cuentas bancarias</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
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