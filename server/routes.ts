import { Request, Response } from "express";
import { z } from "zod";
import { storage } from "./storage";
import {
  insertPersonaSchema,
  insertContratoSchema,
  insertMarcacionSchema,
  insertPermisoSchema,
  insertVacacionSchema,
  insertPublicacionSchema,
} from "@shared/schema";

export function setupRoutes(app: any) {
  // Personas routes
  app.get("/api/personas", async (req: Request, res: Response) => {
    try {
      const personas = await storage.getPersonas();
      res.json(personas);
    } catch (error) {
      res.status(500).json({ message: "Error fetching personas", error });
    }
  });

  app.get("/api/personas/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const persona = await storage.getPersona(id);
      if (!persona) {
        return res.status(404).json({ message: "Persona not found" });
      }
      res.json(persona);
    } catch (error) {
      res.status(500).json({ message: "Error fetching persona", error });
    }
  });

  app.post("/api/personas", async (req: Request, res: Response) => {
    try {
      const validatedData = insertPersonaSchema.parse(req.body);
      const persona = await storage.createPersona(validatedData);
      res.status(201).json(persona);
    } catch (error) {
      res.status(400).json({ message: "Invalid persona data", error });
    }
  });

  app.put("/api/personas/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPersonaSchema.partial().parse(req.body);
      const persona = await storage.updatePersona(id, validatedData);
      if (!persona) {
        return res.status(404).json({ message: "Persona not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Invalid persona data", error });
    }
  });

  app.delete("/api/personas/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePersona(id);
      if (!deleted) {
        return res.status(404).json({ message: "Persona not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting persona", error });
    }
  });

  // Contratos routes
  app.get("/api/contratos", async (req: Request, res: Response) => {
    try {
      const contratos = await storage.getContratos();
      res.json(contratos);
    } catch (error) {
      res.status(500).json({ message: "Error fetching contratos", error });
    }
  });

  app.get("/api/contratos/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const contrato = await storage.getContrato(id);
      if (!contrato) {
        return res.status(404).json({ message: "Contrato not found" });
      }
      res.json(contrato);
    } catch (error) {
      res.status(500).json({ message: "Error fetching contrato", error });
    }
  });

  app.post("/api/contratos", async (req: Request, res: Response) => {
    try {
      const validatedData = insertContratoSchema.parse(req.body);
      const contrato = await storage.createContrato(validatedData);
      res.status(201).json(contrato);
    } catch (error) {
      res.status(400).json({ message: "Invalid contrato data", error });
    }
  });

  app.put("/api/contratos/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertContratoSchema.partial().parse(req.body);
      const contrato = await storage.updateContrato(id, validatedData);
      if (!contrato) {
        return res.status(404).json({ message: "Contrato not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Invalid contrato data", error });
    }
  });

  app.delete("/api/contratos/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteContrato(id);
      if (!deleted) {
        return res.status(404).json({ message: "Contrato not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting contrato", error });
    }
  });

  // Marcaciones routes
  app.get("/api/marcaciones", async (req: Request, res: Response) => {
    try {
      const marcaciones = await storage.getMarcaciones();
      res.json(marcaciones);
    } catch (error) {
      res.status(500).json({ message: "Error fetching marcaciones", error });
    }
  });

  app.get("/api/marcaciones/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const marcacion = await storage.getMarcacion(id);
      if (!marcacion) {
        return res.status(404).json({ message: "Marcacion not found" });
      }
      res.json(marcacion);
    } catch (error) {
      res.status(500).json({ message: "Error fetching marcacion", error });
    }
  });

  app.post("/api/marcaciones", async (req: Request, res: Response) => {
    try {
      const validatedData = insertMarcacionSchema.parse(req.body);
      const marcacion = await storage.createMarcacion(validatedData);
      res.status(201).json(marcacion);
    } catch (error) {
      res.status(400).json({ message: "Invalid marcacion data", error });
    }
  });

  app.put("/api/marcaciones/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertMarcacionSchema.partial().parse(req.body);
      const marcacion = await storage.updateMarcacion(id, validatedData);
      if (!marcacion) {
        return res.status(404).json({ message: "Marcacion not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Invalid marcacion data", error });
    }
  });

  app.delete("/api/marcaciones/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMarcacion(id);
      if (!deleted) {
        return res.status(404).json({ message: "Marcacion not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting marcacion", error });
    }
  });

  // Permisos routes
  app.get("/api/permisos", async (req: Request, res: Response) => {
    try {
      const permisos = await storage.getPermisos();
      res.json(permisos);
    } catch (error) {
      res.status(500).json({ message: "Error fetching permisos", error });
    }
  });

  app.get("/api/permisos/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const permiso = await storage.getPermiso(id);
      if (!permiso) {
        return res.status(404).json({ message: "Permiso not found" });
      }
      res.json(permiso);
    } catch (error) {
      res.status(500).json({ message: "Error fetching permiso", error });
    }
  });

  app.post("/api/permisos", async (req: Request, res: Response) => {
    try {
      const validatedData = insertPermisoSchema.parse(req.body);
      const permiso = await storage.createPermiso(validatedData);
      res.status(201).json(permiso);
    } catch (error) {
      res.status(400).json({ message: "Invalid permiso data", error });
    }
  });

  app.put("/api/permisos/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPermisoSchema.partial().parse(req.body);
      const permiso = await storage.updatePermiso(id, validatedData);
      if (!permiso) {
        return res.status(404).json({ message: "Permiso not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Invalid permiso data", error });
    }
  });

  app.delete("/api/permisos/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePermiso(id);
      if (!deleted) {
        return res.status(404).json({ message: "Permiso not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting permiso", error });
    }
  });

  // Vacaciones routes
  app.get("/api/vacaciones", async (req: Request, res: Response) => {
    try {
      const vacaciones = await storage.getVacaciones();
      res.json(vacaciones);
    } catch (error) {
      res.status(500).json({ message: "Error fetching vacaciones", error });
    }
  });

  app.get("/api/vacaciones/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const vacacion = await storage.getVacacion(id);
      if (!vacacion) {
        return res.status(404).json({ message: "Vacacion not found" });
      }
      res.json(vacacion);
    } catch (error) {
      res.status(500).json({ message: "Error fetching vacacion", error });
    }
  });

  app.post("/api/vacaciones", async (req: Request, res: Response) => {
    try {
      const validatedData = insertVacacionSchema.parse(req.body);
      const vacacion = await storage.createVacacion(validatedData);
      res.status(201).json(vacacion);
    } catch (error) {
      res.status(400).json({ message: "Invalid vacacion data", error });
    }
  });

  app.put("/api/vacaciones/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertVacacionSchema.partial().parse(req.body);
      const vacacion = await storage.updateVacacion(id, validatedData);
      if (!vacacion) {
        return res.status(404).json({ message: "Vacacion not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Invalid vacacion data", error });
    }
  });

  app.delete("/api/vacaciones/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteVacacion(id);
      if (!deleted) {
        return res.status(404).json({ message: "Vacacion not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting vacacion", error });
    }
  });

  // Publicaciones routes
  app.get("/api/publicaciones", async (req: Request, res: Response) => {
    try {
      const publicaciones = await storage.getPublicaciones();
      res.json(publicaciones);
    } catch (error) {
      res.status(500).json({ message: "Error fetching publicaciones", error });
    }
  });

  app.get("/api/publicaciones/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const publicacion = await storage.getPublicacion(id);
      if (!publicacion) {
        return res.status(404).json({ message: "Publicacion not found" });
      }
      res.json(publicacion);
    } catch (error) {
      res.status(500).json({ message: "Error fetching publicacion", error });
    }
  });

  app.post("/api/publicaciones", async (req: Request, res: Response) => {
    try {
      const validatedData = insertPublicacionSchema.parse(req.body);
      const publicacion = await storage.createPublicacion(validatedData);
      res.status(201).json(publicacion);
    } catch (error) {
      res.status(400).json({ message: "Invalid publicacion data", error });
    }
  });

  app.put("/api/publicaciones/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPublicacionSchema.partial().parse(req.body);
      const publicacion = await storage.updatePublicacion(id, validatedData);
      if (!publicacion) {
        return res.status(404).json({ message: "Publicacion not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Invalid publicacion data", error });
    }
  });

  app.delete("/api/publicaciones/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePublicacion(id);
      if (!deleted) {
        return res.status(404).json({ message: "Publicacion not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting publicacion", error });
    }
  });
}