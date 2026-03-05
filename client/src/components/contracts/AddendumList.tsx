import { useQuery } from "@tanstack/react-query";
import { ContractsRHAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Calendar, Eye, FileStack } from "lucide-react";

export function AddendumList(props: {
  contractId: number;
  enabled: boolean;
  onCreateAddendum: () => void;
  onOpenAddendum?: (a: any) => void;
}) {
  const { contractId, enabled, onCreateAddendum, onOpenAddendum } = props;

  const q = useQuery({
    queryKey: ["contracts", "addendums", contractId],
    queryFn: () => ContractsRHAPI.addendums(contractId),
    enabled: enabled && contractId > 0,
    staleTime: 15 * 1000,
  });

  const items = q.data?.status === "success" ? q.data.data : [];

  if (!enabled) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <FileStack className="h-4 w-4" />
              Addendums
            </CardTitle>
            <CardDescription>Contratos adicionales relacionados</CardDescription>
          </div>
          <Button size="sm" onClick={onCreateAddendum} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Cargando addendums...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <FileStack className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              No hay addendums asociados a este contrato
            </p>
            <Button variant="outline" size="sm" onClick={onCreateAddendum}>
              <Plus className="h-4 w-4 mr-1" />
              Crear el primero
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((a: any, idx: number) => {
              const addendumId = a.contractID ?? a.ContractID;
              const addendumCode = a.contractCode ?? "—";
              const startDate = a.startDate ? String(a.startDate).slice(0, 10) : null;
              const endDate = a.endDate ? String(a.endDate).slice(0, 10) : null;
              const status = a.status;

              return (
                <div
                  key={addendumId ?? idx}
                  className="border rounded-lg p-4 hover:shadow-md transition-all space-y-3 bg-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">Addendum #{addendumId}</p>
                          {status && (
                            <Badge variant="secondary" className="text-xs">
                              Estado {status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {addendumCode}
                        </p>
                      </div>
                    </div>

                    {onOpenAddendum && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenAddendum(a)}
                        className="shrink-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {(startDate || endDate) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {startDate && endDate ? (
                          <>
                            {startDate} → {endDate}
                          </>
                        ) : startDate ? (
                          <>Desde {startDate}</>
                        ) : endDate ? (
                          <>Hasta {endDate}</>
                        ) : null}
                      </span>
                    </div>
                  )}

                  {a.contractDescription && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {a.contractDescription}
                    </p>
                  )}
                </div>
              );
            })}

            <div className="pt-2 border-t">
              <Button variant="outline" size="sm" onClick={onCreateAddendum} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Agregar otro addendum
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}