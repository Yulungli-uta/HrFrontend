import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Edit, Mail, Phone, Calendar, MapPin, Heart } from "lucide-react";
import { Person } from "@/types/person";

interface RefType {
  id: number;
  category: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

interface PersonalInfoTabProps {
  person: Person;
  onEdit: () => void;
  refTypesByCategory?: Record<string, RefType[]>;
  countryMap?: Record<number, string>;
  provinceMap?: Record<number, string>;
  cantonMap?: Record<number, string>;
}

function buildRefMap(refs?: RefType[]) {
  const map: Record<number, string> = {};
  (refs ?? []).forEach((ref) => {
    map[Number(ref.id)] = ref.name;
  });
  return map;
}

function resolveRefName(
  value: string | number | null | undefined,
  map: Record<number, string>
) {
  if (value === null || value === undefined || value === "") return "—";

  const numericValue = Number(value);
  if (!Number.isNaN(numericValue)) {
    return map[numericValue] ?? String(value);
  }

  return String(value);
}

export function PersonalInfoTab({
  person,
  onEdit,
  refTypesByCategory = {},
  countryMap = {},
  provinceMap = {},
  cantonMap = {},
}: PersonalInfoTabProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-EC", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const sexMap = useMemo(
    () => buildRefMap(refTypesByCategory["SEX_TYPE"]),
    [refTypesByCategory]
  );

  const genderMap = useMemo(
    () => buildRefMap(refTypesByCategory["GENDER_TYPE"]),
    [refTypesByCategory]
  );

  const maritalStatusMap = useMemo(
    () => buildRefMap(refTypesByCategory["MARITAL_STATUS"]),
    [refTypesByCategory]
  );

  const ethnicityMap = useMemo(
    () => buildRefMap(refTypesByCategory["ETHNICITY"]),
    [refTypesByCategory]
  );

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
              <span className="text-sm font-medium text-muted-foreground">Estado</span>
              <Badge variant={person.isActive ? "default" : "secondary"}>
                {person.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground/70" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Correo Electrónico</p>
                  <p className="text-foreground">{person.email}</p>
                </div>
              </div>

              {person.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground/70" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                    <p className="text-foreground">{person.phone}</p>
                  </div>
                </div>
              )}

              {person.birthDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground/70" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</p>
                    <p className="text-foreground">{formatDate(person.birthDate)}</p>
                  </div>
                </div>
              )}

              {person.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground/70" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Dirección</p>
                    <p className="text-foreground">{person.address}</p>
                  </div>
                </div>
              )}

              {person.disability && (
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-muted-foreground/70" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Discapacidad</p>
                    <p className="text-foreground">{person.disability}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-4 sm:space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {person.sex !== null && person.sex !== undefined && person.sex !== "" && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sexo</label>
                  <p className="mt-1 text-foreground">
                    {resolveRefName(person.sex, sexMap)}
                  </p>
                </div>
              )}

              {person.gender !== null && person.gender !== undefined && person.gender !== "" && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Género</label>
                  <p className="mt-1 text-foreground">
                    {resolveRefName(person.gender, genderMap)}
                  </p>
                </div>
              )}

              {person.maritalStatusTypeId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estado Civil</label>
                  <p className="mt-1 text-foreground">
                    {resolveRefName(person.maritalStatusTypeId, maritalStatusMap)}
                  </p>
                </div>
              )}

              {person.countryId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">País</label>
                  <p className="mt-1 text-foreground">
                    {resolveRefName(person.countryId, countryMap)}
                  </p>
                </div>
              )}

              {person.provinceId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Provincia</label>
                  <p className="mt-1 text-foreground">
                    {resolveRefName(person.provinceId, provinceMap)}
                  </p>
                </div>
              )}

              {person.cantonId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cantón</label>
                  <p className="mt-1 text-foreground">
                    {resolveRefName(person.cantonId, cantonMap)}
                  </p>
                </div>
              )}

              {person.ethnicityTypeId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Etnia</label>
                  <p className="mt-1 text-foreground">
                    {resolveRefName(person.ethnicityTypeId, ethnicityMap)}
                  </p>
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
                  <label className="text-sm font-medium text-muted-foreground">Nombre de la Madre</label>
                  <p className="mt-1 text-foreground">{person.motherName}</p>
                </div>
              )}

              {person.fatherName && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nombre del Padre</label>
                  <p className="mt-1 text-foreground">{person.fatherName}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}