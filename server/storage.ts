import { 
  Person, Employee, Faculty, Department, Schedule, Contract, PermissionType, Permission, Vacation, AttendancePunch, Payroll, PayrollLine,
  Publication, FamilyMember, WorkExperience, Training, Book, EmergencyContact, CatastrophicIllness, BankAccount,
  InsertPerson, InsertEmployee, InsertFaculty, InsertDepartment, InsertSchedule, InsertContract, InsertPermissionType, InsertPermission, InsertVacation, InsertAttendancePunch, InsertPayroll, InsertPayrollLine,
  InsertPublication, InsertFamilyMember, InsertWorkExperience, InsertTraining, InsertBook, InsertEmergencyContact, InsertCatastrophicIllness, InsertBankAccount
} from "@shared/schema";

export interface IStorage {
  // People
  getPeople(): Promise<Person[]>;
  getPersonById(id: number): Promise<Person | null>;
  createPerson(person: InsertPerson): Promise<Person>;
  updatePerson(id: number, person: Partial<InsertPerson>): Promise<Person | null>;
  deletePerson(id: number): Promise<boolean>;

  // Employees
  getEmployees(): Promise<Employee[]>;
  getEmployeeById(id: number): Promise<Employee | null>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | null>;
  deleteEmployee(id: number): Promise<boolean>;

  // Faculties
  getFaculties(): Promise<Faculty[]>;
  getFacultyById(id: number): Promise<Faculty | null>;
  createFaculty(faculty: InsertFaculty): Promise<Faculty>;
  updateFaculty(id: number, faculty: Partial<InsertFaculty>): Promise<Faculty | null>;
  deleteFaculty(id: number): Promise<boolean>;

  // Departments
  getDepartments(): Promise<Department[]>;
  getDepartmentById(id: number): Promise<Department | null>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | null>;
  deleteDepartment(id: number): Promise<boolean>;

  // Schedules
  getSchedules(): Promise<Schedule[]>;
  getScheduleById(id: number): Promise<Schedule | null>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, schedule: Partial<InsertSchedule>): Promise<Schedule | null>;
  deleteSchedule(id: number): Promise<boolean>;

  // Contracts
  getContracts(): Promise<Contract[]>;
  getContractById(id: number): Promise<Contract | null>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract | null>;
  deleteContract(id: number): Promise<boolean>;

  // Permission Types
  getPermissionTypes(): Promise<PermissionType[]>;
  getPermissionTypeById(id: number): Promise<PermissionType | null>;
  createPermissionType(permissionType: InsertPermissionType): Promise<PermissionType>;
  updatePermissionType(id: number, permissionType: Partial<InsertPermissionType>): Promise<PermissionType | null>;
  deletePermissionType(id: number): Promise<boolean>;

  // Permissions
  getPermissions(): Promise<Permission[]>;
  getPermissionById(id: number): Promise<Permission | null>;
  createPermission(permission: InsertPermission): Promise<Permission>;
  updatePermission(id: number, permission: Partial<InsertPermission>): Promise<Permission | null>;
  deletePermission(id: number): Promise<boolean>;

  // Vacations
  getVacations(): Promise<Vacation[]>;
  getVacationById(id: number): Promise<Vacation | null>;
  createVacation(vacation: InsertVacation): Promise<Vacation>;
  updateVacation(id: number, vacation: Partial<InsertVacation>): Promise<Vacation | null>;
  deleteVacation(id: number): Promise<boolean>;

  // Attendance Punches
  getAttendancePunches(): Promise<AttendancePunch[]>;
  getAttendancePunchById(id: number): Promise<AttendancePunch | null>;
  createAttendancePunch(punch: InsertAttendancePunch): Promise<AttendancePunch>;
  updateAttendancePunch(id: number, punch: Partial<InsertAttendancePunch>): Promise<AttendancePunch | null>;
  deleteAttendancePunch(id: number): Promise<boolean>;

  // Payroll
  getPayrolls(): Promise<Payroll[]>;
  getPayrollById(id: number): Promise<Payroll | null>;
  createPayroll(payroll: InsertPayroll): Promise<Payroll>;
  updatePayroll(id: number, payroll: Partial<InsertPayroll>): Promise<Payroll | null>;
  deletePayroll(id: number): Promise<boolean>;

  // Payroll Lines
  getPayrollLines(): Promise<PayrollLine[]>;
  getPayrollLineById(id: number): Promise<PayrollLine | null>;
  createPayrollLine(payrollLine: InsertPayrollLine): Promise<PayrollLine>;
  updatePayrollLine(id: number, payrollLine: Partial<InsertPayrollLine>): Promise<PayrollLine | null>;
  deletePayrollLine(id: number): Promise<boolean>;

  // Publications
  getPublicationsByPersonId(personId: number): Promise<Publication[]>;
  createPublication(publication: InsertPublication): Promise<Publication>;
  updatePublication(id: number, publication: Partial<InsertPublication>): Promise<Publication | null>;
  deletePublication(id: number): Promise<boolean>;

  // Family Members
  getFamilyMembersByPersonId(personId: number): Promise<FamilyMember[]>;
  createFamilyMember(familyMember: InsertFamilyMember): Promise<FamilyMember>;
  updateFamilyMember(id: number, familyMember: Partial<InsertFamilyMember>): Promise<FamilyMember | null>;
  deleteFamilyMember(id: number): Promise<boolean>;

  // Work Experiences
  getWorkExperiencesByPersonId(personId: number): Promise<WorkExperience[]>;
  createWorkExperience(workExperience: InsertWorkExperience): Promise<WorkExperience>;
  updateWorkExperience(id: number, workExperience: Partial<InsertWorkExperience>): Promise<WorkExperience | null>;
  deleteWorkExperience(id: number): Promise<boolean>;

  // Trainings
  getTrainingsByPersonId(personId: number): Promise<Training[]>;
  createTraining(training: InsertTraining): Promise<Training>;
  updateTraining(id: number, training: Partial<InsertTraining>): Promise<Training | null>;
  deleteTraining(id: number): Promise<boolean>;

  // Books
  getBooksByPersonId(personId: number): Promise<Book[]>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: number, book: Partial<InsertBook>): Promise<Book | null>;
  deleteBook(id: number): Promise<boolean>;

  // Emergency Contacts
  getEmergencyContactsByPersonId(personId: number): Promise<EmergencyContact[]>;
  createEmergencyContact(emergencyContact: InsertEmergencyContact): Promise<EmergencyContact>;
  updateEmergencyContact(id: number, emergencyContact: Partial<InsertEmergencyContact>): Promise<EmergencyContact | null>;
  deleteEmergencyContact(id: number): Promise<boolean>;

  // Catastrophic Illnesses
  getCatastrophicIllnessesByPersonId(personId: number): Promise<CatastrophicIllness[]>;
  createCatastrophicIllness(catastrophicIllness: InsertCatastrophicIllness): Promise<CatastrophicIllness>;
  updateCatastrophicIllness(id: number, catastrophicIllness: Partial<InsertCatastrophicIllness>): Promise<CatastrophicIllness | null>;
  deleteCatastrophicIllness(id: number): Promise<boolean>;

  // Bank Accounts
  getBankAccountsByPersonId(personId: number): Promise<BankAccount[]>;
  createBankAccount(bankAccount: InsertBankAccount): Promise<BankAccount>;
  updateBankAccount(id: number, bankAccount: Partial<InsertBankAccount>): Promise<BankAccount | null>;
  deleteBankAccount(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private people: Person[] = [];
  private employees: Employee[] = [];
  private faculties: Faculty[] = [];
  private departments: Department[] = [];
  private schedules: Schedule[] = [];
  private contracts: Contract[] = [];
  private permissionTypes: PermissionType[] = [];
  private permissions: Permission[] = [];
  private vacations: Vacation[] = [];
  private attendancePunches: AttendancePunch[] = [];
  private payrolls: Payroll[] = [];
  private payrollLines: PayrollLine[] = [];
  private publications: Publication[] = [];
  private familyMembers: FamilyMember[] = [];
  private workExperiences: WorkExperience[] = [];
  private trainings: Training[] = [];
  private books: Book[] = [];
  private emergencyContacts: EmergencyContact[] = [];
  private catastrophicIllnesses: CatastrophicIllness[] = [];
  private bankAccounts: BankAccount[] = [];
  
  private nextId = 1;
  private getNextId() { return this.nextId++; }

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Sample People
    this.people = [
      { id: 1, firstName: "Henry", lastName: "Flores", idCard: "1802890176", email: "henry.flores@uta.edu.ec", phone: "0999999999", birthDate: "1985-06-15", sex: "M", isActive: true, gender: "Masculino", disability: null, address: "Ambato, Ecuador" },
      { id: 2, firstName: "Ana", lastName: "Vega", idCard: "1720012345", email: "ana.vega@uta.edu.ec", phone: "0988888888", birthDate: "1990-03-22", sex: "F", isActive: true, gender: "Femenino", disability: null, address: "Quito, Ecuador" },
      { id: 3, firstName: "Carlos", lastName: "Mendoza", idCard: "1713456789", email: "carlos.mendoza@uta.edu.ec", phone: "0977777777", birthDate: "1982-11-08", sex: "M", isActive: true, gender: "Masculino", disability: null, address: "Guayaquil, Ecuador" },
    ];

    // Sample Employees
    this.employees = [
      { id: 1, type: "Administrative_LOSEP", departmentId: 1, immediateBossId: null, hireDate: "2020-01-15", isActive: true },
      { id: 2, type: "Teacher_LOSE", departmentId: 1, immediateBossId: 1, hireDate: "2021-03-10", isActive: true },
      { id: 3, type: "Employee_CT", departmentId: 2, immediateBossId: 1, hireDate: "2022-08-20", isActive: true },
    ];

    // Sample Faculties
    this.faculties = [
      { id: 1, name: "Facultad de Ingeniería Civil y Mecánica", deanEmployeeId: 1, isActive: true },
      { id: 2, name: "Facultad de Ciencias Humanas y de la Educación", deanEmployeeId: 2, isActive: true },
    ];

    // Sample Departments
    this.departments = [
      { id: 1, facultyId: 1, name: "Departamento de Ingeniería Civil", isActive: true },
      { id: 2, facultyId: 2, name: "Departamento de Psicología", isActive: true },
    ];

    // Sample Contracts
    this.contracts = [
      { id: 1, employeeId: 1, contractType: "Indefinido", startDate: "2020-01-15", endDate: null, baseSalary: "1350.00" },
      { id: 2, employeeId: 2, contractType: "Ocasional", startDate: "2021-03-10", endDate: "2024-03-10", baseSalary: "1200.00" },
      { id: 3, employeeId: 3, contractType: "Contrato", startDate: "2022-08-20", endDate: "2025-08-20", baseSalary: "900.00" },
    ];

    // Sample Permission Types
    this.permissionTypes = [
      { id: 1, name: "Permiso Personal", deductsFromVacation: false, requiresApproval: true, maxDays: 3 },
      { id: 2, name: "Permiso Médico", deductsFromVacation: false, requiresApproval: true, maxDays: 15 },
      { id: 3, name: "Permiso por Matrimonio", deductsFromVacation: false, requiresApproval: true, maxDays: 5 },
    ];

    // Sample Permissions
    this.permissions = [
      { id: 1, employeeId: 1, permissionTypeId: 1, startDate: "2025-08-20", endDate: "2025-08-20", chargedToVacation: false, approvedBy: null, justification: "Trámite personal", requestDate: new Date("2025-08-14T09:20:00Z").toISOString(), status: "Pending", vacationId: null },
      { id: 2, employeeId: 2, permissionTypeId: 2, startDate: "2025-08-15", endDate: "2025-08-16", chargedToVacation: false, approvedBy: 1, justification: "Cita médica", requestDate: new Date("2025-08-10T08:00:00Z").toISOString(), status: "Approved", vacationId: null },
    ];

    // Sample Attendance Punches
    this.attendancePunches = [
      { id: 1, employeeId: 1, punchTime: new Date("2025-08-14T08:00:00Z").toISOString(), punchType: "In", deviceId: "WEB", longitude: null, latitude: null },
      { id: 2, employeeId: 1, punchTime: new Date("2025-08-14T17:00:00Z").toISOString(), punchType: "Out", deviceId: "WEB", longitude: null, latitude: null },
      { id: 3, employeeId: 2, punchTime: new Date("2025-08-14T08:15:00Z").toISOString(), punchType: "In", deviceId: "WEB", longitude: null, latitude: null },
    ];

    // Sample Payroll
    this.payrolls = [
      { id: 1, employeeId: 1, period: "2025-08", baseSalary: "1350.00", status: "Pending", paymentDate: null, bankAccount: null },
      { id: 2, employeeId: 2, period: "2025-08", baseSalary: "1200.00", status: "Paid", paymentDate: "2025-08-30", bankAccount: "1234567890" },
    ];

    this.nextId = 10;
  }

  // People Methods
  async getPeople(): Promise<Person[]> { return [...this.people]; }
  async getPersonById(id: number): Promise<Person | null> { return this.people.find(p => p.id === id) || null; }
  async createPerson(person: InsertPerson): Promise<Person> {
    const newPerson: Person = { ...person, id: this.getNextId() };
    this.people.push(newPerson);
    return newPerson;
  }
  async updatePerson(id: number, person: Partial<InsertPerson>): Promise<Person | null> {
    const index = this.people.findIndex(p => p.id === id);
    if (index === -1) return null;
    this.people[index] = { ...this.people[index], ...person };
    return this.people[index];
  }
  async deletePerson(id: number): Promise<boolean> {
    const index = this.people.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.people.splice(index, 1);
    return true;
  }

  // Employees Methods
  async getEmployees(): Promise<Employee[]> { return [...this.employees]; }
  async getEmployeeById(id: number): Promise<Employee | null> { return this.employees.find(e => e.id === id) || null; }
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const newEmployee: Employee = { ...employee };
    this.employees.push(newEmployee);
    return newEmployee;
  }
  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | null> {
    const index = this.employees.findIndex(e => e.id === id);
    if (index === -1) return null;
    this.employees[index] = { ...this.employees[index], ...employee };
    return this.employees[index];
  }
  async deleteEmployee(id: number): Promise<boolean> {
    const index = this.employees.findIndex(e => e.id === id);
    if (index === -1) return false;
    this.employees.splice(index, 1);
    return true;
  }

  // Faculties Methods
  async getFaculties(): Promise<Faculty[]> { return [...this.faculties]; }
  async getFacultyById(id: number): Promise<Faculty | null> { return this.faculties.find(f => f.id === id) || null; }
  async createFaculty(faculty: InsertFaculty): Promise<Faculty> {
    const newFaculty: Faculty = { ...faculty, id: this.getNextId() };
    this.faculties.push(newFaculty);
    return newFaculty;
  }
  async updateFaculty(id: number, faculty: Partial<InsertFaculty>): Promise<Faculty | null> {
    const index = this.faculties.findIndex(f => f.id === id);
    if (index === -1) return null;
    this.faculties[index] = { ...this.faculties[index], ...faculty };
    return this.faculties[index];
  }
  async deleteFaculty(id: number): Promise<boolean> {
    const index = this.faculties.findIndex(f => f.id === id);
    if (index === -1) return false;
    this.faculties.splice(index, 1);
    return true;
  }

  // Departments Methods
  async getDepartments(): Promise<Department[]> { return [...this.departments]; }
  async getDepartmentById(id: number): Promise<Department | null> { return this.departments.find(d => d.id === id) || null; }
  async createDepartment(department: InsertDepartment): Promise<Department> {
    const newDepartment: Department = { ...department, id: this.getNextId() };
    this.departments.push(newDepartment);
    return newDepartment;
  }
  async updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | null> {
    const index = this.departments.findIndex(d => d.id === id);
    if (index === -1) return null;
    this.departments[index] = { ...this.departments[index], ...department };
    return this.departments[index];
  }
  async deleteDepartment(id: number): Promise<boolean> {
    const index = this.departments.findIndex(d => d.id === id);
    if (index === -1) return false;
    this.departments.splice(index, 1);
    return true;
  }

  // Schedules Methods
  async getSchedules(): Promise<Schedule[]> { return [...this.schedules]; }
  async getScheduleById(id: number): Promise<Schedule | null> { return this.schedules.find(s => s.id === id) || null; }
  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const newSchedule: Schedule = { ...schedule, id: this.getNextId() };
    this.schedules.push(newSchedule);
    return newSchedule;
  }
  async updateSchedule(id: number, schedule: Partial<InsertSchedule>): Promise<Schedule | null> {
    const index = this.schedules.findIndex(s => s.id === id);
    if (index === -1) return null;
    this.schedules[index] = { ...this.schedules[index], ...schedule };
    return this.schedules[index];
  }
  async deleteSchedule(id: number): Promise<boolean> {
    const index = this.schedules.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.schedules.splice(index, 1);
    return true;
  }

  // Contracts Methods
  async getContracts(): Promise<Contract[]> { return [...this.contracts]; }
  async getContractById(id: number): Promise<Contract | null> { return this.contracts.find(c => c.id === id) || null; }
  async createContract(contract: InsertContract): Promise<Contract> {
    const newContract: Contract = { ...contract, id: this.getNextId() };
    this.contracts.push(newContract);
    return newContract;
  }
  async updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract | null> {
    const index = this.contracts.findIndex(c => c.id === id);
    if (index === -1) return null;
    this.contracts[index] = { ...this.contracts[index], ...contract };
    return this.contracts[index];
  }
  async deleteContract(id: number): Promise<boolean> {
    const index = this.contracts.findIndex(c => c.id === id);
    if (index === -1) return false;
    this.contracts.splice(index, 1);
    return true;
  }

  // Permission Types Methods
  async getPermissionTypes(): Promise<PermissionType[]> { return [...this.permissionTypes]; }
  async getPermissionTypeById(id: number): Promise<PermissionType | null> { return this.permissionTypes.find(pt => pt.id === id) || null; }
  async createPermissionType(permissionType: InsertPermissionType): Promise<PermissionType> {
    const newPermissionType: PermissionType = { ...permissionType, id: this.getNextId() };
    this.permissionTypes.push(newPermissionType);
    return newPermissionType;
  }
  async updatePermissionType(id: number, permissionType: Partial<InsertPermissionType>): Promise<PermissionType | null> {
    const index = this.permissionTypes.findIndex(pt => pt.id === id);
    if (index === -1) return null;
    this.permissionTypes[index] = { ...this.permissionTypes[index], ...permissionType };
    return this.permissionTypes[index];
  }
  async deletePermissionType(id: number): Promise<boolean> {
    const index = this.permissionTypes.findIndex(pt => pt.id === id);
    if (index === -1) return false;
    this.permissionTypes.splice(index, 1);
    return true;
  }

  // Permissions Methods
  async getPermissions(): Promise<Permission[]> { return [...this.permissions]; }
  async getPermissionById(id: number): Promise<Permission | null> { return this.permissions.find(p => p.id === id) || null; }
  async createPermission(permission: InsertPermission): Promise<Permission> {
    const newPermission: Permission = { ...permission, id: this.getNextId(), requestDate: new Date().toISOString() };
    this.permissions.push(newPermission);
    return newPermission;
  }
  async updatePermission(id: number, permission: Partial<InsertPermission>): Promise<Permission | null> {
    const index = this.permissions.findIndex(p => p.id === id);
    if (index === -1) return null;
    this.permissions[index] = { ...this.permissions[index], ...permission };
    return this.permissions[index];
  }
  async deletePermission(id: number): Promise<boolean> {
    const index = this.permissions.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.permissions.splice(index, 1);
    return true;
  }

  // Vacations Methods
  async getVacations(): Promise<Vacation[]> { return [...this.vacations]; }
  async getVacationById(id: number): Promise<Vacation | null> { return this.vacations.find(v => v.id === id) || null; }
  async createVacation(vacation: InsertVacation): Promise<Vacation> {
    const newVacation: Vacation = { ...vacation, id: this.getNextId() };
    this.vacations.push(newVacation);
    return newVacation;
  }
  async updateVacation(id: number, vacation: Partial<InsertVacation>): Promise<Vacation | null> {
    const index = this.vacations.findIndex(v => v.id === id);
    if (index === -1) return null;
    this.vacations[index] = { ...this.vacations[index], ...vacation };
    return this.vacations[index];
  }
  async deleteVacation(id: number): Promise<boolean> {
    const index = this.vacations.findIndex(v => v.id === id);
    if (index === -1) return false;
    this.vacations.splice(index, 1);
    return true;
  }

  // Attendance Punches Methods
  async getAttendancePunches(): Promise<AttendancePunch[]> { return [...this.attendancePunches]; }
  async getAttendancePunchById(id: number): Promise<AttendancePunch | null> { return this.attendancePunches.find(ap => ap.id === id) || null; }
  async createAttendancePunch(punch: InsertAttendancePunch): Promise<AttendancePunch> {
    const newPunch: AttendancePunch = { ...punch, id: this.getNextId() };
    this.attendancePunches.push(newPunch);
    return newPunch;
  }
  async updateAttendancePunch(id: number, punch: Partial<InsertAttendancePunch>): Promise<AttendancePunch | null> {
    const index = this.attendancePunches.findIndex(ap => ap.id === id);
    if (index === -1) return null;
    this.attendancePunches[index] = { ...this.attendancePunches[index], ...punch };
    return this.attendancePunches[index];
  }
  async deleteAttendancePunch(id: number): Promise<boolean> {
    const index = this.attendancePunches.findIndex(ap => ap.id === id);
    if (index === -1) return false;
    this.attendancePunches.splice(index, 1);
    return true;
  }

  // Payroll Methods
  async getPayrolls(): Promise<Payroll[]> { return [...this.payrolls]; }
  async getPayrollById(id: number): Promise<Payroll | null> { return this.payrolls.find(p => p.id === id) || null; }
  async createPayroll(payroll: InsertPayroll): Promise<Payroll> {
    const newPayroll: Payroll = { ...payroll, id: this.getNextId() };
    this.payrolls.push(newPayroll);
    return newPayroll;
  }
  async updatePayroll(id: number, payroll: Partial<InsertPayroll>): Promise<Payroll | null> {
    const index = this.payrolls.findIndex(p => p.id === id);
    if (index === -1) return null;
    this.payrolls[index] = { ...this.payrolls[index], ...payroll };
    return this.payrolls[index];
  }
  async deletePayroll(id: number): Promise<boolean> {
    const index = this.payrolls.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.payrolls.splice(index, 1);
    return true;
  }

  // Payroll Lines Methods
  async getPayrollLines(): Promise<PayrollLine[]> { return [...this.payrollLines]; }
  async getPayrollLineById(id: number): Promise<PayrollLine | null> { return this.payrollLines.find(pl => pl.id === id) || null; }
  async createPayrollLine(payrollLine: InsertPayrollLine): Promise<PayrollLine> {
    const newPayrollLine: PayrollLine = { ...payrollLine, id: this.getNextId() };
    this.payrollLines.push(newPayrollLine);
    return newPayrollLine;
  }
  async updatePayrollLine(id: number, payrollLine: Partial<InsertPayrollLine>): Promise<PayrollLine | null> {
    const index = this.payrollLines.findIndex(pl => pl.id === id);
    if (index === -1) return null;
    this.payrollLines[index] = { ...this.payrollLines[index], ...payrollLine };
    return this.payrollLines[index];
  }
  async deletePayrollLine(id: number): Promise<boolean> {
    const index = this.payrollLines.findIndex(pl => pl.id === id);
    if (index === -1) return false;
    this.payrollLines.splice(index, 1);
    return true;
  }

  // Publications methods
  async getPublicationsByPersonId(personId: number): Promise<Publication[]> {
    return this.publications.filter(p => p.personId === personId);
  }

  async createPublication(publication: InsertPublication): Promise<Publication> {
    const newPublication: Publication = { ...publication, id: this.getNextId() };
    this.publications.push(newPublication);
    return newPublication;
  }

  async updatePublication(id: number, publication: Partial<InsertPublication>): Promise<Publication | null> {
    const index = this.publications.findIndex(p => p.id === id);
    if (index === -1) return null;
    this.publications[index] = { ...this.publications[index], ...publication };
    return this.publications[index];
  }

  async deletePublication(id: number): Promise<boolean> {
    const index = this.publications.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.publications.splice(index, 1);
    return true;
  }

  // Family Members methods
  async getFamilyMembersByPersonId(personId: number): Promise<FamilyMember[]> {
    return this.familyMembers.filter(fm => fm.personId === personId);
  }

  async createFamilyMember(familyMember: InsertFamilyMember): Promise<FamilyMember> {
    const newFamilyMember: FamilyMember = { ...familyMember, id: this.getNextId() };
    this.familyMembers.push(newFamilyMember);
    return newFamilyMember;
  }

  async updateFamilyMember(id: number, familyMember: Partial<InsertFamilyMember>): Promise<FamilyMember | null> {
    const index = this.familyMembers.findIndex(fm => fm.id === id);
    if (index === -1) return null;
    this.familyMembers[index] = { ...this.familyMembers[index], ...familyMember };
    return this.familyMembers[index];
  }

  async deleteFamilyMember(id: number): Promise<boolean> {
    const index = this.familyMembers.findIndex(fm => fm.id === id);
    if (index === -1) return false;
    this.familyMembers.splice(index, 1);
    return true;
  }

  // Work Experiences methods
  async getWorkExperiencesByPersonId(personId: number): Promise<WorkExperience[]> {
    return this.workExperiences.filter(we => we.personId === personId);
  }

  async createWorkExperience(workExperience: InsertWorkExperience): Promise<WorkExperience> {
    const newWorkExperience: WorkExperience = { ...workExperience, id: this.getNextId() };
    this.workExperiences.push(newWorkExperience);
    return newWorkExperience;
  }

  async updateWorkExperience(id: number, workExperience: Partial<InsertWorkExperience>): Promise<WorkExperience | null> {
    const index = this.workExperiences.findIndex(we => we.id === id);
    if (index === -1) return null;
    this.workExperiences[index] = { ...this.workExperiences[index], ...workExperience };
    return this.workExperiences[index];
  }

  async deleteWorkExperience(id: number): Promise<boolean> {
    const index = this.workExperiences.findIndex(we => we.id === id);
    if (index === -1) return false;
    this.workExperiences.splice(index, 1);
    return true;
  }

  // Trainings methods
  async getTrainingsByPersonId(personId: number): Promise<Training[]> {
    return this.trainings.filter(t => t.personId === personId);
  }

  async createTraining(training: InsertTraining): Promise<Training> {
    const newTraining: Training = { ...training, id: this.getNextId() };
    this.trainings.push(newTraining);
    return newTraining;
  }

  async updateTraining(id: number, training: Partial<InsertTraining>): Promise<Training | null> {
    const index = this.trainings.findIndex(t => t.id === id);
    if (index === -1) return null;
    this.trainings[index] = { ...this.trainings[index], ...training };
    return this.trainings[index];
  }

  async deleteTraining(id: number): Promise<boolean> {
    const index = this.trainings.findIndex(t => t.id === id);
    if (index === -1) return false;
    this.trainings.splice(index, 1);
    return true;
  }

  // Books methods
  async getBooksByPersonId(personId: number): Promise<Book[]> {
    return this.books.filter(b => b.personId === personId);
  }

  async createBook(book: InsertBook): Promise<Book> {
    const newBook: Book = { ...book, id: this.getNextId() };
    this.books.push(newBook);
    return newBook;
  }

  async updateBook(id: number, book: Partial<InsertBook>): Promise<Book | null> {
    const index = this.books.findIndex(b => b.id === id);
    if (index === -1) return null;
    this.books[index] = { ...this.books[index], ...book };
    return this.books[index];
  }

  async deleteBook(id: number): Promise<boolean> {
    const index = this.books.findIndex(b => b.id === id);
    if (index === -1) return false;
    this.books.splice(index, 1);
    return true;
  }

  // Emergency Contacts methods
  async getEmergencyContactsByPersonId(personId: number): Promise<EmergencyContact[]> {
    return this.emergencyContacts.filter(ec => ec.personId === personId);
  }

  async createEmergencyContact(emergencyContact: InsertEmergencyContact): Promise<EmergencyContact> {
    const newEmergencyContact: EmergencyContact = { ...emergencyContact, id: this.getNextId() };
    this.emergencyContacts.push(newEmergencyContact);
    return newEmergencyContact;
  }

  async updateEmergencyContact(id: number, emergencyContact: Partial<InsertEmergencyContact>): Promise<EmergencyContact | null> {
    const index = this.emergencyContacts.findIndex(ec => ec.id === id);
    if (index === -1) return null;
    this.emergencyContacts[index] = { ...this.emergencyContacts[index], ...emergencyContact };
    return this.emergencyContacts[index];
  }

  async deleteEmergencyContact(id: number): Promise<boolean> {
    const index = this.emergencyContacts.findIndex(ec => ec.id === id);
    if (index === -1) return false;
    this.emergencyContacts.splice(index, 1);
    return true;
  }

  // Catastrophic Illnesses methods
  async getCatastrophicIllnessesByPersonId(personId: number): Promise<CatastrophicIllness[]> {
    return this.catastrophicIllnesses.filter(ci => ci.personId === personId);
  }

  async createCatastrophicIllness(catastrophicIllness: InsertCatastrophicIllness): Promise<CatastrophicIllness> {
    const newCatastrophicIllness: CatastrophicIllness = { ...catastrophicIllness, id: this.getNextId() };
    this.catastrophicIllnesses.push(newCatastrophicIllness);
    return newCatastrophicIllness;
  }

  async updateCatastrophicIllness(id: number, catastrophicIllness: Partial<InsertCatastrophicIllness>): Promise<CatastrophicIllness | null> {
    const index = this.catastrophicIllnesses.findIndex(ci => ci.id === id);
    if (index === -1) return null;
    this.catastrophicIllnesses[index] = { ...this.catastrophicIllnesses[index], ...catastrophicIllness };
    return this.catastrophicIllnesses[index];
  }

  async deleteCatastrophicIllness(id: number): Promise<boolean> {
    const index = this.catastrophicIllnesses.findIndex(ci => ci.id === id);
    if (index === -1) return false;
    this.catastrophicIllnesses.splice(index, 1);
    return true;
  }

  // Bank Accounts methods
  async getBankAccountsByPersonId(personId: number): Promise<BankAccount[]> {
    return this.bankAccounts.filter(ba => ba.personId === personId);
  }

  async createBankAccount(bankAccount: InsertBankAccount): Promise<BankAccount> {
    const newBankAccount: BankAccount = { ...bankAccount, id: this.getNextId() };
    this.bankAccounts.push(newBankAccount);
    return newBankAccount;
  }

  async updateBankAccount(id: number, bankAccount: Partial<InsertBankAccount>): Promise<BankAccount | null> {
    const index = this.bankAccounts.findIndex(ba => ba.id === id);
    if (index === -1) return null;
    this.bankAccounts[index] = { ...this.bankAccounts[index], ...bankAccount };
    return this.bankAccounts[index];
  }

  async deleteBankAccount(id: number): Promise<boolean> {
    const index = this.bankAccounts.findIndex(ba => ba.id === id);
    if (index === -1) return false;
    this.bankAccounts.splice(index, 1);
    return true;
  }
}

export const storage = new MemStorage();