// src/lib/browserCompatibility.ts
//
// Detección de navegador/SO/versión a partir de `navigator.userAgent`, sin enviar ni
// almacenar ningún dato personal — solo se compara contra la política de versiones
// mínimas para decidir si mostrar una recomendación de actualización. No bloquea el
// acceso al sistema en ningún caso.
//
// Las funciones reciben el userAgent como parámetro (en vez de leer `navigator`
// directamente) para poder probarlas con cadenas fijas sin necesitar un DOM/jsdom.

export type BrowserName = "Chrome" | "Edge" | "Firefox" | "Safari" | "Internet Explorer" | "Desconocido";
export type OperatingSystem = "Windows" | "macOS" | "iOS" | "Android" | "Linux" | "Desconocido";

export interface BrowserInfo {
  name: BrowserName;
  /** Versión mayor detectada (ej. 121). null si no se pudo determinar. */
  majorVersion: number | null;
  /** Versión menor detectada (ej. 4 en 16.4). 0 si no aplica o no se detectó. */
  minorVersion: number;
  os: OperatingSystem;
  /** Cadena de versión legible tal como se detectó (ej. "16.4"), o null si no se detectó. */
  versionLabel: string | null;
}

export interface CompatibilityResult {
  browser: BrowserInfo;
  /** true si se pudo identificar el navegador Y su versión con confianza. */
  isKnown: boolean;
  /** true si no hace falta mostrar ninguna recomendación (cumple la política o no se pudo evaluar). */
  isSupported: boolean;
  /** Versión mínima recomendada para el navegador detectado, para mostrar en el mensaje. */
  minimumVersionLabel: string | null;
}

// Política de compatibilidad — mantener en un solo lugar para facilitar actualizarla.
const MIN_VERSIONS: Record<Exclude<BrowserName, "Internet Explorer" | "Desconocido">, { major: number; minor: number; label: string }> = {
  Chrome: { major: 111, minor: 0, label: "111" },
  Edge: { major: 111, minor: 0, label: "111" },
  Firefox: { major: 121, minor: 0, label: "121" },
  Safari: { major: 16, minor: 4, label: "16.4" },
};

function parseVersion(raw: string | undefined): { major: number | null; minor: number; label: string | null } {
  if (!raw) return { major: null, minor: 0, label: null };
  const match = raw.match(/^(\d+)(?:[._](\d+))?/);
  if (!match) return { major: null, minor: 0, label: null };
  return {
    major: Number(match[1]),
    minor: match[2] ? Number(match[2]) : 0,
    label: raw,
  };
}

function detectOS(ua: string): OperatingSystem {
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Linux/i.test(ua)) return "Linux";
  return "Desconocido";
}

/**
 * Detecta navegador, SO y versión a partir de una cadena de User-Agent.
 * El orden de las comprobaciones importa: Edge y Opera también incluyen "Chrome/" en su
 * UA, y Chrome/Firefox en iOS (CriOS/FxiOS) también incluyen "Safari/" — hay que
 * descartar esos casos antes de caer en el navegador genérico correspondiente.
 */
export function detectBrowserFromUA(ua: string): BrowserInfo {
  const os = detectOS(ua);

  // Internet Explorer (MSIE clásico o Trident del "modo compatibilidad" de IE11)
  if (/MSIE |Trident\//.test(ua)) {
    return { name: "Internet Explorer", majorVersion: null, minorVersion: 0, os, versionLabel: null };
  }

  // Edge (Chromium) — debe revisarse antes que Chrome
  const edgeMatch = ua.match(/Edg(?:A|iOS)?\/([\d.]+)/);
  if (edgeMatch) {
    const v = parseVersion(edgeMatch[1]);
    return { name: "Edge", majorVersion: v.major, minorVersion: v.minor, os, versionLabel: v.label };
  }

  // Chrome para iOS (CriOS) — se evalúa con el mismo umbral que Chrome de escritorio
  const criosMatch = ua.match(/CriOS\/([\d.]+)/);
  if (criosMatch) {
    const v = parseVersion(criosMatch[1]);
    return { name: "Chrome", majorVersion: v.major, minorVersion: v.minor, os, versionLabel: v.label };
  }

  // Firefox para iOS (FxiOS) — mismo umbral que Firefox de escritorio
  const fxiosMatch = ua.match(/FxiOS\/([\d.]+)/);
  if (fxiosMatch) {
    const v = parseVersion(fxiosMatch[1]);
    return { name: "Firefox", majorVersion: v.major, minorVersion: v.minor, os, versionLabel: v.label };
  }

  // Firefox de escritorio/Android
  const firefoxMatch = ua.match(/Firefox\/([\d.]+)/);
  if (firefoxMatch) {
    const v = parseVersion(firefoxMatch[1]);
    return { name: "Firefox", majorVersion: v.major, minorVersion: v.minor, os, versionLabel: v.label };
  }

  // Chrome de escritorio/Android (ya se descartaron Edge/CriOS arriba; se descarta Opera
  // porque su UA incluye "OPR/", fuera del alcance de esta política)
  const chromeMatch = ua.match(/Chrome\/([\d.]+)/);
  if (chromeMatch && !/OPR\//.test(ua)) {
    const v = parseVersion(chromeMatch[1]);
    return { name: "Chrome", majorVersion: v.major, minorVersion: v.minor, os, versionLabel: v.label };
  }

  // Safari (macOS e iOS) — la versión real está en "Version/X.Y", no en "Safari/XXX"
  // (ese número es el del motor de render, no la versión visible al usuario)
  if (/Safari\//.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg/.test(ua)) {
    const versionMatch = ua.match(/Version\/([\d.]+)/);
    const v = parseVersion(versionMatch?.[1]);
    return { name: "Safari", majorVersion: v.major, minorVersion: v.minor, os, versionLabel: v.label };
  }

  return { name: "Desconocido", majorVersion: null, minorVersion: 0, os, versionLabel: null };
}

/**
 * Evalúa un User-Agent contra la política de compatibilidad. Si no se recibe uno, usa
 * `navigator.userAgent` (uso normal en la app). Nunca lanza excepción — ante cualquier
 * duda, se considera "soportado" para no bloquear ni molestar innecesariamente.
 */
export function checkBrowserCompatibility(userAgent?: string): CompatibilityResult {
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");

  if (!ua) {
    return {
      browser: { name: "Desconocido", majorVersion: null, minorVersion: 0, os: "Desconocido", versionLabel: null },
      isKnown: false,
      isSupported: true,
      minimumVersionLabel: null,
    };
  }

  const browser = detectBrowserFromUA(ua);

  if (browser.name === "Internet Explorer") {
    return { browser, isKnown: true, isSupported: false, minimumVersionLabel: null };
  }

  if (browser.name === "Desconocido" || browser.majorVersion === null) {
    // Requisito: si no se puede detectar la versión, se recomienda actualizar mostrando
    // el aviso genérico, pero SIN impedir el acceso (isSupported queda en false para que
    // el popup se muestre; el popup en sí nunca bloquea nada).
    return { browser, isKnown: false, isSupported: false, minimumVersionLabel: null };
  }

  const policy = MIN_VERSIONS[browser.name];
  const meetsMinimum =
    browser.majorVersion > policy.major ||
    (browser.majorVersion === policy.major && browser.minorVersion >= policy.minor);

  return {
    browser,
    isKnown: true,
    isSupported: meetsMinimum,
    minimumVersionLabel: policy.label,
  };
}
