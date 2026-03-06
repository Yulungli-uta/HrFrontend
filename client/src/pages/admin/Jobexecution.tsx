// src/pages/admin/Jobexecution.tsx

import React, { useState } from 'react';
import { AttendanceCalculationAPI } from '@/lib/api';
import type { AttendanceCalculationRequestDto } from '@/lib/api';
import { parseApiError } from '@/lib/error-handling';

interface ExecutionState {
  loading: boolean;
  success: boolean | null;
  message: string;
  error: string | null;
}

const JobExecution: React.FC = () => {
  // Estados para los campos del formulario
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');

  // Estados de ejecución para cada operación
  const [calculateRangeState, setCalculateRangeState] = useState<ExecutionState>({
    loading: false,
    success: null,
    message: '',
    error: null
  });

  const [calculateNightState, setCalculateNightState] = useState<ExecutionState>({
    loading: false,
    success: null,
    message: '',
    error: null
  });

  const [processRangeState, setProcessRangeState] = useState<ExecutionState>({
    loading: false,
    success: null,
    message: '',
    error: null
  });

  const [applyJustificationsState, setApplyJustificationsState] = useState<ExecutionState>({
    loading: false,
    success: null,
    message: '',
    error: null
  });

  const [applyOvertimeState, setApplyOvertimeState] = useState<ExecutionState>({
    loading: false,
    success: null,
    message: '',
    error: null
  });

  // Validación de fechas
  const validateDates = (): boolean => {
    if (!fromDate || !toDate) {
      return false;
    }
    const from = new Date(fromDate);
    const to = new Date(toDate);
    return from <= to;
  };

  // Preparar datos para la petición
  const prepareRequestData = (): AttendanceCalculationRequestDto => {
    return {
      fromDate,
      toDate,
      employeeId: employeeId ? parseInt(employeeId) : undefined
    };
  };

  // Handler genérico para ejecutar servicios
  const executeService = async (
    serviceFn: (data: AttendanceCalculationRequestDto) => Promise<any>,
    setState: React.Dispatch<React.SetStateAction<ExecutionState>>,
    serviceName: string
  ) => {
    if (!validateDates()) {
      setState({
        loading: false,
        success: false,
        message: '',
        error: 'Por favor, ingrese fechas válidas (Desde debe ser menor o igual a Hasta)'
      });
      return;
    }

    setState({
      loading: true,
      success: null,
      message: '',
      error: null
    });

    try {
      const data = prepareRequestData();
      const response = await serviceFn(data);

      if (response.status === 'success') {
        setState({
          loading: false,
          success: true,
          message: response.data?.message || `${serviceName} ejecutado correctamente`,
          error: null
        });
      } else {
        setState({
          loading: false,
          success: false,
          message: '',
          error: response.error?.message || `Error al ejecutar ${serviceName}`
        });
      }
    } catch (error: unknown) {
      setState({
        loading: false,
        success: false,
        message: '',
        error: parseApiError(error).message || `Error inesperado al ejecutar ${serviceName}`
      });
    }
  };

  // Handlers específicos para cada servicio
  const handleCalculateRange = () => {
    executeService(
      AttendanceCalculationAPI.calculateRange,
      setCalculateRangeState,
      'Cálculo de Asistencia'
    );
  };

  const handleCalculateNightMinutes = () => {
    executeService(
      AttendanceCalculationAPI.calculateNightMinutes,
      setCalculateNightState,
      'Cálculo de Minutos Nocturnos'
    );
  };

  const handleProcessRange = () => {
    executeService(
      AttendanceCalculationAPI.processAttendanceRange,
      setProcessRangeState,
      'Procesamiento de Rango de Asistencia'
    );
  };

  const handleApplyJustifications = () => {
    executeService(
      AttendanceCalculationAPI.applyJustifications,
      setApplyJustificationsState,
      'Aplicación de Justificaciones'
    );
  };

  const handleApplyOvertimeRecovery = () => {
    executeService(
      AttendanceCalculationAPI.applyOvertimeRecovery,
      setApplyOvertimeState,
      'Aplicación de Recuperación de Horas Extra'
    );
  };

  // Componente para mostrar el estado de ejecución
  const ExecutionStatus: React.FC<{ state: ExecutionState }> = ({ state }) => {
    if (state.loading) {
      return (
        <div className="text-sm text-blue-600 mt-1 flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Ejecutando...
        </div>
      );
    }

    if (state.success === true) {
      return (
        <div className="text-sm text-green-600 mt-1 flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {state.message}
        </div>
      );
    }

    if (state.success === false && state.error) {
      return (
        <div className="text-sm text-red-600 mt-1 flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {state.error}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-3">
          Ejecución de Jobs de Asistencia
        </h1>

        {/* Formulario de Parámetros */}
        <div className="mb-8 bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Parámetros de Ejecución</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fecha Desde */}
            <div>
              <label htmlFor="fromDate" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Desde *
              </label>
              <input
                type="date"
                id="fromDate"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Fecha Hasta */}
            <div>
              <label htmlFor="toDate" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Hasta *
              </label>
              <input
                type="date"
                id="toDate"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* ID de Empleado (Opcional) */}
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-2">
                ID Empleado (Opcional)
              </label>
              <input
                type="number"
                id="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Dejar vacío para todos"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-3">
            * Campos obligatorios. Si no se especifica ID de empleado, se procesarán todos los empleados.
          </p>
        </div>

        {/* Botones de Ejecución */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Procesos Disponibles</h2>

          {/* 1. Calcular Rango de Asistencia */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-800">Calcular Rango de Asistencia</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Ejecuta el cálculo masivo de asistencia para el rango de fechas especificado
                </p>
              </div>
              <button
                onClick={handleCalculateRange}
                disabled={calculateRangeState.loading || !fromDate || !toDate}
                className="ml-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Ejecutar
              </button>
            </div>
            <ExecutionStatus state={calculateRangeState} />
          </div>

          {/* 2. Calcular Minutos Nocturnos */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-800">Calcular Minutos Nocturnos</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Calcula los minutos trabajados en horario nocturno para el rango especificado
                </p>
              </div>
              <button
                onClick={handleCalculateNightMinutes}
                disabled={calculateNightState.loading || !fromDate || !toDate}
                className="ml-4 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Ejecutar
              </button>
            </div>
            <ExecutionStatus state={calculateNightState} />
          </div>

          {/* 3. Procesar Rango de Asistencia */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-800">Procesar Rango de Asistencia</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Orquestador principal que procesa todo el rango de asistencia
                </p>
              </div>
              <button
                onClick={handleProcessRange}
                disabled={processRangeState.loading || !fromDate || !toDate}
                className="ml-4 px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Ejecutar
              </button>
            </div>
            <ExecutionStatus state={processRangeState} />
          </div>

          {/* 4. Aplicar Justificaciones */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-800">Aplicar Justificaciones</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Aplica justificaciones aprobadas para anular atrasos o ausencias
                </p>
              </div>
              <button
                onClick={handleApplyJustifications}
                disabled={applyJustificationsState.loading || !fromDate || !toDate}
                className="ml-4 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Ejecutar
              </button>
            </div>
            <ExecutionStatus state={applyJustificationsState} />
          </div>

          {/* 5. Aplicar Recuperación de Horas Extra */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-800">Aplicar Recuperación de Horas Extra</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Procesa el cálculo y aplicación de recuperación de horas extra
                </p>
              </div>
              <button
                onClick={handleApplyOvertimeRecovery}
                disabled={applyOvertimeState.loading || !fromDate || !toDate}
                className="ml-4 px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Ejecutar
              </button>
            </div>
            <ExecutionStatus state={applyOvertimeState} />
          </div>
        </div>

        {/* Información Adicional */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">ℹ️ Información Importante</h3>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Los procesos pueden tardar varios minutos dependiendo del rango de fechas</li>
            <li>Se recomienda ejecutar los procesos en orden secuencial</li>
            <li>Los resultados se guardan automáticamente en la base de datos</li>
            <li>Si no se especifica un empleado, se procesarán todos los empleados activos</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default JobExecution;