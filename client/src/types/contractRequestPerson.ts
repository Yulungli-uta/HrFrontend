// src/types/contractRequestPerson.ts

/** Registro de persona en el detalle de una solicitud de contrato. */
export interface ContractRequestPersonDto {
  requestPersonId: number;
  requestId: number;
  personId?: number | null;
  personFullName?: string | null;
  personIdentification?: string | null;

  /** FK → HR.ref_Types (JOB_TYPE): ADMINISTRATIVO | DOCENTE */
  requestPersonType: number;
  requestPersonTypeName?: string | null;

  jobId: number;
  jobName?: string | null;
  jobRmu?: number | null;

  startDate?: string | null;
  endDate?: string | null;

  weeklyClassHours?: number | null;
  hourValue?: number | null;
  monthsPeriod?: number | null;
  rmu?: number | null;
  rmuPeriod?: number | null;

  /** FK → HR.ref_Types (CONTRACT_REQUEST_PERSON_SOURCE): REQUEST | CONTRACT */
  entrySourceId: number;
  entrySourceName?: string | null;

  isHired: boolean;
  contractId?: number | null;
  hiredAt?: string | null;
  hiredBy?: number | null;

  observation?: string | null;
  isActive: boolean;
  inactiveAt?: string | null;
  inactiveBy?: number | null;
  inactiveReason?: string | null;

  createdAt: string;
  createdBy: number;
  updatedAt?: string | null;
  updatedBy?: number | null;

  /** FK → HR.ref_Types (CONTRACT_REQUEST_PERSON_STATUS) */
  statusId: number;
  statusName?: string | null;
}

export interface CreateContractRequestPersonDto {
  personId?: number | null;
  /** FK → HR.ref_Types (JOB_TYPE): ADMINISTRATIVO | DOCENTE */
  requestPersonType: number;
  jobId: number;
  startDate?: string | null;
  endDate?: string | null;
  weeklyClassHours?: number | null;
  hourValue?: number | null;
  observation?: string | null;
  createdBy: number;
}

export interface UpdateContractRequestPersonDto {
  personId?: number | null;
  requestPersonType?: number;
  jobId?: number;
  startDate?: string | null;
  endDate?: string | null;
  weeklyClassHours?: number | null;
  hourValue?: number | null;
  observation?: string | null;
  updatedBy: number;
}

/** Resumen de cupos para la pantalla de generación de contratos. */
export interface ContractRequestSlotsDto {
  requestId: number;
  numberOfPeopleToHire: number;
  totalHired: number;
  slotsAvailable: number;
  pendingPeople: number;
}

/** Persona disponible desde HR.tbl_People para completar cupos. */
export interface AvailablePersonForContractDto {
  personId: number;
  fullName: string;
  identification: string;
  email?: string | null;
}
