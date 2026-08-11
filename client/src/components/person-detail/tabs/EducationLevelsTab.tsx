import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Building2,
  FileText,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import { EducationLevel } from "@/types/person";
import { ReusableDocumentManager } from "@/components/ReusableDocumentManager";
import { EDUCATION_CERTIFICATE_DIRECTORY_CODE, EDUCATION_CERTIFICATE_ENTITY_TYPE } from "@/features/constants";

interface EducationLevelsTabProps {
  educationLevels: EducationLevel[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
  /** Mapa id → nombre para resolver educationLevelTypeId */
  refTypesMap?: Record<number, string>;
  /** Mapa id → nombre de institución */
  institutionMap?: Record<number, string>;
  /** Identificación de la persona — agrupa su expediente completo en una sola carpeta. */
  personIdCard?: string;
}

export function EducationLevelsTab({
  educationLevels,
  onEdit,
  onDelete,
  refTypesMap = {},
  institutionMap = {},
  personIdCard,
}: EducationLevelsTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("es-EC", { year: "numeric", month: "long" });
  };

  const resolveName = (id: number | undefined | null, map: Record<number, string>): string | null => {
    if (!id) return null;
    return map[Number(id)] ?? null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center text-lg">
          <GraduationCap className="mr-2 h-5 w-5" />
          Formación Académica
          <Badge variant="outline" className="ml-2">
            {educationLevels.length}
          </Badge>
        </CardTitle>

        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90"
          onClick={() => onEdit("educationLevel", null)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Formación
        </Button>
      </CardHeader>

      <CardContent>
        {educationLevels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-base mb-1">No hay formación académica registrada</p>
            <p className="text-sm">
              Agrega títulos, maestrías o doctorados haciendo clic en "Nueva Formación"
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...educationLevels]
              .sort((a, b) => new Date(b.startDate ?? 0).getTime() - new Date(a.startDate ?? 0).getTime())
              .map((edu) => {
                const levelName = resolveName(edu.educationLevelTypeId, refTypesMap);
                const institutionName = resolveName(edu.institutionId, institutionMap);
                const isExpanded = expandedId === edu.educationId;

                return (
                  <Card key={edu.educationId} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 space-y-3 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-foreground text-lg">{edu.title}</h4>
                              {edu.specialty && (
                                <p className="text-muted-foreground text-sm mt-1">{edu.specialty}</p>
                              )}
                            </div>

                            <div className="flex gap-2 shrink-0">
                              <ActionIconButton
                                icon={Edit}
                                label="Editar formación académica"
                                tone="primary"
                                onClick={() => onEdit("educationLevel", edu)}
                                touch
                              />
                              <ActionIconButton
                                icon={Trash2}
                                label="Eliminar formación académica"
                                tone="destructive"
                                onClick={() => onDelete(edu.educationId)}
                                touch
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {levelName && (
                              <Badge variant="secondary" className="text-xs">
                                {levelName}
                              </Badge>
                            )}
                            {edu.grade && (
                              <Badge variant="outline" className="text-xs">
                                {edu.grade}
                              </Badge>
                            )}
                          </div>

                          {institutionName && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Building2 className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                              <span>{institutionName}</span>
                            </div>
                          )}

                          {(edu.startDate || edu.endDate) && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                              <span>
                                {formatDate(edu.startDate) ?? "No especificada"} —{" "}
                                {formatDate(edu.endDate) ?? "No especificada"}
                              </span>
                            </div>
                          )}

                          {edu.senescytRegistrationNumber && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <ShieldCheck className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                              <span>Registro SENESCYT: {edu.senescytRegistrationNumber}</span>
                            </div>
                          )}

                          {edu.score != null && (
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Puntaje:</span> {edu.score}
                            </p>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="self-start text-xs"
                            onClick={() => setExpandedId(isExpanded ? null : edu.educationId)}
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            Título / certificado de respaldo
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5 ml-1" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 ml-1" />
                            )}
                          </Button>

                          {isExpanded && (
                            <div className="mt-2">
                              <ReusableDocumentManager
                                directoryCode={EDUCATION_CERTIFICATE_DIRECTORY_CODE}
                                entityType={EDUCATION_CERTIFICATE_ENTITY_TYPE}
                                entityId={edu.educationId}
                                relativePath={personIdCard ? `${personIdCard}/${EDUCATION_CERTIFICATE_ENTITY_TYPE.toLowerCase()}` : undefined}
                                accept=".pdf,.jpg,.jpeg,.png"
                                maxSizeMB={10}
                                label="Título / certificado de respaldo"
                                entityReady={true}
                                allowReplace
                                documentType={{ enabled: true, category: "CV_DOCUMENT_TYPE", label: "Tipo de documento" }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
