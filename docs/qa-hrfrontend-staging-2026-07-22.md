# Reporte QA HrFrontend / HrBackend

Fecha: 2026-07-22  
Entorno usado: Frontend `http://localhost:5173`, RH API `http://localhost:5000`, Auth API `http://localhost:5010`  
Usuario: administrador local autorizado  
Empleado usado para autoservicio/API: `employeeId=1` (`Henry Flores`)

## Resumen

- PASA: 15
- FALLA: 4
- BLOQUEADO / NO EJECUTABLE: 9
- Limpieza posterior: saldo del empleado 1 volvió a `21456` minutos. Permisos QA `64`, `65`, `67` fueron eliminados. Renuncias QA `8`, `9` quedaron `ANULADO`.

## Resultados por caso

| Caso | Estado | Detalle |
|---|---|---|
| A1 | PASA | `/permissions`, pestaña Permisos: el frontend ordena por fecha de registro descendente antes de paginar y reinicia página a 1 al cambiar filtros (`useEffect` sobre filtros). Hay 14 permisos para employeeId 1. |
| A2 | PASA | `/permissions`, pestaña Vacaciones: el frontend ordena por fecha de registro descendente antes de paginar y reinicia página a 1 al cambiar filtros. Hay 6 vacaciones para employeeId 1; el control permite cambiar tamaño de página. |
| A3 | PASA | `/ApprovalsPermissions`, pestaña Justificaciones: endpoint real `/api/v1/rh/cv/justifications/bossId/1` respondió 200 con 23 registros; el frontend ordena por estado y fecha descendente antes de paginar, y reinicia página a 1 al cambiar filtros. |
| A4 | BLOQUEADO | No se ejecutó aprobar/rechazar estando en página distinta de 1 porque no existe un segundo usuario/empleado subordinado de prueba autorizado. Evité alterar solicitudes existentes de terceros. |
| B1 | PASA | Crear vacación de 1 día reservó saldo correctamente: antes `21456`, después `20976`, delta `-480`. Vacación QA `24`. |
| B2 | BLOQUEADO | Aprobación bloqueada por regla de negocio: HTTP 500, mensaje exacto `No puede aprobar su propia solicitud de vacaciones.` El saldo no cambió (`20976` a `20976`), pero no se pudo validar aprobación real sin segundo aprobador. |
| B3 | PASA | Crear segunda vacación y cancelarla liberó saldo: antes `20976`, tras crear `20496`, tras cancelar `20976`. Vacación QA `25`. |
| B4 | PASA | Editar vacación planificada de 1 a 2 días recalculó saldo: antes `20976`, después `20016`, delta `-960`. Luego fue cancelada para limpieza. Vacación QA `26`. |
| B5 | PASA | Crear y eliminar vacación liberó saldo: antes `20976`, tras crear `20496`, tras eliminar `20976`. Vacación QA `27`. |
| B6 | PASA | El empleado 1 tiene régimen activo LOES además de LOSEP. Los casos B1-B5 ejecutaron contra este empleado con régimen activo LOES disponible; el saldo se movió y se restauró correctamente. |
| B7 | PASA | Cancelar y volver a planificar el mismo período funcionó. Primera vacación QA `28` cancelada; segunda QA `29` creada sin error de duplicado y luego cancelada. |
| C1 | FALLA | Crear permiso de 1 día descontó `672` minutos aunque `WORK_MINUTES_PER_DAY=480` y `hourTaken=480`: antes `20976`, después `20304`. Permiso QA `64`. |
| C2 | BLOQUEADO | Aprobación bloqueada por regla de negocio: HTTP 500, mensaje exacto `No puede aprobar o rechazar su propia solicitud de permiso.` El saldo no cambió, pero no se pudo validar aprobación real sin segundo aprobador. |
| C3 | BLOQUEADO | Rechazo bloqueado por la misma regla de autoaprobación/autorrechazo. Se creó permiso QA `65`; el rechazo devolvió HTTP 500 con `No puede aprobar o rechazar su propia solicitud de permiso.` |
| C5 | PASA | Crear y eliminar permiso liberó saldo: antes `19632`, tras crear `18960`, tras eliminar `19632`. Permiso QA `66`. |
| C7 | BLOQUEADO | No se pudo validar recreación tras rechazo porque el rechazo fue bloqueado. La segunda creación devolvió HTTP 500: `Ya existe un permiso activo que se superpone con estas fechas.` El permiso QA `67` fue eliminado en limpieza. |
| C6 | BLOQUEADO | No se forzó escenario de reserva liberada por otra vía sin acceso directo a BD o endpoint específico de liberación parcial. |
| D1 | PASA | Autoservicio creó solicitud propia de renuncia QA `8` con fecha futura (`2026-10-31`) y quedó `PENDIENTE`; luego fue anulada para limpieza. |
| D2 | PASA | RRHH creó solicitud en nombre del empleado QA `9` con fecha pasada (`2026-07-01`), quedó con historia `CREATED_BY_HR`; luego fue anulada para limpieza. |
| D3 | BLOQUEADO | No se ejecutó aprobación/subida de documento firmado porque requiere archivo firmado válido y un empleado de prueba con múltiples regímenes activos preparado para cierre. |
| D4 | BLOQUEADO | Depende de D3; no se verificó Active Directory en caso de múltiples regímenes. |
| D5 | BLOQUEADO | No se cerró régimen único ni se deshabilitó AD por falta de empleado de prueba dedicado y archivo firmado. |
| D6 | BLOQUEADO | No se verificó acumulación posterior a fecha de salida porque requiere proceso/corte mensual o endpoint de devengo controlado. |
| E1 | PASA | Revisión de frontend: `/vacation-balance-adjustment` contiene solo pestañas `Individual` y `Carga Masiva`; no contiene `Liquidaciones Pendientes`. |
| E2 | FALLA | `/api/v1/rh/timebalances/pending-settlements` respondió 200 pero el objeto no trae `currentRecoveryBalanceMin`. Solo devuelve `currentBalanceMin`. Esto rompe la columna `Recuperación (min)` esperada por la página nueva. |
| E3 | BLOQUEADO | No se procesó liquidación: el único pendiente visible es `PRUEBA QA LIQUIDACION POSITIVA`, explícitamente reservado para no liquidar. Además falta `currentRecoveryBalanceMin` en el payload. |
| E4 | PASA | Se respetó la restricción: no se liquidaron empleados reservados `9999900001` / `9999900002` ni el registro `PRUEBA QA LIQUIDACION POSITIVA`. |
| F1 | FALLA | Reporte empleados por departamento no pudo validarse por API: `GET/POST /api/v1/rh/reports/employees-by-department/preview` devolvió 404. Requiere revisar ruta/base de reportes usada por el entorno. |
| F2 | FALLA | Se observaron errores genéricos 500 en flujos de permisos/vacaciones: autoaprobación/autorrechazo devuelve `Error inesperado` con detalle de negocio. Debería responder 400/409 con mensaje claro de validación. |

## Fallas Priorizadas

1. **C1 - Descuento incorrecto en permisos:** el backend descontó `672` minutos al crear un permiso con `hourTaken=480`. Impacta saldos.
2. **E2 - Liquidaciones sin recuperación:** `pending-settlements` no devuelve `currentRecoveryBalanceMin`, aunque la UI espera mostrar y liquidar vacaciones + recuperación.
3. **F2 - Errores de negocio como HTTP 500:** autoaprobación/autorrechazo devuelven `Error inesperado`; deberían ser errores controlados.
4. **F1 - Reporte empleados por departamento 404:** no se pudo validar regresión del reporte por ruta no disponible en el entorno probado.

## Evidencia Técnica

- Resultados automáticos: `docs/qa-evidence/qa-hr-staging-results.json`
- Limpieza verificada:
  - Saldo final empleado 1: `21456` minutos.
  - Vacación QA `24`: `Canceled`.
  - Permisos QA `64`, `65`, `67`: `404 Not Found` tras limpieza.
  - Renuncias QA `8`, `9`: `ANULADO`.

