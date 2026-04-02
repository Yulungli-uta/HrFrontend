import { useQuery } from "@tanstack/react-query";
import { ContractsRHAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, MessageSquare, ArrowRight } from "lucide-react";

export function ContractHistory(props: { contractId: number; enabled: boolean }) {
  const { contractId, enabled } = props;

  const q = useQuery({
    queryKey: ["contracts", "history", contractId],
    queryFn: () => ContractsRHAPI.history(contractId),
    enabled: enabled && contractId > 0,
    staleTime: 15 * 1000,
  });

  const items = q.data?.status === "success" ? q.data.data : [];

  if (!enabled) return null;

  if (q.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Histórico de Estados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Cargando histórico...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Histórico de Estados
        </CardTitle>
        <CardDescription>
          Registro completo de cambios de estado del contrato
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Sin registros de cambios</p>
          </div>
        ) : (
          <div className="relative space-y-6">
            {/* Timeline vertical */}
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />

            {items.map((x: any, idx: number) => {
              const isFirst = idx === 0;
              const isLast = idx === items.length - 1;

              return (
                <div key={x.historyID} className="relative pl-12">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-2 top-1 w-4 h-4 rounded-full border-2 bg-background ${
                      isFirst
                        ? "border-primary bg-primary"
                        : isLast
                        ? "border-muted-foreground"
                        : "border-blue-500"
                    }`}
                  />

                  {/* Content card */}
                  <div
                    className={`rounded-lg border p-3 space-y-2 transition-all hover:shadow-md ${
                      isFirst ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant={isFirst ? "default" : "secondary"}>
                          {x.statusName ?? `Estado ${x.statusTypeID}`}
                        </Badge>
                        {isFirst && (
                          <Badge variant="outline" className="text-xs">
                            Actual
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{String(x.changedAt).replace("T", " ").slice(0, 19)}</span>
                      </div>
                    </div>

                    {x.comment && (
                      <div className="flex items-start gap-2 text-sm">
                        <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-muted-foreground flex-1">{x.comment}</p>
                      </div>
                    )}

                    {x.changedBy && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>Usuario ID: {x.changedBy}</span>
                      </div>
                    )}
                  </div>

                  {/* Arrow indicator between items */}
                  {!isLast && (
                    <div className="absolute left-3 -bottom-3 text-muted-foreground">
                      <ArrowRight className="h-3 w-3 rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}