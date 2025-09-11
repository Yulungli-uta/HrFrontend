import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, FileText, Clock, Calendar, DollarSign } from "lucide-react";
import { PersonasAPI, ContratosAPI, MarcacionesAPI, PermisosAPI } from "@/lib/api";
import { Link } from "wouter";
import PersonaForm from "@/components/forms/PersonaForm";

export default function PersonaDetail() {
  const { id } = useParams();
  console.log("Persona ID:", id);
  // Validar que el id sea un número válido
  const personaId = id && !isNaN(parseInt(id)) ? parseInt(id) : null;
    

  // Consulta de persona solo si tenemos un ID válido
  const { data: persona, isLoading, isError } = useQuery({
    queryKey: ["people", personaId],
    queryFn: () => personaId ? PersonasAPI.get(personaId) : null,
    enabled: !!personaId,
  });

  // Consulta de contratos solo si tenemos un ID válido
  const { data: contratos = [], isLoading: isLoadingContratos } = useQuery({
    queryKey: ["contracts", personaId],
    queryFn: async () => {
      if (!personaId) return [];
      const data = await ContratosAPI.list();
      return data.filter(c => c.personaId === personaId);
    },
    enabled: !!personaId,
  });

  // Consulta de marcaciones solo si tenemos un ID válido
  const { data: marcaciones = [], isLoading: isLoadingMarcaciones } = useQuery({
    queryKey: ["attendance/punches", personaId],
    queryFn: () => personaId ? MarcacionesAPI.list({ personaId }) : [],
    enabled: !!personaId,
  });

  // Consulta de permisos solo si tenemos un ID válido
  const { data: permisos = [], isLoading: isLoadingPermisos } = useQuery({
    queryKey: ["permissions", personaId],
    queryFn: () => personaId ? PermisosAPI.list(personaId) : [],
    enabled: !!personaId,
  });

  // Manejar estado de carga general
  if (isLoading || isLoadingContratos || isLoadingMarcaciones || isLoadingPermisos) {
    return (
      <div className="p-6 text-center">
        <p>Cargando información de la persona...</p>
      </div>
    );
  }

  // Manejar errores o ID inválido
  if (isError || !personaId || !persona) {
    return (
      <div className="p-6 text-center">
        <p>Persona no encontrada</p>
        <Link href="/personas">
          <Button className="mt-4">Volver a Personas</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-border px-6 py-4">
        <div className="flex items-center space-x-4">
          <Link href="/personas">
            <Button variant="ghost" size="sm" data-testid="button-back-to-personas">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-semibold text-foreground" data-testid="text-persona-name">
              {persona.firstName} {persona.lastName}
            </h2>
            <p className="text-sm text-muted-foreground" data-testid="text-persona-id">
              ID: {persona.idCard}
            </p>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <Card>
          <Tabs defaultValue="info" className="w-full">
            <div className="border-b border-border">
              <TabsList className="grid w-full grid-cols-5 bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="info" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-4"
                  data-testid="tab-info"
                >
                  <User className="mr-2 h-4 w-4" />
                  Información Personal
                </TabsTrigger>
                <TabsTrigger 
                  value="contracts" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-4"
                  data-testid="tab-contracts"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Contratos
                </TabsTrigger>
                <TabsTrigger 
                  value="attendance" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-4"
                  data-testid="tab-attendance"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Asistencia
                </TabsTrigger>
                <TabsTrigger 
                  value="permits" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-4"
                  data-testid="tab-permits"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Permisos
                </TabsTrigger>
                <TabsTrigger 
                  value="payroll" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-4"
                  data-testid="tab-payroll"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Nómina
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="info" className="p-6">
              <PersonaForm persona={persona} />
            </TabsContent>

            <TabsContent value="contracts" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Historial de Contratos</h3>
                <Button data-testid="button-add-contract">
                  <FileText className="mr-2 h-4 w-4" />
                  Nuevo Contrato
                </Button>
              </div>
              <div className="space-y-4">
                {contratos.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No hay contratos registrados</p>
                ) : (
                  contratos.map((contrato) => (
                    <Card key={contrato.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Contrato #{contrato.id}</h4>
                        <Badge variant={contrato.isActive ? "default" : "secondary"}>
                          {contrato.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Tipo:</span> {contrato.type}
                        </div>
                        <div>
                          <span className="font-medium">Fecha Inicio:</span> {new Date(contrato.startDate).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Sueldo Base:</span> ${contrato.baseSalary}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="p-6">
              <h3 className="text-lg font-semibold mb-4">Marcaciones Recientes</h3>
              <div className="space-y-4">
                {marcaciones.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No hay marcaciones registradas</p>
                ) : (
                  marcaciones.slice(0, 10).map((marcacion) => (
                    <Card key={marcacion.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{new Date(marcacion.timestamp).toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(marcacion.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge variant={marcacion.type === "in" ? "default" : "secondary"}>
                          {marcacion.type === "in" ? "Entrada" : "Salida"}
                        </Badge>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="permits" className="p-6">
              <h3 className="text-lg font-semibold mb-4">Permisos y Vacaciones</h3>
              <div className="space-y-4">
                {permisos.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No hay permisos registrados</p>
                ) : (
                  permisos.map((permiso) => (
                    <Card key={permiso.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{permiso.type}</h4>
                        <Badge 
                          variant={
                            permiso.status === "approved" ? "default" :
                            permiso.status === "rejected" ? "destructive" :
                            "secondary"
                          }
                        >
                          {permiso.status === "approved" ? "Aprobado" :
                           permiso.status === "rejected" ? "Rechazado" : "Pendiente"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Desde: {new Date(permiso.startDate).toLocaleDateString()} - Hasta: {new Date(permiso.endDate).toLocaleDateString()}</p>
                        <p>Motivo: {permiso.reason}</p>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="payroll" className="p-6">
              <h3 className="text-lg font-semibold mb-4">Información de Nómina</h3>
              <p className="text-muted-foreground">Información de nómina no disponible</p>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </>
  );
}