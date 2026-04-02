// client/src/components/person-detail/forms/FamilyMemberForm.tsx
import { useEffect } from "react";
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
import { RefreshCw } from "lucide-react";
import type { FamilyMember } from "@/types/person";

const familyMemberFormSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  identificationTypeId: z.string().min(1, "El tipo de identificación es requerido"),
  dependentId: z.string().min(1, "El número de identificación es requerido"),
  birthDate: z.string().min(1, "La fecha de nacimiento es requerida"),
  relationship: z.string().min(1, "La relación es requerida"),
  hasDisability: z.boolean().default(false),
  disabilityType: z.string().optional(),
  disabilityPercentage: z.coerce
    .number()
    .min(0, "El porcentaje no puede ser negativo")
    .max(100, "El porcentaje no puede ser mayor a 100")
    .optional()
    .default(0),
  isStudying: z.boolean().default(false),
  educationInstitution: z.string().optional(),
});

type FamilyMemberFormData = z.infer<typeof familyMemberFormSchema>;

interface FamilyMemberFormProps {
  personId: number;
  familyMember?: FamilyMember;
  onSubmit: (data: FamilyMemberFormData) => Promise<void>;
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
  const form = useForm<FamilyMemberFormData>({
    resolver: zodResolver(familyMemberFormSchema) as any,
    defaultValues: {
      firstName: familyMember?.firstName || "",
      lastName: familyMember?.lastName || "",
      identificationTypeId: familyMember?.identificationTypeId?.toString() || "",
      dependentId: familyMember?.dependentId || "",
      birthDate: familyMember?.birthDate
        ? new Date(familyMember.birthDate).toISOString().split("T")[0]
        : "",
      relationship: familyMember?.relationship || "",
      hasDisability: familyMember?.hasDisability || false,
      disabilityType: familyMember?.disabilityTypeId != null
        ? String(familyMember.disabilityTypeId)
        : "",
      disabilityPercentage: familyMember?.disabilityPercentage || 0,
      isStudying: familyMember?.isStudying || false,
      educationInstitution: familyMember?.educationInstitution || "",
    },
  });

  const hasDisability = form.watch("hasDisability");
  const isStudying = form.watch("isStudying");

  useEffect(() => {
    if (!hasDisability) {
      form.setValue("disabilityType", "");
      form.setValue("disabilityPercentage", 0);
    }
  }, [hasDisability, form]);

  useEffect(() => {
    if (!isStudying) {
      form.setValue("educationInstitution", "");
    }
  }, [isStudying, form]);

  const handleSubmit = async (data: FamilyMemberFormData) => {
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
      <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control as any}
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
            control={form.control as any}
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
            control={form.control as any}
            name="identificationTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Identificación</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-identification-type">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">Cédula</SelectItem>
                    <SelectItem value="2">Pasaporte</SelectItem>
                    <SelectItem value="3">RUC</SelectItem>
                    <SelectItem value="4">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="dependentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Identificación</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-dependent-id" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="birthDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Nacimiento</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="date"
                    data-testid="input-birth-date"
                    max={new Date().toISOString().split("T")[0]}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="relationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relación</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                >
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
        </div>

        <div className="space-y-4 border-t pt-4">
          <FormField
            control={form.control as any}
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
                  <FormLabel>Tiene discapacidad</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {hasDisability && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
              <FormField
                control={form.control as any}
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
                control={form.control as any}
                name="disabilityPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Porcentaje de Discapacidad (%)</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="100"
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="input-disability-percentage"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <FormField
            control={form.control as any}
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
                  <FormLabel>Actualmente estudiando</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {isStudying && (
            <div className="ml-6">
              <FormField
                control={form.control as any}
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
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            type="submit"
            disabled={isLoading}
            data-testid="button-submit"
            className="relative min-w-[100px]"
          >
            {isLoading && (
              <RefreshCw className="h-4 w-4 animate-spin absolute left-3" />
            )}
            {isLoading ? "Guardando..." : familyMember ? "Actualizar" : "Crear"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}