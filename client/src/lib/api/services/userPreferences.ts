// src/lib/api/services/userPreferences.ts
/**
 * Preferencias de interfaz del usuario autenticado. El backend resuelve el usuario desde el
 * token: ningún endpoint acepta un identificador del cliente.
 */

import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';
import type { UserPreferences, UserPreferencesResponse } from '@/types/userPreferences';

const PREFERENCES_BASE = '/api/v1/rh/me/preferences';

export const UserPreferencesAPI = {
  get: (): Promise<ApiResponse<UserPreferencesResponse>> =>
    apiFetch<UserPreferencesResponse>(PREFERENCES_BASE),

  save: (preferences: UserPreferences): Promise<ApiResponse<UserPreferencesResponse>> =>
    apiFetch<UserPreferencesResponse>(PREFERENCES_BASE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    }),

  reset: (): Promise<ApiResponse<void>> =>
    apiFetch<void>(PREFERENCES_BASE, { method: 'DELETE' }),
};
