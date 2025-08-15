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
import { Checkbox } from "@/components/ui/checkbox";
import type { FamilyMember, InsertFamilyMember } from "@shared/schema";

const familyMemberFormSchema = z.object({
  personId: z.number(),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  idCard: z.string().optional(),
  birthDate: z.string().optional(),
  relationship: z.string().min(1, "La relación familiar es requerida"),
  hasDisability: z.boolean().default(false),
  disabilityType: z.string().optional(),
  disabilityPercentage: z.number().optional(),
  isStudying: z.boolean().default(false),
  educationInstitution: z.string().optional(),
});

interface FamilyMemberFormProps {
  personId: number;
  familyMember?: FamilyMember;
  onSubmit: (data: InsertFamilyMember) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function FamilyMemberForm({
  personId,
  familyMember,
  onSubmit,
  onCancel,
  isLoading = false,
}: FamilyMemberFormProps) {
  const form = useForm<InsertFamilyMember>({
    resolver: zodResolver(familyMemberFormSchema),
    defaultValues: familyMember ? {
      ...familyMember,
    } : {
      personId,
      firstName: "",
      lastName: "",
      idCard: "",
      birthDate: "",
      relationship: "",
      hasDisability: false,
      disabilityType: "",
      disabilityPercentage: undefined,
      isStudying: false,
      educationInstitution: "",
    },
  });

  const handleSubmit = async (data: InsertFamilyMember) => {
    try {
      await onSubmit(data);
      if (!familyMember) {
        form.reset();
      }
    } catch (error) {
      console.error("Error submitting family member:", error);
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
                <FormLabel>Relación Familiar</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-relationship">
                      <SelectValue placeholder="Seleccionar relación" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Cónyuge">Cónyuge</SelectItem>
                    <SelectItem value="Hijo/a">Hijo/a</SelectItem>
                    <SelectItem value="Padre">Padre</SelectItem>
                    <SelectItem value="Madre">Madre</SelectItem>
                    <SelectItem value="Hermano/a">Hermano/a</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="idCard"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cédula de Identidad</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-id-card" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="birthDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Nacimiento</FormLabel>
                <FormControl>
                  <Input {...field} type="date" data-testid="input-birth-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hasDisability"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-has-disability"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>¿Tiene discapacidad?</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {form.watch("hasDisability") && (
            <>
              <FormField
                control={form.control}
                name="disabilityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Discapacidad</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-disability-type" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="disabilityPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Porcentaje de Discapacidad</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0" 
                        max="100"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        data-testid="input-disability-percentage"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="isStudying"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-is-studying"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>¿Se encuentra estudiando?</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {form.watch("isStudying") && (
            <FormField
              control={form.control}
              name="educationInstitution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institución Educativa</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-education-institution" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading} data-testid="button-submit">
            {isLoading ? "Guardando..." : familyMember ? "Actualizar" : "Crear"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}