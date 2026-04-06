// src/App.tsx
import { Suspense, lazy } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Loader2 } from "lucide-react";
import { DocflowServiceProvider } from "@/services/docflow/docflow-service-context";
import { DirectoryServiceProvider } from "@/services/docflow/directory-service-context";
import { ThemeProvider } from "@/components/ThemeProvider";

// Componentes críticos
import Layout from "@/components/Layout";
import LoginPage from "@/pages/Login";
import NotFound from "@/pages/not-found";

// Dashboard lazy
const Dashboard = lazy(() => import("@/pages/Dashboard"));

// ============================================
// CODE SPLITTING - Lazy Loading de Páginas
// ============================================

// Páginas principales
const PeoplePage = lazy(() => import("@/pages/People"));
const PersonDetail = lazy(() => import("@/pages/PersonDetail"));
const EmployeesPage = lazy(() => import("@/pages/Employees"));
const FacultiesPage = lazy(() => import("@/pages/Faculties"));
const DepartmentsPage = lazy(() => import("@/pages/Departments"));
const ContractsPage = lazy(() => import("@/pages/Contracts"));
const PermissionsPage = lazy(() => import("@/pages/Permissions"));
const VacationsPage = lazy(() => import("@/pages/Vacations"));
const AttendancePage = lazy(() => import("@/pages/Attendance"));
const PayrollPage = lazy(() => import("@/pages/Payroll"));
const SchedulesPage = lazy(() => import("@/pages/Schedules"));
const OvertimePage = lazy(() => import("@/pages/Overtime"));
const ReportsPage = lazy(() => import("@/pages/Reports"));
const JustificationPage = lazy(() => import("@/pages/Justifications"));
const ContractTypePage = lazy(() => import("@/pages/ContractType"));
const ContractRequestPage = lazy(() => import("@/pages/ContractRequest"));
const ScheduleChangePlansPage  = lazy(() => import( "@/pages/ScheduleChangePlansPage"));
const CertificationFinancePage = lazy(
  () => import("@/pages/CertificationFinance")
);
const EmployeeSchedulesPage = lazy(
  () => import("@/pages/EmployeeSchedules")
);
const PermissionTypesPage = lazy(() => import("@/pages/PermissionTypes"));
const ApprovalsMedicalPermissionsPage = lazy(() => import("@/pages/ApprovalsMedicalPermissions"));
const ApprovalsPermissionsPage = lazy(
  () => import("@/pages/ApprovalsPermissions")
);
const JobActivitiesPage = lazy(() => import("@/pages/JobActivities"));
const ReferenceTypesPage = lazy(() => import("@/pages/ReferenceTypes"));
const HolidaysPage = lazy(() => import("@/pages/Holidays"));
const FilesUploadPage = lazy(() => import("@/pages/FilesUploadPage"));

// Páginas de administración
const UsersPage = lazy(() => import("@/pages/admin/Users"));
const RolesPage = lazy(() => import("@/pages/admin/Roles"));
const UserRolesPage = lazy(() => import("@/pages/admin/UserRoles"));
const MenuItemsPage = lazy(() => import("@/pages/admin/MenuItems"));
const RoleMenuItemsPage = lazy(
  () => import("@/pages/admin/RoleMenuItems")
);
const ChangePasswordPage = lazy(
  () => import("@/pages/profile/ChangePassword")
);

// Páginas de reportes
const EmployeesReportPage = lazy(
  () => import("@/pages/reports/EmployeesReport")
);
const AttendanceReportPage = lazy(
  () => import("@/pages/reports/AttendanceReport")
);
const DepartmentsReportPage = lazy(
  () => import("@/pages/reports/DepartmentsReport")
);
const AttendanceSumaryReportPage = lazy(
  () => import("@/pages/reports/AttendanceSumaryReport")
);
const ReportAuditPage = lazy(() => import("@/pages/reports/ReportAudit"));
const AzureManagementPage = lazy(() => import("@/pages/admin/AzureManagement"));
const JobexecutionPage = lazy(() => import("@/pages/admin/Jobexecution"));

//Paginas de Docflow
const DocFlowDashboard = lazy(() => import("@/pages/DocFlow/dashboard"));
const Processes = lazy(() => import("@/pages/DocFlow/processes"));
const InstancesList = lazy(() => import("@/pages/DocFlow/instances-list"));
const InstanceDetail = lazy(() => import("@/pages/DocFlow/instance-detail"));
const NewInstance = lazy(() => import("@/pages/DocFlow/new-instance"));
const Audit = lazy(() => import("@/pages/DocFlow/audit"));
const ProcessInstances = lazy(() => import("@/pages/DocFlow/process-instances"));
const DynamicFields = lazy(() => import("@/pages/DocFlow/dynamic-fields"));
const SearchInstances = lazy(() => import("@/pages/DocFlow/search-instances"));
const InstanceHistory = lazy(() => import("@/pages/DocFlow/instance-history"));
const GeneralSearch = lazy(() => import("@/pages/DocFlow/general-search"));

// ============================================
// Fallbacks
// ============================================

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="text-center max-w-md">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Ocurrió un error inesperado
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {(error instanceof Error ? error.message : null) ||
            "Por favor, recarga la página o intenta de nuevo."}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Recargar página
        </button>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
        <p className="text-gray-600 dark:text-gray-400 text-sm">Cargando...</p>
      </div>
    </div>
  );
}

// Pantalla de carga inicial (cuando AuthContext está comprobando sesión)
function InitialLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300">
          Cargando aplicación...
        </p>
      </div>
    </div>
  );
}

// ============================================
// Router principal (dependiente de AuthContext)
// ============================================

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  // Mientras AuthContext está revisando tokens → pantalla de carga
  if (isLoading) {
    return <InitialLoadingScreen />;
  }

  // No autenticado → solo /login; todo lo demás redirige a /login
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<InitialLoadingScreen />}>
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route path="/:rest*">
            {() => <Redirect to="/login" />}
          </Route>
        </Switch>
      </Suspense>
    );
  }

  // Autenticado → app completa dentro de Layout
  return (
    <Layout>
      <Suspense fallback={<LoadingFallback />}>
        <Switch>
          {/* RUTA PRINCIPAL */}
          <Route path="/" component={Dashboard} />

          {/* Evitar volver al login si ya está autenticado */}
          <Route path="/login">
            {() => <Redirect to="/" />}
          </Route>

          {/* Perfil */}
          <Route path="/profile/change-password" component={ChangePasswordPage} />

          {/* ===== Gestión de Personal ===== */}
          <Route path="/people">
            {() => (
              <ProtectedRoute requiredPath="/people">
                <PeoplePage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/people/:id">
            {(params) => (
              <ProtectedRoute requiredPath="/people">
                <PersonDetail />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/employees">
            {() => (
              <ProtectedRoute requiredPath="/employees">
                <EmployeesPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/faculties">
            {() => (
              <ProtectedRoute requiredPath="/faculties">
                <FacultiesPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/departments">
            {() => (
              <ProtectedRoute requiredPath="/departments">
                <DepartmentsPage />
              </ProtectedRoute>
            )}
          </Route>

          {/* ===== Contratos y Permisos ===== */}
          <Route path="/contracts">
            {() => (
              <ProtectedRoute requiredPath="/contracts">
                <ContractsPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/contractType">
            {() => (
              <ProtectedRoute requiredPath="/contractType">
                <ContractTypePage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/contractRequest">
            {() => (
              <ProtectedRoute requiredPath="/contractRequest">
                <ContractRequestPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/permissions">
            {() => (
              <ProtectedRoute requiredPath="/permissions">
                <PermissionsPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/permissionTypes">
            {() => (
              <ProtectedRoute requiredPath="/permissionTypes">
                <PermissionTypesPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/ApprovalsMedicalPermissions">
            {() => (
              <ProtectedRoute requiredPath="/ApprovalsMedicalPermissions">
                <ApprovalsMedicalPermissionsPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/ApprovalsPermissions">
            {() => (
              <ProtectedRoute requiredPath="/ApprovalsPermissions">
                <ApprovalsPermissionsPage />
              </ProtectedRoute>
            )}
          </Route>

          {/* ===== Asistencia y Horarios ===== */}
          <Route path="/attendance">
            {() => (
              <ProtectedRoute requiredPath="/attendance">
                <AttendancePage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/schedules">
            {() => (
              <ProtectedRoute requiredPath="/schedules">
                <SchedulesPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/shedulerAssig">
            {() => (
              <ProtectedRoute requiredPath="/shedulerAssig">
                <EmployeeSchedulesPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/shedulerChangePlans">
            {() => (
              <ProtectedRoute requiredPath="/shedulerChangePlans">
                <ScheduleChangePlansPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/overtime">
            {() => (
              <ProtectedRoute requiredPath="/overtime">
                <OvertimePage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/justifications">
            {() => (
              <ProtectedRoute requiredPath="/justifications">
                <JustificationPage />
              </ProtectedRoute>
            )}
          </Route>

          {/* ===== Vacaciones / Nómina / Finanzas ===== */}
          <Route path="/vacations">
            {() => (
              <ProtectedRoute requiredPath="/vacations">
                <VacationsPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/holidays">
            {() => (
              <ProtectedRoute requiredPath="/holidays">
                <HolidaysPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/payroll">
            {() => (
              <ProtectedRoute requiredPath="/payroll">
                <PayrollPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/certFinance">
            {() => (
              <ProtectedRoute requiredPath="/certFinance">
                <CertificationFinancePage />
              </ProtectedRoute>
            )}
          </Route>

          {/* ===== Reportes ===== */}
          <Route path="/reports">
            {() => (
              <ProtectedRoute requiredPath="/reports">
                <ReportsPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/reports/employees">
            {() => (
              <ProtectedRoute requiredPath="/reports/employees">
                <EmployeesReportPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/reports/attendance">
            {() => (
              <ProtectedRoute requiredPath="/reports/attendance">
                <AttendanceReportPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/reports/departments">
            {() => (
              <ProtectedRoute requiredPath="/reports/departments">
                <DepartmentsReportPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/reports/attedancesumary">
            {() => (
              <ProtectedRoute requiredPath="/reports/attedancesumary">
                <AttendanceSumaryReportPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/reports/audit">
            {() => (
              <ProtectedRoute requiredPath="/reports/audit">
                <ReportAuditPage />
              </ProtectedRoute>
            )}
          </Route>

          {/* ===== Otros ===== */}
          <Route path="/jobActivities">
            {() => (
              <ProtectedRoute requiredPath="/jobActivities">
                <JobActivitiesPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/referenceTypes">
            {() => (
              <ProtectedRoute requiredPath="/referenceTypes">
                <ReferenceTypesPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/FilesUploadPage">
            {() => (
              <ProtectedRoute requiredPath="/FilesUploadPage">
                <FilesUploadPage />
              </ProtectedRoute>
            )}
          </Route>

          {/* ===== Administración ===== */}
          <Route path="/admin/users">
            {() => (
              <ProtectedRoute requiredPath="/admin/users">
                <UsersPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/admin/roles">
            {() => (
              <ProtectedRoute requiredPath="/admin/roles">
                <RolesPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/admin/user-roles">
            {() => (
              <ProtectedRoute requiredPath="/admin/user-roles">
                <UserRolesPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/admin/menu-items">
            {() => (
              <ProtectedRoute requiredPath="/admin/menu-items">
                <MenuItemsPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/admin/role-menu-items">
            {() => (
              <ProtectedRoute requiredPath="/admin/role-menu-items">
                <RoleMenuItemsPage />
              </ProtectedRoute>
            )}
          </Route>

           <Route path="/admin/AzureMagnament">
            {() => (
              <ProtectedRoute requiredPath="/admin/AzureMagnament">
                <AzureManagementPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/admin/Jobexecution">
            {() => (
              <ProtectedRoute requiredPath="/admin/Jobexecution">
                <JobexecutionPage />
              </ProtectedRoute>
            )}
          </Route>

          {/* ===== DocFlow ===== */}          
          <Route path="/DocFlow/DocFlowDashboard">
            {() => (
              <DocflowServiceProvider>
                <DirectoryServiceProvider>
                  <ProtectedRoute requiredPath="/DocFlow/DocFlowDashboard">
                    <DocFlowDashboard />
                  </ProtectedRoute>
                </DirectoryServiceProvider>
              </DocflowServiceProvider>
            )}
          </Route>

          <Route path="/DocFlow/expedientes/nuevo">
            {() => (
              <DocflowServiceProvider>
                <DirectoryServiceProvider>
                  <ProtectedRoute requiredPath="/DocFlow/expedientes">
                    <NewInstance />
                  </ProtectedRoute>
                </DirectoryServiceProvider>
              </DocflowServiceProvider>
            )}
          </Route>

          <Route path="/DocFlow/expedientes/:id/historial">
            {() => (
              <DocflowServiceProvider>
                <DirectoryServiceProvider>
                  <ProtectedRoute requiredPath="/DocFlow/expedientes">
                    <InstanceHistory />
                  </ProtectedRoute>
                </DirectoryServiceProvider>
              </DocflowServiceProvider>
            )}
          </Route>

          <Route path="/DocFlow/expedientes/:id">
            {() => (
              <DocflowServiceProvider>
                <DirectoryServiceProvider>
                  <ProtectedRoute requiredPath="/DocFlow/expedientes">
                    <InstanceDetail />
                  </ProtectedRoute>
                </DirectoryServiceProvider>
              </DocflowServiceProvider>
            )}
          </Route>

          <Route path="/DocFlow/expedientes">
            {() => (
              <DocflowServiceProvider>
                <DirectoryServiceProvider>
                  <ProtectedRoute requiredPath="/DocFlow/expedientes">
                    <InstancesList />
                  </ProtectedRoute>
                </DirectoryServiceProvider>
              </DocflowServiceProvider>
            )}
          </Route>

          <Route path="/DocFlow/procesos/:id/expedientes">
            {() => (
              <DocflowServiceProvider>
                <DirectoryServiceProvider>
                  <ProtectedRoute requiredPath="/DocFlow/procesos">
                    <ProcessInstances />
                  </ProtectedRoute>
                </DirectoryServiceProvider>
              </DocflowServiceProvider>
            )}
          </Route>

          <Route path="/DocFlow/procesos">
            {() => (
              <DocflowServiceProvider>
                <DirectoryServiceProvider>
                  <ProtectedRoute requiredPath="/DocFlow/procesos">
                    <Processes />
                  </ProtectedRoute>
                </DirectoryServiceProvider>
              </DocflowServiceProvider>
            )}
          </Route>

          <Route path="/DocFlow/busqueda">
            {() => (
              <DocflowServiceProvider>
                <DirectoryServiceProvider>
                  <ProtectedRoute requiredPath="/DocFlow/expedientes">
                    <GeneralSearch />
                  </ProtectedRoute>
                </DirectoryServiceProvider>
              </DocflowServiceProvider>
            )}
          </Route>

          <Route path="/DocFlow/auditoria">
            {() => (
              <DocflowServiceProvider>
                <DirectoryServiceProvider>
                  <ProtectedRoute requiredPath="/DocFlow/auditoria">
                    <Audit />
                  </ProtectedRoute>
                </DirectoryServiceProvider>
              </DocflowServiceProvider>
            )}
          </Route>

          <Route path="/DocFlow/buscar-expedientes">
            {() => (
              <DocflowServiceProvider>
                <DirectoryServiceProvider>
                  <ProtectedRoute requiredPath="/DocFlow/buscar-expedientes">
                    <SearchInstances />
                  </ProtectedRoute>
                </DirectoryServiceProvider>
              </DocflowServiceProvider>
            )}
          </Route>

          <Route path="/DocFlow/campos-dinamicos">
            {() => (
              <DocflowServiceProvider>
                <DirectoryServiceProvider>
                  <ProtectedRoute requiredPath="/DocFlow/procesos">
                    <DynamicFields />
                  </ProtectedRoute>
                </DirectoryServiceProvider>
              </DocflowServiceProvider>
            )}
          </Route>


          {/* ===== 404 (siempre al final) ===== */}
          <Route path="/:rest*" component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

// ============================================
// App Principal
// ============================================

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <AppRouter />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
