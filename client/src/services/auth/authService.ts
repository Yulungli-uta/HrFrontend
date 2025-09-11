// services/auth/authService.ts
import { ApiResponse } from '@/lib/api';
import { TokenPair, UserSession, LoginRequest } from './types';

// Configuración específica para autenticación
const AUTH_API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL || 'http://localhost:5010';

// Cliente específico para autenticación con mejor manejo de errores
async function authFetch<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    // console.log(`🔐 Making auth request to: ${AUTH_API_BASE_URL}${path}`);
    
    const response = await fetch(`${AUTH_API_BASE_URL}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...init.headers,
      },
      ...init,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // console.log(`📨 Auth response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      if (response.status === 204) {
        return { status: 'success', data: undefined as unknown as T };
      }
      
      try {
        const data = await response.json();
        // console.log('✅ Auth response data:', data);
        return { status: 'success', data };
      } catch (jsonError) {
        console.warn('⚠️ Could not parse JSON response, returning text');
        const text = await response.text();
        return { status: 'success', data: text as unknown as T };
      }
    }
    
    let errorDetails: any;
    try {
      errorDetails = await response.json();
      console.error('❌ Auth error details:', errorDetails);
    } catch {
      try {
        errorDetails = await response.text();
        console.error('❌ Auth error text:', errorDetails);
      } catch {
        errorDetails = response.statusText;
        console.error('❌ Auth error status:', errorDetails);
      }
    }
    
    return {
      status: 'error',
      error: {
        code: response.status,
        message: `HTTP Error ${response.status}: ${response.statusText}`,
        details: errorDetails
      }
    };
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('🚨 Auth network error:', error);
    
    return {
      status: 'error',
      error: {
        code: 0,
        message: error.name === 'AbortError' 
          ? 'Request timed out' 
          : `Network error: ${error.message || 'Unknown error'}`
      }
    };
  }
}

export const authService = {
  async loginLocal(credentials: LoginRequest): Promise<TokenPair> {
    // console.log('🔐 Attempting local login with:', { email: credentials.email });
    
    const response = await authFetch<{ data: TokenPair; success: boolean; message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.status === 'error') {
      console.error('❌ Login failed:', response.error);
      throw new Error(response.error.message || 'Credenciales inválidas');
    }

    // console.log('✅ Login successful, tokens received:', response.data);
    
    // Extraer los tokens de la estructura de respuesta
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    } else {
      console.error('❌ Invalid response structure:', response.data);
      throw new Error('Estructura de respuesta inválida');
    }
  },

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    console.log('🔄 Attempting token refresh');
    
    const response = await authFetch<{ data: TokenPair; success: boolean }>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    
    if (response.status === 'error') {
      console.error('❌ Token refresh failed:', response.error);
      throw new Error(response.error.message || 'Error al renovar token');
    }

    // Extraer los tokens de la estructura de respuesta
    if (response.data && response.data.success && response.data.data) {
      // console.log('✅ Token refresh successful');
      return response.data.data;
    } else {
      console.error('❌ Invalid response structure:', response.data);
      throw new Error('Estructura de respuesta inválida');
    }
  },

  async getCurrentUser(accessToken: string): Promise<UserSession> {
    // console.log('👤 Fetching current user info');
    // console.log('🔑 Access token being used:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NULL');
    
    const response = await authFetch<{ data: UserSession; success: boolean }>('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (response.status === 'error') {
      console.error('❌ Failed to get user info:', response.error);
      throw new Error(response.error.message || 'Error al obtener información del usuario');
    }

    // Extraer los datos del usuario de la estructura de respuesta
    if (response.data && response.data.success && response.data.data) {
      // console.log('✅ User info retrieved successfully');
      return response.data.data;
    } else {
      console.error('❌ Invalid response structure:', response.data);
      throw new Error('Estructura de respuesta inválida');
    }
  },

  async getAzureAuthUrl(): Promise<{ url: string; state: string }> {
    console.log('🌐 Getting Azure Auth URL');
    
    const response = await authFetch<{ data: { url: string; state: string }; success: boolean }>('/api/auth/azure/url');
    
    if (response.status === 'error') {
      console.error('❌ Failed to get Azure Auth URL:', response.error);
      throw new Error(response.error.message || 'Error al obtener URL de autenticación');
    }

    // Extraer la URL de la estructura de respuesta
    if (response.data && response.data.success && response.data.data) {
      // console.log('✅ Azure Auth URL received');
      return response.data.data;
    } else {
      console.error('❌ Invalid response structure:', response.data);
      throw new Error('Estructura de respuesta inválida');
    }
  },

  async handleAzureCallback(code: string, state: string): Promise<TokenPair> {
    // console.log('🔄 Handling Azure callback');
    
    const response = await authFetch<{ data: TokenPair; success: boolean }>(
      `/api/auth/azure/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
    );
    
    if (response.status === 'error') {
      console.error('❌ Azure callback failed:', response.error);
      throw new Error(response.error.message || 'Error en autenticación con Azure');
    }

    // Extraer los tokens de la estructura de respuesta
    if (response.data && response.data.success && response.data.data) {
      // console.log('✅ Azure callback handled successfully');
      return response.data.data;
    } else {
      console.error('❌ Invalid response structure:', response.data);
      throw new Error('Estructura de respuesta inválida');
    }
  },
};