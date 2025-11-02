// src/App.tsx (unificado SIN cambiar nombres)
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
// import { TooltipProvider } from "@/components/ui/tooltip";
import { TooltipProvider } from "@radix-ui/react-tooltip";

import Layout from "@/components/Layout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Páginas base
import LoginPage from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";

// Personas / Empleados
import PeoplePage from "@/pages/People";
import PersonDetail from "@/pages/PersonDetail";
import EmployeesPage from "@/pages/Employees";

// Organización (de ambos archivos)
import FacultiesPage from "@/pages/Faculties";
import DepartmentsPage from "@/pages/Departments";
import ContractTypePage from "@/pages/ContractType";
import JobActivitiesPage from "@/pages/JobActivities";
import ReferenceTypesPage from "@/pages/ReferenceTypes";

// Gestión RH (de ambos archivos)
import ContractsPage from "@/pages/Contracts";
import PermissionsPage from "@/pages/Permissions";
import PermissionTypesPage from "@/pages/PermissionTypes";
import VacationsPage from "@/pages/Vacations";
import AttendancePage from "@/pages/Attendance";
import PayrollPage from "@/pages/Payroll";
import SchedulesPage from "@/pages/Schedules";
import EmployeeSchedulesPage from "@/pages/EmployeeSchedules";
import OvertimePage from "@/pages/Overtime";
import ReportsPage from "@/pages/Reports";
import JustificationPage from "@/pages/Justifications";
import ApprovalsPage from "@/pages/ApprovalsPermissions";
import HolidaysPage from "@/pages/Holidays";

// Trámites / archivos / certificaciones
import FilesUploadPage from "@/pages/FilesUploadPage";
import ContractRequestPage from "@/pages/ContractRequest";
import CertificactionFinancePage from "@/pages/CertificationFinance";

// Admin (del primer archivo)
import UsersPage from "@/pages/admin/Users";
import RolesPage from "@/pages/admin/Roles";
import UserRolesPage from "@/pages/admin/UserRoles";
import MenuItemsPage from "@/pages/admin/MenuItems";
import RoleMenuItemsPage from "@/pages/admin/RoleMenuItems";

// Perfil
import ChangePasswordPage from "@/pages/profile/ChangePassword";

// import Office365Callback from '@/components/Office365Callback';

function Router() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Switch>
        {/* Dashboard */}
        <Route path="/" component={Dashboard} />

        {/* Personas / Empleados */}
        <Route path="/people" component={PeoplePage} />
        <Route path="/people/:id" component={PersonDetail} />
        <Route path="/employees" component={EmployeesPage} />

        {/* Organización */}
        <Route path="/faculties" component={FacultiesPage} />
        <Route path="/departments" component={DepartmentsPage} />
        <Route path="/contractType" component={ContractTypePage} />
        <Route path="/jobActivities" component={JobActivitiesPage} />
        <Route path="/referenceTypes" component={ReferenceTypesPage} />

        {/* Gestión RH */}
        <Route path="/contracts" component={ContractsPage} />
        <Route path="/permissions" component={PermissionsPage} />
        <Route path="/permissionTypes" component={PermissionTypesPage} />
        <Route path="/vacations" component={VacationsPage} />
        <Route path="/attendance" component={AttendancePage} />
        <Route path="/payroll" component={PayrollPage} />
        <Route path="/schedules" component={SchedulesPage} />
        <Route path="/overtime" component={OvertimePage} />
        <Route path="/reports" component={ReportsPage} />

        {/* Justificaciones (ambas rutas existentes) */}
        <Route path="/justification" component={JustificationPage} />
        <Route path="/justifications" component={JustificationPage} />

        {/* Aprobaciones / Feriados */}
        <Route path="/ApprovalsPermissions" component={ApprovalsPage} />
        <Route path="/holidays" component={HolidaysPage} />

        {/* Trámites / Archivos / Certificaciones */}
        <Route path="/FilesUploadPage" component={FilesUploadPage} />
        <Route path="/contractRequest" component={ContractRequestPage} />
        <Route path="/certFinance" component={CertificactionFinancePage} />

        {/* Asignación de horarios de empleado */}
        <Route path="/shedulerAssig" component={EmployeeSchedulesPage} />

        {/* Admin */}
        <Route path="/admin/users" component={UsersPage} />
        <Route path="/admin/roles" component={RolesPage} />
        <Route path="/admin/user-roles" component={UserRolesPage} />
        <Route path="/admin/menu-items" component={MenuItemsPage} />
        <Route path="/admin/role-menu-items" component={RoleMenuItemsPage} />

        {/* Perfil */}
        <Route path="/profile/change-password" component={ChangePasswordPage} />

        {/* OAuth callback (si se habilita) */}
        {/* <Route path="/auth/office365/callback" component={Office365Callback} /> */}

        {/* 404 */}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
