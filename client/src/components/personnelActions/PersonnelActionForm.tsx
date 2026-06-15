// src/components/personnelActions/PersonnelActionForm.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmployeeCombobox } from '@/components/ui/EmployeeCombobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Save, FileText, Eye, Download, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { usePersonnelActionLookups } from '@/hooks/personnelActions/usePersonnelActionLookups';
import { EmpleadosAPI, TiposReferenciaAPI /*, DepartmentAuthoritiesAPI */ } from '@/lib/api';
import type { RefType } from '@/lib/api';
import { PersonSearchCombobox } from './PersonSearchCombobox';
import { DepartmentSelect } from '@/components/departments/DepartmentSelect';
import { JobSelect } from '@/components/ui/JobSelect';
import { PersonnelActionsAPI } from '@/lib/api/services/contracts';
import type { PersonDto } from '@/lib/api';
// import type { DepartmentAuthorityDto } from '@/lib/api/services/departmentAuthorities';
import type {
  CreatePersonnelActionRequest,
  PersonnelActionDetail,
} from '@/types/personnel-actions';

function formatDateDisplay(isoDate: string): string {
  const d = isoDate.slice(0, 10);
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function mapActionTypeToCheckbox(name?: string): string | null {
  if (!name) return null;
  const n = name.toUpperCase();
  if (n.includes('INGRESO') && !n.includes('REIN')) return 'CB_INGRESO';
  if (n.includes('REINGRESO'))  return 'CB_REINGRESO';
  if (n.includes('RESTITU'))    return 'CB_RESTITUCION';
  if (n.includes('ASCENSO'))    return 'CB_ASCENSO';
  if (n.includes('TRASLADO'))   return 'CB_TRASLADO';
  if (n.includes('TRASPASO'))   return 'CB_TRASPASO';
  if (n.includes('CAMBIO'))     return 'CB_CAMBIO_ADMIN';
  if (n.includes('INTERCAMBIO'))return 'CB_INTERCAMBIO';
  if (n.includes('LICENCIA'))   return 'CB_LICENCIA';
  if (n.includes('COMISI'))     return 'CB_COMISION';
  if (n.includes('SANCI'))      return 'CB_SANCIONES';
  if (n.includes('INCREMENTO')) return 'CB_INCREMENTO_RMU';
  if (n.includes('RECATEGORI') || n.includes('REVISI')) return 'CB_REVISION_CLASI';
  if (n.includes('SUBROGACI'))  return 'CB_SUBROGACION';
  if (n.includes('ENCARGO'))    return 'CB_ENCARGO';
  if (n.includes('CESACI'))     return 'CB_CESACION';
  if (n.includes('DESTITUCI'))  return 'CB_DESTITUCION';
  if (n.includes('VACACI'))     return 'CB_VACACIONES';
  return 'CB_OTRO';
}

function base64ToBlob(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'application/pdf' });
}

const schema = z.object({
  employeeId:   z.coerce.number().nonnegative(),
  actionTypeId: z.coerce.number().positive('Requerido'),
  actionNumber: z.string().optional(),
  actionDate:   z.string().min(1, 'Requerido'),
  effectiveDate: z.string().optional(),
  endDate:       z.string().optional(),
  originDepartmentId:   z.coerce.number().optional().nullable(),
  originJobId:          z.coerce.number().optional().nullable(),
  originBudgetCode:     z.string().optional(),
  destinationDepartmentId: z.coerce.number().optional().nullable(),
  destinationJobId:        z.coerce.number().optional().nullable(),
  destinationBudgetCode:   z.string().optional(),
  previousRmu: z.coerce.number().optional().nullable(),
  newRmu:      z.coerce.number().optional().nullable(),
  legalBasis:   z.string().optional(),
  reason:       z.string().optional(),
  observations: z.string().optional(),
  // Régimen laboral para nuevo ingreso
  employeeTypeId: z.coerce.number().optional().nullable(),
  // Clasificación de la acción
  swornDeclaration:     z.boolean().default(false),
  institutionalProcess: z.coerce.number().optional().nullable(),
  managementLevel:      z.coerce.number().optional().nullable(),
  // Responsables del documento
  dthDirectorId:        z.coerce.number().optional().nullable(),
  authorityNominatorId: z.coerce.number().optional().nullable(),
  elaboratorId:         z.coerce.number().optional().nullable(),
  reviewerId:           z.coerce.number().optional().nullable(),
  registrarId:          z.coerce.number().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  defaultValues?: Partial<PersonnelActionDetail>;
  isEdit?: boolean;
  isBusy?: boolean;
  onSubmit: (data: CreatePersonnelActionRequest) => void;
  onCancel: () => void;
};

function toDateInput(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getNumberId(item: any, keys: string[]): number | null {
  for (const key of keys) {
    const value = Number(item?.[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function uniqueById<T>(
  items: T[] | undefined,
  getId: (item: T) => number | null
): Array<{ item: T; id: number }> {
  const seen = new Set<number>();
  return (items ?? []).reduce<Array<{ item: T; id: number }>>((acc, item) => {
    const id = getId(item);
    if (!id || seen.has(id)) return acc;
    seen.add(id);
    acc.push({ item, id });
    return acc;
  }, []);
}

// Shown when a person has multiple employee records and the user must pick one
function EmployeeSelectDialog({
  open,
  candidates,
  onSelect,
  onCancel,
}: {
  open: boolean;
  candidates: any[];
  onSelect: (emp: any) => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seleccionar empleado</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-2">
          Esta persona tiene múltiples registros de empleado activo.
          Selecciona al que aplica la acción:
        </p>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {candidates.map((emp) => {
            const empId = emp.employeeID ?? emp.employeeId ?? emp.EmployeeID;
            const dept = emp.department ?? emp.Department ?? emp.departmentName ?? '—';
            const job  = emp.jobName ?? emp.JobName ?? emp.description ?? emp.Description ?? '—';
            const hireDate = emp.hireDate ?? emp.HireDate;
            return (
              <button
                key={empId}
                type="button"
                onClick={() => onSelect(emp)}
                className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <p className="font-medium text-sm">Empleado #{empId}</p>
                <p className="text-xs text-muted-foreground">{dept} · {job}</p>
                {hireDate && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Contratado: {String(hireDate).slice(0, 10)}
                  </p>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end pt-2">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PersonnelActionForm({
  defaultValues,
  isEdit,
  isBusy,
  onSubmit,
  onCancel,
}: Props) {
  const { toast } = useToast();
  const { jobs, actionTypes, isLoading } = usePersonnelActionLookups(true);

  const STALE = 5 * 60 * 1000;
  const { data: instProcData } = useQuery({
    queryKey: ['ref-types', 'AP_PROCESO_INSTITUCIONAL'],
    queryFn: () => TiposReferenciaAPI.byCategory('AP_PROCESO_INSTITUCIONAL'),
    staleTime: STALE,
  });
  const institutionalProcessOptions: RefType[] =
    instProcData?.status === 'success' ? (instProcData.data ?? []) : [];

  const { data: mgmtLevelData } = useQuery({
    queryKey: ['ref-types', 'AP_NIVEL_GESTION'],
    queryFn: () => TiposReferenciaAPI.byCategory('AP_NIVEL_GESTION'),
    staleTime: STALE,
  });
  const managementLevelOptions: RefType[] =
    mgmtLevelData?.status === 'success' ? (mgmtLevelData.data ?? []) : [];

  // Deshabilitado: los responsables ahora se seleccionan con EmployeeCombobox (búsqueda libre).
  // Descomentar si se requiere volver a poblar desde Autoridades de Departamento.
  // const { data: authoritiesResp } = useQuery({
  //   queryKey: ['department-authorities-active'],
  //   queryFn: () => DepartmentAuthoritiesAPI.listPaged({ page: 1, pageSize: 200, onlyActive: true }),
  //   staleTime: 5 * 60 * 1000,
  // });
  // const authorities: DepartmentAuthorityDto[] =
  //   authoritiesResp?.status === 'success' ? (authoritiesResp.data?.items ?? []) : [];

  // true solo cuando el usuario quiere una fecha fin específica (distinta de 9999-12-31)
  const [useEndDate, setUseEndDate] = useState(
    () => !!defaultValues?.endDate && !defaultValues.endDate.startsWith('9999')
  );

  // personId del combobox (solo para display del checkmark, no se envía al backend)
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

  // Resolución de empleado cuando hay múltiples registros
  const [employeeCandidates, setEmployeeCandidates] = useState<any[]>([]);
  const [employeeSelectOpen, setEmployeeSelectOpen] = useState(false);
  const [resolvingEmployee, setResolvingEmployee] = useState(false);
  // true cuando la persona seleccionada no tiene registro de empleado activo
  const [personHasNoEmployee, setPersonHasNoEmployee] = useState(false);
  // true cuando el tipo de acción seleccionado requiere crear usuario (ingreso nuevo)
  const [actionRequiresUserCreation, setActionRequiresUserCreation] = useState(false);

  const { data: contractTypeData } = useQuery({
    queryKey: ['ref-types', 'CONTRACT_TYPE'],
    queryFn: () => TiposReferenciaAPI.byCategory('CONTRACT_TYPE'),
    staleTime: STALE,
    enabled: actionRequiresUserCreation && personHasNoEmployee,
  });
  const contractTypeOptions: RefType[] =
    contractTypeData?.status === 'success' ? (contractTypeData.data ?? []) : [];
  // paso actual del wizard (solo en modo creación)
  const [wizardStep, setWizardStep] = useState(1);

  // Controla si el submit debe incluir generateDocument: true
  const generateOnSaveRef = useRef(false);

  const actionTypeOptions = uniqueById(actionTypes, (t: any) =>
    getNumberId(t, ['personnelActionTypeId', 'typeID', 'typeId', 'typeid', 'id'])
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId:    defaultValues?.employeeId ?? undefined,
      actionTypeId: defaultValues?.actionTypeId ?? undefined,
      actionNumber:  defaultValues?.actionNumber ?? '',
      actionDate:    toDateInput(defaultValues?.actionDate) || today(),
      effectiveDate: toDateInput(defaultValues?.effectiveDate) || today(),
      endDate:       toDateInput(defaultValues?.endDate),
      originDepartmentId:   defaultValues?.originDepartmentId ?? null,
      originJobId:          defaultValues?.originJobId ?? null,
      originBudgetCode:     defaultValues?.originBudgetCode ?? '',
      destinationDepartmentId: defaultValues?.destinationDepartmentId ?? null,
      destinationJobId:        defaultValues?.destinationJobId ?? null,
      destinationBudgetCode:   defaultValues?.destinationBudgetCode ?? '',
      previousRmu: defaultValues?.previousRmu ?? null,
      newRmu:      defaultValues?.newRmu ?? null,
      legalBasis:   defaultValues?.legalBasis ?? '',
      reason:       defaultValues?.reason ?? '',
      observations: defaultValues?.observations ?? '',
      swornDeclaration:     defaultValues?.swornDeclaration ?? false,
      institutionalProcess: defaultValues?.institutionalProcess ?? null,
      managementLevel:      defaultValues?.managementLevel ?? null,
      employeeTypeId:       defaultValues?.employeeTypeId ?? null,
      dthDirectorId:        defaultValues?.dthDirectorId ?? null,
      authorityNominatorId: defaultValues?.authorityNominatorId ?? null,
      elaboratorId:         defaultValues?.elaboratorId ?? null,
      reviewerId:           defaultValues?.reviewerId ?? null,
      registrarId:          defaultValues?.registrarId ?? null,
    },
  });

  useEffect(() => {
    if (!defaultValues) return;
    setUseEndDate(!!defaultValues.endDate && !defaultValues.endDate.startsWith('9999'));
    form.reset({
      employeeId:    defaultValues.employeeId ?? undefined,
      actionTypeId: defaultValues.actionTypeId ?? undefined,
      actionNumber:  defaultValues.actionNumber ?? '',
      actionDate:    toDateInput(defaultValues.actionDate) || today(),
      effectiveDate: toDateInput(defaultValues.effectiveDate) || today(),
      endDate:       toDateInput(defaultValues.endDate),
      originDepartmentId:   defaultValues.originDepartmentId ?? null,
      originJobId:          defaultValues.originJobId ?? null,
      originBudgetCode:     defaultValues.originBudgetCode ?? '',
      destinationDepartmentId: defaultValues.destinationDepartmentId ?? null,
      destinationJobId:        defaultValues.destinationJobId ?? null,
      destinationBudgetCode:   defaultValues.destinationBudgetCode ?? '',
      previousRmu: defaultValues.previousRmu ?? null,
      newRmu:      defaultValues.newRmu ?? null,
      legalBasis:   defaultValues.legalBasis ?? '',
      reason:       defaultValues.reason ?? '',
      observations: defaultValues.observations ?? '',
      swornDeclaration:     defaultValues.swornDeclaration ?? false,
      institutionalProcess: defaultValues.institutionalProcess ?? null,
      managementLevel:      defaultValues.managementLevel ?? null,
      employeeTypeId:       defaultValues.employeeTypeId ?? null,
      dthDirectorId:        defaultValues.dthDirectorId ?? null,
      authorityNominatorId: defaultValues.authorityNominatorId ?? null,
      elaboratorId:         defaultValues.elaboratorId ?? null,
      reviewerId:           defaultValues.reviewerId ?? null,
      registrarId:          defaultValues.registrarId ?? null,
    });
  }, [defaultValues, form]);

  // Valores reactivos para validación del wizard y efectos secundarios
  const watchedOriginJobId      = form.watch('originJobId');
  const watchedDestinationJobId = form.watch('destinationJobId');
  const watchedActionTypeId     = form.watch('actionTypeId');
  const watchedEmployeeId       = form.watch('employeeId');
  const watchedActionDate       = form.watch('actionDate');

  useEffect(() => {
    if (!watchedOriginJobId || jobs.length === 0) return;
    const job = jobs.find((j) => j.jobID === watchedOriginJobId);
    form.setValue('previousRmu', job?.rmu ?? null);
  }, [watchedOriginJobId, jobs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!watchedDestinationJobId || jobs.length === 0) return;
    const job = jobs.find((j) => j.jobID === watchedDestinationJobId);
    form.setValue('newRmu', job?.rmu ?? null);
  }, [watchedDestinationJobId, jobs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aplica el empleado seleccionado al formulario y auto-rellena campos de origen
  const applyEmployee = (emp: any) => {
    setPersonHasNoEmployee(false);
    const empId = getNumberId(emp, ['employeeID', 'employeeId', 'EmployeeID']);
    if (empId) form.setValue('employeeId', empId, { shouldValidate: true });

    const deptId = getNumberId(emp, ['departmentID', 'departmentId', 'DepartmentID']);
    const jobId  = getNumberId(emp, ['jobId', 'jobID', 'JobId', 'JobID']);
    if (deptId) form.setValue('originDepartmentId', deptId);
    if (jobId)  form.setValue('originJobId', jobId);
  };

  const handlePersonSelect = async (personId: number, _person: PersonDto) => {
    setSelectedPersonId(personId);
    setPersonHasNoEmployee(false);
    form.setValue('originDepartmentId', null);
    form.setValue('originJobId', null);
    form.setValue('originBudgetCode', '');

    setResolvingEmployee(true);
    try {
      const resp = await EmpleadosAPI.byPersonId(personId);
      const employees: any[] = resp.status === 'success' ? (resp.data ?? []) : [];

      if (employees.length === 0) {
        form.setValue('employeeId', 0, { shouldValidate: false });
        setPersonHasNoEmployee(true);

        const currentActionTypeId = form.getValues('actionTypeId');
        const currentActionType = actionTypeOptions.find(({ id }) => id === currentActionTypeId)?.item;

        if (currentActionType?.requiresAdUserCreation) {
          toast({
            title: 'Persona sin empleado activo',
            description: 'El empleado y usuario se crearán automáticamente al cargar el documento firmado.',
          });
        } else {
          toast({
            title: 'Sin registro de empleado',
            description: 'Esta persona no tiene empleado activo. Solo podrás crear la acción si el tipo de acción requiere creación de usuario.',
          });
        }
        return;
      }

      if (employees.length === 1) {
        applyEmployee(employees[0]);
      } else {
        setEmployeeCandidates(employees);
        setEmployeeSelectOpen(true);
      }
    } catch {
      // La validación bloqueará el submit si employeeId no está establecido
    } finally {
      setResolvingEmployee(false);
    }
  };

  const handleEmployeeSelect = (emp: any) => {
    applyEmployee(emp);
    setEmployeeSelectOpen(false);
    setEmployeeCandidates([]);
  };

  const handleEmployeeSelectCancel = () => {
    setEmployeeSelectOpen(false);
    setEmployeeCandidates([]);
    setSelectedPersonId(null);
    setPersonHasNoEmployee(false);
  };

  const buildPayload = (values: FormValues, generateDocument: boolean): CreatePersonnelActionRequest => ({
    personId:     selectedPersonId ?? 0,
    employeeId:   values.employeeId,
    actionTypeId: values.actionTypeId,
    actionNumber:  values.actionNumber  || null,
    actionDate:    values.actionDate,
    effectiveDate: values.effectiveDate || null,
    endDate:       useEndDate ? (values.endDate || null) : '9999-12-31',
    originDepartmentId:   values.originDepartmentId ?? null,
    originJobId:          values.originJobId ?? null,
    originBudgetCode:     values.originBudgetCode || null,
    destinationDepartmentId: values.destinationDepartmentId ?? null,
    destinationJobId:        values.destinationJobId ?? null,
    destinationBudgetCode:   values.destinationBudgetCode || null,
    previousRmu: values.previousRmu ?? null,
    newRmu:      values.newRmu ?? null,
    legalBasis:   values.legalBasis   || null,
    reason:       values.reason       || null,
    observations: values.observations || null,
    employeeTypeId:       values.employeeTypeId ?? null,
    swornDeclaration:     values.swornDeclaration ?? false,
    institutionalProcess: values.institutionalProcess ?? null,
    managementLevel:      values.managementLevel ?? null,
    dthDirectorId:        values.dthDirectorId ?? null,
    authorityNominatorId: values.authorityNominatorId ?? null,
    elaboratorId:         values.elaboratorId ?? null,
    reviewerId:           values.reviewerId ?? null,
    registrarId:          values.registrarId ?? null,
    generateDocument,
  });

  const handleFormSubmit = (values: FormValues) => {
    if (values.employeeId === 0) {
      const selectedType = actionTypeOptions.find(({ id }) => id === values.actionTypeId)?.item;
      if (!selectedType?.requiresAdUserCreation) {
        form.setError('employeeId', {
          type: 'manual',
          message: 'El tipo de acción seleccionado requiere un empleado activo.',
        });
        return;
      }
      if (!(values.employeeTypeId ?? 0)) {
        form.setError('employeeTypeId', {
          type: 'manual',
          message: 'Selecciona el Régimen Laboral para crear la cuenta institucional.',
        });
        return;
      }
    }
    onSubmit(buildPayload(values, generateOnSaveRef.current));
  };

  // Validación de pasos del wizard: solo verifica que los campos mínimos de navegación
  // estén presentes. La validación de negocio completa ocurre al hacer submit.
  const step1Valid = (watchedActionTypeId ?? 0) > 0 && !resolvingEmployee && selectedPersonId != null;
  const step2Valid = true; // todos los campos del paso 2 son opcionales

  const canProceedStep = (step: number): boolean => {
    if (step === 1) return step1Valid;
    if (step === 2) return step2Valid;
    return true;
  };

  const submitDraft = () => {
    generateOnSaveRef.current = false;
    form.handleSubmit(handleFormSubmit)();
  };

  const submitAndGenerate = () => {
    generateOnSaveRef.current = true;
    form.handleSubmit(handleFormSubmit)();
  };

  const STEPS = [
    { label: 'Tipo y Persona' },
    { label: 'Posición y Sustento' },
    { label: 'Responsables' },
  ];

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            generateOnSaveRef.current = false;
            form.handleSubmit(handleFormSubmit)();
          }}
          className="space-y-6"
        >
          {/* ── Indicador de pasos (solo en creación) ── */}
          {!isEdit && (
            <div className="flex items-center gap-2">
              {STEPS.map((s, i) => {
                const step = i + 1;
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors shrink-0 ${
                        wizardStep > step ? 'bg-primary text-primary-foreground' :
                        wizardStep === step ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {wizardStep > step ? <CheckCircle2 className="h-4 w-4" /> : step}
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${wizardStep === step ? 'text-primary' : 'text-muted-foreground'}`}>
                        {s.label}
                      </span>
                    </div>
                    {step < STEPS.length && <div className="w-8 h-px bg-border mx-1 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* ══════════════════════════════════════════
              PASO 1: Tipo, Persona y Fechas
          ══════════════════════════════════════════ */}
          {(isEdit || wizardStep === 1) && <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* ── Tipo de Acción ── */}
            <FormField
              control={form.control}
              name="actionTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Acción *</FormLabel>
                  <Select
                    disabled={isLoading || isBusy}
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(v) => {
                      const typeId = Number(v);
                      field.onChange(typeId);
                      const selectedType = actionTypeOptions.find(({ id }) => id === typeId)?.item;
                      setActionRequiresUserCreation(selectedType?.requiresAdUserCreation ?? false);
                      if (!isEdit && selectedType) {
                        const nextSeq = selectedType.numberingLastSequence + 1;
                        const formatted = `${selectedType.numberingPrefix}-${String(nextSeq).padStart(3, '0')}`;
                        form.setValue('actionNumber', formatted);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoading ? 'Cargando…' : 'Seleccionar'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {actionTypeOptions.map(({ item: t, id }) => (
                        <SelectItem key={`action-type-${id}`} value={String(id)}>
                          {t.name ?? t.description ?? `Tipo ${id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── N° de Acción ── */}
            <FormField
              control={form.control}
              name="actionNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N° de Acción</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      readOnly
                      disabled
                      className="bg-muted"
                      placeholder="Auto"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Selector de Persona / Empleado ── */}
            <FormField
              control={form.control}
              name="employeeId"
              render={({ fieldState }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Persona / Empleado *</FormLabel>
                  <FormControl>
                    {isEdit ? (
                      <Input
                        value={defaultValues?.employeeFullName ?? ''}
                        disabled
                        className="bg-muted"
                      />
                    ) : (
                      <PersonSearchCombobox
                        value={selectedPersonId}
                        onSelect={handlePersonSelect}
                        disabled={isBusy || resolvingEmployee}
                      />
                    )}
                  </FormControl>
                  {resolvingEmployee && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Buscando registro de empleado…
                    </p>
                  )}
                  {!resolvingEmployee && personHasNoEmployee && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      Sin empleado activo. El empleado y usuario se crearán al cargar el documento firmado (requiere que el tipo de acción lo permita).
                    </p>
                  )}
                  {fieldState.error && <FormMessage />}
                </FormItem>
              )}
            />

            {/* ── Régimen Laboral (solo para nuevo ingreso con creación de usuario) ── */}
            {personHasNoEmployee && actionRequiresUserCreation && (
              <FormField
                control={form.control}
                name="employeeTypeId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>
                      Régimen Laboral <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      disabled={isBusy}
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar régimen…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contractTypeOptions.map((t) => {
                          const id = String(t.typeID ?? (t as any).typeId);
                          return (
                            <SelectItem key={id} value={id}>
                              {t.name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Determina el régimen bajo el que se creará el empleado y la cuenta institucional.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* ── Fechas ── */}
            <FormField
              control={form.control}
              name="actionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Acción *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={isBusy} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="effectiveDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Vigencia</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} disabled={isBusy} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => {
                const minDate = form.watch('effectiveDate') || undefined;
                return (
                  <FormItem>
                    <div className="flex items-center gap-2 mb-1">
                      <Checkbox
                        id="use-end-date"
                        checked={useEndDate}
                        disabled={isBusy}
                        onCheckedChange={(checked) => {
                          const enabled = !!checked;
                          setUseEndDate(enabled);
                          if (!enabled) field.onChange('');
                        }}
                      />
                      <FormLabel htmlFor="use-end-date" className="cursor-pointer select-none">
                        Especificar fecha de fin
                      </FormLabel>
                    </div>
                    {!useEndDate && (
                      <p className="text-xs text-muted-foreground">
                        Sin fecha de fin (vigencia indefinida — se enviará 31/12/9999)
                      </p>
                    )}
                    {useEndDate && (
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ''}
                          min={minDate}
                          disabled={isBusy}
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>

          {/* ── Clasificación de la Acción ── */}
          <fieldset className="border rounded-lg p-4 space-y-4">
            <legend className="text-sm font-semibold px-1">Clasificación de la Acción</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Proceso Institucional */}
              <FormField
                control={form.control}
                name="institutionalProcess"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proceso Institucional</FormLabel>
                    <Select
                      disabled={isBusy}
                      value={field.value ? String(field.value) : 'none'}
                      onValueChange={(v) => field.onChange(v === 'none' ? null : Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="— Sin categoría —" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">— Sin categoría —</SelectItem>
                        {institutionalProcessOptions.map((t) => {
                          const id = String(t.typeID ?? (t as any).typeId);
                          return (
                            <SelectItem key={id} value={id}>
                              {t.name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Nivel de Gestión */}
              <FormField
                control={form.control}
                name="managementLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nivel de Gestión</FormLabel>
                    <Select
                      disabled={isBusy}
                      value={field.value ? String(field.value) : 'none'}
                      onValueChange={(v) => field.onChange(v === 'none' ? null : Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="— Sin categoría —" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">— Sin categoría —</SelectItem>
                        {managementLevelOptions.map((t) => {
                          const id = String(t.typeID ?? (t as any).typeId);
                          return (
                            <SelectItem key={id} value={id}>
                              {t.name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Declaración Juramentada */}
              <FormField
                control={form.control}
                name="swornDeclaration"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 flex items-center gap-3 pt-1">
                    <FormControl>
                      <Checkbox
                        id="sworn-declaration"
                        checked={field.value ?? false}
                        disabled={isBusy}
                        onCheckedChange={(v) => field.onChange(!!v)}
                      />
                    </FormControl>
                    <FormLabel htmlFor="sworn-declaration" className="cursor-pointer select-none font-normal">
                      Incluye Declaración Juramentada
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </fieldset>
          </>}

          {/* ══════════════════════════════════════════
              PASO 2: Posición y Sustento
          ══════════════════════════════════════════ */}
          {(isEdit || wizardStep === 2) && <>

          {/* ── Posición Origen ── */}
          {!actionRequiresUserCreation && <fieldset className="border rounded-lg p-4 space-y-4">
            <legend className="text-sm font-semibold px-1">Posición Origen</legend>
            <div className="grid grid-cols-1 grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="originDepartmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <FormControl>
                      <DepartmentSelect
                        value={field.value ?? null}
                        onChange={(id) => field.onChange(id)}
                        disabled={isLoading || isBusy}
                        placeholder="Ninguno"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="originJobId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl>
                      <JobSelect
                        value={field.value ?? null}
                        onChange={(id) => field.onChange(id)}
                        disabled={isLoading || isBusy}
                        placeholder="Ninguno"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="originBudgetCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Presupuestario</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} disabled={isBusy} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="previousRmu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RMU</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value ?? ''}
                        readOnly
                        disabled
                        className="bg-muted"
                        placeholder="Auto"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </fieldset>}

          {/* ── Posición Destino ── */}
          <fieldset className="border rounded-lg p-4 space-y-4">
            <legend className="text-sm font-semibold px-1">Posición Destino</legend>
            <div className="grid grid-cols-1 grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="destinationDepartmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <FormControl>
                      <DepartmentSelect
                        value={field.value ?? null}
                        onChange={(id) => field.onChange(id)}
                        disabled={isLoading || isBusy}
                        placeholder="Ninguno"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destinationJobId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl>
                      <JobSelect
                        value={field.value ?? null}
                        onChange={(id) => field.onChange(id)}
                        disabled={isLoading || isBusy}
                        placeholder="Ninguno"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destinationBudgetCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Presupuestario</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} disabled={isBusy} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newRmu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RMU Nuevo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value ?? ''}
                        readOnly
                        disabled
                        className="bg-muted"
                        placeholder="Auto"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </fieldset>

          {/* ── Sustento ── */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="legalBasis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Legal</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} rows={2} disabled={isBusy} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} rows={2} disabled={isBusy} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} rows={3} disabled={isBusy} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          </>}

          {/* ══════════════════════════════════════════
              PASO 3: Responsables del Documento
          ══════════════════════════════════════════ */}
          {(isEdit || wizardStep === 3) && <>

          {/* ── Responsables del Documento ── */}
          <fieldset className="border rounded-lg p-4 space-y-4">
            <legend className="text-sm font-semibold px-1">Responsables del Documento</legend>
            <p className="text-xs text-muted-foreground -mt-2">
              Busca por nombre, cédula o cargo. Si se dejan en blanco, se resolverán automáticamente desde las Autoridades de Departamento.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  { name: 'dthDirectorId',        label: 'Director de Talento Humano' },
                  { name: 'authorityNominatorId',  label: 'Autoridad Nominadora' },
                  { name: 'elaboratorId',          label: 'Responsable de Elaboración' },
                  { name: 'reviewerId',            label: 'Responsable de Revisión' },
                  { name: 'registrarId',           label: 'Responsable de Registro y Control' },
                ] as const
              ).map(({ name, label }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <EmployeeCombobox
                          value={field.value ?? null}
                          onSelect={(id) => field.onChange(id)}
                          disabled={isBusy}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </fieldset>

          </>}

          {/* ── Botones de acción ── */}
          <div className="flex justify-between gap-3 flex-wrap pt-2 border-t">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isBusy}>
                Cancelar
              </Button>
              {!isEdit && wizardStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWizardStep((s) => s - 1)}
                  disabled={isBusy}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {isEdit ? (
                <Button type="submit" disabled={isBusy || isLoading}>
                  {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar Cambios
                </Button>
              ) : wizardStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={() => setWizardStep((s) => s + 1)}
                  disabled={isBusy || isLoading || !canProceedStep(wizardStep)}
                >
                  Siguiente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={submitDraft}
                    disabled={isBusy || isLoading}
                  >
                    {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Borrador
                  </Button>
                  <Button
                    type="button"
                    onClick={submitAndGenerate}
                    disabled={isBusy || isLoading}
                  >
                    {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <FileText className="mr-2 h-4 w-4" />
                    Crear y Generar Documento
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </Form>

      {/* Dialog de selección de empleado (persona con múltiples registros) */}
      <EmployeeSelectDialog
        open={employeeSelectOpen}
        candidates={employeeCandidates}
        onSelect={handleEmployeeSelect}
        onCancel={handleEmployeeSelectCancel}
      />
    </>
  );
}
