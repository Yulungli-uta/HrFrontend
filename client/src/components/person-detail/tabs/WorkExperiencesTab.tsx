import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus, Edit, Trash2, Calendar, MapPin, Globe, Building2 } from "lucide-react";
import { WorkExperience } from "@/types/person";

interface WorkExperiencesTabProps {
  workExperiences: WorkExperience[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
  /** Mapa id → nombre para resolver cualquier ref_type (institutionTypeId, experienceTypeId…) */
  refTypesMap?: Record<number, string>;
  /** Mapa id → nombre de país */
  countryMap?: Record<number, string>;
}

export function WorkExperiencesTab({
  workExperiences,
  onEdit,
  onDelete,
  refTypesMap = {},
  countryMap = {},
}: WorkExperiencesTabProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return "No especificada";
    return new Date(dateString).toLocaleDateString("es-EC", {
      year: "numeric",
      month: "short",
    });
  };

  const calculateDuration = (startDate: string, endDate: string | null, isCurrent: boolean) => {
    const start = new Date(startDate);
    const end = isCurrent ? new Date() : new Date(endDate!);
    let totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (totalMonths < 0) totalMonths = 0;

    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    if (y === 0 && m === 0) return "Menos de 1 mes";

    const parts: string[] = [];
    if (y > 0) parts.push(`${y} año${y > 1 ? "s" : ""}`);
    if (m > 0) parts.push(`${m} mes${m > 1 ? "es" : ""}`);
    return parts.join(" ");
  };

  const resolveName = (id: number | undefined | null, map: Record<number, string>): string | null => {
    if (!id) return null;
    return map[Number(id)] ?? null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center text-lg">
          <Briefcase className="mr-2 h-5 w-5" />
          Experiencia Laboral
          <Badge variant="outline" className="ml-2">
            {workExperiences.length}
          </Badge>
        </CardTitle>

        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90"
          onClick={() => onEdit("experience", null)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Experiencia
        </Button>
      </CardHeader>

      <CardContent>
        {workExperiences.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-base mb-1">No hay experiencias laborales registradas</p>
            <p className="text-sm">
              Agrega la primera experiencia haciendo clic en "Nueva Experiencia"
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...workExperiences]
              .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
              .map((experience, index) => {
                const experienceId =
                  (experience as any).workExpId ?? (experience as any).id ?? null;

                const countryName = resolveName(experience.countryId as any, countryMap);
                const institutionTypeName = resolveName(
                  (experience as any).institutionTypeId,
                  refTypesMap
                );
                const experienceTypeName = resolveName(
                  (experience as any).experienceTypeId,
                  refTypesMap
                );

                return (
                  <Card
                    key={experienceId ?? `experience-${index}`}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 space-y-3 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-foreground text-lg">
                                {experience.position}
                              </h4>
                              <p className="text-muted-foreground text-sm mt-1">
                                {experience.company}
                              </p>
                            </div>

                            <div className="flex gap-2 shrink-0">
                              <ActionIconButton
                                icon={Edit}
                                label="Editar experiencia"
                                tone="primary"
                                onClick={() => onEdit("experience", experience)}
                                touch
                              />
                              <ActionIconButton
                                icon={Trash2}
                                label="Eliminar experiencia"
                                tone="destructive"
                                onClick={() => { if (experienceId != null) onDelete(experienceId); }}
                                disabled={experienceId == null}
                                touch
                              />
                            </div>
                          </div>

                          {/* Badges de clasificación */}
                          <div className="flex flex-wrap gap-2">
                            {institutionTypeName && (
                              <Badge variant="secondary" className="text-xs">
                                <Building2 className="h-3 w-3 mr-1" />
                                {institutionTypeName}
                              </Badge>
                            )}
                            {experienceTypeName && (
                              <Badge variant="outline" className="text-xs">
                                {experienceTypeName}
                              </Badge>
                            )}
                          </div>

                          {/* Fechas y duración */}
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                              <span>
                                {formatDate(experience.startDate)} —{" "}
                                {experience.isCurrent ? (
                                  <Badge variant="default" className="ml-1">Actual</Badge>
                                ) : experience.endDate ? (
                                  formatDate(experience.endDate)
                                ) : (
                                  "No especificada"
                                )}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {calculateDuration(
                                experience.startDate,
                                experience.endDate || null,
                                experience.isCurrent
                              )}
                            </Badge>
                          </div>

                          {/* Dirección */}
                          {experience.institutionAddress && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                              <span className="truncate">{experience.institutionAddress}</span>
                            </div>
                          )}

                          {/* País */}
                          {countryName && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Globe className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                              <span>{countryName}</span>
                            </div>
                          )}

                          {/* Razones */}
                          {experience.entryReason && (
                            <div className="text-sm">
                              <p className="font-medium text-muted-foreground mb-0.5">Razón de entrada:</p>
                              <p className="text-foreground line-clamp-2">{experience.entryReason}</p>
                            </div>
                          )}
                          {experience.exitReason && (
                            <div className="text-sm">
                              <p className="font-medium text-muted-foreground mb-0.5">Razón de salida:</p>
                              <p className="text-foreground line-clamp-2">{experience.exitReason}</p>
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
