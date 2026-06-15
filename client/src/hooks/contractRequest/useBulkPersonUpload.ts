import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { PersonasAPI } from '@/lib/api';
import type { BulkValidatedRow, BulkUploadRow } from '@/types/contractRequestPerson';

export type BulkUploadStep = 'idle' | 'parsing' | 'validating' | 'ready' | 'error';

export interface UseBulkPersonUploadReturn {
  step: BulkUploadStep;
  rows: BulkValidatedRow[];
  validRows: BulkValidatedRow[];
  invalidRows: BulkValidatedRow[];
  parseError: string | null;
  canUpload: boolean;
  parseFile: (file: File) => Promise<void>;
  removeRow: (rowIndex: number) => void;
  reset: () => void;
}

const REQUIRED_COLS = ['identificacion', 'tipo', 'job_id'] as const;

function parseRow(raw: Record<string, unknown>, index: number): BulkValidatedRow | null {
  const identification = String(raw['identificacion'] ?? '').trim();
  const tipo = String(raw['tipo'] ?? '').trim().toUpperCase();
  const jobIdRaw = raw['job_id'];
  const jobId = jobIdRaw != null && jobIdRaw !== '' ? Number(jobIdRaw) : NaN;

  if (!identification || !tipo || isNaN(jobId) || jobId <= 0) return null;

  const toStr = (v: unknown) => (v != null && v !== '' ? String(v).trim() : null);
  const toNum = (v: unknown) => (v != null && v !== '' ? Number(v) : null);

  return {
    _rowIndex: index,
    status: 'valid',
    identification,
    tipo,
    jobId,
    startDate: toStr(raw['fecha_inicio']),
    endDate: toStr(raw['fecha_fin']),
    weeklyClassHours: toNum(raw['horas_semanales']),
    hourValue: toNum(raw['valor_hora']),
    observation: toStr(raw['observacion']),
    personId: null,
    personFullName: null,
  };
}

export function useBulkPersonUpload(): UseBulkPersonUploadReturn {
  const [step, setStep] = useState<BulkUploadStep>('idle');
  const [rows, setRows] = useState<BulkValidatedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const validate = useCallback(async (parsed: BulkValidatedRow[]) => {
    setStep('validating');
    try {
      const identifications = parsed.map((r) => r.identification);
      const response = await PersonasAPI.verifyBulk(identifications);

      if (response.status !== 'success') throw new Error('Respuesta inválida del servidor');

      const resultMap = new Map(
        (response.data.results ?? []).map((r) => [r.identification.toLowerCase(), r])
      );

      const updated: BulkValidatedRow[] = parsed.map((row) => {
        const match = resultMap.get(row.identification.toLowerCase());
        if (!match || !match.exists) {
          return { ...row, status: 'not_found', personId: null, personFullName: null };
        }
        return {
          ...row,
          status: 'valid',
          personId: match.person?.personId ?? null,
          personFullName: match.person
            ? `${match.person.firstName} ${match.person.lastName}`.trim()
            : null,
        };
      });

      setRows(updated);
      setStep('ready');
    } catch {
      setParseError('Error al verificar personas en el servidor. Intente de nuevo.');
      setStep('error');
    }
  }, []);

  const parseFile = useCallback(
    async (file: File) => {
      setParseError(null);
      setStep('parsing');

      try {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: null });

        if (raw.length === 0) {
          setParseError('El archivo no contiene filas de datos.');
          setStep('error');
          return;
        }

        const firstRow = raw[0];
        const missing = REQUIRED_COLS.filter((c) => !(c in firstRow));
        if (missing.length > 0) {
          setParseError(
            `Columnas obligatorias faltantes: ${missing.join(', ')}. ` +
              'Use la plantilla descargable para asegurarse de que los encabezados sean correctos.'
          );
          setStep('error');
          return;
        }

        const parsed = raw
          .map((r, i) => parseRow(r, i))
          .filter((r): r is BulkValidatedRow => r !== null);

        if (parsed.length === 0) {
          setParseError(
            'No se encontraron filas válidas. Verifique que los campos obligatorios ' +
              '(identificacion, tipo, job_id) estén completos.'
          );
          setStep('error');
          return;
        }

        await validate(parsed);
      } catch {
        setParseError('Error al leer el archivo. Asegúrese de que sea un Excel (.xlsx) válido.');
        setStep('error');
      }
    },
    [validate]
  );

  const removeRow = useCallback((rowIndex: number) => {
    setRows((prev) => prev.filter((r) => r._rowIndex !== rowIndex));
  }, []);

  const reset = useCallback(() => {
    setStep('idle');
    setRows([]);
    setParseError(null);
  }, []);

  const validRows = rows.filter((r) => r.status === 'valid');
  const invalidRows = rows.filter((r) => r.status !== 'valid');
  const canUpload = rows.length > 0 && invalidRows.length === 0 && step === 'ready';

  return { step, rows, validRows, invalidRows, parseError, canUpload, parseFile, removeRow, reset };
}

/** Genera y descarga el archivo Excel de plantilla para carga masiva. */
export function downloadBulkTemplate(): void {
  const headers = [
    'identificacion',
    'tipo',
    'job_id',
    'fecha_inicio',
    'fecha_fin',
    'horas_semanales',
    'valor_hora',
    'observacion',
  ];
  const example = [
    '1234567890',
    'ADMINISTRATIVO',
    '1',
    '2025-01-01',
    '2025-12-31',
    '',
    '',
    'Observación opcional',
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws['!cols'] = headers.map(() => ({ wch: 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
  XLSX.writeFile(wb, 'plantilla_personas_solicitud.xlsx');
}
