// src/hooks/contractRequest/useContractRequest.ts
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/api";
import type { ContractRequestCreate, ContractRequestDto, UIContractRequest, StatusVariant } from "@/types/contractRequest";
import type { DirectoryParameter } from "@/types/directoryParameter";

import { contractRequestService, type SelectItem } from "@/services/contractRequest/contractRequestService";

const LIST_KEY = ["/api/v1/rh/cv/contract-request"] as const;

function statusVariantFromName(statusName?: string | null): StatusVariant {
  const name = (statusName ?? "").toUpperCase();
  if (name === "CERT_RECHAZADA" || name === "ANULADO") return "destructive";
  if (name === "PENDIENTE_CERT_FINANCIERA" || name === "PENDIENTE_CONTRATACION") return "secondary";
  if (name === "COMPLETADO") return "outline";
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
      const text = x.statusName ?? statusNameById.get(Number(x.status)) ?? "Desconocido";
      const variant = statusVariantFromName(x.statusName);
      return { ...x, statusText: text, statusVariant: variant };
    });
  }, [listQ.data, statusNameById]);

  const createMut = useMutation({
    mutationFn: async (payload: ContractRequestCreate) => {
      if (!payload.workModalityId) throw new Error("Seleccione la modalidad de trabajo.");
      if (!payload.departmentId) throw new Error("Seleccione el departamento.");
      if (payload.status == null) throw new Error("Seleccione el estado.");

      const people = Number(payload.numberOfPeopleToHire);
      if (!Number.isFinite(people) || people < 1 || !Number.isInteger(people)) {
        throw new Error("El número de personas debe ser un entero mayor a 0.");
      }

      const hours = Number(payload.numberHour);
      if (!Number.isFinite(hours) || hours <= 0) {
        throw new Error("El número de horas debe ser mayor a 0.");
      }

      return contractRequestService.createAndGetId(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: ContractRequestCreate }) => {
      if (!payload.workModalityId) throw new Error("Seleccione la modalidad de trabajo.");
      if (!payload.departmentId) throw new Error("Seleccione el departamento.");

      const people = Number(payload.numberOfPeopleToHire);
      if (!Number.isFinite(people) || people < 1 || !Number.isInteger(people)) {
        throw new Error("El número de personas debe ser un entero mayor a 0.");
      }

      const hours = Number(payload.numberHour);
      if (!Number.isFinite(hours) || hours <= 0) {
        throw new Error("El número de horas debe ser mayor a 0.");
      }

      return contractRequestService.update(id, payload);
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
    updateMut,
  };
}
