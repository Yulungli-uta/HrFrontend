// client/src/components/person-detail/tabs/TrainingsTab.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Plus, Edit, Trash2, Calendar, Clock, Award } from "lucide-react";
import { Training } from "@/types/person";

interface TrainingsTabProps {
  trainings: Training[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
}

export function TrainingsTab({ trainings, onEdit, onDelete }: TrainingsTabProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return "No especificada";
    return new Date(dateString).toLocaleDateString("es-EC", {
      year: "numeric",
      month: "long",
    });
  };

  const getModalityBadge = (modality: string) => {
    const modalityMap: { [key: string]: "default" | "secondary" | "outline" } = {
      Presencial: "default",
      Virtual: "secondary",
      Híbrido: "outline",
    };

    return (
      <Badge variant={modalityMap[modality] || "outline"} className="text-xs">
        {modality}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center text-lg">
          <GraduationCap className="mr-2 h-5 w-5" />
          Capacitaciones
          <Badge variant="outline" className="ml-2">
            {trainings.length}
          </Badge>
        </CardTitle>
        <Button
          size="sm"
          className="bg-uta-blue hover:bg-uta-blue/90"
          onClick={() => onEdit("training", null)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Capacitación
        </Button>
      </CardHeader>

      <CardContent>
        {trainings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-base mb-1">No hay capacitaciones registradas</p>
            <p className="text-sm">
              Agrega la primera capacitación haciendo clic en el botón "Nueva Capacitación"
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...trainings]
              .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
              .map((training) => {
                const trainingAny = training as any;
                const modality = trainingAny.modality as string | undefined;
                const hasCertificate = Boolean(trainingAny.hasCertificate);

                return (
                  <Card key={training.trainingId} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col h-full">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground text-lg leading-tight mb-2">
                              {training.title}
                            </h4>
                            <p className="text-muted-foreground text-sm">
                              {training.institution}
                            </p>
                          </div>

                          <div className="flex gap-1 flex-shrink-0 ml-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onEdit("training", training)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onDelete(training.trainingId)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-muted-foreground flex-1">
                          <div className="flex flex-wrap gap-2">
                            {training.certificateTypeId && (
                              <Badge variant="secondary" className="text-xs">
                                {training.certificateTypeId}
                              </Badge>
                            )}

                            {modality && getModalityBadge(modality)}

                            {hasCertificate && (
                              <Badge variant="default" className="text-xs">
                                <Award className="h-3 w-3 mr-1" />
                                Certificado
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground/70" />
                              <span>
                                <strong>Inicio:</strong> {formatDate(training.startDate)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground/70" />
                              <span>
                                <strong>Fin:</strong>{" "}
                                {training.endDate ? formatDate(training.endDate) : "No especificado"}
                              </span>
                            </div>
                          </div>

                          {training.hours && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground/70" />
                              <span>
                                <strong>Duración:</strong> {training.hours} horas
                              </span>
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