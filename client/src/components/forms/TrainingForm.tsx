import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Training, InsertTraining } from "@shared/schema";

const trainingFormSchema = z.object({
  personId: z.number(),
  name: z.string().min(1, "El nombre de la capacitación es requerido"),
  institution: z.string().min(1, "La institución es requerida"),
  type: z.string().min(1, "El tipo es requerido"),
  modality: z.string().optional(),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().optional(),
  durationHours: z.number().optional(),
  hasCertificate: z.boolean().default(false),
  certificateNumber: z.string().optional(),
  grade: z.string().optional(),
  description: z.string().optional(),
  fileUrl: z.string().optional(),
});

interface TrainingFormProps {
  personId: number;
  training?: Training;
  onSubmit: (data: InsertTraining) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function TrainingForm({
  personId,
  training,
  onSubmit,
  onCancel,
  isLoading = false,
}: TrainingFormProps) {
  const form = useForm<InsertTraining>({
    resolver: zodResolver(trainingFormSchema),
    defaultValues: training ? {
      ...training,
    } : {
      personId,
      name: "",
      institution: "",
      type: "",
      modality: "",
      startDate: "",
      endDate: "",
      durationHours: undefined,
      hasCertificate: false,
      certificateNumber: "",
      grade: "",
      description: "",
      fileUrl: "",
    },
  });

  const handleSubmit = async (data: InsertTraining) => {
    try {
      await onSubmit(data);
      if (!training) {
        form.reset();
      }
    } catch (error) {
      console.error("Error submitting training:", error);
    }
  };

  const hasCertificate = form.watch("hasCertificate");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Nombre de la Capacitación</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="institution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Institución</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-institution" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-type">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Curso">Curso</SelectItem>
                    <SelectItem value="Seminario">Seminario</SelectItem>
                    <SelectItem value="Taller">Taller</SelectItem>
                    <SelectItem value="Diplomado">Diplomado</SelectItem>
                    <SelectItem value="Especialización">Especialización</SelectItem>
                    <SelectItem value="Certificación">Certificación</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="modality"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modalidad</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-modality">
                      <SelectValue placeholder="Seleccionar modalidad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Presencial">Presencial</SelectItem>
                    <SelectItem value="Virtual">Virtual</SelectItem>
                    <SelectItem value="Semipresencial">Semipresencial</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="durationHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración (horas)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    min="1"
                    onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                    data-testid="input-duration-hours"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Inicio</FormLabel>
                <FormControl>
                  <Input {...field} type="date" data-testid="input-start-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Finalización</FormLabel>
                <FormControl>
                  <Input {...field} type="date" data-testid="input-end-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hasCertificate"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 self-end pb-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-has-certificate"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>¿Tiene certificado?</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {hasCertificate && (
            <>
              <FormField
                control={form.control}
                name="certificateNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Certificado</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-certificate-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calificación</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-grade" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL del Archivo</FormLabel>
                    <FormControl>
                      <Input {...field} type="url" data-testid="input-file-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} data-testid="textarea-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading} data-testid="button-submit">
            {isLoading ? "Guardando..." : training ? "Actualizar" : "Crear"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}