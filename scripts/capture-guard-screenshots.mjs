import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const appBase = process.env.APP_BASE || 'http://localhost:5173';
const authBase = process.env.AUTH_BASE || 'http://localhost:5010';
const email = process.env.MANUAL_USER;
const password = process.env.MANUAL_PASSWORD;
const outDir = path.resolve('docs/assets/manual-guardias');
const userDataDir = path.resolve('.tmp/chrome-manual-guardias');
const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9222);

if (!email || !password) {
  console.error('MANUAL_USER and MANUAL_PASSWORD are required.');
  process.exit(1);
}

const routes = [
  ['00-login', '/login'],
  ['01-panel-guardias', '/guards'],
  ['02-parametros-guardias', '/guards/parameters'],
  ['03-ubicaciones-servicio', '/guards/locations'],
  ['04-grupos-rotacion', '/guards/groups'],
  ['05-patrones-rotacion', '/guards/patterns'],
  ['06-requisitos-cobertura', '/guards/coverage'],
  ['07-disponibilidad-empleados', '/guards/availability'],
  ['08-rotacion-ubicaciones', '/guards/location-rotation'],
  ['09-planificacion-turnos', '/guards/planning'],
  ['10-cambios-turno', '/guards/changes'],
  ['11-reglas-especiales', '/guards/special-rules'],
  ['12-vacaciones-revision', '/guards/vacation-plans'],
  ['13-vacaciones-solicitudes', '/guards/vacation-requests'],
  ['14-vacaciones-aprobaciones', '/guards/vacation-approvals'],
  ['15-reporte-planificacion-turnos', '/reports/guard-shift-planning'],
  ['16-reporte-cobertura-ubicacion', '/reports/guard-location-coverage'],
  ['17-reporte-cambios-turno', '/reports/guard-shift-changes'],
  ['18-reporte-guardias-grupo', '/reports/guard-group-roster'],
  ['19-reporte-cronograma-matricial', '/reports/guard-schedule-matrix'],
];

const dialogScenarios = [
  ['20-form-parametro-nuevo', '/guards/parameters', [{ kind: 'clickText', text: 'Nuevo' }]],
  ['21-form-ubicacion-nueva', '/guards/locations', [{ kind: 'clickText', text: 'Nueva ubicación' }]],
  ['22-form-grupo-nuevo', '/guards/groups', [{ kind: 'clickText', text: 'Nuevo grupo' }]],
  ['23-dialog-gestion-guardias', '/guards/groups', [{ kind: 'clickText', text: 'Guardias' }]],
  ['24-dialog-patron-grupo', '/guards/groups', [{ kind: 'clickText', text: 'Patrón' }]],
  ['25-form-patron-nuevo', '/guards/patterns', [{ kind: 'clickText', text: 'Nuevo patrón' }]],
  ['26-form-cobertura-nueva', '/guards/coverage', [{ kind: 'clickText', text: 'Nuevo requisito' }]],
  ['27-form-bloqueo-manual', '/guards/availability', [{ kind: 'clickText', text: 'Bloqueo manual' }]],
  ['28-dialog-sincronizar-disponibilidad', '/guards/availability', [{ kind: 'clickText', text: 'Sincronizar' }]],
  ['29-form-periodo-rotacion', '/guards/location-rotation', [{ kind: 'clickText', text: 'Nuevo periodo' }]],
  ['30-form-asignacion-manual-turno', '/guards/planning', [{ kind: 'clickText', text: 'Asignar guardia' }]],
  ['31-dialog-generar-turnos', '/guards/planning', [{ kind: 'clickText', text: 'Generar turnos' }]],
  ['32-form-regla-especial', '/guards/special-rules', [{ kind: 'clickText', text: 'Nueva regla' }]],
  ['33-form-plan-vacaciones', '/guards/vacation-plans', [{ kind: 'clickText', text: 'Nuevo plan' }]],
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
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
    });
  }

  async close() {
    this.ws.close();
  }
}

async function waitForLoad(cdp, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const idx = cdp.events.findIndex(e => e.method === 'Page.loadEventFired');
    if (idx >= 0) {
      cdp.events.splice(0, idx + 1);
      await delay(1200);
      return;
    }
    await delay(100);
  }
  await delay(2000);
}

async function evaluate(cdp, expression) {
  return cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
}

async function clickText(cdp, text) {
  const expression = `
    (() => {
      const wanted = ${JSON.stringify(text)}.toLowerCase();
      const nodes = Array.from(document.querySelectorAll('button, [role="button"], a'));
      const node = nodes.find(el => (el.innerText || el.textContent || '').trim().toLowerCase().includes(wanted));
      if (!node) return { clicked: false, text: ${JSON.stringify(text)} };
      node.scrollIntoView({ block: 'center', inline: 'center' });
      node.click();
      return { clicked: true, text: (node.innerText || node.textContent || '').trim() };
    })();
  `;
  const result = await evaluate(cdp, expression);
  return result.result?.value;
}

async function runAction(cdp, action) {
  if (action.kind === 'clickText') {
    const result = await clickText(cdp, action.text);
    if (!result?.clicked) console.warn(`No se pudo hacer click en texto: ${action.text}`);
    await delay(action.waitMs ?? 1500);
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
  if (!tokens?.accessToken || !tokens?.refreshToken) {
    throw new Error('Login did not return tokens.');
  }

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
    await cdp.send('Network.enable');

    await cdp.send('Page.navigate', { url: `${appBase}/login` });
    await waitForLoad(cdp);

    const browserId = 'manual-guardias-browser';
    await evaluate(cdp, `
      localStorage.setItem('wsuta-browser-id', ${JSON.stringify(browserId)});
      localStorage.setItem('wsuta:${browserId}:accessToken', ${JSON.stringify(tokens.accessToken)});
      localStorage.setItem('wsuta:${browserId}:refreshToken', ${JSON.stringify(tokens.refreshToken)});
      localStorage.setItem('wsuta:${browserId}:userSession', ${JSON.stringify(JSON.stringify(userSession))});
      true;
    `);

    for (const [name, route] of routes) {
      const url = `${appBase}${route}`;
      await cdp.send('Page.navigate', { url });
      await waitForLoad(cdp);
      await delay(2500);
      await evaluate(cdp, `document.body.style.zoom = '0.9'; true;`);
      await delay(700);
      await capture(cdp, `${name}.png`);
      console.log(`captured ${route} -> ${name}.png`);
    }

    for (const [name, route, actions] of dialogScenarios) {
      const url = `${appBase}${route}`;
      await cdp.send('Page.navigate', { url });
      await waitForLoad(cdp);
      await delay(2500);
      await evaluate(cdp, `document.body.style.zoom = '0.9'; true;`);
      for (const action of actions) {
        await runAction(cdp, action);
      }
      await delay(1000);
      await capture(cdp, `${name}.png`);
      console.log(`captured ${route} dialog -> ${name}.png`);
    }

    await cdp.close();
  } finally {
    chrome.kill();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
