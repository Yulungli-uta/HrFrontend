import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Person } from "@shared/schema";
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
                  <Button size="sm" className="bg-uta-blue hover:bg-uta-blue/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No hay publicaciones registradas</p>
                  <p className="text-sm">Agrega publicaciones científicas y artículos</p>
                </div>
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