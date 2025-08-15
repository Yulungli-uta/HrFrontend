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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EmergencyContact, InsertEmergencyContact } from "@shared/schema";

const emergencyContactFormSchema = z.object({
  personId: z.number(),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  relationship: z.string().min(1, "La relación es requerida"),
  phone: z.string().min(1, "El teléfono es requerido"),
  email: z.string().optional(),
  address: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

interface EmergencyContactFormProps {
  personId: number;
  emergencyContact?: EmergencyContact;
  onSubmit: (data: InsertEmergencyContact) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function EmergencyContactForm({
  personId,
  emergencyContact,
  onSubmit,
  onCancel,
  isLoading = false,
}: EmergencyContactFormProps) {
  const form = useForm<InsertEmergencyContact>({
    resolver: zodResolver(emergencyContactFormSchema),
    defaultValues: emergencyContact ? {
      ...emergencyContact,
    } : {
      personId,
      firstName: "",
      lastName: "",
      relationship: "",
      phone: "",
      email: "",
      address: "",
      isPrimary: false,
    },
  });

  const handleSubmit = async (data: InsertEmergencyContact) => {
    try {
      await onSubmit(data);
      if (!emergencyContact) {
        form.reset();
      }
    } catch (error) {
      console.error("Error submitting emergency contact:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombres</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-first-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apellidos</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-last-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="relationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relación</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-relationship">
                      <SelectValue placeholder="Seleccionar relación" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Cónyuge">Cónyuge</SelectItem>
                    <SelectItem value="Padre">Padre</SelectItem>
                    <SelectItem value="Madre">Madre</SelectItem>
                    <SelectItem value="Hijo/a">Hijo/a</SelectItem>
                    <SelectItem value="Hermano/a">Hermano/a</SelectItem>
                    <SelectItem value="Amigo/a">Amigo/a</SelectItem>
                    <SelectItem value="Vecino/a">Vecino/a</SelectItem>
                    <SelectItem value="Colega">Colega</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" data-testid="input-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading} data-testid="button-submit">
            {isLoading ? "Guardando..." : emergencyContact ? "Actualizar" : "Crear"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}