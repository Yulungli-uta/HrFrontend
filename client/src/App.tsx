// src/App.tsx
import { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "react-error-boundary";

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

// ============================================
// Router
// ============================================

function AppRouter() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <Layout>
      <Suspense fallback={<LoadingFallback />}>
        <Switch>
        {/* Rutas principales */}
        <Route path="/" component={Dashboard} />
        <Route path="/people" component={PeoplePage} />
        <Route path="/people/:id" component={PersonDetail} />
        <Route path="/employees" component={EmployeesPage} />
        <Route path="/faculties" component={FacultiesPage} />
        <Route path="/departments" component={DepartmentsPage} />
        <Route path="/contracts" component={ContractsPage} />
        <Route path="/permissions" component={PermissionsPage} />
        <Route path="/vacations" component={VacationsPage} />
        <Route path="/attendance" component={AttendancePage} />
        <Route path="/payroll" component={PayrollPage} />
        <Route path="/schedules" component={SchedulesPage} />
        <Route path="/overtime" component={OvertimePage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/justifications" component={JustificationPage} />
        <Route path="/contractType" component={ContractTypePage} />
        <Route path="/contractRequest" component={ContractRequestPage} />
        <Route path="/certFinance" component={CertificationFinancePage} />
        <Route path="/shedulerAssig" component={EmployeeSchedulesPage} />
        <Route path="/permissionTypes" component={PermissionTypesPage} />
        <Route path="/ApprovalsPermissions" component={ApprovalsPermissionsPage} />
        <Route path="/jobActivities" component={JobActivitiesPage} />
        <Route path="/referenceTypes" component={ReferenceTypesPage} />
        <Route path="/holidays" component={HolidaysPage} />
        <Route path="/FilesUploadPage" component={FilesUploadPage} />
        
        {/* Rutas de Administracion */}
        <Route path="/admin/users" component={UsersPage} />
        <Route path="/admin/roles" component={RolesPage} />
        <Route path="/admin/user-roles" component={UserRolesPage} />
        <Route path="/admin/menu-items" component={MenuItemsPage} />
        <Route path="/admin/role-menu-items" component={RoleMenuItemsPage} />
        <Route path="/profile/change-password" component={ChangePasswordPage} />
        
        {/* Rutas de Reportes */}
        <Route path="/reports/employees" component={EmployeesReportPage} />
        <Route path="/reports/attendance" component={AttendanceReportPage} />
        <Route path="/reports/departments" component={DepartmentsReportPage} />
        <Route path="/reports/audit" component={ReportAuditPage} />
        
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
