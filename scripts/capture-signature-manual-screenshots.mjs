import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const appBase = (process.env.APP_BASE || 'https://portal.uta.edu.ec/WsUtaSystem').replace(/\/$/, '');
const authBase = (process.env.AUTH_BASE || 'https://serviciospruebas.uta.edu.ec/WsSeguUta').replace(/\/$/, '');
const signatureBase = (process.env.SIGNATURE_BASE || 'https://portal.uta.edu.ec/signature-api').replace(/\/$/, '');
const email = process.env.MANUAL_USER;
const password = process.env.MANUAL_PASSWORD;
const outDir = path.resolve('docs/assets/manual-firma-electronica');
const userDataDir = path.resolve('.tmp/chrome-manual-firma-electronica');
const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9362);

if (!email || !password) throw new Error('MANUAL_USER and MANUAL_PASSWORD are required.');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJson(url, options = {}) {
  console.log(`request ${url}`);
  const response = await fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(30000) });
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}: ${String(text).slice(0, 300)}`);
  return body;
}

class CDP {
  constructor(url) { this.ws = new WebSocket(url); this.id = 1; this.pending = new Map(); this.events = []; }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id); this.pending.delete(message.id);
        message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
      } else if (message.method) this.events.push(message);
    });
  }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws.close(); }
}

async function waitForChrome() {
  for (let i = 0; i < 80; i++) {
    try {
      const targets = await fetchJson(`http://localhost:${debugPort}/json/list`);
      const page = targets.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await delay(250);
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  return result.result?.value;
}

async function waitForPage(cdp) {
  await delay(4200);
  await evaluate(cdp, `(() => {
    localStorage.setItem('vite-ui-theme', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.style.colorScheme = 'light';
    document.body.style.background = '#f8fafc';
    document.body.style.zoom = '0.88';
    document.querySelectorAll('[data-manual-marker]').forEach(node => node.remove());
    return true;
  })()`);
}

async function screenshot(cdp, fileName, title) {
  await evaluate(cdp, `(() => {
    const marker = document.createElement('div');
    marker.dataset.manualMarker = 'title';
    marker.textContent = ${JSON.stringify(title)};
    Object.assign(marker.style, {position:'fixed',right:'22px',top:'16px',zIndex:'999999',padding:'8px 12px',borderRadius:'8px',background:'#0f172a',color:'#fff',fontWeight:'700',fontSize:'13px',boxShadow:'0 8px 24px rgba(15,23,42,.22)'});
    document.body.appendChild(marker);
    return true;
  })()`);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const image = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true });
  await writeFile(path.join(outDir, fileName), Buffer.from(image.data, 'base64'));
  console.log(`captured ${fileName}`);
}

async function navigate(cdp, route, fileName, title) {
  await cdp.send('Page.navigate', { url: `${appBase}${route}` });
  await waitForPage(cdp);
  const body = await evaluate(cdp, 'document.body?.innerText || ""');
  if (/p[aá]gina no encontrada|not found|error inesperado/i.test(body)) {
    console.warn(`skipped broken route ${route}`);
    return false;
  }
  await screenshot(cdp, fileName, title);
  return true;
}

async function clickButton(cdp, text) {
  const point = await evaluate(cdp, `(() => {
    const wanted = ${JSON.stringify(text)}.toLowerCase();
    const button = [...document.querySelectorAll('button')].find(node => (node.innerText || '').toLowerCase().includes(wanted) && !node.disabled);
    if (!button) return null;
    button.scrollIntoView({block:'center'});
    const rect = button.getBoundingClientRect();
    return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};
  })()`);
  if (!point) return false;
  await cdp.send('Input.dispatchMouseEvent', { type:'mousePressed', x:point.x, y:point.y, button:'left', clickCount:1 });
  await cdp.send('Input.dispatchMouseEvent', { type:'mouseReleased', x:point.x, y:point.y, button:'left', clickCount:1 });
  await delay(3500);
  return true;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await rm(userDataDir, { recursive: true, force: true });
  await mkdir(userDataDir, { recursive: true });

  console.log('starting interactive authenticated capture');
  let processes = [];
  let inbox = [];
  let processId;
  let signable;
  console.log('launching chrome');
  const chrome = spawn(chromePath, [
    '--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${userDataDir}`,
    '--disable-gpu','--disable-dev-shm-usage','--no-sandbox','--force-light-mode','--hide-scrollbars',
    '--no-first-run','--no-default-browser-check','--window-size=1440,1000', `${appBase}/login`
  ], { stdio:'ignore' });

  const captured = [];
  try {
    const cdp = new CDP(await waitForChrome()); await cdp.open();
    console.log('chrome connected');
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await waitForPage(cdp); await screenshot(cdp,'00-login.png','Ingreso al Sistema Integrado UTA'); captured.push('00-login.png');

    // Iniciar sesión desde la propia pantalla crea la sesión vinculada al browser-id
    // actual. Inyectar tokens de una llamada Node ya no es válido desde que RepositoryUta
    // aplica las comprobaciones de sesión/navegador corregidas.
    const loginPoint = await evaluate(cdp, `(() => {
      const inputs = [...document.querySelectorAll('input')];
      const user = inputs.find(node => node.type !== 'password');
      const pass = inputs.find(node => node.type === 'password');
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      set.call(user, ${JSON.stringify(email)}); user.dispatchEvent(new Event('input',{bubbles:true})); user.dispatchEvent(new Event('change',{bubbles:true}));
      set.call(pass, ${JSON.stringify(password)}); pass.dispatchEvent(new Event('input',{bubbles:true})); pass.dispatchEvent(new Event('change',{bubbles:true}));
      const button = [...document.querySelectorAll('button')].find(node => /iniciar sesi[oó]n/i.test(node.innerText || ''));
      if (!button) return null;
      const rect = button.getBoundingClientRect(); return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};
    })()`);
    if (!loginPoint) throw new Error('No se encontró el botón de inicio de sesión.');
    await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:loginPoint.x,y:loginPoint.y,button:'left',clickCount:1});
    await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:loginPoint.x,y:loginPoint.y,button:'left',clickCount:1});
    await delay(7500);
    const afterLogin = await evaluate(cdp, 'document.body?.innerText || ""');
    if (/iniciar sesi[oó]n/i.test(afterLogin)) throw new Error('El inicio de sesión interactivo no salió de la pantalla de acceso.');
    const browserToken = await evaluate(cdp, `(() => {
      const key = Object.keys(localStorage).find(item => item.startsWith('wsuta:') && item.endsWith(':accessToken'));
      return key ? localStorage.getItem(key) : null;
    })()`);
    if (!browserToken) throw new Error('El inicio de sesión no dejó un access token en el navegador.');
    const authHeaders = { Authorization:`Bearer ${browserToken}`, Accept:'application/json' };
    processes = await fetchJson(`${signatureBase}/api/v1/signature/processes`, { headers:authHeaders }).catch(() => []);
    inbox = await fetchJson(`${signatureBase}/api/v1/signature/inbox`, { headers:authHeaders }).catch(() => []);
    processId = processes?.[0]?.processId;
    signable = inbox?.find(item => ['AVAILABLETOSIGN','PENDING'].includes(String(item.myParticipantStatus || '').toUpperCase()));
    console.log(`processes ${processes?.length || 0}; inbox ${inbox?.length || 0}`);

    const pages = [
      ['/signatures/processes','01-procesos.png','Procesos de firma'],
      ['/signatures/processes/new','02-crear-proceso.png','Crear proceso de firma'],
      ['/signatures/inbox','03-bandeja.png','Mi bandeja de firmas'],
      ['/signatures/validate-document','04-validar-documento.png','Validar documento firmado'],
      ['/signatures/validate','05-validar-certificado.png','Validar certificado electrónico']
    ];
    if (processId) pages.splice(2,0,[`/signatures/processes/${processId}`,'06-detalle-proceso.png','Detalle y avance del proceso']);
    if (signable?.processId) pages.splice(4,0,[`/signatures/processes/${signable.processId}/sign`,'07-firmar-documento.png','Firmar documento']);
    for (const page of pages) if (await navigate(cdp,...page)) captured.push(page[1]);

    if (signable?.processId) {
      await cdp.send('Page.navigate',{url:`${appBase}/signatures/processes/${signable.processId}/sign`});
      await waitForPage(cdp);
      if (await clickButton(cdp,'Firmar documento')) {
        await screenshot(cdp,'08-ubicar-firma.png','Ubicación y tamaño de la firma'); captured.push('08-ubicar-firma.png');
      }
    }
    await writeFile(path.join(outDir,'manifest.json'),JSON.stringify({captured,processCount:processes?.length||0,inboxCount:inbox?.length||0,generatedAt:new Date().toISOString()},null,2),'utf8');
    cdp.close();
  } finally { chrome.kill(); }
}

main().catch(error => { console.error(error); process.exit(1); });
