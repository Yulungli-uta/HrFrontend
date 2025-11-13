import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { StatusBadge } from "./StatusBadge";
import type { Justification } from "@/types/justifications";

export function JustificationCards({
  items, getTypeName, getBossName, onView, onDelete
}: {
  items: Justification[];
  getTypeName: (id: number) => string;
  getBossName: (id: number) => string;
  onView: (j: Justification) => void;
  onDelete: (j: Justification) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(j => (
        <Card key={j.punchJustID} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <StatusBadge status={j.status} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="Abrir menú">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onView(j)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver detalles
                  </DropdownMenuItem>
                  {j.status === "PENDING" && (
                    <DropdownMenuItem onClick={() => onDelete(j)} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CardTitle className="text-lg">{getTypeName(j.justificationTypeID)}</CardTitle>
            <CardDescription className="line-clamp-2">{j.reason}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">Fecha:</span>
              <span>{j.justificationDate ? format(parseISO(j.justificationDate), "dd/MM/yyyy") : "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Horas:</span>
              <span>{j.hoursRequested ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Jefe:</span>
              <span className="text-right">{getBossName(j.bossEmployeeID)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Creado:</span>
              <span>{format(parseISO(j.createdAt), "dd/MM/yyyy")}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
