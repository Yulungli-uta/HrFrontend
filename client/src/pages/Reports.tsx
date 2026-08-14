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
  AlarmClock,
  Timer,
  LayoutGrid,
  Building2,
  CalendarClock,
  ChevronRight,
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  FileCheck,
  ClipboardSignature,
  ClipboardCheck,
  History,
  CalendarCheck,
  FilePlus,
  BadgeCheck,
  CalendarRange,
  MapPin,
  ArrowLeftRight,
  ShieldCheck,
  Utensils,
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
  // "attendancesumary" (Resumen de Asistencias) deprecado 2026-08-11: ~90% de sus
  // columnas ya están cubiertas por "Reporte Cruzado de Asistencia" (attendance-cross),
  // que además soporta el filtro de régimen laboral a nivel de consulta. Se ocultó
  // también del menú lateral (auth.tbl_MenuItems.IsVisible=0) — no se borró el
  // ReportSource/SP, la ruta /reports/attedancesumary sigue funcionando si alguien
  // la tiene guardada.

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
  {
    id: "food-subsidy-summary",
    title: "Subsidio de Alimentación",
    description: "Días efectivamente laborados por empleado en el período multiplicados por el valor diario parametrizado del subsidio de alimentación",
    icon: Utensils,
    category: "Asistencia",
    badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    href: "/reports/food-subsidy-summary",
    formats: ["PDF", "Excel"],
  },

  // ── Reportes v2 — SIIES (CACES, Instructivo Carga Masiva v2S) ────────────────
  {
    id: "siies-funcionarios",
    title: "SIIES - Funcionarios",
    description: "Matrices 5.7/5.8 del Instructivo Carga Masiva CACES: personal administrativo y técnicos docentes. Filtro Cédula/Pasaporte para segregar sin mezclar archivos",
    icon: FileSpreadsheet,
    category: "SIIES (CACES)",
    badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    href: "/reports/siies-funcionarios",
    formats: ["PDF", "CSV"],
  },
  {
    id: "siies-profesores",
    title: "SIIES - Profesores",
    description: "Matrices 5.2/5.3 (Contratos IES) y 5.4 (Distribución Horas) fusionadas. Filtro Cédula/Pasaporte para segregar sin mezclar archivos",
    icon: FileSpreadsheet,
    category: "SIIES (CACES)",
    badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    href: "/reports/siies-profesores",
    formats: ["PDF", "CSV"],
  },
  {
    id: "siies-formacion-profesional",
    title: "SIIES - Formación Profesional",
    description: "Matriz 5.5 del Instructivo Carga Masiva CACES: títulos académicos de docentes (Formación Profesional Terminado)",
    icon: FileSpreadsheet,
    category: "SIIES (CACES)",
    badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    href: "/reports/siies-formacion-profesional",
    formats: ["PDF", "CSV"],
  },

  // ── Reportes v2 — Gestión RH ──────────────────────────────────────────────────
  {
    id: "contracts",
    title: "Reporte de Contratos",
    description: "Contratos de personal con filtro por estado, departamento y período",
    icon: FileText,
    category: "Gestión RH",
    badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    href: "/reports/contracts",
    formats: ["PDF", "Excel"],
  },
  {
    id: "active-contracts",
    title: "Contratos Vigentes",
    description: "Contratos activos a la fecha actual con filtro por tipo, régimen y creador",
    icon: FileCheck,
    category: "Gestión RH",
    badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    href: "/reports/active-contracts",
    formats: ["PDF", "Excel"],
  },
  {
    id: "contract-requests",
    title: "Reporte de Solicitudes de Contrato",
    description: "Solicitudes de contratación por departamento con avance de cumplimiento",
    icon: FilePlus,
    category: "Gestión RH",
    badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    href: "/reports/contract-requests",
    formats: ["PDF", "Excel"],
  },
  {
    id: "personnel-actions",
    title: "Reporte de Acciones de Personal",
    description: "Todas las acciones de personal con filtro por estado y período",
    icon: ClipboardSignature,
    category: "Gestión RH",
    badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    href: "/reports/personnel-actions",
    formats: ["PDF", "Excel"],
  },
  {
    id: "active-personnel-actions",
    title: "Acciones de Personal Vigentes",
    description: "Acciones de movimiento, ingreso y económicas vigentes con filtro por período y empleado",
    icon: ClipboardCheck,
    category: "Gestión RH",
    badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    href: "/reports/active-personnel-actions",
    formats: ["PDF", "Excel"],
  },
  {
    id: "employee-history",
    title: "Historial del Empleado",
    description: "Contratos y acciones de cambio de puesto por empleado (excluye disciplinarias)",
    icon: History,
    category: "Gestión RH",
    badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    href: "/reports/employee-history",
    formats: ["PDF", "Excel"],
  },
  {
    id: "granted-permissions",
    title: "Reporte de Permisos Otorgados",
    description: "Permisos de personal con filtro por estado, período y departamento",
    icon: CalendarCheck,
    category: "Gestión RH",
    badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    href: "/reports/granted-permissions",
    formats: ["PDF", "Excel"],
  },
  {
    id: "certifications",
    title: "Reporte de Certificaciones Financieras",
    description: "Certificaciones de disponibilidad presupuestaria con selección de estado",
    icon: BadgeCheck,
    category: "Gestión RH",
    badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    href: "/reports/certifications",
    formats: ["PDF", "Excel"],
  },

  // ── Reportes v2 — Guardias ────────────────────────────────────────────────────
  {
    id: "guard-shift-planning",
    title: "Planificación de Turnos de Guardias",
    description: "Detalle de turnos asignados por guardia, grupo y ubicación en un período",
    icon: CalendarRange,
    category: "Guardias",
    badgeColor: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    href: "/reports/guard-shift-planning",
    formats: ["PDF", "Excel"],
  },
  {
    id: "guard-location-coverage",
    title: "Cobertura de Guardias por Ubicación",
    description: "Cantidad de guardias asignados por ubicación, fecha y turno; resalta ubicaciones sin cobertura",
    icon: MapPin,
    category: "Guardias",
    badgeColor: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    href: "/reports/guard-location-coverage",
    formats: ["PDF", "Excel"],
  },
  {
    id: "guard-shift-changes",
    title: "Cambios de Turno y Reemplazos",
    description: "Intercambios, ausencias y reemplazos de guardias con estado de aprobación",
    icon: ArrowLeftRight,
    category: "Guardias",
    badgeColor: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    href: "/reports/guard-shift-changes",
    formats: ["PDF", "Excel"],
  },
  {
    id: "guard-group-roster",
    title: "Guardias por Grupo y Ubicación",
    description: "Listado de guardias activos con su grupo, ubicación asignada y período de rotación vigente",
    icon: Users,
    category: "Guardias",
    badgeColor: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    href: "/reports/guard-group-roster",
    formats: ["PDF", "Excel"],
  },
  {
    id: "guard-schedule-matrix",
    title: "Cronograma Matricial de Guardias",
    description: "Cronograma imprimible: filas = guardias, columnas = fechas, celdas = turno (M/T/N/L)",
    icon: LayoutGrid,
    category: "Guardias",
    badgeColor: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    href: "/reports/guard-schedule-matrix",
    formats: ["PDF", "Excel"],
  },

  // ── Auditoría ─────────────────────────────────────────────────────────────────
  {
    id: "audit",
    title: "Auditoría de Reportes",
    description: "Historial de reportes generados y descargados: quién, cuándo y con qué filtros",
    icon: ShieldCheck,
    category: "Auditoría",
    badgeColor: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    href: "/reports/audit",
    formats: [],
  },
];

// ─── Agrupación por categoría ──────────────────────────────────────────────────

const CATEGORY_ORDER = [
  "Personal",
  "Asistencia",
  "Organización",
  "Gestión RH",
  "Guardias",
  "SIIES (CACES)",
  "Auditoría",
];

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
