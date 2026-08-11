import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { User, Edit, Mail, Phone, Calendar, MapPin, Heart, Users, ShieldAlert, Plus, Trash2, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Person, CatastrophicIllness } from "@/types/person";
import { ReusableDocumentManager } from "@/components/ReusableDocumentManager";
import {
  PERSON_PHOTO_DIRECTORY_CODE,
  PERSON_PHOTO_ENTITY_TYPE,
  CATASTROPHIC_ILLNESS_CERTIFICATE_DIRECTORY_CODE,
  CATASTROPHIC_ILLNESS_CERTIFICATE_ENTITY_TYPE,
} from "@/features/constants";

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
  catastrophicIllnesses?: CatastrophicIllness[];
  onAddCatastrophicIllness?: () => void;
  onEditCatastrophicIllness?: (item: CatastrophicIllness) => void;
  onDeleteCatastrophicIllness?: (id: number) => void;
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
  catastrophicIllnesses = [],
  onAddCatastrophicIllness,
  onEditCatastrophicIllness,
  onDeleteCatastrophicIllness,
}: PersonalInfoTabProps) {
  const [expandedIllnessId, setExpandedIllnessId] = useState<number | null>(null);
  const [photoExpanded, setPhotoExpanded] = useState(false);

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

  const bloodTypeMap = useMemo(
    () => buildRefMap(refTypesByCategory["BLOOD_TYPE"]),
    [refTypesByCategory]
  );

  const specialNeedsMap = useMemo(
    () => buildRefMap(refTypesByCategory["SPECIAL_NEEDS"]),
    [refTypesByCategory]
  );

  const hasFamilyInfo = Boolean(person.motherName || person.fatherName);

  const hasHealthInfo = Boolean(
    person.bloodTypeTypeId ||
    person.specialNeedsTypeId ||
    person.disability ||
    person.disabilityPercentage ||
    person.conadisCard
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
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs -ml-2"
                onClick={() => setPhotoExpanded((v) => !v)}
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                Fotografía de perfil
                {photoExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 ml-1" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                )}
              </Button>
              {photoExpanded && (
                <ReusableDocumentManager
                  directoryCode={PERSON_PHOTO_DIRECTORY_CODE}
                  entityType={PERSON_PHOTO_ENTITY_TYPE}
                  entityId={person.personId}
                  relativePath={person.idCard ? `${person.idCard}/${PERSON_PHOTO_ENTITY_TYPE.toLowerCase()}` : undefined}
                  accept=".jpg,.jpeg,.png"
                  maxSizeMB={5}
                  maxFiles={1}
                  label="Fotografía de perfil"
                  entityReady={true}
                  allowReplace
                  documentType={{ enabled: true, category: "CV_DOCUMENT_TYPE", label: "Tipo de documento", defaultValue: undefined }}
                />
              )}
            </div>

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
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Salud
              <Badge variant="outline" className="ml-2 text-xs font-normal text-muted-foreground">
                Información confidencial
              </Badge>
            </CardTitle>
            {onAddCatastrophicIllness && (
              <Button size="sm" variant="outline" onClick={onAddCatastrophicIllness}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar enfermedad catastrófica
              </Button>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {hasHealthInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo de Sangre</label>
                  <p className="mt-1 text-foreground">
                    {resolveRefName(person.bloodTypeTypeId, bloodTypeMap, refTypesMap) ?? "—"}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Necesidades Especiales</label>
                  <p className="mt-1 text-foreground">
                    {resolveRefName(person.specialNeedsTypeId, specialNeedsMap, refTypesMap) ?? "—"}
                  </p>
                </div>

                {person.disability && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Discapacidad</label>
                    <p className="mt-1 text-foreground">
                      {person.disability}
                      {person.disabilityPercentage ? ` (${person.disabilityPercentage}%)` : ""}
                    </p>
                  </div>
                )}

                {person.conadisCard && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Carnet CONADIS</label>
                    <p className="mt-1 text-foreground">{person.conadisCard}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin datos de salud registrados. Edita el perfil para agregarlos.
              </p>
            )}

            {/* Enfermedades catastróficas */}
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 mb-3 mt-3">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Enfermedades Catastróficas</span>
              </div>

              {catastrophicIllnesses.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">Sin enfermedades catastróficas registradas.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {catastrophicIllnesses.map((ci) => (
                    <div
                      key={ci.illnessId}
                      className="rounded-lg border bg-muted/10 p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{ci.illness}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {resolveRefName(ci.illnessTypeId, {}, refTypesMap) ?? "Tipo sin definir"}
                            {ci.certificateNumber ? ` · Certificado: ${ci.certificateNumber}` : ""}
                          </p>
                          {ci.substituteName && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Sustituto: {ci.substituteName}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {onEditCatastrophicIllness && (
                            <ActionIconButton
                              icon={Edit}
                              label="Editar registro"
                              tone="primary"
                              onClick={() => onEditCatastrophicIllness(ci)}
                              touch
                            />
                          )}
                          {onDeleteCatastrophicIllness && (
                            <ActionIconButton
                              icon={Trash2}
                              label="Eliminar registro"
                              tone="destructive"
                              onClick={() => onDeleteCatastrophicIllness(ci.illnessId)}
                              touch
                            />
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs -ml-2"
                        onClick={() =>
                          setExpandedIllnessId(expandedIllnessId === ci.illnessId ? null : ci.illnessId)
                        }
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Certificado médico
                        {expandedIllnessId === ci.illnessId ? (
                          <ChevronUp className="h-3.5 w-3.5 ml-1" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 ml-1" />
                        )}
                      </Button>

                      {expandedIllnessId === ci.illnessId && (
                        <ReusableDocumentManager
                          directoryCode={CATASTROPHIC_ILLNESS_CERTIFICATE_DIRECTORY_CODE}
                          entityType={CATASTROPHIC_ILLNESS_CERTIFICATE_ENTITY_TYPE}
                          entityId={ci.illnessId}
                          relativePath={person.idCard ? `${person.idCard}/${CATASTROPHIC_ILLNESS_CERTIFICATE_ENTITY_TYPE.toLowerCase()}` : undefined}
                          accept=".pdf,.jpg,.jpeg,.png"
                          maxSizeMB={10}
                          label="Certificado médico"
                          entityReady={true}
                          allowReplace
                          documentType={{ enabled: true, category: "CV_DOCUMENT_TYPE", label: "Tipo de documento" }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
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
