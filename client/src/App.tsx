// src/App.tsx
import { Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
// Si usas shadcn/ui, es mejor este provider:
import { TooltipProvider } from "@/components/ui/tooltip";
// import { TooltipProvider } from "@radix-ui/react-tooltip"; // Alternativa directa a Radix

import Layout from "@/components/Layout";
import LoginPage from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import PeoplePage from "@/pages/People";
import EmployeesPage from "@/pages/Employees";
import FacultiesPage from "@/pages/Faculties";
import DepartmentsPage from "@/pages/Departments";
import ContractsPage from "@/pages/Contracts";
import PermissionsPage from "@/pages/Permissions";
import VacationsPage from "@/pages/Vacations";
import AttendancePage from "@/pages/Attendance";
import PayrollPage from "@/pages/Payroll";
import SchedulesPage from "@/pages/Schedules";
import OvertimePage from "@/pages/Overtime";
import ReportsPage from "@/pages/Reports";
import NotFound from "@/pages/not-found";
import PersonDetail from "@/pages/PersonDetail";
import JustificationPage from "@/pages/Justifications";
import ContractTypePage from "@/pages/ContractType";
import ContractRequestPage from "@/pages/ContractRequest";
import CertificationFinancePage from "@/pages/CertificationFinance";
import EmployeeSchedulesPage from "@/pages/EmployeeSchedules";
import PermissionTypesPage from "@/pages/PermissionTypes";
import ApprovalsPermissionsPage from "@/pages/ApprovalsPermissions";
import JobActivitiesPage from "@/pages/JobActivities";
import ReferenceTypesPage from "@/pages/ReferenceTypes";
import HolidaysPage from "@/pages/Holidays";
import FilesUploadPage from "@/pages/FilesUploadPage";

import UsersPage from "@/pages/admin/Users";
import RolesPage from "@/pages/admin/Roles";
import UserRolesPage from "@/pages/admin/UserRoles";
import MenuItemsPage from "@/pages/admin/MenuItems";
import RoleMenuItemsPage from "@/pages/admin/RoleMenuItems";
import ChangePasswordPage from "@/pages/profile/ChangePassword";
import EmployeesReportPage from "@/pages/reports/EmployeesReport";
import AttendanceReportPage from "@/pages/reports/AttendanceReport";
import DepartmentsReportPage from "@/pages/reports/DepartmentsReport";
import ReportAuditPage from "@/pages/reports/ReportAudit";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "react-error-boundary";

// --- Fallbacks simples ---
function ErrorFallback() {
  return (
    <div style={{ padding: 16 }}>
      Ocurrió un error inesperado. Recarga la página o intenta de nuevo.
    </div>
  );
}

function LoadingFallback() {
  return <div style={{ padding: 16 }}>Cargando…</div>;
}

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

export default function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            {/* Con wouter no necesitas BrowserRouter */}
            <AppRouter />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
