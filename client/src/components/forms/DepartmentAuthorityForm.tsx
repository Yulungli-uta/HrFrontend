// src/components/forms/DepartmentAuthorityForm.tsx
/**
 * Formulario para crear y editar Autoridades de Departamento.
 *
 * Principios aplicados:
 *  - SRP: cada Combobox maneja su propio estado de apertura/búsqueda.
 *  - OCP: los Comboboxes son reutilizables sin modificar el componente base.
 *  - DRY: el componente SearchCombobox encapsula el patrón Command+Popover.
 */
import { useState, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  AlertCircle,
  Building2,
  User2,
  Shield,
  Briefcase,
  Calendar,
  FileText,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  DepartmentAuthoritiesAPI,
  type DepartmentAuthorityDto,
  type DepartmentAuthorityCreateDto,
  type DepartmentAuthorityUpdateDto,
} from "@/lib/api";
import { DepartamentosAPI, VistaDetallesEmpleadosAPI } from "@/lib/api";
import { TiposReferenciaAPI, CargosAPI } from "@/lib/api";

// =============================================================================
// Tipos internos
// =============================================================================

interface DepartmentAuthorityFormProps {
  authority?: DepartmentAuthorityDto | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  departmentId: number | null;
  employeeId: number | null;
  authorityTypeId: number | null;
  jobId: number | null;
  denomination: string;
  startDate: string;
  endDate: string;
  resolutionCode: string;
  notes: string;
  isActive: boolean;
}

interface OptionItem {
  value: number;
  label: string;
  sublabel?: string;
}

// =============================================================================
// Componente reutilizable: SearchCombobox
// Encapsula el patrón Command + Popover con búsqueda en tiempo real.
// =============================================================================

interface SearchComboboxProps {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  options: OptionItem[];
  value: number | null;
  onChange: (value: number | null) => void;
  isLoading?: boolean;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

function SearchCombobox({
  label,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  options,
  value,
  onChange,
  isLoading = false,
  required = false,
  icon: Icon,
  disabled = false,
}: SearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const term = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(term) ||
        (o.sublabel?.toLowerCase().includes(term) ?? false)
    );
  }, [options, search]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="space-y-2">
      <Label>
        {Icon && <Icon className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />}
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || isLoading}
            className={cn(
              "w-full justify-between font-normal",
              !selected && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {isLoading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Cargando...
                </span>
              ) : selected ? (
                selected.label
              ) : (
                placeholder
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filtered.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={String(option.value)}
                    onSelect={() => {
                      onChange(option.value === value ? null : option.value);
                      setSearch("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === option.value ? "opacity-100 text-primary" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium">{option.label}</span>
                      {option.sublabel && (
                        <span className="text-xs text-muted-foreground truncate">
                          {option.sublabel}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// =============================================================================
// Formulario principal
// =============================================================================

export function DepartmentAuthorityForm({
  authority,
  onSuccess,
  onCancel,
}: DepartmentAuthorityFormProps) {
  const isEditing = !!authority;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Formulario ──────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    defaultValues: {
      departmentId:    authority?.departmentId    ?? null,
      employeeId:      authority?.employeeId      ?? null,
      authorityTypeId: authority?.authorityTypeId ?? null,
      jobId:           authority?.jobId           ?? null,
      denomination:    authority?.denomination    ?? "",
      startDate:       authority?.startDate       ?? "",
      endDate:         authority?.endDate         ?? "",
      resolutionCode:  authority?.resolutionCode  ?? "",
      notes:           authority?.notes           ?? "",
      isActive:        authority?.isActive        ?? true,
    },
  });

  const watchedDeptId = watch("departmentId");

  // ── Carga de datos para los Comboboxes ──────────────────────────────────────

  /** Departamentos */
  const { data: deptData, isLoading: loadingDepts } = useQuery({
    queryKey: ["departments-list"],
    queryFn:  () => DepartamentosAPI.list(),
    staleTime: 5 * 60 * 1000,
  });

  /** Empleados — lista completa paginada (se filtra en cliente) */
  const { data: empData, isLoading: loadingEmps } = useQuery({
    queryKey: ["employees-details-all"],
    queryFn:  () => VistaDetallesEmpleadosAPI.list(),
    staleTime: 5 * 60 * 1000,
  });

  /** Tipos de autoridad — filtrados por categoría AUTHORITY_TYPE */
  const { data: authTypeData, isLoading: loadingAuthTypes } = useQuery({
    queryKey: ["ref-types-authority"],
    queryFn:  () => TiposReferenciaAPI.byCategory("AUTHORITY_TYPE"),
    staleTime: 10 * 60 * 1000,
  });

  /** Cargos (Jobs) */
  const { data: jobData, isLoading: loadingJobs } = useQuery({
    queryKey: ["jobs-list"],
    queryFn:  () => CargosAPI.list(),
    staleTime: 10 * 60 * 1000,
  });

  // ── Normalización de opciones ────────────────────────────────────────────────

  const deptOptions = useMemo((): OptionItem[] => {
    const raw = (deptData as any)?.data ?? deptData ?? [];
    const arr = Array.isArray(raw) ? raw : raw?.items ?? [];
    return arr.map((d: any) => ({
      value:    d.departmentId ?? d.DepartmentId ?? d.id,
      label:    d.name ?? d.Name ?? d.departmentName ?? "—",
      sublabel: d.code ?? d.Code ?? d.alias ?? undefined,
    }));
  }, [deptData]);

  const empOptions = useMemo((): OptionItem[] => {
    const raw = (empData as any)?.data ?? empData ?? [];
    const arr = Array.isArray(raw) ? raw : raw?.items ?? [];
    return arr.map((e: any) => ({
      value:    e.employeeID ?? e.EmployeeID ?? e.employeeId,
      label:    `${e.firstName ?? e.FirstName ?? ""} ${e.lastName ?? e.LastName ?? ""}`.trim(),
      sublabel: e.idCard ?? e.IDCard ?? e.email ?? e.Email ?? undefined,
    }));
  }, [empData]);

  const authTypeOptions = useMemo((): OptionItem[] => {
    const raw = (authTypeData as any)?.data ?? authTypeData ?? [];
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map((t: any) => ({
      value:    t.typeID ?? t.typeId ?? t.id,
      label:    t.name ?? t.Name ?? "—",
      sublabel: t.description ?? t.Description ?? undefined,
    }));
  }, [authTypeData]);

  const jobOptions = useMemo((): OptionItem[] => {
    const raw = (jobData as any)?.data ?? jobData ?? [];
    const arr = Array.isArray(raw) ? raw : raw?.items ?? [];
    return arr.map((j: any) => ({
      value:    j.jobId ?? j.JobId ?? j.id,
      label:    j.name ?? j.Name ?? j.description ?? "—",
      sublabel: j.code ?? j.Code ?? undefined,
    }));
  }, [jobData]);

  // ── Mutaciones ───────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (dto: DepartmentAuthorityCreateDto) =>
      DepartmentAuthoritiesAPI.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-authorities"] });
      toast({
        title:       "Autoridad registrada",
        description: "La autoridad de departamento fue creada exitosamente.",
      });
      onSuccess();
    },
    onError: (err: any) => {
      toast({
        title:       "Error al crear",
        description: err?.message ?? "No se pudo crear la autoridad.",
        variant:     "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: DepartmentAuthorityUpdateDto }) =>
      DepartmentAuthoritiesAPI.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-authorities"] });
      toast({
        title:       "Autoridad actualizada",
        description: "Los cambios fueron guardados exitosamente.",
      });
      onSuccess();
    },
    onError: (err: any) => {
      toast({
        title:       "Error al actualizar",
        description: err?.message ?? "No se pudo actualizar la autoridad.",
        variant:     "destructive",
      });
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // ── Submit ───────────────────────────────────────────────────────────────────

  const onSubmit = useCallback(
    (data: FormData) => {
      if (!data.departmentId || !data.employeeId || !data.authorityTypeId || !data.startDate) {
        toast({
          title:       "Campos requeridos",
          description: "Departamento, Empleado, Tipo de Autoridad y Fecha de inicio son obligatorios.",
          variant:     "destructive",
        });
        return;
      }

      const dto: DepartmentAuthorityCreateDto = {
        departmentId:    data.departmentId,
        employeeId:      data.employeeId,
        authorityTypeId: data.authorityTypeId,
        jobId:           data.jobId ?? null,
        denomination:    data.denomination || null,
        startDate:       data.startDate,
        endDate:         data.endDate || null,
        resolutionCode:  data.resolutionCode || null,
        notes:           data.notes || null,
        isActive:        data.isActive,
      };

      if (isEditing && authority) {
        updateMutation.mutate({ id: authority.authorityId, dto });
      } else {
        createMutation.mutate(dto);
      }
    },
    [isEditing, authority, createMutation, updateMutation, toast]
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* ── Sección: Asignación ── */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Asignación
        </p>

        {/* Departamento */}
        <Controller
          name="departmentId"
          control={control}
          rules={{ required: "El departamento es requerido" }}
          render={({ field }) => (
            <div className="space-y-1">
              <SearchCombobox
                label="Departamento"
                placeholder="Seleccione un departamento..."
                searchPlaceholder="Buscar por nombre o código..."
                emptyMessage="No se encontraron departamentos."
                options={deptOptions}
                value={field.value}
                onChange={field.onChange}
                isLoading={loadingDepts}
                required
                icon={Building2}
              />
              {errors.departmentId && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.departmentId.message}
                </p>
              )}
            </div>
          )}
        />

        {/* Empleado */}
        <Controller
          name="employeeId"
          control={control}
          rules={{ required: "El empleado es requerido" }}
          render={({ field }) => (
            <div className="space-y-1">
              <SearchCombobox
                label="Empleado"
                placeholder="Buscar empleado por nombre o cédula..."
                searchPlaceholder="Nombre, apellido o cédula..."
                emptyMessage="No se encontraron empleados."
                options={empOptions}
                value={field.value}
                onChange={field.onChange}
                isLoading={loadingEmps}
                required
                icon={User2}
              />
              {errors.employeeId && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.employeeId.message}
                </p>
              )}
            </div>
          )}
        />

        {/* Tipo de Autoridad */}
        <Controller
          name="authorityTypeId"
          control={control}
          rules={{ required: "El tipo de autoridad es requerido" }}
          render={({ field }) => (
            <div className="space-y-1">
              <SearchCombobox
                label="Tipo de Autoridad"
                placeholder="Seleccione el tipo de autoridad..."
                searchPlaceholder="Buscar tipo de autoridad..."
                emptyMessage="No se encontraron tipos de autoridad."
                options={authTypeOptions}
                value={field.value}
                onChange={field.onChange}
                isLoading={loadingAuthTypes}
                required
                icon={Shield}
              />
              {errors.authorityTypeId && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.authorityTypeId.message}
                </p>
              )}
            </div>
          )}
        />

        {/* Cargo (opcional) */}
        <Controller
          name="jobId"
          control={control}
          render={({ field }) => (
            <SearchCombobox
              label="Cargo (opcional)"
              placeholder="Seleccione un cargo..."
              searchPlaceholder="Buscar cargo por nombre o código..."
              emptyMessage="No se encontraron cargos."
              options={jobOptions}
              value={field.value}
              onChange={field.onChange}
              isLoading={loadingJobs}
              icon={Briefcase}
            />
          )}
        />
      </div>

      {/* ── Sección: Denominación y Resolución ── */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Denominación y Resolución
        </p>

        {/* Denominación */}
        <div className="space-y-2">
          <Label htmlFor="denomination">
            <FileText className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            Denominación
          </Label>
          <Input
            id="denomination"
            {...register("denomination", { maxLength: { value: 200, message: "Máximo 200 caracteres" } })}
            placeholder="Ej: DECANO DE LA FACULTAD DE INGENIERÍA"
            className="uppercase-input"
          />
          {errors.denomination && (
            <p className="text-xs text-destructive">{errors.denomination.message}</p>
          )}
        </div>

        {/* Código de resolución */}
        <div className="space-y-2">
          <Label htmlFor="resolutionCode">
            Código de Resolución
          </Label>
          <Input
            id="resolutionCode"
            {...register("resolutionCode", { maxLength: { value: 100, message: "Máximo 100 caracteres" } })}
            placeholder="Ej: RES-2024-001"
          />
          {errors.resolutionCode && (
            <p className="text-xs text-destructive">{errors.resolutionCode.message}</p>
          )}
        </div>
      </div>

      {/* ── Sección: Vigencia ── */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Vigencia
        </p>

        <div className="grid grid-cols-2 gap-4">
          {/* Fecha de inicio */}
          <div className="space-y-2">
            <Label htmlFor="startDate">
              <Calendar className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              Fecha de Inicio <span className="text-destructive">*</span>
            </Label>
            <Input
              id="startDate"
              type="date"
              {...register("startDate", { required: "La fecha de inicio es requerida" })}
              className="bg-background text-foreground"
            />
            {errors.startDate && (
              <p className="text-xs text-destructive">{errors.startDate.message}</p>
            )}
          </div>

          {/* Fecha de fin */}
          <div className="space-y-2">
            <Label htmlFor="endDate">
              <Calendar className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              Fecha de Fin
              <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="endDate"
              type="date"
              {...register("endDate")}
              className="bg-background text-foreground"
            />
          </div>
        </div>
      </div>

      {/* ── Notas ── */}
      <div className="space-y-2">
        <Label htmlFor="notes">
          <StickyNote className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          Notas
          <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id="notes"
          {...register("notes", { maxLength: { value: 500, message: "Máximo 500 caracteres" } })}
          placeholder="Observaciones adicionales sobre esta autoridad..."
          rows={3}
          className="resize-none bg-background text-foreground"
        />
        {errors.notes && (
          <p className="text-xs text-destructive">{errors.notes.message}</p>
        )}
      </div>

      {/* ── Estado activo (solo en edición) ── */}
      {isEditing && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <input
            type="checkbox"
            id="isActive"
            {...register("isActive")}
            className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          />
          <Label htmlFor="isActive" className="cursor-pointer select-none">
            Autoridad activa
          </Label>
        </div>
      )}

      {/* ── Botones de acción ── */}
      <div className="flex justify-end gap-3 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[160px]"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEditing ? "Guardando..." : "Registrando..."}
            </span>
          ) : isEditing ? (
            "Guardar Cambios"
          ) : (
            "Registrar Autoridad"
          )}
        </Button>
      </div>
    </form>
  );
}
