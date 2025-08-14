import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Mail, Phone, Calendar } from "lucide-react";
import type { Person } from "@shared/schema";

export default function PeoplePage() {
  const { data: people, isLoading, error } = useQuery<Person[]>({
    queryKey: ['/api/people'],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
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
            <p className="text-red-600">Error al cargar las personas. Intente nuevamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Personas</h1>
          <p className="text-gray-600 mt-2">Administre la información personal de todos los miembros de la universidad</p>
        </div>
        <Button 
          data-testid="button-add-person"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Agregar Persona
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {people?.map((person) => (
          <Card key={person.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span data-testid={`text-name-${person.id}`}>
                  {person.firstName} {person.lastName}
                </span>
                <Badge 
                  variant={person.isActive ? "default" : "secondary"}
                  data-testid={`status-active-${person.id}`}
                >
                  {person.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </CardTitle>
              <CardDescription data-testid={`text-idcard-${person.id}`}>
                CI: {person.idCard}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span data-testid={`text-email-${person.id}`}>{person.email}</span>
              </div>
              {person.phone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span data-testid={`text-phone-${person.id}`}>{person.phone}</span>
                </div>
              )}
              {person.birthDate && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span data-testid={`text-birthdate-${person.id}`}>
                    {new Date(person.birthDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {person.address && (
                <p className="text-sm text-gray-600 mt-2" data-testid={`text-address-${person.id}`}>
                  {person.address}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {people && people.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay personas registradas</h3>
            <p className="text-gray-600 mb-4">Comience agregando la primera persona al sistema</p>
            <Button data-testid="button-add-first-person">
              <UserPlus className="mr-2 h-4 w-4" />
              Agregar Primera Persona
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}