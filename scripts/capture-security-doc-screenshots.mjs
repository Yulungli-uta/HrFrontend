import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const appBase = process.env.APP_BASE || 'http://localhost:5173';
const authBase = process.env.AUTH_BASE || 'http://localhost:5010';
const email = process.env.MANUAL_USER;
const password = process.env.MANUAL_PASSWORD;
const outDir = path.resolve('docs/assets/security-services');
const userDataDir = path.resolve('.tmp/chrome-security-services');
const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9360);
const headlessArg = process.env.CHROME_HEADLESS_ARG || '--headless=new';
const scenarioFilter = process.env.SCENARIO_FILTER;

if (!email || !password) {
  console.error('MANUAL_USER and MANUAL_PASSWORD are required.');
  process.exit(1);
}

const scenarios = [
  ['01-login-local', '/login', 'Acceso local', null, [{ kind: 'clickTab', text: 'Local', waitMs: 500 }]],
  ['02-login-office365', '/login', 'Acceso Office 365', null, [{ kind: 'clickTab', text: 'Office 365', waitMs: 500 }]],
  ['03-dashboard', '/', 'Dashboard', 'Dashboard', []],
  ['04-cambio-clave', '/profile/change-password', 'Cambiar contraseña', 'Cambiar contraseña', []],
  ['05-usuarios', '/admin/users', 'Usuarios', 'Usuarios', []],
  ['06-roles', '/admin/roles', 'Roles', 'Roles', []],
  ['07-asignacion-roles', '/admin/user-roles', 'Roles de usuarios', 'Roles', []],
  ['08-items-menu', '/admin/menu-items', 'Items de menú', 'Menú', []],
  ['09-roles-menu', '/admin/role-menu-items', 'Roles tipo menú', 'Roles', []],
  ['10-editor-roles', '/admin/role-editor', 'Editor de roles', 'Editor', []],
  ['11-permisos-accion', '/admin/role-editor', 'Permisos de acción', 'Editor', [{ kind: 'clickTab', text: 'Permisos de acción', waitMs: 1000 }]],
  ['12-perfiles-acceso', '/admin/access-profiles', 'Perfiles de acceso', 'Perfiles', []],
  ['13-azure-management', '/admin/AzureMagnament', 'Gestión Azure AD', 'Azure', []],
  ['14-local-ad', '/admin/local-ad', 'Gestión AD local', 'Active Directory', []],
  ['15-local-ad-grupos', '/admin/local-ad', 'Grupos AD local', 'Active Directory', [{ kind: 'clickTab', text: 'Grupos', waitMs: 1000 }]],
  ['16-sesiones-activas', '/admin/active-sessions', 'Sesiones activas', 'Sesiones', []],
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
      await delay(1300);
      return;
    }
    await delay(100);
  }
  await delay(1600);
}

async function evaluate(cdp, expression) {
  return cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
}

async function clickPoint(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function clickTab(cdp, text) {
  const result = await evaluate(cdp, `
    (() => {
      const normalize = (value) => (value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim().toLowerCase();
      const wanted = normalize(${JSON.stringify(text)});
      const tabs = Array.from(document.querySelectorAll('[role="tab"], button'));
      const node = tabs.find(el => normalize(el.innerText || el.textContent || '').includes(wanted));
      if (!node) return { clicked: false, text: ${JSON.stringify(text)} };
      node.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = node.getBoundingClientRect();
      return { clicked: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })();
  `);
  const value = result.result?.value;
  if (value?.clicked) await clickPoint(cdp, value.x, value.y);
  return value;
}

async function searchMenu(cdp, text) {
  return evaluate(cdp, `
    (() => {
      const input = Array.from(document.querySelectorAll('input')).find(el =>
        ((el.getAttribute('placeholder') || '').toLowerCase().includes('men') ||
          (el.getAttribute('aria-label') || '').toLowerCase().includes('men'))
      );
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, ${JSON.stringify(text)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })();
  `);
}

async function forceLightMode(cdp) {
  await evaluate(cdp, `
    (() => {
      localStorage.setItem('vite-ui-theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.style.colorScheme = 'light';
      document.body?.classList?.remove('dark');
      document.body.style.background = '#f8fafc';
      document.querySelectorAll('[data-security-marker]').forEach(el => el.remove());
      return true;
    })();
  `);
}

async function highlightOption(cdp, label, scope = 'sidebar') {
  const result = await evaluate(cdp, `
    (() => {
      const normalize = (value) => (value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim().toLowerCase();
      const wanted = normalize(${JSON.stringify(label)});
      const root = ${JSON.stringify(scope)} === 'body'
        ? document.body
        : (document.querySelector('aside') || document.querySelector('[data-sidebar]') || document.body);
      const nodes = Array.from(root.querySelectorAll('a, button, [role="button"], [role="menuitem"], [role="tab"], span, div'));
      const candidate = nodes.find(el => {
        const text = normalize(el.innerText || el.textContent || '');
        return text === wanted || text.includes(wanted);
      });
      if (!candidate) return { highlighted: false };
      const target = candidate.closest('a, button, [role="button"], [role="menuitem"], [role="tab"]') || candidate;
      target.scrollIntoView({ block: 'center', inline: 'nearest' });
      target.style.outline = '4px solid #f59e0b';
      target.style.outlineOffset = '2px';
      target.style.boxShadow = '0 0 0 7px rgba(245, 158, 11, 0.25)';
      target.style.backgroundColor = '#fff7ed';
      target.style.color = '#0f172a';
      target.style.position = 'relative';
      target.style.zIndex = '99999';
      const marker = document.createElement('div');
      marker.setAttribute('data-security-marker', 'option');
      marker.textContent = 'Opción seleccionada';
      marker.style.position = 'fixed';
      marker.style.left = ${JSON.stringify(scope)} === 'body' ? '1040px' : '18px';
      marker.style.top = ${JSON.stringify(scope)} === 'body' ? '120px' : '108px';
      marker.style.zIndex = '999999';
      marker.style.padding = '7px 11px';
      marker.style.borderRadius = '6px';
      marker.style.background = '#f59e0b';
      marker.style.color = '#111827';
      marker.style.fontWeight = '700';
      marker.style.fontSize = '13px';
      marker.style.boxShadow = '0 8px 20px rgba(15, 23, 42, 0.18)';
      document.body.appendChild(marker);
      return { highlighted: true, text: target.innerText || target.textContent || '' };
    })();
  `);
  return result.result?.value;
}

async function addScreenLabel(cdp, title) {
  await evaluate(cdp, `
    (() => {
      const marker = document.createElement('div');
      marker.setAttribute('data-security-marker', 'screen');
      marker.textContent = ${JSON.stringify(title)};
      marker.style.position = 'fixed';
      marker.style.right = '24px';
      marker.style.top = '18px';
      marker.style.zIndex = '999999';
      marker.style.padding = '8px 12px';
      marker.style.borderRadius = '6px';
      marker.style.background = '#0f172a';
      marker.style.color = '#ffffff';
      marker.style.fontWeight = '700';
      marker.style.fontSize = '13px';
      marker.style.boxShadow = '0 8px 20px rgba(15, 23, 42, 0.18)';
      document.body.appendChild(marker);
      return true;
    })();
  `);
}

async function runAction(cdp, action) {
  if (action.kind === 'clickTab') {
    await clickTab(cdp, action.text);
    await delay(action.waitMs ?? 1000);
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
  if (!tokens?.accessToken || !tokens?.refreshToken) throw new Error('Login did not return tokens.');

  const me = await fetchJson(`${authBase}/api/auth/me`, {
    headers: { Authorization: `Bearer ${tokens.accessToken}`, Accept: 'application/json' },
  });
  const userSession = me?.data;
  if (!userSession) throw new Error('Could not read current user session.');

  const chromeArgs = [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-software-rasterizer',
    '--force-light-mode',
    '--disable-features=WebContentsForceDark',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,1000',
    `${appBase}/login`,
  ];
  if (headlessArg) chromeArgs.splice(2, 0, headlessArg);

  const chrome = spawn(chromePath, chromeArgs, { stdio: 'ignore' });

  try {
    const wsUrl = await waitForChrome();
    const cdp = new CDP(wsUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    const captured = [];
    const browserId = 'security-services-browser';

    const selectedScenarios = scenarioFilter
      ? scenarios.filter(([name]) => name.includes(scenarioFilter))
      : scenarios;

    for (const [name, route, title, menuText, actions] of selectedScenarios) {
      const needsAuth = !name.startsWith('01-') && !name.startsWith('02-');

      if (needsAuth) {
        await evaluate(cdp, `
          localStorage.setItem('wsuta-browser-id', ${JSON.stringify(browserId)});
          localStorage.setItem('wsuta:${browserId}:accessToken', ${JSON.stringify(tokens.accessToken)});
          localStorage.setItem('wsuta:${browserId}:refreshToken', ${JSON.stringify(tokens.refreshToken)});
          localStorage.setItem('wsuta:${browserId}:userSession', ${JSON.stringify(JSON.stringify(userSession))});
          localStorage.setItem('vite-ui-theme', 'light');
          true;
        `);
      } else {
        await evaluate(cdp, `
          localStorage.clear();
          localStorage.setItem('vite-ui-theme', 'light');
          true;
        `);
      }

      await cdp.send('Page.navigate', { url: `${appBase}${route}` });
      await waitForLoad(cdp);
      await delay(needsAuth ? 2500 : 1400);
      await forceLightMode(cdp);
      await evaluate(cdp, `document.body.style.zoom = '0.9'; true;`);
      if (menuText && route !== '/') {
        await searchMenu(cdp, menuText);
        await delay(600);
      }
      for (const action of actions) await runAction(cdp, action);
      await forceLightMode(cdp);
      await addScreenLabel(cdp, title);
      if (menuText) await highlightOption(cdp, menuText, route === '/profile/change-password' || route === '/admin/role-editor' ? 'body' : 'sidebar');
      await delay(700);
      const filename = `${name}.png`;
      await capture(cdp, filename);
      captured.push(filename);
      console.log(`captured ${route} -> ${filename}`);
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
