import { describe, it, expect } from "vitest";
import { detectBrowserFromUA, checkBrowserCompatibility } from "./browserCompatibility";

// User-Agents reales representativos (no se fabricó ninguno inventado) para cada
// combinación relevante de navegador / SO / versión frente a la política:
//   Chrome >= 111, Edge >= 111, Firefox >= 121, Safari (macOS/iOS) >= 16.4
const UA = {
  chromeWindowsNew: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  chromeWindowsOld: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
  chromeWindowsBoundary: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
  edgeWindowsNew: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.2535.51",
  edgeWindowsOld: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36 Edg/100.0.1185.36",
  firefoxWindowsNew: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
  firefoxWindowsOld: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:100.0) Gecko/20100101 Firefox/100.0",
  safariMacNew: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  safariMacOld: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Safari/605.1.15",
  safariIosBoundary: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1",
  safariIosOld: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
  chromeIosNew: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1",
  chromeIosOld: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/90.0.4430.216 Mobile/15E148 Safari/604.1",
  firefoxIosNew: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/605.1.15",
  ie11: "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko",
  ie9: "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)",
  garbage: "SomeUnknownRobot/1.0 (+http://example.com/bot)",
};

describe("detectBrowserFromUA", () => {
  it("detecta Chrome en Windows y no lo confunde con Edge", () => {
    const r = detectBrowserFromUA(UA.chromeWindowsNew);
    expect(r.name).toBe("Chrome");
    expect(r.majorVersion).toBe(125);
    expect(r.os).toBe("Windows");
  });

  it("detecta Edge (Chromium) y no lo confunde con Chrome pese a compartir 'Chrome/' en el UA", () => {
    const r = detectBrowserFromUA(UA.edgeWindowsNew);
    expect(r.name).toBe("Edge");
    expect(r.majorVersion).toBe(125);
  });

  it("detecta Firefox en Windows", () => {
    const r = detectBrowserFromUA(UA.firefoxWindowsNew);
    expect(r.name).toBe("Firefox");
    expect(r.majorVersion).toBe(130);
  });

  it("detecta Safari en macOS usando 'Version/', no el build de 'Safari/'", () => {
    const r = detectBrowserFromUA(UA.safariMacNew);
    expect(r.name).toBe("Safari");
    expect(r.majorVersion).toBe(17);
    expect(r.minorVersion).toBe(4);
    expect(r.os).toBe("macOS");
  });

  it("detecta Safari en iOS con SO correcto", () => {
    const r = detectBrowserFromUA(UA.safariIosBoundary);
    expect(r.name).toBe("Safari");
    expect(r.majorVersion).toBe(16);
    expect(r.minorVersion).toBe(4);
    expect(r.os).toBe("iOS");
  });

  it("detecta Chrome para iOS (CriOS) como Chrome, no como Safari", () => {
    const r = detectBrowserFromUA(UA.chromeIosNew);
    expect(r.name).toBe("Chrome");
    expect(r.majorVersion).toBe(125);
    expect(r.os).toBe("iOS");
  });

  it("detecta Firefox para iOS (FxiOS) como Firefox, no como Safari", () => {
    const r = detectBrowserFromUA(UA.firefoxIosNew);
    expect(r.name).toBe("Firefox");
    expect(r.majorVersion).toBe(130);
  });

  it("detecta Internet Explorer 11 (Trident) sin exponer una versión válida", () => {
    const r = detectBrowserFromUA(UA.ie11);
    expect(r.name).toBe("Internet Explorer");
  });

  it("detecta Internet Explorer clásico (MSIE)", () => {
    const r = detectBrowserFromUA(UA.ie9);
    expect(r.name).toBe("Internet Explorer");
  });

  it("devuelve 'Desconocido' para un User-Agent no reconocible", () => {
    const r = detectBrowserFromUA(UA.garbage);
    expect(r.name).toBe("Desconocido");
    expect(r.majorVersion).toBeNull();
  });
});

describe("checkBrowserCompatibility — política de versiones mínimas", () => {
  it("Chrome 125 cumple (>= 111)", () => {
    expect(checkBrowserCompatibility(UA.chromeWindowsNew).isSupported).toBe(true);
  });

  it("Chrome 90 no cumple (< 111)", () => {
    const r = checkBrowserCompatibility(UA.chromeWindowsOld);
    expect(r.isSupported).toBe(false);
    expect(r.isKnown).toBe(true);
    expect(r.minimumVersionLabel).toBe("111");
  });

  it("Chrome exactamente en el límite (111) cumple", () => {
    expect(checkBrowserCompatibility(UA.chromeWindowsBoundary).isSupported).toBe(true);
  });

  it("Edge 125 cumple, Edge 100 no", () => {
    expect(checkBrowserCompatibility(UA.edgeWindowsNew).isSupported).toBe(true);
    expect(checkBrowserCompatibility(UA.edgeWindowsOld).isSupported).toBe(false);
  });

  it("Firefox 130 cumple, Firefox 100 no", () => {
    expect(checkBrowserCompatibility(UA.firefoxWindowsNew).isSupported).toBe(true);
    expect(checkBrowserCompatibility(UA.firefoxWindowsOld).isSupported).toBe(false);
  });

  it("Safari macOS 17.4 cumple, Safari macOS 15.6 no", () => {
    expect(checkBrowserCompatibility(UA.safariMacNew).isSupported).toBe(true);
    expect(checkBrowserCompatibility(UA.safariMacOld).isSupported).toBe(false);
  });

  it("Safari iOS exactamente 16.4 cumple (límite exacto de minor version)", () => {
    expect(checkBrowserCompatibility(UA.safariIosBoundary).isSupported).toBe(true);
  });

  it("Safari iOS 15.0 no cumple", () => {
    expect(checkBrowserCompatibility(UA.safariIosOld).isSupported).toBe(false);
  });

  it("Chrome para iOS usa el mismo umbral que Chrome de escritorio", () => {
    expect(checkBrowserCompatibility(UA.chromeIosNew).isSupported).toBe(true);
    expect(checkBrowserCompatibility(UA.chromeIosOld).isSupported).toBe(false);
  });

  it("Internet Explorer nunca cumple", () => {
    const r = checkBrowserCompatibility(UA.ie11);
    expect(r.isSupported).toBe(false);
    expect(r.isKnown).toBe(true);
    expect(r.browser.name).toBe("Internet Explorer");
  });

  it("un User-Agent no identificable se marca como no soportado pero conocido=false (recomendación genérica)", () => {
    const r = checkBrowserCompatibility(UA.garbage);
    expect(r.isSupported).toBe(false);
    expect(r.isKnown).toBe(false);
  });

  it("un User-Agent vacío no bloquea ni recomienda nada (no hay señal suficiente)", () => {
    const r = checkBrowserCompatibility("");
    expect(r.isSupported).toBe(true);
    expect(r.isKnown).toBe(false);
  });
});
