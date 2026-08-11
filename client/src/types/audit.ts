// src/types/audit.ts

/** Fila cruda de HR.Audit (WsUtaSystem.Application.DTOs.Audit.AuditDto). */
export interface AuditLogEntry {
  auditId: number;
  tableName: string;
  action: string;
  recordId: string;
  userName: string;
  dateTime: string;
  /** JSON serializado: { reason: string; changes: { field, oldValue, newValue }[] } para Action=CORRECTION. */
  details: string | null;
}

export interface AuditFieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

/** Forma parseada de `AuditLogEntry.details` cuando `action === 'CORRECTION'`. */
export interface CorrectionDetails {
  reason: string;
  changes: AuditFieldChange[];
}

export function parseCorrectionDetails(entry: AuditLogEntry): CorrectionDetails | null {
  if (!entry.details) return null;
  try {
    const parsed = JSON.parse(entry.details);
    return {
      reason: parsed.Reason ?? parsed.reason ?? '',
      changes: (parsed.Changes ?? parsed.changes ?? []).map((c: any) => ({
        field: c.Field ?? c.field,
        oldValue: c.OldValue ?? c.oldValue ?? null,
        newValue: c.NewValue ?? c.newValue ?? null,
      })),
    };
  } catch {
    return null;
  }
}

export interface AuditSearchFilter {
  tableName?: string | null;
  recordId?: string | null;
  userName?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  page?: number;
  pageSize?: number;
}

export interface PagedAuditResult {
  items: AuditLogEntry[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
