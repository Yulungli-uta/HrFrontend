//src/components/forms/PunchTable.tsx
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const PUNCH_TYPES = {
  In: { label: "Entrada", className: "bg-green-100 text-green-800 border-green-200" },
  Out: { label: "Salida", className: "bg-red-100 text-red-800 border-red-200" },
} as const;

interface Punch {
  punchId: any;
  punchTime: string;
  punchType: string;
  deviceId?: string;
  latitude?: number | string;
  longitude?: number | string;
}

export function PunchTable({ punches }: { punches: Punch[] }) {
  if (punches.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No hay marcaciones registradas.
      </div>
    );
  }

  return (
    <>
      {/* Vista Móvil */}
      <div className="md:hidden p-3 space-y-3">
        {punches.map((p) => (
          <Card key={p.punchId} className="p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(p.punchTime), "HH:mm:ss", { locale: es })}
              </div>
              <Badge className={PUNCH_TYPES[p.punchType as "In" | "Out"]?.className}>
                {PUNCH_TYPES[p.punchType as "In" | "Out"]?.label || p.punchType}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-2">
              <span>Disp: {p.deviceId ?? "—"}</span>
              {p.latitude && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Vista Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Dispositivo</TableHead>
              <TableHead>Ubicación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {punches.map((p) => (
              <TableRow key={p.punchId}>
                <TableCell className="font-medium">
                  {format(new Date(p.punchTime), "HH:mm:ss", { locale: es })}
                </TableCell>
                <TableCell>
                  <Badge className={PUNCH_TYPES[p.punchType as "In" | "Out"]?.className}>
                    {PUNCH_TYPES[p.punchType as "In" | "Out"]?.label || p.punchType}
                  </Badge>
                </TableCell>
                <TableCell>{p.deviceId ?? "—"}</TableCell>
                <TableCell>
                  {p.latitude ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)}
                    </span>
                  ) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}