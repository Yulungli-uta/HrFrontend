// client/src/components/person-detail/PersonalInfoCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { Person } from "@/types/person";

interface PersonalInfoCardProps {
  person: Person;
  onEdit: () => void;
}

export function PersonalInfoCard({ person, onEdit }: PersonalInfoCardProps) {
  return (
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
  );
}