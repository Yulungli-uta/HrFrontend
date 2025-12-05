// client/src/components/person-detail/tabs/WorkExperiencesTab.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus, Edit, Trash2, Calendar, MapPin } from "lucide-react";
import { WorkExperience } from "@/types/person";

interface WorkExperiencesTabProps {
  workExperiences: WorkExperience[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
}

export function WorkExperiencesTab({ workExperiences, onEdit, onDelete }: WorkExperiencesTabProps) {
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

    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();

    let totalMonths = years * 12 + months;
    if (totalMonths < 0) totalMonths = 0;

    const yearsDuration = Math.floor(totalMonths / 12);
    const monthsDuration = totalMonths % 12;

    if (yearsDuration === 0 && monthsDuration === 0) {
      return "Menos de 1 mes";
    }

    const parts = [];
    if (yearsDuration > 0) parts.push(`${yearsDuration} año${yearsDuration > 1 ? "s" : ""}`);
    if (monthsDuration > 0) parts.push(`${monthsDuration} mes${monthsDuration > 1 ? "es" : ""}`);

    return parts.join(" ");
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
          className="bg-uta-blue hover:bg-uta-blue/90"
          onClick={() => onEdit("experience", null)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Experiencia
        </Button>
      </CardHeader>

      <CardContent>
        {workExperiences.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Briefcase className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-base mb-1">No hay experiencias laborales registradas</p>
            <p className="text-sm">
              Agrega la primera experiencia haciendo clic en "Nueva Experiencia"
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {[...workExperiences] // ❗ evitar mutar props
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                .map((experience, index) => (
                  <Card
                    key={experience.workExperienceId ?? `experience-${index}`} // 🔥 FIX: key segura
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900 text-lg">
                                {experience.position}
                              </h4>
                              <p className="text-gray-600 text-sm mt-1">
                                {experience.company}
                              </p>
                            </div>

                            <div className="flex gap-2 ml-4 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onEdit("experience", experience)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onDelete(experience.workExperienceId)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>
                                {formatDate(experience.startDate)} -{" "}
                                {experience.isCurrent ? (
                                  <Badge variant="default" className="ml-1">
                                    Actual
                                  </Badge>
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

                          {experience.institutionAddress && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span>{experience.institutionAddress}</span>
                            </div>
                          )}

                          {experience.entryReason && (
                            <div className="text-sm text-gray-600">
                              <p className="font-medium mb-1">Razón de entrada:</p>
                              <p className="text-gray-700 line-clamp-2">{experience.entryReason}</p>
                            </div>
                          )}

                          {experience.exitReason && (
                            <div className="text-sm text-gray-600">
                              <p className="font-medium mb-1">Razón de salida:</p>
                              <p className="text-gray-700 line-clamp-2">{experience.exitReason}</p>
                            </div>
                          )}

                          <div className="flex gap-4 text-xs">
                            <div>
                              <span className="font-medium text-gray-600">ID País: </span>
                              <span className="text-gray-900">{experience.countryId}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Tipo Institución: </span>
                              <span className="text-gray-900">{experience.institutionTypeId}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Tipo Experiencia: </span>
                              <span className="text-gray-900">{experience.experienceTypeId}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
