import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

function Router() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Switch>
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
        <Route path="/justification" component={JustificationPage} />
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