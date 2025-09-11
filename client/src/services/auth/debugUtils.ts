// services/auth/debugUtils.ts

/**
 * Decodifica un token JWT sin verificar la firma
 * @param token Token JWT
 * @returns Objeto con el payload decodificado o null si es inválido
 */
export function decodeJwt(token: string): any {
  try {
    console.log('🔍 Decoding JWT token:', token ? `${token.substring(0, 20)}...` : 'NULL');
    
    if (!token) {
      console.warn('⚠️ Token is empty');
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('⚠️ Token does not have 3 parts');
      return null;
    }

    const payload = parts[1];
    const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsedPayload = JSON.parse(decodedPayload);
    
    console.log('✅ Token decoded successfully:', parsedPayload);
    
    // Verificar expiración
    if (parsedPayload.exp) {
      const expirationDate = new Date(parsedPayload.exp * 1000);
      const now = new Date();
      const isExpired = now > expirationDate;
      
      console.log('📅 Token expiration:', {
        expiration: expirationDate.toISOString(),
        currentTime: now.toISOString(),
        isExpired,
        expiresIn: isExpired ? 'EXPIRED' : `${Math.round((expirationDate.getTime() - now.getTime()) / 1000)} seconds`
      });
    }
    
    return parsedPayload;
  } catch (error) {
    console.error('❌ Error decoding JWT:', error);
    return null;
  }
}

/**
 * Verifica si un token JWT es válido (sin verificar firma, solo formato y expiración)
 * @param token Token JWT
 * @returns true si el token parece válido
 */
export function isJwtValid(token: string): boolean {
  if (!token) {
    console.warn('⚠️ Token is empty');
    return false;
  }

  const decoded = decodeJwt(token);
  if (!decoded) {
    return false;
  }

  // Verificar expiración
  if (decoded.exp) {
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      console.warn('⚠️ Token has expired');
      return false;
    }
  }

  return true;
}

/**
 * Analiza y muestra información detallada sobre un token
 * @param token Token JWT a analizar
 */
export function analyzeToken(token: string): void {
  console.group('🔍 JWT Token Analysis');
  console.log('Token:', token ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}` : 'NULL');
  
  const decoded = decodeJwt(token);
  if (decoded) {
    console.log('Payload:', decoded);
    
    // Información útil para depuración
    if (decoded.exp) {
      const expirationDate = new Date(decoded.exp * 1000);
      const now = new Date();
      const isExpired = now > expirationDate;
      
      console.log('Expiration:', {
        date: expirationDate.toISOString(),
        isExpired,
        expiresIn: isExpired ? 'EXPIRED' : `${Math.round((expirationDate.getTime() - now.getTime()) / 1000)} seconds`
      });
    }
    
    if (decoded.iat) {
      console.log('Issued at:', new Date(decoded.iat * 1000).toISOString());
    }
    
    if (decoded.nbf) {
      console.log('Not valid before:', new Date(decoded.nbf * 1000).toISOString());
    }
  }
  
  console.groupEnd();
}