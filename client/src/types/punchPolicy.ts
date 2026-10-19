// src/types/punchPolicy.ts
// Control de picadas por red (contrato con /attendance/punch-access de HrBackend).

export type PunchNetworkMode = 'OFF' | 'AUDIT' | 'ENFORCE';
export type PunchLogResult = 'EXTERNAL_ALLOWED' | 'REJECTED' | 'AUDIT_WOULD_REJECT';

export interface PunchNetwork {
  networkId: number;
  name: string;
  ipOrCidr: string;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface PunchNetworkSave {
  name: string;
  ipOrCidr: string;
  notes?: string;
  isActive: boolean;
}

export interface PunchIpCheck {
  ip: string;
  isValid: boolean;
  isCampus: boolean;
  matchedNetwork?: string | null;
  message?: string | null;
}

export interface PunchPolicyItem {
  employeeId: number;
  fullName: string;
  idCard?: string | null;
  department?: string | null;
  allowExternalPunch: boolean;
  reason?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  isEffective: boolean;
  updatedAt?: string | null;
}

export interface PunchPolicySave {
  allowExternalPunch: boolean;
  reason?: string;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface PunchAccessLogItem {
  logId: number;
  employeeId: number;
  employeeName: string;
  attemptedAt: string;
  ipAddress?: string | null;
  forwardedFor?: string | null;
  result: PunchLogResult;
  mode: string;
  detail?: string | null;
}

export interface PunchSettings {
  mode: PunchNetworkMode;
  activeNetworks: number;
}

export interface PunchAccessInfo {
  ip?: string | null;
  isCampus: boolean;
  hasExternalPermission: boolean;
  mode: PunchNetworkMode;
}

export const PUNCH_MODE_LABELS: Record<PunchNetworkMode, { title: string; hint: string }> = {
  OFF: { title: 'Sin control', hint: 'Cualquier persona con sesión puede picar desde cualquier lugar.' },
  AUDIT: {
    title: 'Solo registrar (recomendado para empezar)',
    hint: 'Nadie es bloqueado. Se anota en el registro quién habría sido bloqueado fuera del campus.',
  },
  ENFORCE: {
    title: 'Bloquear fuera del campus',
    hint: 'Solo se puede picar desde las redes del campus o con autorización externa vigente.',
  },
};

export const PUNCH_LOG_RESULT_LABELS: Record<PunchLogResult, string> = {
  EXTERNAL_ALLOWED: 'Picada externa autorizada',
  REJECTED: 'Rechazada',
  AUDIT_WOULD_REJECT: 'Se habría rechazado (modo registro)',
};
