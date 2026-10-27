// src/components/research-projects/ResearchProjectForm.tsx
import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, type FieldErrors, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { RESEARCH_PROJECT_DIRECTORY_CODE } from "@/features/constants";
import {
  buildResearchProjectSchema,
  participantBounds,
  type ParticipantFormValues,
  type ResearchProjectFormValues,
} from "@/features/researchProjects/researchProjectSchema";
import { ResearchProjectsAPI } from "@/lib/api";
import type { ResearchParticipationInput, ResearchProject } from "@/lib/api";
import { getServerErrorMessage } from "@/lib/api/utils/error-handling";
import { todayDateOnly } from "@/lib/dateOnly";
import { addOneDay, durationText } from "@/lib/researchDuration";
import { DirectoryFileField } from "@/components/shared/DirectoryFileField";
import { PersonPicker } from "./PersonPicker";
import { ResearchDocumentLink } from "./ResearchDocumentLink";

interface ResearchProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Id del proyecto a editar; vacío para registrar uno nuevo. */
  projectId?: number | null;
}

let draftCounter = 0;
const newParticipant = (): ParticipantFormValues => ({
  key: `p${++draftCounter}`,
  isExternal: false,
  person: null,
  externalFullName: "",
  externalIdentification: "",
  roleTypeId: "",
  startDate: "",
  endDate: "",
});

const emptyValues = (): ResearchProjectFormValues => ({
  name: "",
  startDate: "",
  endDate: "",
  approvalNumber: "",
  approvalFile: null,
  hasExtension: false,
  extensionNumber: "",
  extensionEndDate: "",
  extensionFile: null,
  completionNumber: "",
  completionFile: null,
  participants: [newParticipant()],
});

const valuesFrom = (p: ResearchProject): ResearchProjectFormValues => ({
  name: p.name,
  startDate: p.startDate,
  endDate: p.endDate,
  approvalNumber: p.approvalResolution.number,
  approvalFile: null,
  hasExtension: p.hasExtension,
  extensionNumber: p.extension?.resolutionNumber ?? "",
  extensionEndDate: p.extension?.endDate ?? "",
  extensionFile: null,
  completionNumber: p.completionResolution.number,
  completionFile: null,
  participants: p.participations.map((x) => ({
    key: `p${++draftCounter}`,
    id: x.id,
    isExternal: x.isExternal,
    person: x.isExternal || x.personId == null ? null : { personId: x.personId, idCard: x.identification ?? "", fullName: x.fullName },
    externalFullName: x.isExternal ? x.fullName : "",
    externalIdentification: x.isExternal ? x.identification ?? "" : "",
    roleTypeId: String(x.roleTypeId),
    startDate: x.startDate,
    endDate: x.endDate,
  })),
});

const typeId = (t: { typeID?: number; typeId?: number; id?: number }) => t.typeID ?? t.typeId ?? t.id ?? 0;

/** Aplana el árbol de errores de react-hook-form en hojas "ruta + mensaje", en el orden en que el esquema las reportó. */
function collectErrorLeaves(node: unknown, path = ""): { path: string; message: string }[] {
  if (!node || typeof node !== "object") return [];
  const n = node as Record<string, unknown>;
  if (typeof n.message === "string" && "type" in n) return [{ path, message: n.message }];
  return Object.entries(n)
    .filter(([key]) => key !== "ref")
    .flatMap(([key, child]) => collectErrorLeaves(child, path ? `${path}.${key}` : key));
}

export function ResearchProjectForm({ open, onOpenChange, projectId }: ResearchProjectFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = projectId != null;
  const [serverError, setServerError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const { data: roles } = useRefTypesByCategory(REF_TYPE_CATEGORIES.RESEARCH_PROJECT_ROLE, { enabled: open });

  const { data: loaded, isLoading: loadingProject } = useQuery({
    queryKey: ["research-project", projectId],
    queryFn: () => ResearchProjectsAPI.getById(projectId as number),
    enabled: open && isEdit,
    staleTime: 0,
  });
  const existing: ResearchProject | null = loaded?.status === "success" ? loaded.data : null;

  // "Hoy" se fija al abrir el diálogo (zona local del usuario).
  const today = useMemo(() => todayDateOnly(), [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const roleNameById = useMemo(() => Object.fromEntries(roles.map((r) => [String(typeId(r)), r.name])), [roles]);

  const schema = useMemo(
    () =>
      buildResearchProjectSchema({
        isEdit,
        today,
        roleNameById,
      }),
    [isEdit, existing, today, roleNameById],
  );

  const form = useForm<ResearchProjectFormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: emptyValues(),
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "participants", keyName: "fieldId" });

  // Al abrir: formulario limpio (nuevo) o con los datos del proyecto (edición).
  useEffect(() => {
    if (!open) return;
    setServerError(null);
    setHint(null);
    if (!isEdit) form.reset(emptyValues());
  }, [open, isEdit, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && existing) form.reset(valuesFrom(existing));
  }, [open, existing]); // eslint-disable-line react-hooks/exhaustive-deps

  const v = form.watch();
  const executionTime = durationText(v.startDate, v.endDate);
  const extensionTime = v.hasExtension && v.endDate && v.extensionEndDate ? durationText(addOneDay(v.endDate), v.extensionEndDate) : "";

  const save = useMutation({
    mutationFn: async (values: ResearchProjectFormValues) => {
      const input = {
        name: values.name.trim(),
        startDate: values.startDate,
        endDate: values.endDate,
        approvalResolutionNumber: values.approvalNumber.trim(),
        hasExtension: values.hasExtension,
        extensionResolutionNumber: values.hasExtension ? values.extensionNumber.trim() : undefined,
        extensionEndDate: values.hasExtension ? values.extensionEndDate : undefined,
        completionResolutionNumber: values.completionNumber.trim(),
        participations: values.participants.map<ResearchParticipationInput>((p) => ({
          id: p.id,
          isExternal: p.isExternal,
          personId: p.isExternal ? null : p.person?.personId ?? null,
          externalFullName: p.isExternal ? p.externalFullName.trim() : undefined,
          externalIdentification: p.isExternal ? p.externalIdentification.trim() : undefined,
          roleTypeId: Number(p.roleTypeId),
          startDate: p.startDate,
          endDate: p.endDate,
        })),
      };
      const files = { approvalFile: values.approvalFile, extensionFile: values.hasExtension ? values.extensionFile : null, completionFile: values.completionFile };
      return isEdit ? ResearchProjectsAPI.update(projectId as number, input, files) : ResearchProjectsAPI.create(input, files);
    },
    onSuccess: (resp) => {
      if (resp.status === "success") {
        void queryClient.invalidateQueries({ queryKey: ["research-projects"] });
        void queryClient.invalidateQueries({ queryKey: ["research-project"] });
        void queryClient.invalidateQueries({ queryKey: ["research-participations"] });
        toast({ title: isEdit ? "Proyecto actualizado" : "Proyecto registrado" });
        onOpenChange(false);
      } else {
        setServerError(getServerErrorMessage(resp.error) ?? "No se pudo guardar el proyecto.");
      }
    },
    onError: () => setServerError("No se pudo guardar el proyecto. Intente de nuevo más tarde."),
  });

  const busy = save.isPending;

  /** Descripción completa del rol elegido (para el tooltip: la columna es angosta y el texto se corta). */
  const roleLabel = (id: string) => {
    const r = roles.find((x) => String(typeId(x)) === id);
    return r ? r.description || r.name : "";
  };

  // Validación campo por campo: al enviar con errores solo se marca el PRIMER campo pendiente (los demás se validan
  // cuando se tocan), en vez de pintar todo el formulario en rojo de golpe.
  const onInvalid = (errors: FieldErrors<ResearchProjectFormValues>) => {
    const leaves = collectErrorLeaves(errors);
    if (leaves.length === 0) return;
    const [first, ...rest] = leaves;
    if (rest.length > 0) form.clearErrors(rest.map((l) => l.path) as FieldPath<ResearchProjectFormValues>[]);
    setHint(first.message);
  };

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    setHint(null);
    save.mutate(values);
  }, onInvalid);

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-[min(95vw,90rem)]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar proyecto de investigación" : "Nuevo proyecto de investigación"}</DialogTitle>
          <DialogDescription>Datos generales, resoluciones y participantes. Los campos con * son obligatorios.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="research-project-form" onSubmit={onSubmit} noValidate className="min-w-0 space-y-6 overflow-y-auto pr-1">
            {isEdit && loadingProject ? (
              <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando proyecto…
              </p>
            ) : (
              <>
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold">Datos generales del proyecto</h3>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel required>Nombre del proyecto de investigación</FormLabel>
                        <FormControl>
                          <Input {...f} maxLength={500} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel required>Fecha de inicio</FormLabel>
                          <FormControl>
                            <Input {...f} type="date" max={v.endDate && v.endDate < today ? v.endDate : today} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel required>Fecha de finalización</FormLabel>
                          <FormControl>
                            <Input {...f} type="date" min={v.startDate || undefined} max={today} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <Label>Tiempo de ejecución</Label>
                      <Input value={executionTime || "—"} readOnly disabled />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="approvalNumber"
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel required>Resolución de aprobación (número)</FormLabel>
                          <FormControl>
                            <Input {...f} maxLength={100} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="approvalFile"
                      render={({ field: f, fieldState }) => (
                        <DirectoryFileField
                          directoryCode={RESEARCH_PROJECT_DIRECTORY_CODE}
                          label="Archivo de la resolución de aprobación (opcional)"
                          value={f.value}
                          onChange={f.onChange}
                          error={fieldState.error?.message}
                          disabled={busy}
                          existing={isEdit && existing ? <ResearchDocumentLink label="Ver archivo actual" url={existing.approvalResolution.documentUrl} fileName={existing.approvalResolution.fileName} /> : undefined}
                        />
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="hasExtension"
                    render={({ field: f }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={f.value} onCheckedChange={(c) => f.onChange(c === true)} />
                        </FormControl>
                        <FormLabel className="font-normal">El proyecto tuvo prórroga</FormLabel>
                      </FormItem>
                    )}
                  />

                  {v.hasExtension && (
                    <div className="grid gap-4 rounded-md border p-3 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="extensionNumber"
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel required>Resolución de prórroga (número)</FormLabel>
                            <FormControl>
                              <Input {...f} maxLength={100} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="extensionEndDate"
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel required>Fecha de fin de la prórroga</FormLabel>
                            <FormControl>
                              <Input {...f} type="date" min={v.endDate ? addOneDay(v.endDate) : undefined} max={today} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                        <Label>Tiempo de prórroga</Label>
                        <Input value={extensionTime || "—"} readOnly disabled />
                      </div>
                      <FormField
                        control={form.control}
                        name="extensionFile"
                        render={({ field: f, fieldState }) => (
                          <DirectoryFileField
                            directoryCode={RESEARCH_PROJECT_DIRECTORY_CODE}
                            label="Archivo de la resolución de prórroga (opcional)"
                            value={f.value}
                            onChange={f.onChange}
                            error={fieldState.error?.message}
                            disabled={busy}
                            existing={isEdit && existing?.extension ? <ResearchDocumentLink label="Ver archivo actual" url={existing.extension.documentUrl} fileName={existing.extension.fileName} /> : undefined}
                          />
                        )}
                      />
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="completionNumber"
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel required>Resolución de finalización (número)</FormLabel>
                          <FormControl>
                            <Input {...f} maxLength={100} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="completionFile"
                      render={({ field: f, fieldState }) => (
                        <DirectoryFileField
                          directoryCode={RESEARCH_PROJECT_DIRECTORY_CODE}
                          label="Archivo de la resolución de finalización (opcional)"
                          value={f.value}
                          onChange={f.onChange}
                          error={fieldState.error?.message}
                          disabled={busy}
                          existing={isEdit && existing ? <ResearchDocumentLink label="Ver archivo actual" url={existing.completionResolution.documentUrl} fileName={existing.completionResolution.fileName} /> : undefined}
                        />
                      )}
                    />
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Datos por participante</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => append(newParticipant())}>
                      <Plus className="mr-2 h-4 w-4" /> Agregar participante
                    </Button>
                  </div>
                  {form.formState.errors.participants?.message && (
                    <p className="text-sm text-destructive">{form.formState.errors.participants.message}</p>
                  )}

                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[78rem] table-fixed text-sm">
                      <colgroup>
                        <col className="w-[6.5rem]" />
                        <col className="w-[22rem]" />
                        <col className="w-[8.5rem]" />
                        <col className="w-[12rem]" />
                        <col className="w-[10rem]" />
                        <col className="w-[10rem]" />
                        <col className="w-[6rem]" />
                        <col className="w-[2.5rem]" />
                      </colgroup>
                      <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="px-2 py-2 font-medium">Tipo</th>
                          <th className="px-2 py-2 font-medium">Nombre completo *</th>
                          <th className="px-2 py-2 font-medium">Cédula *</th>
                          <th className="px-2 py-2 font-medium">Rol desempeñado *</th>
                          <th className="px-2 py-2 font-medium">Inicio funciones *</th>
                          <th className="px-2 py-2 font-medium">Fin funciones *</th>
                          <th className="px-2 py-2 font-medium">Tiempo en el rol</th>
                          <th className="px-2 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((row, i) => {
                          const p = v.participants?.[i];
                          const base = `participants.${i}` as const;
                          const bounds = participantBounds(v, today);
                          return (
                            <tr key={row.fieldId} className="border-t align-top">
                              <td className="px-2 py-2">
                                <FormField
                                  control={form.control}
                                  name={`${base}.isExternal`}
                                  render={({ field: f }) => (
                                    <FormItem className="space-y-0">
                                      <Select value={f.value ? "external" : "internal"} onValueChange={(x) => f.onChange(x === "external")}>
                                        <FormControl>
                                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="internal">Interno</SelectItem>
                                          <SelectItem value="external">Externo</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                              </td>
                              <td className="px-2 py-2">
                                {p?.isExternal ? (
                                  <FormField
                                    control={form.control}
                                    name={`${base}.externalFullName`}
                                    render={({ field: f }) => (
                                      <FormItem className="space-y-1">
                                        <FormControl><Input {...f} className="h-9" maxLength={300} placeholder="Nombre completo" /></FormControl>
                                        <FormMessage className="text-xs" />
                                      </FormItem>
                                    )}
                                  />
                                ) : (
                                  <FormField
                                    control={form.control}
                                    name={`${base}.person`}
                                    render={({ field: f }) => (
                                      <FormItem className="space-y-1">
                                        <PersonPicker value={f.value} onChange={f.onChange} />
                                        <FormMessage className="text-xs" />
                                      </FormItem>
                                    )}
                                  />
                                )}
                              </td>
                              <td className="px-2 py-2">
                                {p?.isExternal ? (
                                  <FormField
                                    control={form.control}
                                    name={`${base}.externalIdentification`}
                                    render={({ field: f }) => (
                                      <FormItem className="space-y-1">
                                        <FormControl><Input {...f} className="h-9" maxLength={30} placeholder="Cédula" /></FormControl>
                                        <FormMessage className="text-xs" />
                                      </FormItem>
                                    )}
                                  />
                                ) : (
                                  <span className="flex h-9 items-center text-muted-foreground">{p?.person?.idCard || "—"}</span>
                                )}
                              </td>
                              <td className="px-2 py-2">
                                <FormField
                                  control={form.control}
                                  name={`${base}.roleTypeId`}
                                  render={({ field: f }) => (
                                    <FormItem className="space-y-1">
                                      <Select value={f.value} onValueChange={f.onChange}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <FormControl>
                                              <SelectTrigger className="h-9"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                            </FormControl>
                                          </TooltipTrigger>
                                          {roleLabel(f.value) && <TooltipContent>{roleLabel(f.value)}</TooltipContent>}
                                        </Tooltip>
                                        <SelectContent className="min-w-[14rem]">
                                          {roles.map((r) => (
                                            <SelectItem key={typeId(r)} value={String(typeId(r))}>{r.description || r.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage className="text-xs" />
                                    </FormItem>
                                  )}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <FormField
                                  control={form.control}
                                  name={`${base}.startDate`}
                                  render={({ field: f }) => (
                                    <FormItem className="space-y-1">
                                      <FormControl><Input {...f} type="date" className="h-9 px-2" min={bounds.min} max={bounds.max} /></FormControl>
                                      <FormMessage className="text-xs" />
                                    </FormItem>
                                  )}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <FormField
                                  control={form.control}
                                  name={`${base}.endDate`}
                                  render={({ field: f }) => (
                                    <FormItem className="space-y-1">
                                      <FormControl><Input {...f} type="date" className="h-9 px-2" min={bounds.min} max={bounds.max} /></FormControl>
                                      <FormMessage className="text-xs" />
                                    </FormItem>
                                  )}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <span className="flex h-9 items-center text-muted-foreground">{durationText(p?.startDate ?? "", p?.endDate ?? "") || "—"}</span>
                              </td>
                              <td className="px-1 py-2">
                                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label="Quitar participante" disabled={fields.length === 1} onClick={() => remove(i)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </form>
        </Form>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          {hint && !serverError && (
            <Alert>
              <AlertDescription className="break-words">Falta completar: {hint}</AlertDescription>
            </Alert>
          )}
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription className="break-words">{serverError}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" form="research-project-form" disabled={busy || (isEdit && loadingProject)}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Registrar proyecto"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
