import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Edit, Mail, Phone, Calendar, MapPin, Heart, Users } from "lucide-react";
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
  /** Mapa plano id → nombre para todos los ref_types (fallback robusto) */
  refTypesMap?: Record<number, string>;
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
  categoryMap: Record<number, string>,
  fallbackMap?: Record<number, string>
): string | null {
  if (value === null || value === undefined || value === "" || value === 0) return null;
  const numericValue = Number(value);
  if (!Number.isNaN(numericValue) && numericValue > 0) {
    return categoryMap[numericValue] ?? fallbackMap?.[numericValue] ?? null;
  }
  return typeof value === "string" ? value : null;
}

function isValidId(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined || value === "") return false;
  const n = Number(value);
  return !Number.isNaN(n) && n > 0;
}

export function PersonalInfoTab({
  person,
  onEdit,
  refTypesByCategory = {},
  refTypesMap = {},
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

  const hasFamilyInfo = Boolean(person.motherName || person.fatherName);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center text-lg">
              <User className="mr-2 h-5 w-5" />
              Información Personal
            </CardTitle>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90"
              onClick={onEdit}
            >
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
              <div>
                <label className="text-sm font-medium text-muted-foreground">Sexo</label>
                <p className="mt-1 text-foreground">
                  {resolveRefName(person.sex, sexMap, refTypesMap) ?? "—"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Género</label>
                <p className="mt-1 text-foreground">
                  {resolveRefName(person.gender, genderMap, refTypesMap) ?? "—"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Estado Civil</label>
                <p className="mt-1 text-foreground">
                  {resolveRefName(person.maritalStatusTypeId, maritalStatusMap, refTypesMap) ?? "—"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Etnia</label>
                <p className="mt-1 text-foreground">
                  {resolveRefName(person.ethnicityTypeId, ethnicityMap, refTypesMap) ?? "—"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">País</label>
                <p className="mt-1 text-foreground">
                  {(isValidId(person.countryId) && countryMap[Number(person.countryId)]) || "—"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Provincia</label>
                <p className="mt-1 text-foreground">
                  {(isValidId(person.provinceId) && provinceMap[Number(person.provinceId)]) || "—"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Cantón</label>
                <p className="mt-1 text-foreground">
                  {(isValidId(person.cantonId) && cantonMap[Number(person.cantonId)]) || "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Información Familiar
            </CardTitle>
          </CardHeader>

          <CardContent>
            {hasFamilyInfo ? (
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
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="mx-auto h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">No hay información familiar registrada</p>
                <p className="text-xs mt-1">
                  Edita el perfil para agregar nombres de los padres
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
