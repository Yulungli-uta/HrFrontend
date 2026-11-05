import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DB_FIELD_LIMITS } from "@/features/dbFieldLimits";
import { categoryLabel, dedicationLabel, levelLabel } from "@/lib/academicLabels";
import type { AcademicLadderDto, RefType } from "@/lib/api";

const NONE = "none";

const formSchema = z.object({
  code: z.string().max(DB_FIELD_LIMITS.academicLadder.code).optional(),
  name: z.string().trim().min(3, "Mínimo 3 caracteres").max(DB_FIELD_LIMITS.academicLadder.name),
  categoryTypeId: z.string().min(1, "Seleccione la categoría").refine((v) => v !== NONE, "Seleccione la categoría"),
  levelTypeId: z.string(),
  dedicationTypeId: z.string(),
  baseRmu: z.string().refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Monto inválido"),
  sequence: z.coerce.number().int().min(1, "Secuencia mínima: 1"),
  minYearsService: z.string().refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0), "Número entero ≥ 0"),
  nextLadderId: z.string(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

/** Valores ya normalizados que recibe la página para armar el DTO de crear/actualizar. */
export interface LadderFormSubmit {
  code?: string;
  name: string;
  categoryTypeId: number;
  levelTypeId: number | null;
  dedicationTypeId: number | null;
  baseRmu: number | null;
  sequence: number;
  minYearsService: number | null;
  nextLadderId: number | null;
  isActive: boolean;
}

interface LadderFormDialogProps {
  open: boolean;
  /** Debe venir de `useUnsavedChangesGuard` para pedir confirmación si hay cambios sin guardar. */
  onOpenChange: (open: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
  editing: AcademicLadderDto | null;
  ladders: AcademicLadderDto[];
  categories: RefType[];
  levels: RefType[];
  dedications: RefType[];
  isSaving: boolean;
  onSubmit: (values: LadderFormSubmit) => void;
}

const refId = (t: RefType): number => (t.typeId ?? t.typeID) as number;
const str = (n: number | null | undefined): string => (n == null ? NONE : String(n));

function toFormValues(editing: AcademicLadderDto | null, nextSequence: number): FormValues {
  if (!editing) {
    return {
      code: "", name: "", categoryTypeId: "", levelTypeId: NONE, dedicationTypeId: NONE,
      baseRmu: "", sequence: nextSequence, minYearsService: "", nextLadderId: NONE, isActive: true,
    };
  }
  return {
    code: editing.code,
    name: editing.name,
    categoryTypeId: editing.categoryTypeId == null ? "" : String(editing.categoryTypeId),
    levelTypeId: str(editing.levelTypeId),
    dedicationTypeId: str(editing.dedicationTypeId),
    baseRmu: editing.baseRmu == null ? "" : String(editing.baseRmu),
    sequence: editing.sequence,
    minYearsService: editing.minYearsService == null ? "" : String(editing.minYearsService),
    nextLadderId: str(editing.nextLadderId),
    isActive: editing.isActive,
  };
}

export function LadderFormDialog({
  open, onOpenChange, onDirtyChange, editing, ladders, categories, levels, dedications, isSaving, onSubmit,
}: LadderFormDialogProps) {
  const nextSequence = ladders.reduce((max, l) => Math.max(max, l.sequence), 0) + 1;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(null, nextSequence),
  });

  // Al abrir (o cambiar de escalón editado) se carga SIEMPRE el escalón completo: así el envío
  // incluye categoría, nivel, dedicación y RMU base y no se borran por omisión.
  useEffect(() => {
    if (open) form.reset(toFormValues(editing, nextSequence));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const isDirty = form.formState.isDirty;
  useEffect(() => { onDirtyChange(isDirty); }, [isDirty, onDirtyChange]);

  const submit = (v: FormValues) => {
    if (!editing && !v.code?.trim()) {
      form.setError("code", { message: "El código es obligatorio" });
      return;
    }
    const toId = (s: string) => (s === NONE || s === "" ? null : Number(s));
    onSubmit({
      code: v.code?.trim(),
      name: v.name.trim(),
      categoryTypeId: Number(v.categoryTypeId),
      levelTypeId: toId(v.levelTypeId),
      dedicationTypeId: toId(v.dedicationTypeId),
      baseRmu: v.baseRmu === "" ? null : Number(v.baseRmu),
      sequence: v.sequence,
      minYearsService: v.minYearsService === "" ? null : Number(v.minYearsService),
      nextLadderId: toId(v.nextLadderId),
      isActive: v.isActive,
    });
  };

  const err = form.formState.errors;
  const selectField = (
    name: "categoryTypeId" | "levelTypeId" | "dedicationTypeId" | "nextLadderId",
    label: string,
    options: { value: string; label: string }[],
    placeholder: string,
    allowNone: boolean,
    noneLabel = "Sin definir",
  ) => (
    <div className="space-y-1">
      <Label>{label}{!allowNone && <span className="text-destructive"> *</span>}</Label>
      <Select
        value={form.watch(name) === "" ? undefined : form.watch(name)}
        onValueChange={(v) => {
          // Radix Select sincroniza un <select> nativo oculto y puede emitir "" o repetir el valor actual al montar: no es
          // una elección del usuario. Para quitar un valor opcional existe la opción explícita "none", nunca "".
          if (!v || v === form.getValues(name)) return;
          form.setValue(name, v, { shouldDirty: true, shouldValidate: true });
        }}
      >
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {err[name] && <p className="text-xs text-destructive">{err[name]?.message}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Escalafón" : "Nuevo Escalafón"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Modifique los datos del escalafón seleccionado."
              : "Complete la información del nuevo escalafón docente."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(submit)} className="space-y-4 mt-2">
          {!editing && (
            <div className="space-y-1">
              <Label htmlFor="code">Código <span className="text-destructive">*</span></Label>
              <Input
                id="code"
                maxLength={DB_FIELD_LIMITS.academicLadder.code}
                placeholder="ej: TITULAR_AGREGADO_1"
                {...form.register("code")}
              />
              {err.code && <p className="text-xs text-destructive">{err.code.message}</p>}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="name">Nombre <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              maxLength={DB_FIELD_LIMITS.academicLadder.name}
              placeholder="ej: Titular Agregado 1"
              {...form.register("name")}
            />
            {err.name && <p className="text-xs text-destructive">{err.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectField("categoryTypeId", "Categoría",
              categories.map((t) => ({ value: String(refId(t)), label: categoryLabel(t.name) })),
              "Seleccione la categoría", false)}
            {selectField("levelTypeId", "Nivel",
              levels.map((t) => ({ value: String(refId(t)), label: levelLabel(t.name) })),
              "Sin nivel", true, "Sin nivel")}
            {selectField("dedicationTypeId", "Dedicación",
              dedications.map((t) => ({ value: String(refId(t)), label: dedicationLabel(t.name) })),
              "Sin dedicación", true, "Sin dedicación (escalón base)")}
            <div className="space-y-1">
              <Label htmlFor="baseRmu">RMU base</Label>
              <Input id="baseRmu" type="number" min={0} step="0.01" placeholder="ej: 2714.42" {...form.register("baseRmu")} />
              {err.baseRmu && <p className="text-xs text-destructive">{err.baseRmu.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="sequence">Secuencia <span className="text-destructive">*</span></Label>
              <Input id="sequence" type="number" min={1} {...form.register("sequence")} />
              {err.sequence && <p className="text-xs text-destructive">{err.sequence.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="minYearsService">Años mínimos</Label>
              <Input id="minYearsService" type="number" min={0} placeholder="ej: 4" {...form.register("minYearsService")} />
              {err.minYearsService && <p className="text-xs text-destructive">{err.minYearsService.message}</p>}
            </div>
          </div>

          {selectField("nextLadderId", "Escalafón siguiente",
            [...ladders]
              .filter((l) => !editing || l.ladderId !== editing.ladderId)
              .sort((a, b) => a.sequence - b.sequence)
              .map((l) => ({ value: String(l.ladderId), label: l.name })),
            "Sin siguiente (nivel máximo)", true, "Sin siguiente (nivel máximo)")}

          {editing && (
            <div className="flex items-center gap-3">
              <Switch
                id="isActive"
                checked={form.watch("isActive")}
                onCheckedChange={(v) => form.setValue("isActive", v, { shouldDirty: true })}
              />
              <Label htmlFor="isActive">Activo</Label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {editing ? "Guardar Cambios" : "Crear Escalafón"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default LadderFormDialog;
