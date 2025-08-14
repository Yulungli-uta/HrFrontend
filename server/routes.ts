import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertPersonaSchema,
  insertContratoSchema,
  insertMarcacionSchema,
  insertPermisoSchema,
  insertVacacionSchema,
  insertNominaPeriodoSchema,
  insertNominaConceptoSchema,
  insertNominaMovimientoSchema,
  insertPublicacionSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS middleware
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Personas routes
  app.get("/api/personas", async (req, res) => {
    try {
      const personas = await storage.getPersonas();
      res.json(personas);
    } catch (error) {
      res.status(500).json({ message: "Error fetching personas" });
    }
  });

  app.get("/api/personas/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const persona = await storage.getPersona(id);
      if (!persona) {
        return res.status(404).json({ message: "Persona not found" });
      }
      res.json(persona);
    } catch (error) {
      res.status(500).json({ message: "Error fetching persona" });
    }
  });

  app.post("/api/personas", async (req, res) => {
    try {
      const validatedData = insertPersonaSchema.parse(req.body);
      const persona = await storage.createPersona(validatedData);
      res.status(201).json(persona);
    } catch (error) {
      res.status(400).json({ message: "Invalid persona data", error });
    }
  });

  app.put("/api/personas/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPersonaSchema.partial().parse(req.body);
      const persona = await storage.updatePersona(id, validatedData);
      if (!persona) {
        return res.status(404).json({ message: "Persona not found" });
      }
      res.json(persona);
    } catch (error) {
      res.status(400).json({ message: "Invalid persona data", error });
    }
  });

  app.delete("/api/personas/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePersona(id);
      if (!deleted) {
        return res.status(404).json({ message: "Persona not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting persona" });
    }
  });

  // Contratos routes
  app.get("/api/contratos", async (req, res) => {
    try {
      const contratos = await storage.getContratos();
      res.json(contratos);
    } catch (error) {
      res.status(500).json({ message: "Error fetching contratos" });
    }
  });

  app.post("/api/contratos", async (req, res) => {
    try {
      const validatedData = insertContratoSchema.parse(req.body);
      const contrato = await storage.createContrato(validatedData);
      res.status(201).json(contrato);
    } catch (error) {
      res.status(400).json({ message: "Invalid contrato data", error });
    }
  });

  // Marcaciones routes
  app.get("/api/marcaciones", async (req, res) => {
    try {
      const { personaId, desde, hasta } = req.query;
      
      let marcaciones;
      if (desde && hasta) {
        marcaciones = await storage.getMarcacionesByDateRange(desde as string, hasta as string);
      } else if (personaId) {
        marcaciones = await storage.getMarcacionesByPersona(parseInt(personaId as string));
      } else {
        marcaciones = await storage.getMarcaciones();
      }
      
      res.json(marcaciones);
    } catch (error) {
      res.status(500).json({ message: "Error fetching marcaciones" });
    }
  });

  app.post("/api/marcaciones", async (req, res) => {
    try {
      const validatedData = insertMarcacionSchema.parse(req.body);
      const marcacion = await storage.createMarcacion(validatedData);
      res.status(201).json(marcacion);
    } catch (error) {
      res.status(400).json({ message: "Invalid marcacion data", error });
    }
  });

  app.delete("/api/marcaciones/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMarcacion(id);
      if (!deleted) {
        return res.status(404).json({ message: "Marcacion not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting marcacion" });
    }
  });

  // Permisos routes
  app.get("/api/permisos", async (req, res) => {
    try {
      const { personaId } = req.query;
      let permisos;
      if (personaId) {
        permisos = await storage.getPermisosByPersona(parseInt(personaId as string));
      } else {
        permisos = await storage.getPermisos();
      }
      res.json(permisos);
    } catch (error) {
      res.status(500).json({ message: "Error fetching permisos" });
    }
  });

  app.post("/api/permisos", async (req, res) => {
    try {
      const validatedData = insertPermisoSchema.parse(req.body);
      const permiso = await storage.createPermiso(validatedData);
      res.status(201).json(permiso);
    } catch (error) {
      res.status(400).json({ message: "Invalid permiso data", error });
    }
  });

  app.put("/api/permisos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPermisoSchema.partial().parse(req.body);
      const permiso = await storage.updatePermiso(id, validatedData);
      if (!permiso) {
        return res.status(404).json({ message: "Permiso not found" });
      }
      res.json(permiso);
    } catch (error) {
      res.status(400).json({ message: "Invalid permiso data", error });
    }
  });

  // Vacaciones routes
  app.get("/api/vacaciones", async (req, res) => {
    try {
      const { personaId } = req.query;
      let vacaciones;
      if (personaId) {
        vacaciones = await storage.getVacacionesByPersona(parseInt(personaId as string));
      } else {
        vacaciones = await storage.getVacaciones();
      }
      res.json(vacaciones);
    } catch (error) {
      res.status(500).json({ message: "Error fetching vacaciones" });
    }
  });

  app.post("/api/vacaciones", async (req, res) => {
    try {
      const validatedData = insertVacacionSchema.parse(req.body);
      const vacacion = await storage.createVacacion(validatedData);
      res.status(201).json(vacacion);
    } catch (error) {
      res.status(400).json({ message: "Invalid vacacion data", error });
    }
  });

  // Nómina routes
  app.get("/api/nomina/periodos", async (req, res) => {
    try {
      const periodos = await storage.getNominaPeriodos();
      res.json(periodos);
    } catch (error) {
      res.status(500).json({ message: "Error fetching periodos" });
    }
  });

  app.post("/api/nomina/periodos", async (req, res) => {
    try {
      const validatedData = insertNominaPeriodoSchema.parse(req.body);
      const periodo = await storage.createNominaPeriodo(validatedData);
      res.status(201).json(periodo);
    } catch (error) {
      res.status(400).json({ message: "Invalid periodo data", error });
    }
  });

  app.get("/api/nomina/conceptos", async (req, res) => {
    try {
      const conceptos = await storage.getNominaConceptos();
      res.json(conceptos);
    } catch (error) {
      res.status(500).json({ message: "Error fetching conceptos" });
    }
  });

  app.post("/api/nomina/conceptos", async (req, res) => {
    try {
      const validatedData = insertNominaConceptoSchema.parse(req.body);
      const concepto = await storage.createNominaConcepto(validatedData);
      res.status(201).json(concepto);
    } catch (error) {
      res.status(400).json({ message: "Invalid concepto data", error });
    }
  });

  app.get("/api/nomina/movimientos", async (req, res) => {
    try {
      const { periodoId } = req.query;
      let movimientos;
      if (periodoId) {
        movimientos = await storage.getNominaMovimientosByPeriodo(parseInt(periodoId as string));
      } else {
        movimientos = await storage.getNominaMovimientos();
      }
      res.json(movimientos);
    } catch (error) {
      res.status(500).json({ message: "Error fetching movimientos" });
    }
  });

  app.post("/api/nomina/movimientos", async (req, res) => {
    try {
      const validatedData = insertNominaMovimientoSchema.parse(req.body);
      const movimiento = await storage.createNominaMovimiento(validatedData);
      res.status(201).json(movimiento);
    } catch (error) {
      res.status(400).json({ message: "Invalid movimiento data", error });
    }
  });

  // Publicaciones routes
  app.get("/api/publicaciones", async (req, res) => {
    try {
      const publicaciones = await storage.getPublicaciones();
      res.json(publicaciones);
    } catch (error) {
      res.status(500).json({ message: "Error fetching publicaciones" });
    }
  });

  app.get("/api/publicaciones/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const publicacion = await storage.getPublicacion(id);
      if (!publicacion) {
        return res.status(404).json({ message: "Publicacion not found" });
      }
      res.json(publicacion);
    } catch (error) {
      res.status(500).json({ message: "Error fetching publicacion" });
    }
  });

  app.post("/api/publicaciones", async (req, res) => {
    try {
      const validatedData = insertPublicacionSchema.parse(req.body);
      const publicacion = await storage.createPublicacion(validatedData);
      res.status(201).json(publicacion);
    } catch (error) {
      res.status(400).json({ message: "Invalid publicacion data", error });
    }
  });

  app.put("/api/publicaciones/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPublicacionSchema.partial().parse(req.body);
      const publicacion = await storage.updatePublicacion(id, validatedData);
      if (!publicacion) {
        return res.status(404).json({ message: "Publicacion not found" });
      }
      res.json(publicacion);
    } catch (error) {
      res.status(400).json({ message: "Invalid publicacion data", error });
    }
  });

  app.delete("/api/publicaciones/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePublicacion(id);
      if (!deleted) {
        return res.status(404).json({ message: "Publicacion not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting publicacion" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
