import { useQuery } from "@tanstack/react-query";
import {
  FinancialCertificationAPI,
  ContractTypeAPI,
  DepartamentosAPI,
  CargosAPI,
  PersonasAPI,
} from "@/lib/api";

export function useContractLookups(params?: { enabled?: boolean }) {
  const enabled = params?.enabled ?? true;

  const qCerts = useQuery({
    queryKey: ["financial-certifications"],
    queryFn: () => FinancialCertificationAPI.list(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const qTypes = useQuery({
    queryKey: ["contract-types"],
    queryFn: () => ContractTypeAPI.list(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const qDepts = useQuery({
    queryKey: ["departments"],
    queryFn: () => DepartamentosAPI.list(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const qJobs = useQuery({
    queryKey: ["jobs"],
    queryFn: () => CargosAPI.list(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const qPeople = useQuery({
    queryKey: ["people"],
    queryFn: () => PersonasAPI.list(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const certs = qCerts.data?.status === "success" ? (qCerts.data.data ?? []) : [];
  const types = qTypes.data?.status === "success" ? (qTypes.data.data ?? []) : [];
  const depts = qDepts.data?.status === "success" ? (qDepts.data.data ?? []) : [];
  const jobs = qJobs.data?.status === "success" ? (qJobs.data.data ?? []) : [];
  const people = qPeople.data?.status === "success" ? (qPeople.data.data ?? []) : [];

  return { qCerts, qTypes, qDepts, qJobs, qPeople, certs, types, depts, jobs, people };
}