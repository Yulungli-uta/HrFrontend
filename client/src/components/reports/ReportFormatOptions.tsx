/**
 * src/components/reports/ReportFormatOptions.tsx
 *
 * Opciones de formato/maquetación del PDF (orientación, cabecera vertical,
 * repetir cabecera por página) — deliberadamente separadas de los filtros
 * de búsqueda de datos (ver ReportFilters.tsx). Universal: todo IReportSource
 * en el backend ya lee estos 3 campos del filtro (ver Reports/Sources/*.cs),
 * así que este bloque se muestra igual para todos los reportes, sin
 * condicionarlo a availableFilters. El reporte ya funciona con los valores
 * por defecto sin que el usuario tenga que abrir este bloque; solo
 * interactúa aquí si quiere cambiarlos. Por eso empieza colapsado.
 */

import * as React from "react";
import { ChevronsUpDown, LayoutPanelTop } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";

import type { ReportFilter, PageOrientation } from "@/types/reports";

interface ReportFormatOptionsProps {
  filter: ReportFilter;
  setFilterValue: (key: keyof ReportFilter, value: any) => void;
}

export function ReportFormatOptions({ filter, setFilterValue }: ReportFormatOptionsProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-3">
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <LayoutPanelTop className="h-4 w-4" />
          Opciones de formato del PDF
          <ChevronsUpDown className="h-3.5 w-3.5" />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <Card className="mt-2">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Orientación de página PDF (portrait / landscape) */}
              <div className="space-y-2">
                <Label htmlFor="orientation">Orientación del PDF</Label>
                <Select
                  value={filter.orientation ?? "landscape"}
                  onValueChange={(value) => setFilterValue("orientation", value as PageOrientation)}
                >
                  <SelectTrigger id="orientation">
                    <SelectValue placeholder="Seleccionar orientación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landscape">↔️ Horizontal (Landscape)</SelectItem>
                    <SelectItem value="portrait">↕️ Vertical (Portrait)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Horizontal recomendado para reportes con muchas columnas
                </p>
              </div>

              {/* Orientación de cabecera del PDF (horizontal / vertical) */}
              <div className="space-y-2">
                <Label htmlFor="verticalHeaders">Cabecera del PDF</Label>
                <Select
                  value={filter.verticalHeaders ? "true" : "false"}
                  onValueChange={(value) => setFilterValue("verticalHeaders", value === "true")}
                >
                  <SelectTrigger id="verticalHeaders">
                    <SelectValue placeholder="Horizontal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Horizontal</SelectItem>
                    <SelectItem value="true">Vertical (rotada 90°)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Vertical ayuda a que quepan más columnas en reportes angostos.
                </p>
              </div>

              {/* Repetir cabecera en cada página vs. solo primera página */}
              <div className="space-y-2">
                <Label htmlFor="repeatHeaderOnEveryPage">Repetir cabecera</Label>
                <Select
                  value={filter.repeatHeaderOnEveryPage === false ? "false" : "true"}
                  onValueChange={(value) => setFilterValue("repeatHeaderOnEveryPage", value === "true")}
                >
                  <SelectTrigger id="repeatHeaderOnEveryPage">
                    <SelectValue placeholder="Todas las páginas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">En todas las páginas</SelectItem>
                    <SelectItem value="false">Solo en la primera página</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default ReportFormatOptions;
