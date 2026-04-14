/**
 * src/pages/Reports.tsx
 *
 * Centro de Reportes — Universidad Técnica de Ambato
 * Muestra todas las tarjetas de reportes disponibles agrupadas por categoría.
 * Cada tarjeta navega directamente a la página de generación del reporte.
 */

import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Clock,
  Building,
  ClipboardList,
  AlarmClock,
  Timer,
  LayoutGrid,
  Building2,
  CalendarClock,
  ChevronRight,
  FileBarChart2,
} from "lucide-react";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  category: string;
  badgeColor: string;
  href: string;
  formats: string[];
}

// ─── Catálogo de reportes ──────────────────────────────────────────────────────

const REPORT_CARDS: ReportCard[] = [
  // ── Reportes v1 ─────────────────────────────────────────────────────────────
  {
    id: "employees",
    title: "Reporte de Empleados",
    description: "Información completa de empleados, salarios y contratos",
    icon: Users,
    category: "Personal",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    href: "/reports/employees",
    formats: ["PDF", "Excel"],
  },
  {
    id: "attendance",
    title: "Reporte de Asistencia",
    description: "Registros de entrada/salida y horas trabajadas",
    icon: Clock,
    category: "Asistencia",
    badgeColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    href: "/reports/attendance",
    formats: ["PDF", "Excel"],
  },
  {
    id: "departments",
    title: "Reporte de Departamentos",
    description: "Estadísticas y resumen por departamento",
    icon: Building,
    category: "Organización",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    href: "/reports/departments",
    formats: ["PDF", "Excel"],
  },
  {
    id: "attendancesumary",
    title: "Resumen de Asistencias",
    description: "Resumen consolidado de asistencia por empleado con todas las novedades",
    icon: ClipboardList,
    category: "Asistencia",
    badgeColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    href: "/reports/attedancesumary",
    formats: ["PDF", "Excel"],
  },

  // ── Reportes v2 — Estructura organizacional ──────────────────────────────────
  {
    id: "employees-by-department",
    title: "Empleados por Dependencia",
    description: "Listado detallado de empleados agrupado por dependencia organizacional",
    icon: Users,
    category: "Organización",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    href: "/reports/employees-by-department",
    formats: ["PDF", "Excel"],
  },
  {
    id: "department-contract-summary",
    title: "Resumen por Dependencia y Contrato",
    description: "Resumen consolidado de empleados agrupado por dependencia y tipo de contrato",
    icon: Building2,
    category: "Organización",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    href: "/reports/department-contract-summary",
    formats: ["PDF", "Excel"],
  },
  {
    id: "schedule-contract-summary",
    title: "Resumen por Horario y Contrato",
    description: "Resumen consolidado de empleados agrupado por horario asignado y tipo de contrato",
    icon: CalendarClock,
    category: "Organización",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    href: "/reports/schedule-contract-summary",
    formats: ["PDF", "Excel"],
  },

  // ── Reportes v2 — AttendanceCalculations ─────────────────────────────────────
  {
    id: "lateness",
    title: "Reporte de Atrasos",
    description: "Detalle de atrasos, tardanzas y salidas anticipadas por empleado en el período",
    icon: AlarmClock,
    category: "Asistencia",
    badgeColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    href: "/reports/lateness",
    formats: ["PDF", "Excel"],
  },
  {
    id: "overtime",
    title: "Reporte de Horas Extras",
    description: "Horas extras ordinarias, nocturnas, feriado y fuera de horario por empleado",
    icon: Timer,
    category: "Asistencia",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    href: "/reports/overtime",
    formats: ["PDF", "Excel"],
  },
  {
    id: "attendance-cross",
    title: "Reporte Cruzado de Asistencia",
    description: "Vista consolidada: horas trabajadas, permisos, vacaciones, justificaciones y licencias",
    icon: LayoutGrid,
    category: "Asistencia",
    badgeColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    href: "/reports/attendance-cross",
    formats: ["PDF", "Excel"],
  },
];

// ─── Agrupación por categoría ──────────────────────────────────────────────────

const CATEGORY_ORDER = ["Personal", "Asistencia", "Organización"];

function groupByCategory(cards: ReportCard[]): Record<string, ReportCard[]> {
  return cards.reduce<Record<string, ReportCard[]>>((acc, card) => {
    if (!acc[card.category]) acc[card.category] = [];
    acc[card.category].push(card);
    return acc;
  }, {});
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function ReportsPage() {
  const grouped = groupByCategory(REPORT_CARDS);

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <FileBarChart2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Centro de Reportes</h1>
          <p className="text-muted-foreground mt-1">
            Genere y descargue reportes del sistema de recursos humanos en PDF o Excel
          </p>
        </div>
      </div>

      {/* Secciones por categoría */}
      {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length > 0).map((category) => (
        <section key={category} className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">{category}</h2>
            <Badge variant="secondary" className="text-xs">
              {grouped[category].length} reporte{grouped[category].length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {grouped[category].map((report) => (
              <Link key={report.id} href={report.href}>
                <Card
                  className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all duration-200 group h-full"
                  data-testid={`card-report-${report.id}`}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <report.icon className="h-5 w-5 text-primary flex-shrink-0" />
                        <span data-testid={`text-report-title-${report.id}`}>
                          {report.title}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </CardTitle>
                    <CardDescription>
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${report.badgeColor}`}>
                        {report.category}
                      </span>
                      <p
                        className="text-sm text-muted-foreground leading-relaxed"
                        data-testid={`text-report-description-${report.id}`}
                      >
                        {report.description}
                      </p>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex gap-1.5">
                      {report.formats.map((fmt) => (
                        <span
                          key={fmt}
                          className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono"
                        >
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
