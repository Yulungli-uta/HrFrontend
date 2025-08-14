import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MarcacionesAPI, PersonasAPI } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const marcacionSchema = z.object({
  personaId: z.number({
    required_error: "La persona es requerida",
  }),
  tipo: z.enum(["entrada", "salida", "descanso_inicio", "descanso_fin"], {
    required_error: "El tipo de marcación es requerido",
  }),
  observaciones: z.string().optional(),
});

type MarcacionFormData = z.infer<typeof marcacionSchema>;

interface MarcacionFormProps {
  onSuccess?: () => void;
}

export default function MarcacionForm({ onSuccess }: MarcacionFormProps) {
  const { toast } = useToast();

  const { data: personas = [] } = useQuery({
    queryKey: ["/api/personas"],
    queryFn: PersonasAPI.list,
    select: (data) => data.filter(p => p.estado), // Only active personas
  });

  const createMutation = useMutation({
    mutationFn: MarcacionesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marcaciones"] });
      toast({
        title: "Marcación registrada",
        description: "La marcación ha sido registrada exitosamente.",
      });
      reset();
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo registrar la marcación.",
        variant: "destructive",
      });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MarcacionFormData>({
    resolver: zodResolver(marcacionSchema),
  });

  const onSubmit = (data: MarcacionFormData) => {
    const marcacionData = {
      ...data,
      timestamp: new Date(),
      observaciones: data.observaciones || undefined,
    };

    createMutation.mutate(marcacionData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="personaId">
            Persona <span className="text-destructive">*</span>
          </Label>
          <Select
            onValueChange={(value) => setValue("personaId", parseInt(value))}
            data-testid="select-persona"
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar persona" />
            </SelectTrigger>
            <SelectContent>
              {personas.map((persona) => (
                <SelectItem key={persona.id} value={persona.id.toString()}>
                  {persona.nombres} {persona.apellidos} - {persona.identificacion}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.personaId && (
            <p className="text-sm text-destructive mt-1">{errors.personaId.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="tipo">
            Tipo de Marcación <span className="text-destructive">*</span>
          </Label>
          <Select
            onValueChange={(value) => setValue("tipo", value as "entrada" | "salida" | "descanso_inicio" | "descanso_fin")}
            data-testid="select-tipo-marcacion"
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="salida">Salida</SelectItem>
              <SelectItem value="descanso_inicio">Inicio de Descanso</SelectItem>
              <SelectItem value="descanso_fin">Fin de Descanso</SelectItem>
            </SelectContent>
          </Select>
          {errors.tipo && (
            <p className="text-sm text-destructive mt-1">{errors.tipo.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="observaciones">Observaciones</Label>
          <Textarea
            id="observaciones"
            {...register("observaciones")}
            placeholder="Observaciones adicionales (opcional)"
            rows={3}
            data-testid="textarea-observaciones"
          />
          {errors.observaciones && (
            <p className="text-sm text-destructive mt-1">{errors.observaciones.message}</p>
          )}
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Fecha y Hora:</strong> {new Date().toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            La marcación se registrará con la fecha y hora actual
          </p>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4 border-t border-border">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => onSuccess?.()}
          data-testid="button-cancel-marcacion"
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          data-testid="button-submit-marcacion"
        >
          Registrar Marcación
        </Button>
      </div>
    </form>
  );
}
