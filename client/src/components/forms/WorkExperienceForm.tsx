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
import { Checkbox } from "@/components/ui/checkbox";
import type { WorkExperience, InsertWorkExperience } from "@shared/schema";

const workExperienceFormSchema = z.object({
  personId: z.number(),
  company: z.string().min(1, "La empresa es requerida"),
  position: z.string().min(1, "El cargo es requerido"),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  duties: z.string().optional(),
  salary: z.number().optional(),
  reasonForLeaving: z.string().optional(),
  referenceContact: z.string().optional(),
  referenceEmail: z.string().optional(),
  referencePhone: z.string().optional(),
});

interface WorkExperienceFormProps {
  personId: number;
  workExperience?: WorkExperience;
  onSubmit: (data: InsertWorkExperience) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function WorkExperienceForm({
  personId,
  workExperience,
  onSubmit,
  onCancel,
  isLoading = false,
}: WorkExperienceFormProps) {
  const form = useForm<InsertWorkExperience>({
    resolver: zodResolver(workExperienceFormSchema),
    defaultValues: workExperience ? {
      ...workExperience,
      salary: workExperience.salary ? parseFloat(workExperience.salary) : undefined,
    } : {
      personId,
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
      duties: "",
      salary: undefined,
      reasonForLeaving: "",
      referenceContact: "",
      referenceEmail: "",
      referencePhone: "",
    },
  });

  const handleSubmit = async (data: InsertWorkExperience) => {
    try {
      await onSubmit(data);
      if (!workExperience) {
        form.reset();
      }
    } catch (error) {
      console.error("Error submitting work experience:", error);
    }
  };

  const isCurrent = form.watch("isCurrent");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa/Organización</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-company" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo/Posición</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-position" />
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
            name="isCurrent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 self-end pb-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-is-current"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Trabajo actual</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {!isCurrent && (
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
          )}

          <FormField
            control={form.control}
            name="salary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salario (USD)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    step="0.01"
                    min="0"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                    data-testid="input-salary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isCurrent && (
            <FormField
              control={form.control}
              name="reasonForLeaving"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo de Salida</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-reason-leaving" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="referenceContact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contacto de Referencia</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-reference-contact" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="referenceEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email de Referencia</FormLabel>
                <FormControl>
                  <Input {...field} type="email" data-testid="input-reference-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="referencePhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono de Referencia</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-reference-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="duties"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Funciones y Responsabilidades</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} data-testid="textarea-duties" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading} data-testid="button-submit">
            {isLoading ? "Guardando..." : workExperience ? "Actualizar" : "Crear"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}