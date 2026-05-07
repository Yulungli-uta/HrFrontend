# Estructura propuesta

## Objetivo
Organizar los servicios por bloques funcionales para que la revision sea mas natural y no por dispersion historica.

## Bloques
- `security.ts`: seguridad y acceso.
- `people.ts`: persona, empleado y estructura organizacional.
- `cv.ts`: hoja de vida y expediente.
- `contracts.ts`: contratos y entidades relacionales usadas en su revision.
- `attendance.ts`: asistencia y ausencias.
- `planning.ts`: planificaciones.
- `payroll.ts`: nomina pura.
- `calculations.ts`: calculos auxiliares.
- `catalogs.ts`: catalogos maestros y geografia.
- `documents.ts`: archivos y documentos.
- `system.ts`: salud, sistema y auditoria.
- `reports.ts`: reportes.

## Cambios frente a la primera entrega
- Se eliminaron archivos barrel redundantes que duplicaban estructura.
- Se movio el codigo real a los archivos finales.
- Ya no se incluyen `auth.ts`, `employees.ts`, `files.ts`, `geo.ts`, `platform.ts` ni wrappers equivalentes dentro del paquete reorganizado.
