import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openAzureLoginChannel } from "../services/azureLoginChannel";

// ── BroadcastChannel simulado: las instancias del mismo nombre se hablan entre sí, nunca consigo mismas ──
class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  private listeners = new Set<(event: MessageEvent) => void>();
  closed = false;

  constructor(public name: string) {
    FakeBroadcastChannel.instances.push(this);
  }

  postMessage(data: unknown) {
    if (this.closed) throw new Error("closed");
    for (const other of FakeBroadcastChannel.instances) {
      if (other !== this && !other.closed && other.name === this.name) {
        other.listeners.forEach((l) => l({ data } as MessageEvent));
      }
    }
  }
  addEventListener(_type: string, l: (event: MessageEvent) => void) {
    this.listeners.add(l);
  }
  removeEventListener(_type: string, l: (event: MessageEvent) => void) {
    this.listeners.delete(l);
  }
  close() {
    this.closed = true;
  }
}

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => Array.from(data.keys())[i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  FakeBroadcastChannel.instances = [];
});

describe("openAzureLoginChannel con BroadcastChannel", () => {
  beforeEach(() => {
    vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
  });

  it("entrega los mensajes a la otra instancia y no a la propia", () => {
    const relay = openAzureLoginChannel("login");
    const tab = openAzureLoginChannel("login");
    const fromRelay = vi.fn();
    const fromTab = vi.fn();
    relay.subscribe(fromRelay);
    tab.subscribe(fromTab);

    relay.post({ type: "AZURE_LOGIN_DELIVERY", deliveryCode: "abc" });

    expect(fromTab).toHaveBeenCalledWith({ type: "AZURE_LOGIN_DELIVERY", deliveryCode: "abc" });
    expect(fromRelay).not.toHaveBeenCalled();
  });

  it("deja de escuchar al cancelar la suscripción y no lanza al publicar en un canal cerrado", () => {
    const relay = openAzureLoginChannel("login");
    const tab = openAzureLoginChannel("login");
    const handler = vi.fn();
    const unsubscribe = tab.subscribe(handler);
    unsubscribe();
    relay.post({ type: "x" });
    expect(handler).not.toHaveBeenCalled();

    relay.close();
    expect(() => relay.post({ type: "y" })).not.toThrow();
  });

  it("si el constructor lanza, cae al canal de localStorage en vez de romper", () => {
    class Throwing {
      constructor() {
        throw new Error("no soportado");
      }
    }
    vi.stubGlobal("BroadcastChannel", Throwing);
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });

    expect(() => openAzureLoginChannel("login")).not.toThrow();
  });
});

describe("openAzureLoginChannel sin BroadcastChannel (respaldo localStorage)", () => {
  type StorageListener = (event: StorageEvent) => void;
  let listeners: Set<StorageListener>;

  beforeEach(() => {
    vi.stubGlobal("BroadcastChannel", undefined);
    vi.stubGlobal("localStorage", memoryStorage());
    listeners = new Set();
    vi.stubGlobal("window", {
      addEventListener: (_t: string, l: StorageListener) => listeners.add(l),
      removeEventListener: (_t: string, l: StorageListener) => listeners.delete(l),
    });
  });

  /** El navegador solo dispara "storage" en las OTRAS pestañas: se simula entregándolo a otra instancia. */
  const deliverStorageEvent = () => {
    const key = "wsuta-channel:login";
    const newValue = localStorage.getItem(key);
    listeners.forEach((l) => l({ key, newValue } as StorageEvent));
  };

  it("publica en localStorage y la otra pestaña recibe el mensaje al dispararse el evento", () => {
    const relay = openAzureLoginChannel("login");
    const tab = openAzureLoginChannel("login");
    const received = vi.fn();
    tab.subscribe(received);

    relay.post({ type: "AZURE_LOGIN_FAILED", code: "NO_ACCESS", ref: "AB12CD34" });
    deliverStorageEvent();

    expect(received).toHaveBeenCalledWith({
      type: "AZURE_LOGIN_FAILED",
      code: "NO_ACCESS",
      ref: "AB12CD34",
    });
  });

  it("la propia instancia no recibe sus mensajes", () => {
    const relay = openAzureLoginChannel("login");
    const own = vi.fn();
    relay.subscribe(own);

    relay.post({ type: "x" });
    deliverStorageEvent();

    expect(own).not.toHaveBeenCalled();
  });

  it("borra el mensaje de localStorage pasado el tiempo (puede llevar un código de entrega)", () => {
    vi.useFakeTimers();
    const relay = openAzureLoginChannel("login");

    relay.post({ type: "AZURE_LOGIN_DELIVERY", deliveryCode: "secreto" });
    expect(localStorage.getItem("wsuta-channel:login")).not.toBeNull();

    vi.advanceTimersByTime(6_000);
    expect(localStorage.getItem("wsuta-channel:login")).toBeNull();
  });

  it("ignora eventos de otras claves, vacíos o corruptos", () => {
    const tab = openAzureLoginChannel("login");
    const received = vi.fn();
    tab.subscribe(received);

    listeners.forEach((l) => l({ key: "otra-clave", newValue: "{}" } as StorageEvent));
    listeners.forEach((l) => l({ key: "wsuta-channel:login", newValue: null } as StorageEvent));
    listeners.forEach((l) => l({ key: "wsuta-channel:login", newValue: "{no json" } as StorageEvent));

    expect(received).not.toHaveBeenCalled();
  });

  it("close() quita los oyentes", () => {
    const tab = openAzureLoginChannel("login");
    tab.subscribe(vi.fn());
    expect(listeners.size).toBe(1);

    tab.close();
    expect(listeners.size).toBe(0);
  });

  it("con el almacenamiento bloqueado no lanza (el reclamo al servidor cubre el caso)", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    const relay = openAzureLoginChannel("login");

    expect(() => relay.post({ type: "x" })).not.toThrow();
  });
});
