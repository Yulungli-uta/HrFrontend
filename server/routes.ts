import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { IStorage } from "./storage";
import { 
  insertPersonSchema, insertEmployeeSchema, insertFacultySchema, insertDepartmentSchema, 
  insertScheduleSchema, insertContractSchema, insertPermissionTypeSchema, insertPermissionSchema, 
  insertVacationSchema, insertAttendancePunchSchema, insertPayrollSchema, insertPayrollLineSchema,
  insertPublicationSchema, insertFamilyMemberSchema, insertWorkExperienceSchema, insertTrainingSchema,
  insertBookSchema, insertEmergencyContactSchema, insertCatastrophicIllnessSchema, insertBankAccountSchema
} from "@shared/schema";

interface ValidatedRequest extends Request {
  validatedBody: any;
}

export function createRoutes(storage: IStorage): Router {
  const router = Router();

  // Helper function for validation
  const validateBody = (schema: z.ZodSchema) => (req: ValidatedRequest, res: Response, next: NextFunction) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      return res.status(400).json({ error: "Invalid request body" });
    }
  };

  // People Routes
  router.get("/api/people", async (req, res) => {
    try {
      const people = await storage.getPeople();
      res.json(people);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  router.get("/api/people/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      
      const person = await storage.getPersonById(id);
      if (!person) return res.status(404).json({ error: "Person not found" });
      
      res.json(person);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch person" });
    }
  });

  router.post("/api/people", validateBody(insertPersonSchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const person = await storage.createPerson(req.validatedBody);
      res.status(201).json(person);
    } catch (error) {
      res.status(500).json({ error: "Failed to create person" });
    }
  });

  router.put("/api/people/:id", validateBody(insertPersonSchema.partial()), async (req: ValidatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      
      const person = await storage.updatePerson(id, req.validatedBody);
      if (!person) return res.status(404).json({ error: "Person not found" });
      
      res.json(person);
    } catch (error) {
      res.status(500).json({ error: "Failed to update person" });
    }
  });

  router.delete("/api/people/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      
      const deleted = await storage.deletePerson(id);
      if (!deleted) return res.status(404).json({ error: "Person not found" });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete person" });
    }
  });

  // Employees Routes
  router.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  router.post("/api/employees", validateBody(insertEmployeeSchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const employee = await storage.createEmployee(req.validatedBody);
      res.status(201).json(employee);
    } catch (error) {
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  // Faculties Routes
  router.get("/api/faculties", async (req, res) => {
    try {
      const faculties = await storage.getFaculties();
      res.json(faculties);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch faculties" });
    }
  });

  router.post("/api/faculties", validateBody(insertFacultySchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const faculty = await storage.createFaculty(req.validatedBody);
      res.status(201).json(faculty);
    } catch (error) {
      res.status(500).json({ error: "Failed to create faculty" });
    }
  });

  // Departments Routes
  router.get("/api/departments", async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  router.post("/api/departments", validateBody(insertDepartmentSchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const department = await storage.createDepartment(req.validatedBody);
      res.status(201).json(department);
    } catch (error) {
      res.status(500).json({ error: "Failed to create department" });
    }
  });

  // Contracts Routes
  router.get("/api/contracts", async (req, res) => {
    try {
      const contracts = await storage.getContracts();
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contracts" });
    }
  });

  router.post("/api/contracts", validateBody(insertContractSchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const contract = await storage.createContract(req.validatedBody);
      res.status(201).json(contract);
    } catch (error) {
      res.status(500).json({ error: "Failed to create contract" });
    }
  });

  // Permissions Routes
  router.get("/api/permissions", async (req, res) => {
    try {
      const permissions = await storage.getPermissions();
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  router.post("/api/permissions", validateBody(insertPermissionSchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const permission = await storage.createPermission(req.validatedBody);
      res.status(201).json(permission);
    } catch (error) {
      res.status(500).json({ error: "Failed to create permission" });
    }
  });

  // Vacations Routes
  router.get("/api/vacations", async (req, res) => {
    try {
      const vacations = await storage.getVacations();
      res.json(vacations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vacations" });
    }
  });

  router.post("/api/vacations", validateBody(insertVacationSchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const vacation = await storage.createVacation(req.validatedBody);
      res.status(201).json(vacation);
    } catch (error) {
      res.status(500).json({ error: "Failed to create vacation" });
    }
  });

  // Attendance Routes
  router.get("/api/attendance/punches", async (req, res) => {
    try {
      const punches = await storage.getAttendancePunches();
      res.json(punches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance punches" });
    }
  });

  router.post("/api/attendance/punches", validateBody(insertAttendancePunchSchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const punch = await storage.createAttendancePunch(req.validatedBody);
      res.status(201).json(punch);
    } catch (error) {
      res.status(500).json({ error: "Failed to create attendance punch" });
    }
  });

  // Payroll Routes
  router.get("/api/payroll", async (req, res) => {
    try {
      const payrolls = await storage.getPayrolls();
      res.json(payrolls);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payrolls" });
    }
  });

  router.post("/api/payroll", validateBody(insertPayrollSchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const payroll = await storage.createPayroll(req.validatedBody);
      res.status(201).json(payroll);
    } catch (error) {
      res.status(500).json({ error: "Failed to create payroll" });
    }
  });

  // Publications Routes
  router.get("/api/people/:personId/publications", async (req, res) => {
    try {
      const personId = parseInt(req.params.personId);
      if (isNaN(personId)) return res.status(400).json({ error: "Invalid person ID" });
      
      const publications = await storage.getPublicationsByPersonId(personId);
      res.json(publications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch publications" });
    }
  });

  router.post("/api/publications", validateBody(insertPublicationSchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const publication = await storage.createPublication(req.validatedBody);
      res.status(201).json(publication);
    } catch (error) {
      res.status(500).json({ error: "Failed to create publication" });
    }
  });

  router.put("/api/publications/:id", validateBody(insertPublicationSchema.partial()), async (req: ValidatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      
      const publication = await storage.updatePublication(id, req.validatedBody);
      if (!publication) return res.status(404).json({ error: "Publication not found" });
      
      res.json(publication);
    } catch (error) {
      res.status(500).json({ error: "Failed to update publication" });
    }
  });

  router.delete("/api/publications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      
      const deleted = await storage.deletePublication(id);
      if (!deleted) return res.status(404).json({ error: "Publication not found" });
      
      res.json({ message: "Publication deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete publication" });
    }
  });

  // Family Members Routes
  router.get("/api/people/:personId/family", async (req, res) => {
    try {
      const personId = parseInt(req.params.personId);
      if (isNaN(personId)) return res.status(400).json({ error: "Invalid person ID" });
      
      const familyMembers = await storage.getFamilyMembersByPersonId(personId);
      res.json(familyMembers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch family members" });
    }
  });

  router.post("/api/family", validateBody(insertFamilyMemberSchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const familyMember = await storage.createFamilyMember(req.validatedBody);
      res.status(201).json(familyMember);
    } catch (error) {
      res.status(500).json({ error: "Failed to create family member" });
    }
  });

  // Work Experiences Routes
  router.get("/api/people/:personId/work-experience", async (req, res) => {
    try {
      const personId = parseInt(req.params.personId);
      if (isNaN(personId)) return res.status(400).json({ error: "Invalid person ID" });
      
      const workExperiences = await storage.getWorkExperiencesByPersonId(personId);
      res.json(workExperiences);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch work experiences" });
    }
  });

  router.post("/api/work-experience", validateBody(insertWorkExperienceSchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const workExperience = await storage.createWorkExperience(req.validatedBody);
      res.status(201).json(workExperience);
    } catch (error) {
      res.status(500).json({ error: "Failed to create work experience" });
    }
  });

  // Trainings Routes
  router.get("/api/people/:personId/trainings", async (req, res) => {
    try {
      const personId = parseInt(req.params.personId);
      if (isNaN(personId)) return res.status(400).json({ error: "Invalid person ID" });
      
      const trainings = await storage.getTrainingsByPersonId(personId);
      res.json(trainings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trainings" });
    }
  });

  router.post("/api/trainings", validateBody(insertTrainingSchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const training = await storage.createTraining(req.validatedBody);
      res.status(201).json(training);
    } catch (error) {
      res.status(500).json({ error: "Failed to create training" });
    }
  });

  // Books Routes
  router.get("/api/people/:personId/books", async (req, res) => {
    try {
      const personId = parseInt(req.params.personId);
      if (isNaN(personId)) return res.status(400).json({ error: "Invalid person ID" });
      
      const books = await storage.getBooksByPersonId(personId);
      res.json(books);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch books" });
    }
  });

  router.post("/api/books", validateBody(insertBookSchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const book = await storage.createBook(req.validatedBody);
      res.status(201).json(book);
    } catch (error) {
      res.status(500).json({ error: "Failed to create book" });
    }
  });

  // Emergency Contacts Routes
  router.get("/api/people/:personId/emergency-contacts", async (req, res) => {
    try {
      const personId = parseInt(req.params.personId);
      if (isNaN(personId)) return res.status(400).json({ error: "Invalid person ID" });
      
      const emergencyContacts = await storage.getEmergencyContactsByPersonId(personId);
      res.json(emergencyContacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch emergency contacts" });
    }
  });

  router.post("/api/emergency-contacts", validateBody(insertEmergencyContactSchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const emergencyContact = await storage.createEmergencyContact(req.validatedBody);
      res.status(201).json(emergencyContact);
    } catch (error) {
      res.status(500).json({ error: "Failed to create emergency contact" });
    }
  });

  // Catastrophic Illnesses Routes
  router.get("/api/people/:personId/catastrophic-illnesses", async (req, res) => {
    try {
      const personId = parseInt(req.params.personId);
      if (isNaN(personId)) return res.status(400).json({ error: "Invalid person ID" });
      
      const catastrophicIllnesses = await storage.getCatastrophicIllnessesByPersonId(personId);
      res.json(catastrophicIllnesses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch catastrophic illnesses" });
    }
  });

  router.post("/api/catastrophic-illnesses", validateBody(insertCatastrophicIllnessSchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const catastrophicIllness = await storage.createCatastrophicIllness(req.validatedBody);
      res.status(201).json(catastrophicIllness);
    } catch (error) {
      res.status(500).json({ error: "Failed to create catastrophic illness" });
    }
  });

  // Bank Accounts Routes
  router.get("/api/people/:personId/bank-accounts", async (req, res) => {
    try {
      const personId = parseInt(req.params.personId);
      if (isNaN(personId)) return res.status(400).json({ error: "Invalid person ID" });
      
      const bankAccounts = await storage.getBankAccountsByPersonId(personId);
      res.json(bankAccounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bank accounts" });
    }
  });

  router.post("/api/bank-accounts", validateBody(insertBankAccountSchema), async (req: ValidatedRequest, res: Response) => {
    try {
      const bankAccount = await storage.createBankAccount(req.validatedBody);
      res.status(201).json(bankAccount);
    } catch (error) {
      res.status(500).json({ error: "Failed to create bank account" });
    }
  });

  return router;
}