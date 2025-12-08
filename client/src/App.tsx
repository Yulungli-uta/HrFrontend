// src/App.tsx
import { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "react-error-boundary";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Componentes que se cargan inmediatamente (críticos)
import Layout from "@/components/Layout";
import LoginPage from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";

// ============================================
// CODE SPLITTING - Lazy Loading de Páginas
// ============================================

// Páginas principales - Se cargan bajo demanda
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
const CertificationFinancePage = lazy(() => import("@/pages/CertificationFinance"));
const EmployeeSchedulesPage = lazy(() => import("@/pages/EmployeeSchedules"));
const PermissionTypesPage = lazy(() => import("@/pages/PermissionTypes"));
const ApprovalsPermissionsPage = lazy(() => import("@/pages/ApprovalsPermissions"));
const JobActivitiesPage = lazy(() => import("@/pages/JobActivities"));
const ReferenceTypesPage = lazy(() => import("@/pages/ReferenceTypes"));
const HolidaysPage = lazy(() => import("@/pages/Holidays"));
const FilesUploadPage = lazy(() => import("@/pages/FilesUploadPage"));

// Páginas de administración
const UsersPage = lazy(() => import("@/pages/admin/Users"));
const RolesPage = lazy(() => import("@/pages/admin/Roles"));
const UserRolesPage = lazy(() => import("@/pages/admin/UserRoles"));
const MenuItemsPage = lazy(() => import("@/pages/admin/MenuItems"));
const RoleMenuItemsPage = lazy(() => import("@/pages/admin/RoleMenuItems"));
const ChangePasswordPage = lazy(() => import("@/pages/profile/ChangePassword"));

// Páginas de reportes
const EmployeesReportPage = lazy(() => import("@/pages/reports/EmployeesReport"));
const AttendanceReportPage = lazy(() => import("@/pages/reports/AttendanceReport"));
const DepartmentsReportPage = lazy(() => import("@/pages/reports/DepartmentsReport"));
const AttendanceSumaryReportPage = lazy(() => import("@/pages/reports/AttendanceSumaryReport"));
const ReportAuditPage = lazy(() => import("@/pages/reports/ReportAudit"));

// ============================================
// Fallbacks
// ============================================

function ErrorFallback() {
  return (
    <div style={{ padding: 16 }}>
      Ocurrió un error inesperado. Recarga la página o intenta de nuevo.
    </div>
  );
}

function LoadingFallback() {
  return (
    <div style={{ 
      padding: 16, 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      minHeight: '200px'
    }}>
      <div>Cargando...</div>
    </div>
  );
}

// 🆕 Pantalla de carga inicial
function InitialLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Cargando aplicación...</p>
      </div>
    </div>
  );
}

// ============================================
// Router
// ============================================

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  // 🆕 Mostrar pantalla de carga mientras se verifica la autenticación
  if (isLoading) {
    return <InitialLoadingScreen />;
  }

  // if (!isAuthenticated) {
  //   return (
  //     <Suspense fallback={<LoadingFallback />}>
  //       <LoginPage />
  //     </Suspense>
  //   );
  // }

  // Si no está autenticado, mostrar solo login
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/:rest*">
          {() => {
            // Redirigir cualquier otra ruta a /login
            return <Redirect to="/login" />;
          }}
        </Route>
      </Switch>
    );
  }
  return (
    <Layout>
      <Suspense fallback={<LoadingFallback />}>
        <Switch>
          {/* ========================================== */}
          {/* RUTAS PÚBLICAS (para usuarios autenticados) */}
          {/* ========================================== */}
          <Route path="/" component={Dashboard} />
          <Route path="/profile/change-password" component={ChangePasswordPage} />

          {/* ========================================== */}
          {/* RUTAS PROTEGIDAS - Gestión de Personal */}
          {/* ========================================== */}
          
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

          {/* ========================================== */}
          {/* RUTAS PROTEGIDAS - Contratos y Permisos */}
          {/* ========================================== */}

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

          <Route path="/ApprovalsPermissions">
            {() => (
              <ProtectedRoute requiredPath="/ApprovalsPermissions">
                <ApprovalsPermissionsPage />
              </ProtectedRoute>
            )}
          </Route>

          {/* ========================================== */}
          {/* RUTAS PROTEGIDAS - Asistencia y Horarios */}
          {/* ========================================== */}

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

          {/* ========================================== */}
          {/* RUTAS PROTEGIDAS - Vacaciones y Nómina */}
          {/* ========================================== */}

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
              <ProtectedRoute requiredPath="/payroll" requiredRoles={["Admin", "PayrollManager"]}>
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

          {/* ========================================== */}
          {/* RUTAS PROTEGIDAS - Reportes */}
          {/* ========================================== */}

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

          {/* ========================================== */}
          {/* RUTAS PROTEGIDAS - Otros */}
          {/* ========================================== */}

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

          {/* ========================================== */}
          {/* RUTAS DE ADMINISTRACIÓN - Solo Admin */}
          {/* ========================================== */}

          <Route path="/admin/users">
            {() => (
              <ProtectedRoute requiredPath="/admin/users" requiredRoles={["Admin"]}>
                <UsersPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/admin/roles">
            {() => (
              <ProtectedRoute requiredPath="/admin/roles" requiredRoles={["Admin"]}>
                <RolesPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/admin/user-roles">
            {() => (
              <ProtectedRoute requiredPath="/admin/user-roles" requiredRoles={["Admin"]}>
                <UserRolesPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/admin/menu-items">
            {() => (
              <ProtectedRoute requiredPath="/admin/menu-items" requiredRoles={["Admin"]}>
                <MenuItemsPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/admin/role-menu-items">
            {() => (
              <ProtectedRoute requiredPath="/admin/role-menu-items" requiredRoles={["Admin"]}>
                <RoleMenuItemsPage />
              </ProtectedRoute>
            )}
          </Route>

          {/* Ruta de "no encontrado" */}
          <Route component={NotFound} />
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
    <ErrorBoundary fallback={<ErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <AppRouter />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
