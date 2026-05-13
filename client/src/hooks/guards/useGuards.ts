import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { usePaged } from '@/hooks/pagination/usePaged';
import {
  GuardServiceLocationsAPI,
  GuardRotationGroupsAPI,
  RotationPatternsAPI,
  GuardCoverageRequirementsAPI,
  GuardShiftPlanningAPI,
  GuardShiftChangesAPI,
  EmployeeAvailabilityAPI,
} from '@/lib/api/services/guards';
import type {
  GuardShiftCalendarFilterDto,
  EmployeeAvailabilityFilterDto,
  CreateGuardServiceLocationDto,
  UpdateGuardServiceLocationDto,
  CreateGuardRotationGroupDto,
  UpdateGuardRotationGroupDto,
  AssignEmployeeToRotationGroupDto,
  RemoveEmployeeFromRotationGroupDto,
  CreateRotationPatternDto,
  UpdateRotationPatternDto,
  UpsertRotationPatternDetailsDto,
  CreateCoverageRequirementDto,
  UpdateCoverageRequirementDto,
  CreateGuardShiftPlanningDto,
  GenerateGuardShiftPlanningRequestDto,
  CreateGuardShiftReplacementDto,
  ApproveGuardShiftChangeDto,
  RejectGuardShiftChangeDto,
  CreateManualAvailabilityBlockDto,
  GeneratePreviewRequestDto,
  ScheduleBoardFilterDto,
} from '@/types/guards';
import { parseApiError } from '@/lib/error-handling';

// ─── Keys de caché ───────────────────────────────────────────────────────────

export const GUARD_KEYS = {
  dashboard:           ['guards', 'dashboard'],
  locationsTree:       ['guards', 'locations', 'tree'],
  locationsAssignable: ['guards', 'locations', 'assignable'],
  groups:              ['guards', 'groups'],
  groupEmployees:      (id: number) => ['guards', 'groups', id, 'employees'],
  locationSummary:     ['guards', 'groups', 'location-summary'],
  groupsByLocation:    (key: string) => ['guards', 'groups', 'by-location', key],
  patterns:            ['guards', 'patterns'],
  coverage:            ['guards', 'coverage'],
  calendar:            (filter: GuardShiftCalendarFilterDto) => ['guards', 'calendar', filter],
  scheduleBoard:       (filter: ScheduleBoardFilterDto) => ['guards', 'schedule-board', filter],
  planningDetail:      (id: number) => ['guards', 'planning', id, 'detail'],
  pendingChanges:      ['guards', 'changes', 'pending'],
  planningChanges:     (planningId: number) => ['guards', 'changes', planningId],
  availabilityBlocks:  (filter: EmployeeAvailabilityFilterDto) => ['guards', 'availability', filter],
} as const;

// ─── Hooks paginados ──────────────────────────────────────────────────────────

export function useGuardRotationGroupsPaged(initialPageSize = 20) {
  return usePaged<import('@/types/guards').GuardRotationGroupDto>({
    queryKey: ['guards', 'groups', 'paged'],
    queryFn: (params) => GuardRotationGroupsAPI.listPaged(params),
    initialPageSize,
    staleTime: 60_000,
  });
}

export function useRotationPatternsPaged(initialPageSize = 20) {
  return usePaged<import('@/types/guards').RotationPatternDto>({
    queryKey: ['guards', 'patterns', 'paged'],
    queryFn: (params) => RotationPatternsAPI.listPaged(params),
    initialPageSize,
    staleTime: 120_000,
  });
}

export function useCoverageRequirementsPaged(initialPageSize = 20) {
  return usePaged<import('@/types/guards').GuardShiftCoverageRequirementDto>({
    queryKey: ['guards', 'coverage', 'paged'],
    queryFn: (params) => GuardCoverageRequirementsAPI.listPaged(params),
    initialPageSize,
    staleTime: 60_000,
  });
}

export function usePendingChangesPaged(page: number, pageSize: number) {
  return useQuery({
    queryKey: [...GUARD_KEYS.pendingChanges, 'paged', page, pageSize],
    queryFn: () => GuardShiftChangesAPI.getPendingPaged({ page, pageSize }),
    staleTime: 30_000,
  });
}

export function useAvailabilityBlocksPaged(
  filter: import('@/types/guards').EmployeeAvailabilityFilterDto,
  page: number,
  pageSize: number,
  enabled = true
) {
  return useQuery({
    queryKey: [...GUARD_KEYS.availabilityBlocks(filter), 'paged', page, pageSize],
    queryFn: () => EmployeeAvailabilityAPI.getBlocksPaged(filter, page, pageSize),
    enabled,
    staleTime: 30_000,
  });
}

// ─── Hooks de consulta ────────────────────────────────────────────────────────

export function useGuardDashboard() {
  return useQuery({
    queryKey: GUARD_KEYS.dashboard,
    queryFn: () => GuardShiftPlanningAPI.getDashboard(),
    staleTime: 60_000,
  });
}

export function useGuardLocationsTree() {
  return useQuery({
    queryKey: GUARD_KEYS.locationsTree,
    queryFn: () => GuardServiceLocationsAPI.getTree(),
    staleTime: 120_000,
  });
}

export function useGuardLocationsAssignable() {
  return useQuery({
    queryKey: GUARD_KEYS.locationsAssignable,
    queryFn: () => GuardServiceLocationsAPI.getAssignable(),
    staleTime: 120_000,
  });
}

export function useGuardRotationGroups() {
  return useQuery({
    queryKey: GUARD_KEYS.groups,
    queryFn: () => GuardRotationGroupsAPI.getAll(),
    staleTime: 60_000,
  });
}

export function useGuardGroupEmployees(groupId: number, enabled = true) {
  return useQuery({
    queryKey: GUARD_KEYS.groupEmployees(groupId),
    queryFn: () => GuardRotationGroupsAPI.getEmployees(groupId),
    enabled,
    staleTime: 60_000,
  });
}

export function useLocationSummary() {
  return useQuery({
    queryKey: GUARD_KEYS.locationSummary,
    queryFn: () => GuardRotationGroupsAPI.getLocationSummary(),
    staleTime: 60_000,
  });
}

export function useGroupsByLocation(locationKey: string | null) {
  return useQuery({
    queryKey: GUARD_KEYS.groupsByLocation(locationKey ?? ''),
    queryFn: () => GuardRotationGroupsAPI.getByLocationKey(locationKey!),
    enabled: !!locationKey,
    staleTime: 60_000,
  });
}

export function useRotationPatterns() {
  return useQuery({
    queryKey: GUARD_KEYS.patterns,
    queryFn: () => RotationPatternsAPI.getAll(),
    staleTime: 120_000,
  });
}

export function useCoverageRequirements() {
  return useQuery({
    queryKey: GUARD_KEYS.coverage,
    queryFn: () => GuardCoverageRequirementsAPI.getAll(),
    staleTime: 60_000,
  });
}

export function useGuardCalendar(filter: GuardShiftCalendarFilterDto, enabled = true) {
  return useQuery({
    queryKey: GUARD_KEYS.calendar(filter),
    queryFn: () => GuardShiftPlanningAPI.getCalendar(filter),
    enabled,
    staleTime: 30_000,
  });
}

export function usePendingChanges() {
  return useQuery({
    queryKey: GUARD_KEYS.pendingChanges,
    queryFn: () => GuardShiftChangesAPI.getPending(),
    staleTime: 30_000,
  });
}

export function useAvailabilityBlocks(filter: EmployeeAvailabilityFilterDto, enabled = true) {
  return useQuery({
    queryKey: GUARD_KEYS.availabilityBlocks(filter),
    queryFn: () => EmployeeAvailabilityAPI.getBlocks(filter),
    enabled,
    staleTime: 30_000,
  });
}

export function useScheduleBoard(filter: ScheduleBoardFilterDto, enabled = true) {
  return useQuery({
    queryKey: GUARD_KEYS.scheduleBoard(filter),
    queryFn: () => GuardShiftPlanningAPI.getScheduleBoard(filter),
    enabled,
    staleTime: 30_000,
  });
}

export function usePlanningDetail(planningId: number | null) {
  return useQuery({
    queryKey: GUARD_KEYS.planningDetail(planningId ?? 0),
    queryFn: () => GuardShiftPlanningAPI.getPlanningDetail(planningId!),
    enabled: planningId !== null,
    staleTime: 30_000,
  });
}

// ─── Hooks de mutación ────────────────────────────────────────────────────────

export function useGuardLocationMutations(onSuccess?: () => void) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['guards', 'locations'] });
  };

  const create = useMutation({
    mutationFn: (dto: CreateGuardServiceLocationDto) => GuardServiceLocationsAPI.create(dto),
    onSuccess: (res) => {
      if (res.status === 'success') { invalidate(); toast({ title: 'Ubicación creada' }); onSuccess?.(); }
      else toast({ title: 'Error al crear', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateGuardServiceLocationDto }) =>
      GuardServiceLocationsAPI.update(id, dto),
    onSuccess: (res) => {
      if (res.status === 'success') { invalidate(); toast({ title: 'Ubicación actualizada' }); onSuccess?.(); }
      else toast({ title: 'Error al actualizar', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  return { create, update };
}

export function useGuardGroupMutations(onSuccess?: () => void) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: GUARD_KEYS.groups });
    qc.invalidateQueries({ queryKey: GUARD_KEYS.locationSummary });
  };

  const create = useMutation({
    mutationFn: (dto: CreateGuardRotationGroupDto) => GuardRotationGroupsAPI.create(dto),
    onSuccess: (res) => {
      if (res.status === 'success') { invalidate(); toast({ title: 'Grupo creado' }); onSuccess?.(); }
      else toast({ title: 'Error al crear', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateGuardRotationGroupDto }) =>
      GuardRotationGroupsAPI.update(id, dto),
    onSuccess: (res) => {
      if (res.status === 'success') { invalidate(); toast({ title: 'Grupo actualizado' }); onSuccess?.(); }
      else toast({ title: 'Error al actualizar', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  const assignEmployee = useMutation({
    mutationFn: ({ groupId, dto }: { groupId: number; dto: AssignEmployeeToRotationGroupDto }) =>
      GuardRotationGroupsAPI.assignEmployee(groupId, dto),
    onSuccess: (res, { groupId }) => {
      if (res.status === 'success') {
        qc.invalidateQueries({ queryKey: GUARD_KEYS.groupEmployees(groupId) });
        toast({ title: 'Empleado asignado al grupo' });
        onSuccess?.();
      } else toast({ title: 'Error', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  const removeEmployee = useMutation({
    mutationFn: ({ groupId, dto }: { groupId: number; dto: RemoveEmployeeFromRotationGroupDto }) =>
      GuardRotationGroupsAPI.removeEmployee(groupId, dto),
    onSuccess: (res, { groupId }) => {
      if (res.status === 'success') {
        qc.invalidateQueries({ queryKey: GUARD_KEYS.groupEmployees(groupId) });
        qc.invalidateQueries({ queryKey: GUARD_KEYS.locationSummary });
        qc.invalidateQueries({ queryKey: ['guards', 'groups', 'by-location'] });
        toast({ title: 'Empleado retirado del grupo' });
        onSuccess?.();
      } else toast({ title: 'Error', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  const assignBatch = useMutation({
    mutationFn: async ({ groupId, assignments }: {
      groupId: number;
      assignments: AssignEmployeeToRotationGroupDto[];
    }) => {
      const results = await Promise.allSettled(
        assignments.map(dto => GuardRotationGroupsAPI.assignEmployee(groupId, dto))
      );
      return results;
    },
    onSuccess: (results, { groupId }) => {
      qc.invalidateQueries({ queryKey: GUARD_KEYS.groupEmployees(groupId) });
      qc.invalidateQueries({ queryKey: GUARD_KEYS.locationSummary });
      qc.invalidateQueries({ queryKey: ['guards', 'groups', 'by-location'] });
      const succeeded = results.filter(
        r => r.status === 'fulfilled' && (r.value as any).status === 'success'
      ).length;
      const failed = results.length - succeeded;
      if (failed === 0) {
        toast({ title: `${succeeded} guardia(s) asignado(s) al grupo` });
      } else {
        toast({
          title: `${succeeded} asignado(s), ${failed} con error`,
          variant: 'destructive',
        });
      }
      onSuccess?.();
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  return { create, update, assignEmployee, assignBatch, removeEmployee };
}

export function useRotationPatternMutations(onSuccess?: () => void) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => qc.invalidateQueries({ queryKey: GUARD_KEYS.patterns });

  const create = useMutation({
    mutationFn: (dto: CreateRotationPatternDto) => RotationPatternsAPI.create(dto),
    onSuccess: (res) => {
      if (res.status === 'success') { invalidate(); toast({ title: 'Patrón creado' }); onSuccess?.(); }
      else toast({ title: 'Error al crear', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateRotationPatternDto }) =>
      RotationPatternsAPI.update(id, dto),
    onSuccess: (res) => {
      if (res.status === 'success') { invalidate(); toast({ title: 'Patrón actualizado' }); onSuccess?.(); }
      else toast({ title: 'Error al actualizar', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  const setDetails = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpsertRotationPatternDetailsDto }) =>
      RotationPatternsAPI.setDetails(id, dto),
    onSuccess: (res) => {
      if (res.status === 'success') { invalidate(); toast({ title: 'Detalles actualizados' }); onSuccess?.(); }
      else toast({ title: 'Error al guardar', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  return { create, update, setDetails };
}

export function useCoverageMutations(onSuccess?: () => void) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => qc.invalidateQueries({ queryKey: GUARD_KEYS.coverage });

  const create = useMutation({
    mutationFn: (dto: CreateCoverageRequirementDto) => GuardCoverageRequirementsAPI.create(dto),
    onSuccess: (res) => {
      if (res.status === 'success') { invalidate(); toast({ title: 'Requerimiento creado' }); onSuccess?.(); }
      else toast({ title: 'Error al crear', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateCoverageRequirementDto }) =>
      GuardCoverageRequirementsAPI.update(id, dto),
    onSuccess: (res) => {
      if (res.status === 'success') { invalidate(); toast({ title: 'Requerimiento actualizado' }); onSuccess?.(); }
      else toast({ title: 'Error al actualizar', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  return { create, update };
}

export function usePlanningMutations(onSuccess?: () => void) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['guards', 'calendar'] });
    qc.invalidateQueries({ queryKey: ['guards', 'schedule-board'] });
  };

  const create = useMutation({
    mutationFn: (dto: CreateGuardShiftPlanningDto) => GuardShiftPlanningAPI.create(dto),
    onSuccess: (res) => {
      if (res.status === 'success') { invalidateAll(); toast({ title: 'Planificación creada' }); onSuccess?.(); }
      else toast({ title: 'Error al crear', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  const generate = useMutation({
    mutationFn: (dto: GenerateGuardShiftPlanningRequestDto) => GuardShiftPlanningAPI.generate(dto),
    onSuccess: (res) => {
      if (res.status === 'success') {
        invalidateAll();
        const d = res.data;
        toast({ title: `Generados: ${d.generated} turnos, omitidos: ${d.skipped}${d.errors ? `, errores: ${d.errors}` : ''}` });
        onSuccess?.();
      } else toast({ title: 'Error al generar', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  const preview = useMutation({
    mutationFn: (dto: GeneratePreviewRequestDto) => GuardShiftPlanningAPI.generatePreview(dto),
    onError: (e) => toast({ title: 'Error al previsualizar', description: parseApiError(e).message, variant: 'destructive' }),
  });

  const confirm = useMutation({
    mutationFn: (dto: GeneratePreviewRequestDto) => GuardShiftPlanningAPI.generateConfirm(dto),
    onSuccess: (res) => {
      if (res.status === 'success') {
        invalidateAll();
        const d = res.data;
        toast({ title: `Confirmado: ${d.generated} creados, ${d.skipped} omitidos${d.errors ? `, ${d.errors} conflictos` : ''}` });
        onSuccess?.();
      } else toast({ title: 'Error al confirmar', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error al confirmar', description: parseApiError(e).message, variant: 'destructive' }),
  });

  return { create, generate, preview, confirm };
}

export function useShiftChangeMutations(onSuccess?: () => void) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: GUARD_KEYS.pendingChanges });
    qc.invalidateQueries({ queryKey: ['guards', 'changes'] });
  };

  const createReplacement = useMutation({
    mutationFn: (dto: CreateGuardShiftReplacementDto) => GuardShiftChangesAPI.createReplacement(dto),
    onSuccess: (res) => {
      if (res.status === 'success') { invalidate(); toast({ title: 'Reemplazo solicitado' }); onSuccess?.(); }
      else toast({ title: 'Error al crear', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  const approve = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: ApproveGuardShiftChangeDto }) =>
      GuardShiftChangesAPI.approve(id, dto),
    onSuccess: (res) => {
      if (res.status === 'success') { invalidate(); toast({ title: 'Cambio aprobado' }); onSuccess?.(); }
      else toast({ title: 'Error al aprobar', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  const reject = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: RejectGuardShiftChangeDto }) =>
      GuardShiftChangesAPI.reject(id, dto),
    onSuccess: (res) => {
      if (res.status === 'success') { invalidate(); toast({ title: 'Cambio rechazado' }); onSuccess?.(); }
      else toast({ title: 'Error al rechazar', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  return { createReplacement, approve, reject };
}

export function useAvailabilityMutations(onSuccess?: () => void) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => qc.invalidateQueries({ queryKey: ['guards', 'availability'] });

  const createManual = useMutation({
    mutationFn: (dto: CreateManualAvailabilityBlockDto) => EmployeeAvailabilityAPI.createManual(dto),
    onSuccess: (res) => {
      if (res.status === 'success') { invalidate(); toast({ title: 'Bloqueo manual creado' }); onSuccess?.(); }
      else toast({ title: 'Error al crear', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  const syncPermissions = useMutation({
    mutationFn: ({ startDate, endDate }: { startDate: string; endDate: string }) =>
      EmployeeAvailabilityAPI.syncPermissions(startDate, endDate),
    onSuccess: (res) => {
      if (res.status === 'success') {
        invalidate();
        const d = res.data;
        toast({ title: `Permisos sincronizados: ${d.created} creados, ${d.updated} actualizados` });
        onSuccess?.();
      } else toast({ title: 'Error al sincronizar', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  const syncVacations = useMutation({
    mutationFn: ({ startDate, endDate }: { startDate: string; endDate: string }) =>
      EmployeeAvailabilityAPI.syncVacations(startDate, endDate),
    onSuccess: (res) => {
      if (res.status === 'success') {
        invalidate();
        const d = res.data;
        toast({ title: `Vacaciones sincronizadas: ${d.created} creados` });
        onSuccess?.();
      } else toast({ title: 'Error al sincronizar', description: res.error.message, variant: 'destructive' });
    },
    onError: (e) => toast({ title: 'Error', description: parseApiError(e).message, variant: 'destructive' }),
  });

  return { createManual, syncPermissions, syncVacations };
}
