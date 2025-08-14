import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileSpreadsheet, DollarSign } from "lucide-react";
import { NominaAPI } from "@/lib/api";
import type { NominaPeriodo, NominaConcepto, NominaMovimiento } from "@shared/schema";

export default function Nomina() {
  const [activeTab, setActiveTab] = useState<"periodos" | "conceptos" | "movimientos">("periodos");
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("all");

  const { data: periodos = [], isLoading: periodosLoading } = useQuery({
    queryKey: ["/api/nomina/periodos"],
    queryFn: NominaAPI.periodos.list,
  });

  const { data: conceptos = [], isLoading: conceptosLoading } = useQuery({
    queryKey: ["/api/nomina/conceptos"],
    queryFn: NominaAPI.conceptos.list,
  });

  const { data: movimientos = [], isLoading: movimientosLoading } = useQuery({
    queryKey: ["/api/nomina/movimientos", selectedPeriodo],
    queryFn: () => {
      if (selectedPeriodo === "all") {
        return NominaAPI.movimientos.list();
      }
      return NominaAPI.movimientos.list(parseInt(selectedPeriodo));
    },
  });

  const getBadgeVariant = (estado: string) => {
    switch (estado) {
      case "abierto": return "secondary";
      case "cerrado": return "default";
      case "procesado": return "outline";
      default: return "secondary";
    }
  };

  const getConceptoTipoBadge = (tipo: string) => {
    return tipo === "ingreso" ? "default" : "destructive";
  };

  return (
    <>
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Gestión de Nómina</h2>
            <p className="text-sm text-muted-foreground mt-1">Períodos, conceptos y movimientos</p>
          </div>
          <Button data-testid="button-new-periodo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Período
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Tab Navigation */}
        <div className="flex space-x-4 border-b border-border">
          <button
            onClick={() => setActiveTab("periodos")}
            className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "periodos"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-periodos"
          >
            Períodos
          </button>
          <button
            onClick={() => setActiveTab("conceptos")}
            className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "conceptos"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-conceptos"
          >
            Conceptos
          </button>
          <button
            onClick={() => setActiveTab("movimientos")}
            className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "movimientos"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-movimientos"
          >
            Movimientos
          </button>
        </div>

        {/* Períodos Tab */}
        {activeTab === "periodos" && (
          <Card>
            <CardHeader>
              <CardTitle>Períodos de Nómina</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {periodosLoading ? (
                <div className="p-6 text-center">Cargando períodos...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Fecha Inicio</TableHead>
                        <TableHead>Fecha Fin</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No hay períodos registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        periodos.map((periodo: NominaPeriodo) => (
                          <TableRow key={periodo.id} className="hover:bg-accent">
                            <TableCell className="font-medium" data-testid={`text-nombre-periodo-${periodo.id}`}>
                              {periodo.nombre}
                            </TableCell>
                            <TableCell data-testid={`text-inicio-${periodo.id}`}>
                              {periodo.fechaInicio}
                            </TableCell>
                            <TableCell data-testid={`text-fin-${periodo.id}`}>
                              {periodo.fechaFin}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getBadgeVariant(periodo.estado!)} data-testid={`badge-estado-periodo-${periodo.id}`}>
                                {periodo.estado}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                data-testid={`button-process-${periodo.id}`}
                              >
                                <FileSpreadsheet className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Conceptos Tab */}
        {activeTab === "conceptos" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Conceptos de Nómina</CardTitle>
                <Button data-testid="button-new-concepto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Concepto
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {conceptosLoading ? (
                <div className="p-6 text-center">Cargando conceptos...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fórmula</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conceptos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No hay conceptos registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        conceptos.map((concepto: NominaConcepto) => (
                          <TableRow key={concepto.id} className="hover:bg-accent">
                            <TableCell className="font-medium" data-testid={`text-codigo-${concepto.id}`}>
                              {concepto.codigo}
                            </TableCell>
                            <TableCell data-testid={`text-nombre-concepto-${concepto.id}`}>
                              {concepto.nombre}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getConceptoTipoBadge(concepto.tipo)} data-testid={`badge-tipo-concepto-${concepto.id}`}>
                                {concepto.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate" data-testid={`text-formula-${concepto.id}`}>
                              {concepto.formula || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={concepto.activo ? "default" : "secondary"} data-testid={`badge-activo-${concepto.id}`}>
                                {concepto.activo ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Movimientos Tab */}
        {activeTab === "movimientos" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Movimientos de Nómina</CardTitle>
                <div className="flex items-center space-x-4">
                  <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
                    <SelectTrigger className="w-48" data-testid="select-periodo-filter">
                      <SelectValue placeholder="Seleccionar período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los períodos</SelectItem>
                      {periodos.map((periodo) => (
                        <SelectItem key={periodo.id} value={periodo.id.toString()}>
                          {periodo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button data-testid="button-new-movimiento">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Movimiento
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {movimientosLoading ? (
                <div className="p-6 text-center">Cargando movimientos...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Persona</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Observaciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movimientos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No hay movimientos registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        movimientos.map((movimiento: NominaMovimiento) => (
                          <TableRow key={movimiento.id} className="hover:bg-accent">
                            <TableCell data-testid={`text-persona-movimiento-${movimiento.id}`}>
                              ID: {movimiento.personaId}
                            </TableCell>
                            <TableCell data-testid={`text-periodo-movimiento-${movimiento.id}`}>
                              ID: {movimiento.periodoId}
                            </TableCell>
                            <TableCell data-testid={`text-concepto-movimiento-${movimiento.id}`}>
                              ID: {movimiento.conceptoId}
                            </TableCell>
                            <TableCell className="font-medium" data-testid={`text-valor-${movimiento.id}`}>
                              ${movimiento.valor}
                            </TableCell>
                            <TableCell className="max-w-xs truncate" data-testid={`text-observaciones-movimiento-${movimiento.id}`}>
                              {movimiento.observaciones || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
