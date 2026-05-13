// src/components/contracts/RequestPeoplePicker.tsx
import { useQuery } from "@tanstack/react-query";
import { UserCheck, Users, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContractRequestAPI } from "@/lib/api";

export interface RequestPersonItem {
  requestPersonId: number;
  personId: number | null;
  personFullName: string | null;
  personIdentification: string | null;
  jobId: number;
  jobName: string | null;
  requestPersonTypeName: string | null;
  startDate: string | null;
  endDate: string | null;
  rmu: number | null;
  rmuPeriod: number | null;
  statusName: string | null;
}

export interface SlotsInfo {
  numberOfPeopleToHire: number;
  totalHired: number;
  slotsAvailable: number;
  pendingPeople: number;
}

type Props = {
  requestId: number;
  selectedRequestPersonId: number | null;
  onSelect: (person: RequestPersonItem) => void;
};

function normalizeItem(raw: any): RequestPersonItem {
  return {
    requestPersonId:        raw.requestPersonId       ?? raw.RequestPersonId       ?? 0,
    personId:               raw.personId              ?? raw.PersonId              ?? null,
    personFullName:         raw.personFullName        ?? raw.PersonFullName        ?? null,
    personIdentification:   raw.personIdentification  ?? raw.PersonIdentification  ?? null,
    jobId:                  raw.jobId                 ?? raw.JobId                 ?? 0,
    jobName:                raw.jobName               ?? raw.JobName               ?? null,
    requestPersonTypeName:  raw.requestPersonTypeName ?? raw.RequestPersonTypeName ?? null,
    startDate:              raw.startDate             ?? raw.StartDate             ?? null,
    endDate:                raw.endDate               ?? raw.EndDate               ?? null,
    rmu:                    raw.rmu                   ?? raw.Rmu                   ?? null,
    rmuPeriod:              raw.rmuPeriod             ?? raw.RmuPeriod             ?? null,
    statusName:             raw.statusName            ?? raw.StatusName            ?? null,
  };
}

function normalizeSlotsInfo(raw: any): SlotsInfo | null {
  if (!raw) return null;
  return {
    numberOfPeopleToHire: raw.numberOfPeopleToHire ?? raw.NumberOfPeopleToHire ?? 0,
    totalHired:           raw.totalHired           ?? raw.TotalHired           ?? 0,
    slotsAvailable:       raw.slotsAvailable       ?? raw.SlotsAvailable       ?? 0,
    pendingPeople:        raw.pendingPeople        ?? raw.PendingPeople        ?? 0,
  };
}

export function RequestPeoplePicker({ requestId, selectedRequestPersonId, onSelect }: Props) {
  const [expanded, setExpanded] = useState(true);

  const qPending = useQuery({
    queryKey: ["contract-request-pending-people", requestId],
    queryFn: () => ContractRequestAPI.getPendingPeople(requestId),
    enabled: requestId > 0,
    staleTime: 30_000,
  });

  const qSlots = useQuery({
    queryKey: ["contract-request-slots", requestId],
    queryFn: () => ContractRequestAPI.getSlots(requestId),
    enabled: requestId > 0,
    staleTime: 30_000,
  });

  const pendingPeople: RequestPersonItem[] =
    qPending.data?.status === "success"
      ? (qPending.data.data ?? []).map(normalizeItem)
      : [];

  const slots: SlotsInfo | null =
    qSlots.data?.status === "success"
      ? normalizeSlotsInfo(qSlots.data.data)
      : null;

  if (requestId <= 0) return null;

  return (
    <Card className="border-primary/30">
      <CardContent className="pt-4">
        {/* Header con cupos y toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Personas sugeridas en la solicitud</span>
            {pendingPeople.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingPeople.length} pendiente{pendingPeople.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            {slots && (
              <div className={`text-xs rounded px-2 py-1 font-medium ${
                slots.slotsAvailable > 0
                  ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                  : "bg-destructive/10 text-destructive"
              }`}>
                <Users className="h-3 w-3 inline mr-1" />
                {slots.totalHired}/{slots.numberOfPeopleToHire} contratados
                {slots.slotsAvailable > 0
                  ? ` · ${slots.slotsAvailable} cupo${slots.slotsAvailable !== 1 ? "s" : ""} libre${slots.slotsAvailable !== 1 ? "s" : ""}`
                  : " · Sin cupos"}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <>
            {qPending.isLoading && (
              <p className="text-xs text-muted-foreground py-2">Cargando personas...</p>
            )}

            {!qPending.isLoading && pendingPeople.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">
                No hay personas pendientes en el detalle de esta solicitud.
                Seleccione una persona directamente desde el buscador de abajo.
              </p>
            )}

            {pendingPeople.length > 0 && (
              <div className="overflow-x-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Persona</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>RMU</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPeople.map((p) => {
                      const isSelected = selectedRequestPersonId === p.requestPersonId;
                      return (
                        <TableRow
                          key={p.requestPersonId}
                          className={isSelected ? "bg-primary/5" : undefined}
                        >
                          <TableCell className="text-sm">
                            {p.personFullName
                              ? (
                                <div>
                                  <div className="font-medium">{p.personFullName}</div>
                                  {p.personIdentification && (
                                    <div className="text-xs text-muted-foreground">{p.personIdentification}</div>
                                  )}
                                </div>
                              )
                              : <span className="text-muted-foreground text-xs">Sin asignar</span>
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {p.requestPersonTypeName ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{p.jobName ?? `#${p.jobId}`}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {p.startDate ? p.startDate.slice(0, 10) : "—"}
                            {" → "}
                            {p.endDate ? p.endDate.slice(0, 10) : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {p.rmu != null ? `$${Number(p.rmu).toFixed(2)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {isSelected ? (
                              <Badge className="text-xs bg-primary">Seleccionado</Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => onSelect(p)}
                              >
                                Seleccionar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              {pendingPeople.length > 0
                ? "Selecciona una persona del detalle para pre-completar los datos, o busca manualmente en el campo de abajo."
                : ""}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
