import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO } from "date-fns";
import { Eye, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "./StatusBadge";
import type { Justification } from "@/types/justifications";

export function EmptyState() {
  return (
    <Card>
      <CardContent className="text-center p-8">
        <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay justificaciones registradas</h3>
        <p className="text-gray-600">Utilice el botón "Nueva Justificación" para crear su primera solicitud</p>
      </CardContent>
    </Card>
  );
}

export function JustificationList({
  items, getTypeName, getBossName, onView, onDelete
}: {
  items: Justification[];
  getTypeName: (id: number) => string;
  getBossName: (id: number) => string;
  onView: (j: Justification) => void;
  onDelete: (j: Justification) => void;
}) {
  if (items.length === 0) return <EmptyState />;

  return (
    <Card>
      <CardHeader className="bg-gray-50 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Lista de Justificaciones</CardTitle>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 w-fit">
            Mostrando: {items.length} justificaciones
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="divide-y divide-gray-200">
            {items.map(j => (
              <Row
                key={j.punchJustID}
                item={j}
                getTypeName={getTypeName}
                getBossName={getBossName}
                onView={() => onView(j)}
                onDelete={() => onDelete(j)}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function Row({
  item, getTypeName, getBossName, onView, onDelete
}: any) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => setExpanded(v => !v)} className="h-8 w-8 p-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
              <p className="font-medium text-gray-900 truncate">{getTypeName(item.justificationTypeID)}</p>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-sm text-gray-600 truncate">{item.reason}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onView}><Eye className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Ver detalles</TooltipContent>
            </Tooltip>
            {item.status === "PENDING" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Eliminar justificación</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pl-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Fecha justificación:</span>
            <p>{item.justificationDate ? format(parseISO(item.justificationDate), "dd/MM/yyyy") : "-"}</p>
          </div>
          <div>
            <span className="font-medium">Horas:</span>
            <p>{item.hoursRequested ?? "-"}</p>
          </div>
          <div>
            <span className="font-medium">Jefe:</span>
            <p>{getBossName(item.bossEmployeeID)}</p>
          </div>
          <div>
            <span className="font-medium">Creado:</span>
            <p>{format(parseISO(item.createdAt), "dd/MM/yyyy HH:mm")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
