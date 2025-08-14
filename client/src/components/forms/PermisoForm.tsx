import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PermisosAPI, PersonasAPI } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const permisoSchema = z.object({
  personaId: z.number({
    required_error: "La persona es requerida",
  }),
  tipo: z.enum(["medico", "personal", "compensatorio"], {
    required_error: "El tipo de permiso es requerido",
  }),
  fechaDesde: z.string().min(1, "La fecha de inicio es requerida"),
  fechaHasta: z.string().min(1, "La fecha de fin es requerida"),
  horas: z.number().min(1, "Las horas son requeridas").optional(),
  motivo: z.string().min(1, "El motivo es requerido"),
  observaciones: z.string().optional(),
}).refine((data) => {
  const desde = new Date(data.fechaDesde);
  const hasta = new Date(data.fechaHasta);
  return hasta >= desde;
}, {
  message: "La fecha de fin debe ser posterior o igual a la fecha de inicio",
  path: ["fechaHasta"],
});

type PermisoFormData = z.infer<typeof permisoSchema>;

interface PermisoFormProps {
  onSuccess?: () => void;
}

export default function PermisoForm({ onSuccess }: PermisoFormProps) {
  const { toast } = useToast();

  const { data: personas = [] } = useQuery({
    queryKey: ["/api/personas"],
    queryFn: PersonasAPI.list,
    select: (data) => data.filter(p => p.estado), // Only active personas
  });

  const createMutation = useMutation({
    mutationFn: PermisosAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permisos"] });
      toast({
        title: "Permiso creado",
        description: "La solicitud de permiso ha sido creada exitosamente.",
      });
      reset();
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la solicitud de permiso.",
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
  } = useForm<PermisoFormData>({
    resolver: zodResolver(permisoSchema),
  });

  const fechaDesde = watch("fechaDesde");
  const fechaHasta = watch("fechaHasta");

  // Calculate hours if both dates are selected
  const calculateHours = () => {
    if (fechaDesde && fechaHasta) {
      const desde = new Date(fechaDesde);
      const hasta = new Date(fechaHasta);
      const diffTime = Math.abs(hasta.getTime() - desde.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays * 8; // Assuming 8 hours per day
    }
    return 0;
  };

  const onSubmit = (data: PermisoFormData) => {
    const permisoData = {
      ...data,
      horas: data.horas || calculateHours(),
      observaciones: data.observaciones || undefined,
    };

    createMutation.mutate(permisoData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <Label htmlFor="personaId">
            Persona <span className="text-destructive">*</span>
          </Label>
          <Select
            onValueChange={(value) => setValue("personaId", parseInt(value))}
            data-testid="select-persona-permiso"
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
            Tipo de Permiso <span className="text-destructive">*</span>
          </Label>
          <Select
            onValueChange={(value) => setValue("tipo", value as "medico" | "personal" | "compensatorio")}
            data-testid="select-tipo-permiso"
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="medico">Médico</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="compensatorio">Compensatorio</SelectItem>
            </SelectContent>
          </Select>
          {errors.tipo && (
            <p className="text-sm text-destructive mt-1">{errors.tipo.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="horas">Horas</Label>
          <Input
            id="horas"
            type="number"
            {...register("horas", { valueAsNumber: true })}
            placeholder={calculateHours().toString()}
            data-testid="input-horas"
          />
          {errors.horas && (
            <p className="text-sm text-destructive mt-1">{errors.horas.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="fechaDesde">
            Fecha Desde <span className="text-destructive">*</span>
          </Label>
          <Input
            id="fechaDesde"
            type="date"
            {...register("fechaDesde")}
            data-testid="input-fecha-desde-permiso"
          />
          {errors.fechaDesde && (
            <p className="text-sm text-destructive mt-1">{errors.fechaDesde.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="fechaHasta">
            Fecha Hasta <span className="text-destructive">*</span>
          </Label>
          <Input
            id="fechaHasta"
            type="date"
            {...register("fechaHasta")}
            data-testid="input-fecha-hasta-permiso"
          />
          {errors.fechaHasta && (
            <p className="text-sm text-destructive mt-1">{errors.fechaHasta.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="motivo">
            Motivo <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="motivo"
            {...register("motivo")}
            placeholder="Describe el motivo del permiso"
            rows={3}
            data-testid="textarea-motivo"
          />
          {errors.motivo && (
            <p className="text-sm text-destructive mt-1">{errors.motivo.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="observaciones">Observaciones</Label>
          <Textarea
            id="observaciones"
            {...register("observaciones")}
            placeholder="Observaciones adicionales (opcional)"
            rows={2}
            data-testid="textarea-observaciones-permiso"
          />
          {errors.observaciones && (
            <p className="text-sm text-destructive mt-1">{errors.observaciones.message}</p>
          )}
        </div>
      </div>

      {fechaDesde && fechaHasta && (
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Duración calculada:</strong> {calculateHours()} horas
          </p>
        </div>
      )}
      
      <div className="flex justify-end space-x-3 pt-4 border-t border-border">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => onSuccess?.()}
          data-testid="button-cancel-permiso"
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          data-testid="button-submit-permiso"
        >
          Crear Solicitud
        </Button>
      </div>
    </form>
  );
}
