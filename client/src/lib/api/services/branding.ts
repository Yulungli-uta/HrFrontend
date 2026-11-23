/**
 * Archivo: src/lib/api/services/branding.ts
 * Identidad visual: logos del inicio de sesión (claro/oscuro) y de reportes. Se guardan como parámetros del sistema
 * (BRAND_LOGO_*); sin logo propio se usa el escudo oficial incluido en la aplicación.
 */
import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';
import { API_CONFIG } from '../core/config';
import { fetchMultipart } from './documents';
import { tokenService } from '@/features/auth';

export type BrandKey = 'LOGIN_LOGO_LIGHT' | 'LOGIN_LOGO_DARK' | 'REPORT_LOGO';

export interface BrandAssetInfo {
  key: BrandKey;
  label: string;
  /** true = hay una imagen propia; false = se usa el logo oficial. */
  isCustom: boolean;
  fileName?: string | null;
  contentType?: string | null;
  /** Huella de la imagen (sirve para refrescar la caché del navegador al cambiarla). */
  version?: string | null;
  updatedAt?: string | null;
}

export interface PublicBranding {
  loginLogoLight?: string | null;
  loginLogoDark?: string | null;
}

const base = '/api/v1/rh/branding';

export const BrandingAPI = {
  list: (): Promise<ApiResponse<BrandAssetInfo[]>> => apiFetch<BrandAssetInfo[]>(base),

  upload: (key: BrandKey, file: File): Promise<ApiResponse<BrandAssetInfo>> => {
    const form = new FormData();
    form.append('file', file);
    return fetchMultipart<BrandAssetInfo>(`${API_CONFIG.RH_BASE_URL}${base}/${key}`, form, 'PUT');
  },

  remove: (key: BrandKey): Promise<ApiResponse<void>> => apiFetch<void>(`${base}/${key}`, { method: 'DELETE' }),

  /** Versión de los logos del login (endpoint público: la pantalla de login no tiene sesión). */
  getPublic: (): Promise<ApiResponse<PublicBranding>> => apiFetch<PublicBranding>('/api/v1/rh/public/branding'),

  /** URL pública del logo del login (con huella de versión para no servir una imagen vieja en caché). */
  publicLogoUrl: (key: 'LOGIN_LOGO_LIGHT' | 'LOGIN_LOGO_DARK', version: string): string =>
    `${API_CONFIG.RH_BASE_URL}/api/v1/rh/public/branding/${key}?v=${encodeURIComponent(version)}`,

  /** Descarga la imagen propia (requiere sesión) para mostrar una vista previa; null si usa el logo oficial. */
  fetchPreview: async (key: BrandKey): Promise<string | null> => {
    const token = tokenService.getAccessToken();
    const resp = await fetch(`${API_CONFIG.RH_BASE_URL}${base}/${key}/content`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: API_CONFIG.CREDENTIALS,
    });
    if (!resp.ok) return null;
    return URL.createObjectURL(await resp.blob());
  },
};
