// src/types/userPreferences.ts
// Preferencias de interfaz del usuario (contrato con GET/PUT /me/preferences de HrBackend).
// Todos los campos son opcionales: ausente = valor por defecto de la aplicación.

export type MenuStartMode = 'remember' | 'expanded' | 'collapsed';
export type FontScale = 'small' | 'normal' | 'large' | 'xlarge';
export type ThemePreference = 'light' | 'dark' | 'system';
export type Density = 'standard' | 'compact';

export interface UserPreferences {
  /** Ruta interna de la página de inicio (ej. "/attendance"). Ausente = "/". */
  homePath?: string;
  menuStartMode?: MenuStartMode;
  /** Último estado del menú en escritorio (se usa con menuStartMode = "remember"). */
  menuCollapsed?: boolean;
  fontScale?: FontScale;
  theme?: ThemePreference;
  density?: Density;
  highContrast?: boolean;
  reduceMotion?: boolean;
}

export interface UserPreferencesResponse {
  schemaVersion: number;
  preferences: UserPreferences;
  updatedAt?: string | null;
}

/** Valores por defecto: reproducen el comportamiento actual de la aplicación. */
export const DEFAULT_PREFERENCES: Required<Omit<UserPreferences, 'homePath' | 'menuCollapsed'>> = {
  menuStartMode: 'remember',
  fontScale: 'normal',
  theme: 'system',
  density: 'standard',
  highContrast: false,
  reduceMotion: false,
};

export const FONT_SCALE_LABELS: Record<FontScale, string> = {
  small: 'Pequeño',
  normal: 'Normal',
  large: 'Grande',
  xlarge: 'Extra grande',
};
