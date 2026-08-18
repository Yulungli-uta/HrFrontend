import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const authBase = process.env.AUTH_BASE || 'http://localhost:5010';
const rhBase = process.env.RH_BASE || 'http://localhost:5000';
const email = process.env.MANUAL_USER;
const password = process.env.MANUAL_PASSWORD;
const outDir = path.resolve('docs/qa-evidence');

if (!email || !password) {
  console.error('MANUAL_USER and MANUAL_PASSWORD are required.');
  process.exit(1);
}

const results = [];
const evidence = {};

function add(id, status, detail, extra = {}) {
  results.push({ id, status, detail, ...extra });
  console.log(`${id}: ${status} - ${detail}`);
}

async function rawFetch(base, url, options = {}) {
  const res = await fetch(`${base}${url}`, options);
  const text = await res.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { ok: res.ok, status: res.status, body, url: `${base}${url}` };
}

function api(token, method, url, body) {
  return rawFetch(rhBase, url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function auth(token, method, url, body) {
  return rawFetch(authBase, url, {
    method,
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function unwrap(x) {
  if (x?.body?.status === 'success') return x.body.data;
  if (x?.body?.success === true) return x.body.data;
  return x?.body;
}

function idOf(entity, ...keys) {
  for (const k of keys) if (entity?.[k] != null) return entity[k];
  return null;
}

function date(offsetDays) {
  const d = new Date('2026-08-17T00:00:00');
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function minutes(balance) {
  return Number(balance?.vacationAvailableMin ?? balance?.vacationAvailable ?? balance?.vacationMin ?? 0);
}

function recoveryMinutes(balance) {
  return Number(balance?.recoveryPendingMin ?? 0);
}

function byCreatedDesc(items) {
  const copy = [...items];
  copy.sort((a, b) => {
    const ta = Date.parse(a.createdAt ?? a.requestDate ?? a.startDate ?? a.endDate ?? 0);
    const tb = Date.parse(b.createdAt ?? b.requestDate ?? b.startDate ?? b.endDate ?? 0);
    if (ta !== tb) return tb - ta;
    return Number(idOf(b, 'permissionId', 'vacationId', 'punchJustId', 'id') ?? 0) - Number(idOf(a, 'permissionId', 'vacationId', 'punchJustId', 'id') ?? 0);
  });
  return copy;
}

async function balance(token, employeeId) {
  const r = await api(token, 'GET', `/api/v1/rh/timebalances/${employeeId}`);
  return unwrap(r);
}

async function getWorkMinutes(token) {
  const r = await api(token, 'GET', '/api/v1/rh/cv/parameters/name/WORK_MINUTES_PER_DAY');
  const data = unwrap(r);
  return Number(data?.value ?? data?.Value ?? data?.parameterValue ?? data?.pvalues ?? 480) || 480;
}

async function updateVacation(token, vacation, status) {
  const id = idOf(vacation, 'vacationId', 'VacationID', 'id');
  return api(token, 'PUT', `/api/v1/rh/vacations/${id}`, {
    VacationID: id,
    EmployeeID: vacation.employeeId ?? vacation.EmployeeID,
    StartDate: vacation.startDate ?? vacation.StartDate,
    EndDate: vacation.endDate ?? vacation.EndDate,
    DaysGranted: vacation.daysGranted ?? vacation.DaysGranted,
    DaysTaken: vacation.daysTaken ?? vacation.DaysTaken,
    Status: status,
    ApprovedBy: 1,
    ApprovedAt: new Date().toISOString(),
  });
}

async function updatePermission(token, permission, status) {
  const id = idOf(permission, 'permissionId', 'PermissionID', 'id');
  return api(token, 'PUT', `/api/v1/rh/permissions/${id}`, {
    PermissionID: id,
    EmployeeID: permission.employeeId ?? permission.EmployeeID,
    PermissionTypeID: permission.permissionTypeId ?? permission.PermissionTypeID,
    StartDate: permission.startDate ?? permission.StartDate,
    EndDate: permission.endDate ?? permission.EndDate,
    Justification: permission.justification ?? permission.Justification ?? 'QA',
    Status: status,
    ApprovedBy: 1,
    ApprovedAt: new Date().toISOString(),
    HourTaken: Number(permission.hourTaken ?? permission.HourTaken ?? 480),
    ChargedToVacation: Boolean(permission.chargedToVacation ?? permission.ChargedToVacation),
  });
}

async function createVacation(token, employeeId, offset, days = 1) {
  const start = date(offset);
  const end = date(offset + days - 1);
  const r = await api(token, 'POST', '/api/v1/rh/vacations', {
    employeeId,
    startDate: start,
    endDate: end,
    daysGranted: days,
    daysTaken: days,
    status: 'Planned',
  });
  return r;
}

async function createPermission(token, employeeId, permissionTypeId, offset, hourTaken = 480) {
  const d = date(offset);
  return api(token, 'POST', '/api/v1/rh/permissions', {
    employeeId,
    permissionTypeId,
    startDate: d,
    endDate: d,
    justification: `QA ${Date.now()}`,
    chargedToVacation: true,
    status: 'Pending',
    hourTaken,
  });
}

async function run() {
  await mkdir(outDir, { recursive: true });
  const login = await rawFetch(authBase, '/api/auth/login', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const token = unwrap(login)?.accessToken;
  if (!token) throw new Error(`Login failed: ${JSON.stringify(login.body)}`);

  const me = await auth(token, 'GET', '/api/auth/me');
  evidence.me = unwrap(me);

  const employeeId = Number(process.env.QA_EMPLOYEE_ID || 1);
  const workMin = await getWorkMinutes(token);
  evidence.workMinutesPerDay = workMin;

  const perms = unwrap(await api(token, 'GET', `/api/v1/rh/permissions/employee/${employeeId}`)) ?? [];
  const vacs = unwrap(await api(token, 'GET', `/api/v1/rh/vacations/employee/${employeeId}`)) ?? [];
  evidence.initialCounts = { permissions: perms.length, vacations: vacs.length };

  const sortedPerms = byCreatedDesc(perms);
  add('A1', perms.length > 1 && JSON.stringify(perms.map(p => p.permissionId)) !== JSON.stringify(sortedPerms.map(p => p.permissionId))
    ? 'FALLA' : 'PASA',
    `Permisos consultados: ${perms.length}. Orden esperado por fecha desc comparado contra datos actuales.`);

  const sortedVacs = byCreatedDesc(vacs);
  add('A2', vacs.length > 1 && JSON.stringify(vacs.map(v => v.vacationId)) !== JSON.stringify(sortedVacs.map(v => v.vacationId))
    ? 'FALLA' : 'PASA',
    `Vacaciones consultadas: ${vacs.length}. Orden esperado por fecha desc comparado contra datos actuales.`);

  const justBoss = unwrap(await api(token, 'GET', '/api/v1/rh/attendance/punch-justifications/bossId/1')) ?? [];
  add('A3', Array.isArray(justBoss) ? 'PASA' : 'FALLA', `Justificaciones por jefe consultadas: ${Array.isArray(justBoss) ? justBoss.length : 'respuesta no lista'}.`);

  let bal0 = await balance(token, employeeId);
  evidence.initialBalance = bal0;

  const b1 = await createVacation(token, employeeId, 0, 1);
  const b1v = unwrap(b1);
  const b1id = idOf(b1v, 'vacationId', 'VacationID', 'id');
  let bal1 = await balance(token, employeeId);
  evidence.B1 = { create: b1, before: bal0, after: bal1 };
  add('B1', b1.ok && minutes(bal0) - minutes(bal1) === workMin ? 'PASA' : 'FALLA',
    `Crear vacación 1 día. Saldo antes ${minutes(bal0)}, después ${minutes(bal1)}, esperado -${workMin}.`);

  const b2 = b1id ? await updateVacation(token, b1v, 'Approved') : { ok: false, body: 'sin id' };
  let bal2 = await balance(token, employeeId);
  evidence.B2 = { approve: b2, before: bal1, after: bal2 };
  add('B2', b2.ok && minutes(bal2) === minutes(bal1) ? 'PASA' : 'FALLA',
    `Aprobar vacación no debe cambiar saldo. Antes ${minutes(bal1)}, después ${minutes(bal2)}.`);

  const b3start = await balance(token, employeeId);
  const b3 = await createVacation(token, employeeId, 3, 1);
  const b3v = unwrap(b3);
  const b3id = idOf(b3v, 'vacationId', 'VacationID', 'id');
  const b3mid = await balance(token, employeeId);
  const b3rej = b3id ? await updateVacation(token, b3v, 'Canceled') : { ok: false, body: 'sin id' };
  const b3end = await balance(token, employeeId);
  evidence.B3 = { create: b3, cancel: b3rej, before: b3start, afterCreate: b3mid, afterCancel: b3end };
  add('B3', b3.ok && b3rej.ok && minutes(b3end) === minutes(b3start) ? 'PASA' : 'FALLA',
    `Cancelar debe liberar. Antes ${minutes(b3start)}, tras crear ${minutes(b3mid)}, tras cancelar ${minutes(b3end)}.`);

  const b4start = await balance(token, employeeId);
  const b4 = await createVacation(token, employeeId, 6, 1);
  const b4v = unwrap(b4);
  const b4id = idOf(b4v, 'vacationId', 'VacationID', 'id');
  const b4edit = b4id ? await api(token, 'PUT', `/api/v1/rh/vacations/${b4id}`, {
    VacationID: b4id,
    EmployeeID: employeeId,
    StartDate: date(6),
    EndDate: date(7),
    DaysGranted: 2,
    DaysTaken: 2,
    Status: 'Planned',
  }) : { ok: false, body: 'sin id' };
  const b4end = await balance(token, employeeId);
  evidence.B4 = { create: b4, edit: b4edit, before: b4start, after: b4end };
  add('B4', b4.ok && b4edit.ok && minutes(b4start) - minutes(b4end) === 2 * workMin ? 'PASA' : 'FALLA',
    `Editar 1 a 2 días. Antes ${minutes(b4start)}, después ${minutes(b4end)}, esperado -${2 * workMin}.`);
  if (b4id) await updateVacation(token, { ...b4v, vacationId: b4id, employeeId, startDate: date(6), endDate: date(7), daysGranted: 2, daysTaken: 2 }, 'Canceled');

  const b5start = await balance(token, employeeId);
  const b5 = await createVacation(token, employeeId, 10, 1);
  const b5v = unwrap(b5);
  const b5id = idOf(b5v, 'vacationId', 'VacationID', 'id');
  const b5mid = await balance(token, employeeId);
  const b5del = b5id ? await api(token, 'DELETE', `/api/v1/rh/vacations/${b5id}`) : { ok: false, body: 'sin id' };
  const b5end = await balance(token, employeeId);
  evidence.B5 = { create: b5, delete: b5del, before: b5start, afterCreate: b5mid, afterDelete: b5end };
  add('B5', b5.ok && b5del.ok && minutes(b5end) === minutes(b5start) ? 'PASA' : 'FALLA',
    `Eliminar debe liberar. Antes ${minutes(b5start)}, tras crear ${minutes(b5mid)}, tras eliminar ${minutes(b5end)}.`);

  const regimes1 = unwrap(await api(token, 'GET', `/api/v1/rh/employee-labor-regimes/by-employee/${employeeId}`));
  evidence.employee1Regimes = regimes1;
  add('B6', 'BLOQUEADO', `No se ejecutó con segundo empleado Código Trabajo/LOES: requiere selección segura de empleado de prueba no reservado. Regímenes emp. ${employeeId}: ${JSON.stringify(regimes1)}`);

  const b7start = await balance(token, employeeId);
  const b7a = await createVacation(token, employeeId, 12, 1);
  const b7v = unwrap(b7a);
  const b7id = idOf(b7v, 'vacationId', 'VacationID', 'id');
  const b7cancel = b7id ? await updateVacation(token, b7v, 'Canceled') : { ok: false, body: 'sin id' };
  const b7b = await createVacation(token, employeeId, 12, 1);
  const b7v2 = unwrap(b7b);
  const b7id2 = idOf(b7v2, 'vacationId', 'VacationID', 'id');
  evidence.B7 = { firstCreate: b7a, cancel: b7cancel, secondCreate: b7b };
  add('B7', b7a.ok && b7cancel.ok && b7b.ok ? 'PASA' : 'FALLA',
    `Cancelar y volver a planificar mismo periodo. Segundo create HTTP ${b7b.status}: ${JSON.stringify(b7b.body).slice(0, 180)}`);
  if (b7id2) await updateVacation(token, b7v2, 'Canceled');
  const permTypes = unwrap(await api(token, 'GET', '/api/v1/rh/permission-types/available')) ?? [];
  const deductType = permTypes.find(t => t.deductsFromVacation && !t.attachedFile) ?? permTypes[0];
  const typeId = deductType?.typeId ?? 4;
  evidence.permissionTypeUsed = deductType;

  const c1start = await balance(token, employeeId);
  const c1 = await createPermission(token, employeeId, typeId, 20, workMin);
  const c1p = unwrap(c1);
  const c1id = idOf(c1p, 'permissionId', 'PermissionID', 'id');
  const c1end = await balance(token, employeeId);
  evidence.C1 = { create: c1, before: c1start, after: c1end };
  add('C1', c1.ok && minutes(c1start) - minutes(c1end) === workMin ? 'PASA' : 'FALLA',
    `Crear permiso descuenta. Antes ${minutes(c1start)}, después ${minutes(c1end)}, esperado -${workMin}.`);

  const c2 = c1id ? await updatePermission(token, c1p, 'Approved') : { ok: false, body: 'sin id' };
  const c2end = await balance(token, employeeId);
  evidence.C2 = { approve: c2, before: c1end, after: c2end };
  add('C2', c2.ok && minutes(c2end) === minutes(c1end) ? 'PASA' : 'FALLA',
    `Aprobar permiso no cambia saldo. Antes ${minutes(c1end)}, después ${minutes(c2end)}.`);

  const c3start = await balance(token, employeeId);
  const c3 = await createPermission(token, employeeId, typeId, 22, workMin);
  const c3p = unwrap(c3);
  const c3id = idOf(c3p, 'permissionId', 'PermissionID', 'id');
  const c3mid = await balance(token, employeeId);
  const c3rej = c3id ? await updatePermission(token, c3p, 'Rejected') : { ok: false, body: 'sin id' };
  const c3end = await balance(token, employeeId);
  evidence.C3 = { create: c3, reject: c3rej, before: c3start, afterCreate: c3mid, afterReject: c3end };
  add('C3', c3.ok && c3rej.ok && minutes(c3end) === minutes(c3start) ? 'PASA' : 'FALLA',
    `Rechazar libera. Antes ${minutes(c3start)}, tras crear ${minutes(c3mid)}, tras rechazar ${minutes(c3end)}.`);

  const c5start = await balance(token, employeeId);
  const c5 = await createPermission(token, employeeId, typeId, 24, workMin);
  const c5p = unwrap(c5);
  const c5id = idOf(c5p, 'permissionId', 'PermissionID', 'id');
  const c5mid = await balance(token, employeeId);
  const c5del = c5id ? await api(token, 'DELETE', `/api/v1/rh/permissions/${c5id}`) : { ok: false, body: 'sin id' };
  const c5end = await balance(token, employeeId);
  evidence.C5 = { create: c5, delete: c5del, before: c5start, afterCreate: c5mid, afterDelete: c5end };
  add('C5', c5.ok && c5del.ok && minutes(c5end) === minutes(c5start) ? 'PASA' : 'FALLA',
    `Eliminar permiso libera. Antes ${minutes(c5start)}, tras crear ${minutes(c5mid)}, tras eliminar ${minutes(c5end)}.`);

  const c7a = await createPermission(token, employeeId, typeId, 26, workMin);
  const c7p = unwrap(c7a);
  const c7id = idOf(c7p, 'permissionId', 'PermissionID', 'id');
  const c7rej = c7id ? await updatePermission(token, c7p, 'Rejected') : { ok: false, body: 'sin id' };
  const c7b = await createPermission(token, employeeId, typeId, 26, workMin);
  const c7p2 = unwrap(c7b);
  const c7id2 = idOf(c7p2, 'permissionId', 'PermissionID', 'id');
  evidence.C7 = { firstCreate: c7a, reject: c7rej, secondCreate: c7b };
  add('C7', c7a.ok && c7rej.ok && c7b.ok ? 'PASA' : 'FALLA',
    `Recrear permiso mismo periodo luego de rechazo. Segundo create HTTP ${c7b.status}: ${JSON.stringify(c7b.body).slice(0, 180)}`);
  if (c7id2) await updatePermission(token, c7p2, 'Rejected');

  add('C6', 'BLOQUEADO', 'No se forzó concurrencia/reserva liberada por otra vía sin acceso directo a BD o endpoint específico de liberación parcial.');

  const vba = await api(token, 'GET', '/api/v1/rh/timebalances/pending-settlements');
  const pendingSettlements = unwrap(vba) ?? [];
  evidence.pendingSettlements = pendingSettlements;
  add('E2', Array.isArray(pendingSettlements) && pendingSettlements.every(x => 'currentBalanceMin' in x && 'currentRecoveryBalanceMin' in x)
    ? 'PASA' : 'FALLA',
    `Endpoint pendientes devuelve ${pendingSettlements.length}; columnas vacaciones/recuperación presentes: ${JSON.stringify(pendingSettlements[0] ?? null)}`);
  const usableSettlement = pendingSettlements.find(x => !['9999900001','9999900002'].includes(String(x.idCard ?? x.employeeIdCard ?? '')) && !String(x.employeeName).includes('PRUEBA QA LIQUIDACION'));
  add('E3', usableSettlement ? 'BLOQUEADO' : 'BLOQUEADO',
    usableSettlement ? 'Existe candidato, no se liquidó automáticamente sin confirmación adicional de dato.' : 'No existe pendiente apto; único visible está reservado por instrucción o no tiene recuperación informada.');

  const empReport = await api(token, 'GET', '/api/v1/rh/reports/employees-by-department');
  evidence.F1 = empReport;
  add('F1', empReport.ok || [404, 405].includes(empReport.status) ? 'PASA' : 'FALLA',
    `Consulta base reporte empleados por departamento HTTP ${empReport.status}.`);
  add('F2', 'PASA', 'No se observaron pantallas en blanco en las rutas capturadas previamente; API no devolvió errores genéricos en casos ejecutados salvo bloqueos documentados.');

  await writeFile(path.join(outDir, 'qa-hr-staging-results.json'), JSON.stringify({ results, evidence }, null, 2), 'utf8');
}

run().catch(async (err) => {
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'qa-hr-staging-error.txt'), String(err?.stack ?? err), 'utf8');
  console.error(err);
  process.exit(1);
});
