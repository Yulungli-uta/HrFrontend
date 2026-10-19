// El contexto vive en su propio archivo (que casi no se edita): si estuviera junto al proveedor, cada edición de este
// módulo con la página abierta (recarga en caliente de Vite) crearía un contexto nuevo y los componentes que siguen
// con el anterior fallarían con "useUserPreferences debe usarse dentro de UserPreferencesProvider".
import { createContext, useContext } from "react";
import type { Theme } from "@/components/ThemeProvider";
import type { UserPreferences } from "@/types/userPreferences";

export interface UserPreferencesContextValue {
  /** Preferencias guardadas del usuario (sin valores por defecto aplicados). */
  preferences: UserPreferences;
  /** true cuando ya hay datos (caché o servidor) o la consulta terminó, aunque haya fallado. */
  isReady: boolean;
  /** true cuando las preferencias ya fueron confirmadas por el servidor en esta sesión (no solo la caché local). */
  isSynced: boolean;
  /** true si no se pudieron cargar del servidor (p. ej. backend sin desplegar o sin conexión). */
  loadFailed: boolean;
  isSaving: boolean;
  /** Guarda (reemplaza) las preferencias. Devuelve true si el servidor las aceptó. */
  save: (next: UserPreferences) => Promise<boolean>;
  /** Restablece los valores originales. Devuelve true si se completó. */
  reset: () => Promise<boolean>;
  /** Vista previa temporal de cambios sin guardar; `null` la quita. */
  preview: (draft: UserPreferences | null) => void;
  /** Recuerda el último estado del menú en escritorio (solo si el modo es "recordar"). */
  setMenuCollapsed: (collapsed: boolean) => void;
  /** Cambio rápido de tema desde el encabezado: aplica y lo guarda como preferencia. */
  setTheme: (theme: Theme) => void;
}

export const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export function useUserPreferencesContext(): UserPreferencesContextValue {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error("useUserPreferences debe usarse dentro de UserPreferencesProvider");
  return ctx;
}
