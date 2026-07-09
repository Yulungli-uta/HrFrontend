import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const appBase = process.env.APP_BASE || 'http://localhost:5173';
const authBase = process.env.AUTH_BASE || 'http://localhost:5010';
const email = process.env.MANUAL_USER;
const password = process.env.MANUAL_PASSWORD;
const outDir = path.resolve('docs/assets/manuales-rh');
const userDataDir = path.resolve('.tmp/chrome-manuales-rh');
const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9223);

if (!email || !password) {
  console.error('MANUAL_USER and MANUAL_PASSWORD are required.');
  process.exit(1);
}

const scenarios = [
  // Manual usuario / autoservicio
  ['auto-00-login', '/login'],
  ['auto-01-hoja-vida', '/perfil'],
  ['auto-02-asistencia', '/attendance'],
  ['auto-03-asistencia-consulta-rango', '/attendance', [{ kind: 'clickText', text: 'Consultar por fechas' }]],
  ['auto-04-permisos-vacaciones', '/permissions'],
  ['auto-05-form-nuevo-permiso', '/permissions', [{ kind: 'clickText', text: 'Nuevo Permiso' }]],
  ['auto-06-form-nueva-vacacion', '/permissions', [{ kind: 'clickText', text: 'Vacaciones' }, { kind: 'clickText', text: 'Nueva Vacación' }]],
  ['auto-07-vacaciones', '/vacations'],
  ['auto-08-aprobaciones', '/ApprovalsPermissions'],
  ['auto-09-aprobaciones-medicas', '/ApprovalsMedicalPermissions'],
  ['auto-10-justificaciones', '/justifications'],
  ['auto-11-form-justificacion', '/justifications', [{ kind: 'clickText', text: 'Nueva Justificación' }]],
  ['auto-12-centro-reportes', '/reports'],
  ['auto-13-reporte-asistencia', '/reports/attendance'],
  ['auto-14-reporte-resumen-asistencia', '/reports/attedancesumary'],
  ['auto-15-reporte-atrasos', '/reports/lateness'],
  ['auto-16-reporte-horas-extra', '/reports/overtime'],
  ['auto-17-reporte-cruce-asistencia', '/reports/attendance-cross'],
  ['auto-18-reporte-permisos-concedidos', '/reports/granted-permissions'],

  // Manual Recursos Humanos
  ['rh-01-personas', '/people'],
  ['rh-02-form-persona', '/people', [{ kind: 'clickText', text: 'Agregar Persona' }]],
  ['rh-03-empleados', '/employees'],
  ['rh-04-form-empleado', '/employees', [{ kind: 'clickText', text: 'Agregar Empleado' }]],
  ['rh-05-parametros-rh', '/hr-parameters'],
  ['rh-06-form-parametro-rh', '/hr-parameters', [{ kind: 'clickText', text: 'Nuevo' }]],
  ['rh-07-contratos', '/contracts'],
  ['rh-08-form-contrato', '/contracts', [{ kind: 'clickText', text: 'Nuevo Contrato' }]],
  ['rh-09-acciones-personal', '/personnel-actions'],
  ['rh-10-form-accion-personal', '/personnel-actions', [{ kind: 'clickText', text: 'Nueva Acción' }]],
  ['rh-11-solicitud-contrato', '/contractRequest'],
  ['rh-12-form-solicitud-contrato', '/contractRequest', [{ kind: 'clickText', text: 'Nueva Solicitud' }]],
  ['rh-13-certificacion-financiera', '/certFinance'],
  ['rh-14-form-certificacion-financiera', '/certFinance', [{ kind: 'clickText', text: 'Agregar Certificación' }]],
  ['rh-15-reporte-contratos', '/reports/contracts'],
  ['rh-16-reporte-contratos-activos', '/reports/active-contracts'],
  ['rh-17-reporte-acciones-personal', '/reports/personnel-actions'],
  ['rh-18-reporte-acciones-activas', '/reports/active-personnel-actions'],
  ['rh-19-reporte-historial-empleado', '/reports/employee-history'],
  ['rh-20-reporte-solicitudes-contrato', '/reports/contract-requests'],
  ['rh-21-reporte-certificaciones', '/reports/certifications'],
  ['rh-22-reporte-empleados-departamento', '/reports/employees-by-department'],
  ['rh-23-reporte-resumen-contratos-departamento', '/reports/department-contract-summary'],
  ['rh-24-reporte-resumen-horario-contrato', '/reports/schedule-contract-summary'],
];

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
  }
  return res.json();
}

async function waitForChrome() {
  const listUrl = `http://localhost:${debugPort}/json/list`;
  for (let i = 0; i < 80; i++) {
    try {
      const targets = await fetchJson(listUrl);
      const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      await delay(250);
    }
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message}: ${msg.error.data ?? ''}`));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function waitForLoad(cdp, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const idx = cdp.events.findIndex(e => e.method === 'Page.loadEventFired');
    if (idx >= 0) {
      cdp.events.splice(0, idx + 1);
      await delay(1400);
      return;
    }
    await delay(100);
  }
  await delay(1800);
}

async function evaluate(cdp, expression) {
  return cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
}

async function clickText(cdp, text) {
  const result = await evaluate(cdp, `
    (() => {
      const wanted = ${JSON.stringify(text)}.toLowerCase();
      const nodes = Array.from(document.querySelectorAll('button, [role="button"], a'));
      const node = nodes.find(el => (el.innerText || el.textContent || '').trim().toLowerCase().includes(wanted));
      if (!node) return { clicked: false, text: ${JSON.stringify(text)} };
      node.scrollIntoView({ block: 'center', inline: 'center' });
      node.click();
      return { clicked: true, text: (node.innerText || node.textContent || '').trim() };
    })();
  `);
  return result.result?.value;
}

async function runAction(cdp, action) {
  if (action.kind === 'clickText') {
    const result = await clickText(cdp, action.text);
    if (!result?.clicked) console.warn(`No se pudo hacer click en texto: ${action.text}`);
    await delay(action.waitMs ?? 1700);
  }
}

async function capture(cdp, filename) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const result = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true,
  });
  await writeFile(path.join(outDir, filename), Buffer.from(result.data, 'base64'));
}

async function pageLooksBroken(cdp) {
  const result = await evaluate(cdp, `
    (() => {
      const text = document.body?.innerText?.toLowerCase() || '';
      return text.includes('404') || text.includes('página no encontrada') || text.includes('not found') || text.includes('error inesperado');
    })();
  `);
  return result.result?.value === true;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await rm(userDataDir, { recursive: true, force: true });
  await mkdir(userDataDir, { recursive: true });

  const login = await fetchJson(`${authBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const tokens = login?.data;
  if (!tokens?.accessToken || !tokens?.refreshToken) throw new Error('Login did not return tokens.');

  const me = await fetchJson(`${authBase}/api/auth/me`, {
    headers: { Authorization: `Bearer ${tokens.accessToken}`, Accept: 'application/json' },
  });
  const userSession = me?.data;
  if (!userSession) throw new Error('Could not read current user session.');

  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,1000',
    `${appBase}/login`,
  ], { stdio: 'ignore' });

  try {
    const wsUrl = await waitForChrome();
    const cdp = new CDP(wsUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    await cdp.send('Page.navigate', { url: `${appBase}/login` });
    await waitForLoad(cdp);

    const browserId = 'manuales-rh-browser';
    await evaluate(cdp, `
      localStorage.setItem('wsuta-browser-id', ${JSON.stringify(browserId)});
      localStorage.setItem('wsuta:${browserId}:accessToken', ${JSON.stringify(tokens.accessToken)});
      localStorage.setItem('wsuta:${browserId}:refreshToken', ${JSON.stringify(tokens.refreshToken)});
      localStorage.setItem('wsuta:${browserId}:userSession', ${JSON.stringify(JSON.stringify(userSession))});
      true;
    `);

    const captured = [];
    for (const [name, route, actions = []] of scenarios) {
      await cdp.send('Page.navigate', { url: `${appBase}${route}` });
      await waitForLoad(cdp);
      await delay(2400);
      await evaluate(cdp, `document.body.style.zoom = '0.9'; true;`);
      for (const action of actions) await runAction(cdp, action);
      await delay(800);
      if (await pageLooksBroken(cdp)) {
        console.warn(`skipped broken route ${route}`);
        continue;
      }
      await capture(cdp, `${name}.png`);
      captured.push(`${name}.png`);
      console.log(`captured ${route} -> ${name}.png`);
    }
    await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(captured, null, 2), 'utf8');
    cdp.close();
  } finally {
    chrome.kill();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
