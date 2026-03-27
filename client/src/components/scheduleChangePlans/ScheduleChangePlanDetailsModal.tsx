import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ScheduleChangePlanResponse,
  ScheduleOption,
} from "@/types/sheduleChangePlansType";
import { getScheduleLabel, getScheduleTimeRange } from "./scheduleChangePlansHelpers";
import { Clock, Calendar, Users, AlertCircle } from "lucide-react";
import { TiposReferenciaAPI } from "@/lib/api";

interface ScheduleChangePlanDetailsModalProps {
  plan: ScheduleChangePlanResponse | null;
  schedulesMap: Map<number, ScheduleOption>;
  statusCatalog: Record<number, { label: string }>;
  employeesMap: Map<number, string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailStatusBadge({ statusTypeID }: { statusTypeID: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["refType", statusTypeID],
    queryFn: () => TiposReferenciaAPI.get(statusTypeID),
    staleTime: 60 * 60_000,
  });

  const name = data?.status === 'success' ? data.data.name : `Estado ${statusTypeID}`;

  return (
    <Badge variant="secondary" className="text-xs font-medium w-full lg:w-auto flex justify-center mt-2 lg:mt-0">
      {isLoading ? "..." : name}
    </Badge>
  );
}

export function ScheduleChangePlanDetailsModal({
  plan,
  schedulesMap,
  statusCatalog,
  employeesMap,
  open,
  onOpenChange,
}: ScheduleChangePlanDetailsModalProps) {
  const employeeCount = plan?.details?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-uta-blue">Detalles de Planificación</DialogTitle>
          <DialogDescription>
            {plan?.planCode || `Plan #${plan?.planID}`} - {plan?.title}
          </DialogDescription>
        </DialogHeader>

        {plan ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Fecha Efectiva</p>
                  <p className="font-medium">{plan.effectiveDate}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-full flex-shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Colaboradores Impactados</p>
                  <p className="font-medium text-lg">{employeeCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-600 rounded-full flex-shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Duración y Tipo</p>
                  <p className="font-medium">{plan.isPermanent ? "Permanente" : "Temporal"}</p>
                </div>
              </div>
            </div>

            {/* Justification */}
            {plan.justification && (
              <div className="p-4 bg-muted/20 border-l-4 border-l-uta-blue rounded-r-lg">
                <p className="text-sm italic text-muted-foreground flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  {plan.justification}
                </p>
              </div>
            )}

            {/* Employee Table */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Cruces de Horario</h3>
              <div className="rounded-md border overflow-hidden">
                <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1fr] gap-3 px-4 py-3 bg-muted/60 text-sm font-semibold text-muted-foreground">
                  <div>Colaborador</div>
                  <div>Horario Anterior</div>
                  <div>Nuevo Horario a Aplicar</div>
                  <div>Estado del Cruce</div>
                </div>

                <div className="divide-y max-h-[400px] overflow-y-auto">
                  {employeeCount === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No hay colaboradores en este plan.
                    </div>
                  ) : (
                    plan.details.map((detail) => {
                      const employeeName = employeesMap.get(detail.employeeID) || detail.employeeFullName || `Colaborador Desconocido`;
                      const previousScheduleStr = getScheduleTimeRange(schedulesMap.get(Number(detail.previousScheduleID)));
                      const newScheduleStr = getScheduleTimeRange(schedulesMap.get(plan.newScheduleID));
                      
                      return (
                        <div
                          key={detail.employeeID}
                          className="px-4 py-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1fr] gap-3 items-center">
                            <div>
                              <p className="font-medium text-sm">{employeeName}</p>
                              <p className="text-xs text-muted-foreground">ID: {detail.employeeID}</p>
                            </div>
                            
                            <div>
                              <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200">
                                {getScheduleLabel(detail.previousScheduleID, schedulesMap)}
                              </Badge>
                              {previousScheduleStr !== "—" && (
                                <p className="text-xs text-muted-foreground mt-1 ml-1">{previousScheduleStr}</p>
                              )}
                            </div>
                            
                            <div>
                              <Badge className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200" variant="outline">
                                {getScheduleLabel(plan.newScheduleID, schedulesMap)}
                              </Badge>
                              {newScheduleStr !== "—" && (
                                <p className="text-xs text-muted-foreground mt-1 ml-1">{newScheduleStr}</p>
                              )}
                            </div>

                            <div>
                              <DetailStatusBadge statusTypeID={detail.statusTypeID} />
                            </div>
                          </div>

                          {/* Mobile View */}
                          <div className="md:hidden space-y-3">
                            <p className="font-medium text-sm">{employeeName}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Anterior</p>
                                <Badge variant="outline" className="text-[10px] sm:text-xs bg-red-50 text-red-700 border-red-200">
                                  {getScheduleLabel(detail.previousScheduleID, schedulesMap)}
                                </Badge>
                                {previousScheduleStr !== "—" && (
                                  <p className="text-[10px] text-muted-foreground mt-1 ml-1">{previousScheduleStr}</p>
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Nuevo</p>
                                <Badge className="text-[10px] sm:text-xs bg-green-50 text-green-700 border-green-200">
                                  {getScheduleLabel(plan.newScheduleID, schedulesMap)}
                                </Badge>
                                {newScheduleStr !== "—" && (
                                  <p className="text-[10px] text-muted-foreground mt-1 ml-1">{newScheduleStr}</p>
                                )}
                              </div>
                            </div>
                            <div>
                               <DetailStatusBadge statusTypeID={detail.statusTypeID} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
