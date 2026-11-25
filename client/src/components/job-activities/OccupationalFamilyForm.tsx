// src/components/job-activities/OccupationalFamilyForm.tsx

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ActiveStateField } from "./ActiveStateField";
import { CatalogFormFooter } from "./CatalogFormFooter";

/** Grupo ocupacional (ref_Types, categoría OCCUPATIONAL_GROUP_FAMILY). */
export interface OccupationalFamily {
  typeId: number;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  /** true si los niveles de sus escalas se escriben con la palabra "Nivel" (p. ej. "Nivel 2") en lugar de solo el número. */
  levelWord: boolean;
}

const schema = z.object({
  name: z.string().trim().min(1, "El nombre del grupo es obligatorio.").max(200, "Máximo 200 caracteres."),
  description: z.string().trim().max(400, "Máximo 400 caracteres."),
  levelWord: z.boolean(),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

interface OccupationalFamilyFormProps {
  family: OccupationalFamily;
  saving: boolean;
  onSave: (data: { typeId?: number; name: string; description: string; levelWord: boolean; isActive: boolean }) => void;
  onCancel: () => void;
}

/** Alta y edición de un grupo ocupacional. El nombre de cada escala se arma con este nombre más su nivel. */
export function OccupationalFamilyForm({ family, saving, onSave, onCancel }: OccupationalFamilyFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: family.name, description: family.description, levelWord: family.levelWord, isActive: family.isActive },
  });
  const { errors } = form.formState;
  const isEditing = family.typeId > 0;

  return (
    <form
      className="flex min-h-0 flex-1 flex-col gap-4"
      noValidate
      onSubmit={form.handleSubmit((v) =>
        onSave({ typeId: family.typeId || undefined, name: v.name, description: v.description, levelWord: v.levelWord, isActive: v.isActive }),
      )}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-0.5">
        <div className="space-y-1">
          <Label htmlFor="family-name" className="text-sm font-medium">
            Nombre del grupo *
          </Label>
          <Input
            id="family-name"
            autoFocus
            maxLength={200}
            placeholder="Ej: Servidor Público"
            aria-invalid={!!errors.name}
            {...form.register("name")}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          {isEditing && (
            <p className="text-xs text-muted-foreground">
              Renombrar el grupo no cambia el nombre de las escalas ya creadas: guárdelas de nuevo para actualizarlo.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="family-description" className="text-sm font-medium">
            Descripción
          </Label>
          <Textarea
            id="family-description"
            rows={2}
            maxLength={400}
            placeholder="Opcional: a qué personal corresponde"
            aria-invalid={!!errors.description}
            {...form.register("description")}
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <Label htmlFor="family-level-word" className="text-sm font-medium">
              Escribir los niveles con la palabra &quot;Nivel&quot;
            </Label>
            <p className="text-xs text-muted-foreground">
              {form.watch("levelWord") ? "Las escalas se llamarán, por ejemplo, \"Autoridades Académicas Nivel 2\"." : "Las escalas se llamarán, por ejemplo, \"Servidor Público 5\"."}
            </p>
          </div>
          <Switch
            id="family-level-word"
            checked={form.watch("levelWord")}
            onCheckedChange={(value) => form.setValue("levelWord", value, { shouldDirty: true })}
          />
        </div>

        <ActiveStateField
          id={`family-active-${family.typeId || "nuevo"}`}
          noun="grupo"
          checked={form.watch("isActive")}
          onChange={(value) => form.setValue("isActive", value, { shouldDirty: true })}
        />
      </div>

      <CatalogFormFooter saving={saving} saveLabel="Guardar grupo" onCancel={onCancel} />
    </form>
  );
}
