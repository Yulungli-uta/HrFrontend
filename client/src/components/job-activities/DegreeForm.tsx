// src/components/job-activities/DegreeForm.tsx

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Degree } from "@/types/Job-activities";
import { ActiveStateField } from "./ActiveStateField";
import { CatalogFormFooter } from "./CatalogFormFooter";

const schema = z.object({
  description: z.string().trim().min(1, "La descripción es obligatoria.").max(200, "Máximo 200 caracteres."),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

interface DegreeFormProps {
  degree: Degree;
  saving: boolean;
  onSave: (data: { degreeId?: number; description: string; isActive: boolean }) => void;
  onCancel: () => void;
}

/** Alta y edición de un grado. El formulario se recrea por registro (key en el diálogo), sin efectos de sincronización. */
export function DegreeForm({ degree, saving, onSave, onCancel }: DegreeFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { description: degree.description ?? "", isActive: degree.isActive },
  });
  const { errors } = form.formState;

  return (
    <form
      className="flex min-h-0 flex-1 flex-col gap-4"
      noValidate
      onSubmit={form.handleSubmit((values) =>
        onSave({ degreeId: degree.degreeId || undefined, description: values.description, isActive: values.isActive }),
      )}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-0.5">
        <div className="space-y-1">
          <Label htmlFor="degree-description" className="text-sm font-medium">
            Descripción del grado *
          </Label>
          <Input
            id="degree-description"
            autoFocus
            maxLength={200}
            placeholder="Ej: Grado 5"
            aria-invalid={!!errors.description}
            {...form.register("description")}
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>

        <ActiveStateField
          id={`degree-active-${degree.degreeId || "nuevo"}`}
          noun="grado"
          checked={form.watch("isActive")}
          onChange={(value) => form.setValue("isActive", value, { shouldDirty: true })}
        />
      </div>

      <CatalogFormFooter saving={saving} saveLabel="Guardar grado" onCancel={onCancel} />
    </form>
  );
}
