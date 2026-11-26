// src/types/punchPolicy.ts
// Control de picadas por red (contrato con /attendance/punch-access de HrBackend).

export type PunchNetworkMode = 'OFF' | 'AUDIT' | 'ENFORCE';
export type PunchLogResult =
  | 'EXTERNAL_ALLOWED'
  | 'REJECTED'
  | 'AUDIT_WOULD_REJECT'
  // Eventos de la pantalla de picadas (Mode = CLIENT)
  | 'CLIENT_CLICK'
  | 'CLIENT_RETRY'
  | 'CLIENT_SEND_FAILED'
  | 'CLIENT_HIDDEN_BEFORE_RESPONSE'
  // Rechazos y errores del servidor al registrar la picada (Mode = SERVER)
  | 'SRV_REJ_TOO_SOON'
  | 'SRV_REJ_NOT_OWN'
  | 'SRV_ERROR'
  // Corrección manual de la hora de una picada (Mode = MANUAL)
  | 'ADJUST_TIME';

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

export type PunchPolicyStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'REVOKED';

/** Una autorización de picada externa (fila del historial; nunca se borra, se revoca). */
export interface PunchPolicyItem {
  policyId: number;
  /** Null en la autorización global (toda la institución). */
  employeeId?: number | null;
  isGlobal: boolean;
  fullName: string;
  idCard?: string | null;
  department?: string | null;
  reason?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  status: PunchPolicyStatus;
  isEffective: boolean;
  authorizedByName?: string | null;
  createdAt: string;
  revokedAt?: string | null;
  revokedByName?: string | null;
  revokeReason?: string | null;
  batchId?: string | null;
  batchDepartmentName?: string | null;
}

export interface PunchPolicyCreate {
  employeeId: number;
  reason: string;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface PunchPolicyGlobalCreate {
  reason: string;
  validFrom?: string | null;
  /** Obligatoria: una autorización global deja sin efecto el control por red. */
  validTo: string;
}

export interface PunchPolicyDepartmentCreate {
  departmentId: number;
  includeChildren: boolean;
  reason: string;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface PunchPolicyDepartmentPreview {
  departmentName: string;
  departments: number;
  employees: number;
  alreadyAuthorized: number;
  toCreate: number;
}

export interface PunchPolicyBatchResult {
  batchId: string;
  created: number;
  skipped: number;
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
  CLIENT_CLICK: 'El usuario pulsó el botón de marcar',
  CLIENT_RETRY: 'La pantalla reintentó el envío',
  CLIENT_SEND_FAILED: 'Falló el envío de la picada',
  CLIENT_HIDDEN_BEFORE_RESPONSE: 'El usuario salió de la pantalla antes de la respuesta',
  SRV_REJ_TOO_SOON: 'Rechazada: intervalo mínimo entre picadas',
  SRV_REJ_NOT_OWN: 'Rechazada: picada a nombre de otro empleado',
  SRV_ERROR: 'Error del servidor al registrar la picada',
  ADJUST_TIME: 'Hora de la picada corregida manualmente',
};
