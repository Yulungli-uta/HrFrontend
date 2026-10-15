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
import { DB_FIELD_LIMITS } from '@/features/dbFieldLimits';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Save, FileText, Eye, Download, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { usePersonnelActionLookups } from '@/hooks/personnelActions/usePersonnelActionLookups';
import { EmpleadosAPI, SalaryHistoryAPI /*, DepartmentAuthoritiesAPI */ } from '@/lib/api';
import { useRefTypesByCategory } from '@/hooks/useRefTypes';
import { REF_TYPE_CATEGORIES } from '@/features/refTypeCategories';
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
  actionNumber: z.string().max(50, 'No puede exceder 50 caracteres').optional(),
  actionDate:   z.string().min(1, 'La fecha de la acción es requerida'),
  effectiveDate: z.string().optional(),
  endDate:       z.string().optional(),
  originDepartmentId:   z.coerce.number().optional().nullable(),
  originJobId:          z.coerce.number().optional().nullable(),
  originBudgetCode:     z.string().max(50, 'No puede exceder 50 caracteres').optional(),
  originBudgetProgramCode: z.string().max(60, 'No puede exceder 60 caracteres').optional(),
  originInstitutionalProcess: z.coerce.number().optional().nullable(),
  originManagementLevel:      z.coerce.number().optional().nullable(),
  destinationDepartmentId: z.coerce.number().optional().nullable(),
  destinationJobId:        z.coerce.number().optional().nullable(),
  destinationBudgetCode:   z.string().max(50, 'No puede exceder 50 caracteres').optional(),
  destinationBudgetProgramCode: z.string().max(60, 'No puede exceder 60 caracteres').optional(),
  previousRmu: z.coerce.number().optional().nullable(),
  newRmu:      z.coerce.number().optional().nullable(),
  legalBasis:   z.string().max(500, 'No puede exceder 500 caracteres').optional(),
  reason:       z.string().max(1000, 'No puede exceder 1000 caracteres').optional(),
  observations: z.string().max(1000, 'No puede exceder 1000 caracteres').optional(),
  // Régimen laboral para nuevo ingreso
  employeeTypeId: z.coerce.number().optional().nullable(),
  // Clasificación de la acción
  swornDeclaration:     z.boolean().default(false),
  institutionalProcess: z.coerce.number().optional().nullable(),
  managementLevel:      z.coerce.number().optional().nullable(),
  workplace:            z.coerce.number().optional().nullable(),
  // Responsables del documento
  dthDirectorId:        z.coerce.number().optional().nullable(),
  authorityNominatorId: z.coerce.number().optional().nullable(),
  elaboratorId:         z.coerce.number().optional().nullable(),
  reviewerId:           z.coerce.number().optional().nullable(),
  registrarId:          z.coerce.number().optional().nullable(),
});

type FormValues = z.input<typeof schema>;

type Props = {
  defaultValues?: Partial<PersonnelActionDetail>;
  isEdit?: boolean;
  isBusy?: boolean;
  onSubmit: (data: CreatePersonnelActionRequest) => void;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  /**
   * Fecha máxima permitida (YYYY-MM-DD) para actionDate/effectiveDate/endDate.
   * Usado únicamente por la pantalla de "Ingresar Histórico" para exigir que
   * las fechas sean anteriores a hoy — un registro histórico ya concluyó.
   * Sin este prop, el comportamiento de creación normal no cambia.
   */
  maxDate?: string;
  /**
   * Habilita editar "N° de Acción" (normalmente autogenerado/solo lectura). Usado
   * ÚNICAMENTE por la pantalla de corrección (PersonnelActionsCorrection.tsx) para
   * arreglar números de documento cargados mal — no afecta creación, histórico ni
   * edición normal, que siguen dejando el campo automático.
   */
  allowActionNumberEdit?: boolean;
  /**
   * Habilita reasignar el empleado principal y los Responsables del Documento, incluyendo
   * personas/empleados inactivos hoy. Usado ÚNICAMENTE por las pantallas de corrección de
   * datos históricos (PersonnelActionsCorrection.tsx, PersonnelActionsHistoricalEntry.tsx) —
   * no afecta creación normal ni edición normal (PersonnelActions.tsx, PersonnelActionDetail.tsx),
   * que siguen restringidas a empleados activos.
   */
  allowInactiveEmployees?: boolean;
  /**
   * Habilita editar a mano el "RMU" de Posición Origen (normalmente autocalculado y de solo
   * lectura). Usado ÚNICAMENTE por Corrección de Acción de Personal y por Ingresar Histórico:
   * el valor autocalculado sale del último sueldo ACTUAL del empleado y no necesariamente
   * coincide con el que regía en la fecha de la acción. En creación normal y edición normal
   * el campo sigue automático y de solo lectura. En modo edición (isEdit) además se desactiva
   * el autocompletado para no pisar el valor ya guardado.
   */
  allowOriginRmuEdit?: boolean;
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
          <DialogDescription>
            Se encontraron varios registros de empleado para esta persona — elige el correcto.
          </DialogDescription>
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
  onDirtyChange,
  maxDate,
  allowActionNumberEdit,
  allowInactiveEmployees,
  allowOriginRmuEdit,
}: Props) {
  const { toast } = useToast();
  const { jobs, actionTypes, isLoading } = usePersonnelActionLookups(true);

  const { data: institutionalProcessOptions } = useRefTypesByCategory(REF_TYPE_CATEGORIES.AP_PROCESO_INSTITUCIONAL);
  const { data: managementLevelOptions } = useRefTypesByCategory(REF_TYPE_CATEGORIES.AP_NIVEL_GESTION);
  const { data: workplaceOptions } = useRefTypesByCategory(REF_TYPE_CATEGORIES.AP_LUGAR_TRABAJO);

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

  const { data: contractTypeOptions } = useRefTypesByCategory(REF_TYPE_CATEGORIES.CONTRACT_TYPE, {
    enabled: actionRequiresUserCreation && personHasNoEmployee,
  });
  // paso actual del wizard (solo en modo creación)
  const [wizardStep, setWizardStep] = useState(1);

  // Controla si el submit debe incluir generateDocument: true
  const generateOnSaveRef = useRef(false);

  const actionTypeOptions = uniqueById(actionTypes, (t: any) =>
    getNumberId(t, ['personnelActionTypeId', 'typeID', 'typeId', 'typeid', 'id'])
  );

  const _onDirtyChangeRef = useRef(onDirtyChange);
  _onDirtyChangeRef.current = onDirtyChange;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId:    defaultValues?.employeeId ?? undefined,
      actionTypeId: defaultValues?.actionTypeId ?? undefined,
      actionNumber:  defaultValues?.actionNumber ?? '',
      // Con maxDate (pantalla de histórico) no se precarga hoy — hoy mismo violaría
      // "debe ser anterior a hoy"; se deja vacío para forzar una elección explícita.
      actionDate:    toDateInput(defaultValues?.actionDate) || (maxDate ? '' : today()),
      effectiveDate: toDateInput(defaultValues?.effectiveDate) || (maxDate ? '' : today()),
      endDate:       toDateInput(defaultValues?.endDate),
      originDepartmentId:   defaultValues?.originDepartmentId ?? null,
      originJobId:          defaultValues?.originJobId ?? null,
      originBudgetCode:     defaultValues?.originBudgetCode ?? '',
      originBudgetProgramCode: defaultValues?.originBudgetProgramCode ?? '',
      originInstitutionalProcess: defaultValues?.originInstitutionalProcess ?? null,
      originManagementLevel:      defaultValues?.originManagementLevel ?? null,
      destinationDepartmentId: defaultValues?.destinationDepartmentId ?? null,
      destinationJobId:        defaultValues?.destinationJobId ?? null,
      destinationBudgetCode:   defaultValues?.destinationBudgetCode ?? '',
      destinationBudgetProgramCode: defaultValues?.destinationBudgetProgramCode ?? '',
      previousRmu: defaultValues?.previousRmu ?? null,
      newRmu:      defaultValues?.newRmu ?? null,
      legalBasis:   defaultValues?.legalBasis ?? '',
      reason:       defaultValues?.reason ?? '',
      observations: defaultValues?.observations ?? '',
      swornDeclaration:     defaultValues?.swornDeclaration ?? false,
      institutionalProcess: defaultValues?.institutionalProcess ?? null,
      managementLevel:      defaultValues?.managementLevel ?? null,
      workplace:            defaultValues?.workplace ?? null,
      employeeTypeId:       defaultValues?.employeeTypeId ?? null,
      dthDirectorId:        defaultValues?.dthDirectorId ?? null,
      authorityNominatorId: defaultValues?.authorityNominatorId ?? null,
      elaboratorId:         defaultValues?.elaboratorId ?? null,
      reviewerId:           defaultValues?.reviewerId ?? null,
      registrarId:          defaultValues?.registrarId ?? null,
    },
  });

  const _isDirty = form.formState.isDirty;
  useEffect(() => {
    _onDirtyChangeRef.current?.(_isDirty);
  }, [_isDirty]);

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
      originBudgetProgramCode: defaultValues.originBudgetProgramCode ?? '',
      originInstitutionalProcess: defaultValues.originInstitutionalProcess ?? null,
      originManagementLevel:      defaultValues.originManagementLevel ?? null,
      destinationDepartmentId: defaultValues.destinationDepartmentId ?? null,
      destinationJobId:        defaultValues.destinationJobId ?? null,
      destinationBudgetCode:   defaultValues.destinationBudgetCode ?? '',
      destinationBudgetProgramCode: defaultValues.destinationBudgetProgramCode ?? '',
      previousRmu: defaultValues.previousRmu ?? null,
      newRmu:      defaultValues.newRmu ?? null,
      legalBasis:   defaultValues.legalBasis ?? '',
      reason:       defaultValues.reason ?? '',
      observations: defaultValues.observations ?? '',
      swornDeclaration:     defaultValues.swornDeclaration ?? false,
      institutionalProcess: defaultValues.institutionalProcess ?? null,
      managementLevel:      defaultValues.managementLevel ?? null,
      workplace:            defaultValues.workplace ?? null,
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

  // RMU Origen: prioriza el historial salarial REAL del empleado (tbl_SalaryHistory) sobre el
  // catálogo de cargos — antes se leía job.rmu (RMU del Grupo Ocupacional vía vw_Jobs_WithDegreeAndGroup),
  // que queda null para ~35% de los cargos sin GroupID asignado. El backend ya resuelve el
  // fallback por cargo (ReferenceSalary/Grupo) si el empleado no tiene historial aún.
  useEffect(() => {
    if (!watchedEmployeeId) return;
    // Al corregir una acción existente, el RMU Origen ya guardado manda: recalcularlo aquí lo
    // reemplazaría por el último sueldo actual del empleado (el reset de la carga inicial
    // dispara este efecto) y la corrección lo grabaría sin que el usuario lo notara.
    if (isEdit && allowOriginRmuEdit) return;
    SalaryHistoryAPI.getReferenceRmu({ employeeId: watchedEmployeeId, jobId: watchedOriginJobId ?? undefined })
      .then((resp) => {
        // Si el usuario ya escribió un RMU a mano (Ingresar Histórico), no se lo pisa.
        if (allowOriginRmuEdit && form.getFieldState('previousRmu').isDirty) return;
        form.setValue('previousRmu', resp.status === 'success' ? resp.data.rmu : null);
      })
      .catch(() => {
        if (allowOriginRmuEdit && form.getFieldState('previousRmu').isDirty) return;
        form.setValue('previousRmu', null);
      });
  }, [watchedEmployeeId, watchedOriginJobId]); // eslint-disable-line react-hooks/exhaustive-deps

  // RMU Destino: solo sugiere un valor referencial por el cargo (mismo backend, sin employeeId
  // porque es un cargo prospectivo) — el campo queda editable para que RRHH pueda ajustarlo
  // a un valor más individual.
  useEffect(() => {
    if (!watchedDestinationJobId) return;
    // En Corrección el RMU Nuevo es el valor del documento ya guardado: sustituirlo por la referencia del cargo
    // (al abrir la acción o al cambiar el cargo) lo reemplazaba sin que el usuario lo notara y la corrección
    // volvía a grabar ese valor. En Histórico solo se sugiere mientras el usuario no haya escrito el suyo.
    if (allowOriginRmuEdit && (isEdit || form.getFieldState('newRmu').isDirty)) return;
    SalaryHistoryAPI.getReferenceRmu({ jobId: watchedDestinationJobId })
      .then((resp) => {
        if (allowOriginRmuEdit && form.getFieldState('newRmu').isDirty) return;
        form.setValue('newRmu', resp.status === 'success' ? resp.data.rmu : null);
      })
      .catch(() => {
        if (allowOriginRmuEdit && form.getFieldState('newRmu').isDirty) return;
        form.setValue('newRmu', null);
      });
  }, [watchedDestinationJobId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    form.setValue('originBudgetProgramCode', '');
    form.setValue('originInstitutionalProcess', null);
    form.setValue('originManagementLevel', null);

    setResolvingEmployee(true);
    try {
      const resp = await EmpleadosAPI.byPersonId(personId, allowInactiveEmployees);
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
    // Origen nuevo: 0 / '' = borrar lo guardado (el backend conserva lo guardado ante null y,
    // en una acción nueva, completa proceso/nivel desde la acción previa del empleado).
    originBudgetProgramCode:    values.originBudgetProgramCode ?? '',
    originInstitutionalProcess: values.originInstitutionalProcess ?? 0,
    originManagementLevel:      values.originManagementLevel ?? 0,
    destinationDepartmentId: values.destinationDepartmentId ?? null,
    destinationJobId:        values.destinationJobId ?? null,
    destinationBudgetCode:   values.destinationBudgetCode || null,
    destinationBudgetProgramCode: values.destinationBudgetProgramCode ?? '',
    previousRmu: values.previousRmu ?? null,
    newRmu:      values.newRmu ?? null,
    legalBasis:   values.legalBasis   || null,
    reason:       values.reason       || null,
    observations: values.observations || null,
    employeeTypeId:       values.employeeTypeId ?? null,
    swornDeclaration:     values.swornDeclaration ?? false,
    institutionalProcess: values.institutionalProcess ?? null,
    managementLevel:      values.managementLevel ?? null,
    workplace:            values.workplace ?? null,
    dthDirectorId:        values.dthDirectorId ?? null,
    authorityNominatorId: values.authorityNominatorId ?? null,
    elaboratorId:         values.elaboratorId ?? null,
    reviewerId:           values.reviewerId ?? null,
    registrarId:          values.registrarId ?? null,
    generateDocument,
    isHistoricalEntry: !!maxDate,
  });

  const handleFormSubmit = (values: FormValues) => {
    // Registro histórico: el atributo `max` del <input type=date> no bloquea un valor ya
    // asignado (default, texto pegado, etc.) — hay que revalidar aquí antes de enviar.
    if (maxDate) {
      if (values.actionDate > maxDate) {
        form.setError('actionDate', { type: 'manual', message: 'Registro histórico: debe ser anterior a hoy.' });
        return;
      }
      if (values.effectiveDate && values.effectiveDate > maxDate) {
        form.setError('effectiveDate', { type: 'manual', message: 'Registro histórico: debe ser anterior a hoy.' });
        return;
      }
      if (useEndDate && values.endDate && values.endDate > maxDate) {
        form.setError('endDate', { type: 'manual', message: 'Registro histórico: debe ser anterior a hoy.' });
        return;
      }
    }
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
                  <FormLabel>Tipo de Acción <span className="text-destructive">*</span></FormLabel>
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
                      readOnly={!allowActionNumberEdit}
                      disabled={!allowActionNumberEdit}
                      className={allowActionNumberEdit ? undefined : 'bg-muted'}
                      placeholder="Auto"
                      maxLength={50}
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
                  <FormLabel>Persona / Empleado <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    {isEdit && !allowInactiveEmployees ? (
                      <Input
                        value={defaultValues?.employeeFullName ?? ''}
                        disabled
                        className="bg-muted"
                      />
                    ) : isEdit ? (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">
                          Actual: {defaultValues?.employeeFullName} ({defaultValues?.employeeIdCard})
                        </p>
                        <PersonSearchCombobox
                          value={selectedPersonId}
                          onSelect={handlePersonSelect}
                          disabled={isBusy || resolvingEmployee}
                        />
                        <p className="text-xs text-muted-foreground">
                          Busca y selecciona solo si necesitas corregir a qué persona pertenece esta acción — incluye personas inactivas hoy.
                        </p>
                      </div>
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
                  <FormLabel>Fecha de Acción <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="date" {...field} max={maxDate} disabled={isBusy} />
                  </FormControl>
                  {maxDate && (
                    <p className="text-xs text-muted-foreground">Registro histórico: debe ser anterior a hoy.</p>
                  )}
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
                    <Input type="date" {...field} value={field.value ?? ''} max={maxDate} disabled={isBusy} />
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
                          max={maxDate}
                          disabled={isBusy}
                        />
                      </FormControl>
                    )}
                    {useEndDate && maxDate && (
                      <p className="text-xs text-muted-foreground">Registro histórico: debe ser anterior a hoy.</p>
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
                    <FormLabel>Partida del Puesto</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} disabled={isBusy} maxLength={50} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="originBudgetProgramCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Presupuestario</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} disabled={isBusy} maxLength={DB_FIELD_LIMITS.personnelActions.originBudgetProgramCode} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Proceso institucional y nivel de gestión de la situación de ORIGEN: solo se editan al
                  corregir o ingresar un histórico; en una acción nueva el backend los toma de la
                  situación vigente del empleado (se muestran deshabilitados). */}
              <FormField
                control={form.control}
                name="originInstitutionalProcess"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proceso Institucional</FormLabel>
                    <Select
                      disabled={!allowOriginRmuEdit || isBusy}
                      value={field.value ? String(field.value) : 'none'}
                      onValueChange={(v) => field.onChange(v === 'none' ? null : Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="— Sin categoría —" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{allowOriginRmuEdit ? '— Sin categoría —' : 'Auto (situación vigente)'}</SelectItem>
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
              <FormField
                control={form.control}
                name="originManagementLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nivel de Gestión</FormLabel>
                    <Select
                      disabled={!allowOriginRmuEdit || isBusy}
                      value={field.value ? String(field.value) : 'none'}
                      onValueChange={(v) => field.onChange(v === 'none' ? null : Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="— Sin categoría —" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{allowOriginRmuEdit ? '— Sin categoría —' : 'Auto (situación vigente)'}</SelectItem>
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
                        onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                        readOnly={!allowOriginRmuEdit}
                        disabled={!allowOriginRmuEdit || isBusy}
                        className={allowOriginRmuEdit ? undefined : 'bg-muted'}
                        placeholder={allowOriginRmuEdit ? '0.00' : 'Auto'}
                        min={0}
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
                    <FormLabel>Partida del Puesto</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} disabled={isBusy} maxLength={50} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destinationBudgetProgramCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Presupuestario</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} disabled={isBusy} maxLength={DB_FIELD_LIMITS.personnelActions.destinationBudgetProgramCode} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Clasificación de la situación PROPUESTA (destino). Se imprime en el documento como
                  PROPOSED_INSTITUTIONAL_PROCESS / PROPOSED_MANAGEMENT_LEVEL. */}
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

              {/* Lugar de Trabajo (situación propuesta) — la situación actual se calcula
                  sola en el documento a partir de la acción anterior del empleado. */}
              <FormField
                control={form.control}
                name="workplace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lugar de Trabajo</FormLabel>
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
                        {workplaceOptions.map((t) => {
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
                        {...field}
                        value={field.value ?? ''}
                        disabled={isBusy}
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
                    <Textarea {...field} value={field.value ?? ''} rows={2} disabled={isBusy} maxLength={500} />
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
                    <Textarea {...field} value={field.value ?? ''} rows={2} disabled={isBusy} maxLength={1000} />
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
                    <Textarea {...field} value={field.value ?? ''} rows={3} disabled={isBusy} maxLength={1000} />
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
                          showAuthorityBadge
                          includeInactive={allowInactiveEmployees}
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
