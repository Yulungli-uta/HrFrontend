import { useCallback, useSyncExternalStore } from "react";

/**
 * Menú lateral tipo acordeón: al abrir un módulo se cierran los demás. Es una preferencia local del navegador
 * (no se guarda en el servidor) y viene activada por defecto. Se comparte entre el menú y la pantalla de preferencias.
 */
const KEY = "wsuta-menu-accordion";
const EVENT = "wsuta-menu-accordion-change";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true; // sin almacenamiento disponible: valor por defecto
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useMenuAccordion(): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(subscribe, read, () => true);
  const setEnabled = useCallback((value: boolean) => {
    try {
      localStorage.setItem(KEY, value ? "1" : "0");
    } catch {
      /* sin almacenamiento: el cambio solo vale para esta sesión de la página */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [enabled, setEnabled];
}
