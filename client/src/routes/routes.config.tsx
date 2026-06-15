import { lazy, ComponentType } from "react";

export interface RouteConfig {
  path: string;
  component: ComponentType<any>;
  requiredPath?: string;
  requiredRoles?: string[];
  isDocFlow?: boolean;
}

// ============================================
// CODE SPLITTING - Lazy Loading de Páginas
// ============================================

// Dashboard
const Dashboard = lazy(() => import("@/pages/Dashboard"));

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
const PersonnelActionTypesPage = lazy(() => import("@/pages/PersonnelActionTypes"));
const ContractRequestPage = lazy(() => import("@/pages/ContractRequest"));
const ScheduleChangePlansPage = lazy(() => import("@/pages/ScheduleChangePlansPage"));
const CertificationFinancePage = lazy(() => import("@/pages/CertificationFinance"));
const EmployeeSchedulesPage = lazy(() => import("@/pages/EmployeeSchedules"));
const PermissionTypesPage = lazy(() => import("@/pages/PermissionTypes"));
const ApprovalsMedicalPermissionsPage = lazy(() => import("@/pages/ApprovalsMedicalPermissions"));
const ApprovalsPermissionsPage = lazy(() => import("@/pages/ApprovalsPermissions"));
const JobActivitiesPage = lazy(() => import("@/pages/JobActivities"));
const ReferenceTypesPage = lazy(() => import("@/pages/ReferenceTypes"));
const AcademicLadderPage = lazy(() => import("@/pages/AcademicLadder"));
const HolidaysPage = lazy(() => import("@/pages/Holidays"));
const FilesUploadPage = lazy(() => import("@/pages/FilesUploadPage"));
const DepartmentAuthoritiesPage = lazy(() => import("@/pages/DepartmentAuthorities"));

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

// Reportes v2 — sources del usuario
const EmployeesByDepartmentReportPage = lazy(() => import("@/pages/reports/EmployeesByDepartmentReport"));
const DepartmentContractSummaryReportPage = lazy(() => import("@/pages/reports/DepartmentContractSummaryReport"));
const ScheduleContractSummaryReportPage = lazy(() => import("@/pages/reports/ScheduleContractSummaryReport"));

// Reportes v2 — AttendanceCalculations
const LatenessReportPage = lazy(() => import("@/pages/reports/LatenessReport"));
const OvertimeReportPage = lazy(() => import("@/pages/reports/OvertimeReport"));
const AttendanceCrossReportPage = lazy(() => import("@/pages/reports/AttendanceCrossReport"));

// Reportes v2 — Gestión RH
const ContractsReportPage = lazy(() => import("@/pages/reports/ContractsReport"));
const ActiveContractsReportPage = lazy(() => import("@/pages/reports/ActiveContractsReport"));
const PersonnelActionsReportPage = lazy(() => import("@/pages/reports/PersonnelActionsReport"));
const ActivePersonnelActionsReportPage = lazy(() => import("@/pages/reports/ActivePersonnelActionsReport"));
const EmployeeHistoryReportPage = lazy(() => import("@/pages/reports/EmployeeHistoryReport"));
const GrantedPermissionsReportPage = lazy(() => import("@/pages/reports/GrantedPermissionsReport"));
const ContractRequestsReportPage = lazy(() => import("@/pages/reports/ContractRequestsReport"));
const CertificationsReportPage = lazy(() => import("@/pages/reports/CertificationsReport"));

// Reportes v2 — Guardias
const GuardShiftPlanningReportPage = lazy(() => import("@/pages/reports/GuardShiftPlanningReport"));
const GuardLocationCoverageReportPage = lazy(() => import("@/pages/reports/GuardLocationCoverageReport"));
const GuardShiftChangesReportPage = lazy(() => import("@/pages/reports/GuardShiftChangesReport"));
const GuardGroupRosterReportPage = lazy(() => import("@/pages/reports/GuardGroupRosterReport"));
const GuardScheduleMatrixReportPage = lazy(() => import("@/pages/reports/GuardScheduleMatrixReport"));

// Acciones de Personal
const PersonnelActionsPage = lazy(() => import("@/pages/PersonnelActions"));
const PersonnelActionDetailPage = lazy(() => import("@/pages/PersonnelActionDetail"));

// Parámetros RR.HH. y Guardias
const HrParametersPage = lazy(() => import("@/pages/HrParametersPage"));
const GuardParametersPage = lazy(() => import("@/pages/guards/GuardParametersPage"));

// Módulo: Guardias Rotativos
const GuardDashboardPage = lazy(() => import("@/pages/guards/GuardDashboard"));
const GuardServiceLocationsPage = lazy(() => import("@/pages/guards/GuardServiceLocations"));
const GuardRotationGroupsPage = lazy(() => import("@/pages/guards/GuardRotationGroups"));
const RotationPatternsPage = lazy(() => import("@/pages/guards/RotationPatterns"));
const GuardCoverageRequirementsPage = lazy(() => import("@/pages/guards/GuardCoverageRequirements"));
const GuardShiftPlanningPage = lazy(() => import("@/pages/guards/GuardShiftPlanning"));
const GuardShiftChangesPage = lazy(() => import("@/pages/guards/GuardShiftChanges"));
const EmployeeAvailabilityPage = lazy(() => import("@/pages/guards/EmployeeAvailability"));
const GuardLocationRotationPage = lazy(() => import("@/pages/guards/GuardLocationRotation"));
const GuardEmployeeSpecialRulesPage = lazy(() => import("@/pages/guards/GuardEmployeeSpecialRules"));
const GuardVacationPlansPage = lazy(() => import("@/pages/guards/GuardVacationPlans"));
const GuardVacationRequestsPage = lazy(() => import("@/pages/guards/GuardVacationRequests"));
const GuardVacationApprovalsPage = lazy(() => import("@/pages/guards/GuardVacationApprovals"));

// Detalle de Contrato
const ContractDetailPage = lazy(() => import("@/pages/ContractDetail"));

// Administración de AD y otros
const AzureManagementPage = lazy(() => import("@/pages/admin/AzureManagement"));
const LocalADManagementPage = lazy(() => import("@/pages/admin/LocalADManagement"));
const JobexecutionPage = lazy(() => import("@/pages/admin/Jobexecution"));
const EmployeeProvisioningPage = lazy(() => import("@/pages/admin/EmployeeProvisioning"));
const StudentProvisioningPage = lazy(() => import("@/pages/admin/academic/StudentProvisioning"));
const ActiveSessionsPage = lazy(() => import("@/pages/admin/ActiveSessions"));

// Páginas de Docflow
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
// CONFIGURACIÓN DE RUTAS
// ============================================

export const routes: RouteConfig[] = [
  // ----- RUTAS PRINCIPALES -----
  {
    path: "/",
    component: Dashboard
  },
  {
    path: "/perfil",
    component: PersonDetail
  },
  {
    path: "/profile/change-password",
    component: ChangePasswordPage
  },

  // ----- GESTIÓN DE PERSONAL / RR.HH. -----
  {
    path: "/people",
    component: PeoplePage,
    requiredPath: "/people"
  },
  {
    path: "/people/:id",
    component: PersonDetail,
    requiredPath: "/people"
  },
  {
    path: "/employees",
    component: EmployeesPage,
    requiredPath: "/employees"
  },
  {
    path: "/faculties",
    component: FacultiesPage,
    requiredPath: "/faculties"
  },
  {
    path: "/departments",
    component: DepartmentsPage,
    requiredPath: "/departments"
  },
  {
    path: "/department-authorities",
    component: DepartmentAuthoritiesPage,
    requiredPath: "/department-authorities"
  },

  // ----- ACCIONES DE PERSONAL -----
  {
    path: "/personnel-actions",
    component: PersonnelActionsPage,
    requiredPath: "/personnel-actions"
  },
  {
    path: "/personnel-actions/:id",
    component: PersonnelActionDetailPage,
    requiredPath: "/personnel-actions"
  },

  // ----- CONTRATOS Y PERMISOS -----
  {
    path: "/contracts",
    component: ContractsPage,
    requiredPath: "/contracts"
  },
  {
    path: "/contracts/:id",
    component: ContractDetailPage,
    requiredPath: "/contracts"
  },
  {
    path: "/contractType",
    component: ContractTypePage,
    requiredPath: "/contractType"
  },
  {
    path: "/personnelActionTypes",
    component: PersonnelActionTypesPage,
    requiredPath: "/personnelActionTypes"
  },
  {
    path: "/contractRequest",
    component: ContractRequestPage,
    requiredPath: "/contractRequest"
  },
  {
    path: "/permissions",
    component: PermissionsPage,
    requiredPath: "/permissions"
  },
  {
    path: "/permissionTypes",
    component: PermissionTypesPage,
    requiredPath: "/permissionTypes"
  },
  {
    path: "/ApprovalsMedicalPermissions",
    component: ApprovalsMedicalPermissionsPage,
    requiredPath: "/ApprovalsMedicalPermissions"
  },
  {
    path: "/ApprovalsPermissions",
    component: ApprovalsPermissionsPage,
    requiredPath: "/ApprovalsPermissions"
  },

  // ----- ASISTENCIA Y HORARIOS -----
  {
    path: "/attendance",
    component: AttendancePage,
    requiredPath: "/attendance"
  },
  {
    path: "/schedules",
    component: SchedulesPage,
    requiredPath: "/schedules"
  },
  {
    path: "/shedulerAssig",
    component: EmployeeSchedulesPage,
    requiredPath: "/shedulerAssig"
  },
  {
    path: "/shedulerChangePlans",
    component: ScheduleChangePlansPage,
    requiredPath: "/shedulerChangePlans"
  },
  {
    path: "/overtime",
    component: OvertimePage,
    requiredPath: "/overtime"
  },
  {
    path: "/justifications",
    component: JustificationPage,
    requiredPath: "/justifications"
  },

  // ----- VACACIONES / NÓMINA / FINANZAS -----
  {
    path: "/vacations",
    component: VacationsPage,
    requiredPath: "/vacations"
  },
  {
    path: "/holidays",
    component: HolidaysPage,
    requiredPath: "/holidays"
  },
  {
    path: "/payroll",
    component: PayrollPage,
    requiredPath: "/payroll"
  },
  {
    path: "/certFinance",
    component: CertificationFinancePage,
    requiredPath: "/certFinance"
  },

  // ----- REPORTES CLÁSICOS -----
  {
    path: "/reports",
    component: ReportsPage,
    requiredPath: "/reports"
  },
  {
    path: "/reports/employees",
    component: EmployeesReportPage,
    requiredPath: "/reports/employees"
  },
  {
    path: "/reports/attendance",
    component: AttendanceReportPage,
    requiredPath: "/reports/attendance"
  },
  {
    path: "/reports/departments",
    component: DepartmentsReportPage,
    requiredPath: "/reports/departments"
  },
  {
    path: "/reports/attedancesumary",
    component: AttendanceSumaryReportPage,
    requiredPath: "/reports/attedancesumary"
  },
  {
    path: "/reports/audit",
    component: ReportAuditPage,
    requiredPath: "/reports/audit"
  },

  // ----- REPORTES V2 — USUARIO Y CALENDARIO -----
  {
    path: "/reports/employees-by-department",
    component: EmployeesByDepartmentReportPage,
    requiredPath: "/reports/employees-by-department"
  },
  {
    path: "/reports/department-contract-summary",
    component: DepartmentContractSummaryReportPage,
    requiredPath: "/reports/department-contract-summary"
  },
  {
    path: "/reports/schedule-contract-summary",
    component: ScheduleContractSummaryReportPage,
    requiredPath: "/reports/schedule-contract-summary"
  },

  // ----- REPORTES V2 — CÁLCULOS DE ASISTENCIA -----
  {
    path: "/reports/lateness",
    component: LatenessReportPage,
    requiredPath: "/reports/lateness"
  },
  {
    path: "/reports/overtime",
    component: OvertimeReportPage,
    requiredPath: "/reports/overtime"
  },
  {
    path: "/reports/attendance-cross",
    component: AttendanceCrossReportPage,
    requiredPath: "/reports/attendance-cross"
  },

  // ----- REPORTES V2 — GESTIÓN RH -----
  {
    path: "/reports/contracts",
    component: ContractsReportPage,
    requiredPath: "/reports/contracts"
  },
  {
    path: "/reports/active-contracts",
    component: ActiveContractsReportPage,
    requiredPath: "/reports/active-contracts"
  },
  {
    path: "/reports/personnel-actions",
    component: PersonnelActionsReportPage,
    requiredPath: "/reports/personnel-actions"
  },
  {
    path: "/reports/active-personnel-actions",
    component: ActivePersonnelActionsReportPage,
    requiredPath: "/reports/active-personnel-actions"
  },
  {
    path: "/reports/employee-history",
    component: EmployeeHistoryReportPage,
    requiredPath: "/reports/employee-history"
  },
  {
    path: "/reports/granted-permissions",
    component: GrantedPermissionsReportPage,
    requiredPath: "/reports/granted-permissions"
  },
  {
    path: "/reports/contract-requests",
    component: ContractRequestsReportPage,
    requiredPath: "/reports/contract-requests"
  },
  {
    path: "/reports/certifications",
    component: CertificationsReportPage,
    requiredPath: "/reports/certifications"
  },

  // ----- REPORTES GUARDIAS -----
  {
    path: "/reports/guard-shift-planning",
    component: GuardShiftPlanningReportPage,
    requiredPath: "/reports/guard-shift-planning"
  },
  {
    path: "/reports/guard-location-coverage",
    component: GuardLocationCoverageReportPage,
    requiredPath: "/reports/guard-location-coverage"
  },
  {
    path: "/reports/guard-shift-changes",
    component: GuardShiftChangesReportPage,
    requiredPath: "/reports/guard-shift-changes"
  },
  {
    path: "/reports/guard-group-roster",
    component: GuardGroupRosterReportPage,
    requiredPath: "/reports/guard-group-roster"
  },
  {
    path: "/reports/guard-schedule-matrix",
    component: GuardScheduleMatrixReportPage,
    requiredPath: "/reports/guard-schedule-matrix"
  },

  // ----- OTROS PARÁMETROS -----
  {
    path: "/jobActivities",
    component: JobActivitiesPage,
    requiredPath: "/jobActivities"
  },
  {
    path: "/referenceTypes",
    component: ReferenceTypesPage,
    requiredPath: "/referenceTypes"
  },
  {
    path: "/hr-parameters",
    component: HrParametersPage,
    requiredPath: "/hr-parameters"
  },
  {
    path: "/academic-ladder",
    component: AcademicLadderPage,
    requiredPath: "/academic-ladder"
  },
  {
    path: "/FilesUploadPage",
    component: FilesUploadPage,
    requiredPath: "/FilesUploadPage"
  },

  // ----- ADMINISTRACIÓN -----
  {
    path: "/admin/users",
    component: UsersPage,
    requiredPath: "/admin/users"
  },
  {
    path: "/admin/roles",
    component: RolesPage,
    requiredPath: "/admin/roles"
  },
  {
    path: "/admin/user-roles",
    component: UserRolesPage,
    requiredPath: "/admin/user-roles"
  },
  {
    path: "/admin/menu-items",
    component: MenuItemsPage,
    requiredPath: "/admin/menu-items"
  },
  {
    path: "/admin/role-menu-items",
    component: RoleMenuItemsPage,
    requiredPath: "/admin/role-menu-items"
  },
  {
    path: "/admin/AzureMagnament",
    component: AzureManagementPage,
    requiredPath: "/admin/AzureMagnament"
  },
  {
    path: "/admin/local-ad",
    component: LocalADManagementPage,
    requiredPath: "/admin/local-ad"
  },
  {
    path: "/admin/Jobexecution",
    component: JobexecutionPage,
    requiredPath: "/admin/Jobexecution"
  },
  {
    path: "/admin/employee-provisioning",
    component: EmployeeProvisioningPage,
    requiredPath: "/admin/employee-provisioning"
  },
  {
    path: "/admin/academic/student-provisioning",
    component: StudentProvisioningPage,
    requiredPath: "/admin/academic/student-provisioning"
  },
  {
    path: "/admin/active-sessions",
    component: ActiveSessionsPage,
    requiredPath: "/admin/active-sessions"
  },

  // ----- MÓDULO: GUARDIAS ROTATIVOS -----
  {
    path: "/guards",
    component: GuardDashboardPage,
    requiredPath: "/guards"
  },
  {
    path: "/guards/parameters",
    component: GuardParametersPage,
    requiredPath: "/guards/parameters"
  },
  {
    path: "/guards/locations",
    component: GuardServiceLocationsPage,
    requiredPath: "/guards/locations"
  },
  {
    path: "/guards/groups",
    component: GuardRotationGroupsPage,
    requiredPath: "/guards/groups"
  },
  {
    path: "/guards/patterns",
    component: RotationPatternsPage,
    requiredPath: "/guards/patterns"
  },
  {
    path: "/guards/coverage",
    component: GuardCoverageRequirementsPage,
    requiredPath: "/guards/coverage"
  },
  {
    path: "/guards/planning",
    component: GuardShiftPlanningPage,
    requiredPath: "/guards/planning"
  },
  {
    path: "/guards/changes",
    component: GuardShiftChangesPage,
    requiredPath: "/guards/changes"
  },
  {
    path: "/guards/availability",
    component: EmployeeAvailabilityPage,
    requiredPath: "/guards/availability"
  },
  {
    path: "/guards/location-rotation",
    component: GuardLocationRotationPage,
    requiredPath: "/guards/location-rotation"
  },
  {
    path: "/guards/special-rules",
    component: GuardEmployeeSpecialRulesPage,
    requiredPath: "/guards/special-rules"
  },
  {
    path: "/guards/vacation-plans",
    component: GuardVacationPlansPage,
    requiredPath: "/guards/vacation-plans"
  },
  {
    path: "/guards/vacation-requests",
    component: GuardVacationRequestsPage,
    requiredPath: "/guards/vacation-requests"
  },
  {
    path: "/guards/vacation-approvals",
    component: GuardVacationApprovalsPage,
    requiredPath: "/guards/vacation-approvals"
  },

  // ----- MÓDULO: DOCFLOW -----
  {
    path: "/DocFlow/DocFlowDashboard",
    component: DocFlowDashboard,
    requiredPath: "/DocFlow/DocFlowDashboard",
    isDocFlow: true
  },
  {
    path: "/DocFlow/expedientes/nuevo",
    component: NewInstance,
    requiredPath: "/DocFlow/expedientes",
    isDocFlow: true
  },
  {
    path: "/DocFlow/expedientes/:id/historial",
    component: InstanceHistory,
    requiredPath: "/DocFlow/expedientes",
    isDocFlow: true
  },
  {
    path: "/DocFlow/expedientes/:id",
    component: InstanceDetail,
    requiredPath: "/DocFlow/expedientes",
    isDocFlow: true
  },
  {
    path: "/DocFlow/expedientes",
    component: InstancesList,
    requiredPath: "/DocFlow/expedientes",
    isDocFlow: true
  },
  {
    path: "/DocFlow/procesos/:id/expedientes",
    component: ProcessInstances,
    requiredPath: "/DocFlow/procesos",
    isDocFlow: true
  },
  {
    path: "/DocFlow/procesos",
    component: Processes,
    requiredPath: "/DocFlow/procesos",
    isDocFlow: true
  },
  {
    path: "/DocFlow/busqueda",
    component: GeneralSearch,
    requiredPath: "/DocFlow/expedientes",
    isDocFlow: true
  },
  {
    path: "/DocFlow/auditoria",
    component: Audit,
    requiredPath: "/DocFlow/auditoria",
    isDocFlow: true
  },
  {
    path: "/DocFlow/buscar-expedientes",
    component: SearchInstances,
    requiredPath: "/DocFlow/buscar-expedientes",
    isDocFlow: true
  },
  {
    path: "/DocFlow/campos-dinamicos",
    component: DynamicFields,
    requiredPath: "/DocFlow/procesos",
    isDocFlow: true
  }
];
