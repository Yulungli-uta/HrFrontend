// Aplica las preferencias visuales al <html> mediante atributos data-*; los estilos viven en
// index.css (escala de letra en rem, densidad, alto contraste y reducción de animaciones).
import type { UserPreferences } from '@/types/userPreferences';
import { DEFAULT_PREFERENCES } from '@/types/userPreferences';

export function applyVisualPreferences(prefs: UserPreferences): void {
  const root = document.documentElement;
  root.dataset.fontScale = prefs.fontScale ?? DEFAULT_PREFERENCES.fontScale;
  root.dataset.density = prefs.density ?? DEFAULT_PREFERENCES.density;
  root.dataset.contrast = prefs.highContrast ? 'high' : 'normal';
  root.dataset.motion = prefs.reduceMotion ? 'reduce' : 'normal';
}
