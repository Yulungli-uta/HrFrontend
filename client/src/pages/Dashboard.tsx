import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FileText, 
  Clock, 
  CalendarX,
  UserPlus,
  ClockIcon,
  CalendarCheck,
  FileSpreadsheet,
  ArrowUp,
  TriangleAlert
} from "lucide-react";
import { PersonasAPI, ContratosAPI, MarcacionesAPI, PermisosAPI } from "@/lib/api";
import { Link } from "wouter";
import { useAuth } from '@/contexts/AuthContext';

// Función para extraer datos de la respuesta API
const extractData = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (response?.results && Array.isArray(response.results)) return response.results;
  return [];
};

export default function Dashboard() {
 const { employeeDetails, user } = useAuth();
  console.log("Valores del detalle del empleado: ----------",employeeDetails);
  // Consulta de personas con manejo de respuesta
  const { data: personasResponse } = useQuery({
    queryKey: ["/api/people"],
    queryFn: PersonasAPI.list,
  });
  const personas = extractData(personasResponse);

  // Consulta de contratos con manejo de respuesta
  const { data: contratosResponse } = useQuery({
    queryKey: ["/api/contracts"],
    queryFn: ContratosAPI.list,
  });
  const contratos = extractData(contratosResponse);
  const contratosActivos = contratos.filter(c => !c.fechaFin || new Date(c.fechaFin) > new Date());

  // Consulta de marcaciones con manejo de respuesta
  const { data: marcacionesResponse } = useQuery({
    queryKey: ["/api/attendance/punches"],
    queryFn: MarcacionesAPI.list,
  });
  const marcaciones = extractData(marcacionesResponse);

  // Consulta de permisos con manejo de respuesta
  const { data: permisosResponse } = useQuery({
    queryKey: ["/api/permissions"],
    queryFn: PermisosAPI.list,
  });
  const permisos = extractData(permisosResponse);
  const permisosPendientes = permisos.filter(p => p.estado === "SOLICITADO");

  // Cálculo de porcentajes seguros
  const porcentajeContratos = personas.length > 0 
    ? Math.round((contratosActivos.length / personas.length) * 100)
    : 0;
    
  const porcentajeAsistencia = contratosActivos.length > 0 
    ? Math.round((marcaciones.length / contratosActivos.length) * 100)
    : 0;

  return (
    <>
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
            <p className="text-sm text-muted-foreground mt-1">Resumen general del sistema</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" data-testid="button-notifications">
              <span className="sr-only">Notificaciones</span>
              🔔
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-profile">
              <span className="sr-only">Perfil</span>
              👤
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Personas Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Personas</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-total-personas">
                    {personas.length}
                  </p>
                  <p className="text-sm text-success mt-1 flex items-center">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    Empleados registrados
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="text-primary h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contratos Activos Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contratos Activos</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-contratos-activos">
                    {contratosActivos.length}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {porcentajeContratos}% del total
                  </p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <FileText className="text-success h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Marcaciones Hoy Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Marcaciones Hoy</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-marcaciones-hoy">
                    {marcaciones.length}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {porcentajeAsistencia}% asistencia
                  </p>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Clock className="text-warning h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permisos Pendientes Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Permisos Pendientes</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-permisos-pendientes">
                    {permisosPendientes.length}
                  </p>
                  <p className="text-sm text-destructive mt-1 flex items-center">
                    <TriangleAlert className="h-3 w-3 mr-1" />
                    Requieren revisión
                  </p>
                </div>
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <CalendarX className="text-destructive h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Actividades Recientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {marcaciones.slice(0, 5).map((marcacion, index) => (
                <div key={`marcacion-${marcacion.id || marcacion.timestamp || index}`}  className="flex items-center space-x-4 p-3 hover:bg-accent rounded-lg transition-colors">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <ClockIcon className="text-primary h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Nueva marcación</p>
                    <p className="text-xs text-muted-foreground">
                      Persona ID: {marcacion.personaId} - {marcacion.tipo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(marcacion.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {marcaciones.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No hay marcaciones registradas hoy</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/personas">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-auto p-4 hover:bg-primary/5"
                  data-testid="button-quick-add-persona"
                >
                  <UserPlus className="mr-3 h-4 w-4 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">Agregar Persona</p>
                    <p className="text-sm text-muted-foreground">Registrar nuevo empleado</p>
                  </div>
                </Button>
              </Link>
              
              <Link href="/asistencia">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-auto p-4 hover:bg-primary/5"
                  data-testid="button-quick-marcacion"
                >
                  <ClockIcon className="mr-3 h-4 w-4 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">Registrar Marcación</p>
                    <p className="text-sm text-muted-foreground">Nueva entrada/salida</p>
                  </div>
                </Button>
              </Link>
              
              <Link href="/permisos">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-auto p-4 hover:bg-primary/5"
                  data-testid="button-quick-permiso"
                >
                  <CalendarCheck className="mr-3 h-4 w-4 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">Solicitar Permiso</p>
                    <p className="text-sm text-muted-foreground">Vacaciones o ausencias</p>
                  </div>
                </Button>
              </Link>
              
              <Link href="/nomina">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-auto p-4 hover:bg-primary/5"
                  data-testid="button-quick-nomina"
                >
                  <FileSpreadsheet className="mr-3 h-4 w-4 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">Generar Nómina</p>
                    <p className="text-sm text-muted-foreground">Procesar período actual</p>
                  </div>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}