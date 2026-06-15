import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Plus, Edit, Trash2, Calendar, Clock, Award, Monitor, Users2 } from "lucide-react";
import { Training } from "@/types/person";

interface TrainingsTabProps {
  trainings: Training[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
  /** Mapa id → nombre para resolver certificateTypeId y otros ref_types */
  refTypesMap?: Record<number, string>;
}

type ModalityVariant = "default" | "secondary" | "outline";

export function TrainingsTab({ trainings, onEdit, onDelete, refTypesMap = {} }: TrainingsTabProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return "No especificada";
    return new Date(dateString).toLocaleDateString("es-EC", {
      year: "numeric",
      month: "long",
    });
  };

  const resolveRefType = (id: number | string | null | undefined): string | null => {
    if (id == null || id === "") return null;
    const n = Number(id);
    if (!isNaN(n) && n > 0) return refTypesMap[n] ?? null;
    return String(id);
  };

  const getModalityMeta = (modality: string | number | null | undefined): { label: string; variant: ModalityVariant; icon: typeof Monitor } | null => {
    if (!modality) return null;
    const resolved = resolveRefType(modality) ?? String(modality);
    const lower = resolved.toLowerCase();
    if (lower.includes("virtual") || lower.includes("en línea") || lower.includes("online")) {
      return { label: resolved, variant: "secondary", icon: Monitor };
    }
    if (lower.includes("híbrido") || lower.includes("semipresencial")) {
      return { label: resolved, variant: "outline", icon: Users2 };
    }
    return { label: resolved, variant: "default", icon: Users2 };
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
          className="bg-primary hover:bg-primary/90"
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
                const modalityMeta = getModalityMeta(trainingAny.modality);
                const hasCertificate = Boolean(trainingAny.hasCertificate);
                const certTypeName = resolveRefType(training.certificateTypeId);

                return (
                  <Card key={training.trainingId} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col h-full">
                        <div className="flex items-start justify-between mb-3 gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground text-base leading-tight mb-1">
                              {training.title}
                            </h4>
                            <p className="text-muted-foreground text-sm truncate">
                              {training.institution}
                            </p>
                          </div>

                          <div className="flex gap-1 shrink-0">
                            <ActionIconButton
                              icon={Edit}
                              label="Editar capacitación"
                              tone="primary"
                              onClick={() => onEdit("training", training)}
                              touch
                            />
                            <ActionIconButton
                              icon={Trash2}
                              label="Eliminar capacitación"
                              tone="destructive"
                              onClick={() => onDelete(training.trainingId)}
                              touch
                            />
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-muted-foreground flex-1">
                          <div className="flex flex-wrap gap-2">
                            {certTypeName && (
                              <Badge variant="secondary" className="text-xs">
                                {certTypeName}
                              </Badge>
                            )}
                            {modalityMeta && (
                              <Badge variant={modalityMeta.variant} className="text-xs">
                                <modalityMeta.icon className="h-3 w-3 mr-1" />
                                {modalityMeta.label}
                              </Badge>
                            )}
                            {hasCertificate && (
                              <Badge variant="default" className="text-xs">
                                <Award className="h-3 w-3 mr-1" />
                                Certificado
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                              <span>
                                <strong>Inicio:</strong>{" "}
                                {formatDate(training.startDate)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                              <span>
                                <strong>Fin:</strong>{" "}
                                {training.endDate
                                  ? formatDate(training.endDate)
                                  : "No especificado"}
                              </span>
                            </div>
                          </div>

                          {training.hours && (
                            <div className="flex items-center gap-2 text-xs">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
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
