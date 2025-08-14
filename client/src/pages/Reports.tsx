import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, BarChart3, Users, DollarSign, Clock, CalendarCheck } from "lucide-react";

export default function ReportsPage() {
  const reports = [
    {
      id: "personnel-report",
      title: "Reporte de Personal",
      description: "Listado completo de empleados y su información",
      icon: Users,
      category: "Personal",
      color: "text-blue-600"
    },
    {
      id: "attendance-report", 
      title: "Reporte de Asistencia",
      description: "Control de marcaciones y horas trabajadas",
      icon: Clock,
      category: "Asistencia",
      color: "text-green-600"
    },
    {
      id: "permissions-report",
      title: "Reporte de Permisos",
      description: "Solicitudes de permisos por período",
      icon: CalendarCheck,
      category: "Permisos",
      color: "text-orange-600"
    },
    {
      id: "payroll-report",
      title: "Reporte de Nómina",
      description: "Resumen de pagos y salarios mensuales",
      icon: DollarSign,
      category: "Nómina",
      color: "text-purple-600"
    },
    {
      id: "contracts-report",
      title: "Reporte de Contratos",
      description: "Estado de contratos activos y vencimientos",
      icon: FileText,
      category: "Contratos",
      color: "text-red-600"
    },
    {
      id: "analytics-report",
      title: "Análisis Estadístico",
      description: "Métricas y tendencias de recursos humanos",
      icon: BarChart3,
      category: "Análisis",
      color: "text-indigo-600"
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Centro de Reportes</h1>
          <p className="text-gray-600 mt-2">Genere y descargue reportes del sistema de recursos humanos</p>
        </div>
        <Button 
          data-testid="button-schedule-report"
          variant="outline"
          className="border-blue-600 text-blue-600 hover:bg-blue-50"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Programar Reporte
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <report.icon className={`h-6 w-6 ${report.color}`} />
                <span data-testid={`text-report-title-${report.id}`}>
                  {report.title}
                </span>
              </CardTitle>
              <CardDescription>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {report.category}
                </span>
                <p className="mt-1" data-testid={`text-report-description-${report.id}`}>
                  {report.description}
                </p>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  data-testid={`button-generate-${report.id}`}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  data-testid={`button-download-${report.id}`}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="pt-2 border-t text-xs text-gray-500">
                <p>Formatos disponibles: PDF, Excel, CSV</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Reportes Recientes</span>
            </CardTitle>
            <CardDescription>
              Últimos reportes generados en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No hay reportes recientes</p>
              <p className="text-sm">Los reportes que genere aparecerán aquí</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}