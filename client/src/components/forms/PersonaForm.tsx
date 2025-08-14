import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonasAPI } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Persona, InsertPersona } from "@shared/schema";

const personaSchema = z.object({
  identificacion: z.string().min(1, "La identificación es requerida"),
  nombres: z.string().min(1, "Los nombres son requeridos"),
  apellidos: z.string().min(1, "Los apellidos son requeridos"),
  emailInstitucional: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  fechaNacimiento: z.string().optional(),
});

type PersonaFormData = z.infer<typeof personaSchema>;

interface PersonaFormProps {
  persona?: Persona;
  onSuccess?: () => void;
}

export default function PersonaForm({ persona, onSuccess }: PersonaFormProps) {
  const { toast } = useToast();
  const isEditing = !!persona;

  const createMutation = useMutation({
    mutationFn: PersonasAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personas"] });
      toast({
        title: "Persona creada",
        description: "La persona ha sido creada exitosamente.",
      });
      reset();
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la persona.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertPersona> }) =>
      PersonasAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personas"] });
      if (persona) {
        queryClient.invalidateQueries({ queryKey: ["/api/personas", persona.id] });
      }
      toast({
        title: "Persona actualizada",
        description: "La persona ha sido actualizada exitosamente.",
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la persona.",
        variant: "destructive",
      });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PersonaFormData>({
    resolver: zodResolver(personaSchema),
    defaultValues: persona ? {
      identificacion: persona.identificacion,
      nombres: persona.nombres,
      apellidos: persona.apellidos,
      emailInstitucional: persona.emailInstitucional || "",
      telefono: persona.telefono || "",
      fechaNacimiento: persona.fechaNacimiento || "",
    } : {
      identificacion: "",
      nombres: "",
      apellidos: "",
      emailInstitucional: "",
      telefono: "",
      fechaNacimiento: "",
    },
  });

  const onSubmit = (data: PersonaFormData) => {
    // Clean up empty strings for optional fields
    const cleanData = {
      ...data,
      emailInstitucional: data.emailInstitucional || undefined,
      telefono: data.telefono || undefined,
      fechaNacimiento: data.fechaNacimiento || undefined,
    };

    if (isEditing && persona) {
      updateMutation.mutate({ id: persona.id, data: cleanData });
    } else {
      createMutation.mutate(cleanData);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="identificacion">
            Identificación <span className="text-destructive">*</span>
          </Label>
          <Input
            id="identificacion"
            {...register("identificacion")}
            placeholder="1234567890"
            disabled={isEditing}
            data-testid="input-identificacion"
          />
          {errors.identificacion && (
            <p className="text-sm text-destructive mt-1">{errors.identificacion.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="nombres">
            Nombres <span className="text-destructive">*</span>
          </Label>
          <Input
            id="nombres"
            {...register("nombres")}
            placeholder="Juan Carlos"
            data-testid="input-nombres"
          />
          {errors.nombres && (
            <p className="text-sm text-destructive mt-1">{errors.nombres.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="apellidos">
            Apellidos <span className="text-destructive">*</span>
          </Label>
          <Input
            id="apellidos"
            {...register("apellidos")}
            placeholder="Pérez González"
            data-testid="input-apellidos"
          />
          {errors.apellidos && (
            <p className="text-sm text-destructive mt-1">{errors.apellidos.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="emailInstitucional">Email Institucional</Label>
          <Input
            id="emailInstitucional"
            type="email"
            {...register("emailInstitucional")}
            placeholder="usuario@empresa.com"
            data-testid="input-email"
          />
          {errors.emailInstitucional && (
            <p className="text-sm text-destructive mt-1">{errors.emailInstitucional.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            {...register("telefono")}
            placeholder="+593 99 123 4567"
            data-testid="input-telefono"
          />
          {errors.telefono && (
            <p className="text-sm text-destructive mt-1">{errors.telefono.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
          <Input
            id="fechaNacimiento"
            type="date"
            {...register("fechaNacimiento")}
            data-testid="input-fecha-nacimiento"
          />
          {errors.fechaNacimiento && (
            <p className="text-sm text-destructive mt-1">{errors.fechaNacimiento.message}</p>
          )}
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4 border-t border-border">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => reset()}
          data-testid="button-reset"
        >
          {isEditing ? "Cancelar" : "Limpiar"}
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          data-testid="button-submit-persona"
        >
          {isEditing ? "Guardar Cambios" : "Crear Persona"}
        </Button>
      </div>
    </form>
  );
}
