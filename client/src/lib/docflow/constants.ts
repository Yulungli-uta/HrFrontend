import type { InstanceStatus } from "@/types/docflow/docflow.types";

export const INSTANCE_STATUS_OPTIONS: InstanceStatus[] = [
  "Borrador",
  "Pendiente",
  "En Revision",
  "Aprobado",
  "Retornado",
  "Finalizado",
];

export const ALL_STATUS_FILTER = "Todos";

export const STATUS_FILTER_OPTIONS: string[] = [
  ALL_STATUS_FILTER,
  ...INSTANCE_STATUS_OPTIONS,
];
