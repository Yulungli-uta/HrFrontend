// src/hooks/contractRequest/useContractRequest.ts
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/api";
import type { ContractRequestCreate, ContractRequestDto, UIContractRequest, StatusVariant } from "@/types/contractRequest";
import type { DirectoryParameter } from "@/types/directoryParameter";

import { contractRequestService, type SelectItem } from "@/services/contractRequest/contractRequestService";

const LIST_KEY = ["/api/v1/rh/cv/contract-request"] as const;

function statusVariantFromStatusId(statusId?: number | null): StatusVariant {
  if (statusId === 4) return "destructive";
  if (statusId === 2) return "secondary";
  if (statusId === 0) return "outline";
  return "default";
}

export function useContractRequest(directoryCode: string) {
  const qc = useQueryClient();

  const listQ = useQuery<ApiResponse<ContractRequestDto[]>>({
    queryKey: LIST_KEY,
    queryFn: () => contractRequestService.list(),
  });

  const workModalitiesQ = useQuery<ApiResponse<SelectItem[]>>({
    queryKey: ["contractRequest", "workModalities"],
    queryFn: () => contractRequestService.listWorkModalities(),
  });

  const departmentsQ = useQuery<ApiResponse<SelectItem[]>>({
    queryKey: ["contractRequest", "departments"],
    queryFn: () => contractRequestService.listDepartments(),
  });

  const statusesQ = useQuery<ApiResponse<SelectItem[]>>({
    queryKey: ["contractRequest", "statuses"],
    queryFn: () => contractRequestService.listContractRequestStatuses(),
  });

  const directoryQ = useQuery<ApiResponse<DirectoryParameter>>({
    queryKey: ["contractRequest", "directoryParams", directoryCode],
    queryFn: () => contractRequestService.getDirectoryParamsByCode(directoryCode),
  });

  const directoryUi = useMemo(() => {
    const param = directoryQ.data?.status === "success" ? directoryQ.data.data : null;
    return contractRequestService.normalizeDirectoryParams(param);
  }, [directoryQ.data]);

  const statusNameById = useMemo(() => {
    const map = new Map<number, string>();
    const list = statusesQ.data?.status === "success" ? statusesQ.data.data : [];
    for (const x of list) map.set(x.id, x.name);
    return map;
  }, [statusesQ.data]);

  const workModalityNameById = useMemo(() => {
    const map = new Map<number, string>();
    const list = workModalitiesQ.data?.status === "success" ? workModalitiesQ.data.data : [];
    for (const x of list) map.set(x.id, x.name);
    return map;
  }, [workModalitiesQ.data]);

  const departmentNameById = useMemo(() => {
    const map = new Map<number, string>();
    const list = departmentsQ.data?.status === "success" ? departmentsQ.data.data : [];
    for (const x of list) map.set(x.id, x.name);
    return map;
  }, [departmentsQ.data]);

  const contracts: UIContractRequest[] = useMemo(() => {
    if (listQ.data?.status !== "success") return [];
    return (listQ.data.data ?? []).map((x) => {
      const text = statusNameById.get(Number(x.status)) ?? "Desconocido";
      const variant = statusVariantFromStatusId(x.status);
      return { ...x, statusText: text, statusVariant: variant };
    });
  }, [listQ.data, statusNameById]);

  const createMut = useMutation({
    mutationFn: async (payload: ContractRequestCreate) => {
      if (!payload.workModalityId) throw new Error("Seleccione la modalidad de trabajo.");
      if (!payload.departmentId) throw new Error("Seleccione el departamento.");
      if (payload.status == null) throw new Error("Seleccione el estado.");

      const people = Number(payload.numberOfPeopleToHire);
      if (!Number.isFinite(people) || people < 1) {
        throw new Error("El número de personas a contratar debe ser mayor o igual a 1.");
      }

      const hours = Number(payload.numberHour);
      if (!Number.isFinite(hours) || hours < 0) {
        throw new Error("El número de horas no puede ser negativo.");
      }

      return contractRequestService.createAndGetId(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });

  return {
    listQ,
    contracts,

    workModalitiesQ,
    departmentsQ,
    statusesQ,

    workModalityNameById,
    departmentNameById,
    statusNameById,

    workModalities: workModalitiesQ.data?.status === "success" ? workModalitiesQ.data.data : [],
    departments: departmentsQ.data?.status === "success" ? departmentsQ.data.data : [],
    statuses: statusesQ.data?.status === "success" ? statusesQ.data.data : [],

    directoryQ,
    directoryUi,

    createMut,
  };
}
