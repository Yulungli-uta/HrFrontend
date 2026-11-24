//src/components/forms/PunchTable.tsx
import { useState } from "react";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const PUNCH_TYPES = {
  In: { label: "Entrada", className: "bg-success/15 text-success border-success/30" },
  Out: { label: "Salida", className: "bg-destructive/15 text-destructive border-destructive/30" },
} as const;

interface Punch {
  punchId: any;
  punchTime: string;
  punchType: string;
  deviceId?: string;
  latitude?: number | string;
  longitude?: number | string;
}

/** Cuántas marcaciones se muestran en móvil antes de pedir "Ver todas". */
const MOBILE_PREVIEW = 5;

export function PunchTable({ punches }: { punches: Punch[] }) {
  const [showAll, setShowAll] = useState(false);

  if (punches.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No hay marcaciones registradas.
      </div>
    );
  }

  return (
    <>
      {/* Vista Móvil: lista compacta de una línea por marcación (punto verde = entrada, rojo = salida) */}
      <div className="md:hidden">
        <ul className="divide-y divide-border">
          {(showAll ? punches : punches.slice(0, MOBILE_PREVIEW)).map((p) => {
            const isIn = p.punchType === "In";
            return (
              <li key={p.punchId} className="flex min-h-11 items-center gap-3 px-4 py-2">
                <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${isIn ? "bg-success" : "bg-destructive"}`} />
                <span className="font-semibold tabular-nums">{format(new Date(p.punchTime), "HH:mm:ss", { locale: es })}</span>
                <span className="text-sm text-muted-foreground">{PUNCH_TYPES[p.punchType as "In" | "Out"]?.label || p.punchType}</span>
              </li>
            );
          })}
        </ul>
        {punches.length > MOBILE_PREVIEW && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="flex min-h-11 w-full items-center justify-center gap-1 border-t border-border text-sm font-medium text-primary hover:bg-primary/5"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" aria-hidden="true" /> Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" aria-hidden="true" /> Ver las {punches.length}
              </>
            )}
          </button>
        )}
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