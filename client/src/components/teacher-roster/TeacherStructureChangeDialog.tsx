import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { categoryLabel, dedicationLabel, levelLabel } from "@/lib/academicLabels";
import { addDays, formatDate, todayEcuador } from "@/lib/clock";
import type { AcademicLadderDto, TeacherRosterItemDto } from "@/lib/api";

/** Largo máximo del motivo: el servidor lo rechaza por encima de 500. */
const REASON_MAX = 500;
const REASON_MIN = 5;

const CATEGORY_ORDER = ["TITULAR_AUXILIAR", "TITULAR_AGREGADO", "TITULAR_PRINCIPAL"];
const DEFAULT_HOURS: Record<string, string> = { TC: "40", MT: "20" };

const formSchema = z.object({
  categoryTypeId: z.string().min(1, "Seleccione la categoría"),
  levelTypeId: z.string().min(1, "Seleccione el nivel"),
  dedicationTypeId: z.string().min(1, "Seleccione la dedicación"),
  weeklyClassHours: z.string().refine(
    (v) => v !== "" && Number(v) > 0 && Number(v) <= 60,
    "Indique las horas semanales (mayores a 0 y hasta 60)",
  ),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Seleccione la fecha efectiva"),
  reason: z.string().trim()
    .min(REASON_MIN, `Indique el motivo o documento (mínimo ${REASON_MIN} caracteres)`)
    .max(REASON_MAX, `Máximo ${REASON_MAX} caracteres`),
});

type FormValues = z.infer<typeof formSchema>;

export interface StructureChangeSubmit {
  ladderId: number;
  dedicationTypeId: number;
  weeklyClassHours: number;
  effectiveDate: string;
  departmentId: number | null;
  reason: string;
}

interface TeacherStructureChangeDialogProps {
  open: boolean;
  /** Debe venir de `useUnsavedChangesGuard` para pedir confirmación si hay cambios sin guardar. */
  onOpenChange: (open: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
  item: TeacherRosterItemDto | null;
  /** Catálogo completo de escalones (se resuelve el escalón por categoría + nivel + dedicación). */
  ladders: AcademicLadderDto[];
  isSaving: boolean;
  onSubmit: (values: StructureChangeSubmit) => void;
}

const idOf = (n: number | null | undefined): string => (n == null ? "" : String(n));

function initialValues(item: TeacherRosterItemDto | null): FormValues {
  const today = todayEcuador();
  const minDate = item ? addDays(item.structureStartDate, 1) : today;
  // Si hay una acción de escalafón posterior a la estructura, su fecha es la fecha efectiva natural.
  const pending = item?.pendingScaleActionDate;
  const effective = pending && pending >= minDate && pending <= today ? pending : today;
  return {
    categoryTypeId: idOf(item?.categoryTypeId),
    levelTypeId: idOf(item?.levelTypeId),
    dedicationTypeId: idOf(item?.dedicationTypeId),
    weeklyClassHours: item?.weeklyClassHours != null ? String(item.weeklyClassHours) : "",
    effectiveDate: effective < minDate ? minDate : effective,
    reason: "",
  };
}

export function TeacherStructureChangeDialog({
  open, onOpenChange, onDirtyChange, item, ladders, isSaving, onSubmit,
}: TeacherStructureChangeDialogProps) {
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: initialValues(null) });

  // Escalones titulares con nivel y dedicación definidos: son los únicos que una estructura puede usar.
  const options = useMemo(
    () => ladders.filter((l) => l.isActive && l.isTitular && l.levelTypeId != null && l.dedicationTypeId != null),
    [ladders],
  );

  useEffect(() => {
    if (open) form.reset(initialValues(item));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.teacherStructureId]);

  const isDirty = form.formState.isDirty;
  useEffect(() => { onDirtyChange(isDirty); }, [isDirty, onDirtyChange]);

  const categoryId = form.watch("categoryTypeId");
  const levelId = form.watch("levelTypeId");
  const dedicationId = form.watch("dedicationTypeId");
  const effectiveDate = form.watch("effectiveDate");

  const categories = useMemo(() => {
    const seen = new Map<number, string>();
    options.forEach((l) => { if (l.categoryTypeId != null) seen.set(l.categoryTypeId, l.categoryName ?? ""); });
    return [...seen].sort((a, b) => CATEGORY_ORDER.indexOf(a[1]) - CATEGORY_ORDER.indexOf(b[1]));
  }, [options]);

  const levels = useMemo(() => {
    const seen = new Map<number, string>();
    options.filter((l) => String(l.categoryTypeId) === categoryId)
      .forEach((l) => seen.set(l.levelTypeId!, l.levelName ?? ""));
    return [...seen].sort((a, b) => a[1].localeCompare(b[1]));
  }, [options, categoryId]);

  const dedications = useMemo(() => {
    const seen = new Map<number, string>();
    options.filter((l) => String(l.categoryTypeId) === categoryId && String(l.levelTypeId) === levelId)
      .forEach((l) => seen.set(l.dedicationTypeId!, l.dedicationName ?? ""));
    return [...seen].sort((a, b) => ["TC", "MT", "HORAS"].indexOf(a[1]) - ["TC", "MT", "HORAS"].indexOf(b[1]));
  }, [options, categoryId, levelId]);

  // Nivel y dedicación dependen de la categoría elegida: si el valor actual ya no es una opción válida se limpia.
  // Se decide por las opciones disponibles (no por eventos del Select), así abrir el diálogo nunca borra lo precargado.
  useEffect(() => {
    if (levelId && !levels.some(([id]) => String(id) === levelId)) form.setValue("levelTypeId", "", { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels, levelId]);
  useEffect(() => {
    if (dedicationId && !dedications.some(([id]) => String(id) === dedicationId)) form.setValue("dedicationTypeId", "", { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dedications, dedicationId]);

  const resolvedLadder = useMemo(
    () => options.find((l) =>
      String(l.categoryTypeId) === categoryId && String(l.levelTypeId) === levelId && String(l.dedicationTypeId) === dedicationId),
    [options, categoryId, levelId, dedicationId],
  );

  const minDate = item ? addDays(item.structureStartDate, 1) : todayEcuador();
  const maxDate = todayEcuador();
  const dateOutOfRange = !!effectiveDate && (effectiveDate < minDate || effectiveDate > maxDate);

  const err = form.formState.errors;

  const pick = (
    name: "categoryTypeId" | "levelTypeId" | "dedicationTypeId",
    label: string,
    entries: [number, string][],
    toLabel: (n: string) => string,
    onChanged?: () => void,
  ) => (
    <div className="space-y-1">
      <Label>{label} <span className="text-destructive">*</span></Label>
      <Select
        value={form.watch(name) || undefined}
        onValueChange={(v) => {
          // Radix Select sincroniza un <select> nativo oculto: al cambiar el valor antes de que existan sus opciones emite
          // un cambio con "" (y también repite el valor actual). Ninguna opción tiene valor vacío, así que ambos casos
          // son ruido y no una elección del usuario.
          if (!v || v === form.getValues(name)) return;
          form.setValue(name, v, { shouldDirty: true, shouldValidate: true });
          onChanged?.();
        }}
      >
        <SelectTrigger><SelectValue placeholder="Seleccione…" /></SelectTrigger>
        <SelectContent>
          {entries.map(([id, name]) => <SelectItem key={id} value={String(id)}>{toLabel(name)}</SelectItem>)}
        </SelectContent>
      </Select>
      {err[name] && <p className="text-xs text-destructive">{err[name]?.message}</p>}
    </div>
  );

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Actualizar estructura docente</DialogTitle>
          <DialogDescription>
            {item.fullName}. Se cierra la estructura vigente el día anterior a la fecha efectiva y se crea una nueva; el
            historial no se pierde. El sueldo no se modifica aquí: se registra con la acción de personal.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
          <div className="font-medium">Estructura vigente</div>
          <div>
            {categoryLabel(item.categoryName)} · {levelLabel(item.levelName)} · {dedicationLabel(item.dedicationName)}
            {item.weeklyClassHours != null ? ` · ${item.weeklyClassHours} h/semana` : ""}
          </div>
          <div className="text-xs text-muted-foreground">
            Desde {formatDate(item.structureStartDate, "es-EC", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
          {item.pendingScaleActionNumber && (
            <div className="flex items-start gap-1 text-xs text-warning pt-1">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>
                {item.pendingScaleActionType} {item.pendingScaleActionNumber} es posterior a esta estructura.
              </span>
            </div>
          )}
        </div>

        <form
          onSubmit={form.handleSubmit((v) => {
            if (!resolvedLadder) {
              form.setError("dedicationTypeId", { message: "No existe un escalón activo para esa combinación" });
              return;
            }
            if (dateOutOfRange) {
              form.setError("effectiveDate", { message: "La fecha está fuera del rango permitido" });
              return;
            }
            onSubmit({
              ladderId: resolvedLadder.ladderId,
              dedicationTypeId: Number(v.dedicationTypeId),
              weeklyClassHours: Number(v.weeklyClassHours),
              effectiveDate: v.effectiveDate,
              // null = conserva la dependencia de la estructura vigente.
              departmentId: null,
              reason: v.reason.trim(),
            });
          })}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {pick("categoryTypeId", "Categoría", categories, categoryLabel)}
            {pick("levelTypeId", "Nivel", levels, levelLabel)}
            {pick("dedicationTypeId", "Dedicación", dedications, dedicationLabel, () => {
              // Horas sugeridas por dedicación (TC 40, MT 20); tiempo parcial las define el usuario.
              const picked = dedications.find(([id]) => String(id) === form.getValues("dedicationTypeId"))?.[1];
              if (picked && DEFAULT_HOURS[picked]) form.setValue("weeklyClassHours", DEFAULT_HOURS[picked], { shouldDirty: true });
            })}
          </div>

          {resolvedLadder ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowRight className="h-3 w-3" />Escalón resultante: <strong>{resolvedLadder.name}</strong>
            </p>
          ) : (categoryId && levelId && dedicationId) ? (
            <p className="text-xs text-destructive">No existe un escalón activo para esa combinación.</p>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="weeklyClassHours">Horas semanales <span className="text-destructive">*</span></Label>
              <Input id="weeklyClassHours" type="number" min={1} max={60} step="0.5" {...form.register("weeklyClassHours")} />
              {err.weeklyClassHours && <p className="text-xs text-destructive">{err.weeklyClassHours.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="effectiveDate">Fecha efectiva <span className="text-destructive">*</span></Label>
              <Input id="effectiveDate" type="date" min={minDate} max={maxDate} {...form.register("effectiveDate")} />
              {err.effectiveDate && <p className="text-xs text-destructive">{err.effectiveDate.message}</p>}
              {!err.effectiveDate && dateOutOfRange && (
                <p className="text-xs text-destructive">
                  Debe estar entre {formatDate(minDate, "es-EC")} y {formatDate(maxDate, "es-EC")}.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reason">Motivo o documento <span className="text-destructive">*</span></Label>
            <Textarea
              id="reason"
              rows={3}
              maxLength={REASON_MAX}
              placeholder="ej: Promoción DTH-UTA-PRO-123-2026"
              {...form.register("reason")}
            />
            {err.reason && <p className="text-xs text-destructive">{err.reason.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || !resolvedLadder}>Aplicar cambio</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default TeacherStructureChangeDialog;
