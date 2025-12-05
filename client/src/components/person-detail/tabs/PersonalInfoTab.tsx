// client/src/components/person-detail/tabs/PersonalInfoTab.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Edit, Mail, Phone, Calendar, MapPin, Heart } from "lucide-react";
import { Person } from "@/types/person";

interface PersonalInfoTabProps {
  person: Person;
  onEdit: () => void;
}

export function PersonalInfoTab({ person, onEdit }: PersonalInfoTabProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center text-lg">
              <User className="mr-2 h-5 w-5" />
              Información Personal
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Estado</span>
              <Badge variant={person.isActive ? "default" : "secondary"}>
                {person.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Correo Electrónico</p>
                  <p className="text-gray-900">{person.email}</p>
                </div>
              </div>

              {person.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Teléfono</p>
                    <p className="text-gray-900">{person.phone}</p>
                  </div>
                </div>
              )}

              {person.birthDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Fecha de Nacimiento</p>
                    <p className="text-gray-900">{formatDate(person.birthDate)}</p>
                  </div>
                </div>
              )}

              {person.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Dirección</p>
                    <p className="text-gray-900">{person.address}</p>
                  </div>
                </div>
              )}

              {person.disability && (
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Discapacidad</p>
                    <p className="text-gray-900">{person.disability}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Información adicional */}
      <div className="lg:col-span-2 space-y-4 sm:space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {person.maritalStatusTypeId && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Estado Civil</label>
                  <p className="mt-1 text-gray-900">{person.maritalStatusTypeId}</p>
                </div>
              )}

              {person.countryId && (
                <div>
                  <label className="text-sm font-medium text-gray-500">País</label>
                  <p className="mt-1 text-gray-900">{person.countryId}</p>
                </div>
              )}

              {person.provinceId && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Provincia</label>
                  <p className="mt-1 text-gray-900">{person.provinceId}</p>
                </div>
              )}

              {person.ethnicityTypeId && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Etnia</label>
                  <p className="mt-1 text-gray-900">{person.ethnicityTypeId}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información Familiar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {person.motherName && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Nombre de la Madre</label>
                  <p className="mt-1 text-gray-900">{person.motherName}</p>
                </div>
              )}

              {person.fatherName && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Nombre del Padre</label>
                  <p className="mt-1 text-gray-900">{person.fatherName}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}