// src/pages/admin/Jobexecution.tsx

import React, { useMemo, useState } from 'react';
import { AttendanceCalculationAPI, ScheduledJobsAPI } from '@/lib/api';
import type { AttendanceCalculationRequestDto } from '@/lib/api';
import type { StudentEnrollmentSyncResult } from '@/lib/api';
import { parseApiError } from '@/lib/error-handling';

interface ExecutionState {
  loading: boolean;
  success: boolean | null;
  message: string;
  error: string | null;
}

const initialExecutionState: ExecutionState = {
  loading: false,
  success: null,
  message: '',
  error: null,
};

const WARNING_RANGE_DAYS = 3;

const ExecutionStatus: React.FC<{ state: ExecutionState }> = ({ state }) => {
  if (state.loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-primary">
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Ejecutando proceso...
      </div>
    );
  }

  if (state.success === true) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-green-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {state.message}
      </div>
    );
  }

  if (state.success === false && state.error) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        {state.error}
      </div>
    );
  }

  return null;
};

const JobExecution: React.FC = () => {
  // ── Asistencia ────────────────────────────────────────────────────────────
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [processRangeState, setProcessRangeState] = useState<ExecutionState>(initialExecutionState);

  // ── Contratos vencidos ────────────────────────────────────────────────────
  const [contractExpirationState, setContractExpirationState] =
    useState<ExecutionState>(initialExecutionState);

  // ── Matrícula de estudiantes ──────────────────────────────────────────────
  const [periodCode, setPeriodCode] = useState<string>('');
  const [previousPeriod, setPreviousPeriod] = useState<string>('');
  const [studentSyncState, setStudentSyncState] =
    useState<ExecutionState>(initialExecutionState);

  const validateDates = (): boolean => {
    if (!fromDate || !toDate) return false;
    return new Date(fromDate) <= new Date(toDate);
  };

  const rangeDays = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
    return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [fromDate, toDate]);

  const isLargeRange = rangeDays > WARNING_RANGE_DAYS;

  const executeProcessRange = async () => {
    if (!validateDates()) {
      setProcessRangeState({
        loading: false,
        success: false,
        message: '',
        error: 'Por favor, ingrese fechas válidas. La fecha desde debe ser menor o igual a la fecha hasta.',
      });
      return;
    }

    setProcessRangeState({ loading: true, success: null, message: '', error: null });

    try {
      const data: AttendanceCalculationRequestDto = {
        fromDate,
        toDate,
        employeeId: employeeId ? parseInt(employeeId, 10) : undefined,
      };
      const response = await AttendanceCalculationAPI.processAttendanceRange(data);

      if (response.status === 'success') {
        setProcessRangeState({
          loading: false,
          success: true,
          message: response.data?.message ?? 'El procesamiento de asistencia se ejecutó correctamente.',
          error: null,
        });
      } else {
        setProcessRangeState({
          loading: false,
          success: false,
          message: '',
          error: response.error?.message ?? 'Ocurrió un error al ejecutar el procesamiento de asistencia.',
        });
      }
    } catch (error: unknown) {
      setProcessRangeState({
        loading: false,
        success: false,
        message: '',
        error: parseApiError(error).message ?? 'Ocurrió un error inesperado.',
      });
    }
  };

  const executeContractExpiration = async () => {
    setContractExpirationState({ loading: true, success: null, message: '', error: null });

    try {
      const response = await ScheduledJobsAPI.runContractExpiration();

      if (response.status === 'success') {
        setContractExpirationState({
          loading: false,
          success: true,
          message: response.data?.message ?? 'Proceso completado.',
          error: null,
        });
      } else {
        setContractExpirationState({
          loading: false,
          success: false,
          message: '',
          error: response.error?.message ?? 'Ocurrió un error al ejecutar el proceso.',
        });
      }
    } catch (error: unknown) {
      setContractExpirationState({
        loading: false,
        success: false,
        message: '',
        error: parseApiError(error).message ?? 'Ocurrió un error inesperado.',
      });
    }
  };

  const executeStudentEnrollmentSync = async () => {
    if (!periodCode.trim()) {
      setStudentSyncState({
        loading: false, success: false, message: '',
        error: 'El código de período es requerido (ej: 2024-I).',
      });
      return;
    }

    setStudentSyncState({ loading: true, success: null, message: '', error: null });

    try {
      const response = await ScheduledJobsAPI.runStudentEnrollmentSync(
        periodCode.trim(),
        previousPeriod.trim() || undefined,
      );

      if (response.status === 'success') {
        const d = response.data as StudentEnrollmentSyncResult;
        setStudentSyncState({
          loading: false, success: true,
          message: response.data?.message ?? `${d.provisioned} aprovisionado(s), ${d.disabled} deshabilitado(s).`,
          error: null,
        });
      } else {
        setStudentSyncState({
          loading: false, success: false, message: '',
          error: response.error?.message ?? 'Error al ejecutar la sincronización.',
        });
      }
    } catch (error: unknown) {
      setStudentSyncState({
        loading: false, success: false, message: '',
        error: parseApiError(error).message ?? 'Error inesperado.',
      });
    }
  };

  return (
    <div className="container mx-auto max-w-5xl p-6 space-y-8">

      {/* ── Sección: Asistencia ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-md">
        <h1 className="mb-6 border-b border-border pb-4 text-3xl font-bold text-foreground">
          Tareas Programadas
        </h1>

        {/* Parámetros de asistencia */}
        <div className="mb-8 rounded-2xl border border-border bg-background p-6">
          <h2 className="mb-5 text-xl font-semibold text-foreground">
            Parámetros de Asistencia
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="fromDate" className="mb-2 block text-sm font-medium text-foreground">
                Fecha Desde *
              </label>
              <input
                type="date"
                id="fromDate"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="toDate" className="mb-2 block text-sm font-medium text-foreground">
                Fecha Hasta *
              </label>
              <input
                type="date"
                id="toDate"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="employeeId" className="mb-2 block text-sm font-medium text-foreground">
                ID Empleado (Opcional)
              </label>
              <input
                type="number"
                id="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Dejar vacío para todos"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            * Campos obligatorios. Si no se especifica un empleado, se procesarán todos los empleados
            con horario vigente en el rango indicado.
          </p>

          {rangeDays > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Rango seleccionado:{' '}
              <span className="font-medium text-foreground">{rangeDays}</span> día(s).
            </p>
          )}

          {isLargeRange && (
            <div className="mt-4 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
              El rango seleccionado es amplio. La ejecución puede tardar bastante tiempo.
            </div>
          )}
        </div>

        {/* Jobs disponibles */}
        <div className="space-y-4">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Jobs de Asistencia</h2>

          <div className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-foreground">Procesar Rango de Asistencia</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ejecuta el pipeline completo de asistencia para el rango de fechas especificado.
                </p>
                <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  <li>Cálculo base de asistencia</li>
                  <li>Aplicación de permisos y vacaciones</li>
                  <li>Aplicación de justificaciones</li>
                  <li>Aplicación de recovery</li>
                  <li>Procesamiento de overtime y planning</li>
                  <li>Finalización del consolidado diario</li>
                </ul>
              </div>

              <button
                onClick={executeProcessRange}
                disabled={processRangeState.loading || !fromDate || !toDate}
                className="rounded-md bg-primary px-6 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                {processRangeState.loading ? 'Ejecutando...' : 'Ejecutar'}
              </button>
            </div>

            <ExecutionStatus state={processRangeState} />
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-primary">Información importante</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-primary">
            <li>Este es el proceso oficial y completo de asistencia.</li>
            <li>Ya no es necesario ejecutar por separado nocturnos, justificaciones u overtime/recovery.</li>
            <li>Los resultados se guardan automáticamente en la base de datos.</li>
            <li>Para rangos amplios, el proceso puede tardar bastante tiempo en responder.</li>
          </ul>
        </div>
      </div>

      {/* ── Sección: Contratos vencidos ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-md">
        <h2 className="mb-6 border-b border-border pb-4 text-2xl font-bold text-foreground">
          Gestión de Contratos
        </h2>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-foreground">Procesar Contratos Vencidos</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Detecta contratos en estado <span className="font-medium text-foreground">VIGENTE</span>{' '}
                  cuya fecha de fin ya pasó y que no tienen una addenda o renovación activa.
                </p>
                <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  <li>Marca el contrato como <span className="font-medium text-foreground">VENCIDO</span></li>
                  <li>
                    Deshabilita la cuenta AD del empleado si el tipo de contrato tiene{' '}
                    <span className="font-mono text-xs text-foreground">RequiresAdUserDisable = true</span>
                  </li>
                  <li>Mueve al usuario a la OU Inactivos y lo retira del grupo activo</li>
                  <li>
                    Este proceso también se ejecuta automáticamente cada noche a las{' '}
                    <span className="font-medium text-foreground">2:00 AM</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={executeContractExpiration}
                disabled={contractExpirationState.loading}
                className="mt-2 rounded-md bg-amber-600 px-6 py-2 font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground md:mt-0"
              >
                {contractExpirationState.loading ? 'Ejecutando...' : 'Ejecutar ahora'}
              </button>
            </div>

            <ExecutionStatus state={contractExpirationState} />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-400">Consideraciones</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-amber-400">
            <li>
              Solo aplica a contratos <strong>VIGENTE</strong> con fecha fin anterior a hoy sin
              addenda activa.
            </li>
            <li>
              La deshabilitación de cuentas AD requiere que la cuenta de servicio esté configurada en
              producción.
            </li>
            <li>No se puede deshacer la deshabilitación desde esta pantalla; use Gestión AD Local.</li>
          </ul>
        </div>
      </div>

      {/* ── Sección: Matrícula Estudiantes ──────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-md">
        <h2 className="mb-6 border-b border-border pb-4 text-2xl font-bold text-foreground">
          Gestión Académica
        </h2>

        <div className="mb-6 rounded-2xl border border-border bg-background p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Parámetros de Matrícula</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="periodCode" className="mb-2 block text-sm font-medium text-foreground">
                Período Actual *
              </label>
              <input
                type="text"
                id="periodCode"
                value={periodCode}
                onChange={(e) => setPeriodCode(e.target.value)}
                placeholder="Ej: 2024-I, 2024-II, 2025-I"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="previousPeriod" className="mb-2 block text-sm font-medium text-foreground">
                Período Anterior (para deshabilitar)
              </label>
              <input
                type="text"
                id="previousPeriod"
                value={previousPeriod}
                onChange={(e) => setPreviousPeriod(e.target.value)}
                placeholder="Ej: 2023-II (dejar vacío para solo aprovisionar)"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-foreground">Sincronización Matrícula Estudiantes</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Procesa el período académico indicado contra el origen de datos de matrícula.
                </p>
                <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  <li>Crea cuentas AD en <span className="font-mono text-xs text-foreground">OU=Activos,OU=ESTUDIANTES</span> para nuevos matriculados</li>
                  <li>Agrega al grupo <span className="font-mono text-xs text-foreground">EActivos</span></li>
                  <li>Si se indica período anterior: deshabilita las cuentas de no re-matriculados</li>
                  <li>Idempotente: si la cuenta ya existe, la omite sin error</li>
                </ul>
              </div>

              <button
                onClick={executeStudentEnrollmentSync}
                disabled={studentSyncState.loading || !periodCode.trim()}
                className="mt-2 rounded-md bg-emerald-600 px-6 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground md:mt-0"
              >
                {studentSyncState.loading ? 'Ejecutando...' : 'Ejecutar ahora'}
              </button>
            </div>

            <ExecutionStatus state={studentSyncState} />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-emerald-400">Consideraciones</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-emerald-400">
            <li>El origen de datos de matrícula debe estar configurado (tabla SQL o API externa).</li>
            <li>La cuenta de servicio de RepositoryUta debe estar configurada en producción.</li>
            <li>Configure <span className="font-mono text-xs">StudentEmployeeTypeIds = [0]</span> en RepositoryUta appsettings.</li>
          </ul>
        </div>
      </div>

    </div>
  );
};

export default JobExecution;
