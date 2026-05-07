// src/hooks/personnelActions/usePersonnelActionLookups.ts
import { useQuery } from '@tanstack/react-query';
import { VwDepartmentWithTypeAPI, VwJobWithDegreeAndGroupAPI } from '@/lib/api';
import { PersonnelActionTypeAPI } from '@/lib/api/services/contracts';
import type { VwDepartmentWithType, VwJobWithDegreeAndGroup } from '@/lib/api';
import type { PersonnelActionTypeDto } from '@/lib/api/services/contracts';

const STALE = 5 * 60 * 1000;

export function usePersonnelActionLookups(enabled = true) {
  const qDepts = useQuery({
    queryKey: ['vw-departments-active'],
    queryFn: () => VwDepartmentWithTypeAPI.getActive(),
    enabled,
    staleTime: STALE,
  });

  const qJobs = useQuery({
    queryKey: ['vw-jobs-all'],
    queryFn: () => VwJobWithDegreeAndGroupAPI.getAll(),
    enabled,
    staleTime: STALE,
  });

  const qActionTypes = useQuery({
    queryKey: ['personnel-action-types-active'],
    queryFn: () => PersonnelActionTypeAPI.getActive(),
    enabled,
    staleTime: STALE,
  });

  const departments: VwDepartmentWithType[] =
    qDepts.data?.status === 'success' ? (qDepts.data.data ?? []) : [];
  const jobs: VwJobWithDegreeAndGroup[] =
    qJobs.data?.status === 'success' ? (qJobs.data.data ?? []) : [];
  const actionTypes: PersonnelActionTypeDto[] =
    qActionTypes.data?.status === 'success' ? (qActionTypes.data.data ?? []) : [];

  return {
    departments,
    jobs,
    actionTypes,
    isLoading: qDepts.isLoading || qJobs.isLoading || qActionTypes.isLoading,
  };
}
